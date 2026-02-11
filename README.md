# study-all

Claude Code와 함께 소스 코드/공식 문서 기반으로 개발 기술을 학습하고, 기록을 축적하는 레포.

## Commands

| 커맨드 | 역할 |
|--------|------|
| `/learn <skill> <topic>` | 소스 코드 기반 토픽 Q&A 튜터링 |
| `/study-skill <skill>` | 스킬 레퍼런스 문서를 소스 코드와 대조하여 검증/개선 |

## Dev Study

`ref/` 에 소스 코드와 공식 문서를 두고, 토픽 단위로 읽으며 Q&A를 진행한다.

- 학습 플랜: `docs/{skill}/plan.md` — 토픽별 체크리스트
- 세션 기록: `docs/{skill}/{Topic-Name}.md` — 로드맵, 학습 요약, 소스 경로, Q&A 원문

```
docs/react/
├── plan.md                      # 14개 토픽 체크리스트
└── React-Core-API-Surface.md    # Q&A 세션 기록
```

## Structure

```
study-all/
├── .claude/commands/        # 커맨드 정의
├── docs/                    # 학습 기록
└── ref/                     # 소스 코드 / 공식 문서
```
