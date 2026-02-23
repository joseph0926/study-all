---
name: project-review
description: 프로젝트 복습 대기열을 기준으로 1문제씩 출제하고 결과를 project MCP에 기록한다.
argument-hint: "<project-path> [topic]"
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, mcp__study__context.resolve, mcp__study__review.getQueue, mcp__study__review.getMeta, mcp__study__review.recordResult, mcp__study__review.saveMeta
---

입력: `$ARGUMENTS` (`<project-path> [topic]`)

실행 순서:
1. `context.resolve(mode=project)`
2. `review.getQueue`
3. topic 지정 시 `review.getMeta`
4. 문제별 채점 후 `review.recordResult`
5. "정리" 시 `review.saveMeta`

점수 매핑:
- 오답: `wrong`
- 힌트 후 통과: `retry_pass`
- 첫 시도 통과: `first_pass`

규칙:
- `.study/*-meta.md` 수동 파싱 계산 금지
