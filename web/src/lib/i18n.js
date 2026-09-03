import { createContext, useContext } from "react";

export const LANGS = [
  ["en", "English"], ["ko", "한국어"], ["ja", "日本語"], ["de", "Deutsch"], ["es", "Español"],
];

const en = {
  pubmed: { title: "Not in your library?", inlineHint: "Search all of PubMed with the same terms and import what you need.", searchHere: "Search PubMed", hide: "Hide",
    placeholder: "e.g. tibial plateau leveling osteotomy complications", search: "Search", searching: "Searching…",
    sortDate: "Newest first", syntaxHint: "PubMed syntax works here: AND / OR / NOT, \"exact phrase\", author[au], journal[ta].",
    results: "{n} results on PubMed", noResults: "Nothing found. Try fewer or broader terms.",
    import: "Import", importSelected: "Import {n} selected", importAll: "Import all {n} new", imported: "Imported {n} — added to your bookmarks.",
    inLibrary: "In library", prev: "Previous", next: "Next" },
  admin: { notAllowed: "This section is for administrators only.", setupTitle: "Database setup incomplete", setupBody: "Run supabase/migration_008_admin.sql in the Supabase SQL Editor, then reload this page. Until then the sections below stay empty.", title: "Admin", lead: "Everything only administrators can see: approvals, member activity, announcements, feedback replies and summary costs.",
    papers: "Papers", papers7d: "Added this week", summarized: "Summarised", membersCount: "Members", pending: "Pending", comments: "Comments", feedbackNew: "New feedback",
    members: "Member activity", membersHint: "Counts since each member joined. Last active is the most recent open, mark, comment or search.",
    member: "Member", opened: "Opened", read: "Read", bookmarks: "Bookmarks", notes: "Notes", commentsCol: "Comments", searches: "Searches", lastActive: "Last active",
    announcements: "Announcements", announcementsHint: "Shown as a banner to all members until deactivated. Each member can dismiss it for themselves.", announcementPlaceholder: "e.g. Journal club Friday 5pm — bring one paper from this week", info: "Notice", warning: "Important", publish: "Publish", deactivate: "Deactivate", activate: "Activate", inactive: "inactive",
    feedback: "Feedback inbox", feedbackHint: "Set a status and optionally write a reply. Members who signed their feedback see the reply on their Feedback page.", noFeedback: "No feedback yet.", anonymous: "anonymous",
    status_new: "New", status_planned: "Planned", status_done: "Done", status_declined: "Declined", replyPlaceholder: "Write a reply…", reply: "Save reply", replyVisible: "The sender will see this reply.", replyAnon: "Anonymous feedback — the reply is only visible here.",
    usage: "AI summary usage", usageHint: "Every summary generated automatically or from the reader is logged with its token counts. Cost is an estimate at ${i}/M input and ${o}/M output tokens.",
    thisMonth: "Summaries this month", thisMonthCost: "Est. cost this month", allTime: "Summaries all time", allTimeCost: "Est. cost all time", month: "Month", source: "Source", count: "Summaries", tokens: "Tokens in / out", estCost: "Est. cost", src_auto: "Automatic", src_manual: "On demand" },
  banner: { title: "Announcement", dismiss: "Got it" },
  feedbackMine: { title: "Your feedback", reply: "Reply" },
  comments: { title: "Discussion", empty: "No comments yet. Start the discussion with your colleagues.", placeholder: "Share a thought with the team…", hint: "⌘/Ctrl + Enter to post", post: "Post", edit: "Edit", delete: "Delete", save: "Save", cancel: "Cancel", edited: "edited", confirmDelete: "Delete this comment?", you: "You", member: "Member" },
  tagline: "Daily curated veterinary and human clinical literature",
  nav: { feed: "Papers", recs: "For you", bookmarks: "Bookmarks", history: "History", about: "How it works", feedback: "Feedback", settings: "Settings", admin: "Admin" },
  search: "Search titles, abstracts, summaries…",
  view: { label: "Group by", category: "Field", journal: "Journal", latest: "Newest" },
  filter: { species: "Domain", vet: "Veterinary", human: "Human", period: "Published within", all: "All time", days: "{n}d", years: "{n}y",
    state: "Status", unread: "Unread", read: "Read", bookmarked: "Bookmarked", noted: "With notes", ai: "AI summary",
    categories: "Fields", journals: "Journals", reset: "Clear filters", selected: "{n} selected", afterCollect: "Appears after the first collection" },
  list: { feed: "All papers", recs: "Recommended for you", bookmarks: "Bookmarks", history: "Recently opened", unread: "{n} unread",
    updated: "Updated {t}", loading: "Loading", more: "Load more",
    emptyFeed: "No papers match", emptyFeedHint: "Try clearing a filter or widening the date range.",
    emptyRecs: "No recommendations yet", emptyRecsHint: "Open a few papers, bookmark or search — recommendations arrive after the next morning collection, here and by email.",
    emptyBookmarks: "Nothing bookmarked yet", emptyHistory: "Nothing opened yet", emptyHint: "Papers you open will show up here." },
  item: { markRead: "Mark as read", markUnread: "Mark as unread" },
  reader: { hint: "Select a paper to read its summary and abstract.", read: "Read", unread: "Unread", markRead: "Mark as read", markUnread: "Mark unread",
    bookmark: "Bookmark", bookmarked: "Bookmarked", summary: "Summary", abstract: "Abstract", notes: "My notes", notesPlaceholder: "How this applies to a case, doubts, things to look up later…",
    saved: "Saved", saving: "Saving…", noSummary: "No summary yet. Generating creates English and Korean versions.", noAbstract: "No abstract available on PubMed.",
    generate: "Generate summary", generating: "Generating", regenerate: "Regenerate both languages", design: "Design", evidence: "Evidence",
    relevance: "Relevance to small-animal surgery", original: "Original", both: "Side by side", missingKo: "Korean summary not generated yet.", missingEn: "English summary not generated yet.",
    noAbstractTitle: "No abstract on PubMed.", back: "Back" },
  species: { vet: "Veterinary", human: "Human" },
  auth: { title: "Vet Stacks", blurb: "Read, annotate, and export the clinical literature that matters to you — collected every morning from PubMed. New accounts are reviewed by the administrator.",
    google: "Continue with Google", redirecting: "Redirecting…", or: "or with email", email: "Email", password: "Password",
    signIn: "Sign in", signUp: "Create account", toSignUp: "New here? Sign up", toSignIn: "Have an account? Sign in", busy: "Working…",
    exists: "That email already has an account — sign in instead.",
    signedUp: "Account created. Confirm your email, then sign in.",
    approvalNote: "New accounts are reviewed by the administrator before you can read papers.",
    linkExpired: "That email link has expired or was already used. Request a new one below — links are valid for about an hour.",
    linkError: "Sign-in link failed ({code}). Please try again below.",
    forgot: "Forgot your password?", backToSignIn: "Back to sign in", sendReset: "Send reset link",
    expiredHint: "That link has expired or was already used. Request a new one and open it within the hour.",
    providerHint: "Google sign-in is not switched on yet for this site. The administrator has to enable it in Supabase → Authentication → Providers.",
    redirectHint: "The site address is not registered in Supabase → Authentication → URL Configuration, or in the Google OAuth client.",
    resetSent: "If that address has an account, a reset link is on its way. Check your inbox and spam folder.",
    newPassword: "Set a new password", newPasswordHint: "Choose a password of at least 6 characters. You will be signed in afterwards.",
    confirmPassword: "Confirm password", savePassword: "Save password", mismatch: "The two passwords do not match.", resetDone: "Password updated.",
    busy: "Working…", signedUp: "Account created. Confirm your email, then sign in. You can read papers once the administrator approves your account.",
    badCreds: "Email or password is incorrect.", notConfirmed: "Email not confirmed yet — check your inbox." },
  pending: { title: "Awaiting approval", body: "Your account ({email}) has been created. The administrator will review it, usually within a day. Refresh this page once approved.",
    blockedTitle: "Access restricted", blockedBody: "The administrator has restricted this account. If you think this is a mistake, contact them.", refresh: "Refresh", signOut: "Sign out" },
  settings: { title: "Settings", admin: "Administrator", language: "Language", languageHint: "Interface language. Summaries are generated in English and Korean; the default summary tab follows this setting.",
    approvals: "Account approvals", approvalsHint: "Anyone can sign up, but nobody can read papers until approved here. You'll get an email each morning while requests are pending.",
    noPending: "No pending requests.", approve: "Approve", block: "Block", allUsers: "All users ({n})", approved: "Approved", blocked: "Blocked", makeAdmin: "Make admin", removeAdmin: "Remove admin",
    feedbackInbox: "Feedback received ({n})", name: "Display name", reading: "Reading", autoRead: "Mark papers as read when opened", autoReadHint: "If off, use the dot in the list or the button in the reader.",
    summaryLang: "Summary language", summaryLangHint: "Which summary tab opens first.", ko: "Korean", en: "English", both: "Both",
    digest: "Recommendation emails", digestHint: "Your opens, bookmarks, notes and searches build an interest profile. New papers that match are listed under For you and emailed to {email}. This data is only used for your recommendations.",
    daily: "Every morning", weekly: "Weekly", off: "Off", weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    keywordsHint: "Keywords you add here outrank behaviour signals. Use English terms (e.g. TPLO, angular limb deformity, 3D printing).", keywordPlaceholder: "Add a keyword and press Enter", add: "Add", remove: "Click to remove",
    readwise: "Readwise", readwiseHint: "Paste your access token from readwise.io/access_token to enable the Readwise button. Stored on your account only.",
    notion: "Notion", notionHint: "1) Create an internal integration at notion.so/my-integrations and paste its token. 2) On the Notion page that should hold the database, open ··· → Connections and add the integration. Then paste the page link and create the database.",
    notionToken: "Notion integration token", notionPage: "Notion page link or ID", createDb: "Create database", creating: "Creating…", dbCreated: "Database created.", open: "Open", notionDbId: "…or an existing database ID",
    save: "Save changes", saved: "Saved", signOut: "Sign out" },
  about: { title: "How it works", lead: "How papers are collected, filtered, classified, summarised and recommended — including every journal and keyword in use. This page is generated from the live configuration.",
    collect: "Collection", collect1: "Every morning at 07:00 KST, {n} journals are queried on PubMed for papers added in the last {d} days. No language restriction.",
    collect2: "High-volume journals are filtered with must-match keywords so only small-animal-relevant work is kept.", collect3: "Papers are de-duplicated by PMID and stored permanently.",
    classify: "Classification", classifyHint: "A paper is tagged with a field when any keyword below appears at a word boundary in its title or abstract. Papers can carry several fields; otherwise they fall under \"{fallback}\".",
    designHints: "Study-design hints", summarise: "Summaries", summariseHint: "Claude writes an English and a Korean summary, three clinical points, the study design and an evidence level, whatever the original language. Anatomical, procedural and implant terms stay in English. Up to {n} papers are summarised automatically per run; others on demand from the reader.",
    recommend: "Recommendations", recommendHint: "For each user, bookmarks and notes (3 pts), read (2), opened (1), searches (2.5) and explicit keywords (4) build an interest profile. Papers added in the last 8 days are scored on field, journal and title-keyword matches; the top 10 go to For you and to email. Already-opened papers are excluded.",
    journals: "Journals", condition: "condition", suggest: "To add or split journals or fields, use Feedback." },
  feedback: { title: "Feedback", lead: "Suggestions for journals or fields to add, keyword tweaks, bugs, design — anything. Messages go only to the administrator.",
    kind: "Type", kinds: ["Add / split journals or fields", "Filter keywords", "Bug", "Design", "Other"], message: "Message", placeholder: "e.g. Please add Veterinary Dermatology / Split lymphoma out of Oncology",
    anon: "Send anonymously", contact: "Contact for a reply (optional)", send: "Send", sendAnon: "Send anonymously", sent: "Thanks — sent." },
  toast: { readwise: "Sent {n} highlights to Readwise", notionSending: "Sending {n} papers to Notion…", notion: "Notion: {c} added, {u} updated" },
  cat: { "Orthopedics": "Orthopedics", "Neurosurgery": "Neurosurgery", "Soft tissue surgery": "Soft tissue surgery", "Biomechanics & implants": "Biomechanics & implants",
    "Imaging & planning": "Imaging & planning", "Anesthesia & pain": "Anesthesia & pain", "Oncology": "Oncology", "Internal medicine": "Internal medicine",
    "Complications & outcomes": "Complications & outcomes", "Other": "Other" },
  design: { "Randomized": "Randomized", "Systematic review / meta-analysis": "Systematic review / meta-analysis", "Prospective": "Prospective", "Retrospective": "Retrospective", "Cadaveric / experimental": "Cadaveric / experimental", "Case report / series": "Case report / series" },
  group: { "Surgery": "Surgery", "Small animal": "Small animal", "Internal medicine": "Internal medicine", "Imaging": "Imaging", "Anesthesia": "Anesthesia", "Emergency": "Emergency", "Oncology": "Oncology",
    "Non-English veterinary": "Non-English veterinary", "Human orthopedics": "Human orthopedics", "Human neurosurgery": "Human neurosurgery", "Human general surgery": "Human general surgery", "Biomechanics": "Biomechanics" },
  original: { eng: "English", kor: "Korean", jpn: "Japanese", ger: "German", fre: "French", spa: "Spanish", ita: "Italian", por: "Portuguese", chi: "Chinese", rus: "Russian", pol: "Polish", tur: "Turkish" },
};

const ko = {
  pubmed: { title: "서재에 없나요?", inlineHint: "같은 검색어로 PubMed 전체를 찾아보고 필요한 것만 가져옵니다.", searchHere: "PubMed에서 찾기", hide: "접기",
    placeholder: "예: tibial plateau leveling osteotomy complications", search: "검색", searching: "검색 중…",
    sortDate: "최신순", syntaxHint: "PubMed 문법을 그대로 씁니다: AND / OR / NOT, \"정확한 구절\", author[au], journal[ta].",
    results: "PubMed 검색 결과 {n}건", noResults: "결과가 없습니다. 더 넓은 검색어로 시도해 보세요.",
    import: "가져오기", importSelected: "선택 {n}편 가져오기", importAll: "새 논문 {n}편 모두 가져오기", imported: "{n}편을 가져왔습니다 — 북마크에 추가됨.",
    inLibrary: "보관됨", prev: "이전", next: "다음" },
  banner: { title: "공지", dismiss: "확인" },
  admin: { notAllowed: "관리자만 볼 수 있는 화면입니다.", setupTitle: "데이터베이스 설정이 끝나지 않았습니다", setupBody: "Supabase SQL Editor에서 supabase/migration_008_admin.sql 을 실행한 뒤 이 페이지를 새로고침하세요. 그 전까지 아래 항목은 비어 있습니다.", title: "관리자", lead: "관리자만 볼 수 있는 것들: 가입 승인, 회원 활동, 공지, 피드백 답장, 요약 비용.",
    papers: "논문", papers7d: "이번 주 추가", summarized: "요약 완료", membersCount: "회원", pending: "승인 대기", comments: "댓글", feedbackNew: "새 피드백",
    members: "회원 활동", membersHint: "각 회원의 가입 이후 누적치. 마지막 활동은 열람·표시·댓글·검색 중 가장 최근 시각.",
    member: "회원", opened: "열람", read: "읽음", bookmarks: "북마크", notes: "메모", commentsCol: "댓글", searches: "검색", lastActive: "마지막 활동",
    announcements: "공지", announcementsHint: "비활성화할 때까지 모든 회원에게 배너로 보입니다. 회원 각자 닫을 수 있습니다.", announcementPlaceholder: "예: 금요일 5시 저널클럽 — 이번 주 논문 한 편씩 준비", info: "안내", warning: "중요", publish: "게시", deactivate: "내리기", activate: "다시 올리기", inactive: "내려짐",
    feedback: "피드백 함", feedbackHint: "상태를 정하고 필요하면 답장을 씁니다. 익명이 아닌 피드백은 보낸 사람이 자기 피드백 페이지에서 답장을 봅니다.", noFeedback: "아직 피드백이 없습니다.", anonymous: "익명",
    status_new: "새 글", status_planned: "예정", status_done: "완료", status_declined: "보류", replyPlaceholder: "답장 쓰기…", reply: "답장 저장", replyVisible: "보낸 사람에게 이 답장이 보입니다.", replyAnon: "익명 피드백 — 답장은 여기서만 보입니다.",
    usage: "AI 요약 사용량", usageHint: "자동·수동으로 만든 모든 요약의 토큰 수가 기록됩니다. 비용은 입력 ${i}/M, 출력 ${o}/M 토큰 기준 추정치입니다.",
    thisMonth: "이번 달 요약", thisMonthCost: "이번 달 추정 비용", allTime: "전체 요약", allTimeCost: "전체 추정 비용", month: "월", source: "구분", count: "요약 수", tokens: "토큰 입력 / 출력", estCost: "추정 비용", src_auto: "자동", src_manual: "수동" },
  feedbackMine: { title: "내가 보낸 피드백", reply: "답장" },
  comments: { title: "토론", empty: "아직 댓글이 없습니다. 동료들과 이야기를 시작해 보세요.", placeholder: "팀과 나눌 생각을 적어 주세요…", hint: "⌘/Ctrl + Enter로 등록", post: "등록", edit: "수정", delete: "삭제", save: "저장", cancel: "취소", edited: "수정됨", confirmDelete: "이 댓글을 삭제할까요?", you: "나", member: "멤버" },
  tagline: "수의·인의 임상 논문을 매일 아침 큐레이션",
  nav: { feed: "논문", recs: "추천", bookmarks: "북마크", history: "히스토리", about: "작동 방식", feedback: "피드백", settings: "설정", admin: "관리자" },
  search: "제목·초록·요약 검색…",
  view: { label: "묶어 보기", category: "분야", journal: "저널", latest: "최신순" },
  filter: { species: "대상", vet: "수의", human: "인의", period: "발행 기간", all: "전체", days: "{n}일", years: "{n}년",
    state: "상태", unread: "안 읽음", read: "읽음", bookmarked: "북마크", noted: "메모 있음", ai: "AI 요약",
    categories: "분야", journals: "저널", reset: "필터 초기화", selected: "{n}개 선택", afterCollect: "첫 수집 후 표시됩니다" },
  list: { feed: "전체 논문", recs: "추천 논문", bookmarks: "북마크", history: "최근 연 논문", unread: "안 읽음 {n}",
    updated: "{t} 업데이트", loading: "불러오는 중", more: "더 보기",
    emptyFeed: "조건에 맞는 논문이 없습니다", emptyFeedHint: "필터를 풀거나 기간을 넓혀 보세요.",
    emptyRecs: "아직 추천이 없습니다", emptyRecsHint: "논문을 몇 편 열어보고 북마크·검색을 하면, 다음 아침 수집 후 여기와 메일로 추천이 옵니다.",
    emptyBookmarks: "북마크한 논문이 없습니다", emptyHistory: "아직 연 논문이 없습니다", emptyHint: "논문을 열면 여기에 쌓입니다." },
  item: { markRead: "읽음으로 표시", markUnread: "안 읽음으로 표시" },
  reader: { hint: "논문을 선택하면 요약과 초록이 표시됩니다.", read: "읽음", unread: "안 읽음", markRead: "읽음으로 표시", markUnread: "안 읽음으로",
    bookmark: "북마크", bookmarked: "북마크됨", summary: "요약", abstract: "초록", notes: "내 메모", notesPlaceholder: "케이스에 어떻게 적용할지, 의심되는 점, 나중에 찾아볼 것…",
    saved: "저장됨", saving: "저장 중…", noSummary: "아직 요약이 없습니다. 생성하면 한국어·영어가 함께 만들어집니다.", noAbstract: "PubMed에 초록이 없습니다.",
    generate: "AI 요약 생성", generating: "생성 중", regenerate: "두 언어로 다시 생성", design: "설계", evidence: "근거",
    relevance: "소동물 외과 적용", original: "원문", both: "병기", missingKo: "한국어 요약이 아직 없습니다.", missingEn: "영어 요약이 아직 없습니다.",
    noAbstractTitle: "PubMed에 초록이 없습니다.", back: "목록" },
  species: { vet: "수의", human: "인의" },
  auth: { title: "Vet Stacks", blurb: "매일 아침 PubMed에서 모은 임상 논문을 읽고, 메모하고, 내보내는 곳. 새 계정은 운영자 승인을 거칩니다.",
    google: "Google로 계속하기", redirecting: "이동 중…", or: "또는 이메일로", email: "이메일", password: "비밀번호",
    signIn: "로그인", signUp: "가입하기", toSignUp: "처음이면 가입", toSignIn: "계정이 있으면 로그인", busy: "처리 중…",
    exists: "이미 가입된 이메일입니다 — 로그인해 주세요.",
    signedUp: "가입됨. 인증 메일의 링크를 누른 뒤 로그인하세요.",
    approvalNote: "새 계정은 운영자 승인 후 논문을 볼 수 있습니다.",
    linkExpired: "메일 링크가 만료되었거나 이미 사용되었습니다. 아래에서 새로 요청하세요. 링크는 약 1시간 동안만 유효합니다.",
    linkError: "로그인 링크 오류({code})입니다. 아래에서 다시 시도해 주세요.",
    forgot: "비밀번호를 잊으셨나요?", backToSignIn: "로그인으로 돌아가기", sendReset: "재설정 링크 보내기",
    expiredHint: "링크가 만료되었거나 이미 사용된 것입니다. 새로 요청해 1시간 안에 열어 주세요.",
    providerHint: "이 사이트에 Google 로그인이 아직 켜져 있지 않습니다. 운영자가 Supabase → Authentication → Providers에서 켜야 합니다.",
    redirectHint: "사이트 주소가 Supabase → Authentication → URL Configuration 또는 Google OAuth 클라이언트에 등록되어 있지 않습니다.",
    resetSent: "가입된 주소라면 재설정 링크를 보냈습니다. 받은편지함과 스팸함을 확인하세요.",
    newPassword: "새 비밀번호 설정", newPasswordHint: "6자 이상으로 정하세요. 저장하면 바로 로그인됩니다.",
    confirmPassword: "비밀번호 확인", savePassword: "비밀번호 저장", mismatch: "두 비밀번호가 일치하지 않습니다.", resetDone: "비밀번호가 변경되었습니다.",
    busy: "처리 중…", signedUp: "가입됨. 인증 메일의 링크를 누른 뒤 로그인하세요. 운영자 승인 후 논문을 볼 수 있습니다.",
    badCreds: "이메일 또는 비밀번호가 맞지 않습니다.", notConfirmed: "이메일 인증이 아직 안 됐습니다. 받은편지함을 확인하세요." },
  pending: { title: "승인 대기 중", body: "{email} 계정이 만들어졌습니다. 운영자가 보통 하루 안에 승인하며, 승인되면 이 페이지를 새로고침하세요.",
    blockedTitle: "이용이 제한된 계정", blockedBody: "운영자가 이 계정의 이용을 제한했습니다. 오해라고 생각되면 운영자에게 연락하세요.", refresh: "새로고침", signOut: "로그아웃" },
  settings: { title: "설정", admin: "관리자", language: "언어", languageHint: "화면 언어입니다. 요약은 영어·한국어로 생성되며, 기본 요약 탭은 이 설정을 따릅니다.",
    approvals: "가입 승인", approvalsHint: "누구나 가입할 수 있지만 여기서 승인하기 전에는 논문을 볼 수 없습니다. 대기자가 있으면 매일 아침 메일로 알려드립니다.",
    noPending: "대기 중인 요청이 없습니다.", approve: "승인", block: "차단", allUsers: "전체 사용자 ({n})", approved: "승인됨", blocked: "차단됨", makeAdmin: "관리자 지정", removeAdmin: "관리자 해제",
    feedbackInbox: "받은 의견 ({n})", name: "표시 이름", reading: "읽기", autoRead: "논문을 열면 읽음으로 표시", autoReadHint: "끄면 목록의 점이나 상세 화면 버튼으로 직접 표시합니다.",
    summaryLang: "요약 언어", summaryLangHint: "먼저 열리는 요약 탭.", ko: "한국어", en: "English", both: "병기",
    digest: "추천 알림 메일", digestHint: "열람·북마크·메모·검색 기록으로 관심 프로필을 만들고, 맞는 새 논문을 추천 탭과 {email}로 보냅니다. 이 기록은 추천에만 쓰입니다.",
    daily: "매일 아침", weekly: "주 1회", off: "받지 않음", weekdays: ["월", "화", "수", "목", "금", "토", "일"],
    keywordsHint: "직접 적은 키워드는 행동 기록보다 우선합니다. 영어 용어를 권장합니다 (예: TPLO, angular limb deformity, 3D printing).", keywordPlaceholder: "키워드 입력 후 Enter", add: "추가", remove: "클릭해서 제거",
    readwise: "Readwise", readwiseHint: "readwise.io/access_token 의 토큰을 붙여 넣으면 Readwise 버튼이 활성화됩니다. 내 계정에만 저장됩니다.",
    notion: "Notion", notionHint: "1) notion.so/my-integrations 에서 내부 통합을 만들고 토큰을 붙여 넣습니다. 2) DB를 둘 Notion 페이지에서 ··· → 연결 → 그 통합을 추가한 뒤 페이지 링크를 붙여 넣고 데이터베이스를 만듭니다.",
    notionToken: "Notion 통합 토큰", notionPage: "Notion 페이지 링크 또는 ID", createDb: "데이터베이스 만들기", creating: "만드는 중…", dbCreated: "데이터베이스를 만들었습니다.", open: "열기", notionDbId: "…또는 기존 데이터베이스 ID",
    save: "저장", saved: "저장됨", signOut: "로그아웃" },
  about: { title: "작동 방식", lead: "논문이 수집·필터·분류·요약·추천되는 방식과 사용 중인 저널·키워드 전체입니다. 이 페이지는 실제 설정 파일에서 생성됩니다.",
    collect: "수집", collect1: "매일 07:00 KST에 저널 {n}종을 PubMed에서 조회해 최근 {d}일 내 등록된 논문을 가져옵니다. 언어 제한은 없습니다.",
    collect2: "양이 많은 저널은 must-match 키워드로 걸러 소동물 관련만 남깁니다.", collect3: "PMID로 중복을 제거하고 영구 보관합니다.",
    classify: "분류", classifyHint: "제목·초록에 아래 키워드가 단어 시작 위치에 나오면 해당 분야가 붙습니다. 여러 분야에 속할 수 있고, 어디에도 안 걸리면 \"{fallback}\"입니다.",
    designHints: "연구 설계 힌트", summarise: "요약", summariseHint: "원문 언어와 무관하게 Claude가 영어·한국어 요약, 임상 포인트 3개, 연구 설계, 근거 수준을 만듭니다. 해부학·술식·임플란트 용어는 영어를 유지합니다. 실행당 최대 {n}편이 자동 요약되고 나머지는 상세 화면에서 필요할 때 만듭니다.",
    recommend: "추천", recommendHint: "사용자마다 북마크·메모(3점), 읽음(2), 열람(1), 검색(2.5), 직접 적은 키워드(4)로 관심 프로필을 만들고, 최근 8일 내 수집된 논문을 분야·저널·제목 키워드 일치로 점수화해 상위 10편을 추천 탭과 메일로 보냅니다. 이미 연 논문은 제외됩니다.",
    journals: "저널", condition: "조건", suggest: "저널·분야 추가나 분리는 피드백으로 보내주세요." },
  feedback: { title: "피드백", lead: "저널·분야 추가, 키워드 조정, 버그, 디자인 등 무엇이든. 운영자에게만 전달됩니다.",
    kind: "종류", kinds: ["저널·분야 추가/분리", "필터 키워드", "버그", "디자인", "기타"], message: "내용", placeholder: "예: Veterinary Dermatology도 수집해 주세요 / 종양에서 lymphoma를 분리하면 좋겠어요",
    anon: "익명으로 보내기", contact: "회신받을 연락처 (선택)", send: "보내기", sendAnon: "익명으로 보내기", sent: "보냈습니다. 고맙습니다." },
  toast: { readwise: "Readwise로 하이라이트 {n}개 보냄", notionSending: "Notion으로 보내는 중… ({n}편)", notion: "Notion: {c}편 추가, {u}편 갱신" },
  cat: { "Orthopedics": "정형외과", "Neurosurgery": "신경외과", "Soft tissue surgery": "연부조직외과", "Biomechanics & implants": "생체역학·임플란트",
    "Imaging & planning": "영상·수술계획", "Anesthesia & pain": "마취·통증", "Oncology": "종양", "Internal medicine": "내과", "Complications & outcomes": "합병증·예후", "Other": "기타" },
  design: { "Randomized": "무작위 대조", "Systematic review / meta-analysis": "체계적 문헌고찰·메타분석", "Prospective": "전향적", "Retrospective": "후향적", "Cadaveric / experimental": "사체·실험", "Case report / series": "증례" },
  group: { "Surgery": "외과", "Small animal": "소동물", "Internal medicine": "내과", "Imaging": "영상", "Anesthesia": "마취", "Emergency": "응급", "Oncology": "종양",
    "Non-English veterinary": "비영어권 수의", "Human orthopedics": "인의 정형", "Human neurosurgery": "인의 신경", "Human general surgery": "인의 일반외과", "Biomechanics": "생체역학" },
  original: { eng: "영어", kor: "한국어", jpn: "일본어", ger: "독일어", fre: "프랑스어", spa: "스페인어", ita: "이탈리아어", por: "포르투갈어", chi: "중국어", rus: "러시아어", pol: "폴란드어", tur: "터키어" },
};

// 이하 언어는 핵심 UI만 번역. 빠진 항목은 영어로 표시됨.
const ja = {
  banner: { title: "お知らせ", dismiss: "確認" },
  comments: { title: "ディスカッション", empty: "まだコメントはありません。", placeholder: "チームと共有するコメント…", hint: "⌘/Ctrl + Enter で投稿", post: "投稿", edit: "編集", delete: "削除", save: "保存", cancel: "キャンセル", edited: "編集済み", confirmDelete: "このコメントを削除しますか？", you: "自分", member: "メンバー" },
  tagline: "獣医・医学の臨床論文を毎朝キュレーション",
  nav: { feed: "論文", recs: "おすすめ", bookmarks: "ブックマーク", history: "履歴", about: "仕組み", feedback: "フィードバック", settings: "設定" },
  search: "タイトル・抄録・要約を検索…",
  view: { label: "グループ", category: "分野", journal: "ジャーナル", latest: "新着順" },
  filter: { species: "対象", vet: "獣医", human: "医学", period: "発行期間", all: "すべて", days: "{n}日", years: "{n}年", state: "状態", unread: "未読", read: "既読", bookmarked: "ブックマーク", noted: "メモあり", ai: "AI要約", categories: "分野", journals: "ジャーナル", reset: "フィルター解除", selected: "{n}件選択", afterCollect: "初回収集後に表示" },
  list: { feed: "すべての論文", recs: "おすすめ", bookmarks: "ブックマーク", history: "最近開いた論文", unread: "未読 {n}", updated: "{t} 更新", loading: "読み込み中", more: "もっと見る", emptyFeed: "該当する論文がありません", emptyFeedHint: "フィルターを解除するか期間を広げてください。", emptyRecs: "まだおすすめはありません", emptyRecsHint: "論文を開いたりブックマーク・検索すると、翌朝の収集後にこことメールに届きます。", emptyBookmarks: "ブックマークはありません", emptyHistory: "まだ開いた論文はありません", emptyHint: "開いた論文がここに表示されます。" },
  item: { markRead: "既読にする", markUnread: "未読にする" },
  reader: { hint: "論文を選ぶと要約と抄録が表示されます。", read: "既読", unread: "未読", markRead: "既読にする", markUnread: "未読に戻す", bookmark: "ブックマーク", bookmarked: "ブックマーク済み", summary: "要約", abstract: "抄録", notes: "メモ", notesPlaceholder: "症例への応用、疑問点、後で調べること…", saved: "保存済み", saving: "保存中…", noSummary: "要約はまだありません。生成すると英語と韓国語で作成されます。", noAbstract: "PubMedに抄録がありません。", generate: "AI要約を生成", generating: "生成中", regenerate: "両言語で再生成", design: "デザイン", evidence: "エビデンス", relevance: "小動物外科への応用", original: "原文", both: "並列", missingKo: "韓国語要約は未生成です。", missingEn: "英語要約は未生成です。", noAbstractTitle: "PubMedに抄録がありません。", back: "一覧" },
  species: { vet: "獣医", human: "医学" },
  auth: { title: "Vet Stacks", blurb: "毎朝PubMedから集めた臨床論文を読み、メモし、エクスポートする場所。新規アカウントは管理者が承認します。", google: "Googleで続行", redirecting: "移動中…", or: "またはメールで", email: "メール", password: "パスワード", signIn: "ログイン", signUp: "アカウント作成", toSignUp: "初めての方は登録", toSignIn: "アカウントをお持ちの方", busy: "処理中…", signedUp: "登録完了。確認メールのリンクを開いてからログインしてください。管理者の承認後に論文を閲覧できます。", badCreds: "メールまたはパスワードが正しくありません。", notConfirmed: "メールがまだ確認されていません。" },
  pending: { title: "承認待ち", body: "{email} のアカウントが作成されました。管理者が通常1日以内に承認します。承認後にこのページを更新してください。", blockedTitle: "利用制限", blockedBody: "管理者がこのアカウントを制限しました。", refresh: "更新", signOut: "ログアウト" },
  settings: { title: "設定", admin: "管理者", language: "言語", languageHint: "画面の言語。要約は英語と韓国語で生成され、既定の要約タブはこの設定に従います。", approvals: "アカウント承認", noPending: "承認待ちはありません。", approve: "承認", block: "ブロック", allUsers: "全ユーザー ({n})", approved: "承認済み", blocked: "ブロック済み", makeAdmin: "管理者にする", removeAdmin: "管理者を解除", feedbackInbox: "受信したフィードバック ({n})", name: "表示名", reading: "閲覧", autoRead: "開いた論文を既読にする", summaryLang: "要約の言語", ko: "韓国語", en: "英語", both: "両方", digest: "おすすめメール", daily: "毎朝", weekly: "週1回", off: "オフ", weekdays: ["月", "火", "水", "木", "金", "土", "日"], keywordPlaceholder: "キーワードを入力してEnter", add: "追加", save: "保存", saved: "保存しました", signOut: "ログアウト" },
  feedback: { title: "フィードバック", kind: "種類", message: "内容", anon: "匿名で送る", send: "送信", sendAnon: "匿名で送信", sent: "送信しました。" },
  cat: { "Orthopedics": "整形外科", "Neurosurgery": "脳神経外科", "Soft tissue surgery": "軟部外科", "Biomechanics & implants": "生体力学・インプラント", "Imaging & planning": "画像・手術計画", "Anesthesia & pain": "麻酔・疼痛", "Oncology": "腫瘍", "Internal medicine": "内科", "Complications & outcomes": "合併症・予後", "Other": "その他" },
};

const de = {
  banner: { title: "Ankündigung", dismiss: "Verstanden" },
  comments: { title: "Diskussion", empty: "Noch keine Kommentare.", placeholder: "Gedanken mit dem Team teilen…", hint: "⌘/Strg + Enter zum Senden", post: "Senden", edit: "Bearbeiten", delete: "Löschen", save: "Speichern", cancel: "Abbrechen", edited: "bearbeitet", confirmDelete: "Kommentar löschen?", you: "Du", member: "Mitglied" },
  tagline: "Täglich kuratierte veterinär- und humanmedizinische Literatur",
  nav: { feed: "Artikel", recs: "Für dich", bookmarks: "Lesezeichen", history: "Verlauf", about: "So funktioniert es", feedback: "Feedback", settings: "Einstellungen" },
  search: "Titel, Abstracts, Zusammenfassungen durchsuchen…",
  view: { label: "Gruppieren", category: "Fachgebiet", journal: "Journal", latest: "Neueste" },
  filter: { species: "Bereich", vet: "Veterinär", human: "Human", period: "Veröffentlicht in", all: "Gesamt", days: "{n} T.", years: "{n} J.", state: "Status", unread: "Ungelesen", read: "Gelesen", bookmarked: "Lesezeichen", noted: "Mit Notiz", ai: "KI-Zusammenfassung", categories: "Fachgebiete", journals: "Journals", reset: "Filter zurücksetzen", selected: "{n} ausgewählt", afterCollect: "Erscheint nach der ersten Sammlung" },
  list: { feed: "Alle Artikel", recs: "Empfohlen", bookmarks: "Lesezeichen", history: "Zuletzt geöffnet", unread: "{n} ungelesen", updated: "Aktualisiert {t}", loading: "Laden", more: "Mehr laden", emptyFeed: "Keine passenden Artikel", emptyFeedHint: "Filter entfernen oder Zeitraum erweitern.", emptyRecs: "Noch keine Empfehlungen", emptyRecsHint: "Öffne einige Artikel, setze Lesezeichen oder suche – Empfehlungen kommen nach der nächsten morgendlichen Sammlung.", emptyBookmarks: "Keine Lesezeichen", emptyHistory: "Noch nichts geöffnet", emptyHint: "Geöffnete Artikel erscheinen hier." },
  item: { markRead: "Als gelesen markieren", markUnread: "Als ungelesen markieren" },
  reader: { hint: "Artikel auswählen, um Zusammenfassung und Abstract zu lesen.", read: "Gelesen", unread: "Ungelesen", markRead: "Als gelesen markieren", markUnread: "Ungelesen", bookmark: "Lesezeichen", bookmarked: "Gemerkt", summary: "Zusammenfassung", abstract: "Abstract", notes: "Meine Notizen", notesPlaceholder: "Anwendung auf einen Fall, Zweifel, später nachschlagen…", saved: "Gespeichert", saving: "Speichern…", noSummary: "Noch keine Zusammenfassung. Sie wird auf Englisch und Koreanisch erstellt.", noAbstract: "Kein Abstract auf PubMed.", generate: "Zusammenfassung erstellen", generating: "Erstellen", regenerate: "Beide Sprachen neu erstellen", design: "Design", evidence: "Evidenz", relevance: "Relevanz für die Kleintierchirurgie", original: "Original", both: "Nebeneinander", missingKo: "Koreanische Zusammenfassung fehlt.", missingEn: "Englische Zusammenfassung fehlt.", noAbstractTitle: "Kein Abstract auf PubMed.", back: "Zurück" },
  species: { vet: "Veterinär", human: "Human" },
  auth: { title: "Vet Stacks", blurb: "Klinische Literatur lesen, kommentieren und exportieren – jeden Morgen aus PubMed gesammelt. Neue Konten werden vom Administrator freigegeben.", google: "Mit Google fortfahren", redirecting: "Weiterleitung…", or: "oder per E-Mail", email: "E-Mail", password: "Passwort", signIn: "Anmelden", signUp: "Konto erstellen", toSignUp: "Neu hier? Registrieren", toSignIn: "Schon ein Konto? Anmelden", busy: "Bitte warten…", signedUp: "Konto erstellt. Bestätige deine E-Mail und melde dich an. Nach Freigabe durch den Administrator kannst du Artikel lesen.", badCreds: "E-Mail oder Passwort falsch.", notConfirmed: "E-Mail noch nicht bestätigt." },
  pending: { title: "Freigabe ausstehend", body: "Dein Konto ({email}) wurde erstellt. Der Administrator prüft es meist innerhalb eines Tages. Danach Seite neu laden.", blockedTitle: "Zugriff eingeschränkt", blockedBody: "Der Administrator hat dieses Konto eingeschränkt.", refresh: "Neu laden", signOut: "Abmelden" },
  settings: { title: "Einstellungen", admin: "Administrator", language: "Sprache", languageHint: "Sprache der Oberfläche. Zusammenfassungen werden auf Englisch und Koreanisch erstellt.", approvals: "Kontofreigaben", noPending: "Keine offenen Anfragen.", approve: "Freigeben", block: "Sperren", allUsers: "Alle Nutzer ({n})", approved: "Freigegeben", blocked: "Gesperrt", makeAdmin: "Zum Admin machen", removeAdmin: "Admin entfernen", feedbackInbox: "Feedback ({n})", name: "Anzeigename", reading: "Lesen", autoRead: "Beim Öffnen als gelesen markieren", summaryLang: "Sprache der Zusammenfassung", ko: "Koreanisch", en: "Englisch", both: "Beide", digest: "Empfehlungs-E-Mails", daily: "Jeden Morgen", weekly: "Wöchentlich", off: "Aus", weekdays: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"], keywordPlaceholder: "Stichwort eingeben und Enter", add: "Hinzufügen", save: "Speichern", saved: "Gespeichert", signOut: "Abmelden" },
  feedback: { title: "Feedback", kind: "Art", message: "Nachricht", anon: "Anonym senden", send: "Senden", sendAnon: "Anonym senden", sent: "Danke – gesendet." },
  cat: { "Orthopedics": "Orthopädie", "Neurosurgery": "Neurochirurgie", "Soft tissue surgery": "Weichteilchirurgie", "Biomechanics & implants": "Biomechanik & Implantate", "Imaging & planning": "Bildgebung & Planung", "Anesthesia & pain": "Anästhesie & Schmerz", "Oncology": "Onkologie", "Internal medicine": "Innere Medizin", "Complications & outcomes": "Komplikationen & Outcomes", "Other": "Sonstige" },
};

const es = {
  banner: { title: "Aviso", dismiss: "Entendido" },
  comments: { title: "Discusión", empty: "Aún no hay comentarios.", placeholder: "Comparte una idea con el equipo…", hint: "⌘/Ctrl + Enter para publicar", post: "Publicar", edit: "Editar", delete: "Eliminar", save: "Guardar", cancel: "Cancelar", edited: "editado", confirmDelete: "¿Eliminar este comentario?", you: "Tú", member: "Miembro" },
  tagline: "Literatura clínica veterinaria y humana, curada cada mañana",
  nav: { feed: "Artículos", recs: "Para ti", bookmarks: "Guardados", history: "Historial", about: "Cómo funciona", feedback: "Comentarios", settings: "Ajustes" },
  search: "Buscar títulos, resúmenes, abstracts…",
  view: { label: "Agrupar por", category: "Campo", journal: "Revista", latest: "Recientes" },
  filter: { species: "Ámbito", vet: "Veterinaria", human: "Humana", period: "Publicado en", all: "Todo", days: "{n} d", years: "{n} a", state: "Estado", unread: "Sin leer", read: "Leído", bookmarked: "Guardado", noted: "Con notas", ai: "Resumen IA", categories: "Campos", journals: "Revistas", reset: "Quitar filtros", selected: "{n} seleccionados", afterCollect: "Aparece tras la primera recolección" },
  list: { feed: "Todos los artículos", recs: "Recomendados", bookmarks: "Guardados", history: "Abiertos recientemente", unread: "{n} sin leer", updated: "Actualizado {t}", loading: "Cargando", more: "Cargar más", emptyFeed: "Ningún artículo coincide", emptyFeedHint: "Quita algún filtro o amplía el periodo.", emptyRecs: "Aún no hay recomendaciones", emptyRecsHint: "Abre algunos artículos, guarda o busca — las recomendaciones llegan tras la próxima recolección matinal.", emptyBookmarks: "Nada guardado", emptyHistory: "Nada abierto todavía", emptyHint: "Los artículos que abras aparecerán aquí." },
  item: { markRead: "Marcar como leído", markUnread: "Marcar como no leído" },
  reader: { hint: "Selecciona un artículo para leer su resumen y abstract.", read: "Leído", unread: "Sin leer", markRead: "Marcar leído", markUnread: "No leído", bookmark: "Guardar", bookmarked: "Guardado", summary: "Resumen", abstract: "Abstract", notes: "Mis notas", notesPlaceholder: "Cómo aplicarlo a un caso, dudas, cosas que buscar…", saved: "Guardado", saving: "Guardando…", noSummary: "Sin resumen aún. Se generará en inglés y coreano.", noAbstract: "Sin abstract en PubMed.", generate: "Generar resumen", generating: "Generando", regenerate: "Regenerar ambos idiomas", design: "Diseño", evidence: "Evidencia", relevance: "Relevancia para cirugía de pequeños animales", original: "Original", both: "Ambos", missingKo: "Resumen en coreano no generado.", missingEn: "Resumen en inglés no generado.", noAbstractTitle: "Sin abstract en PubMed.", back: "Volver" },
  species: { vet: "Veterinaria", human: "Humana" },
  auth: { title: "Vet Stacks", blurb: "Lee, anota y exporta la literatura clínica que te importa, recopilada cada mañana desde PubMed. Las cuentas nuevas las aprueba el administrador.", google: "Continuar con Google", redirecting: "Redirigiendo…", or: "o con email", email: "Email", password: "Contraseña", signIn: "Entrar", signUp: "Crear cuenta", toSignUp: "¿Nuevo? Regístrate", toSignIn: "¿Ya tienes cuenta? Entra", busy: "Procesando…", signedUp: "Cuenta creada. Confirma tu email e inicia sesión. Podrás leer cuando el administrador apruebe tu cuenta.", badCreds: "Email o contraseña incorrectos.", notConfirmed: "Email aún no confirmado." },
  pending: { title: "Pendiente de aprobación", body: "Tu cuenta ({email}) se ha creado. El administrador la revisará, normalmente en un día. Recarga la página cuando esté aprobada.", blockedTitle: "Acceso restringido", blockedBody: "El administrador ha restringido esta cuenta.", refresh: "Recargar", signOut: "Salir" },
  settings: { title: "Ajustes", admin: "Administrador", language: "Idioma", languageHint: "Idioma de la interfaz. Los resúmenes se generan en inglés y coreano.", approvals: "Aprobación de cuentas", noPending: "Sin solicitudes pendientes.", approve: "Aprobar", block: "Bloquear", allUsers: "Todos los usuarios ({n})", approved: "Aprobado", blocked: "Bloqueado", makeAdmin: "Hacer admin", removeAdmin: "Quitar admin", feedbackInbox: "Comentarios recibidos ({n})", name: "Nombre", reading: "Lectura", autoRead: "Marcar como leído al abrir", summaryLang: "Idioma del resumen", ko: "Coreano", en: "Inglés", both: "Ambos", digest: "Emails de recomendación", daily: "Cada mañana", weekly: "Semanal", off: "Desactivado", weekdays: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"], keywordPlaceholder: "Escribe una palabra clave y pulsa Enter", add: "Añadir", save: "Guardar", saved: "Guardado", signOut: "Salir" },
  feedback: { title: "Comentarios", kind: "Tipo", message: "Mensaje", anon: "Enviar de forma anónima", send: "Enviar", sendAnon: "Enviar anónimo", sent: "Gracias — enviado." },
  cat: { "Orthopedics": "Ortopedia", "Neurosurgery": "Neurocirugía", "Soft tissue surgery": "Cirugía de tejidos blandos", "Biomechanics & implants": "Biomecánica e implantes", "Imaging & planning": "Imagen y planificación", "Anesthesia & pain": "Anestesia y dolor", "Oncology": "Oncología", "Internal medicine": "Medicina interna", "Complications & outcomes": "Complicaciones y resultados", "Other": "Otros" },
};

export const DICTS = { en, ko, ja, de, es };

function lookup(dict, path) {
  return path.split(".").reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), dict);
}

export function makeT(lang) {
  const d = DICTS[lang] || en;
  return (path, vars) => {
    let v = lookup(d, path);
    if (v === undefined) v = lookup(en, path);
    if (v === undefined) return path.split(".").pop();
    if (typeof v === "string" && vars) v = v.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ""));
    return v;
  };
}

export function detectLang() {
  const saved = localStorage.getItem("ui_lang");
  if (saved && DICTS[saved]) return saved;
  const nav = (navigator.language || "en").slice(0, 2).toLowerCase();
  return DICTS[nav] ? nav : "en";
}

export const I18nContext = createContext({ lang: "en", t: makeT("en"), setLang: () => {} });
export const useT = () => useContext(I18nContext);

export function fmtDate(iso, lang) {
  if (!iso) return "";
  try { return new Date(iso.length === 10 ? iso + "T00:00:00" : iso).toLocaleDateString(lang === "en" ? "en-GB" : lang, { year: "numeric", month: "short", day: "numeric" }); }
  catch { return iso.slice(0, 10); }
}
export function fmtDateTime(iso, lang) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleString(lang === "en" ? "en-GB" : lang, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return iso; }
}
