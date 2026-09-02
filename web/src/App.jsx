import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase, configured, callFunction } from "./lib/supabase";
import { I18nContext, makeT, detectLang, LANGS } from "./lib/i18n";
import Auth from "./components/Auth";
import Pending from "./components/Pending";
import ResetPassword from "./components/ResetPassword";
import FilterRail from "./components/FilterRail";
import PaperList from "./components/PaperList";
import PaperDetail from "./components/PaperDetail";
import Settings from "./components/Settings";
import About from "./components/About";
import Feedback from "./components/Feedback";
import Admin from "./components/Admin";

const PAGE = 60;
const DEFAULT_FILTERS = { species: null, categories: [], journal: null, state: null, period: 30 };
const NAV = ["feed", "recs", "bookmarks", "history", "about", "feedback", "settings"];

export default function App() {
  const [lang, setLangState] = useState(detectLang);
  const setLang = (l) => { setLangState(l); localStorage.setItem("ui_lang", l); document.documentElement.lang = l; };
  const i18n = useMemo(() => ({ lang, t: makeT(lang), setLang }), [lang]);
  return <I18nContext.Provider value={i18n}><Shell /></I18nContext.Provider>;
}

function Shell() {
  const { t, lang, setLang } = useI18n();
  const [session, setSession] = useState(undefined);
  // 재설정 메일 링크로 들어온 경우 (해시에 type=recovery)
  const [recovery, setRecovery] = useState(() => /type=recovery/.test(window.location.hash || ""));
  const [me, setMe] = useState(undefined);
  const [view, setView] = useState("feed");
  const [group, setGroup] = useState("category");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [query, setQuery] = useState("");
  const [qInput, setQInput] = useState("");
  const [facets, setFacets] = useState({ journals: [], categories: [], last_collected: null });
  const [papers, setPapers] = useState([]);
  const [total, setTotal] = useState(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [states, setStates] = useState({});
  const [selected, setSelected] = useState(null);
  const [railOpen, setRailOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [names, setNames] = useState({});
  const [banners, setBanners] = useState([]);
  const [dismissed, setDismissed] = useState(() => JSON.parse(localStorage.getItem("dismissed_ann") || "[]"));
  const [commentCounts, setCommentCounts] = useState({});
  const lastViewed = useRef(null);

  useEffect(() => {
    if (!configured) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  const user = session?.user;

  useEffect(() => {
    if (!user) { setMe(undefined); return; }
    supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => {
      setMe(data || null);
      if (data?.ui_lang && data.ui_lang !== lang) setLang(data.ui_lang);
    });
  }, [user?.id]); // eslint-disable-line
  const approved = me?.status === "approved";

  useEffect(() => {
    if (!user || !approved) return;
    supabase.from("user_papers").select("paper_id,is_read,is_bookmarked,note").then(({ data }) => setStates(Object.fromEntries((data || []).map((r) => [r.paper_id, r]))));
    supabase.rpc("filter_facets").then(({ data }) => data && setFacets(data));
    supabase.from("announcements").select("id,body,level").eq("active", true).order("created_at", { ascending: false }).then(({ data }) => setBanners(data || []));
    supabase.rpc("member_names").then(({ data }) => data && setNames(Object.fromEntries(data.map((r) => [r.id, r.display_name]))));
    if (me?.is_admin) supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "pending").then(({ count }) => setPendingCount(count || 0));
  }, [user?.id, approved]); // eslint-disable-line

  useEffect(() => {
    if (!user || !approved) return;
    const id = new URLSearchParams(window.location.search).get("paper");
    if (!id) return;
    supabase.from("papers").select("*").eq("id", id).single().then(({ data }) => { if (data) select(data); window.history.replaceState({}, "", window.location.pathname); });
  }, [user?.id, approved]); // eslint-disable-line

  const load = useCallback(async (pageNo, replace) => {
    if (!user || !approved) return;
    setLoading(true);
    const done = (rows, count) => { setPapers(rows); setTotal(count); setHasMore(false); setLoading(false); };
    let q = supabase.from("papers").select("*", { count: pageNo === 0 ? "exact" : undefined });

    if (["bookmarks", "history", "recs"].includes(view)) {
      let ids = [], extra = {};
      if (view === "bookmarks") ids = Object.values(states).filter((s) => s.is_bookmarked).map((s) => s.paper_id);
      if (view === "history") {
        const { data: h } = await supabase.from("view_history").select("paper_id").order("viewed_at", { ascending: false }).limit(300);
        for (const r of h || []) if (!ids.includes(r.paper_id)) ids.push(r.paper_id);
        ids = ids.slice(0, 100);
      }
      if (view === "recs") {
        const { data: r } = await supabase.from("recommendations").select("paper_id,reason").order("created_at", { ascending: false }).order("score", { ascending: false }).limit(60);
        for (const x of r || []) if (!ids.includes(x.paper_id)) { ids.push(x.paper_id); extra[x.paper_id] = x.reason; }
      }
      if (!ids.length) return done([], 0);
      const { data } = await supabase.from("papers").select("*").in("id", ids);
      const byId = Object.fromEntries((data || []).map((p) => [p.id, p]));
      fetchCounts(ids);
      return done(ids.map((id) => byId[id] && { ...byId[id], _reason: extra[id] }).filter(Boolean), ids.length);
    }

    if (filters.species) q = q.eq("species", filters.species);
    if (filters.journal) q = q.eq("journal", filters.journal);
    if (filters.categories.length) q = q.overlaps("categories", filters.categories);
    if (filters.period) q = q.gte("created_at", new Date(Date.now() - filters.period * 864e5).toISOString());
    if (query.trim()) q = q.textSearch("fts", query.trim(), { type: "websearch", config: "simple" });
    if (filters.state === "ai") q = q.not("summary_ko", "is", null);
    if (["read", "noted", "bookmarked"].includes(filters.state)) {
      const pick = { read: (s) => s.is_read, noted: (s) => s.note, bookmarked: (s) => s.is_bookmarked }[filters.state];
      const ids = Object.values(states).filter(pick).map((s) => s.paper_id);
      if (!ids.length) return done([], 0);
      q = q.in("id", ids);
    }
    if (filters.state === "unread") {
      const ids = Object.values(states).filter((s) => s.is_read).map((s) => s.paper_id);
      if (ids.length) q = q.not("id", "in", `(${ids.join(",")})`);
    }
    q = q.order(group === "latest" ? "created_at" : "pub_date", { ascending: false, nullsFirst: false }).range(pageNo * PAGE, pageNo * PAGE + PAGE - 1);
    const { data, count, error } = await q;
    if (error) setToast(error.message);
    const rows = data || [];
    setPapers((prev) => (replace ? rows : [...prev, ...rows]));
    fetchCounts(rows.map((p) => p.id));
    if (count != null) setTotal(count);
    setHasMore(rows.length === PAGE);
    setLoading(false);
  }, [user, approved, view, filters, query, group, states]);

  async function fetchCounts(ids) {
    if (!ids.length) return;
    const { data } = await supabase.rpc("comment_counts", { ids });
    if (data) setCommentCounts((c) => ({ ...c, ...Object.fromEntries(data.map((r) => [r.paper_id, Number(r.n)])) }));
  }

  const listView = ["feed", "recs", "bookmarks", "history"].includes(view);
  useEffect(() => { if (listView) { setPage(0); load(0, true); } }, [view, filters, query, group, user?.id, approved]); // eslint-disable-line
  const more = () => { const n = page + 1; setPage(n); load(n, false); };

  async function select(p) {
    setSelected(p);
    if (lastViewed.current !== p.id) {
      lastViewed.current = p.id;
      supabase.from("view_history").insert({ user_id: user.id, paper_id: p.id });
      if (me?.auto_read !== false && !states[p.id]?.is_read) upsertState(p.id, { is_read: true });
    }
  }
  async function upsertState(paperId, patch) {
    const next = { ...(states[paperId] || { is_read: false, is_bookmarked: false, note: "" }), ...patch, paper_id: paperId, user_id: user.id, updated_at: new Date().toISOString() };
    setStates((s) => ({ ...s, [paperId]: next }));
    const { error } = await supabase.from("user_papers").upsert(next);
    if (error) setToast(error.message);
  }
  const toggle = (id, key) => upsertState(id, { [key]: !states[id]?.[key] });
  const saveNote = (id, note) => upsertState(id, { note });
  async function summarize(paperId) {
    const patch = await callFunction("summarize", { paper_id: paperId });
    setPapers((ps) => ps.map((p) => (p.id === paperId ? { ...p, ...patch } : p)));
    setSelected((s) => (s?.id === paperId ? { ...s, ...patch } : s));
  }
  async function readwise(ids) {
    try { const r = await callFunction("readwise-export", { paper_ids: ids }); setToast(t("toast.readwise", { n: r.sent })); } catch (e) { setToast(e.message); throw e; }
  }
  async function notionExport(ids) {
    try { setToast(t("toast.notionSending", { n: ids.length })); const r = await callFunction("notion-export", { action: "export", paper_ids: ids }); setToast(t("toast.notion", { c: r.created, u: r.updated })); }
    catch (e) { setToast(e.message); throw e; }
  }
  useEffect(() => { if (toast) { const x = setTimeout(() => setToast(null), 4000); return () => clearTimeout(x); } }, [toast]);

  if (!configured) return <div className="auth"><div className="auth-card"><h1>Configuration needed</h1><p>Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to web/.env and restart.</p></div></div>;
  if (session === undefined) return null;
  if (recovery && session) return <ResetPassword onDone={() => { setRecovery(false); window.location.hash = ""; }} />;
  if (!session) return <Auth />;
  if (me === undefined) return null;
  if (!approved) return <Pending user={user} blocked={me?.status === "blocked"} />;

  const displayName = me?.display_name || user.email.split("@")[0];
  const summaryDefault = me?.summary_lang || (lang === "ko" ? "ko" : "en");

  return (
    <div className={`app ${banners.some((b) => !dismissed.includes(b.id)) ? "has-banner" : ""}`}>
      <header className="appbar">
        <button className="btn small ghost mobile-only" onClick={() => setRailOpen(true)} aria-label="Filters">☰</button>
        <div className="logo"><span className="logo-mark" />Vet Stacks</div>
        <nav className="nav">
          {[...NAV, ...(me?.is_admin ? ["admin"] : [])].map((k) => <button key={k} className={view === k ? "on" : ""} onClick={() => { setView(k); setSelected(null); }}>{t(`nav.${k}`)}{k === "admin" && pendingCount > 0 && <span className="badge">{pendingCount}</span>}</button>)}
        </nav>
        <span className="grow" />
        {view === "feed" && (
          <form className="search" onSubmit={(e) => { e.preventDefault(); setQuery(qInput); if (qInput.trim()) supabase.from("search_log").insert({ user_id: user.id, query: qInput.trim() }); }}>
            <span className="search-icon">⌕</span>
            <input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder={t("search")} aria-label={t("search")} />
            {qInput && <button type="button" onClick={() => { setQInput(""); setQuery(""); }} aria-label="Clear">×</button>}
          </form>
        )}
        <select className="lang-select" value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Language">
          {LANGS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <span className="who">{displayName}</span>
      </header>

      {banners.filter((b) => !dismissed.includes(b.id)).slice(0, 1).map((b) => (
        <div key={b.id} className={`banner ${b.level}`}>
          <span>{b.body}</span>
          <button className="btn small ghost" onClick={() => { const d = [...dismissed, b.id]; setDismissed(d); localStorage.setItem("dismissed_ann", JSON.stringify(d)); }}>{t("banner.dismiss")}</button>
        </div>
      ))}
      {listView ? (
        <div className={`body ${selected ? "reading" : ""} ${view !== "feed" ? "no-rail" : ""}`}>
          {view === "feed" && <FilterRail group={group} setGroup={setGroup} facets={facets} filters={filters} setFilters={setFilters} open={railOpen} onClose={() => setRailOpen(false)} />}
          <PaperList papers={papers} states={states} selectedId={selected?.id} onSelect={select} loading={loading} hasMore={hasMore} onMore={more}
            view={view} group={group} total={total} lastCollected={facets.last_collected} commentCounts={commentCounts} onReadwise={readwise} onNotion={notionExport} onToggleRead={(id) => toggle(id, "is_read")} />
          <PaperDetail paper={selected} state={selected ? states[selected.id] : null} defaultLang={summaryDefault} user={user} me={me} names={names}
            onCommentCount={(id, n) => setCommentCounts((c) => ({ ...c, [id]: n }))} onToggle={toggle} onSaveNote={saveNote}
            onSummarize={summarize} onReadwise={readwise} onNotion={notionExport} onBack={() => setSelected(null)} />
        </div>
      ) : (
        <main className="reader">
          {view === "settings" && <Settings user={user} me={me} onSignOut={() => supabase.auth.signOut()} onProfileChange={(p) => setMe((m) => ({ ...m, ...p }))} />}
          {view === "about" && <About />}
          {view === "feedback" && <Feedback user={user} />}
        </main>
      )}
      {toast && <div role="status" className="toast">{toast}</div>}
    </div>
  );
}

import { useT as useI18n } from "./lib/i18n";
