# Vet Paper Radar

수의·인의 임상 논문을 매일 아침 7시(KST) PubMed에서 언어 제한 없이 모아 분류하고, Claude가 원문 언어와 무관하게 한국어·영어 두 버전의 요약·임상 포인트를 달아 주며, 초대된 동료들과 각자 읽음·북마크·메모·히스토리를 남기는 사이트.

```
PubMed ──(GitHub Actions, 매일 07:00 KST)──▶ Supabase DB ◀──── 웹앱 (GitHub Pages)
                │                                 ▲                 로그인 / 필터 / 검색
                └── Claude 요약 ───────────────────┘                 읽음·북마크·메모·히스토리
                                                                    Obsidian · Anki · Readwise 내보내기
```

| 폴더 | 역할 |
|---|---|
| `config/sources.json` | 수집할 저널·분야 키워드·수집 기간. **가장 자주 손댈 파일** |
| `scripts/fetch_pubmed.py` | PubMed 수집 → 분류 → DB 저장 → Claude 요약 |
| `.github/workflows/` | 매일 수집(`fetch.yml`), 웹 배포(`deploy.yml`) |
| `supabase/schema.sql` | DB 테이블, 초대 명단 게이트, 권한(RLS) |
| `supabase/functions/` | 버튼 눌렀을 때 요약 생성 / Readwise 전송 / Notion DB 동기화 (API 키를 서버에 숨김) |
| `web/` | React 웹앱 |

---

## 설치 (한 번만, 약 40분)

### 1. Supabase 프로젝트
1. https://supabase.com → New project (리전 Northeast Asia/Seoul 권장). DB 비밀번호는 보관.
2. 왼쪽 **SQL Editor** → `supabase/schema.sql` 내용 전체 붙여넣기 → Run.
3. 같은 SQL Editor에서 본인 이메일을 초대 명단에 추가:
   ```sql
   insert into public.allowlist (email, note) values ('본인@gmail.com', '운영자');
   ```
   동료를 초대할 때도 이 한 줄만 실행하면 됩니다. 명단에 없는 이메일은 가입·로그인 자체가 막힙니다.
4. **Project Settings → API** 에서 세 값을 복사해 둡니다.
   - Project URL
   - `anon` `public` 키 (웹앱용)
   - `service_role` 키 (수집 스크립트용 — **절대 웹앱이나 공개 저장소에 넣지 않기**)

### 2. 로그인 방식
- **이메일+비밀번호**: Authentication → Providers → Email 이 켜져 있는지 확인(기본 켜짐). 인증 메일을 받아야 로그인됩니다.
- **Google**: Authentication → Providers → Google 켜기. Google Cloud Console에서 OAuth 클라이언트를 만들고 Client ID/Secret을 넣습니다(Supabase 화면에 안내되는 redirect URL을 Google 쪽 "승인된 리디렉션 URI"에 등록).
- Authentication → URL Configuration → **Site URL**과 **Redirect URLs**에 배포 주소(`https://<GitHub아이디>.github.io/<저장소이름>/`)를 넣습니다. 로컬 테스트용으로 `http://localhost:5173`도 추가.

### 3. Edge Functions (요약 버튼·Readwise 전송)
터미널에서 (Supabase CLI 설치: `npm i -g supabase`):
```bash
supabase login
supabase link --project-ref <프로젝트 ref>   # 대시보드 URL의 xxxxx 부분
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy summarize
supabase functions deploy readwise-export
supabase functions deploy notion-export
```
(`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`는 Edge Function에 자동 주입됩니다.)

### 4. GitHub 저장소
1. 이 폴더를 새 저장소(예: `vet-paper-radar`)에 올립니다.
2. **Settings → Secrets and variables → Actions → New repository secret** 으로 등록:

   | 이름 | 값 |
   |---|---|
   | `SUPABASE_URL` | Project URL |
   | `SUPABASE_ANON_KEY` | anon 키 |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role 키 |
   | `ANTHROPIC_API_KEY` | Claude API 키 (없으면 요약 없이 수집만) |
   | `NCBI_API_KEY` | 선택. https://www.ncbi.nlm.nih.gov/account/settings/ 에서 발급하면 수집이 빨라짐 |

3. **Settings → Pages → Source**를 **GitHub Actions**로.
4. **Actions** 탭 → "Fetch PubMed papers" → Run workflow → `lookback_days`를 `30`으로 해서 첫 수집. (이후엔 매일 자동으로 최근 3일치)
5. `web/` 아래 파일을 한 번 push하면 "Deploy web to GitHub Pages"가 돌고, `https://<아이디>.github.io/<저장소>/` 에서 열립니다.

### 5. 로컬에서 띄워 보기 (선택)
```bash
cd web
cp .env.example .env     # URL과 anon 키 입력
npm install
npm run dev              # http://localhost:5173
```

---

## 매일 쓰는 법
- **논문** 탭: 왼쪽에서 수의/인의·기간·분야·저널·내 상태로 거르고, 위 검색창에 `TPLO complication`처럼 입력(제목·초록·한글 요약 전체 검색).
- 논문을 열면 히스토리에 자동으로 쌓입니다. 읽음/북마크는 버튼으로, 메모는 입력 후 1초 뒤 자동 저장.
- 요약이 없는 논문은 **AI 요약 생성** 버튼(Edge Function 배포 후 동작). 매일 수집 시에도 실행당 `max_ai_summaries_per_run`개까지 자동 요약됩니다.
- 요약은 항상 **한국어·영어 두 버전**이 함께 생성됩니다. 요약창 위 탭(한국어 / English / 병기)으로 바꿔 보고, **설정 → 요약 언어**에서 기본값을 정합니다. 일본어·독일어 등 비영어 논문은 원어 제목이 영어 제목 아래에 표시되고 "원문 ○○" 칩이 붙습니다.
- **북마크**/**히스토리** 탭 상단에서 목록 전체를 Obsidian .md 한 파일 / Anki 가져오기 파일 / Readwise 하이라이트로 내보냅니다.
- **설정**에서 Readwise 토큰(https://readwise.io/access_token)을 저장하면 Readwise 버튼이 동작합니다.

## Notion 연동
논문을 Notion 데이터베이스에 열(속성)별로 정리합니다. 논문 한 편이 한 행이고, 본문에는 한/영 요약·임상 포인트·내 메모·원문 초록(토글)·출처가 들어갑니다. 같은 논문을 다시 보내면 PMID로 찾아 속성(읽음·북마크·메모)만 갱신하고 중복 행을 만들지 않습니다.
1. https://www.notion.so/my-integrations 에서 **새 내부 통합**을 만들고 토큰을 복사합니다. 권한은 콘텐츠 읽기·삽입·업데이트.
2. Notion에서 논문 DB를 둘 페이지를 열고 우측 상단 **··· → 연결(Connections)** 에서 방금 만든 통합을 추가합니다. (이 단계를 빼먹으면 "object_not_found" 오류가 납니다.)
3. 사이트 **설정 → Notion 연동**에 토큰과 그 페이지 링크를 넣고 **데이터베이스 만들기**. 이미 DB가 있으면 그 ID를 직접 넣어도 되지만, 열 이름이 `notion-export/index.ts`의 `DB_PROPERTIES`와 같아야 합니다.
4. 논문 화면의 **Notion** 버튼(한 편) 또는 북마크·히스토리 탭 상단의 **Notion**(목록 전체)으로 보냅니다.

참고: 인스타그램 가이드처럼 Claude 데스크탑 루틴 + PubMed/Notion 커넥터만으로도 비슷한 흐름을 만들 수 있습니다. 차이는 이 사이트가 저널·키워드 필터, 동료별 로그인·히스토리, 한/영 병기, Obsidian·Anki·Readwise까지 한 곳에서 처리한다는 점이고, Notion은 그중 하나의 출구가 됩니다.

## 저널·분야 바꾸기
`config/sources.json`만 고치고 push하면 다음 수집부터 반영됩니다.
- 저널 추가: `{ "name": "PubMed 정식 저널명", "species": "vet" 또는 "human", "group": "표시용 묶음" }`. 양이 많은 저널은 `must_match`에 키워드를 넣어 제목/초록에 그 단어가 있을 때만 수집.
- 분야 추가: `categories`에 `"분야명": ["키워드", ...]`. 키워드는 단어 시작 위치에서 매칭됩니다(`hepat` → hepatic, hepatectomy).
- 저널명이 맞는지는 PubMed에서 `"Journal Name"[Journal]`로 검색해 확인하세요.

## 비용
- Supabase, GitHub Pages/Actions: 이 규모에서는 무료 티어로 충분.
- Claude 요약: 논문 1편당 대략 1~2원 수준(초록 길이에 따라 다름). `max_ai_summaries_per_run`으로 상한 조절.

## 이미 설치했다면 (업데이트)
`supabase/migration_003_notion.sql`도 실행하고 `notion-export` 함수를 배포하세요.
`supabase/migration_002_bilingual.sql`을 SQL Editor에서 실행하고, Edge Function을 다시 배포(`supabase functions deploy summarize readwise-export`)한 뒤 push하세요. 기존 한글 요약만 있는 논문에 영어를 채우려면 migration 파일 끝의 주석 SQL을 실행하면 다음 수집 때 다시 요약됩니다.

## 문제 해결
- **"초대된 이메일이 아닙니다"**: `allowlist`에 그 이메일이 없음. 1-3 SQL 실행.
- **Google 로그인 후 빈 화면/에러**: Supabase URL Configuration의 Redirect URLs에 배포 주소가 없는 경우.
- **논문이 하나도 없음**: Actions 탭에서 "Fetch PubMed papers" 실행 기록과 로그 확인. Secrets 이름 오타가 가장 흔함.
- **AI 요약 생성 실패**: Edge Function이 배포되지 않았거나 `ANTHROPIC_API_KEY` 시크릿 미설정.
