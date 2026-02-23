---
name: next
description: study MCP 추천 데이터로 오늘의 학습 우선순위 1~3개를 제시한다. Codex에서는 `$next`로 호출한다.
---

# next

입력: 없음 (`$next`)

실행 순서:
1. `mcp__study__stats_getRecommendation` 호출
2. 근거 보강이 필요하면 `mcp__study__review_getQueue`, `mcp__study__progress_getNextTopic` 호출
3. 우선순위 1~3개를 제시하고 각 항목에 아래를 포함
- 타입(`review`/`continue`/`new-topic`)
- skill/topic
- reason
- 즉시 실행 예시(`$review ...` 또는 `$learn ...`)

금지:
- `docs/`, `plan.md`, `*-meta.md` 수동 파싱 금지
- 우선순위 계산 재구현 금지
