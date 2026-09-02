"""
사용자별 관심 프로필 계산 → 새 논문 점수화 → recommendations 테이블 저장 → 알림 메일.
매일 수집(fetch_pubmed.py) 직후 GitHub Actions에서 실행됨.

환경변수:
  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (필수)
  SITE_URL                                  사이트 주소 (메일 링크용) 예: https://id.github.io/vet-stacks/
  메일 발송은 둘 중 하나:
    GMAIL_USER + GMAIL_APP_PASSWORD         Gmail 앱 비밀번호 (도메인 불필요, 동료 몇 명 규모에 적합)
    RESEND_API_KEY + MAIL_FROM              Resend (도메인 인증 필요)
  DIGEST_FORCE=1                            주기 무시하고 지금 발송 (테스트용)
"""
import os, re, json, html, smtplib, datetime as dt
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from collections import Counter
import requests

SB_URL = re.sub(r"/(rest|auth|storage)/v1/?$", "", os.environ["SUPABASE_URL"].strip()).rstrip("/")
SB_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"].strip()
SITE = (os.environ.get("SITE_URL") or "").strip().rstrip("/") + "/"
FORCE = os.environ.get("DIGEST_FORCE") == "1"
H = {"apikey": SB_KEY, "Authorization": f"Bearer {SB_KEY}", "Content-Type": "application/json"}
NOW = dt.datetime.now(dt.timezone.utc)
KST = dt.timezone(dt.timedelta(hours=9))

TOP_N = 10                  # 메일당 추천 편수
LOOKBACK_NEW_DAYS = 8       # 후보: 최근 며칠 내 수집된 논문
WEIGHTS = dict(bookmark=3.0, note=3.0, read=2.0, view=1.0, search=2.5, explicit=4.0)
STOP = set("""a an the of in and or for with to on at by from as is are was were be been being this that these those
its it their there than then vs versus using use used study studies case cases series report review clinical dogs dog cats cat
canine feline small animal animals patients patient effect effects outcome outcomes evaluation comparison comparative
retrospective prospective randomized randomised controlled trial results method methods analysis after before between
two three one first new novel associated association among within following treatment treated management""".split())


def sb(method, path, params=None, data=None):
    r = requests.request(method, f"{SB_URL}/rest/v1/{path}", headers=H, params=params,
                         data=json.dumps(data) if data is not None else None, timeout=60)
    if r.status_code >= 300:
        raise RuntimeError(f"{method} {path} {r.status_code}: {r.text[:300]}")
    return r.json() if r.text else None


def tokens(text):
    words = re.findall(r"[a-zA-Z][a-zA-Z\-]{2,}", (text or "").lower())
    return [w for w in words if w not in STOP]


# ---------- 관심 프로필 ----------
def build_profile(uid, prof, papers_by_id):
    cats, journals, terms = Counter(), Counter(), Counter()

    def absorb(paper, w):
        if not paper:
            return
        for c in paper.get("categories") or []:
            cats[c] += w
        if paper.get("journal"):
            journals[paper["journal"]] += w
        for t in set(tokens(paper.get("title"))):
            terms[t] += w

    for u in sb("GET", "user_papers", {"user_id": f"eq.{uid}", "select": "paper_id,is_read,is_bookmarked,note"}):
        p = papers_by_id.get(u["paper_id"])
        if u["is_bookmarked"]: absorb(p, WEIGHTS["bookmark"])
        if u["note"]: absorb(p, WEIGHTS["note"])
        if u["is_read"]: absorb(p, WEIGHTS["read"])
    for v in sb("GET", "view_history", {"user_id": f"eq.{uid}", "select": "paper_id", "order": "viewed_at.desc", "limit": 300}):
        absorb(papers_by_id.get(v["paper_id"]), WEIGHTS["view"])
    for s in sb("GET", "search_log", {"user_id": f"eq.{uid}", "select": "query", "order": "created_at.desc", "limit": 200}):
        for t in set(tokens(s["query"])):
            terms[t] += WEIGHTS["search"]
    for kw in prof.get("interest_keywords") or []:
        for t in set(tokens(kw)) or {kw.lower()}:
            terms[t] += WEIGHTS["explicit"]

    # 정규화: 상위 항목만, 최대 1.0
    def top(c, n):
        if not c: return {}
        m = max(c.values())
        return {k: v / m for k, v in c.most_common(n)}
    return dict(cats=top(cats, 6), journals=top(journals, 8), terms=top(terms, 40))


def score(paper, profile, seen):
    if paper["id"] in seen:
        return 0, ""
    s, why = 0.0, []
    for c in paper.get("categories") or []:
        if c in profile["cats"]:
            s += 2.0 * profile["cats"][c]; why.append(c)
    if paper.get("journal") in profile["journals"]:
        s += 1.0 * profile["journals"][paper["journal"]]
    title_t = set(tokens(paper.get("title")))
    abs_t = set(tokens((paper.get("abstract") or "")[:1500]))
    hits = []
    for t, w in profile["terms"].items():
        if t in title_t: s += 1.5 * w; hits.append(t)
        elif t in abs_t: s += 0.5 * w; hits.append(t)
    if hits:
        why.append("키워드: " + ", ".join(hits[:4]))
    return s, " · ".join(why[:3])


# ---------- 메일 ----------
MAIL = {
    "en": dict(subject="[Vet Stacks] {n} new papers for you ({period})", period_daily="today", period_weekly="this week",
               intro="Based on what you've been reading and searching, here are {n} new papers from {period}.",
               open="Open in Vet Stacks", foot="Change keywords and frequency under Settings on the site, or set emails to Off to stop them."),
    "ko": dict(subject="[Vet Stacks] {period} 추천 논문 {n}편", period_daily="오늘", period_weekly="이번 주",
               intro="최근 읽고 찾아본 주제를 바탕으로 {period} 새로 나온 논문 {n}편을 골랐습니다.",
               open="사이트에서 열기", foot="관심 키워드와 알림 주기는 사이트 → 설정에서 바꿀 수 있습니다. 알림을 끄려면 '받지 않음'을 선택하세요."),
    "ja": dict(subject="[Vet Stacks] おすすめ論文 {n}件（{period}）", period_daily="今日", period_weekly="今週",
               intro="最近の閲覧・検索をもとに、{period}の新着論文{n}件を選びました。", open="サイトで開く", foot="キーワードと配信頻度は設定から変更できます。"),
    "de": dict(subject="[Vet Stacks] {n} neue Artikel für dich ({period})", period_daily="heute", period_weekly="diese Woche",
               intro="Basierend auf deinem Leseverhalten: {n} neue Artikel von {period}.", open="In Vet Stacks öffnen", foot="Stichwörter und Häufigkeit unter Einstellungen ändern."),
    "es": dict(subject="[Vet Stacks] {n} artículos nuevos para ti ({period})", period_daily="hoy", period_weekly="esta semana",
               intro="Según lo que has leído y buscado, {n} artículos nuevos de {period}.", open="Abrir en Vet Stacks", foot="Cambia palabras clave y frecuencia en Ajustes."),
}


def render_email(name, recs, freq, ui_lang="en"):
    m = MAIL.get(ui_lang) or MAIL["en"]
    period = m["period_daily"] if freq == "daily" else m["period_weekly"]
    rows = []
    for r in recs:
        p = r["paper"]
        link = f"{SITE}?paper={p['id']}"
        summ = ((p.get("summary_ko") if ui_lang == "ko" else p.get("summary_en")) or p.get("summary_en") or p.get("summary_ko") or "")[:240]
        rows.append(f"""
        <tr><td style="padding:14px 0;border-bottom:1px solid #e3e7eb">
          <div style="font-size:12px;color:#5c6b78">{html.escape(p.get('journal') or '')} · {p.get('pub_date') or ''}{' · ' + html.escape(r['reason']) if r['reason'] else ''}</div>
          <a href="{link}" style="font-size:16px;color:#1b2430;text-decoration:none;font-weight:600;line-height:1.35">{html.escape(p['title'])}</a>
          {f'<div style="font-size:13.5px;color:#3a4650;margin-top:6px;line-height:1.5">{html.escape(summ)}…</div>' if summ else ''}
          <div style="font-size:12px;margin-top:6px"><a href="{link}" style="color:#0f7a73">{m['open']}</a> &nbsp;·&nbsp; <a href="{p['url']}" style="color:#0f7a73">PubMed</a></div>
        </td></tr>""")
    body = f"""<div style="font-family:-apple-system,'Segoe UI','Pretendard',sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#1b2430">
      <div style="font-size:20px;font-weight:600;margin-bottom:4px">Vet Stacks</div>
      <div style="font-size:14px;color:#5c6b78;margin-bottom:18px">{html.escape(name)} — {m['intro'].format(n=len(recs), period=period)}</div>
      <table style="width:100%;border-collapse:collapse">{''.join(rows)}</table>
      <div style="font-size:12px;color:#98a3ad;margin-top:20px;line-height:1.6"><a href="{SITE}" style="color:#5c6b78">Vet Stacks</a> · {m['foot']}</div></div>"""
    return m["subject"].format(n=len(recs), period=period), body


def send_mail(to, subject, html_body):
    if os.environ.get("RESEND_API_KEY"):
        r = requests.post("https://api.resend.com/emails",
                          headers={"Authorization": f"Bearer {os.environ['RESEND_API_KEY'].strip()}", "Content-Type": "application/json"},
                          data=json.dumps({"from": os.environ.get("MAIL_FROM", "Vet Stacks <onboarding@resend.dev>"),
                                           "to": [to], "subject": subject, "html": html_body}), timeout=60)
        r.raise_for_status(); return
    user, pw = os.environ.get("GMAIL_USER", "").strip(), os.environ.get("GMAIL_APP_PASSWORD", "").replace(" ", "").strip()
    if not (user and pw):
        raise RuntimeError("메일 발송 설정 없음: GMAIL_USER/GMAIL_APP_PASSWORD 또는 RESEND_API_KEY 필요")
    msg = MIMEMultipart("alternative")
    msg["Subject"], msg["From"], msg["To"] = subject, f"Vet Stacks <{user}>", to
    msg.attach(MIMEText(html_body, "html", "utf-8"))
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as s:
        s.login(user, pw); s.sendmail(user, [to], msg.as_string())


def due(prof):
    if FORCE: return True
    freq = prof.get("digest_freq") or "weekly"
    if freq == "off": return False
    last = prof.get("digest_last_sent_at")
    last = dt.datetime.fromisoformat(last.replace("Z", "+00:00")) if last else None
    now_kst = NOW.astimezone(KST)
    if freq == "daily":
        return not last or (NOW - last) > dt.timedelta(hours=20)
    return now_kst.weekday() == int(prof.get("digest_weekday") or 1) and (not last or (NOW - last) > dt.timedelta(days=5))


# ---------- main ----------
def main():
    since = (NOW - dt.timedelta(days=LOOKBACK_NEW_DAYS)).isoformat()
    candidates = sb("GET", "papers", {"select": "id,title,abstract,journal,pub_date,categories,url,summary_ko,created_at",
                                      "created_at": f"gte.{since}", "order": "created_at.desc", "limit": 3000})
    # 프로필 계산에 필요한 논문(사용자가 만진 것)은 개별로 가져옴
    profiles = sb("GET", "profiles", {"select": "id,email,display_name,digest_freq,digest_weekday,interest_keywords,digest_last_sent_at,status,is_admin,ui_lang"})
    pending = [p for p in profiles if p.get("status") == "pending"]
    admins = [p for p in profiles if p.get("is_admin")]
    profiles = [p for p in profiles if p.get("status") == "approved"]
    print(f"candidates={len(candidates)} users={len(profiles)} pending={len(pending)}")
    # 승인 대기 중인 가입자가 있으면 관리자에게 알림
    if pending and admins:
        rows = "".join(f"<li>{html.escape(p['email'])} ({html.escape(p.get('display_name') or '')})</li>" for p in pending)
        body = f"""<div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#22303a">
          <div style="font-size:18px;font-weight:600">{len(pending)} account(s) awaiting approval</div><ul>{rows}</ul>
          <div style="font-size:13px;color:#5c6b78">Approve or block them under <a href="{SITE}" style="color:#0f7a73">Settings → Account approvals</a>.</div></div>"""
        for a in admins:
            try: send_mail(a["email"], f"[Vet Stacks] {len(pending)} account(s) awaiting approval", body)
            except Exception as e: print(f"[admin mail] {e}")

    for prof in profiles:
        uid = prof["id"]
        touched = sb("GET", "user_papers", {"user_id": f"eq.{uid}", "select": "paper_id"}) + \
                  sb("GET", "view_history", {"user_id": f"eq.{uid}", "select": "paper_id", "limit": 300})
        ids = list({t["paper_id"] for t in touched})
        papers_by_id = {}
        for i in range(0, len(ids), 100):
            for p in sb("GET", "papers", {"select": "id,title,journal,categories", "id": f"in.({','.join(ids[i:i+100])})"}):
                papers_by_id[p["id"]] = p
        profile = build_profile(uid, prof, papers_by_id)
        if not (profile["cats"] or profile["terms"]):
            print(f"[{prof['email']}] 아직 행동 데이터 없음 — 건너뜀"); continue

        seen = set(ids)
        scored = sorted(((score(p, profile, seen), p) for p in candidates), key=lambda x: -x[0][0])
        picks = [(sc, why, p) for (sc, why), p in scored if sc >= 1.5][:TOP_N]
        if not picks:
            print(f"[{prof['email']}] 맞는 새 논문 없음"); continue

        rows = [{"user_id": uid, "paper_id": p["id"], "score": round(sc, 3), "reason": why, "created_at": NOW.isoformat()} for sc, why, p in picks]
        requests.post(f"{SB_URL}/rest/v1/recommendations?on_conflict=user_id,paper_id",
                      headers=dict(H, Prefer="resolution=merge-duplicates,return=minimal"), data=json.dumps(rows), timeout=60).raise_for_status()
        print(f"[{prof['email']}] 추천 {len(picks)}편 저장 (top: {picks[0][2]['title'][:60]})")

        if not due(prof):
            continue
        # 아직 메일로 안 보낸 것만
        unsent = sb("GET", "recommendations", {"user_id": f"eq.{uid}", "emailed_at": "is.null", "select": "paper_id,reason,score",
                                               "order": "score.desc", "limit": TOP_N})
        by_id = {p["id"]: p for p in candidates}
        recs = [{"paper": by_id[u["paper_id"]], "reason": u["reason"]} for u in unsent if u["paper_id"] in by_id]
        if not recs:
            continue
        subject, body = render_email(prof.get("display_name") or prof["email"].split("@")[0], recs, prof.get("digest_freq") or "weekly", prof.get("ui_lang") or "en")
        try:
            send_mail(prof["email"], subject, body)
        except Exception as e:
            print(f"[{prof['email']}] 메일 실패: {e}"); continue
        sb("PATCH", "recommendations", {"user_id": f"eq.{uid}", "emailed_at": "is.null"}, {"emailed_at": NOW.isoformat()})
        sb("PATCH", "profiles", {"id": f"eq.{uid}"}, {"digest_last_sent_at": NOW.isoformat()})
        print(f"[{prof['email']}] 메일 발송 {len(recs)}편")


if __name__ == "__main__":
    main()
