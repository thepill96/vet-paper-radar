# Vet Stacks — 최종본 사용 안내

이 폴더가 지금까지 만든 모든 것의 완전한 최신본입니다. 이전에 받으신 update*.zip은 전부 잊고 이것만 쓰시면 됩니다.

## A. 이미 운영 중인 저장소에 적용하는 경우 (지금 상황)

**1. 폴더 교체**
맥의 프로젝트 폴더 안에서, 아래 항목을 이 폴더의 것으로 통째로 바꿉니다.
`web/` `scripts/` `supabase/` `config/` `.github/` `README.md` `SETUP.md` `.gitignore`

⚠️ **`.git` 폴더와 `web/node_modules`는 절대 지우거나 덮지 마세요.** 이 둘은 이 압축에 들어 있지 않습니다.
가장 안전한 방법: 터미널에서 위 항목만 지우고 새 것을 복사합니다.
```
cd ~/경로/vet-stacks            # 프로젝트 폴더
rm -rf web/src web/index.html web/package.json web/vite.config.js scripts supabase config .github README.md
# 그다음 Finder에서 압축 푼 폴더의 같은 항목들을 여기로 복사
```

**2. DB 마이그레이션** — Supabase → SQL Editor에서 번호 순서대로 실행 (이미 한 것을 다시 해도 안전)
`migration_004_digest.sql` → `005_approval.sql` → `006_i18n.sql` → `007_comments.sql` → `008_admin.sql`

**3. Edge Functions 배포** — 터미널에서
```
supabase functions deploy
```

**4. 코드 올리기**
```
git add .
git commit -m "vet stacks final"
git push
```
2~3분 뒤 https://thepill96.github.io/vet-stacks/ 새로고침.

## B. 처음부터 새로 설치하는 경우
README.md의 "설치" 절을 따르세요. `supabase/schema.sql` 하나만 실행하면 되고, 마이그레이션 파일들은 실행할 필요가 없습니다(이미 schema.sql에 모두 포함).

## 다음에 파일을 받을 때
Finder에서 폴더를 끌어다 놓을 때 **"병합(Merge)"** 을 고르세요. "대치(Replace)"를 고르면 새 압축에 없는 파일이 사라집니다. 병합 선택지가 안 보이면 Option 키를 누른 채 놓으면 나타납니다.

## 지금 남은 할 일
- [ ] Google 로그인 켜기: Google Cloud Console에서 OAuth 클라이언트 생성 → Supabase → Authentication → Providers → Google (README 2단계)
- [ ] 과거 논문 채우기: Actions → Fetch PubMed papers → Run workflow, `lookback_days` 365, `max_summaries` 0
- [ ] 동료 초대: 가입하면 Admin 탭 → 가입 승인에서 승인
