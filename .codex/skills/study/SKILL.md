---
name: study
description: 일일 학습 상태(계획/수행/마감)를 daily MCP 상태머신으로 관리한다. Codex에서는 `$study [help|plan <text>|done <text>|log]`로 호출한다.
---

# study

입력: `$study [help|plan <text>|done <text>|log]`

서브커맨드:
- `help`: 사용법 출력
- 인자 없음: `mcp__study__daily_getStatus`로 오늘 상태/다음 액션 출력
- `plan <내용>`: `mcp__study__daily_logPlan`
- `done <내용>`: `mcp__study__daily_logDone`
- `log`: `mcp__study__daily_finalize`

규칙:
- 상태 전이/연속일수/달성률 계산은 MCP 결과를 사용한다.
- 날짜 산술을 프롬프트에서 재구현하지 않는다.
