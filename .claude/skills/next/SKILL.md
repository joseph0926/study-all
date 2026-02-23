---
name: next
description: study MCP 추천 데이터로 오늘의 학습 우선순위 1~3개를 제시한다.
allowed-tools: mcp__study__stats.getRecommendation, mcp__study__review.getQueue, mcp__study__progress.getNextTopic
---

`/next` 실행 규칙:

1. `stats.getRecommendation`을 먼저 호출한다.
2. 근거 보강이 필요하면 `review.getQueue`, `progress.getNextTopic`을 호출한다.
3. 우선순위 1~3개를 제시하고 각 항목에 다음을 포함한다.
- 타입(`review`/`continue`/`new-topic`)
- skill/topic
- reason
- 즉시 실행 예시(`/review ...` 또는 `/learn ...`)

금지:
- `docs/`, `plan.md`, `*-meta.md` 수동 파싱 금지
- 우선순위 계산 재구현 금지
