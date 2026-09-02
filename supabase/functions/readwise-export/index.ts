// 선택한 논문의 요약·임상 포인트·내 메모를 Readwise 하이라이트로 전송.
// 사용자의 Readwise 토큰은 profiles.readwise_token 에 저장(설정 화면에서 입력).
// 배포: supabase functions deploy readwise-export
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "로그인이 필요합니다" }), { status: 401, headers: cors });

    const { paper_ids } = await req.json();
    const { data: prof } = await sb.from("profiles").select("readwise_token").eq("id", user.id).single();
    if (!prof?.readwise_token) return new Response(JSON.stringify({ error: "설정에서 Readwise 토큰을 먼저 저장하세요" }), { status: 400, headers: cors });

    const { data: papers } = await sb.from("papers").select("*").in("id", paper_ids);
    const { data: ups } = await sb.from("user_papers").select("paper_id,note").in("paper_id", paper_ids);
    const notes = Object.fromEntries((ups ?? []).map((u) => [u.paper_id, u.note]));

    const highlights = (papers ?? []).flatMap((p) => {
      const base = { title: p.title, author: (p.authors ?? []).slice(0, 3).join(", "), source_url: p.url,
                     source_type: "vet-paper-radar", category: "articles", highlighted_at: new Date().toISOString() };
      const items = [];
      const meta = `${p.journal} ${p.pub_date ?? ""}`.trim();
      if (p.summary_ko) items.push({ ...base, text: p.summary_ko, note: meta });
      if (p.summary_en) items.push({ ...base, text: p.summary_en, note: meta });
      for (const c of p.clinical_points ?? []) items.push({ ...base, text: c, note: ".clinical-point" });
      for (const c of p.clinical_points_en ?? []) items.push({ ...base, text: c, note: ".clinical-point.en" });
      if (notes[p.id]) items.push({ ...base, text: notes[p.id], note: ".my-note" });
      if (!items.length && p.abstract) items.push({ ...base, text: p.abstract.slice(0, 2000) });
      return items;
    });

    const r = await fetch("https://readwise.io/api/v2/highlights/", {
      method: "POST",
      headers: { Authorization: `Token ${prof.readwise_token}`, "content-type": "application/json" },
      body: JSON.stringify({ highlights }),
    });
    if (!r.ok) return new Response(JSON.stringify({ error: `Readwise 오류 ${r.status}` }), { status: 502, headers: cors });
    return new Response(JSON.stringify({ sent: highlights.length }), { headers: { ...cors, "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors });
  }
});
