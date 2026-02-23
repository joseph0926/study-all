---
name: review
description: 복습 대기열을 기준으로 1문제씩 출제하고 결과를 study MCP에 기록한다.
argument-hint: "<skill-name> [topic]"
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, WebSearch, WebFetch, mcp__study__context_resolve, mcp__study__review_getQueue, mcp__study__review_getMeta, mcp__study__review_recordResult, mcp__study__review_saveMeta
---

입력: `$ARGUMENTS` (`<skill> [topic]`)

실행 순서:
1. `context.resolve(mode=skill)`
2. `review.getQueue`
3. topic 지정 시 `review.getMeta`
4. 문제별 채점 후 `review.recordResult`
5. 사용자가 "정리"를 말하면 `review.saveMeta`

점수 매핑:
- 오답: `wrong`
- 힌트 후 통과: `retry_pass`
- 첫 시도 통과: `first_pass`

규칙:
- 간격/레벨 계산을 프롬프트에서 재구현하지 않는다.
