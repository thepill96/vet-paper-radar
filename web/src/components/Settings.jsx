import { useEffect, useState } from "react";
import { supabase, callFunction } from "../lib/supabase";

export default function Settings({ user, onSignOut, onLangChange }) {
  const [profile, setProfile] = useState({ display_name: "", readwise_token: "", summary_lang: "ko", notion_token: "", notion_database_id: "" });
  const [parentPage, setParentPage] = useState("");
  const [notionMsg, setNotionMsg] = useState(null);
  const [notionBusy, setNotionBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    supabase.from("profiles").select("display_name,readwise_token,summary_lang,notion_token,notion_database_id").eq("id", user.id).single()
      .then(({ data }) => data && setProfile({ display_name: data.display_name || "", readwise_token: data.readwise_token || "", summary_lang: data.summary_lang || "ko", notion_token: data.notion_token || "", notion_database_id: data.notion_database_id || "" }));
  }, [user.id]);

  async function save() {
    setMsg(null);
    const { error } = await supabase.from("profiles").upsert({ id: user.id, email: user.email, ...profile });
    setMsg(error ? { err: true, text: error.message } : { text: "저장됨" });
    if (!error) onLangChange?.(profile.summary_lang);
  }

  async function createNotionDb() {
    setNotionBusy(true); setNotionMsg(null);
    try {
      // 토큰을 먼저 저장해야 Edge Function이 읽을 수 있음
      const { error } = await supabase.from("profiles").upsert({ id: user.id, email: user.email, ...profile });
      if (error) throw error;
      const r = await callFunction("notion-export", { action: "create_db", parent_page_id: parentPage });
      setProfile((pr) => ({ ...pr, notion_database_id: r.database_id }));
      setNotionMsg({ text: "데이터베이스를 만들었습니다. Notion에서 열어 보세요.", url: r.url });
    } catch (e) { setNotionMsg({ err: true, text: e.message }); } finally { setNotionBusy(false); }
  }

  return (
    <div className="settings">
      <h1>설정</h1>
      <p className="lead">{user.email}</p>

      <section>
        <h2>표시 이름</h2>
        <input value={profile.display_name} onChange={(e) => setProfile({ ...profile, display_name: e.target.value })} />
      </section>

      <section>
        <h2>요약 언어</h2>
        <p>논문을 열었을 때 요약창에 먼저 보일 언어입니다. 요약창 안의 탭으로 언제든 바꿔 볼 수 있습니다. 원문이 어떤 언어든 요약은 항상 한국어·영어 두 버전이 만들어집니다.</p>
        <div className="chips">
          {[["ko", "한국어"], ["en", "English"], ["both", "병기 (한국어 + English)"]].map(([k, l]) => (
            <button key={k} type="button" className={`chip ${profile.summary_lang === k ? "on" : ""}`} onClick={() => setProfile({ ...profile, summary_lang: k })}>{l}</button>
          ))}
        </div>
      </section>

      <section>
        <h2>Readwise 연동</h2>
        <p>readwise.io/access_token 에서 토큰을 복사해 붙여 넣으면 "Readwise로 보내기" 버튼이 활성화됩니다. 토큰은 내 계정 행에만 저장되고 다른 사용자는 볼 수 없습니다.</p>
        <input type="password" value={profile.readwise_token} placeholder="Readwise access token" onChange={(e) => setProfile({ ...profile, readwise_token: e.target.value })} />
      </section>

      <section>
        <h2>Notion 연동</h2>
        <p>1) notion.so/my-integrations 에서 내부 통합(Internal integration)을 만들고 토큰을 붙여 넣습니다. 2) 논문 DB를 둘 Notion 페이지를 열어 우측 상단 ··· → 연결 → 방금 만든 통합을 추가한 뒤, 그 페이지 링크를 붙여 넣고 "데이터베이스 만들기"를 누르세요. 열(제목·저널·발행일·대상·분야·연구 설계·근거 수준·읽음·북마크·내 메모·PMID·DOI 등)이 정해진 순서로 만들어집니다.</p>
        <input type="password" value={profile.notion_token} placeholder="Notion 통합 토큰 (ntn_... 또는 secret_...)" onChange={(e) => setProfile({ ...profile, notion_token: e.target.value })} />
        <div className="row">
          <input value={parentPage} placeholder="DB를 만들 Notion 페이지 링크 또는 ID" onChange={(e) => setParentPage(e.target.value)} />
          <button className="btn" disabled={notionBusy || !profile.notion_token || !parentPage} onClick={createNotionDb}>{notionBusy ? "만드는 중" : "데이터베이스 만들기"}</button>
        </div>
        <div className="row">
          <input value={profile.notion_database_id} placeholder="또는 기존 데이터베이스 ID 직접 입력" onChange={(e) => setProfile({ ...profile, notion_database_id: e.target.value })} />
        </div>
        {notionMsg && <p className={notionMsg.err ? "err" : "ok"} style={{ marginTop: 8 }}>{notionMsg.text} {notionMsg.url && <a href={notionMsg.url} target="_blank" rel="noreferrer">열기</a>}</p>}
      </section>

      <section>
        <h2>Obsidian · Anki</h2>
        <p>둘 다 서버 연동 없이 파일로 내려받습니다. Obsidian은 YAML frontmatter(태그·PMID·DOI)가 붙은 .md, Anki는 "파일 → 가져오기"로 바로 읽히는 탭 구분 텍스트입니다. 해부학 용어는 영어로 유지됩니다.</p>
      </section>

      <div className="row">
        <button className="btn primary" onClick={save}>저장</button>
        {msg && <span className={msg.err ? "err" : "ok"}>{msg.text}</span>}
        <span style={{ flex: 1 }} />
        <button className="btn" onClick={onSignOut}>로그아웃</button>
      </div>
    </div>
  );
}
