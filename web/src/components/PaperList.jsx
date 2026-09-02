import { downloadObsidianBundle, downloadAnki } from "../lib/export";

const fmtDate = (d) => (d ? d.slice(0, 10) : "");

export default function PaperList({ papers, states, selectedId, onSelect, loading, hasMore, onMore, sort, setSort, view, total, onReadwise, onNotion }) {
  const title = { feed: "논문", bookmarks: "북마크", history: "최근 본 논문" }[view];
  const exportable = papers.length > 0;

  return (
    <section className="list">
      <div className="list-head">
        <span><span className="count">{total ?? papers.length}</span> {title}</span>
        <span className="spacer" />
        {view === "feed" && (
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="정렬">
            <option value="created">수집 최신순</option>
            <option value="pub">발행일순</option>
            <option value="title">제목순</option>
          </select>
        )}
        {view !== "feed" && exportable && (
          <>
            <button className="btn small" onClick={() => downloadObsidianBundle(papers, states)}>Obsidian .md</button>
            <button className="btn small" onClick={() => downloadAnki(papers, states)}>Anki</button>
            <button className="btn small" onClick={() => onReadwise(papers.map((p) => p.id))}>Readwise</button>
            <button className="btn small" onClick={() => onNotion(papers.map((p) => p.id))}>Notion</button>
          </>
        )}
      </div>

      {!loading && papers.length === 0 && (
        <div className="empty">
          <b>{view === "bookmarks" ? "북마크한 논문이 없습니다" : view === "history" ? "아직 본 논문이 없습니다" : "조건에 맞는 논문이 없습니다"}</b>
          {view === "feed" ? "필터를 풀거나 기간을 넓혀 보세요. 첫 수집 전이라면 GitHub Actions에서 워크플로를 한 번 실행하세요." : "논문을 열면 여기에 쌓입니다."}
        </div>
      )}

      {papers.map((p) => {
        const s = states[p.id] || {};
        return (
          <button key={p.id} className={`item ${p.species} ${p.id === selectedId ? "on" : ""} ${s.is_read ? "read" : ""}`} onClick={() => onSelect(p)}>
            <span className="bar" aria-hidden="true" />
            <span>
              <p className="t">{p.title}</p>
              <span className="m">
                <span className="j">{p.journal_abbrev || p.journal}</span>
                <span>{fmtDate(p.pub_date)}</span>
                <span className="flags">
                  {s.is_bookmarked && <span className="flag mark">북마크</span>}
                  {s.note && <span className="flag">메모</span>}
                  {(p.summary_ko || p.summary_en) && <span className="flag ai">AI {p.summary_ko && p.summary_en ? "한/EN" : p.summary_ko ? "한" : "EN"}</span>}
                  {p.language && p.language !== "eng" && <span className="flag">{p.language}</span>}
                </span>
              </span>
            </span>
          </button>
        );
      })}

      {loading && <div className="empty"><span className="spin" />불러오는 중</div>}
      {!loading && hasMore && <button className="btn more" onClick={onMore}>더 보기</button>}
    </section>
  );
}
