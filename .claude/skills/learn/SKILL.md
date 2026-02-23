---
name: learn
description: 스킬 토픽 학습 세션을 진행하고 재개점/기록/체크박스를 study MCP로 동기화한다.
argument-hint: "<skill-name> <topic>"
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, WebSearch, WebFetch, mcp__study__context_resolve, mcp__study__session_getResumePoint, mcp__study__session_getSourcePaths, mcp__study__progress_getPlan, mcp__study__session_appendLog, mcp__study__progress_updateCheckbox
---

입력: `$ARGUMENTS` (`<skill> <topic>`)

실행 순서:
1. `context.resolve(mode=skill)`
2. `session.getResumePoint`
3. `session.getSourcePaths`
4. `progress.getPlan`
5. 설명/Q&A 진행 (소스 근거 포함)
6. 사용자가 "정리" 또는 "끝"을 말하면
- `session.appendLog`
- 완료 step이 있으면 `progress.updateCheckbox`

규칙:
- 재개점 계산과 체크박스 갱신은 반드시 MCP로 수행한다.
- 파일 직접 파싱으로 상태 계산하지 않는다.
