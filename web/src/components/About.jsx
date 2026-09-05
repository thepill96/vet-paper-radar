import sources from "../../../config/sources.json";
import { useT } from "../lib/i18n";

export default function About() {
  const { t } = useT();
  const groups = {};
  for (const j of sources.journals) (groups[j.group] ||= []).push(j);
  return (
    <div className="page">
      <h1>{t("about.title")}</h1>
      <p className="lead">{t("about.lead")}</p>
      <section>
        <h2>1 · {t("about.collect")}</h2>
        <ol className="steps">
          <li>{t("about.collect1", { n: sources.journals.length, d: sources.lookback_days })}</li>
          <li>{t("about.collect2")}</li>
          <li>{t("about.collect3")}</li>
        </ol>
      </section>
      <section>
        <h2>2 · {t("about.classify")}</h2>
        <p>{t("about.classifyHint", { fallback: t(`cat.${sources.category_fallback}`) })}</p>
        <div className="kw-grid">{Object.entries(sources.categories).map(([cat, kws]) => <div key={cat} className="kw-card"><b>{t(`cat.${cat}`)}</b><div className="kw">{kws.join(" · ")}</div></div>)}</div>
        <p style={{ marginTop: 12 }}><b>{t("about.designHints")}:</b> {Object.entries(sources.study_type_hints).map(([k, v]) => `${t(`design.${k}`)} (${v.join(", ")})`).join(" · ")}</p>
      </section>
      <section><h2>3 · {t("about.summarise")}</h2><p>{sources.max_ai_summaries_per_run > 0 ? t("about.summariseHint", { n: sources.max_ai_summaries_per_run }) : t("about.summariseManual")}</p></section>
      <section><h2>4 · {t("about.recommend")}</h2><p>{t("about.recommendHint")}</p></section>
      <section>
        <h2>{t("about.journals")}</h2>
        {Object.entries(groups).map(([g, js]) => (
          <div key={g} className="journal-group"><b>{t(`group.${g}`)}</b>
            <ul>{js.map((j) => <li key={j.name}><span className={`dot ${j.species}`} />{j.name}{j.must_match && <span className="muted"> — {t("about.condition")}: {j.must_match.join(", ")}</span>}</li>)}</ul>
          </div>
        ))}
        <p className="muted">{t("about.suggest")}</p>
      </section>
    </div>
  );
}
