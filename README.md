# study-all

Claude Code/Codex 기반 학습 저장소입니다.

- 기본 인터페이스: `.claude/skills/*/SKILL.md`
- Source of Truth: 이 레포의 `.claude` 디렉토리
- 목표: 소스 기반 학습 기록 + 복습 루프 + 운영 자동화

## 1) 빠른 시작

```bash
cd /Users/younghoonkim/dev/personal/@skills/study-all
bash scripts/sync-claude-home.sh --dry-run
bash scripts/sync-claude-home.sh --apply
bash scripts/setup-githooks.sh
```

실행 가이드는 `/Users/younghoonkim/dev/personal/@skills/study-all/docs/guide/Quickstart.md`를 참고하세요.

## 2) Skills-First 명령

| Skill | 역할 | 주요 출력 |
| --- | --- | --- |
| `/dashboard` | 전체 학습 현황 스냅샷(읽기) | 콘솔 |
| `/next` | 오늘의 추천 1~3개(읽기) | 콘솔 |
| `/plan [goal]` | 마스터 플랜 생성/갱신 | `docs/master-plan.md` |
| `/learn <skill> <topic>` | 스킬 토픽 학습 세션 | `docs/{skill}/{Topic-Name}.md` |
| `/study-skill <skill>` | 스킬 커버리지 검증/개선 | `docs/{skill}/plan.md` |
| `/review <skill> [topic]` | 적응형 복습 세션 | `docs/{skill}/*-meta.md`, `*-quiz.md` |
| `/study [help\|plan\|done\|log]` | 일일 학습 상태머신 | `docs/study/daily/*.md` |
| `/project-study <path>` | 프로젝트 플랜 생성/운영 | `{path}/.study/plan.md` |
| `/project-learn <path> <topic>` | 프로젝트 토픽 학습 | `{path}/.study/{Topic-Name}.md` |
| `/project-review <path> [topic]` | 프로젝트 적응형 복습 | `{path}/.study/*-meta.md` |

Codex에서는 동일 의미로 `$learn`, `$study-skill`, `$review`, `$project-*`를 사용합니다.

## 3) 사용자 가이드

- Quickstart: `/Users/younghoonkim/dev/personal/@skills/study-all/docs/guide/Quickstart.md`
- Daily Workflow: `/Users/younghoonkim/dev/personal/@skills/study-all/docs/guide/Daily-Workflow.md`
- Troubleshooting: `/Users/younghoonkim/dev/personal/@skills/study-all/docs/guide/Troubleshooting.md`

## 4) `~/.claude` 동기화 자동화

레포의 `.claude`를 기준으로 `~/.claude`에 반영합니다.

```bash
# 기본: 변경 예정만 출력
bash scripts/sync-claude-home.sh --dry-run

# 실제 반영
bash scripts/sync-claude-home.sh --apply

# 이전에 관리하던 파일 중 소스에서 사라진 파일 정리까지 수행
bash scripts/sync-claude-home.sh --apply --prune-managed
```

주요 옵션:
- `--rules-mode copy|symlink` (기본 `copy`)
- `--target <path>` (`CLAUDE_HOME` 대체)

안전 기본값:
- unmanaged 기존 파일은 덮어쓰지 않고 skip
- settings/secret 성격 파일은 동기화 대상에서 제외
- 적용 이력은 `~/.claude/.study-all-sync-manifest`에 기록

## 5) Git hook 자동 동기화

```bash
bash scripts/setup-githooks.sh
```

- 설정: `core.hooksPath=.githooks`
- 트리거: `post-checkout`, `post-merge`
- `.claude` 변경이 감지되면 `sync-claude-home.sh --apply` 실행
- 임시 비활성화: `export STUDY_ALL_SYNC_DISABLE=1`

## 6) Legacy Commands (호환용)

동명이인 충돌을 피하기 위해 command는 `legacy-*` 이름만 유지합니다.

- `/legacy-dashboard`, `/legacy-next`, `/legacy-plan`
- `/legacy-learn`, `/legacy-study-skill`, `/legacy-review`, `/legacy-study`
- `/legacy-project-study`, `/legacy-project-learn`, `/legacy-project-review`

신규 워크플로우는 skills-first를 사용하세요.

## 7) 검증 명령

```bash
bash scripts/check-docs.sh
/Users/younghoonkim/Library/pnpm/pnpm -C mcp typecheck
/Users/younghoonkim/Library/pnpm/pnpm -C mcp test
```
