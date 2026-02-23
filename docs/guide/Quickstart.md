# Quickstart

5-10분 내 첫 학습 세션까지 진행하는 최소 절차.

## 1) 준비

```bash
cd /Users/younghoonkim/dev/personal/@skills/study-all
```

선행 조건:
- `Claude Code` 실행 가능
- 이 레포의 `.claude/skills/*`가 최신 상태
- (선택) `mcp` 검증이 필요하면 `STUDY_ROOT` 환경변수 사용

## 2) `~/.claude` 동기화 (권장)

```bash
# 변경 예정 확인 (기본 모드)
bash scripts/sync-claude-home.sh --dry-run

# 실제 반영
bash scripts/sync-claude-home.sh --apply
```

옵션:
- managed 파일만 정리까지 포함: `--prune-managed`
- rules를 심볼릭 링크로 연결: `--rules-mode symlink`

## 3) Git hook 자동화 켜기

```bash
bash scripts/setup-githooks.sh
```

설정 후 `git checkout`, `git pull`(merge) 시 `.claude` 변경이 감지되면 자동 동기화를 시도한다.

## 4) 첫 실행 루틴

Claude Code 세션에서 아래 순서 권장:

1. `/dashboard`
2. `/next`
3. `/learn <skill> <topic>`
4. `/review <skill> [topic]`
5. `/study log`

Codex에서는 `$learn`, `$review`, `$study-skill`, `$project-*` 형태를 사용한다.

## 5) 검증

```bash
bash scripts/check-docs.sh
/Users/younghoonkim/Library/pnpm/pnpm -C mcp typecheck
/Users/younghoonkim/Library/pnpm/pnpm -C mcp test
```

문제가 있으면 `docs/guide/Troubleshooting.md`를 먼저 확인한다.
