import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useT, fmtDateTime } from "../lib/i18n";

export default function Comments({ paperId, user, me, names, onCountChange }) {
  const { t, lang } = useT();
  const [items, setItems] = useState([]);
  const [text, setText] = useState("");
  const [editing, setEditing] = useState(null); // {id, body}
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await supabase.from("comments").select("*").eq("paper_id", paperId).order("created_at");
    setItems(data || []);
    onCountChange?.(paperId, (data || []).length);
  }
  useEffect(() => { setText(""); setEditing(null); load(); }, [paperId]); // eslint-disable-line

  async function post(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("comments").insert({ paper_id: paperId, user_id: user.id, body: text.trim() });
    setBusy(false);
    if (!error) { setText(""); load(); }
  }
  async function saveEdit() {
    if (!editing?.body.trim()) return;
    await supabase.from("comments").update({ body: editing.body.trim(), updated_at: new Date().toISOString() }).eq("id", editing.id);
    setEditing(null); load();
  }
  async function remove(id) {
    if (!confirm(t("comments.confirmDelete"))) return;
    await supabase.from("comments").delete().eq("id", id); load();
  }
  const name = (uid) => (uid === user.id ? (me?.display_name || t("comments.you")) : (names[uid] || t("comments.member")));

  return (
    <div className="comments">
      {items.length === 0 && <div className="muted" style={{ padding: "4px 0 10px" }}>{t("comments.empty")}</div>}
      {items.map((c) => (
        <div key={c.id} className={`comment ${c.user_id === user.id ? "mine" : ""}`}>
          <div className="comment-head">
            <b>{name(c.user_id)}</b>
            <span className="muted">{fmtDateTime(c.created_at, lang)}{c.updated_at && ` · ${t("comments.edited")}`}</span>
            <span className="grow" />
            {c.user_id === user.id && <button className="btn small ghost" onClick={() => setEditing({ id: c.id, body: c.body })}>{t("comments.edit")}</button>}
            {(c.user_id === user.id || me?.is_admin) && <button className="btn small ghost" onClick={() => remove(c.id)}>{t("comments.delete")}</button>}
          </div>
          {editing?.id === c.id ? (
            <div>
              <textarea value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} rows={3} />
              <div className="row" style={{ marginTop: 6 }}><button className="btn small primary" onClick={saveEdit}>{t("comments.save")}</button><button className="btn small ghost" onClick={() => setEditing(null)}>{t("comments.cancel")}</button></div>
            </div>
          ) : <div className="comment-body">{c.body}</div>}
        </div>
      ))}
      <form onSubmit={post} className="comment-form">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder={t("comments.placeholder")}
          onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") post(e); }} />
        <div className="row"><span className="muted">{t("comments.hint")}</span><span className="grow" /><button className="btn small primary" disabled={busy || !text.trim()}>{t("comments.post")}</button></div>
      </form>
    </div>
  );
}
