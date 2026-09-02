import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useT } from "../lib/i18n";

// 비밀번호 재설정 메일의 링크로 들어왔을 때 표시 (Supabase가 recovery 세션을 만들어 줌)
export default function ResetPassword({ onDone }) {
  const { t } = useT();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function submit(e) {
    e.preventDefault();
    if (pw !== pw2) { setMsg({ err: true, text: t("auth.mismatch") }); return; }
    setBusy(true); setMsg(null);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) setMsg({ err: true, text: error.message });
    else { setMsg({ text: t("auth.resetDone") }); setTimeout(onDone, 1200); }
  }

  return (
    <div className="auth">
      <form className="auth-card" onSubmit={submit}>
        <div className="logo"><span className="logo-mark" />{t("auth.title")}</div>
        <h1>{t("auth.newPassword")}</h1>
        <p>{t("auth.newPasswordHint")}</p>
        <label htmlFor="np">{t("auth.password")}</label>
        <input id="np" type="password" autoComplete="new-password" minLength={6} value={pw} onChange={(e) => setPw(e.target.value)} required />
        <label htmlFor="np2">{t("auth.confirmPassword")}</label>
        <input id="np2" type="password" autoComplete="new-password" minLength={6} value={pw2} onChange={(e) => setPw2(e.target.value)} required />
        <div className="row"><button className="btn primary wide" disabled={busy}>{busy ? t("auth.busy") : t("auth.savePassword")}</button></div>
        {msg && <div className={`auth-msg ${msg.err ? "err" : ""}`}>{msg.text}</div>}
      </form>
    </div>
  );
}
