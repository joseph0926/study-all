---
name: project-learn
description: 프로젝트 토픽 학습 세션을 진행하고 재개점/기록/체크를 project MCP로 동기화한다. Codex에서는 `$project-learn <project-path> <topic>`으로 호출한다.
---

# project-learn

입력: `$project-learn <project-path> <topic>`

실행 순서:
1. `mcp__study__context.resolve(mode=project)`
2. `mcp__study__session.getResumePoint`
3. `mcp__study__session.getSourcePaths`
4. `mcp__study__progress.getPlan`
5. 설명/Q&A 진행
6. "정리" 또는 "끝" 시
- `mcp__study__session.appendLog`
- 필요 시 `mcp__study__progress.updateCheckbox`

규칙:
- 프로젝트 소스 파일 직접 수정 금지
- 상태 계산/체크 갱신은 MCP로만 수행
