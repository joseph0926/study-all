---
name: review
description: 복습 대기열을 기준으로 1문제씩 출제하고 결과를 study MCP에 기록한다.
argument-hint: "<skill-name> [topic]"
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, WebSearch, WebFetch, mcp__study__context_resolve, mcp__study__review_getQueue, mcp__study__review_getMeta, mcp__study__review_recordResult, mcp__study__review_saveMeta, mcp__study__review_appendQnA
---

입력: `$ARGUMENTS` (`<skill> [topic]`)

실행 순서:
1. `$ARGUMENTS`에서 `<skill> [topic]` 파싱 (`skill` 필수)
2. `context.resolve(mode=skill, skill=<skill>)`
3. `review.getQueue(context={mode=skill, skill=<skill>}, skill=<skill>)`
4. topic 지정 시 `review.getMeta(context={mode=skill, skill=<skill>}, skill=<skill>, topic=<topic>)`
5. 문제별 채점 후 `review.recordResult(context={mode=skill, skill=<skill>}, skill=<skill>, topic=<topic>, concept=<concept>, score=<score>)`
6. 사용자가 "정리"를 말하면 `review.saveMeta` + `review.appendQnA` (동일 context/skill 유지)

점수 매핑:
- 오답: `wrong`
- 힌트 후 통과: `retry_pass`
- 첫 시도 통과: `first_pass`

규칙:
- 간격/레벨 계산을 프롬프트에서 재구현하지 않는다.
