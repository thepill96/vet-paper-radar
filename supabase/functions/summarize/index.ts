// 로그인 사용자가 "요약 생성" 버튼을 눌렀을 때 단일 논문을 Claude로 요약.
// 배포: supabase functions deploy summarize
// 시크릿: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
import { createClient } from "npm:@supabase/supabase-js@2";

const PROMPT = (p: { title: string; journal: string; pub_date: string; abstract: string; language: string }) => `당신은 소동물 외과 전문의를 위한 논문 큐레이터입니다. 아래 논문을 읽고 JSON만 출력하세요(코드펜스 없이).

논문 원문 언어가 무엇이든 반드시 한국어 버전과 영어 버전을 둘 다 작성합니다. 초록이 비영어라면 먼저 정확히 이해한 뒤 두 언어로 요약합니다.

규칙:
- 한국어 버전: 해부학 구조명, 술식명, 체위, 방향/면, 임플란트명은 영어 원문 그대로 쓰고, 연결어와 설명만 한국어로 씁니다.
- 영어 버전: 자연스러운 임상 영어로 씁니다.
- 임상적으로 의미 있는 수치(n, 성공률, 합병증률, 추적기간)를 우선하고, 초록에 없는 내용은 지어내지 않습니다. 불명확하면 "초록에 미기재" / "not reported".

출력 형식:
{"summary_ko":"3~4문장","clinical_points_ko":["...","...","..."],"evidence_level_ko":"높음|중간|낮음 + 근거","relevance_ko":"인의 논문이면 소동물 외과 적용, 수의면 빈 문자열","summary_en":"3-4 sentences","clinical_points_en":["...","...","..."],"evidence_level_en":"High|Moderate|Low + justification","relevance_en":"...","study_type":"study design in English"}

원문 언어: ${p.language ?? "eng"}
제목: ${p.title}
저널: ${p.journal} (${p.pub_date})
초록:
${p.abstract}`;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "로그인이 필요합니다" }), { status: 401, headers: cors });

    const { paper_id } = await req.json();
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: p, error } = await admin.from("papers").select("id,title,journal,pub_date,abstract,language").eq("id", paper_id).single();
    if (error || !p) return new Response(JSON.stringify({ error: "논문을 찾을 수 없습니다" }), { status: 404, headers: cors });
    if (!p.abstract) return new Response(JSON.stringify({ error: "초록이 없어 요약할 수 없습니다" }), { status: 400, headers: cors });

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1600, messages: [{ role: "user", content: PROMPT(p) }] }),
    });
    const j = await r.json();
    if (!r.ok) return new Response(JSON.stringify({ error: j.error?.message ?? "Claude 호출 실패" }), { status: 502, headers: cors });
    const text = (j.content ?? []).map((b: { text?: string }) => b.text ?? "").join("").replace(/^```(json)?|```$/gm, "").trim();
    const s = JSON.parse(text);
    const patch = {
      summary_ko: s.summary_ko, clinical_points: s.clinical_points_ko ?? [], evidence_level: s.evidence_level_ko, relevance_note: s.relevance_ko || null,
      summary_en: s.summary_en, clinical_points_en: s.clinical_points_en ?? [], evidence_level_en: s.evidence_level_en, relevance_note_en: s.relevance_en || null,
      study_type: s.study_type, summarized_at: new Date().toISOString(),
    };
    await admin.from("papers").update(patch).eq("id", paper_id);
    return new Response(JSON.stringify(patch), { headers: { ...cors, "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors });
  }
});
