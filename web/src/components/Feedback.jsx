import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useT } from "../lib/i18n";

export default function Feedback({ user }) {
  const { t } = useT();
  const kinds = t("feedback.kinds");
  const [kind, setKind] = useState(kinds[0]);
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [anon, setAnon] = useState(true);
  const [msg, setMsg] = useState(null);

  async function send(e) {
    e.preventDefault();
    if (!message.trim()) return;
    const { error } = await supabase.from("feedback").insert({ kind, message: message.trim(), contact: contact.trim() || null, user_id: anon ? null : user.id });
    if (error) setMsg({ err: true, text: error.message }); else { setMsg({ text: t("feedback.sent") }); setMessage(""); setContact(""); }
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
    </div>
  );
}
