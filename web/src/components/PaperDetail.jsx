import { useEffect, useRef, useState } from "react";
import { downloadObsidian, downloadAnki } from "../lib/export";

const LANG_NAMES = { eng: "English", kor: "한국어", jpn: "日本語", ger: "Deutsch", fre: "Français", spa: "Español", ita: "Italiano", por: "Português", chi: "中文", rus: "Русский", pol: "Polski", tur: "Türkçe" };

function SummaryBlock({ paper, lang }) {
  const ko = lang === "ko";
  const summary = ko ? paper.summary_ko : paper.summary_en;
  const points = ko ? paper.clinical_points : paper.clinical_points_en;
  const evidence = ko ? paper.evidence_level : paper.evidence_level_en;
  const rel = ko ? paper.relevance_note : paper.relevance_note_en;
  if (!summary) return <div className="summary-missing">{ko ? "한국어 요약이 아직 없습니다. 다시 생성하면 두 언어가 함께 만들어집니다." : "English summary not generated yet. Regenerate to get both languages."}</div>;
  return (
    <div className={`summary-lang ${ko ? "ko" : "en"}`}>
      <div className="design">
        {paper.study_type && <span><b>{ko ? "설계" : "Design"}</b> {paper.study_type}</span>}
        {evidence && <span><b>{ko ? "근거" : "Evidence"}</b> {evidence}</span>}
      </div>
      <p>{summary}</p>
      {points?.length > 0 && <ul>{points.map((c, i) => <li key={i}>{c}</li>)}</ul>}
      {rel && <div className="rel"><b>{ko ? "소동물 외과 적용" : "Relevance to small-animal surgery"}</b> — {rel}</div>}
    </div>
  );
}

export default function PaperDetail({ paper, state, defaultLang = "ko", onToggle, onSaveNote, onSummarize, onReadwise, onNotion, onBack }) {
  const [lang, setLang] = useState(defaultLang);
  useEffect(() => { setLang(defaultLang); }, [defaultLang]);
  const [note, setNote] = useState(state?.note || "");
  const [saved, setSaved] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const timer = useRef(null);

  useEffect(() => { setNote(state?.note || ""); setSaved(true); setErr(null); }, [paper?.id]);

  // 입력 후 1초 멈추면 자동 저장
  function onNote(v) {
    setNote(v); setSaved(false);
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => { await onSaveNote(paper.id, v); setSaved(true); }, 1000);
  }

  async function summarize() {
    setBusy(true); setErr(null);
    try { await onSummarize(paper.id); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  async function notionSend() {
    setBusy(true); setErr(null);
    try { await onNotion([paper.id]); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  async function readwise() {
    setBusy(true); setErr(null);
    try { await onReadwise([paper.id]); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  if (!paper) {
    return (
      <section className="reader">
        <div className="reader-empty">왼쪽에서 논문을 고르면<br />여기서 읽고 메모할 수 있습니다.</div>
      </section>
    );
  }

  const s = state || {};
  const hasSummary = Boolean(paper.summary_ko || paper.summary_en);
  const bothMissing = hasSummary && !(paper.summary_ko && paper.summary_en);
  const origLang = paper.language && paper.language !== "eng" ? (LANG_NAMES[paper.language] || paper.language) : null;

  return (
    <section className="reader">
      <div className="reader-inner">
        <button className="btn ghost mobile-back" onClick={onBack} style={{ marginBottom: 12 }}>← 목록</button>
        <div className={`species-line ${paper.species}`} aria-hidden="true" />
        <h1>{paper.title}</h1>
        {paper.vernacular_title && paper.vernacular_title !== paper.title && <div className="vtitle">{paper.vernacular_title}</div>}
        <div className="meta">
          {paper.journal} · {paper.pub_date || "날짜 미상"} · <a href={paper.url} target="_blank" rel="noreferrer">PubMed {paper.pmid}</a>
          {paper.doi && <> · <a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noreferrer">DOI</a></>}
        </div>
        {paper.authors?.length > 0 && <div className="authors">{paper.authors.slice(0, 8).join(", ")}{paper.authors.length > 8 ? " 외" : ""}</div>}
        <div className="cats">
          <span className={`chip ${paper.species} on`}>{paper.species === "vet" ? "수의" : "인의"}</span>
          {(paper.categories || []).map((c) => <span key={c} className="chip">{c}</span>)}
          {paper.study_type_hint && <span className="chip">{paper.study_type_hint}</span>}
          {origLang && <span className="chip lang">원문 {origLang}</span>}
        </div>

        <div className="actions">
          <button className={`btn ${s.is_read ? "active" : ""}`} onClick={() => onToggle(paper.id, "is_read")}>{s.is_read ? "읽음" : "읽음으로 표시"}</button>
          <button className={`btn mark ${s.is_bookmarked ? "active" : ""}`} onClick={() => onToggle(paper.id, "is_bookmarked")}>{s.is_bookmarked ? "북마크됨" : "북마크"}</button>
          <span className="grow" />
          <button className="btn" onClick={() => downloadObsidian(paper, s)}>Obsidian .md</button>
          <button className="btn" onClick={() => downloadAnki([paper], { [paper.id]: s })}>Anki</button>
          <button className="btn" disabled={busy} onClick={readwise}>Readwise</button>
          <button className="btn" disabled={busy} onClick={notionSend}>Notion</button>
        </div>

        <div className={`summary ${paper.species}`}>
          {hasSummary ? (
            <>
              <div className="lang-tabs" role="tablist" aria-label="요약 언어">
                {[["ko", "한국어"], ["en", "English"], ["both", "병기"]].map(([k, l]) => (
                  <button key={k} role="tab" aria-selected={lang === k} className={lang === k ? "on" : ""} onClick={() => setLang(k)}>{l}</button>
                ))}
                {bothMissing && <button className="btn small" style={{ marginLeft: "auto" }} disabled={busy} onClick={summarize}>{busy ? "생성 중" : "두 언어로 다시 생성"}</button>}
              </div>
              {lang === "both" ? (
                <div className="summary-both">
                  <SummaryBlock paper={paper} lang="ko" />
                  <SummaryBlock paper={paper} lang="en" />
                </div>
              ) : (
                <SummaryBlock paper={paper} lang={lang} />
              )}
            </>
          ) : (
            <div className="summary-empty">
              <span>{paper.abstract ? "아직 요약이 없습니다. 생성하면 한국어·영어가 함께 만들어집니다." : "초록이 없어 요약할 수 없습니다."}</span>
              <button className="btn primary" disabled={busy || !paper.abstract} onClick={summarize}>
                {busy ? <><span className="spin" />생성 중</> : "AI 요약 생성"}
              </button>
            </div>
          )}
        </div>
        {err && <div className="err" style={{ marginTop: -16, marginBottom: 16 }}>{err}</div>}

        <h2>내 메모</h2>
        <div className="note">
          <textarea value={note} onChange={(e) => onNote(e.target.value)} placeholder="케이스에 어떻게 적용할지, 의심되는 점, 나중에 찾아볼 것" />
          <div className="save-row">{saved ? "저장됨" : "입력 중… 잠시 후 자동 저장"}</div>
        </div>

        <h2>Abstract</h2>
        <div className="abstract">{paper.abstract || "PubMed에 초록이 등록되지 않았습니다."}</div>
      </div>
    </section>
  );
}
