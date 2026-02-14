# study-all

소스 코드/공식 문서 기반으로 개발 기술을 학습하고, 학습 결과를 스킬 레퍼런스 검증/개선에 활용한다.

---

## 레포 구조

```
study-all/
├── CLAUDE.md                          # 이 파일
├── .claude/commands/
│   ├── learn.md                       # /learn — 소스 기반 Q&A 튜터링
│   ├── review.md                      # /review — 학습 기록 기반 복습
│   └── study-skill.md                 # /study-skill — 레퍼런스 검증/개선
├── scripts/
│   └── check-docs.sh                  # 정합성 검증 (pre-commit 훅)
├── docs/
│   └── {skill-name}/                  # 학습 기록
│       ├── plan.md
│       ├── {Topic-Name}.md
│       └── {Topic-Name}-quiz.md
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

### `/learn <skill-name> <topic>` — Q&A 튜터링

소스 코드 기반으로 토픽을 설명하고 Q&A를 반복하는 튜터링 세션.

**흐름**: Input Parsing → Session Resume Check → Source Discovery → Topic Decomposition → Step Explanation (Q&A 반복) → Session Logging

**출력**: `docs/{skill}/{Topic-Name}.md`에 세션 기록 저장

**핵심 규칙**:
- 넓은 토픽은 3-7개 서브토픽으로 분해하고, 의존 관계 순서대로 진행
- 한 Step에서 독립 개념 최대 3개
- 복잡한 개념은 비유 먼저, 기술 설명 후
- 소스 코드는 수정하지 않는다. 스킬 레퍼런스는 학습 내용 기반으로 사용자 승인 후 보강한다
- 스킬이 없으면 기본 뼈대를 자동 생성하고 학습하면서 채워나간다

### `/study-skill <skill-name>` — 레퍼런스 검증/개선

소스 코드/공식 문서와 스킬 레퍼런스를 대조하여 검증하고 개선하는 위자드.

**흐름**: Skill Discovery → Source Material Setup → Inventory → Topic Plan Generation → Per-Topic Study Loop → Final Verification

**출력**: `docs/{skill}/plan.md`에 학습 플랜, 스킬 레퍼런스 파일 직접 개선

**핵심 규칙**:
- 토픽 순서는 bottom-up (기초 → 내부 메커니즘 → 사용자 기능 → 고급)
- 최소 변경 원칙: 틀린 것만 고치고, 없는 것만 추가
- `patterns.md`, `anti-patterns.md`는 사용자 명시 요청 시에만 수정

### `/review <skill-name> [topic]` — 복습

학습 기록(`docs/`)을 기반으로 1문제씩 출제하는 적응형 복습 세션.

**흐름**: Input Parsing → Study Record Discovery → Content Extraction → Review Session (1문제씩 반복) → Session End → Quiz Save ("정리" 시)

**소스**: `docs/{skill}/{Topic-Name}.md`의 학습 요약, Q&A 기록, 소스 경로

**핵심 규칙**:
- 한 턴에 1문제만 출제
- 통과 → 다음 개념, 오답/부분 답변 → 같은 개념 변형 질문
- AI가 통과 여부를 판단하고 다음으로 넘김
- 3회 연속 실패 시 원문 전체 제공 후 다음 개념으로 (무한 루프 방지)
- "정리" 시 퀴즈 기록을 `docs/{skill}/{Topic-Name}-quiz.md`에 저장
- "정리" 외에는 읽기 전용

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

---

## docs/ 파일 규칙

### plan.md (학습 플랜)

- 경로: `docs/{skill-name}/plan.md`
- 토픽별 체크리스트로 진행 상태 추적
- `/study-skill`이 생성/관리

### {Topic-Name}.md (세션 기록)

- 경로: `docs/{skill-name}/{Topic-Name}.md`
- 파일명: TOPIC의 공백을 `-`로 치환, Title-Case
- `/learn`이 생성/관리
- 기존 파일이 있으면 `---` 구분선 뒤에 새 세션 append

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
