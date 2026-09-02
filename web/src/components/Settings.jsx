import { useEffect, useState } from "react";
import { supabase, callFunction } from "../lib/supabase";
import { useT, LANGS } from "../lib/i18n";

const EMPTY = { display_name: "", readwise_token: "", summary_lang: "en", notion_token: "", notion_database_id: "", digest_freq: "weekly", digest_weekday: 1, interest_keywords: [], auto_read: true, ui_lang: "en" };

export default function Settings({ user, me, onSignOut, onProfileChange }) {
  const { t, lang, setLang } = useT();
  const [profile, setProfile] = useState({ ...EMPTY, ui_lang: lang });
  const [kwInput, setKwInput] = useState("");
  const [parentPage, setParentPage] = useState("");
  const [msg, setMsg] = useState(null);
  const [notionMsg, setNotionMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [users, setUsers] = useState([]);
  const [feedback, setFeedback] = useState([]);

  useEffect(() => {
    supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => data && setProfile({ ...EMPTY, ...strip(data), ui_lang: data.ui_lang || lang }));
    if (me?.is_admin) loadAdmin();
  }, [user.id, me?.is_admin]);

  async function loadAdmin() {
    const { data: u } = await supabase.from("profiles").select("id,email,display_name,status,is_admin,created_at").order("created_at", { ascending: false });
    setUsers(u || []);
    const { data: f } = await supabase.from("feedback").select("*").order("created_at", { ascending: false }).limit(50);
    setFeedback(f || []);
  }
  async function save() {
    setMsg(null);
    const { error } = await supabase.from("profiles").update(profile).eq("id", user.id);
    setMsg(error ? { err: true, text: error.message } : { text: t("settings.saved") });
    if (!error) { onProfileChange?.(profile); setLang(profile.ui_lang); }
  }
  async function patchUser(id, patch) {
    const { error } = await supabase.from("profiles").update(patch).eq("id", id);
    if (error) setMsg({ err: true, text: error.message }); else loadAdmin();
  }
  function addKw() {
    const k = kwInput.trim();
    if (!k || profile.interest_keywords.includes(k)) return;
    setProfile({ ...profile, interest_keywords: [...profile.interest_keywords, k] }); setKwInput("");
  }
  async function createNotionDb() {
    setBusy(true); setNotionMsg(null);
    try {
      const { error } = await supabase.from("profiles").update(profile).eq("id", user.id);
      if (error) throw error;
      const r = await callFunction("notion-export", { action: "create_db", parent_page_id: parentPage });
      setProfile((pr) => ({ ...pr, notion_database_id: r.database_id }));
      setNotionMsg({ text: t("settings.dbCreated"), url: r.url });
    } catch (e) { setNotionMsg({ err: true, text: e.message }); } finally { setBusy(false); }
  }

  const pending = users.filter((u) => u.status === "pending");
  const others = users.filter((u) => u.status !== "pending");
  const Chip = ({ on, onClick, children }) => <button type="button" className={`chip ${on ? "on" : ""}`} onClick={onClick}>{children}</button>;

  return (
    <div className="page">
      <h1>{t("settings.title")}</h1>
      <p className="lead">{user.email}{me?.is_admin && ` · ${t("settings.admin")}`}</p>

      {me?.is_admin && (
        <section className="admin">
          <h2>{t("settings.approvals")} {pending.length > 0 && <span className="badge">{pending.length}</span>}</h2>
          <p>{t("settings.approvalsHint")}</p>
          {pending.length === 0 && <div className="muted">{t("settings.noPending")}</div>}
          {pending.map((u) => (
            <div key={u.id} className="user-row">
              <div><b>{u.email}</b><div className="muted">{u.display_name} · {new Date(u.created_at).toLocaleDateString()}</div></div>
              <button className="btn small primary" onClick={() => patchUser(u.id, { status: "approved" })}>{t("settings.approve")}</button>
              <button className="btn small" onClick={() => patchUser(u.id, { status: "blocked" })}>{t("settings.block")}</button>
            </div>
          ))}
          {others.length > 0 && <details><summary className="muted">{t("settings.allUsers", { n: others.length })}</summary>
            {others.map((u) => (
              <div key={u.id} className="user-row">
                <div><b>{u.email}</b><div className="muted">{u.status === "approved" ? t("settings.approved") : t("settings.blocked")}{u.is_admin && ` · ${t("settings.admin")}`}</div></div>
                {u.id !== user.id && <>
                  <button className="btn small" onClick={() => patchUser(u.id, { status: u.status === "approved" ? "blocked" : "approved" })}>{u.status === "approved" ? t("settings.block") : t("settings.approve")}</button>
                  <button className="btn small" onClick={() => patchUser(u.id, { is_admin: !u.is_admin })}>{u.is_admin ? t("settings.removeAdmin") : t("settings.makeAdmin")}</button>
                </>}
              </div>
            ))}
          </details>}
          {feedback.length > 0 && <details><summary className="muted">{t("settings.feedbackInbox", { n: feedback.length })}</summary>
            {feedback.map((f) => <div key={f.id} className="user-row" style={{ alignItems: "flex-start" }}><div><div className="muted">{f.kind} · {new Date(f.created_at).toLocaleDateString()}{f.contact && ` · ${f.contact}`}</div><div style={{ whiteSpace: "pre-wrap" }}>{f.message}</div></div></div>)}
          </details>}
        </section>
      )}

      <section>
        <h2>{t("settings.language")}</h2>
        <p>{t("settings.languageHint")}</p>
        <div className="chips">{LANGS.map(([k, l]) => <Chip key={k} on={profile.ui_lang === k} onClick={() => { setProfile({ ...profile, ui_lang: k }); setLang(k); }}>{l}</Chip>)}</div>
        <h2 style={{ marginTop: 18 }}>{t("settings.summaryLang")}</h2>
        <p>{t("settings.summaryLangHint")}</p>
        <div className="chips">{[["en", t("settings.en")], ["ko", t("settings.ko")], ["both", t("settings.both")]].map(([k, l]) => <Chip key={k} on={profile.summary_lang === k} onClick={() => setProfile({ ...profile, summary_lang: k })}>{l}</Chip>)}</div>
      </section>

      <section>
        <h2>{t("settings.name")}</h2>
        <input value={profile.display_name} onChange={(e) => setProfile({ ...profile, display_name: e.target.value })} />
        <h2 style={{ marginTop: 18 }}>{t("settings.reading")}</h2>
        <label className="check"><input type="checkbox" checked={profile.auto_read} onChange={(e) => setProfile({ ...profile, auto_read: e.target.checked })} /> {t("settings.autoRead")}</label>
        <p style={{ marginTop: 6 }}>{t("settings.autoReadHint")}</p>
      </section>

      <section>
        <h2>{t("settings.digest")}</h2>
        <p>{t("settings.digestHint", { email: user.email })}</p>
        <div className="chips">{["daily", "weekly", "off"].map((k) => <Chip key={k} on={profile.digest_freq === k} onClick={() => setProfile({ ...profile, digest_freq: k })}>{t(`settings.${k}`)}</Chip>)}</div>
        {profile.digest_freq === "weekly" && <div className="chips" style={{ marginTop: 8 }}>{t("settings.weekdays").map((d, i) => <Chip key={d} on={profile.digest_weekday === i} onClick={() => setProfile({ ...profile, digest_weekday: i })}>{d}</Chip>)}</div>}
        <p style={{ marginTop: 14 }}>{t("settings.keywordsHint")}</p>
        <div className="chips" style={{ marginBottom: 8 }}>{profile.interest_keywords.map((k) => <Chip key={k} on onClick={() => setProfile({ ...profile, interest_keywords: profile.interest_keywords.filter((x) => x !== k) })}>{k} ×</Chip>)}</div>
        <div className="row"><input value={kwInput} placeholder={t("settings.keywordPlaceholder")} onChange={(e) => setKwInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addKw(); } }} /><button className="btn" type="button" onClick={addKw}>{t("settings.add")}</button></div>
      </section>

      <section>
        <h2>{t("settings.readwise")}</h2>
        <p>{t("settings.readwiseHint")}</p>
        <input type="password" value={profile.readwise_token} placeholder="Readwise access token" onChange={(e) => setProfile({ ...profile, readwise_token: e.target.value })} />
        <h2 style={{ marginTop: 18 }}>{t("settings.notion")}</h2>
        <p>{t("settings.notionHint")}</p>
        <input type="password" value={profile.notion_token} placeholder={t("settings.notionToken")} onChange={(e) => setProfile({ ...profile, notion_token: e.target.value })} />
        <div className="row"><input value={parentPage} placeholder={t("settings.notionPage")} onChange={(e) => setParentPage(e.target.value)} /><button className="btn" disabled={busy || !profile.notion_token || !parentPage} onClick={createNotionDb}>{busy ? t("settings.creating") : t("settings.createDb")}</button></div>
        <div className="row"><input value={profile.notion_database_id} placeholder={t("settings.notionDbId")} onChange={(e) => setProfile({ ...profile, notion_database_id: e.target.value })} /></div>
        {notionMsg && <p className={notionMsg.err ? "err" : "ok"} style={{ marginTop: 8 }}>{notionMsg.text} {notionMsg.url && <a href={notionMsg.url} target="_blank" rel="noreferrer">{t("settings.open")}</a>}</p>}
      </section>

      <div className="row sticky-save">
        <button className="btn primary" onClick={save}>{t("settings.save")}</button>
        {msg && <span className={msg.err ? "err" : "ok"}>{msg.text}</span>}
        <span className="grow" />
        <button className="btn" onClick={onSignOut}>{t("settings.signOut")}</button>
      </div>
    </div>
  );
}

function strip(d) {
  const { id, email, status, is_admin, created_at, digest_last_sent_at, ...rest } = d;
  return Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, v ?? EMPTY[k] ?? ""]));
}
