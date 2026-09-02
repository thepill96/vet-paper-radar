"""
PubMed → 분류 → Supabase 업서트 → (선택) Claude 한글 요약.

환경변수 (GitHub Secrets):
  SUPABASE_URL              https://xxxx.supabase.co
  SUPABASE_SERVICE_ROLE_KEY service_role 키 (서버 전용, 절대 프론트에 노출 금지)
  ANTHROPIC_API_KEY         (선택) 없으면 요약 단계는 건너뜀
  NCBI_API_KEY              (선택) 있으면 PubMed 요청 한도가 10/s로 늘어남
  LOOKBACK_DAYS             (선택) config의 lookback_days 덮어쓰기
"""
import json, os, re, sys, time, datetime as dt
import xml.etree.ElementTree as ET
import requests

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CFG = json.load(open(os.path.join(ROOT, "config", "sources.json"), encoding="utf-8"))

EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
SUPABASE_URL = os.environ["SUPABASE_URL"].strip().rstrip("/")
SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"].strip()
ANTHROPIC_KEY = (os.environ.get("ANTHROPIC_API_KEY") or "").strip() or None
NCBI_KEY = (os.environ.get("NCBI_API_KEY") or "").strip() or None
LOOKBACK = int(os.environ.get("LOOKBACK_DAYS", CFG.get("lookback_days", 3)))
SLEEP = 0.12 if NCBI_KEY else 0.35  # NCBI 한도: 키 없으면 3 req/s

SB_HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
}


# ---------- PubMed ----------
def eutils(endpoint, params):
    params = dict(params, tool="vet-paper-radar", email="radar@example.com")
    if NCBI_KEY:
        params["api_key"] = NCBI_KEY
    for attempt in range(4):
        r = requests.get(f"{EUTILS}/{endpoint}", params=params, timeout=60)
        if r.status_code == 200:
            time.sleep(SLEEP)
            return r
        time.sleep(2 * (attempt + 1))
    r.raise_for_status()


def search_journal(journal, must_match):
    since = (dt.date.today() - dt.timedelta(days=LOOKBACK)).strftime("%Y/%m/%d")
    term = f'"{journal}"[Journal] AND ("{since}"[EDAT] : "3000"[EDAT])'
    if must_match:
        kw = " OR ".join(f'"{k}"[Title/Abstract]' for k in must_match)
        term += f" AND ({kw})"
    r = eutils("esearch.fcgi", {"db": "pubmed", "term": term, "retmax": 300, "retmode": "json"})
    return r.json()["esearchresult"]["idlist"]


def fetch_details(pmids):
    out = []
    for i in range(0, len(pmids), 100):
        chunk = pmids[i:i + 100]
        r = eutils("efetch.fcgi", {"db": "pubmed", "id": ",".join(chunk), "retmode": "xml"})
        root = ET.fromstring(r.content)
        for art in root.findall(".//PubmedArticle"):
            out.append(parse_article(art))
    return out


def text_of(node, path):
    el = node.find(path)
    return "".join(el.itertext()).strip() if el is not None else ""


def parse_article(art):
    med = art.find("MedlineCitation")
    a = med.find("Article")
    pmid = text_of(med, "PMID")
    title = text_of(a, "ArticleTitle")
    abstract = "\n".join(
        (f"{ab.get('Label')}: " if ab.get("Label") else "") + "".join(ab.itertext()).strip()
        for ab in a.findall("Abstract/AbstractText")
    )
    # 비영어 논문: 영어 초록이 없으면 원어 초록(OtherAbstract)을 사용 → Claude가 번역·요약
    if not abstract:
        abstract = "\n".join("".join(ab.itertext()).strip() for ab in med.findall("OtherAbstract/AbstractText"))
    language = text_of(a, "Language") or "eng"
    vernacular = text_of(a, "VernacularTitle")
    authors = []
    for au in a.findall("AuthorList/Author"):
        ln, ini = text_of(au, "LastName"), text_of(au, "Initials")
        if ln:
            authors.append(f"{ln} {ini}".strip())
    journal = text_of(a, "Journal/Title")
    abbrev = text_of(med, "MedlineJournalInfo/MedlineTA")
    doi = ""
    for aid in art.findall(".//ArticleId"):
        if aid.get("IdType") == "doi":
            doi = aid.text or ""
    pub_date = parse_date(a.find("Journal/JournalIssue/PubDate")) or parse_date(a.find("ArticleDate"))
    pub_types = [pt.text for pt in a.findall("PublicationTypeList/PublicationType") if pt.text]
    return dict(pmid=pmid, title=title, abstract=abstract, authors=authors, journal=journal,
                journal_abbrev=abbrev, doi=doi, pub_date=pub_date, pub_types=pub_types,
                language=language, vernacular_title=vernacular or None,
                url=f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/")


MONTHS = {m: i for i, m in enumerate(["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], 1)}


def parse_date(node):
    if node is None:
        return None
    y = text_of(node, "Year")
    if not y:
        md = text_of(node, "MedlineDate")
        m = re.match(r"(\d{4})", md)
        return f"{m.group(1)}-01-01" if m else None
    mo = text_of(node, "Month")
    mo = MONTHS.get(mo[:3], mo) if mo and not mo.isdigit() else (mo or 1)
    d = text_of(node, "Day") or 1
    return f"{y}-{int(mo):02d}-{int(d):02d}"


# ---------- 분류 ----------
def _hit(blob, kw):
    # 단어 시작 경계에서만 매칭: "CT"가 "infeCTion"에 걸리지 않게. 어간(hepat, anesthes)은 접두 매칭 허용.
    return re.search(r"(?<![a-z0-9])" + re.escape(kw.lower()), blob) is not None


def classify(paper):
    blob = f"{paper['title']} {paper['abstract']}".lower()
    cats = [c for c, kws in CFG["categories"].items() if any(_hit(blob, k) for k in kws)]
    if not cats:
        cats = [CFG.get("category_fallback", "기타")]
    study = None
    for label, kws in CFG.get("study_type_hints", {}).items():
        if any(_hit(blob, k) for k in kws):
            study = label
            break
    return cats, study


# ---------- Supabase ----------
def sb_get(path, params):
    r = requests.get(f"{SUPABASE_URL}/rest/v1/{path}", headers=SB_HEADERS, params=params, timeout=60)
    r.raise_for_status()
    return r.json()


def upsert_papers(rows):
    if not rows:
        return
    h = dict(SB_HEADERS, Prefer="resolution=merge-duplicates,return=minimal")
    for i in range(0, len(rows), 200):
        r = requests.post(f"{SUPABASE_URL}/rest/v1/papers?on_conflict=pmid",
                          headers=h, data=json.dumps(rows[i:i + 200]), timeout=120)
        if r.status_code >= 300:
            print("Upsert error:", r.status_code, r.text[:500], file=sys.stderr)
            r.raise_for_status()


def patch_paper(pmid, data):
    r = requests.patch(f"{SUPABASE_URL}/rest/v1/papers", headers=SB_HEADERS,
                       params={"pmid": f"eq.{pmid}"}, data=json.dumps(data), timeout=60)
    r.raise_for_status()


# ---------- Claude 요약 ----------
SUMMARY_PROMPT = """당신은 소동물 외과 전문의를 위한 논문 큐레이터입니다. 아래 논문을 읽고 JSON만 출력하세요(코드펜스 없이).

논문 원문 언어가 무엇이든(영어, 한국어, 일본어, 독일어 등) 반드시 한국어 버전과 영어 버전을 둘 다 작성합니다. 초록이 비영어라면 먼저 정확히 이해한 뒤 두 언어로 요약합니다.

규칙:
- 한국어 버전: 해부학 구조명, 술식명, 체위, 방향/면, 임플란트명은 영어 원문 그대로 쓰고, 연결어와 설명만 한국어로 씁니다.
- 영어 버전: 자연스러운 임상 영어(영문 저널 abstract 톤)로 씁니다.
- 임상적으로 의미 있는 수치(n, 성공률, 합병증률, 추적기간)를 우선하고, 초록에 없는 내용은 지어내지 않습니다. 불명확하면 "초록에 미기재" / "not reported"로 씁니다.
- 두 버전은 같은 내용을 담되 직역이 아니라 각 언어에서 자연스럽게 씁니다.

출력 형식:
{{
  "summary_ko": "3~4문장 한국어 요약",
  "clinical_points_ko": ["임상 포인트 1", "포인트 2", "포인트 3"],
  "evidence_level_ko": "높음|중간|낮음 + 한 줄 근거",
  "relevance_ko": "인의 논문이면 소동물 외과 적용 1~2문장, 수의 논문이면 빈 문자열",
  "summary_en": "3-4 sentence English summary",
  "clinical_points_en": ["clinical point 1", "point 2", "point 3"],
  "evidence_level_en": "High|Moderate|Low + one-line justification",
  "relevance_en": "for human papers: 1-2 sentences on translation to small-animal surgery; empty string for veterinary papers",
  "study_type": "study design in English (e.g. retrospective case series, n=42)"
}}

원문 언어: {language}
제목: {title}
저널: {journal} ({pub_date})
초록:
{abstract}
"""


def summarize(paper):
    body = {
        "model": CFG.get("summary_model", "claude-sonnet-4-6"),
        "max_tokens": 1600,
        "messages": [{"role": "user", "content": SUMMARY_PROMPT.format(**paper)}],
    }
    r = requests.post("https://api.anthropic.com/v1/messages",
                      headers={"x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01",
                               "content-type": "application/json"},
                      data=json.dumps(body), timeout=120)
    r.raise_for_status()
    text = "".join(b.get("text", "") for b in r.json()["content"])
    text = re.sub(r"^```(json)?|```$", "", text.strip(), flags=re.M).strip()
    return json.loads(text)


# ---------- main ----------
def main():
    seen, rows = set(), []
    for j in CFG["journals"]:
        try:
            ids = search_journal(j["name"], j.get("must_match"))
        except Exception as e:
            print(f"[skip] {j['name']}: {e}", file=sys.stderr)
            continue
        ids = [i for i in ids if i not in seen]
        seen.update(ids)
        if not ids:
            print(f"{j['name']}: 0  (0건이 계속되면 저널명이 PubMed 표기와 다른지 확인)")
            continue
        for p in fetch_details(ids):
            if not p["abstract"] and "Editorial" in p["pub_types"]:
                continue
            cats, study = classify(p)
            p.update(species=j["species"], journal_group=j.get("group", ""), categories=cats,
                     study_type_hint=study)
            p.pop("pub_types", None)
            rows.append(p)
        print(f"{j['name']}: {len(ids)}")

    upsert_papers(rows)
    print(f"Upserted {len(rows)} papers")

    if not ANTHROPIC_KEY:
        print("ANTHROPIC_API_KEY 없음 — 요약 건너뜀")
        return
    limit = int(CFG.get("max_ai_summaries_per_run", 40))
    pending = sb_get("papers", {"select": "pmid,title,journal,pub_date,abstract,language",
                                "summarized_at": "is.null", "abstract": "neq.",
                                "order": "created_at.desc", "limit": limit})
    done = 0
    for p in pending:
        try:
            s = summarize(p)
            patch_paper(p["pmid"], {
                "summary_ko": s.get("summary_ko"),
                "clinical_points": s.get("clinical_points_ko") or [],
                "evidence_level": s.get("evidence_level_ko"),
                "relevance_note": s.get("relevance_ko") or None,
                "summary_en": s.get("summary_en"),
                "clinical_points_en": s.get("clinical_points_en") or [],
                "evidence_level_en": s.get("evidence_level_en"),
                "relevance_note_en": s.get("relevance_en") or None,
                "study_type": s.get("study_type"),
                "summarized_at": dt.datetime.utcnow().isoformat() + "Z",
            })
            done += 1
        except Exception as e:
            print(f"[summary fail] {p['pmid']}: {e}", file=sys.stderr)
    print(f"Summarized {done}/{len(pending)}")


if __name__ == "__main__":
    main()
