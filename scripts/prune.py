"""
DB 용량이 한계에 가까워지면 아무도 손대지 않은 오래된 논문부터 정리한다.
수집(fetch) 직후 실행되며, 보호 대상(북마크·메모·읽음·열람기록·댓글·추천·AI 요약)은 절대 건드리지 않는다.

1단계: 오래된 미열람 논문의 초록만 비움 (행은 남아 목록·검색·링크 유지)
2단계: 그래도 목표를 못 맞추면 그 논문들을 삭제 (필요하면 재수집으로 복구 가능)

환경변수:
  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (필수)
  PRUNE_TARGET_MB   목표 상한 (기본 420 = 무료 500MB의 84%)
  PRUNE_KEEP_DAYS   이 기간 안에 발행된 논문은 보호 (기본 365)
"""
import json, os, re, sys
import requests

SB = re.sub(r"/(rest|auth|storage)/v1/?$", "", os.environ["SUPABASE_URL"].strip()).rstrip("/")
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"].strip()
H = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}
TARGET = int(os.environ.get("PRUNE_TARGET_MB") or 420) * 1024 * 1024
KEEP_DAYS = int(os.environ.get("PRUNE_KEEP_DAYS") or 365)
BATCH = 2000


def rpc(fn, args=None):
    r = requests.post(f"{SB}/rest/v1/rpc/{fn}", headers=H, data=json.dumps(args or {}), timeout=180)
    if r.status_code >= 300:
        raise RuntimeError(f"{fn}: {r.status_code} {r.text[:200]}")
    return r.json()


def size():
    return int(rpc("db_size_bytes"))


def main():
    cur = size()
    mb = lambda b: f"{b / 1024 / 1024:.0f}MB"
    print(f"현재 용량 {mb(cur)} / 목표 {mb(TARGET)}")
    if cur <= TARGET:
        print("정리 불필요")
        return

    for stage, fn in (("초록 비우기", "prune_slim"), ("행 삭제", "prune_delete")):
        while cur > TARGET:
            n = int(rpc(fn, {"keep_days": KEEP_DAYS, "batch": BATCH}))
            if n == 0:
                print(f"[{stage}] 더 정리할 논문 없음")
                break
            cur = size()
            print(f"[{stage}] {n}편 처리 → {mb(cur)}", flush=True)
        if cur <= TARGET:
            break

    if cur > TARGET:
        print(f"경고: 목표에 도달하지 못했습니다 ({mb(cur)}). 보호 대상이 많거나 PRUNE_KEEP_DAYS가 깁니다.", file=sys.stderr)
    print(f"완료 — 최종 {mb(cur)}")


if __name__ == "__main__":
    main()
