-- 추천·알림 메일 기능 (기존 DB에 적용). 처음 설치면 schema.sql에 포함됨.

-- 검색어 기록
create table if not exists public.search_log (
  id         bigserial primary key,
  user_id    uuid references auth.users(id) on delete cascade,
  query      text not null,
  created_at timestamptz default now()
);
create index if not exists search_log_user_idx on public.search_log (user_id, created_at desc);
alter table public.search_log enable row level security;
drop policy if exists "own search_log" on public.search_log;
create policy "own search_log" on public.search_log
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 추천 결과 (스크립트가 계산해 넣고, 사이트 '추천' 탭과 메일이 읽음)
create table if not exists public.recommendations (
  id         bigserial primary key,
  user_id    uuid references auth.users(id) on delete cascade,
  paper_id   uuid references public.papers(id) on delete cascade,
  score      real,
  reason     text,
  created_at timestamptz default now(),
  emailed_at timestamptz,
  unique (user_id, paper_id)
);
create index if not exists recommendations_user_idx on public.recommendations (user_id, created_at desc);
alter table public.recommendations enable row level security;
drop policy if exists "own recommendations" on public.recommendations;
create policy "own recommendations" on public.recommendations
  for select to authenticated using (auth.uid() = user_id);

-- 사용자 설정
alter table public.profiles
  add column if not exists digest_freq text default 'weekly' check (digest_freq in ('daily','weekly','off')),
  add column if not exists digest_weekday int default 1,          -- 0=월 … 6=일 (weekly일 때)
  add column if not exists interest_keywords text[] default '{}', -- 사용자가 직접 적은 관심 키워드
  add column if not exists digest_last_sent_at timestamptz;
