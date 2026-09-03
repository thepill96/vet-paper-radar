-- 4만 편 규모에서 목록·검색이 빨라지도록 인덱스 보강

-- 전문 검색 (이미 있으면 건너뜀)
create index if not exists papers_fts_idx on public.papers using gin (fts);

-- 목록 정렬·기간 필터
create index if not exists papers_pub_date_idx     on public.papers (pub_date desc nulls last);
create index if not exists papers_created_idx      on public.papers (created_at desc);

-- 대상·저널 필터 (기간 정렬과 함께 쓰이므로 복합 인덱스)
create index if not exists papers_species_pub_idx  on public.papers (species, pub_date desc nulls last);
create index if not exists papers_journal_pub_idx  on public.papers (journal, pub_date desc nulls last);

-- 분야(배열) 필터
create index if not exists papers_cat_idx          on public.papers using gin (categories);

-- AI 요약 있음 필터
create index if not exists papers_summarized_idx   on public.papers (summarized_at) where summarized_at is not null;

-- 사용자별 상태 조회
create index if not exists user_papers_user_idx    on public.user_papers (user_id);

analyze public.papers;
