---
name: study
description: 일일 학습 상태(계획/수행/마감)를 daily MCP 상태머신으로 관리한다.
argument-hint: "[help|plan <text>|done <text>|log]"
disable-model-invocation: true
allowed-tools: mcp__study__daily.getStatus, mcp__study__daily.logPlan, mcp__study__daily.logDone, mcp__study__daily.finalize, mcp__study__stats.getRecommendation
---

입력: `$ARGUMENTS`

서브커맨드:
- `help`: 사용법 출력
- 인자 없음: `daily.getStatus`로 오늘 상태/다음 액션 출력
- `plan <내용>`: `daily.logPlan`
- `done <내용>`: `daily.logDone`
- `log`: `daily.finalize`

규칙:
- 상태 전이/연속일수/달성률 계산은 MCP 결과를 사용한다.
- 날짜 산술을 프롬프트에서 재구현하지 않는다.
