"""
config/sources.json 의 저널 표기가 PubMed에서 실제로 검색되는지 한 번에 확인한다.
표기가 틀리면 수집이 조용히 0건이 되므로, 저널을 추가한 뒤 이 스크립트를 돌려 확인할 것.

실행: GitHub Actions → Check journal names → Run workflow
로컬: NCBI_API_KEY=... python scripts/check_journals.py
"""
import json, os, sys, time
import requests

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CFG = json.load(open(os.path.join(ROOT, "config", "sources.json"), encoding="utf-8"))
NCBI_KEY = (os.environ.get("NCBI_API_KEY") or "").strip()
SLEEP = 0.12 if NCBI_KEY else 0.35
EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"


def count(term):
    params = {"db": "pubmed", "term": term, "retmax": 0, "retmode": "json", "tool": "vet-stacks"}
    if NCBI_KEY:
        params["api_key"] = NCBI_KEY
    for attempt in range(4):
        r = requests.get(EUTILS, params=params, timeout=60)
        if r.status_code == 200:
            time.sleep(SLEEP)
            return int(r.json()["esearchresult"].get("count", 0))
        time.sleep(2 * (attempt + 1))
    r.raise_for_status()


def main():
    bad, thin, ok = [], [], 0
    for j in CFG["journals"]:
        name = j["name"]
        total = count(f'"{name}"[Journal]')
        recent = count(f'"{name}"[Journal] AND ("2024"[PDAT] : "3000"[PDAT])') if total else 0
        if total == 0:
            bad.append(name)
            mark = "✗ 검색 안 됨 (표기 확인 필요)"
        elif recent == 0:
            thin.append(name)
            mark = "△ 2024년 이후 신규 논문 없음 (폐간·색인 중단 가능)"
        else:
            ok += 1
            mark = "✓"
        print(f"{mark:<40} {name:<50} 전체 {total:>7,}  최근 {recent:>6,}", flush=True)

    print(f"\n정상 {ok} · 확인 필요 {len(bad)} · 최근 논문 없음 {len(thin)} (총 {len(CFG['journals'])})")
    if bad:
        print("\n[표기를 고쳐야 하는 저널]", file=sys.stderr)
        for n in bad:
            print(f"  - {n}", file=sys.stderr)
        print("PubMed에서 저널명을 검색해 NLM 표기를 확인한 뒤 config/sources.json 을 고치세요.", file=sys.stderr)


if __name__ == "__main__":
    main()
