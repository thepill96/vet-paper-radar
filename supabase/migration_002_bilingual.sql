-- 이미 schema.sql을 실행한 DB에만 적용 (처음 설치면 schema.sql만 실행하면 됨)
alter table public.papers
  add column if not exists language text,
  add column if not exists vernacular_title text,
  add column if not exists summary_en text,
  add column if not exists clinical_points_en text[] default '{}',
  add column if not exists evidence_level_en text,
  add column if not exists relevance_note_en text;
alter table public.papers drop column if exists fts;
alter table public.papers add column fts tsvector generated always as (
  to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(vernacular_title,'') || ' ' || coalesce(abstract,'') || ' ' || coalesce(summary_ko,'') || ' ' || coalesce(summary_en,''))
) stored;
create index if not exists papers_fts_idx on public.papers using gin (fts);
alter table public.profiles
  add column if not exists summary_lang text default 'ko' check (summary_lang in ('ko','en','both'));
-- 기존 한글 요약만 있는 논문에 영어 요약을 채우려면: update public.papers set summarized_at = null where summary_en is null;
-- (다음 수집 실행 때 상한 개수만큼 다시 요약됨)
