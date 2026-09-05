-- 초록을 비운 논문을 표시해 두고(다시 열면 PubMed에서 복원), 정리 기준을 열람 여부 중심으로 바꾼다.

alter table public.papers add column if not exists abstract_pruned boolean default false;
create index if not exists papers_pruned_idx on public.papers (abstract_pruned) where abstract_pruned;

-- 1단계: 초록만 비우고 표시 (행·제목·저자·분야·PMID는 유지 → 목록·검색 그대로)
create or replace function public.prune_slim(keep_days int default 365, batch int default 2000)
returns int language plpgsql security definer as $$
declare n int;
begin
  update public.papers set abstract = null, abstract_pruned = true
  where id in (select public.prunable_papers(keep_days, batch, true));
  get diagnostics n = row_count;
  return n;
end $$;

-- 삭제 단계는 이미 초록이 비워진(=복원 가능한) 논문만 대상으로 삼아, 실수로 원본이 사라지지 않게 한다
create or replace function public.prune_delete(keep_days int default 365, batch int default 2000)
returns int language plpgsql security definer as $$
declare n int;
begin
  delete from public.papers
  where abstract_pruned
    and id in (select public.prunable_papers(keep_days, batch, false));
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.prune_slim(int, int) from anon, authenticated;
revoke all on function public.prune_delete(int, int) from anon, authenticated;

-- 관리자 개요에 '초록 비운 논문' 수 추가
create or replace function public.admin_overview()
returns json language sql stable security definer as $$
  select case when not public.is_admin() then null else json_build_object(
    'papers',       (select count(*) from public.papers),
    'papers_7d',    (select count(*) from public.papers where created_at > now() - interval '7 days'),
    'summarized',   (select count(*) from public.papers where summarized_at is not null),
    'members',      (select count(*) from public.profiles where status = 'approved'),
    'pending',      (select count(*) from public.profiles where status = 'pending'),
    'comments',     (select count(*) from public.comments),
    'feedback_new', (select count(*) from public.feedback where coalesce(status,'new') = 'new'),
    'db_bytes',     public.db_size_bytes(),
    'slimmed',      (select count(*) from public.papers where abstract_pruned),
    'protected',    (select count(*) from (
                        select paper_id from public.user_papers where is_bookmarked or is_read or (note is not null and note <> '')
                        union select paper_id from public.view_history
                        union select paper_id from public.comments
                        union select paper_id from public.recommendations) s)
  ) end;
$$;
grant execute on function public.admin_overview() to authenticated;
