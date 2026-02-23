---
name: project-learn
description: 프로젝트 토픽 학습 세션을 진행하고 재개점/기록/체크를 project MCP로 동기화한다.
argument-hint: "<project-path> <topic>"
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, mcp__study__context.resolve, mcp__study__session.getResumePoint, mcp__study__session.getSourcePaths, mcp__study__progress.getPlan, mcp__study__session.appendLog, mcp__study__progress.updateCheckbox
---

입력: `$ARGUMENTS` (`<project-path> <topic>`)

실행 순서:
1. `context.resolve(mode=project)`
2. `session.getResumePoint`
3. `session.getSourcePaths`
4. `progress.getPlan`
5. 설명/Q&A 진행
6. "정리" 또는 "끝" 시
- `session.appendLog`
- 필요 시 `progress.updateCheckbox`

규칙:
- 프로젝트 소스 파일 직접 수정 금지
- 상태 계산/체크 갱신은 MCP로만 수행
