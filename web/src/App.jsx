import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase, configured, callFunction } from "./lib/supabase";
import Auth from "./components/Auth";
import FilterRail from "./components/FilterRail";
import PaperList from "./components/PaperList";
import PaperDetail from "./components/PaperDetail";
import Settings from "./components/Settings";

const PAGE = 50;
const DEFAULT_FILTERS = { species: null, categories: [], journal: null, state: null, period: 30 };

export default function App() {
  const [session, setSession] = useState(undefined);
  const [view, setView] = useState("feed"); // feed | bookmarks | history | settings
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [query, setQuery] = useState("");
  const [qInput, setQInput] = useState("");
  const [sort, setSort] = useState("created");
  const [facets, setFacets] = useState({ journals: [], categories: [] });
  const [papers, setPapers] = useState([]);
  const [total, setTotal] = useState(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [states, setStates] = useState({}); // paper_id -> {is_read,is_bookmarked,note}
  const [selected, setSelected] = useState(null);
  const [railOpen, setRailOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [summaryLang, setSummaryLang] = useState("ko");
  const lastViewed = useRef(null);

  // ---- 세션 ----
  useEffect(() => {
    if (!configured) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);
  const user = session?.user;

  // ---- 사용자 상태 + facet ----
  useEffect(() => {
    if (!user) return;
    supabase.from("user_papers").select("paper_id,is_read,is_bookmarked,note").then(({ data }) => {
      setStates(Object.fromEntries((data || []).map((r) => [r.paper_id, r])));
    });
    supabase.rpc("filter_facets").then(({ data }) => data && setFacets(data));
    supabase.from("profiles").select("summary_lang").eq("id", user.id).single().then(({ data }) => data?.summary_lang && setSummaryLang(data.summary_lang));
  }, [user?.id]);

  // ---- 논문 로드 ----
  const load = useCallback(async (pageNo, replace) => {
    if (!user) return;
    setLoading(true);
    let q = supabase.from("papers").select("*", { count: pageNo === 0 ? "exact" : undefined });

    if (view === "bookmarks") {
      const ids = Object.values(states).filter((s) => s.is_bookmarked).map((s) => s.paper_id);
      if (!ids.length) { setPapers([]); setTotal(0); setHasMore(false); setLoading(false); return; }
      q = q.in("id", ids).order("created_at", { ascending: false });
    } else if (view === "history") {
      const { data: h } = await supabase.from("view_history").select("paper_id,viewed_at").order("viewed_at", { ascending: false }).limit(300);
      const seen = [];
      for (const r of h || []) if (!seen.includes(r.paper_id)) seen.push(r.paper_id);
      const ids = seen.slice(0, 100);
      if (!ids.length) { setPapers([]); setTotal(0); setHasMore(false); setLoading(false); return; }
      const { data } = await supabase.from("papers").select("*").in("id", ids);
      const byId = Object.fromEntries((data || []).map((p) => [p.id, p]));
      setPapers(ids.map((id) => byId[id]).filter(Boolean)); setTotal(ids.length); setHasMore(false); setLoading(false);
      return;
    } else {
      if (filters.species) q = q.eq("species", filters.species);
      if (filters.journal) q = q.eq("journal", filters.journal);
      if (filters.categories.length) q = q.overlaps("categories", filters.categories);
      if (filters.period) q = q.gte("created_at", new Date(Date.now() - filters.period * 864e5).toISOString());
      if (query.trim()) q = q.textSearch("fts", query.trim(), { type: "websearch", config: "simple" });
      if (filters.state === "ai") q = q.not("summary_ko", "is", null);
      if (filters.state === "read" || filters.state === "noted") {
        const ids = Object.values(states).filter((s) => (filters.state === "read" ? s.is_read : s.note)).map((s) => s.paper_id);
        if (!ids.length) { setPapers([]); setTotal(0); setHasMore(false); setLoading(false); return; }
        q = q.in("id", ids);
      }
      if (filters.state === "unread") {
        const ids = Object.values(states).filter((s) => s.is_read).map((s) => s.paper_id);
        if (ids.length) q = q.not("id", "in", `(${ids.join(",")})`);
      }
      if (sort === "pub") q = q.order("pub_date", { ascending: false, nullsFirst: false });
      else if (sort === "title") q = q.order("title");
      else q = q.order("created_at", { ascending: false });
      q = q.range(pageNo * PAGE, pageNo * PAGE + PAGE - 1);
    }

    const { data, count, error } = await q;
    if (error) setToast(error.message);
    const rows = data || [];
    setPapers((prev) => (replace ? rows : [...prev, ...rows]));
    if (count != null) setTotal(count);
    setHasMore(rows.length === PAGE);
    setLoading(false);
  }, [user, view, filters, query, sort, states]);

  useEffect(() => { if (view !== "settings") { setPage(0); load(0, true); } }, [view, filters, query, sort, user?.id]); // eslint-disable-line
  const more = () => { const n = page + 1; setPage(n); load(n, false); };

  // ---- 선택 + 히스토리 ----
  async function select(p) {
    setSelected(p);
    if (lastViewed.current !== p.id) {
      lastViewed.current = p.id;
      await supabase.from("view_history").insert({ user_id: user.id, paper_id: p.id });
    }
  }

  // ---- 사용자 상태 변경 ----
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
    try {
      const r = await callFunction("readwise-export", { paper_ids: ids });
      setToast(`Readwise로 하이라이트 ${r.sent}개 보냄`);
    } catch (e) { setToast(e.message); throw e; }
  }

  async function notionExport(ids) {
    try {
      setToast(`Notion으로 보내는 중… (${ids.length}편)`);
      const r = await callFunction("notion-export", { action: "export", paper_ids: ids });
      setToast(`Notion: ${r.created}편 추가, ${r.updated}편 갱신`);
    } catch (e) { setToast(e.message); throw e; }
  }

  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 4000); return () => clearTimeout(t); } }, [toast]);

  const displayName = useMemo(() => user?.user_metadata?.full_name || user?.email?.split("@")[0], [user]);

  // ---- 렌더 ----
  if (!configured) {
    return <div className="auth"><div className="auth-card"><h1>설정이 필요합니다</h1><p>web/.env 에 VITE_SUPABASE_URL 과 VITE_SUPABASE_ANON_KEY 를 넣고 다시 실행하세요. README의 1~3단계를 참고하세요.</p></div></div>;
  }
  if (session === undefined) return null;
  if (!session) return <Auth />;

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">Vet Paper Radar</span>
        <nav className="tabs">
          {[["feed", "논문"], ["bookmarks", "북마크"], ["history", "히스토리"], ["settings", "설정"]].map(([k, l]) => (
            <button key={k} className={view === k ? "on" : ""} onClick={() => { setView(k); setSelected(null); }}>{l}</button>
          ))}
          <button className="mobile-back" onClick={() => setRailOpen((o) => !o)}>필터</button>
        </nav>
        {view === "feed" && (
          <form className="search" onSubmit={(e) => { e.preventDefault(); setQuery(qInput); }}>
            <input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="제목·초록·요약 검색 (예: TPLO complication)" aria-label="검색" />
            {qInput && <button type="button" onClick={() => { setQInput(""); setQuery(""); }} aria-label="지우기">×</button>}
          </form>
        )}
        <span className="who">{displayName}</span>
      </header>

      {view === "settings" ? (
        <main className="reader"><Settings user={user} onSignOut={() => supabase.auth.signOut()} onLangChange={setSummaryLang} /></main>
      ) : (
        <div className={`body ${selected ? "reading" : ""}`}>
          <FilterRail facets={facets} filters={filters} setFilters={(f) => { setFilters(f); setRailOpen(false); }} open={railOpen} onClose={() => setRailOpen(false)} />
          <PaperList papers={papers} states={states} selectedId={selected?.id} onSelect={select} loading={loading}
            hasMore={hasMore} onMore={more} sort={sort} setSort={setSort} view={view} total={total} onReadwise={readwise} onNotion={notionExport} />
          <PaperDetail paper={selected} state={selected ? states[selected.id] : null} defaultLang={summaryLang} onToggle={toggle} onSaveNote={saveNote}
            onSummarize={summarize} onReadwise={readwise} onNotion={notionExport} onBack={() => setSelected(null)} />
        </div>
      )}

      {toast && <div role="status" style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", background: "var(--ink)", color: "#fff", padding: "10px 16px", borderRadius: 6, fontSize: 13, zIndex: 10 }}>{toast}</div>}
    </div>
  );
}
