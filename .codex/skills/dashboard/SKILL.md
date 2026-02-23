---
name: dashboard
description: 학습 대시보드 수치(진행률/최근활동/복습대기)를 study MCP에서 조회해 요약한다. Codex에서는 `$dashboard`로 호출한다.
---

# dashboard

입력: 없음 (`$dashboard`)

실행 순서:
1. `mcp__study__stats.getDashboard` 호출
2. 실패 시 `mcp__study__config.get`로 경로 정보를 확인하고 에러를 짧게 보고
3. 결과를 아래 섹션으로 출력
- 요약: 스킬 수, total review pending, streak
- 스킬별 표: name, progressRate, coverageRate, reviewPending, lastActivity
- 최근 세션: 최근 날짜 순 상위 5개

규칙:
- MCP 응답을 단일 진실 원천으로 사용한다.
- `docs/` 직접 스캔/집계는 하지 않는다.
