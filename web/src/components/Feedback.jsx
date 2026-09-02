import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useT, fmtDateTime } from "../lib/i18n";

export default function Feedback({ user }) {
  const { t } = useT();
  const kinds = t("feedback.kinds");
  const [kind, setKind] = useState(kinds[0]);
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [anon, setAnon] = useState(true);
  const [msg, setMsg] = useState(null);
  const [mine, setMine] = useState([]);
  const { lang } = useT();
  const loadMine = () => supabase.from("feedback").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => setMine(data || []));
  useEffect(() => { loadMine(); }, [user.id]); // eslint-disable-line

  async function send(e) {
    e.preventDefault();
    if (!message.trim()) return;
    const { error } = await supabase.from("feedback").insert({ kind, message: message.trim(), contact: contact.trim() || null, user_id: anon ? null : user.id });
    if (error) setMsg({ err: true, text: error.message }); else { setMsg({ text: t("feedback.sent") }); setMessage(""); setContact(""); loadMine(); }
  }
  return (
    <div className="page">
      <h1>{t("feedback.title")}</h1>
      <p className="lead">{t("feedback.lead")}</p>
      <form onSubmit={send}>
        <section>
          <h2>{t("feedback.kind")}</h2>
          <div className="chips">{kinds.map((k) => <button key={k} type="button" className={`chip ${kind === k ? "on" : ""}`} onClick={() => setKind(k)}>{k}</button>)}</div>
          <h2 style={{ marginTop: 18 }}>{t("feedback.message")}</h2>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} placeholder={t("feedback.placeholder")} />
          <label className="check" style={{ marginTop: 10 }}><input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} /> {t("feedback.anon")}</label>
          <input style={{ marginTop: 10 }} value={contact} onChange={(e) => setContact(e.target.value)} placeholder={t("feedback.contact")} />
        </section>
        <div className="row"><button className="btn primary" disabled={!message.trim()}>{anon ? t("feedback.sendAnon") : t("feedback.send")}</button>{msg && <span className={msg.err ? "err" : "ok"}>{msg.text}</span>}</div>
      </form>
      {mine.length > 0 && (
        <section style={{ marginTop: 20 }}>
          <h2>{t("feedbackMine.title")}</h2>
          {mine.map((f) => (
            <div key={f.id} className="fb-card">
              <div className="fb-head"><span className="tag">{f.kind}</span><span className="tag">{t(`admin.status_${f.status || "new"}`)}</span><span className="muted">{fmtDateTime(f.created_at, lang)}</span></div>
              <div style={{ whiteSpace: "pre-wrap", margin: "6px 0" }}>{f.message}</div>
              {f.reply && <div className="fb-reply"><b>{t("feedbackMine.reply")}</b> — {f.reply}</div>}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
