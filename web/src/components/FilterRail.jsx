export default function FilterRail({ facets, filters, setFilters, open, onClose }) {
  const toggleIn = (key, value) =>
    setFilters((f) => {
      const set = new Set(f[key]);
      set.has(value) ? set.delete(value) : set.add(value);
      return { ...f, [key]: [...set] };
    });
  const set = (key, value) => setFilters((f) => ({ ...f, [key]: f[key] === value ? null : value }));
  const reset = () => setFilters({ species: null, categories: [], journal: null, state: null, period: 30 });

  return (
    <aside className={`rail ${open ? "open" : ""}`}>
      {open && <button className="btn" style={{ width: "100%", marginBottom: 12 }} onClick={onClose}>필터 닫기</button>}
      <h3>대상</h3>
      <div className="chips">
        <button className={`chip vet ${filters.species === "vet" ? "on" : ""}`} onClick={() => set("species", "vet")}>수의</button>
        <button className={`chip human ${filters.species === "human" ? "on" : ""}`} onClick={() => set("species", "human")}>인의</button>
      </div>

      <h3>기간</h3>
      <div className="chips">
        {[7, 30, 90, 365, 0].map((d) => (
          <button key={d} className={`chip ${filters.period === d ? "on" : ""}`} onClick={() => setFilters((f) => ({ ...f, period: d }))}>
            {d === 0 ? "전체" : `${d}일`}
          </button>
        ))}
      </div>

      <h3>내 상태</h3>
      <div className="chips">
        <button className={`chip ${filters.state === "unread" ? "on" : ""}`} onClick={() => set("state", "unread")}>안 읽음</button>
        <button className={`chip ${filters.state === "read" ? "on" : ""}`} onClick={() => set("state", "read")}>읽음</button>
        <button className={`chip ${filters.state === "noted" ? "on" : ""}`} onClick={() => set("state", "noted")}>메모 있음</button>
        <button className={`chip ${filters.state === "ai" ? "on" : ""}`} onClick={() => set("state", "ai")}>AI 요약 있음</button>
      </div>

      <h3>분야</h3>
      <div className="chips">
        {facets.categories.map((c) => (
          <button key={c} className={`chip ${filters.categories.includes(c) ? "on" : ""}`} onClick={() => toggleIn("categories", c)}>{c}</button>
        ))}
        {!facets.categories.length && <span style={{ color: "var(--ink-3)", fontSize: 12 }}>수집 후 표시됨</span>}
      </div>

      <h3>저널</h3>
      {facets.journals.map((j) => (
        <button key={j} className={`list-btn ${filters.journal === j ? "on" : ""}`} onClick={() => set("journal", j)}>{j}</button>
      ))}

      <button className="btn reset" onClick={reset}>필터 초기화</button>
    </aside>
  );
}
