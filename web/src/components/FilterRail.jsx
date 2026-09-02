import { useT } from "../lib/i18n";

export default function FilterRail({ group, setGroup, facets, filters, setFilters, open, onClose }) {
  const { t } = useT();
  const sp = filters.species;
  const journals = agg(facets.journals.filter((j) => !sp || j.species === sp));
  const categories = agg(facets.categories.filter((c) => !sp || c.species === sp));

  const toggleCat = (c) => setFilters((f) => ({ ...f, categories: f.categories.includes(c) ? f.categories.filter((x) => x !== c) : [...f.categories, c] }));
  const set = (k, v) => setFilters((f) => ({ ...f, [k]: f[k] === v ? null : v }));
  const setSpecies = (v) => setFilters((f) => {
    const next = f.species === v ? null : v;
    const validJ = new Set(facets.journals.filter((j) => !next || j.species === next).map((j) => j.name));
    const validC = new Set(facets.categories.filter((c) => !next || c.species === next).map((c) => c.name));
    return { ...f, species: next, journal: validJ.has(f.journal) ? f.journal : null, categories: f.categories.filter((c) => validC.has(c)) };
  });
  const reset = () => setFilters({ species: null, categories: [], journal: null, state: null, period: 30 });
  const active = (sp ? 1 : 0) + filters.categories.length + (filters.journal ? 1 : 0) + (filters.state ? 1 : 0);

  return (
    <aside className={`rail ${open ? "open" : ""}`}>
      {open && <button className="btn small wide" style={{ marginBottom: 12 }} onClick={onClose}>✕</button>}

      <h3>{t("view.label")}</h3>
      <div className="seg">
        {["category", "journal", "latest"].map((k) => <button key={k} className={group === k ? "on" : ""} onClick={() => setGroup(k)}>{t(`view.${k}`)}</button>)}
      </div>

      <h3>{t("filter.species")}</h3>
      <div className="seg">
        <button className={`vet ${sp === "vet" ? "on" : ""}`} onClick={() => setSpecies("vet")}>{t("filter.vet")}</button>
        <button className={`human ${sp === "human" ? "on" : ""}`} onClick={() => setSpecies("human")}>{t("filter.human")}</button>
      </div>

      <h3>{t("filter.period")}</h3>
      <div className="chips">
        {[7, 30, 90, 365, 0].map((d) => <button key={d} className={`chip ${filters.period === d ? "on" : ""}`} onClick={() => setFilters((f) => ({ ...f, period: d }))}>{d === 0 ? t("filter.all") : t("filter.days", { n: d })}</button>)}
      </div>

      <h3>{t("filter.state")}</h3>
      <div className="chips">
        {["unread", "read", "bookmarked", "noted", "ai"].map((k) => <button key={k} className={`chip ${filters.state === k ? "on" : ""}`} onClick={() => set("state", k)}>{t(`filter.${k}`)}</button>)}
      </div>

      <h3>{t("filter.categories")}{filters.categories.length > 0 && <span className="muted">{t("filter.selected", { n: filters.categories.length })}</span>}</h3>
      <div className="facets">
        {categories.map((c) => (
          <button key={c.name} className={`facet ${filters.categories.includes(c.name) ? "on" : ""}`} onClick={() => toggleCat(c.name)}>
            <span className="label">{t(`cat.${c.name}`)}</span><span className="n">{c.n}</span>
          </button>
        ))}
        {!categories.length && <div className="muted" style={{ padding: "4px 8px" }}>{t("filter.afterCollect")}</div>}
      </div>

      <h3>{t("filter.journals")}</h3>
      <div className="facets">
        {journals.map((j) => (
          <button key={j.name} className={`facet ${filters.journal === j.name ? "on" : ""}`} onClick={() => set("journal", j.name)}>
            <span className={`dot ${j.species}`} /><span className="label">{j.name}</span><span className="n">{j.n}</span>
          </button>
        ))}
      </div>

      {active > 0 && <button className="btn small wide reset" onClick={reset}>{t("filter.reset")} · {active}</button>}
    </aside>
  );
}

function agg(rows) {
  const m = new Map();
  for (const r of rows) {
    const cur = m.get(r.name);
    if (cur) { cur.n += r.n; if (cur.species !== r.species) cur.species = "both"; } else m.set(r.name, { ...r });
  }
  return [...m.values()].sort((a, b) => b.n - a.n);
}
