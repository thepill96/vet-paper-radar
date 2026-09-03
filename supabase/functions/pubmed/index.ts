// PubMed 실시간 검색 + 선택 논문만 DB로 가져오기 (아카이빙 대신 필요한 것만 저장)
// 배포: supabase functions deploy pubmed
import { createClient } from "npm:@supabase/supabase-js@2";

const EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
const NCBI_KEY = Deno.env.get("NCBI_API_KEY") ?? "";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "content-type": "application/json" } });

const CATEGORIES: Record<string, string[]> = {
  "Orthopedics": [
    "fracture",
    "osteotomy",
    "arthroplasty",
    "TPLO",
    "TTA",
    "cruciate",
    "CCL",
    "patellar",
    "luxation",
    "hip",
    "elbow",
    "stifle",
    "carpus",
    "tarsus",
    "bone plate",
    "locking plate",
    "interlocking nail",
    "external fixat",
    "ESF",
    "CESF",
    "angular limb",
    "deformity",
    "CORA",
    "osteoarthritis",
    "cartilage",
    "arthroscop",
    "malunion",
    "nonunion",
    "osteosarcoma"
  ],
  "Neurosurgery": [
    "spinal",
    "spine",
    "vertebra",
    "intervertebral",
    "IVDD",
    "IVDE",
    "disc herniation",
    "hemilaminectomy",
    "ventral slot",
    "myelopathy",
    "atlantoaxial",
    "brain",
    "intracranial",
    "craniotomy",
    "seizure",
    "MRI",
    "nerve"
  ],
  "Soft tissue surgery": [
    "hepat",
    "liver lobe",
    "portosystemic",
    "shunt",
    "gastrointestinal",
    "gastropexy",
    "splenectomy",
    "adrenalectomy",
    "thoracotomy",
    "thoracoscop",
    "laparoscop",
    "urethr",
    "cystotomy",
    "nephrectomy",
    "ureter",
    "hernia",
    "wound",
    "skin flap",
    "reconstruct",
    "oncologic surgery",
    "mass excision",
    "anal sac",
    "perineal"
  ],
  "Biomechanics & implants": [
    "biomechanic",
    "finite element",
    "FEA",
    "stiffness",
    "load to failure",
    "cyclic",
    "fatigue",
    "3D print",
    "three-dimensional print",
    "patient-specific",
    "custom implant",
    "titanium",
    "PEEK",
    "CAD",
    "additive manufactur"
  ],
  "Imaging & planning": [
    "computed tomography",
    "CT",
    "radiograph",
    "ultrasound",
    "3D reconstruction",
    "surgical planning",
    "virtual planning",
    "navigation"
  ],
  "Anesthesia & pain": [
    "anesthes",
    "anaesthes",
    "analges",
    "nerve block",
    "epidural",
    "opioid",
    "sedation"
  ],
  "Oncology": [
    "tumor",
    "tumour",
    "neoplas",
    "carcinoma",
    "sarcoma",
    "lymphoma",
    "chemotherap",
    "radiation therapy",
    "oncolog",
    "metasta"
  ],
  "Internal medicine": [
    "endocrin",
    "cardiol",
    "nephrol",
    "renal",
    "gastroenterol",
    "dermatol",
    "immune-mediated",
    "diabet",
    "hyperadrenocortic",
    "hypothyroid"
  ],
  "Complications & outcomes": [
    "complication",
    "outcome",
    "prognos",
    "surgical site infection",
    "SSI",
    "survival",
    "recurrence",
    "revision"
  ]
};
const STUDY_HINTS: Record<string, string[]> = {
  "Randomized": [
    "randomized",
    "randomised"
  ],
  "Systematic review / meta-analysis": [
    "systematic review",
    "meta-analysis"
  ],
  "Prospective": [
    "prospective"
  ],
  "Retrospective": [
    "retrospective"
  ],
  "Cadaveric / experimental": [
    "cadaver",
    "ex vivo",
    "in vitro",
    "biomechanical"
  ],
  "Case report / series": [
    "case report",
    "case series"
  ]
};
const FALLBACK = "Other";
const VET_JOURNALS = ["Vet Surg", "Vet Comp Orthop Traumatol", "J Small Anim Pract", "Journal of the American Veterinary Medical Association", "American Journal of Veterinary Research", "Journal of Veterinary Internal Medicine", "Journal of Feline Medicine and Surgery", "Vet Radiol Ultrasound", "Veterinary Anaesthesia and Analgesia", "J Vet Emerg Crit Care (San Antonio)", "Veterinary and Comparative Oncology", "Frontiers in Veterinary Science", "BMC Veterinary Research", "Journal of Veterinary Science", "Open Veterinary Journal", "Veterinary Sciences", "Tierarztliche Praxis. Ausgabe K, Kleintiere/Heimtiere", "Schweiz Arch Tierheilkd", "J Vet Med Sci", "Korean J Vet Res"];

const hit = (blob: string, kw: string) => new RegExp(`(?<![a-z0-9])${kw.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(blob);

function classify(title: string, abstract: string) {
  const blob = `${title} ${abstract}`.toLowerCase();
  const cats = Object.entries(CATEGORIES).filter(([, kws]) => kws.some((k) => hit(blob, k))).map(([c]) => c);
  let study: string | null = null;
  for (const [label, kws] of Object.entries(STUDY_HINTS)) if (kws.some((k) => hit(blob, k))) { study = label; break; }
  return { categories: cats.length ? cats : [FALLBACK], study_type_hint: study };
}

async function eutils(endpoint: string, params: Record<string, string>) {
  const p = new URLSearchParams({ ...params, tool: "vet-stacks", email: "radar@example.com" });
  if (NCBI_KEY) p.set("api_key", NCBI_KEY);
  const r = await fetch(`${EUTILS}/${endpoint}?${p}`);
  if (!r.ok) throw new Error(`NCBI ${r.status}`);
  return r;
}

const text = (el: Element | null | undefined) => (el?.textContent ?? "").trim();
const MONTHS: Record<string, number> = { Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12 };

function parseArticle(art: Element) {
  const med = art.querySelector("MedlineCitation");
  const a = med?.querySelector("Article");
  const pmid = text(med?.querySelector("PMID"));
  const title = text(a?.querySelector("ArticleTitle"));
  const absNodes = [...(a?.querySelectorAll("Abstract > AbstractText") ?? [])];
  let abstract = absNodes.map((n) => (n.getAttribute("Label") ? `${n.getAttribute("Label")}: ` : "") + text(n)).join("\n");
  if (!abstract) abstract = [...(med?.querySelectorAll("OtherAbstract AbstractText") ?? [])].map(text).join("\n");
  const authors = [...(a?.querySelectorAll("AuthorList > Author") ?? [])]
    .map((au) => `${text(au.querySelector("LastName"))} ${text(au.querySelector("Initials"))}`.trim()).filter(Boolean);
  const journal = text(a?.querySelector("Journal > Title"));
  const journal_abbrev = text(med?.querySelector("MedlineJournalInfo > MedlineTA"));
  let doi = "";
  for (const id of art.querySelectorAll("ArticleId")) if (id.getAttribute("IdType") === "doi") doi = text(id);
  const pd = a?.querySelector("Journal JournalIssue PubDate");
  let pub_date: string | null = null;
  const y = text(pd?.querySelector("Year"));
  if (y) {
    const mRaw = text(pd?.querySelector("Month"));
    const m = /^\d+$/.test(mRaw) ? Number(mRaw) : (MONTHS[mRaw.slice(0, 3)] ?? 1);
    const d = Number(text(pd?.querySelector("Day"))) || 1;
    pub_date = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  } else {
    const md = text(pd?.querySelector("MedlineDate")).match(/(\d{4})/);
    if (md) pub_date = `${md[1]}-01-01`;
  }
  const language = text(a?.querySelector("Language")) || "eng";
  const vernacular_title = text(a?.querySelector("VernacularTitle")) || null;
  const { categories, study_type_hint } = classify(title, abstract);
  const species = VET_JOURNALS.includes(journal) || VET_JOURNALS.includes(journal_abbrev) ||
    /vet|animal|canine|feline/i.test(`${journal} ${journal_abbrev}`) ? "vet" : "human";
  return { pmid, doi, title, abstract, authors, journal, journal_abbrev, journal_group: "PubMed import",
    pub_date, species, categories, study_type_hint, language, vernacular_title,
    url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` };
}

async function fetchDetails(pmids: string[]) {
  if (!pmids.length) return [];
  const r = await eutils("efetch.fcgi", { db: "pubmed", id: pmids.join(","), retmode: "xml" });
  const xml = await r.text();
  const { DOMParser } = await import("https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts");
  const doc = new DOMParser().parseFromString(xml, "text/html");
  return [...(doc?.querySelectorAll("PubmedArticle") ?? [])].map((n) => parseArticle(n as unknown as Element));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return json({ error: "로그인이 필요합니다" }, 401);
    const { data: prof } = await sb.from("profiles").select("status").eq("id", user.id).single();
    if (prof?.status !== "approved") return json({ error: "운영자 승인 후 사용할 수 있습니다" }, 403);

    const body = await req.json();
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (body.action === "search") {
      const term = String(body.query ?? "").trim();
      if (!term) return json({ results: [], total: 0 });
      const page = Math.max(0, Number(body.page ?? 0));
      const per = 20;
      const parts = [term];
      if (body.years) parts.push(`("${new Date(Date.now() - Number(body.years) * 365 * 864e5).getFullYear()}"[PDAT] : "3000"[PDAT])`);
      if (body.species === "vet") parts.push("(veterinary[sb] OR dogs[MeSH] OR cats[MeSH])");
      const es = await eutils("esearch.fcgi", { db: "pubmed", term: parts.join(" AND "), retmode: "json", retstart: String(page * per), retmax: String(per), sort: body.sort === "date" ? "date" : "relevance" });
      const j = await es.json();
      const ids: string[] = j.esearchresult?.idlist ?? [];
      const total = Number(j.esearchresult?.count ?? 0);
      const papers = await fetchDetails(ids);
      const { data: existing } = await admin.from("papers").select("pmid").in("pmid", ids.length ? ids : ["-"]);
      const have = new Set((existing ?? []).map((e) => e.pmid));
      return json({ total, page, results: papers.map((p) => ({ ...p, in_library: have.has(p.pmid) })) });
    }

    if (body.action === "import") {
      const pmids: string[] = (body.pmids ?? []).slice(0, 50);
      if (!pmids.length) return json({ error: "가져올 논문이 없습니다" }, 400);
      const papers = await fetchDetails(pmids);
      const { error } = await admin.from("papers").upsert(papers, { onConflict: "pmid", ignoreDuplicates: false });
      if (error) return json({ error: error.message }, 500);
      const { data: rows } = await admin.from("papers").select("id,pmid").in("pmid", pmids);
      // 가져온 사람의 북마크에 자동으로 추가해 다시 찾기 쉽게 한다
      if (rows?.length) {
        await admin.from("user_papers").upsert(rows.map((r) => ({ user_id: user.id, paper_id: r.id, is_bookmarked: true, is_read: false })), { onConflict: "user_id,paper_id", ignoreDuplicates: true });
      }
      return json({ imported: papers.length });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
