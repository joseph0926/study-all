# Docs Rules

## 기록 파일
- 스킬 모드: `docs/{skill}/plan.md`, `docs/{skill}/{Topic-Name}.md`, `docs/{skill}/{Topic-Name}-meta.md`
- 프로젝트 모드: `{project}/.study/` 하위 동일 규칙
- 마스터 플랜: `docs/master-plan.md`

## 변경 규칙
- 세션 로그 append는 MCP `session.appendLog`를 우선 사용한다.
- 체크박스/진행 상태 반영은 MCP `progress.updateCheckbox`를 우선 사용한다.
- 문서 포맷 변경은 명시 요청 없으면 수행하지 않는다.

## 검증 규칙
- 정적 검증: `bash scripts/check-docs.sh`
- 타입/테스트: `/Users/younghoonkim/Library/pnpm/pnpm -C mcp typecheck`, `/Users/younghoonkim/Library/pnpm/pnpm -C mcp test`
