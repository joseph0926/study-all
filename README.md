# study-all

Claude Code/Codex 기반 학습 저장소입니다.

- Claude 기본 인터페이스: `.claude/skills/*/SKILL.md`
- Codex 기본 인터페이스: `.codex/skills/*/SKILL.md`
- Source of Truth: 이 레포의 `.claude`, `.codex`

## 1) 빠른 시작

```bash
cd /Users/younghoonkim/dev/personal/@skills/study-all

# 홈 디렉토리 동기화 (권장)
bash scripts/sync-claude-home.sh --dry-run
bash scripts/sync-claude-home.sh --apply
bash scripts/sync-codex-home.sh --dry-run
bash scripts/sync-codex-home.sh --apply

# Git hook 자동화
bash scripts/setup-githooks.sh
```

실행 가이드는 `/Users/younghoonkim/dev/personal/@skills/study-all/docs/guide/Quickstart.md` 참고.

## 2) 명령 매핑 (`/` ↔ `$`)

| 기능 | Claude | Codex |
| --- | --- | --- |
| 대시보드 | `/dashboard` | `$dashboard` |
| 다음 추천 | `/next` | `$next` |
| 마스터 플랜 | `/plan [goal]` | `$plan [goal]` |
| 학습 세션 | `/learn <skill> <topic>` | `$learn <skill> <topic>` |
| 스킬 검증 | `/study-skill <skill>` | `$study-skill <skill>` |
| 복습 세션 | `/review <skill> [topic]` | `$review <skill> [topic]` |
| 일일 상태 | `/study [args]` | `$study [args]` |
| 프로젝트 플랜 | `/project-study <path>` | `$project-study <path>` |
| 프로젝트 학습 | `/project-learn <path> <topic>` | `$project-learn <path> <topic>` |
| 프로젝트 복습 | `/project-review <path> [topic]` | `$project-review <path> [topic]` |

## 3) 사용자 가이드

- Quickstart: `/Users/younghoonkim/dev/personal/@skills/study-all/docs/guide/Quickstart.md`
- Daily Workflow: `/Users/younghoonkim/dev/personal/@skills/study-all/docs/guide/Daily-Workflow.md`
- Troubleshooting: `/Users/younghoonkim/dev/personal/@skills/study-all/docs/guide/Troubleshooting.md`

## 4) 홈 디렉토리 동기화 자동화

### 4-1) Claude (`~/.claude`)

```bash
bash scripts/sync-claude-home.sh --dry-run
bash scripts/sync-claude-home.sh --apply
bash scripts/sync-claude-home.sh --apply --prune-managed
```

- 대상: `.claude/skills`, `.claude/commands/legacy-*`, `.claude/rules`
- manifest: `~/.claude/.study-all-sync-manifest`

### 4-2) Codex (`~/.codex`)

```bash
bash scripts/sync-codex-home.sh --dry-run
bash scripts/sync-codex-home.sh --apply
bash scripts/sync-codex-home.sh --apply --prune-managed
```

- 대상: `.codex/skills`
- manifest: `~/.codex/.study-all-sync-manifest`

안전 기본값:
- unmanaged 기존 파일은 덮어쓰지 않고 skip
- sync 스크립트는 기본이 dry-run

## 5) Git hook 자동 동기화

```bash
bash scripts/setup-githooks.sh
```

- 설정: `core.hooksPath=.githooks`
- 트리거: `post-checkout`, `post-merge`
- `.claude`/`.codex` 변경 감지 시 각각 sync apply 실행
- 임시 비활성화: `export STUDY_ALL_SYNC_DISABLE=1`

## 6) Legacy Commands (Claude 호환용)

동명이인 충돌을 피하기 위해 Claude command는 `legacy-*`만 유지합니다.

- `/legacy-dashboard`, `/legacy-next`, `/legacy-plan`
- `/legacy-learn`, `/legacy-study-skill`, `/legacy-review`, `/legacy-study`
- `/legacy-project-study`, `/legacy-project-learn`, `/legacy-project-review`

신규 워크플로우는 skills-first를 사용하세요.

## 7) 검증 명령

```bash
bash scripts/check-docs.sh
bash scripts/sync-codex-home.sh --dry-run
/Users/younghoonkim/Library/pnpm/pnpm -C mcp typecheck
/Users/younghoonkim/Library/pnpm/pnpm -C mcp test
```
