import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useT, LANGS } from "../lib/i18n";

export default function Auth() {
  const { t, lang, setLang } = useT();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const friendly = (e) => {
    const m = e?.message || String(e);
    if (/Invalid login credentials/i.test(m)) return t("auth.badCreds");
    if (/Email not confirmed/i.test(m)) return t("auth.notConfirmed");
    return m;
  };
  async function submit(e) {
    e.preventDefault(); setBusy(true); setMsg(null);
    try {
      if (mode === "login") { const { error } = await supabase.auth.signInWithPassword({ email, password: pw }); if (error) throw error; }
      else { const { error } = await supabase.auth.signUp({ email, password: pw }); if (error) throw error; setMsg({ ok: true, text: t("auth.signedUp") }); }
    } catch (err) { setMsg({ ok: false, text: friendly(err) }); } finally { setBusy(false); }
  }
  async function google() {
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin + import.meta.env.BASE_URL } });
    if (error) setMsg({ ok: false, text: friendly(error) });
  }

  return (
    <div className="auth">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-top">
          <div className="logo"><span className="logo-mark" />{t("auth.title")}</div>
          <select className="lang-select" value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Language">
            {LANGS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
        <p>{t("auth.blurb")}</p>
        <button type="button" className="btn wide" onClick={google}>{t("auth.google")}</button>
        <div className="or">{t("auth.or")}</div>
        <label htmlFor="email">{t("auth.email")}</label>
        <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label htmlFor="pw">{t("auth.password")}</label>
        <input id="pw" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={pw} onChange={(e) => setPw(e.target.value)} minLength={6} required />
        <div className="row">
          <button className="btn primary" disabled={busy} style={{ flex: 1 }}>{busy ? t("auth.busy") : mode === "login" ? t("auth.signIn") : t("auth.signUp")}</button>
          <button type="button" className="btn ghost" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMsg(null); }}>{mode === "login" ? t("auth.toSignUp") : t("auth.toSignIn")}</button>
        </div>
        {msg && <div className={`auth-msg ${msg.ok ? "" : "err"}`}>{msg.text}</div>}
      </form>
    </div>
  );
}
