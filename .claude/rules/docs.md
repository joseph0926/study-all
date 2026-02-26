# Docs Rules

## 기록 파일
- 스킬 모드: `study/{skill}/{Topic-Name}.md`, `study/{skill}/{Topic-Name}-meta.md`
- 프로젝트 모드: `{project}/.study/` 하위 동일 규칙
- 프로젝트 분석 모드: `{project}/.study/plan.md` + `{project}/.study/{Area-Name}.md`
- 루틴 모드: `study/.routine/state.md`, `study/.routine/history.md`, `study/.routine/forges/{날짜}-{주제}.md`

## 변경 규칙
- 세션 로그 append는 MCP `session.appendLog`를 우선 사용한다.
- 문서 포맷 변경은 명시 요청 없으면 수행하지 않는다.

## 검증 규칙
- 정적 검증: `bash scripts/check-docs.sh`
- 타입/테스트: `pnpm -C mcp typecheck`, `pnpm -C mcp test`
