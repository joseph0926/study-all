# study-all

Claude Code를 AI 튜터로 활용하여 소스 코드/공식 문서 기반으로 개발 기술을 학습하고, 기록을 축적하는 레포.

**학습 방식**: `ref/`에 학습할 라이브러리의 소스 코드와 공식 문서를 두고, Claude Code 커맨드(`/learn`, `/study-skill`, `/review`)로 토픽 단위 Q&A 세션을 진행한다. 모든 학습 기록은 `docs/`에 자동 저장되어 세션 간 연속성을 유지한다.

## Quick Start

```bash
# 1. 클론
git clone https://github.com/<owner>/study-all.git
cd study-all

# 2. 학습할 소스 코드를 ref/에 준비 (gitignored)
#    예: React 소스 코드와 공식 문서
cd ref
git clone https://github.com/facebook/react.git ref/react-fork
git clone https://github.com/reactjs/react.dev.git ref/react.dev

# 3. Claude Code 실행 후 커맨드 사용
claude

# 세션 안에서:
/learn react fiber            # 스킬이 없으면 자동 생성 → 토픽 학습
/study-skill react            # 스킬이 없으면 자동 생성 → 전체 학습 플랜 수립
```

## Commands

Claude Code 세션 안에서 슬래시 커맨드로 사용한다.

| 커맨드                              | 역할                                              | 출력                                    |
| ----------------------------------- | ------------------------------------------------- | --------------------------------------- |
| `/dashboard`                        | 전체 학습 현황 스냅샷 (읽기 전용)                   | 콘솔 출력                               |
| `/next`                             | 오늘의 학습 추천 + 주간 스케줄 (읽기 전용)          | 콘솔 출력                               |
| `/plan`                             | 크로스-스킬 마스터 학습 로드맵 생성/갱신             | `docs/master-plan.md`                   |
| `/learn <skill> <topic>`            | 소스 코드 기반 토픽 Q&A 튜터링 + 스킬 보강         | `docs/{skill}/{Topic-Name}.md`          |
| `/study-skill <skill>`              | 스킬 레퍼런스를 소스와 대조하여 검증/개선           | `docs/{skill}/plan.md` + 스킬 파일 개선 |
| `/review <skill> [topic]`           | 학습 기록 기반 복습 (AI 질문, 내가 답변)            | `docs/{skill}/{Topic-Name}-quiz.md`     |
| `/project-learn <path> <topic>`     | 프로젝트 소스 코드 기반 토픽 Q&A 튜터링             | 프로젝트 `.study/` 디렉토리             |
| `/project-study <path>`             | 프로젝트 소스 딥스터디 → 학습 플랜 → 토픽별 딥스터디 | 프로젝트 `.study/` 디렉토리             |
| `/project-review <path> [topic]`    | 프로젝트 학습 기록 기반 복습 (AI 질문, 내가 답변)    | 프로젝트 `.study/` 디렉토리             |

### `/dashboard` — 현황 스냅샷 / `/next` — 학습 코치 / `/plan` — 마스터 플랜

```
/dashboard              # 스킬별 진행률, 최근 활동, 복습 대기 현황
/next                   # "오늘 뭐 하지?" → 추천 + 주간 스케줄
/plan                   # 여러 스킬을 묶은 마스터 학습 로드맵
```

- `/dashboard`: 사실만 보여줌 (읽기 전용, 빠름)
- `/next`: 상태 분석 → 다음 학습 추천 (복습 기한, 스킬 교차, 난이도 곡선 고려)
- `/plan`: 스킬 간 의존 관계, Phase 인터리빙, 마일스톤이 포함된 마스터 로드맵 생성

### `/learn` — 소스 기반 Q&A 튜터링

```
/learn react fiber node
```

AI가 `ref/react-fork/` 소스를 읽고, 토픽을 서브토픽으로 분해하여 단계별로 설명한다. 각 단계마다 Q&A를 진행하고, 전체 대화가 `docs/react/Fiber-Node.md`에 자동 기록된다.

- 스킬이 없으면 기본 뼈대(`~/.claude/skills/{name}-aio/`)를 자동 생성
- 넓은 토픽은 3-7개 서브토픽으로 분해, 의존 관계 순서대로 진행
- 모든 설명에 소스 코드 경로(`file:line`) 포함
- 각 Step 완료 후 학습 내용으로 스킬 레퍼런스 보강 제안 (사용자 승인 후 적용)
- 이전 세션이 있으면 자동으로 재개 여부를 물어봄

### `/study-skill` — 스킬 레퍼런스 검증/개선

```
/study-skill react
```

`~/.claude/skills/react-aio/references/`의 레퍼런스 파일들을 소스 코드와 대조하여 검증한다. 스킬이 없으면 기본 뼈대를 자동 생성한 후 진행한다. 틀린 내용은 수정하고, 빠진 내용은 추가한다. 학습 플랜(`docs/react/plan.md`)으로 진행 상태를 추적한다.

### `/review` — 복습

```
/review react                    # react 전체 복습
/review react fiber node         # 특정 토픽만 복습
```

`docs/react/` 학습 기록을 기반으로 1문제씩 출제한다. 맞으면 다음 개념, 틀리면 같은 개념 변형 질문. "정리"라고 입력하면 퀴즈 기록이 저장된다.

## ref/ 디렉토리 설정

`ref/`는 gitignored이므로 각자 학습할 소스를 준비해야 한다. 네이밍 컨벤션:

```
ref/
├── react-fork/          # 소스 코드: {name}-fork/ 또는 {name}/
├── react.dev/           # 공식 문서: {name}.dev/ 또는 {name}-docs/
├── next.js/             # 레포명 그대로도 가능
└── ...
```

커맨드가 자동으로 탐색하는 우선순위:

1. `ref/{name}-fork/` (소스 코드)
2. `ref/{name}/` (소스 코드)
3. `ref/{name}.dev/` (공식 문서)
4. `ref/{name}-docs/` (공식 문서)

## Structure

```
study-all/
├── CLAUDE.md                          # AI 행동 규칙 및 프로젝트 규칙
├── .claude/commands/
│   ├── dashboard.md                   # /dashboard 커맨드 정의
│   ├── next.md                        # /next 커맨드 정의
│   ├── plan.md                        # /plan 커맨드 정의
│   ├── learn.md                       # /learn 커맨드 정의
│   ├── review.md                      # /review 커맨드 정의
│   ├── study-skill.md                 # /study-skill 커맨드 정의
│   ├── project-learn.md               # /project-learn 커맨드 정의
│   ├── project-study.md               # /project-study 커맨드 정의
│   └── project-review.md              # /project-review 커맨드 정의
├── scripts/
│   └── check-docs.sh                  # 정합성 검증 (pre-commit 훅)
├── docs/                              # 학습 기록 (자동 생성)
│   ├── master-plan.md                 # 크로스-스킬 마스터 로드맵
│   └── {skill-name}/
│       ├── plan.md                    # 학습 플랜 & 체크리스트
│       ├── {Topic-Name}.md            # 세션 기록 (Q&A 원문 포함)
│       └── {Topic-Name}-quiz.md       # 복습 퀴즈 기록
└── ref/                               # 소스 코드 / 공식 문서 (gitignored)
```

## 새 스킬 학습 시작하기

예시: Vite를 학습하려는 경우

```bash
# 1. 소스 코드 준비
git clone https://github.com/vitejs/vite.git ref/vite-fork

# 2. (선택) 공식 문서 준비
git clone https://github.com/vitejs/vite.git ref/vite.dev  # docs 브랜치 등

# 3. Claude Code에서 학습 시작
claude
# 세션 안에서:
#   /learn vite dev server       → 스킬 자동 생성 + 토픽 학습
#   /study-skill vite            → 스킬 자동 생성 + 전체 학습 플랜 수립
```

스킬(`~/.claude/skills/vite-aio/`)이 없으면 `ref/`에서 소스 정보를 추출하여 기본 뼈대를 자동 생성한다. 학습을 진행하면서 레퍼런스가 점진적으로 채워진다. `docs/vite/` 디렉토리도 자동 생성되고 학습 기록이 쌓인다.
