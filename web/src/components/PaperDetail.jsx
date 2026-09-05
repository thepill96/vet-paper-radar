import { useEffect, useRef, useState } from "react";
import { downloadObsidian, downloadAnki } from "../lib/export";
import { useT, fmtDate } from "../lib/i18n";
import Comments from "./Comments";

function SummaryBlock({ paper, sl, t }) {
  const ko = sl === "ko";
  const summary = ko ? paper.summary_ko : paper.summary_en;
  const points = ko ? paper.clinical_points : paper.clinical_points_en;
  const evidence = ko ? paper.evidence_level : paper.evidence_level_en;
  const rel = ko ? paper.relevance_note : paper.relevance_note_en;
  if (!summary) return <div className="summary-missing">{ko ? t("reader.missingKo") : t("reader.missingEn")}</div>;
  return (
    <div className={`summary-lang ${ko ? "ko" : "en"}`}>
      <div className="design">
        {paper.study_type && <span><b>{t("reader.design")}</b> {paper.study_type}</span>}
        {evidence && <span><b>{t("reader.evidence")}</b> {evidence}</span>}
      </div>
      <p>{summary}</p>
      {points?.length > 0 && <ul>{points.map((c, i) => <li key={i}>{c}</li>)}</ul>}
      {rel && <div className="rel"><b>{t("reader.relevance")}</b> — {rel}</div>}
    </div>
  );
}

export default function PaperDetail({ paper, state, defaultLang = "en", user, me, names = {}, onCommentCount, onToggle, onSaveNote, onSummarize, onReadwise, onNotion, onBack }) {
  const { t, lang } = useT();
  const [sl, setSl] = useState(defaultLang);
  const [note, setNote] = useState(state?.note || "");
  const [saved, setSaved] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const timer = useRef(null);
  const top = useRef(null);

  useEffect(() => { setSl(defaultLang); }, [defaultLang]);
  useEffect(() => { setNote(state?.note || ""); setSaved(true); setErr(null); top.current?.scrollTo?.(0, 0); }, [paper?.id]);

  function onNote(v) {
    setNote(v); setSaved(false); clearTimeout(timer.current);
    timer.current = setTimeout(async () => { await onSaveNote(paper.id, v); setSaved(true); }, 1000);
  }
  const run = (fn) => async () => { setBusy(true); setErr(null); try { await fn(); } catch (e) { setErr(e.message); } finally { setBusy(false); } };

  if (!paper) return <section className="reader" ref={top}><div className="reader-empty">{t("reader.hint")}</div></section>;

  const s = state || {};
  const read = Boolean(s.is_read);
  const hasSummary = Boolean(paper.summary_ko || paper.summary_en);
  const bothMissing = hasSummary && !(paper.summary_ko && paper.summary_en);
  const orig = paper.language && paper.language !== "eng" ? t(`original.${paper.language}`) : null;

  return (
    <section className="reader" ref={top}>
      <div className="reader-inner">
        <div className="reader-tools">
          <button className="btn small ghost mobile-back" onClick={onBack}>← {t("reader.back")}</button>
          <span className={`pill ${read ? "read" : "unread"}`}>{read ? "✓ " + t("reader.read") : "● " + t("reader.unread")}</span>
          <button className="btn small" onClick={() => onToggle(paper.id, "is_read")}>{read ? t("reader.markUnread") : t("reader.markRead")}</button>
          <button className={`btn small mark ${s.is_bookmarked ? "active" : ""}`} onClick={() => onToggle(paper.id, "is_bookmarked")}>{s.is_bookmarked ? "★ " + t("reader.bookmarked") : "☆ " + t("reader.bookmark")}</button>
          <span className="grow" />
          <div className="export-group">
            <button className="btn small" onClick={() => downloadObsidian(paper, s)}>Obsidian</button>
            <button className="btn small" onClick={() => downloadAnki([paper], { [paper.id]: s })}>Anki</button>
            <button className="btn small" disabled={busy} onClick={run(() => onReadwise([paper.id]))}>Readwise</button>
            <button className="btn small" disabled={busy} onClick={run(() => onNotion([paper.id]))}>Notion</button>
          </div>
        </div>

        <div className="paper-head">
          <div className="eyebrow"><span className={`dot ${paper.species}`} />{t(`species.${paper.species}`)} · {paper.journal} · {fmtDate(paper.pub_date, lang)}</div>
          <h1>{paper.title}</h1>
          {paper.vernacular_title && paper.vernacular_title !== paper.title && <div className="vtitle">{paper.vernacular_title}</div>}
          {paper.authors?.length > 0 && <div className="authors">{paper.authors.slice(0, 8).join(", ")}{paper.authors.length > 8 ? " et al." : ""}</div>}
          <div className="meta-row">
            <a href={paper.url} target="_blank" rel="noreferrer">PubMed {paper.pmid} ↗</a>
            {paper.doi && <a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noreferrer">DOI ↗</a>}
            {(paper.categories || []).map((c) => <span key={c} className="tag">{t(`cat.${c}`)}</span>)}
            {paper.study_type_hint && <span className="tag">{t(`design.${paper.study_type_hint}`)}</span>}
            {orig && <span className="tag">{t("reader.original")}: {orig}</span>}
          </div>
        </div>

        <h2>{t("reader.summary")}</h2>
        <div className={`summary ${paper.species}`}>
          {hasSummary ? (
            <>
              <div className="lang-tabs" role="tablist">
                {[["en", "English"], ["ko", "한국어"], ["both", t("reader.both")]].map(([k, l]) => (
                  <button key={k} role="tab" aria-selected={sl === k} className={sl === k ? "on" : ""} onClick={() => setSl(k)}>{l}</button>
                ))}
                {bothMissing && <button className="btn small" style={{ marginLeft: "auto" }} disabled={busy} onClick={run(() => onSummarize(paper.id))}>{busy ? t("reader.generating") : t("reader.regenerate")}</button>}
              </div>
              {sl === "both" ? <div className="summary-both"><SummaryBlock paper={paper} sl="en" t={t} /><SummaryBlock paper={paper} sl="ko" t={t} /></div> : <SummaryBlock paper={paper} sl={sl} t={t} />}
            </>
          ) : (
            <div className="summary-empty">
              <span>{paper.abstract ? t("reader.noSummary") : t("reader.noAbstractTitle")}</span>
              <button className="btn primary" disabled={busy || (!paper.abstract && !paper.abstract_pruned)} onClick={run(() => onSummarize(paper.id))}>{busy ? <><span className="spin" />{t("reader.generating")}</> : t("reader.generate")}</button>
            </div>
          )}
        </div>
        {err && <div className="err" style={{ margin: "8px 0 0" }}>{err}</div>}

        <h2>{t("reader.abstract")}</h2>
        <div className="abstract">{paper.abstract || (paper.abstract_pruned ? <span className="muted"><span className="spin" />{t("reader.restoring")}</span> : t("reader.noAbstract"))}</div>

        <h2>{t("reader.notes")}</h2>
        <div className="note">
          <textarea value={note} onChange={(e) => onNote(e.target.value)} placeholder={t("reader.notesPlaceholder")} />
          <div className="save-row">{saved ? t("reader.saved") : t("reader.saving")}</div>
        </div>

        <h2>{t("comments.title")}</h2>
        <Comments paperId={paper.id} user={user} me={me} names={names} onCountChange={onCommentCount} />
      </div>
    </section>
  );
}
