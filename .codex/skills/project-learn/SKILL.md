---
name: project-learn
description: 프로젝트 토픽 학습 세션을 진행하고 재개점/기록/체크를 project MCP로 동기화한다. Codex에서는 `$project-learn <project-path> <topic>`으로 호출한다.
---

# project-learn

입력: `$project-learn <project-path> <topic>`

실행 순서:
1. `mcp__study__context_resolve(mode=project)`
2. `mcp__study__session_getResumePoint`
3. `mcp__study__session_getSourcePaths`
4. `mcp__study__progress_getPlan`
5. 설명/Q&A 진행
6. "정리" 또는 "끝" 시
- `mcp__study__session_appendLog`
- 필요 시 `mcp__study__progress_updateCheckbox`

설명 규칙:
- "현재 구현"과 "일반 관례/베스트 프랙티스"를 분리해서 설명한다.
- 코드에 안티패턴, 버그 가능성, 개선점이 보이면 적극 제안한다.
- 개선 제안에는 반드시 근거를 포함한다 (공식 문서 또는 논리적 역추론).
- 근거 예시: 공식 문서 권장 패턴, 성능 영향, 보안 취약점, 유지보수성.

금지:
- 프로젝트 소스 파일 직접 수정 금지
- 상태 계산/체크 갱신은 MCP로만 수행
- `mcp__study__session_appendLog` 기록을 요약/축약하지 않는다. Q&A 원문을 그대로 남긴다 (오타만 수정).
