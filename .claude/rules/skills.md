# Skills Rules

## 기본 인터페이스
- `/dashboard`, `/next`, `/plan`, `/study`
- `/learn <skill> <topic>`
- `/study-skill <skill>`
- `/review <skill> [topic]`
- `/project-study <path>`
- `/project-learn <path> <topic>`
- `/project-review <path> [topic]`

## 실행 규칙
- 각 skill의 `allowed-tools` 범위를 넘어서는 도구 호출을 추가하지 않는다.
- 쓰기형 skill(`learn`, `review`, `study`, `plan`, `study-skill`, project 계열)은 `disable-model-invocation: true`를 유지한다.
- 읽기형 skill(`dashboard`, `next`)은 집계/추천을 MCP 결과로만 출력한다.

## 레거시 호환
- `.claude/commands/legacy-*.md`는 과거 워크플로우 호환용이다.
- 신규 안내/문서/검증 기준은 skills-first를 따른다.
