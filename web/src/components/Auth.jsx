import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Auth() {
  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const friendly = (e) => {
    const m = e?.message || String(e);
    if (/초대되지 않은|Database error saving new user/i.test(m)) return "초대된 이메일이 아닙니다. 운영자에게 초대를 요청하세요.";
    if (/Invalid login credentials/i.test(m)) return "이메일 또는 비밀번호가 맞지 않습니다.";
    if (/Email not confirmed/i.test(m)) return "이메일 인증이 아직 안 됐습니다. 받은편지함을 확인하세요.";
    return m;
  };

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password: pw });
        if (error) throw error;
        setMsg({ ok: true, text: "가입 요청됨. 인증 메일의 링크를 누르면 로그인할 수 있습니다." });
      }
    } catch (err) {
      setMsg({ ok: false, text: friendly(err) });
    } finally { setBusy(false); }
  }

  async function google() {
    setMsg(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + import.meta.env.BASE_URL },
    });
    if (error) setMsg({ ok: false, text: friendly(error) });
  }

  return (
    <div className="auth">
      <form className="auth-card" onSubmit={submit}>
        <h1>Vet Paper Radar</h1>
        <p>매일 아침 수의·인의 임상 논문을 모아 읽고, 메모하고, 내보내는 곳. 초대된 계정만 들어올 수 있습니다.</p>

        <button type="button" className="btn" style={{ width: "100%" }} onClick={google}>Google로 계속하기</button>
        <div className="or">또는 이메일로</div>

        <label htmlFor="email">이메일</label>
        <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label htmlFor="pw">비밀번호</label>
        <input id="pw" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={pw} onChange={(e) => setPw(e.target.value)} minLength={6} required />

        <div className="row">
          <button className="btn primary" disabled={busy} style={{ flex: 1 }}>
            {busy ? "처리 중" : mode === "login" ? "로그인" : "가입하기"}
          </button>
          <button type="button" className="btn ghost" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMsg(null); }}>
            {mode === "login" ? "처음이면 가입" : "이미 계정이 있음"}
          </button>
        </div>
        {msg && <div className={`auth-msg ${msg.ok ? "" : "err"}`}>{msg.text}</div>}
      </form>
    </div>
  );
}
