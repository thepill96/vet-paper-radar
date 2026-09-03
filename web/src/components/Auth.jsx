import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useT, LANGS } from "../lib/i18n";

export default function Auth({ linkError, onClearLinkError }) {
  const { t, lang, setLang } = useT();
  const [mode, setMode] = useState("login"); // login | signup | forgot
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState(null);

  const friendly = (e) => {
    const m = e?.message || String(e);
    if (/Invalid login credentials/i.test(m)) return t("auth.badCreds");
    if (/Email not confirmed/i.test(m)) return t("auth.notConfirmed");
    if (/already registered/i.test(m)) return t("auth.exists");
    return m;
  };

  async function google() {
    setBusy("google"); setMsg(null); onClearLinkError?.();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + import.meta.env.BASE_URL },
    });
    if (error) { setMsg({ err: true, text: friendly(error) }); setBusy(null); }
  }

  async function submit(e) {
    e.preventDefault(); setBusy("email"); setMsg(null); onClearLinkError?.();
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + import.meta.env.BASE_URL,
        });
        if (error) throw error;
        setMsg({ text: t("auth.resetSent") });
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password: pw });
        if (error) throw error;
        setMsg({ text: t("auth.signedUp") });
      }
    } catch (err) { setMsg({ err: true, text: friendly(err) }); } finally { setBusy(null); }
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

        {(msg || linkError) && (() => {
          const le = typeof linkError === "string" ? { code: linkError } : linkError;
          const m = msg || { err: true, code: le.code, text: le.description || le.code };
          return (
          <div className={`auth-msg ${m.err ? "err" : ""}`}>
            {m.text}
            {m.code === "otp_expired" && <div>{t("auth.expiredHint")}</div>}
            {/(provider is not enabled|validation_failed|unsupported provider)/i.test(`${m.text} ${m.code ?? ""}`) && <div>{t("auth.providerHint")}</div>}
            {/redirect|Unable to exchange/i.test(`${m.text}`) && <div>{t("auth.redirectHint")}</div>}
          </div>
          );
        })()}

        <div className="oauth">
          <button type="button" className="btn wide oauth-btn" disabled={busy} onClick={google}>
            <svg viewBox="0 0 18 18" width="17" height="17" aria-hidden="true">
              <path fill="#4285F4" d="M17.6 9.2c0-.6-.05-1.2-.16-1.7H9v3.3h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.5z"/>
              <path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.5-1.8.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9v2.3A9 9 0 0 0 9 18z"/>
              <path fill="#FBBC05" d="M3.9 10.7a5.4 5.4 0 0 1 0-3.4V5H.9a9 9 0 0 0 0 8l3-2.3z"/>
              <path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.4 1.3l2.6-2.6A9 9 0 0 0 .9 5l3 2.3C4.6 5.2 6.6 3.6 9 3.6z"/>
            </svg>
            {busy === "google" ? t("auth.redirecting") : t("auth.google")}
          </button>
        </div>

        <div className="or">{t("auth.or")}</div>

        <label htmlFor="email">{t("auth.email")}</label>
        <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        {mode !== "forgot" && <>
          <label htmlFor="pw">{t("auth.password")}</label>
          <input id="pw" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={pw} onChange={(e) => setPw(e.target.value)} minLength={6} required />
        </>}

        <div className="row">
          <button className="btn primary" disabled={busy} style={{ flex: 1 }}>
            {busy === "email" ? t("auth.busy") : mode === "login" ? t("auth.signIn") : mode === "signup" ? t("auth.signUp") : t("auth.sendReset")}
          </button>
          <button type="button" className="btn ghost" onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setMsg(null); }}>
            {mode === "signup" ? t("auth.toSignIn") : t("auth.toSignUp")}
          </button>
        </div>

        <button type="button" className="linklike" onClick={() => { setMode(mode === "forgot" ? "login" : "forgot"); setMsg(null); }}>
          {mode === "forgot" ? t("auth.backToSignIn") : t("auth.forgot")}
        </button>

        <p className="auth-foot">{t("auth.approvalNote")}</p>
      </form>
    </div>
  );
}
