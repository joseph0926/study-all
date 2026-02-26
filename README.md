# study-all

Claude/Codex용 학습 스킬 + study MCP 서버를 함께 관리하는 저장소입니다.

## Active Skills

현재 운영 스킬은 아래 7개입니다.

| 목적 | Claude | Codex |
| --- | --- | --- |
| 학습 대시보드 조회 | `/dashboard` | `$dashboard` |
| 통합 멘탈모델 결정화 | `/forge <skill> [scope]` | `$forge <skill> [scope]` |
| 자유 Q&A 학습 | `/learn <질문>` | `$learn <질문>` |
| 프로젝트 분석/개선 | `/project <path> [area]` | `$project <path> [area]` |
| 프로젝트 코드베이스 Q&A | `/project-learn <path> <질문>` | `$project-learn <path> <질문>` |
| 복습 큐 기반 문제 풀이 | `/review <skill> [topic]` | `$review <skill> [topic]` |
| plan 기반 딥 학습 | `/study <주제>` | `$study <주제>` |

소스 오브 트루스는 이 저장소의 `.claude/skills`, `.codex/skills`입니다.

## Repository Layout

```text
study-all/
├── .claude/skills/*/SKILL.md
├── .codex/skills/*/SKILL.md
├── .claude/rules/*.md
├── mcp/                         # study MCP 서버
├── scripts/
│   ├── sync-claude-home.sh
│   ├── sync-codex-home.sh
│   ├── setup-githooks.sh
│   ├── check-docs.sh
│   └── start-mcp.sh
├── study/                       # 학습 기록/메타
└── ref/                         # 학습 소스 레퍼런스
```

## Quick Start

```bash
cd <repo-root>

# 1) home sync(기본 dry-run)
bash scripts/sync-claude-home.sh --dry-run
bash scripts/sync-codex-home.sh --dry-run

# 2) 반영
bash scripts/sync-claude-home.sh --apply
bash scripts/sync-codex-home.sh --apply

# 3) git hook 연결(선택)
bash scripts/setup-githooks.sh
```

## MCP Server

`.mcp.json`은 `scripts/start-mcp.sh`를 통해 로컬 MCP 서버를 실행합니다.

- 엔트리: `mcp/dist/src/index.js`
- 필요 조건: MCP 빌드 산출물 존재 (`mcp` 디렉토리에서 build 수행)

실행/검증:

```bash
/Users/younghoonkim/Library/pnpm/pnpm -C mcp typecheck
/Users/younghoonkim/Library/pnpm/pnpm -C mcp test
```

## Home Sync Details

Claude:

```bash
bash scripts/sync-claude-home.sh --dry-run
bash scripts/sync-claude-home.sh --apply
bash scripts/sync-claude-home.sh --apply --prune-managed
```

- 동기화 대상: `.claude/skills`, `.claude/rules`
- manifest: `~/.claude/.study-all-sync-manifest`

Codex:

```bash
bash scripts/sync-codex-home.sh --dry-run
bash scripts/sync-codex-home.sh --apply
bash scripts/sync-codex-home.sh --apply --prune-managed
```

- 동기화 대상: `.codex/skills`
- manifest: `~/.codex/.study-all-sync-manifest`

공통 안전 규칙:
- unmanaged 파일은 덮어쓰지 않음
- 기본 모드는 dry-run

## Git Hook Auto Sync

```bash
bash scripts/setup-githooks.sh
```

- `core.hooksPath=.githooks` 설정
- `post-checkout`, `post-merge`에서 `.claude`/`.codex` 변경 감지 시 자동 sync
- 임시 비활성화: `export STUDY_ALL_SYNC_DISABLE=1`

## Validation Commands

```bash
bash scripts/check-docs.sh
bash scripts/sync-claude-home.sh --dry-run
bash scripts/sync-codex-home.sh --dry-run
/Users/younghoonkim/Library/pnpm/pnpm -C mcp typecheck
/Users/younghoonkim/Library/pnpm/pnpm -C mcp test
```
