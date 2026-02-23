---
name: plan
description: 스킬별 plan 데이터를 MCP로 수집해 docs/master-plan.md를 생성/갱신한다. Codex에서는 `$plan [goal]`로 호출한다.
---

# plan

입력: `$plan [goal]`

실행 순서:
1. `mcp__study__config_get`로 `docsDir` 확인
2. `docs/*/plan.md` 목록을 찾고 각 스킬별로 `mcp__study__progress_getPlan` 호출
3. `docs/master-plan.md`만 생성/수정

출력/저장 규칙:
- 사실 데이터(토픽 수, 진행률, phase)는 MCP 결과만 사용
- 개별 `docs/{skill}/plan.md`는 수정하지 않음
- 최소 섹션: 목표/범위, 스킬별 현황, 2주 액션 플랜, 리스크
