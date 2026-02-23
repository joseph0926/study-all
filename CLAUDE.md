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
│   ├── skills/
│   │   ├── dashboard/SKILL.md
│   │   ├── next/SKILL.md
│   │   ├── plan/SKILL.md
│   │   ├── learn/SKILL.md
│   │   ├── study-skill/SKILL.md
│   │   ├── review/SKILL.md
│   │   ├── study/SKILL.md
│   │   ├── project-study/SKILL.md
│   │   ├── project-learn/SKILL.md
│   │   └── project-review/SKILL.md
│   └── commands/
│       ├── legacy-dashboard.md
│       ├── legacy-next.md
│       ├── legacy-plan.md
│       ├── legacy-learn.md
│       ├── legacy-study-skill.md
│       ├── legacy-review.md
│       ├── legacy-study.md
│       ├── legacy-project-study.md
│       ├── legacy-project-learn.md
│       └── legacy-project-review.md
├── docs/
├── ref/
├── scripts/check-docs.sh
└── mcp/
```

## 운영 메모
- 기본 실행 경로는 skill이다.
- `legacy-*` command는 호환용이며 신규 플로우 기준은 아니다.
- 검증 명령은 `.claude/rules/docs.md`를 따른다.
