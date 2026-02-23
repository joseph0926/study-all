# Troubleshooting

자주 발생하는 문제와 즉시 점검 명령.

## 1) `~/.claude` 동기화가 안 됨

증상:
- `sync-claude-home.sh`에서 충돌/skip 메시지 발생

확인:

```bash
bash scripts/sync-claude-home.sh --dry-run
```

해결:
- 기존 개인 파일과 충돌하면 기본 동작은 skip이다.
- 필요한 경우 충돌 파일을 백업한 뒤 재실행한다.
- managed 파일 정리가 필요하면 `--prune-managed --apply`를 사용한다.

## 2) Git hook 자동 동기화가 안 됨

확인:

```bash
git config --get core.hooksPath
ls -la .githooks
```

해결:

```bash
bash scripts/setup-githooks.sh
```

추가:
- 일시적으로 비활성화: `export STUDY_ALL_SYNC_DISABLE=1`

## 3) MCP 관련 에러가 발생

확인:

```bash
/Users/younghoonkim/Library/pnpm/pnpm -C mcp typecheck
/Users/younghoonkim/Library/pnpm/pnpm -C mcp test
```

해결 포인트:
- `STUDY_ROOT` 환경변수
- `.mcp.json` 서버 등록 값
- 툴 호출 인자(`mode`, `skill`, `topic`) 누락 여부

## 4) command/skill 동작이 혼동됨

원칙:
- 기본은 skills-first (`/learn`, `/review`, `/study-skill` ...)
- `.claude/commands/legacy-*.md`는 호환용

권장:
- 신규 워크플로우에서는 `legacy-*` 호출을 사용하지 않는다.

## 5) 문서 정합성 체크 warning

확인:

```bash
bash scripts/check-docs.sh
```

메모:
- warning은 커밋 차단 사유가 아닐 수 있지만, 누적되면 운영 신뢰도가 떨어진다.
