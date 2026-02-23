---
name: project-review
description: 프로젝트 복습 대기열을 기준으로 1문제씩 출제하고 결과를 project MCP에 기록한다.
argument-hint: "<project-path> [topic]"
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, WebSearch, WebFetch, mcp__study__context_resolve, mcp__study__review_getQueue, mcp__study__review_getMeta, mcp__study__review_recordResult, mcp__study__review_saveMeta, mcp__study__review_appendQnA
---

입력: `$ARGUMENTS` (`<project-path> [topic]`)

실행 순서:
1. `context.resolve(mode=project)`
2. `review.getQueue`
3. topic 지정 시 `review.getMeta`
4. 문제별 채점 후 `review.recordResult`
5. "정리" 시 `review.saveMeta` + `review.appendQnA`(세션 QnA 기록)

점수 매핑:
- 오답: `wrong`
- 힌트 후 통과: `retry_pass`
- 첫 시도 통과: `first_pass`

출제 규칙:
- 이해도 확인 문제 외에 "이 코드의 개선점은?" 유형도 출제한다.
- 피드백 시 현재 구현의 한계와 대안을 근거와 함께 설명한다.
- 근거가 필요하면 WebSearch로 공식 문서/관례를 확인한다.

금지:
- `.study/*-meta.md` 수동 파싱 계산 금지
