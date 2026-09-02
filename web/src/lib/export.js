function download(filename, text, mime = "text/plain") {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const safe = (s) => (s || "").replace(/[\\/:*?"<>|]/g, "").slice(0, 80).trim();
const yamlStr = (s) => `"${String(s ?? "").replace(/"/g, '\\"')}"`;

export function paperToMarkdown(p, state = {}) {
  const tags = [...(p.categories || []), p.species === "vet" ? "vet" : "human"].map((t) => t.replace(/\s/g, "-"));
  const fm = [
    "---",
    `title: ${yamlStr(p.title)}`,
    `journal: ${yamlStr(p.journal)}`,
    `date: ${p.pub_date || ""}`,
    `pmid: "${p.pmid}"`,
    `doi: "${p.doi || ""}"`,
    `authors: [${(p.authors || []).slice(0, 6).map(yamlStr).join(", ")}]`,
    `tags: [${tags.map(yamlStr).join(", ")}]`,
    `study_type: ${yamlStr(p.study_type || p.study_type_hint || "")}`,
    `evidence: ${yamlStr(p.evidence_level || "")}`,
    `evidence_en: ${yamlStr(p.evidence_level_en || "")}`,
    `language: ${p.language || "eng"}`,
    `source: ${p.url}`,
    `bookmarked: ${state.is_bookmarked ? "true" : "false"}`,
    "---",
  ].join("\n");
  const body = [
    `# ${p.title}`,
    "",
    `${p.journal} · ${p.pub_date || ""} · [PubMed](${p.url})${p.doi ? ` · [DOI](https://doi.org/${p.doi})` : ""}`,
    "",
    p.summary_ko ? `## 요약\n${p.summary_ko}` : "",
    p.clinical_points?.length ? `## 임상 포인트\n${p.clinical_points.map((c) => `- ${c}`).join("\n")}` : "",
    p.relevance_note ? `## 소동물 외과 적용\n${p.relevance_note}` : "",
    p.summary_en ? `## Summary\n${p.summary_en}` : "",
    p.clinical_points_en?.length ? `## Clinical points\n${p.clinical_points_en.map((c) => `- ${c}`).join("\n")}` : "",
    p.relevance_note_en ? `## Relevance to small-animal surgery\n${p.relevance_note_en}` : "",
    state.note ? `## 내 메모\n${state.note}` : "",
    p.abstract ? `## Abstract\n${p.abstract}` : "",
  ].filter(Boolean).join("\n\n");
  return `${fm}\n\n${body}\n`;
}

export function downloadObsidian(p, state) {
  download(`${p.pub_date?.slice(0, 4) || ""} ${safe(p.title)}.md`, paperToMarkdown(p, state), "text/markdown");
}

export function downloadObsidianBundle(papers, states) {
  const text = papers.map((p) => paperToMarkdown(p, states[p.id])).join("\n\n---\n\n");
  download(`vet-paper-radar-${new Date().toISOString().slice(0, 10)}.md`, text, "text/markdown");
}

// Anki: 탭 구분, 필드 = Front / Back / Tags. 한 논문당 카드 1장 + 임상 포인트마다 cloze 없이 Q/A 1장.
export function ankiRows(p, state) {
  const esc = (s) => String(s || "").replace(/\t/g, " ").replace(/\n/g, "<br>");
  const tags = [...(p.categories || []), p.species].map((t) => t.replace(/\s/g, "_")).join(" ");
  const src = `<div style="font-size:12px;color:#777">${esc(p.journal)} ${p.pub_date || ""} · PMID ${p.pmid}</div>`;
  const rows = [];
  const back = [
    p.summary_ko ? esc(p.summary_ko) : p.summary_en ? esc(p.summary_en) : esc(p.abstract).slice(0, 1200),
    p.clinical_points?.length ? `<ul>${p.clinical_points.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>` : "",
    p.summary_ko && p.summary_en ? `<div style="color:#555;margin-top:6px">${esc(p.summary_en)}</div>` : "",
    state?.note ? `<div><b>My note:</b> ${esc(state.note)}</div>` : "",
    src,
  ].filter(Boolean).join("<br>");
  rows.push([`${esc(p.title)}<br><i>주요 결과와 임상 포인트는?</i>`, back, tags]);
  (p.clinical_points || []).forEach((c, i) => {
    const en = p.clinical_points_en?.[i] ? `<br><span style="color:#555">${esc(p.clinical_points_en[i])}</span>` : "";
    rows.push([`${esc(p.title)}<br><i>임상 포인트 ${i + 1}</i>`, `${esc(c)}${en}<br>${src}`, tags]);
  });
  return rows;
}

export function downloadAnki(papers, states) {
  const rows = papers.flatMap((p) => ankiRows(p, states[p.id]));
  const text = "#separator:tab\n#html:true\n#tags column:3\n" + rows.map((r) => r.join("\t")).join("\n");
  download(`anki-${new Date().toISOString().slice(0, 10)}.txt`, text, "text/plain");
}
