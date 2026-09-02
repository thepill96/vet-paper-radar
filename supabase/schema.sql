-- Supabase SQL Editor에 통째로 붙여넣고 실행하세요.

create extension if not exists pg_trgm;

-- 1. 논문 --------------------------------------------------------------
create table if not exists public.papers (
  id               uuid primary key default gen_random_uuid(),
  pmid             text unique not null,
  doi              text,
  title            text not null,
  abstract         text,
  authors          text[] default '{}',
  journal          text,
  journal_abbrev   text,
  journal_group    text,
  pub_date         date,
  species          text check (species in ('vet','human')),
  categories       text[] default '{}',
  study_type_hint  text,
  url              text,
  language         text,                 -- 원문 언어 (eng, kor, jpn, ger ...)
  vernacular_title text,                 -- 비영어 논문의 원어 제목
  -- Claude 요약 (한국어)
  summary_ko       text,
  clinical_points  text[] default '{}',
  evidence_level   text,
  relevance_note   text,
  -- Claude 요약 (영어)
  summary_en       text,
  clinical_points_en text[] default '{}',
  evidence_level_en text,
  relevance_note_en text,
  study_type       text,                 -- 연구 설계 (영어 표기)
  summarized_at    timestamptz,
  created_at       timestamptz default now(),
  fts              tsvector generated always as (
    to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(vernacular_title,'') || ' ' || coalesce(abstract,'') || ' ' || coalesce(summary_ko,'') || ' ' || coalesce(summary_en,''))
  ) stored
);
create index if not exists papers_fts_idx on public.papers using gin (fts);
create index if not exists papers_created_idx on public.papers (created_at desc);
create index if not exists papers_cat_idx on public.papers using gin (categories);
create index if not exists papers_title_trgm on public.papers using gin (title gin_trgm_ops);

-- 2. 가입은 누구나, 열람은 운영자 승인 후 -------------------------------
--    (첫 가입자는 자동으로 관리자+승인. 그 뒤 가입자는 설정 → 사용자 승인에서 관리자가 승인)

-- 3. 프로필 (Readwise 토큰 등 개인 설정) --------------------------------
create table if not exists public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  email          text,
  display_name   text,
  readwise_token text,
  summary_lang   text default 'ko' check (summary_lang in ('ko','en','both')),
  notion_token   text,
  notion_database_id text,
  digest_freq    text default 'weekly' check (digest_freq in ('daily','weekly','off')),
  digest_weekday int default 1,
  interest_keywords text[] default '{}',
  digest_last_sent_at timestamptz,
  status         text default 'pending' check (status in ('pending','approved','blocked')),
  is_admin       boolean default false,
  auto_read      boolean default true,
  ui_lang        text default 'en',
  created_at     timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare first_user boolean;
begin
  select not exists (select 1 from public.profiles where is_admin) into first_user;
  insert into public.profiles (id, email, display_name, status, is_admin)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
          case when first_user then 'approved' else 'pending' end, first_user)
  on conflict (id) do nothing;
  return new;
end $$;

create or replace function public.is_admin()
returns boolean language sql stable security definer as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;
create or replace function public.is_approved()
returns boolean language sql stable security definer as $$
  select coalesce((select status = 'approved' from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.protect_profile_columns()
returns trigger language plpgsql as $$
begin
  if not public.is_admin() then
    new.status := old.status;
    new.is_admin := old.is_admin;
  end if;
  return new;
end $$;
drop trigger if exists protect_profile_columns on public.profiles;
create trigger protect_profile_columns before update on public.profiles
  for each row execute function public.protect_profile_columns();

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. 사용자별 읽음/북마크/메모 ------------------------------------------
create table if not exists public.user_papers (
  user_id       uuid references auth.users(id) on delete cascade,
  paper_id      uuid references public.papers(id) on delete cascade,
  is_read       boolean default false,
  is_bookmarked boolean default false,
  note          text,
  updated_at    timestamptz default now(),
  primary key (user_id, paper_id)
);

-- 5. 열람 히스토리 ------------------------------------------------------
create table if not exists public.view_history (
  id        bigserial primary key,
  user_id   uuid references auth.users(id) on delete cascade,
  paper_id  uuid references public.papers(id) on delete cascade,
  viewed_at timestamptz default now()
);
create index if not exists view_history_user_idx on public.view_history (user_id, viewed_at desc);

-- 5b. 검색어 기록 / 추천 결과 ----------------------------------------
create table if not exists public.search_log (
  id         bigserial primary key,
  user_id    uuid references auth.users(id) on delete cascade,
  query      text not null,
  created_at timestamptz default now()
);
create index if not exists search_log_user_idx on public.search_log (user_id, created_at desc);

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

create table if not exists public.feedback (
  id         bigserial primary key,
  user_id    uuid references auth.users(id) on delete set null,
  kind       text,
  message    text not null,
  contact    text,
  created_at timestamptz default now()
);

create table if not exists public.comments (
  id         bigserial primary key,
  paper_id   uuid references public.papers(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete cascade,
  body       text not null,
  created_at timestamptz default now(),
  updated_at timestamptz
);
create index if not exists comments_paper_idx on public.comments (paper_id, created_at);

-- 6. RLS ---------------------------------------------------------------
alter table public.papers       enable row level security;
alter table public.feedback     enable row level security;
alter table public.comments     enable row level security;
alter table public.profiles     enable row level security;
alter table public.user_papers  enable row level security;
alter table public.view_history enable row level security;
alter table public.search_log   enable row level security;
alter table public.recommendations enable row level security;

drop policy if exists "papers readable by members" on public.papers;
create policy "papers readable by members" on public.papers
  for select to authenticated using (public.is_approved());


drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own user_papers" on public.user_papers;
create policy "own user_papers" on public.user_papers
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own history" on public.view_history;
create policy "own history" on public.view_history
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own search_log" on public.search_log;
create policy "own search_log" on public.search_log
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own recommendations" on public.recommendations;
create policy "own recommendations" on public.recommendations
  for select to authenticated using (auth.uid() = user_id and public.is_approved());

drop policy if exists "admin reads profiles" on public.profiles;
create policy "admin reads profiles" on public.profiles
  for select to authenticated using (public.is_admin());
drop policy if exists "admin updates profiles" on public.profiles;
create policy "admin updates profiles" on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "anyone logged in can send feedback" on public.feedback;
create policy "anyone logged in can send feedback" on public.feedback
  for insert to authenticated with check (user_id is null or user_id = auth.uid());
drop policy if exists "admin reads feedback" on public.feedback;
create policy "admin reads feedback" on public.feedback
  for select to authenticated using (public.is_admin());

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

create or replace function public.member_names()
returns table (id uuid, display_name text) language sql stable security definer as $$
  select id, coalesce(display_name, split_part(email, '@', 1)) from public.profiles where status = 'approved';
$$;
grant execute on function public.member_names() to authenticated;

create or replace function public.comment_counts(ids uuid[])
returns table (paper_id uuid, n bigint) language sql stable security definer as $$
  select paper_id, count(*) from public.comments where paper_id = any(ids) group by paper_id;
$$;
grant execute on function public.comment_counts(uuid[]) to authenticated;

-- 7. 필터용 목록 RPC (분야·저널 distinct 값) -----------------------------
create or replace function public.filter_facets()
returns json language sql stable security definer as $$
  select json_build_object(
    'journals', (select coalesce(json_agg(json_build_object('name', journal, 'species', species, 'n', n) order by n desc), '[]'::json)
                 from (select journal, species, count(*) n from public.papers where journal is not null group by journal, species) s),
    'categories', (select coalesce(json_agg(json_build_object('name', c, 'species', species, 'n', n) order by n desc), '[]'::json)
                   from (select unnest(categories) c, species, count(*) n from public.papers group by c, species) s),
    'last_collected', (select max(created_at) from public.papers)
  );
$$;
grant execute on function public.filter_facets() to authenticated;

-- 8. 첫 가입자가 자동으로 관리자가 됩니다. 나중에 관리자를 추가하려면:
-- update public.profiles set is_admin = true, status = 'approved' where email = 'you@example.com';
