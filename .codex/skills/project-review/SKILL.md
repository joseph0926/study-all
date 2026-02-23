---
name: project-review
description: 프로젝트 복습 대기열을 기준으로 1문제씩 출제하고 결과를 project MCP에 기록한다. Codex에서는 `$project-review <project-path> [topic]`으로 호출한다.
---

# project-review

입력: `$project-review <project-path> [topic]`

실행 순서:
1. `mcp__study__context.resolve(mode=project)`
2. `mcp__study__review.getQueue`
3. topic 지정 시 `mcp__study__review.getMeta`
4. 문제별 채점 후 `mcp__study__review.recordResult`
5. "정리" 시 `mcp__study__review.saveMeta`

점수 매핑:
- 오답: `wrong`
- 힌트 후 통과: `retry_pass`
- 첫 시도 통과: `first_pass`

규칙:
- `.study/*-meta.md` 수동 파싱 계산 금지
