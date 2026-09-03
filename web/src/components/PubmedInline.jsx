import { useEffect, useState } from "react";
import { callFunction } from "../lib/supabase";
import { useT, fmtDate } from "../lib/i18n";

// 논문 목록 아래에 붙는 "PubMed 전체" 구역.
// 내 서재에서 찾은 게 없거나 부족할 때 같은 검색어로 PubMed 전체를 찾아보고, 고른 것만 가져온다.
export default function PubmedInline({ query, species, autoOpen, onImported }) {
  const { t, lang } = useT();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState([]);
  const [msg, setMsg] = useState(null);

  // 검색어가 바뀌면 접었다가, 서재 결과가 없으면 자동으로 펼쳐 찾아본다
  useEffect(() => { setOpen(false); setData(null); setPicked([]); setMsg(null); }, [query]);
  useEffect(() => { if (autoOpen && query && !open) { setOpen(true); run(0); } }, [autoOpen, query]); // eslint-disable-line

  async function run(page = 0) {
    setBusy(true); setMsg(null);
    try {
      const r = await callFunction("pubmed", { action: "search", query, species, page });
      setData(r); setPicked([]);
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

  if (!query) return null;
  const toggle = (pmid) => setPicked((p) => (p.includes(pmid) ? p.filter((x) => x !== pmid) : [...p, pmid]));
  const fresh = (data?.results ?? []).filter((r) => !r.in_library);

  return (
    <div className="pm-block">
      <div className="pm-block-head">
        <div>
          <b>{t("pubmed.title")}</b>
          <div className="muted">{t("pubmed.inlineHint")}</div>
        </div>
        <span className="grow" />
        {!open
          ? <button className="btn small" onClick={() => { setOpen(true); run(0); }}>{t("pubmed.searchHere")}</button>
          : <button className="btn small ghost" onClick={() => setOpen(false)}>{t("pubmed.hide")}</button>}
      </div>

      {open && (
        <>
          {busy && !data && <div className="muted" style={{ padding: "10px 0" }}><span className="spin" />{t("pubmed.searching")}</div>}
          {msg && <p className={msg.err ? "err" : "ok"}>{msg.text}</p>}
          {data && (
            <>
              <div className="pm-head">
                <span className="muted">{t("pubmed.results", { n: data.total.toLocaleString() })}</span>
                <span className="grow" />
                {picked.length > 0 && <button className="btn small primary" disabled={busy} onClick={() => importPmids(picked)}>{t("pubmed.importSelected", { n: picked.length })}</button>}
                {fresh.length > 0 && picked.length === 0 && <button className="btn small" disabled={busy} onClick={() => importPmids(fresh.map((r) => r.pmid))}>{t("pubmed.importAll", { n: fresh.length })}</button>}
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
                    </div>
                    {r.abstract && <div className="pm-abs">{r.abstract.slice(0, 200)}…</div>}
                  </div>
                  {r.in_library
                    ? <span className="tag">{t("pubmed.inLibrary")}</span>
                    : <button className="btn small" disabled={busy} onClick={() => importPmids([r.pmid])}>{t("pubmed.import")}</button>}
                </div>
              ))}

              {data.total > 20 && (
                <div className="row" style={{ justifyContent: "center" }}>
                  <button className="btn small" disabled={busy || data.page === 0} onClick={() => run(data.page - 1)}>← {t("pubmed.prev")}</button>
                  <span className="muted">{data.page + 1}</span>
                  <button className="btn small" disabled={busy || (data.page + 1) * 20 >= data.total} onClick={() => run(data.page + 1)}>{t("pubmed.next")} →</button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
