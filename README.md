# study-all

Claude Code와 함께 개발 기술과 영어를 학습하고, 기록을 축적하는 레포.

## Commands

| 커맨드 | 역할 |
|--------|------|
| `/learn <skill> <topic>` | 소스 코드 기반 토픽 Q&A 튜터링 |
| `/study-skill <skill>` | 스킬 레퍼런스 문서를 소스 코드와 대조하여 검증/개선 |
| `/eg-d [min\|ext\|check]` | 영어 데일리 루틴 (최소 15분 / 확장 45-70분) |

## Dev Study

`ref/` 에 소스 코드와 공식 문서를 두고, 토픽 단위로 읽으며 Q&A를 진행한다.

- 학습 플랜: `docs/{skill}/plan.md` — 토픽별 체크리스트
- 세션 기록: `docs/{skill}/{Topic-Name}.md` — 로드맵, 학습 요약, 소스 경로, Q&A 원문

```
docs/react/
├── plan.md                      # 14개 토픽 체크리스트
└── React-Core-API-Surface.md    # Q&A 세션 기록
```

## English Study

매일 최소/확장 루틴을 실행하고, 표현과 연습 기록을 누적한다.

- 표현 DB: `docs/english/expressions.md` — 업무 표현 누적 (카테고리별)
- 일일 기록: `docs/english/daily/{YYYY-MM-DD}.md` — streak, 배운 표현, 교정 내용

```
docs/english/
├── expressions.md
└── daily/
    └── 2026-02-11.md
```

## Structure

```
study-all/
├── guides/
│   ├── dev-study.md         # 개발 학습 가이드
│   └── english-study.md     # 영어 학습 가이드
├── .claude/commands/        # 커맨드 정의
├── docs/                    # 학습 기록
└── ref/                     # 소스 코드 / 공식 문서
```
