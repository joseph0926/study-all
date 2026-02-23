---
description: "일일 공부 관리 — daily MCP 상태머신 기반"
---

# /study — 일일 공부 컨트롤 타워

## 목적
- 일일 계획/수행/마감 상태를 MCP로 관리한다.

## 입력
- `$ARGUMENTS`: `help | plan <내용> | done <내용> | log | (없음)`

## MCP Execution Mode (필수)
- 공통 context:
```json
{
  "mode": "skill",
  "skill": "study"
}
```
- 상태 조회: `daily.getStatus`
- 계획 저장: `daily.logPlan`
- 수행 기록: `daily.logDone`
- 마감: `daily.finalize`
- 추천 보강(선택): `stats.getRecommendation`

## 서브커맨드 동작
- `help`: 사용법 출력
- 인자 없음: 오늘 상태 요약 + 다음 액션
- `plan <내용>`: `daily.logPlan`
- `done <내용>`: `daily.logDone`
- `log`: `daily.finalize`

## 출력 규칙
- 상태는 `todayState`, `streak`, `achievementRate7d`를 기준으로 설명한다.
- 날짜 계산/연속일수 계산을 프롬프트에서 수행하지 않는다.
