import { useMemo } from "react";
import { downloadObsidianBundle, downloadAnki } from "../lib/export";
import { useT, fmtDate, fmtDateTime } from "../lib/i18n";

export default function PaperList({ papers, states, selectedId, onSelect, loading, hasMore, onMore, view, group, total, lastCollected, commentCounts = {}, onReadwise, onNotion, onToggleRead, footer }) {
  const { t, lang } = useT();
  const unread = papers.filter((p) => !states[p.id]?.is_read).length;

  const sections = useMemo(() => {
    if (view !== "feed" || group === "latest") return [[null, papers]];
    const m = new Map();
    for (const p of papers) {
      const key = group === "journal" ? (p.journal || "—") : ((p.categories || [])[0] || "Other");
      if (!m.has(key)) m.set(key, []);
      m.get(key).push(p);
    }
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [papers, view, group]);

  const emptyTitle = { feed: "emptyFeed", recs: "emptyRecs", bookmarks: "emptyBookmarks", history: "emptyHistory" }[view];
  const emptyHint = { feed: "emptyFeedHint", recs: "emptyRecsHint" }[view] || "emptyHint";

  return (
    <section className="list">
      <div className="list-head">
        <div>
          <div className="list-title">{t(`list.${view}`)} <span className="count">{total == null ? papers.length : total > 500 ? `~${total.toLocaleString()}` : total.toLocaleString()}</span>{view === "feed" && unread > 0 && <span className="unread-count">{t("list.unread", { n: unread })}</span>}</div>
          {lastCollected && <div className="list-sub">{t("list.updated", { t: fmtDateTime(lastCollected, lang) })}</div>}
        </div>
        {(view === "bookmarks" || view === "history") && papers.length > 0 && (
          <div className="list-actions">
            <button className="btn small" onClick={() => downloadObsidianBundle(papers, states)}>Obsidian</button>
            <button className="btn small" onClick={() => downloadAnki(papers, states)}>Anki</button>
            <button className="btn small" onClick={() => onReadwise(papers.map((p) => p.id))}>Readwise</button>
            <button className="btn small" onClick={() => onNotion(papers.map((p) => p.id))}>Notion</button>
          </div>
        )}
      </div>

      {!loading && papers.length === 0 && <div className="empty"><b>{t(`list.${emptyTitle}`)}</b>{t(`list.${emptyHint}`)}</div>}

      {sections.map(([sec, items]) => (
        <div key={sec ?? "_"}>
          {sec && <div className="section-head"><span>{group === "category" ? t(`cat.${sec}`) : sec}</span><span className="n">{items.length}</span></div>}
          {items.map((p) => {
            const s = states[p.id] || {};
            const read = Boolean(s.is_read);
            return (
              <div key={p.id} className={`item ${p.species} ${p.id === selectedId ? "on" : ""} ${read ? "read" : "unread"}`}>
                <button className="read-toggle" title={read ? t("item.markUnread") : t("item.markRead")} aria-label={read ? t("reader.read") : t("reader.unread")} onClick={(e) => { e.stopPropagation(); onToggleRead(p.id); }}>{read ? "✓" : ""}</button>
                <button className="item-body" onClick={() => onSelect(p)}>
                  {p._reason && <span className="reason">{translateReason(p._reason, t)}</span>}
                  <p className="t">{p.title}</p>
                  <span className="m">
                    <span className="j">{p.journal_abbrev || p.journal}</span>
                    <span>{fmtDate(p.pub_date, lang)}</span>
                    {group !== "category" && (p.categories || []).slice(0, 2).map((c) => <span key={c} className="cat">{t(`cat.${c}`)}</span>)}
                    <span className="flags">
                      {s.is_bookmarked && <span className="flag mark">★</span>}
                      {s.note && <span className="flag">✎</span>}
                      {commentCounts[p.id] > 0 && <span className="flag">💬 {commentCounts[p.id]}</span>}
                      {(p.summary_ko || p.summary_en) && <span className="flag ai">AI</span>}
                      {p.language && p.language !== "eng" && <span className="flag">{p.language}</span>}
                    </span>
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      ))}

      {loading && <div className="empty"><span className="spin" />{t("list.loading")}</div>}
      {!loading && hasMore && <button className="btn more" onClick={onMore}>{t("list.more")}</button>}
      {footer}
    </section>
  );
}

// recommend.py가 만드는 이유 문자열: "Orthopedics · keywords: osteotomy, radial"
function translateReason(r, t) {
  return r.split(" · ").map((part) => (t(`cat.${part}`) !== part ? t(`cat.${part}`) : part)).join(" · ");
}
