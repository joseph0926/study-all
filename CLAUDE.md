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
│       └── routine/SKILL.md
├── study/
├── ref/
├── scripts/check-docs.sh
└── mcp/
```

## 운영 메모
- 기본 실행 경로는 `/study`, `/learn`, `/forge`, `/review`, `/dashboard`, `/project`, `/project-learn`, `/routine` 8개 스킬이다.
- 학습 기록은 `study/` 디렉토리에 저장된다.
- 검증 명령은 `.claude/rules/docs.md`를 따른다.
