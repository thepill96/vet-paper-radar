import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useT, fmtDate, fmtDateTime } from "../lib/i18n";

// Claude API 단가 (USD / 1M tokens). 모델 가격이 바뀌면 여기만 고치면 됨. 화면에는 "추정"으로 표시.
const PRICE = { input: 3, output: 15 };
const cost = (i, o) => ((i * PRICE.input + o * PRICE.output) / 1e6);

export default function Admin({ user }) {
  const { t, lang } = useT();
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [ann, setAnn] = useState([]);
  const [annText, setAnnText] = useState("");
  const [annLevel, setAnnLevel] = useState("info");
  const [feedback, setFeedback] = useState([]);
  const [usage, setUsage] = useState([]);
  const [reply, setReply] = useState({}); // feedback id -> draft
  const [msg, setMsg] = useState(null);

  const [setupError, setSetupError] = useState(null);

  async function loadAll() {
    try {
      const [o, u, a, f, g] = await Promise.all([
        supabase.rpc("admin_overview"), supabase.rpc("admin_user_stats"),
        supabase.from("announcements").select("*").order("created_at", { ascending: false }),
        supabase.from("feedback").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.rpc("admin_summary_usage"),
      ]);
      // 마이그레이션이 아직 실행되지 않으면 함수/테이블이 없어 여기서 오류가 옴
      const missing = [o, u, a, f, g].map((r) => r.error).find((e) => e && /does not exist|schema cache|relation/i.test(e.message));
      setSetupError(missing ? missing.message : null);
      setOverview(o.data); setUsers(u.data || []); setAnn(a.data || []); setFeedback(f.data || []); setUsage(g.data || []);
    } catch (e) {
      setSetupError(String(e?.message ?? e));
    }
  }
  useEffect(() => { loadAll(); }, []);

  const act = async (promise) => { const { error } = await promise; if (error) setMsg({ err: true, text: error.message }); else loadAll(); };
  const patchUser = (id, patch) => act(supabase.from("profiles").update(patch).eq("id", id));

  async function postAnn(e) {
    e.preventDefault();
    if (!annText.trim()) return;
    await act(supabase.from("announcements").insert({ body: annText.trim(), level: annLevel, created_by: user.id }));
    setAnnText("");
  }
  async function saveReply(f) {
    const r = (reply[f.id] ?? f.reply ?? "").trim();
    await act(supabase.from("feedback").update({ reply: r || null, replied_at: r ? new Date().toISOString() : null }).eq("id", f.id));
  }

  const pending = users.filter((u) => u.status === "pending");
  const others = users.filter((u) => u.status !== "pending");
  const totals = usage.reduce((a, r) => ({ n: a.n + Number(r.n), i: a.i + Number(r.input_tokens), o: a.o + Number(r.output_tokens) }), { n: 0, i: 0, o: 0 });
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthRows = usage.filter((r) => r.month === thisMonth);
  const month = monthRows.reduce((a, r) => ({ n: a.n + Number(r.n), i: a.i + Number(r.input_tokens), o: a.o + Number(r.output_tokens) }), { n: 0, i: 0, o: 0 });

  return (
    <div className="page wide">
      <h1>{t("admin.title")}</h1>
      <p className="lead">{t("admin.lead")}</p>
      {msg && <p className={msg.err ? "err" : "ok"}>{msg.text}</p>}
      {setupError && (
        <div className="setup-warn">
          <b>{t("admin.setupTitle")}</b>
          <div>{t("admin.setupBody")}</div>
          <code>{setupError}</code>
        </div>
      )}

      {overview && (
        <div className="stat-grid">
          {[["papers", overview.papers], ["papers7d", overview.papers_7d], ["summarized", overview.summarized], ["membersCount", overview.members], ["pending", overview.pending], ["comments", overview.comments], ["feedbackNew", overview.feedback_new]].map(([k, v]) => (
            <div key={k} className={`stat ${k === "pending" && v > 0 ? "hot" : ""}`}><div className="stat-n">{v}</div><div className="stat-l">{t(`admin.${k}`)}</div></div>
          ))}
        </div>
      )}

      <section className="admin">
        <h2>{t("settings.approvals")} {pending.length > 0 && <span className="badge">{pending.length}</span>}</h2>
        <p>{t("settings.approvalsHint")}</p>
        {pending.length === 0 && <div className="muted">{t("settings.noPending")}</div>}
        {pending.map((u) => (
          <div key={u.id} className="user-row">
            <div><b>{u.email}</b><div className="muted">{u.display_name} · {fmtDate(u.created_at, lang)}</div></div>
            <button className="btn small primary" onClick={() => patchUser(u.id, { status: "approved" })}>{t("settings.approve")}</button>
            <button className="btn small" onClick={() => patchUser(u.id, { status: "blocked" })}>{t("settings.block")}</button>
          </div>
        ))}
      </section>

      <section>
        <h2>{t("admin.members")}</h2>
        <p>{t("admin.membersHint")}</p>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>{t("admin.member")}</th><th>{t("admin.opened")}</th><th>{t("admin.read")}</th><th>{t("admin.bookmarks")}</th><th>{t("admin.notes")}</th><th>{t("admin.commentsCol")}</th><th>{t("admin.searches")}</th><th>{t("admin.lastActive")}</th><th></th></tr></thead>
            <tbody>
              {others.map((u) => (
                <tr key={u.id} className={u.status === "blocked" ? "dim" : ""}>
                  <td><b>{u.display_name || u.email.split("@")[0]}</b><div className="muted">{u.email}{u.is_admin && ` · ${t("settings.admin")}`}{u.status === "blocked" && ` · ${t("settings.blocked")}`}</div></td>
                  <td>{u.opened}</td><td>{u.read_count}</td><td>{u.bookmarks}</td><td>{u.notes}</td><td>{u.comments}</td><td>{u.searches}</td>
                  <td className="muted">{u.last_active ? fmtDateTime(u.last_active, lang) : "—"}</td>
                  <td className="actions">{u.id !== user.id && <>
                    <button className="btn small" onClick={() => patchUser(u.id, { status: u.status === "approved" ? "blocked" : "approved" })}>{u.status === "approved" ? t("settings.block") : t("settings.approve")}</button>
                    <button className="btn small" onClick={() => patchUser(u.id, { is_admin: !u.is_admin })}>{u.is_admin ? t("settings.removeAdmin") : t("settings.makeAdmin")}</button>
                  </>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>{t("admin.announcements")}</h2>
        <p>{t("admin.announcementsHint")}</p>
        <form onSubmit={postAnn}>
          <textarea value={annText} onChange={(e) => setAnnText(e.target.value)} rows={2} placeholder={t("admin.announcementPlaceholder")} />
          <div className="row">
            <div className="chips">{["info", "warning"].map((k) => <button key={k} type="button" className={`chip ${annLevel === k ? "on" : ""}`} onClick={() => setAnnLevel(k)}>{t(`admin.${k}`)}</button>)}</div>
            <span className="grow" /><button className="btn small primary" disabled={!annText.trim()}>{t("admin.publish")}</button>
          </div>
        </form>
        {ann.map((a) => (
          <div key={a.id} className={`user-row ${a.active ? "" : "dim"}`}>
            <div><div style={{ whiteSpace: "pre-wrap" }}>{a.body}</div><div className="muted">{t(`admin.${a.level}`)} · {fmtDateTime(a.created_at, lang)}{!a.active && ` · ${t("admin.inactive")}`}</div></div>
            <button className="btn small" onClick={() => act(supabase.from("announcements").update({ active: !a.active }).eq("id", a.id))}>{a.active ? t("admin.deactivate") : t("admin.activate")}</button>
            <button className="btn small ghost" onClick={() => act(supabase.from("announcements").delete().eq("id", a.id))}>{t("comments.delete")}</button>
          </div>
        ))}
      </section>

      <section>
        <h2>{t("admin.feedback")}</h2>
        <p>{t("admin.feedbackHint")}</p>
        {feedback.length === 0 && <div className="muted">{t("admin.noFeedback")}</div>}
        {feedback.map((f) => (
          <div key={f.id} className="fb-card">
            <div className="fb-head"><span className="tag">{f.kind}</span><span className="muted">{fmtDateTime(f.created_at, lang)}{f.contact && ` · ${f.contact}`}{!f.user_id && ` · ${t("admin.anonymous")}`}</span>
              <span className="grow" />
              <div className="chips">{["new", "planned", "done", "declined"].map((k) => <button key={k} type="button" className={`chip ${f.status === k ? "on" : ""}`} onClick={() => act(supabase.from("feedback").update({ status: k }).eq("id", f.id))}>{t(`admin.status_${k}`)}</button>)}</div>
            </div>
            <div style={{ whiteSpace: "pre-wrap", margin: "6px 0 8px" }}>{f.message}</div>
            <div className="row" style={{ marginTop: 0 }}>
              <input value={reply[f.id] ?? f.reply ?? ""} placeholder={t("admin.replyPlaceholder")} onChange={(e) => setReply({ ...reply, [f.id]: e.target.value })} />
              <button className="btn small" onClick={() => saveReply(f)}>{t("admin.reply")}</button>
            </div>
            {f.user_id ? <div className="muted" style={{ marginTop: 4 }}>{t("admin.replyVisible")}</div> : <div className="muted" style={{ marginTop: 4 }}>{t("admin.replyAnon")}</div>}
          </div>
        ))}
      </section>

      <section>
        <h2>{t("admin.usage")}</h2>
        <p>{t("admin.usageHint", { i: PRICE.input, o: PRICE.output })}</p>
        <div className="stat-grid small">
          <div className="stat"><div className="stat-n">{month.n}</div><div className="stat-l">{t("admin.thisMonth")}</div></div>
          <div className="stat"><div className="stat-n">${cost(month.i, month.o).toFixed(2)}</div><div className="stat-l">{t("admin.thisMonthCost")}</div></div>
          <div className="stat"><div className="stat-n">{totals.n}</div><div className="stat-l">{t("admin.allTime")}</div></div>
          <div className="stat"><div className="stat-n">${cost(totals.i, totals.o).toFixed(2)}</div><div className="stat-l">{t("admin.allTimeCost")}</div></div>
        </div>
        {usage.length > 0 && (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>{t("admin.month")}</th><th>{t("admin.source")}</th><th>{t("admin.count")}</th><th>{t("admin.tokens")}</th><th>{t("admin.estCost")}</th></tr></thead>
            <tbody>{usage.map((r, i) => <tr key={i}><td>{r.month}</td><td>{t(`admin.src_${r.source}`)}</td><td>{r.n}</td><td className="muted">{Number(r.input_tokens).toLocaleString()} / {Number(r.output_tokens).toLocaleString()}</td><td>${cost(Number(r.input_tokens), Number(r.output_tokens)).toFixed(2)}</td></tr>)}</tbody>
          </table></div>
        )}
      </section>
    </div>
  );
}
