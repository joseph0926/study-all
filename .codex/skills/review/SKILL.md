---
name: review
description: 학습 기록 기반 적응형 복습 세션을 수행한다. Codex에서 `$review <skill-name> [topic]` 형태의 호출(또는 동등한 요청)을 받았을 때 사용한다.
---

# review

이 스킬은 `~/.claude/commands/review.md`의 절차를 Codex에서 동일하게 수행하기 위한 브리지다.

## Invocation

- 기본 호출: `$review <skill-name> [topic]`
- 인자가 부족하면 원본 명세의 질문 흐름대로 사용자에게 확인한다.

## Source Of Truth

- `~/.claude/commands/review.md`

## Execution Rules

1. 실행 시작 시 항상 `~/.claude/commands/review.md`를 먼저 읽고, Phase/체크리스트를 그대로 따른다.
2. 원본의 슬래시 커맨드 표기(예: `/learn`, `/review`)는 Codex 호출 표기(예: `$learn`, `$review`)로 해석한다.
3. 원본의 `$ARGUMENTS`는 사용자가 `$review` 뒤에 입력한 문자열 전체로 해석한다.
4. 원본의 `AskUserQuestion` 지시는 Codex 대화에서 간결한 확인 질문으로 대체한다.
5. 스킬 경로는 아래 우선순위로 탐색한다.
   - `~/.codex/skills`
   - `<repo>/.codex/skills`
6. 파일 생성/수정 범위와 안전 원칙(근거 기반 설명, 최소 변경, 세션 재개 규칙, 정합성 체크)은 원본 명세를 그대로 유지한다.
7. 원본 명세와 레포의 `AGENTS.md`가 충돌하면 `AGENTS.md`를 우선한다.
