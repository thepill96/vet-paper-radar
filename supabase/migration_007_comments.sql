-- 논문별 멤버 댓글 (개인 메모와 별개). 승인된 사용자만 읽고 쓸 수 있음.
create table if not exists public.comments (
  id         bigserial primary key,
  paper_id   uuid references public.papers(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete cascade,
  body       text not null,
  created_at timestamptz default now(),
  updated_at timestamptz
);
create index if not exists comments_paper_idx on public.comments (paper_id, created_at);
alter table public.comments enable row level security;

drop policy if exists "approved members read comments" on public.comments;
create policy "approved members read comments" on public.comments
  for select to authenticated using (public.is_approved());
drop policy if exists "approved members write own comments" on public.comments;
create policy "approved members write own comments" on public.comments
  for insert to authenticated with check (auth.uid() = user_id and public.is_approved());
drop policy if exists "edit own comments" on public.comments;
create policy "edit own comments" on public.comments
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "delete own or admin" on public.comments;
create policy "delete own or admin" on public.comments
  for delete to authenticated using (auth.uid() = user_id or public.is_admin());

-- 댓글 작성자 이름을 보여주기 위해 승인된 멤버는 다른 멤버의 표시 이름만 볼 수 있음
create or replace function public.member_names()
returns table (id uuid, display_name text) language sql stable security definer as $$
  select id, coalesce(display_name, split_part(email, '@', 1)) from public.profiles where status = 'approved';
$$;
grant execute on function public.member_names() to authenticated;

-- 댓글 수 (목록 표시용)
create or replace function public.comment_counts(ids uuid[])
returns table (paper_id uuid, n bigint) language sql stable security definer as $$
  select paper_id, count(*) from public.comments where paper_id = any(ids) group by paper_id;
$$;
grant execute on function public.comment_counts(uuid[]) to authenticated;
