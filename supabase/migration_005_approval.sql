-- 가입 후 운영자 승인제 + 피드백 + 동적 필터. 기존 DB에 적용 (처음 설치면 schema.sql에 포함됨)

-- 1. 초대 명단 게이트 제거 (누구나 가입 가능, 승인 전에는 아무것도 못 봄)
drop trigger if exists on_auth_user_created_check on auth.users;

-- 2. 프로필 상태
alter table public.profiles
  add column if not exists status text default 'pending' check (status in ('pending','approved','blocked')),
  add column if not exists is_admin boolean default false,
  add column if not exists auto_read boolean default true;

-- 기존 사용자(초대제 시절)는 전부 승인 처리
update public.profiles set status = 'approved' where status = 'pending';

-- 첫 가입자(또는 admin이 아무도 없을 때 가입하는 사람)는 자동 승인 + 관리자
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

-- 일반 사용자가 자기 status/is_admin을 못 바꾸게
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

-- 3. RLS: 승인된 사용자만 논문·추천 열람, 관리자는 모든 프로필 열람·수정
drop policy if exists "papers readable by members" on public.papers;
create policy "papers readable by members" on public.papers
  for select to authenticated using (public.is_approved());

drop policy if exists "own recommendations" on public.recommendations;
create policy "own recommendations" on public.recommendations
  for select to authenticated using (auth.uid() = user_id and public.is_approved());

drop policy if exists "admin reads profiles" on public.profiles;
create policy "admin reads profiles" on public.profiles
  for select to authenticated using (public.is_admin());
drop policy if exists "admin updates profiles" on public.profiles;
create policy "admin updates profiles" on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- 4. 피드백·의견함
create table if not exists public.feedback (
  id         bigserial primary key,
  user_id    uuid references auth.users(id) on delete set null,  -- 익명이면 null
  kind       text,
  message    text not null,
  contact    text,
  created_at timestamptz default now()
);
alter table public.feedback enable row level security;
drop policy if exists "anyone logged in can send feedback" on public.feedback;
create policy "anyone logged in can send feedback" on public.feedback
  for insert to authenticated with check (user_id is null or user_id = auth.uid());
drop policy if exists "admin reads feedback" on public.feedback;
create policy "admin reads feedback" on public.feedback
  for select to authenticated using (public.is_admin());

-- 5. 동적 필터: 저널·분야마다 대상(수의/인의)과 건수
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

-- 6. 나를 관리자로 (본인 이메일로 바꾸어 실행)
-- update public.profiles set is_admin = true, status = 'approved' where email = 'you@example.com';
