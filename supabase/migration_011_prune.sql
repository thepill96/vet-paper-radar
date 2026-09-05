-- 용량 관리: 아무도 손대지 않은 오래된 논문부터 정리한다.
-- 보호(절대 건드리지 않음): 북마크·메모·읽음 표시된 논문, 열람 기록에 있는 논문,
--   댓글이 달린 논문, 추천에 올라간 논문, AI 요약이 있는 논문.

create or replace function public.db_size_bytes()
returns bigint language sql stable security definer as $$
  select pg_database_size(current_database());
$$;
grant execute on function public.db_size_bytes() to authenticated;

-- 정리 후보. require_abstract=true 면 초록이 남아 있는 것만 (1단계용).
create or replace function public.prunable_papers(keep_days int, batch int, require_abstract boolean default false)
returns setof uuid language sql stable security definer as $$
  select p.id from public.papers p
  where p.summarized_at is null
    and coalesce(p.pub_date, current_date) < current_date - keep_days
    and (not require_abstract or (p.abstract is not null and p.abstract <> ''))
    and not exists (select 1 from public.user_papers up where up.paper_id = p.id
                    and (up.is_bookmarked or up.is_read or (up.note is not null and up.note <> '')))
    and not exists (select 1 from public.view_history v where v.paper_id = p.id)
    and not exists (select 1 from public.comments c where c.paper_id = p.id)
    and not exists (select 1 from public.recommendations r where r.paper_id = p.id)
  order by p.pub_date asc nulls first
  limit batch;
$$;

-- 1단계: 초록만 비운다(용량의 대부분). 행은 남아 목록·검색·PubMed 링크가 그대로 동작.
create or replace function public.prune_slim(keep_days int default 365, batch int default 2000)
returns int language plpgsql security definer as $$
declare n int;
begin
  update public.papers set abstract = null
  where id in (select public.prunable_papers(keep_days, batch, true));
  get diagnostics n = row_count;
  return n;
end $$;

-- 2단계: 그래도 부족하면 행 자체를 지운다(같은 조건으로 재수집하면 되살아남).
create or replace function public.prune_delete(keep_days int default 365, batch int default 2000)
returns int language plpgsql security definer as $$
declare n int;
begin
  delete from public.papers where id in (select public.prunable_papers(keep_days, batch, false));
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.prune_slim(int, int) from anon, authenticated;
revoke all on function public.prune_delete(int, int) from anon, authenticated;

-- 관리자 개요에 용량·보호 논문 수 추가
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
    'protected',    (select count(*) from (
                        select paper_id from public.user_papers where is_bookmarked or is_read or (note is not null and note <> '')
                        union select paper_id from public.view_history
                        union select paper_id from public.comments
                        union select paper_id from public.recommendations) s)
  ) end;
$$;
grant execute on function public.admin_overview() to authenticated;
