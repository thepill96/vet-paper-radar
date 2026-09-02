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

-- 2. 초대 명단 (여기 있는 이메일만 가입/로그인 가능) ---------------------
create table if not exists public.allowlist (
  email      text primary key,
  note       text,
  created_at timestamptz default now()
);

create or replace function public.check_allowlist()
returns trigger language plpgsql security definer as $$
begin
  if not exists (select 1 from public.allowlist where lower(email) = lower(new.email)) then
    raise exception '초대되지 않은 이메일입니다: %', new.email;
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created_check on auth.users;
create trigger on_auth_user_created_check
  before insert on auth.users
  for each row execute function public.check_allowlist();

-- 3. 프로필 (Readwise 토큰 등 개인 설정) --------------------------------
create table if not exists public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  email          text,
  display_name   text,
  readwise_token text,
  summary_lang   text default 'ko' check (summary_lang in ('ko','en','both')),
  notion_token   text,
  notion_database_id text,
  created_at     timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end $$;

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

-- 6. RLS ---------------------------------------------------------------
alter table public.papers       enable row level security;
alter table public.allowlist    enable row level security;
alter table public.profiles     enable row level security;
alter table public.user_papers  enable row level security;
alter table public.view_history enable row level security;

drop policy if exists "papers readable by members" on public.papers;
create policy "papers readable by members" on public.papers
  for select to authenticated using (true);

-- allowlist는 service_role(대시보드/스크립트)만 접근. 로그인 사용자에게는 정책 없음 = 접근 불가.

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own user_papers" on public.user_papers;
create policy "own user_papers" on public.user_papers
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own history" on public.view_history;
create policy "own history" on public.view_history
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 7. 필터용 목록 RPC (분야·저널 distinct 값) -----------------------------
create or replace function public.filter_facets()
returns json language sql stable security definer as $$
  select json_build_object(
    'journals', (select coalesce(json_agg(j order by j), '[]'::json) from (select distinct journal as j from public.papers where journal is not null) s),
    'categories', (select coalesce(json_agg(c order by c), '[]'::json) from (select distinct unnest(categories) as c from public.papers) s)
  );
$$;
grant execute on function public.filter_facets() to authenticated;

-- 8. 첫 초대 (본인 이메일로 바꾸세요) -----------------------------------
-- insert into public.allowlist (email, note) values ('you@example.com', '운영자');
