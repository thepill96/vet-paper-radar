import { useState } from "react";
import { callFunction } from "../lib/supabase";
import { useT, fmtDate } from "../lib/i18n";

// PubMed 전체를 실시간으로 검색하고, 고른 논문만 우리 DB로 가져온다 (전체 아카이빙 대신)
export default function PubmedSearch({ onImported }) {
  const { t, lang } = useT();
  const [q, setQ] = useState("");
  const [species, setSpecies] = useState(null);
  const [years, setYears] = useState(null);
  const [sort, setSort] = useState("relevance");
  const [page, setPage] = useState(0);
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState([]);
  const [msg, setMsg] = useState(null);

  async function run(p = 0) {
    if (!q.trim()) return;
    setBusy(true); setMsg(null);
    try {
      const r = await callFunction("pubmed", { action: "search", query: q.trim(), species, years, sort, page: p });
      setData(r); setPage(p); setPicked([]);
    } catch (e) { setMsg({ err: true, text: e.message }); } finally { setBusy(false); }
  }

  async function importPmids(pmids) {
    setBusy(true); setMsg(null);
    try {
      const r = await callFunction("pubmed", { action: "import", pmids });
      setMsg({ text: t("pubmed.imported", { n: r.imported }) });
      setData((d) => d && { ...d, results: d.results.map((x) => (pmids.includes(x.pmid) ? { ...x, in_library: true } : x)) });
      setPicked([]);
      onImported?.();
    } catch (e) { setMsg({ err: true, text: e.message }); } finally { setBusy(false); }
  }

  const toggle = (pmid) => setPicked((p) => (p.includes(pmid) ? p.filter((x) => x !== pmid) : [...p, pmid]));
  const newOnes = (data?.results ?? []).filter((r) => !r.in_library);

  return (
    <div className="page wide">
      <h1>{t("pubmed.title")}</h1>
      <p className="lead">{t("pubmed.lead")}</p>

      <section>
        <form className="pm-form" onSubmit={(e) => { e.preventDefault(); run(0); }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("pubmed.placeholder")} />
          <button className="btn primary" disabled={busy || !q.trim()}>{busy ? t("pubmed.searching") : t("pubmed.search")}</button>
        </form>
        <div className="chips" style={{ marginTop: 10 }}>
          <button type="button" className={`chip ${species === "vet" ? "on" : ""}`} onClick={() => setSpecies(species === "vet" ? null : "vet")}>{t("filter.vet")}</button>
          {[1, 5, 10].map((y) => (
            <button key={y} type="button" className={`chip ${years === y ? "on" : ""}`} onClick={() => setYears(years === y ? null : y)}>{t("filter.years", { n: y })}</button>
          ))}
          <button type="button" className={`chip ${sort === "date" ? "on" : ""}`} onClick={() => setSort(sort === "date" ? "relevance" : "date")}>{t("pubmed.sortDate")}</button>
        </div>
        <p className="muted" style={{ marginTop: 10 }}>{t("pubmed.syntaxHint")}</p>
      </section>

      {msg && <p className={msg.err ? "err" : "ok"}>{msg.text}</p>}

      {data && (
        <section>
          <div className="pm-head">
            <b>{t("pubmed.results", { n: data.total.toLocaleString() })}</b>
            <span className="grow" />
            {picked.length > 0 && <button className="btn small primary" disabled={busy} onClick={() => importPmids(picked)}>{t("pubmed.importSelected", { n: picked.length })}</button>}
            {newOnes.length > 0 && <button className="btn small" disabled={busy} onClick={() => importPmids(newOnes.map((r) => r.pmid))}>{t("pubmed.importAll", { n: newOnes.length })}</button>}
          </div>

          {data.results.length === 0 && <div className="muted">{t("pubmed.noResults")}</div>}

          {data.results.map((r) => (
            <div key={r.pmid} className={`pm-item ${r.in_library ? "have" : ""}`}>
              <input type="checkbox" disabled={r.in_library} checked={picked.includes(r.pmid)} onChange={() => toggle(r.pmid)} aria-label={r.title} />
              <div>
                <div className="pm-title">{r.title}</div>
                <div className="pm-meta">
                  <span className={`dot ${r.species}`} />{r.journal_abbrev || r.journal} · {fmtDate(r.pub_date, lang)} ·{" "}
                  <a href={r.url} target="_blank" rel="noreferrer">PubMed {r.pmid} ↗</a>
                  {(r.categories || []).slice(0, 3).map((c) => <span key={c} className="tag">{t(`cat.${c}`)}</span>)}
                </div>
                {r.abstract && <div className="pm-abs">{r.abstract.slice(0, 260)}…</div>}
              </div>
              {r.in_library
                ? <span className="tag">{t("pubmed.inLibrary")}</span>
                : <button className="btn small" disabled={busy} onClick={() => importPmids([r.pmid])}>{t("pubmed.import")}</button>}
            </div>
          ))}

          {data.total > 20 && (
            <div className="row" style={{ justifyContent: "center" }}>
              <button className="btn small" disabled={busy || page === 0} onClick={() => run(page - 1)}>← {t("pubmed.prev")}</button>
              <span className="muted">{page + 1} / {Math.ceil(Math.min(data.total, 1000) / 20)}</span>
              <button className="btn small" disabled={busy || (page + 1) * 20 >= data.total} onClick={() => run(page + 1)}>{t("pubmed.next")} →</button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
