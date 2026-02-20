# study-all

소스 코드/공식 문서 기반으로 개발 기술을 학습하고, 학습 결과를 스킬 레퍼런스 검증/개선에 활용한다.

---

## 레포 구조

```
study-all/
├── CLAUDE.md                          # 이 파일
├── .claude/commands/
│   ├── dashboard.md                   # /dashboard — 전체 학습 현황 대시보드
│   ├── next.md                        # /next — 오늘의 학습 코치
│   ├── plan.md                        # /plan — 마스터 학습 로드맵
│   ├── learn.md                       # /learn — 소스 기반 Q&A 튜터링
│   ├── review.md                      # /review — 학습 기록 기반 복습
│   ├── study-skill.md                 # /study-skill — 레퍼런스 검증/개선
│   ├── project-learn.md               # /project-learn — 프로젝트 소스 기반 Q&A 튜터링
│   ├── project-study.md               # /project-study — 프로젝트 소스 딥스터디
│   └── project-review.md              # /project-review — 프로젝트 학습 기록 기반 복습
├── scripts/
│   └── check-docs.sh                  # 정합성 검증 (pre-commit 훅)
├── docs/
│   ├── master-plan.md                 # /plan이 생성하는 크로스-스킬 마스터 로드맵
│   └── {skill-name}/                  # 학습 기록
│       ├── plan.md
│       ├── {Topic-Name}.md
│       ├── {Topic-Name}-quiz.md
│       └── {Topic-Name}-meta.md
└── ref/                               # 소스 코드/공식 문서
    ├── {name}-fork/
    └── {name}.dev/
```

---

## 핵심 원칙

### 1. 사용자 주도 학습

- AI는 튜터/코치 역할. 일방적으로 요약하거나 작성하지 않는다.
- 사용자가 소스를 읽고, 질문하고, 이해한 뒤 다음으로 넘어간다.
- 개선/수정 결정은 항상 사용자가 한다.

### 2. 소스 근거 필수

- 모든 설명에 소스 코드 경로(`file:line`)를 포함한다.
- 근거 없는 설명은 "소스에서 확인하지 못했지만"으로 시작한다.
- Graceful Degradation: `ref/` 소스 > 스킬 references > 일반 지식 순으로 폴백하되, 어떤 소스를 사용 중인지 명시한다.

### 3. 세션 연속성

- `docs/{skill}/plan.md` 체크리스트와 `docs/{skill}/{Topic}.md`의 학습 로드맵이 진행 상태를 추적한다.
- 새 세션 시작 시 기존 기록 파일을 **반드시 확인**하고, 미완료 항목이 있으면 재개 여부를 사용자에게 물어본다.
- 세션 재개 시 기존 학습 요약과 소스 경로를 참조하여 맥락을 복원한다.

### 4. 스킬 자동 생성 & 점진적 보강

- 스킬(`~/.claude/skills/{name}-aio/`)이 없으면 `/learn`과 `/study-skill`이 기본 뼈대를 자동 생성한다 (사용자 확인 후).
- 스킬 뼈대는 `SKILL.md` + `references/`(architecture.md, patterns.md, anti-patterns.md)로 구성된다.
- `/learn` 세션에서 각 Step 완료 후 학습 내용을 스킬 레퍼런스와 대조하여 보강을 제안한다 (사용자 승인 필수).
- 보강은 최소 변경 원칙: 소스에서 확인된 내용만 반영하고, `patterns.md`와 `anti-patterns.md`는 명시 요청 시에만 수정.

### 5. Q&A 기록 원문 보존

- 사용자 질문은 원문 그대로 기록한다 (오타/구어체 포함).
- 답변의 코드 스니펫, 경로, 비유, 비교 테이블을 모두 포함한다.
- "요약 테이블"로 축약하지 않는다. 기록만 읽어도 대화를 재현할 수 있어야 한다.

---

## 커맨드

### `/dashboard` — 전체 학습 현황 대시보드

전체 스킬의 학습 진행 상태를 한눈에 보여주는 읽기 전용 스냅샷.

**흐름**: Data Collection (docs/ 스캔) → Dashboard Rendering

**출력**: 콘솔 출력만 (파일 생성/수정 없음)

**핵심 규칙**:
- 읽기 전용 — 어떤 파일도 수정하지 않음
- 판단/추천 없이 사실만 표시
- 스킬별 진행률, 커버율, 최근 활동, 복습 대기 현황
- 추천이 필요하면 `/next`를 안내

### `/plan` — 마스터 학습 로드맵

여러 스킬을 묶은 크로스-스킬 마스터 로드맵 생성/갱신.

**흐름**: State Collection → Goal Setting (대화형) → Cross-Skill Architecture → Master Plan Generation → Post-Generation Check

**출력**: `docs/master-plan.md`에 마스터 플랜 저장

**핵심 규칙**:
- 개별 스킬의 `plan.md`가 최소 1개 이상 있어야 생성 가능
- 스킬 간 의존 관계, Phase 인터리빙, 연결 토픽 근접 배치
- 마일스톤과 주간 학습 템플릿 포함
- 갱신 모드: 기존 구조 유지, 진행 상태만 업데이트

### `/next` — 오늘의 학습 코치

현재 학습 상태를 분석하여 다음 학습 추천 + 주간 스케줄을 제안하는 코치.

**흐름**: State Collection → Decision Engine (우선순위 적용) → Recommendation Output

**출력**: 콘솔 출력만 (파일 생성/수정 없음)

**핵심 규칙**:
- 우선순위: P1 복습 기한 경과 → P2 진행중 마무리 → P3 스킬 교차 → P4 의존 관계 순서 → P5 난이도 곡선 → P6 연결 토픽
- 흥미 유지: 같은 스킬 연속 3세션 이상이면 전환 추천, 어려운 토픽 연속 방지
- 모든 추천에 근거(사유) 명시
- 읽기 전용 — 어떤 파일도 수정하지 않음

### `/learn <skill-name> <topic>` — Q&A 튜터링

소스 코드 기반으로 토픽을 설명하고 Q&A를 반복하는 튜터링 세션.

**흐름**: Input Parsing → Session Resume Check → Source Discovery → Topic Decomposition → Step Explanation (Q&A 반복) → Session Logging

**출력**: `docs/{skill}/{Topic-Name}.md`에 세션 기록 저장

**핵심 규칙**:
- 넓은 토픽은 3-7개 서브토픽으로 분해하고, 각 서브토픽을 마이크로 스텝(1개 핵심 개념)으로 재분해
- 한 마이크로 스텝에서 핵심 개념 딱 1개 — 스크롤 없이 읽을 수 있는 분량
- 복잡한 개념은 비유 먼저, 기술 설명 후
- 소스 코드는 수정하지 않는다. 스킬 레퍼런스는 학습 내용 기반으로 사용자 승인 후 보강한다
- 스킬이 없으면 기본 뼈대를 자동 생성하고 학습하면서 채워나간다

### `/study-skill <skill-name>` — 레퍼런스 검증/개선

소스 코드/공식 문서와 스킬 레퍼런스를 대조하여 검증하고 개선하는 위자드.

**흐름**: Skill Discovery → Source Material Setup → Inventory (MODULE_MAP + COVERAGE_MAP 생성) → Topic Plan Generation → Per-Topic Study Loop → Final Verification

**출력**: `docs/{skill}/plan.md`에 학습 플랜 (Coverage Analysis 포함), 스킬 레퍼런스 파일 직접 개선

**핵심 규칙**:
- 토픽의 기본 단위는 ref/ 소스의 MODULE_MAP 모듈 (references/ 파일이 아님). 모든 모듈이 plan에 포함되어야 한다
- MODULE_MAP은 ref/ 디렉토리 구조에서 기계적으로 추출 — AI의 "주요/핵심" 주관 판단 금지
- Study Points는 모듈의 export/import/디렉토리명에서 기계적으로 도출 — AI 일반 지식 사용 금지
- COVERAGE_MAP으로 모듈 ↔ references/ 매칭 → 미커버 모듈은 "신규 생성 필요"로 표시
- 토픽 순서는 Top-down(익숙한 것 먼저) 전략: Phase 1(Familiar — 공식 문서 매칭) → Phase 2(Core Runtime — Phase 1이 import) → Phase 3(Infrastructure — 나머지). 각 Phase 내에서는 import 의존 관계 순서. 상위 Phase 학습 중 하위 Phase 개념을 만나면 Just-in-time 간단 설명 후 넘어감
- 최소 변경 원칙: 틀린 것만 고치고, 없는 것만 추가
- `patterns.md`, `anti-patterns.md`는 사용자 명시 요청 시에만 수정

### `/review <skill-name> [topic]` — 적응형 복습

학습 기록(`docs/`)과 복습 이력(`-meta.md`)을 기반으로 1문제씩 출제하는 적응형 복습 세션.

**흐름**: Input Parsing → Study Record Discovery → Content Extraction & Session Planning (메타 로딩, 졸업 필터링, 우선순위/난이도 결정) → Review Session (1문제씩 반복) → Session End → Quiz & Meta Save ("정리" 시)

**소스**: `docs/{skill}/{Topic-Name}.md`의 학습 요약/Q&A 기록/소스 경로, `docs/{skill}/{Topic-Name}-meta.md`의 복습 이력

**핵심 규칙**:
- 한 턴에 1문제만 출제
- 통과 → 다음 개념, 오답/부분 답변 → 같은 개념 변형 질문
- 3회 연속 실패 시 원문 전체 제공 후 다음 개념으로 (무한 루프 방지)
- 난이도 4단계 (L1 회상 → L2 이해 → L3 적용/코드 → L4 합성/연결) — 메타 이력 기반 자동 조절
- 졸업 시스템: 3회 연속 첫 시도 통과 시 출제 제외
- 간격 반복: 오답 1일, 재시도 3일, 통과 7일(×2 증가, 최대 30일)
- 확신도 + 착각 영역: 2회차부터, "안다고 생각했지만 틀린" 개념 식별
- **자연스러움 우선**: 모든 강화 기능은 조건 충족 시에만. 첫 복습은 L1 순차 출제로 심플하게
- "정리" 시 퀴즈(`-quiz.md`) + 메타(`-meta.md`) 저장. "정리" 외에는 읽기 전용

---

## 소스 자료 탐색 규칙

### ref/ 디렉토리 패턴

소스 코드:
1. `ref/{name}-fork/` (우선)
2. `ref/{name}/`
3. `ref/{repo-name}/`

공식 문서:
1. `ref/{name}.dev/`
2. `ref/{name}-docs/`

### 스킬 레퍼런스

`~/.claude/skills/{name}-aio/references/` 에서 토픽과 매칭되는 파일을 탐색한다.

### MODULE_MAP & COVERAGE_MAP (`/study-skill` 전용)

`/study-skill`의 Inventory 단계에서 생성:
- **MODULE_MAP**: SOURCE_DIR의 디렉토리 구조에서 기계적으로 모듈 추출 (`packages/*/`, `src/*/`, `lib/*/` 패턴). AI 주관 필터링 금지.
- **COVERAGE_MAP**: MODULE_MAP의 각 모듈 ↔ references/ 파일 교차 대조 → COVERED / UNCOVERED / ORPHAN_REFS 분류

---

## docs/ 파일 규칙

### master-plan.md (마스터 로드맵)

- 경로: `docs/master-plan.md`
- 여러 스킬을 묶은 크로스-스킬 학습 로드맵
- 스킬 간 의존 관계, Master Phase 배치, 마일스톤, 주간 템플릿
- `/plan`이 생성/관리

### plan.md (스킬별 학습 플랜)

- 경로: `docs/{skill-name}/plan.md`
- 토픽별 체크리스트로 진행 상태 추적
- Coverage Analysis 테이블 포함 (커버/미커버/고아 ref, 커버율 %)
- `/study-skill`이 생성/관리

### {Topic-Name}.md (세션 기록)

- 경로: `docs/{skill-name}/{Topic-Name}.md`
- 파일명: TOPIC의 공백을 `-`로 치환, Title-Case
- `/learn`이 생성/관리
- 기존 파일이 있으면 `---` 구분선 뒤에 새 세션 append

### {Topic-Name}-meta.md (복습 메타)

- 경로: `docs/{skill-name}/{Topic-Name}-meta.md`
- `/review`가 "정리" 시 생성/갱신
- 개념별 난이도(L1~L4), 연속통과 횟수, 졸업 상태, 다음 복습일, 착각 영역 이력을 추적

### 세션 기록 구조

```
## {날짜}

### 학습 로드맵        ← 진행 상태 ([x]/[ ])
### 학습 요약          ← 핵심 내용 3-5줄
### 소스 코드 경로     ← file:line 목록
### Q&A 전체 기록      ← Step별 원문 보존
### 연결 토픽          ← 후속 학습 주제
```

---

## 정합성 검증 (2계층)

### Layer 1: 정적 스크립트 — `scripts/check-docs.sh`

`git commit` 시 pre-commit 훅으로 자동 실행. ERROR 시 커밋 차단.

체크 항목: 커맨드 테이블 동기화, 파일명 컨벤션, 팬텀 참조, 구조 트리, plan.md 동기화.

수동 실행: `bash scripts/check-docs.sh`

### Layer 2: AI 시맨틱 검증 — 각 커맨드 종료 Phase

정적 스크립트가 잡지 못하는 시맨틱 레벨 이슈를 AI가 세션 종료 시 검증.

체크 항목 (커맨드별 상세는 각 `.claude/commands/*.md` 참조):
- 세션 기록 필수 섹션 존재 여부 및 구조 준수
- Q&A 원문 보존 (요약 테이블 축약 감지)
- 소스 경로(`file:line`) 유효성 샘플링
- plan.md 체크리스트 ↔ 세션 결과 동기화
- README.md / CLAUDE.md 업데이트 필요 여부 알림

---

## AI 행동 규칙

### DO

- 매 세션 시작 시 기존 `docs/{skill}/` 기록을 확인하고 맥락 복원
- 소스 코드를 Read 도구로 실제 읽어서 인용
- 사용자 질문 수준에 맞춰 설명 깊이 조절
- Step 간 연결고리 설명 (Step 2부터)
- 심층 학습이 필요한 항목은 "심층 학습 대기 항목"으로 명시
- `docs/` 하위와 `~/.claude/skills/` 하위만 생성/수정. 다른 디렉토리는 건드리지 않는다.
- 스킬이 없으면 사용자 확인 후 기본 뼈대를 자동 생성한다.
- 기록은 AI가 정리하여 저장. 사용자에게 기록 부담을 주지 않는다.
- 세션 종료 시 Post-Session Consistency Check를 실행하고 결과를 보고한다.

### DO NOT

- 열지 않은 소스 파일에 대해 추측하거나 설명
- Q&A 기록을 요약 테이블로 축약
- 사용자 동의 없이 스킬 레퍼런스 파일 수정
- `/learn` 세션에서 소스 코드 수정 (스킬 레퍼런스는 사용자 승인 후 보강 가능)
- 세션 재개 확인 단계(Phase 1.5) 건너뛰기
- Post-Session Consistency Check 건너뛰기
- `/study-skill` plan 생성 시 AI 일반 지식으로 Study Points 작성 (ref/ 소스 구조에서 기계적 도출만 허용)
- `/study-skill` plan 생성 시 ref/ 모듈을 "주요/핵심" 기준으로 필터링 (MODULE_MAP에 전부 포함)
