---
description: "다음 학습 추천 — MCP 우선순위 기반"
---

# /next — 다음 뭐 하지?

## 목적
- 오늘의 학습 우선순위 1~3개를 추천한다.
- 추천 근거는 MCP 데이터로 제한한다.

## MCP Execution Mode (필수)
1. `stats.getRecommendation`
```json
{
  "context": {
    "mode": "skill",
    "skill": "react"
  }
}
```
2. 보강 데이터가 필요하면 아래를 추가 호출
- `review.getQueue`
- `progress.getNextTopic`

## 출력 규칙
- 추천 3개를 우선순위 순서로 제시한다.
- 각 추천에 반드시 포함:
- 추천 타입(`review`/`continue`/`new-topic`)
- skill/topic
- reason
- 즉시 실행 커맨드 예시 (`/review ...`, `/learn ...`)

## 금지
- `docs/`, `*-meta.md`, `plan.md` 수동 파싱 금지
- 날짜 산술/우선순위 계산을 프롬프트에서 재구현 금지

## 오류 처리
- 추천 도구 실패 시 `review.getQueue` 기반으로 임시 1개만 제시하고, 실패 사실을 명시한다.
