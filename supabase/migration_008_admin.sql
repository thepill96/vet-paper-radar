-- 관리자 기능: 공지 배너, 피드백 상태·답장, 회원 활동 통계, AI 요약 사용량·비용

-- 1. 공지 --------------------------------------------------------------
create table if not exists public.announcements (
  id         bigserial primary key,
  body       text not null,
  level      text default 'info' check (level in ('info','warning')),
  active     boolean default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);
alter table public.announcements enable row level security;
drop policy if exists "members read announcements" on public.announcements;
create policy "members read announcements" on public.announcements
  for select to authenticated using (public.is_approved());
drop policy if exists "admin writes announcements" on public.announcements;
create policy "admin writes announcements" on public.announcements
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 2. 피드백 상태·답장 ---------------------------------------------------
alter table public.feedback
  add column if not exists status text default 'new' check (status in ('new','planned','done','declined')),
  add column if not exists reply text,
  add column if not exists replied_at timestamptz;
drop policy if exists "admin updates feedback" on public.feedback;
create policy "admin updates feedback" on public.feedback
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
-- 익명이 아닌 의견을 보낸 사람은 자기 의견과 답장을 볼 수 있음
drop policy if exists "own feedback readable" on public.feedback;
create policy "own feedback readable" on public.feedback
  for select to authenticated using (user_id = auth.uid());

-- 3. AI 요약 사용량 ------------------------------------------------------
create table if not exists public.summary_usage (
  id            bigserial primary key,
  user_id       uuid references auth.users(id) on delete set null,
  paper_id      uuid references public.papers(id) on delete set null,
  source        text default 'manual' check (source in ('auto','manual')),
  input_tokens  int default 0,
  output_tokens int default 0,
  created_at    timestamptz default now()
);
create index if not exists summary_usage_idx on public.summary_usage (created_at desc);
alter table public.summary_usage enable row level security;
drop policy if exists "admin reads usage" on public.summary_usage;
create policy "admin reads usage" on public.summary_usage
  for select to authenticated using (public.is_admin());

-- 4. 관리자용 조회 함수 (모두 관리자만 결과를 받음) -----------------------
create or replace function public.admin_overview()
returns json language sql stable security definer as $$
  select case when not public.is_admin() then null else json_build_object(
    'papers',       (select count(*) from public.papers),
    'papers_7d',    (select count(*) from public.papers where created_at > now() - interval '7 days'),
    'summarized',   (select count(*) from public.papers where summarized_at is not null),
    'members',      (select count(*) from public.profiles where status = 'approved'),
    'pending',      (select count(*) from public.profiles where status = 'pending'),
    'comments',     (select count(*) from public.comments),
    'feedback_new', (select count(*) from public.feedback where coalesce(status,'new') = 'new')
  ) end;
$$;
grant execute on function public.admin_overview() to authenticated;

create or replace function public.admin_user_stats()
returns table (
  id uuid, email text, display_name text, status text, is_admin boolean, created_at timestamptz,
  opened bigint, read_count bigint, bookmarks bigint, notes bigint, comments bigint, searches bigint, last_active timestamptz
) language sql stable security definer as $$
  select p.id, p.email, p.display_name, p.status, p.is_admin, p.created_at,
    (select count(*) from public.view_history v where v.user_id = p.id),
    (select count(*) from public.user_papers up where up.user_id = p.id and up.is_read),
    (select count(*) from public.user_papers up where up.user_id = p.id and up.is_bookmarked),
    (select count(*) from public.user_papers up where up.user_id = p.id and up.note is not null and up.note <> ''),
    (select count(*) from public.comments c where c.user_id = p.id),
    (select count(*) from public.search_log s where s.user_id = p.id),
    greatest(
      (select max(viewed_at) from public.view_history v where v.user_id = p.id),
      (select max(updated_at) from public.user_papers up where up.user_id = p.id),
      (select max(created_at) from public.comments c where c.user_id = p.id),
      (select max(created_at) from public.search_log s where s.user_id = p.id))
  from public.profiles p
  where public.is_admin()
  order by p.created_at desc;
$$;
grant execute on function public.admin_user_stats() to authenticated;

create or replace function public.admin_summary_usage()
returns table (month text, source text, n bigint, input_tokens bigint, output_tokens bigint)
language sql stable security definer as $$
  select to_char(created_at, 'YYYY-MM'), coalesce(source,'manual'), count(*),
         coalesce(sum(input_tokens),0), coalesce(sum(output_tokens),0)
  from public.summary_usage
  where public.is_admin()
  group by 1, 2 order by 1 desc, 2;
$$;
grant execute on function public.admin_summary_usage() to authenticated;
