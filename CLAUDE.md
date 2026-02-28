# study-all

study-all 운영 규칙 엔트리포인트.

@.claude/rules/core.md
@.claude/rules/skills.md
@.claude/rules/docs.md

## 구조 요약

```text
study-all/
├── CLAUDE.md
├── .claude/
│   ├── rules/
│   │   ├── core.md
│   │   ├── skills.md
│   │   └── docs.md
│   └── skills/
│       ├── study/SKILL.md
│       ├── learn/SKILL.md
│       ├── forge/SKILL.md
│       ├── review/SKILL.md
│       ├── dashboard/SKILL.md
│       ├── project/SKILL.md
│       ├── project-learn/SKILL.md
│       ├── project-routine/SKILL.md
│       ├── routine/SKILL.md
│       └── test/SKILL.md
├── .codex/
│   └── skills/           # Codex용 스킬 미러
├── study/                 # 학습 기록
├── ref/                   # 소스코드 레퍼런스
├── scripts/
│   ├── check-docs.sh
│   ├── sync-claude-home.sh
│   └── sync-codex-home.sh
└── mcp/                   # study MCP 서버
```

## 운영 메모
- 기본 실행 경로는 `/study`, `/learn`, `/forge`, `/review`, `/dashboard`, `/project`, `/project-learn`, `/project-routine`, `/routine`, `/test` 10개 스킬이다.
- 학습 기록은 `study/` 디렉토리에 저장된다.
- home sync: `bash scripts/sync-claude-home.sh --apply`, `bash scripts/sync-codex-home.sh --apply`
- 검증 명령은 `.claude/rules/docs.md`를 따른다.
