// Notion 연동. 두 가지 동작:
//  action: "create_db"  → 사용자의 Notion 페이지 아래에 논문 DB를 만들고 database_id를 profiles에 저장
//  action: "export"     → paper_ids를 Notion DB에 추가(PMID 기준 중복이면 속성만 갱신)
// 사용자의 Notion 통합 토큰은 profiles.notion_token 에 저장(설정 화면에서 입력).
// 배포: supabase functions deploy notion-export
import { createClient } from "npm:@supabase/supabase-js@2";

const NOTION = "https://api.notion.com/v1";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json" } });

async function notion(token: string, path: string, method: string, body?: unknown) {
  const r = await fetch(`${NOTION}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Notion-Version": "2022-06-28", "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`Notion ${r.status}: ${j.message ?? JSON.stringify(j)}`);
  return j;
}

const rt = (s?: string | null) => [{ type: "text", text: { content: (s ?? "").slice(0, 1990) } }];
const para = (s: string) => ({ object: "block", type: "paragraph", paragraph: { rich_text: rt(s) } });
const h2 = (s: string) => ({ object: "block", type: "heading_2", heading_2: { rich_text: rt(s) } });
const bullet = (s: string) => ({ object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: rt(s) } });
const chunks = (s: string, n = 1900) => { const out = []; for (let i = 0; i < s.length; i += n) out.push(s.slice(i, i + n)); return out; };

// 가이드의 "열(속성)"에 해당. 여기 이름을 바꾸면 export 쪽도 같이 바꿔야 함.
const DB_PROPERTIES = {
  "제목": { title: {} },
  "저널": { select: {} },
  "발행일": { date: {} },
  "대상": { select: { options: [{ name: "수의", color: "green" }, { name: "인의", color: "blue" }] } },
  "분야": { multi_select: {} },
  "연구 설계": { rich_text: {} },
  "근거 수준": { rich_text: {} },
  "원문 언어": { select: {} },
  "읽음": { checkbox: {} },
  "북마크": { checkbox: {} },
  "내 메모": { rich_text: {} },
  "PMID": { rich_text: {} },
  "DOI": { url: {} },
  "PubMed": { url: {} },
  "수집일": { date: {} },
};

function pageProperties(p: any, s: any) {
  return {
    "제목": { title: rt(p.title) },
    "저널": p.journal ? { select: { name: p.journal.slice(0, 100).replace(/,/g, " ") } } : undefined,
    "발행일": p.pub_date ? { date: { start: p.pub_date } } : undefined,
    "대상": { select: { name: p.species === "vet" ? "수의" : "인의" } },
    "분야": { multi_select: (p.categories ?? []).map((c: string) => ({ name: c.replace(/,/g, " ") })) },
    "연구 설계": { rich_text: rt(p.study_type ?? p.study_type_hint) },
    "근거 수준": { rich_text: rt(p.evidence_level) },
    "원문 언어": { select: { name: p.language ?? "eng" } },
    "읽음": { checkbox: Boolean(s?.is_read) },
    "북마크": { checkbox: Boolean(s?.is_bookmarked) },
    "내 메모": { rich_text: rt(s?.note) },
    "PMID": { rich_text: rt(p.pmid) },
    "DOI": p.doi ? { url: `https://doi.org/${p.doi}` } : undefined,
    "PubMed": { url: p.url },
    "수집일": p.created_at ? { date: { start: p.created_at.slice(0, 10) } } : undefined,
  };
}

function pageBody(p: any, s: any) {
  const b: unknown[] = [];
  if (p.summary_ko) { b.push(h2("요약"), para(p.summary_ko)); }
  if (p.clinical_points?.length) { b.push(h2("임상 포인트"), ...p.clinical_points.map(bullet)); }
  if (p.relevance_note) { b.push(h2("소동물 외과 적용"), para(p.relevance_note)); }
  if (p.summary_en) { b.push(h2("Summary"), para(p.summary_en)); }
  if (p.clinical_points_en?.length) { b.push(h2("Clinical points"), ...p.clinical_points_en.map(bullet)); }
  if (p.relevance_note_en) { b.push(h2("Relevance to small-animal surgery"), para(p.relevance_note_en)); }
  if (s?.note) { b.push(h2("내 메모"), para(s.note)); }
  if (p.abstract) {
    b.push({ object: "block", type: "toggle", toggle: { rich_text: rt("Abstract (원문)"), children: chunks(p.abstract).map(para) } });
  }
  b.push(para(`출처: ${p.journal ?? ""} · PMID ${p.pmid} · ${p.url}`));
  return b.slice(0, 100);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return json({ error: "로그인이 필요합니다" }, 401);

    const body = await req.json();
    const { data: prof } = await sb.from("profiles").select("notion_token,notion_database_id").eq("id", user.id).single();
    if (!prof?.notion_token) return json({ error: "설정에서 Notion 통합 토큰을 먼저 저장하세요" }, 400);

    if (body.action === "create_db") {
      const parent = String(body.parent_page_id ?? "").replace(/-/g, "").match(/[0-9a-f]{32}/i)?.[0];
      if (!parent) return json({ error: "Notion 페이지 ID(또는 페이지 링크)를 입력하세요" }, 400);
      const db = await notion(prof.notion_token, "/databases", "POST", {
        parent: { type: "page_id", page_id: parent },
        title: rt("Vet Paper Radar"),
        properties: DB_PROPERTIES,
      });
      await sb.from("profiles").update({ notion_database_id: db.id }).eq("id", user.id);
      return json({ database_id: db.id, url: db.url });
    }

    if (!prof.notion_database_id) return json({ error: "설정에서 Notion 데이터베이스를 먼저 만들거나 ID를 입력하세요" }, 400);
    const ids: string[] = body.paper_ids ?? [];
    const { data: papers } = await sb.from("papers").select("*").in("id", ids);
    const { data: ups } = await sb.from("user_papers").select("paper_id,is_read,is_bookmarked,note").in("paper_id", ids);
    const states = Object.fromEntries((ups ?? []).map((u) => [u.paper_id, u]));

    let created = 0, updated = 0;
    for (const p of papers ?? []) {
      const s = states[p.id];
      const props = Object.fromEntries(Object.entries(pageProperties(p, s)).filter(([, v]) => v !== undefined));
      const q = await notion(prof.notion_token, `/databases/${prof.notion_database_id}/query`, "POST", {
        filter: { property: "PMID", rich_text: { equals: p.pmid } }, page_size: 1,
      });
      if (q.results?.length) {
        await notion(prof.notion_token, `/pages/${q.results[0].id}`, "PATCH", { properties: props });
        updated++;
      } else {
        await notion(prof.notion_token, "/pages", "POST", {
          parent: { database_id: prof.notion_database_id }, properties: props, children: pageBody(p, s),
        });
        created++;
      }
    }
    return json({ created, updated });
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});
