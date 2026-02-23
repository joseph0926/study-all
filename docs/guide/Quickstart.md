# Quickstart

5-10분 내 첫 학습 세션까지 진행하는 최소 절차.

## 1) 준비

```bash
cd /Users/younghoonkim/dev/personal/@skills/study-all
```

선행 조건:
- Claude Code 또는 Codex 실행 가능
- 이 레포의 `.claude/skills/*`, `.codex/skills/*`가 최신 상태
- (선택) `mcp` 검증이 필요하면 `STUDY_ROOT` 환경변수 사용

## 2) 홈 동기화 (권장)

```bash
# Claude
bash scripts/sync-claude-home.sh --dry-run
bash scripts/sync-claude-home.sh --apply

# Codex
bash scripts/sync-codex-home.sh --dry-run
bash scripts/sync-codex-home.sh --apply
```

옵션:
- managed 파일 정리 포함: `--prune-managed`
- Claude rules symlink: `bash scripts/sync-claude-home.sh --apply --rules-mode symlink`

## 3) Git hook 자동화 켜기

```bash
bash scripts/setup-githooks.sh
```

설정 후 `git checkout`, `git pull`(merge) 시 `.claude`/`.codex` 변경이 감지되면 자동 동기화를 시도한다.

## 4) 첫 실행 루틴

Claude Code 세션:
1. `/dashboard`
2. `/next`
3. `/learn <skill> <topic>`
4. `/review <skill> [topic]`
5. `/study log`

Codex 세션:
1. `$dashboard`
2. `$next`
3. `$learn <skill> <topic>`
4. `$review <skill> [topic]`
5. `$study log`

## 5) 검증

```bash
bash scripts/check-docs.sh
bash scripts/sync-codex-home.sh --dry-run
/Users/younghoonkim/Library/pnpm/pnpm -C mcp typecheck
/Users/younghoonkim/Library/pnpm/pnpm -C mcp test
```

문제가 있으면 `docs/guide/Troubleshooting.md`를 먼저 확인한다.
