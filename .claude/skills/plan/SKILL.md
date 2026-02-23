---
name: plan
description: 스킬별 plan 데이터를 MCP로 수집해 docs/master-plan.md를 생성/갱신한다.
argument-hint: "[goal]"
disable-model-invocation: true
allowed-tools: Read, Glob, Write, Edit, mcp__study__config.get, mcp__study__progress.getPlan
---

`/plan $ARGUMENTS` 실행 규칙:

1. `config.get`로 `docsDir`를 확인한다.
2. `docs/*/plan.md` 목록을 찾고 각 스킬별로 `progress.getPlan`을 호출한다.
3. `docs/master-plan.md`만 생성/수정한다.

출력/저장 규칙:
- 사실 데이터(토픽 수, 진행률, phase)는 MCP 결과만 사용한다.
- 개별 `docs/{skill}/plan.md`는 수정하지 않는다.
- 최소 섹션: 목표/범위, 스킬별 현황, 2주 액션 플랜, 리스크
