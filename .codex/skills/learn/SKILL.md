---
name: learn
description: 스킬 토픽 학습 세션을 진행하고 재개점/기록/체크박스를 study MCP로 동기화한다. Codex에서는 `$learn <skill-name> <topic>`로 호출한다.
---

# learn

입력: `$learn <skill> <topic>`

실행 순서:
1. `mcp__study__context.resolve(mode=skill)`
2. `mcp__study__session.getResumePoint`
3. `mcp__study__session.getSourcePaths`
4. `mcp__study__progress.getPlan`
5. 설명/Q&A 진행 (소스 근거 포함)
6. 사용자가 "정리" 또는 "끝"을 말하면
- `mcp__study__session.appendLog`
- 완료 step이 있으면 `mcp__study__progress.updateCheckbox`

규칙:
- 재개점 계산과 체크박스 갱신은 반드시 MCP로 수행
- 파일 직접 파싱으로 상태 계산하지 않음
