-- Notion 연동용 컬럼 (처음 설치면 schema.sql에 이미 포함되어 있으므로 불필요)
alter table public.profiles
  add column if not exists notion_token text,
  add column if not exists notion_database_id text;
