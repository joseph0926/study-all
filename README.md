# study-all

Claude Code와 Codex를 AI 튜터로 활용해 소스 코드/공식 문서 기반 학습 기록을 축적하는 레포입니다.

## Quick Start

```bash
git clone https://github.com/<owner>/study-all.git
cd study-all

# 학습할 소스 준비 (gitignored)
mkdir -p ref
# 예시
# git clone https://github.com/facebook/react.git ref/react-fork
# git clone https://github.com/reactjs/react.dev.git ref/react.dev
```

## Skills-First 실행 (권장)

기본 인터페이스는 `.claude/skills/*/SKILL.md`입니다.

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

### Codex 호출

Codex에서는 동일 개념을 `$skill` 형태로 호출합니다.

- `$learn <skill-name> <topic>`
- `$study-skill <skill-name>`
- `$review <skill-name> [topic]`
- `$project-study <project-path>`
- `$project-learn <project-path> <topic>`
- `$project-review <project-path> [topic]`

## Legacy Commands (호환용)

skill/command 동명이인 충돌을 피하기 위해 기존 command는 `legacy-*`로 유지합니다.

- `/legacy-dashboard`, `/legacy-next`, `/legacy-plan`
- `/legacy-learn`, `/legacy-study-skill`, `/legacy-review`, `/legacy-study`
- `/legacy-project-study`, `/legacy-project-learn`, `/legacy-project-review`

신규 사용자는 `legacy-*` 대신 skills-first 경로를 사용하세요.

## 설정 파일

- `.mcp.json`: study MCP 서버 등록
- `.claude/settings.local.json`: 로컬 권한/허용 규칙
- `CLAUDE.md`: 규칙 엔트리포인트 (`@.claude/rules/*.md` import)

`mcp` 패키지 실행 시 `STUDY_ROOT` 환경변수가 필요합니다.

## 검증 명령

```bash
bash scripts/check-docs.sh
/Users/younghoonkim/Library/pnpm/pnpm -C mcp typecheck
/Users/younghoonkim/Library/pnpm/pnpm -C mcp test
```

## 구조

```text
study-all/
├── .claude/
│   ├── skills/
│   ├── commands/            # legacy-* only
│   └── rules/
├── CLAUDE.md
├── README.md
├── docs/
├── mcp/
├── ref/
└── scripts/
```
