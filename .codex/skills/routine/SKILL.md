---
name: routine
description: 장기 학습 세션 오케스트레이터. 탐색→심화→코딩→체크포인트→복습등록 5단계를 한 세션으로 운영하고, JSONL 로그로 이어하기와 복구를 관리한다. "루틴 시작", "공부하자", "오늘 뭐 배울까", "학습 시작", "루틴"처럼 세션을 새로 시작하거나 이어갈 때 사용한다. 단일 질문 답변, 개별 복습, 프로젝트 분석만 필요하면 learn/review/project를 사용한다. Codex에서는 `$routine [project-path] [주제]`으로 호출한다.
---

# routine

입력: `$routine [project-path] [주제]`

## 모드 판별

`호출 인자`에서 주제 앞의 경로 후보를 먼저 파싱한다.

- project 모드로 간주하는 경우:
  - 첫 인자가 `/`, `./`, `../`, `~/`로 시작한다.
  - 첫 인자가 `/`를 포함하는 상대경로 형태이고 실제 경로가 존재한다. 예: `apps/web`, `packages/ui`
  - 공백이 있는 경로는 따옴표로 감싼 첫 구간을 경로 후보로 파싱하고, 위 조건을 만족하면 project 모드로 본다.
- bare token 하나만 보고 project 모드로 추정하지 않는다. 예: `react`, `src`, `auth`
- project 모드: `<project-path>` + `[주제]` 파싱 → `context.resolve(mode=project, projectPath=<project-path>)`
- skill 모드: `[주제]`만 사용하고, 별도 `context.resolve`는 호출하지 않는다.

모드에 따라 아래가 달라진다:
- 상태 경로: skill → `study/.routine/`, project → `{project}/.study/.routine/`
- 근거 탐색 우선순위
- Phase 배너 접두사
- `routine.*` 호출 시 context 전달


## 역할 경계

- 이 스킬은 5단계 학습 세션을 처음부터 끝까지 오케스트레이션할 때만 사용한다.
- 단일 질문 답변만 필요하면 `learn`을 사용한다.
- 복습 큐 소화만 필요하면 `review`를 사용한다.
- 프로젝트 분석/개선만 필요하면 `project`를 사용한다.
- 코딩 평가만 필요하면 `test`를 사용한다.


## 컨텍스트 보존 (필수)

이 파이프라인은 60-90분 세션을 전제한다. 컨텍스트 컴팩션이 발생해도 오케스트레이션을 유지하기 위해 아래 3가지를 반드시 지킨다.

### A. Phase 배너

**매 응답의 첫 줄**에 아래 형식의 배너를 출력한다:

```
skill 모드:   > [ROUTINE] Phase {N}/5 | {주제} | Q&A: {누적횟수} | 경과: {분}분
project 모드: > [ROUTINE:PROJECT] Phase {N}/5 | {주제} | Q&A: {누적횟수} | 경과: {분}분
```

### B. JSONL 세션 로그 (`routine.appendEntry` / `routine.readLog`)

`session-state.md` 대신 JSONL 기반 세션 로그를 사용한다.

**project 모드에서는 반드시 context를 포함한다:**

- `routine.appendEntry({ context: { mode: "project", projectPath }, entry: ... })`
- `routine.readLog({ context: { mode: "project", projectPath } })`
- `routine.resetLog({ context: { mode: "project", projectPath } })`

**기록 시점:**
- Phase 전환 시: `routine.appendEntry({ entry: { phase, type: "phase_end", summary } })`
- Phase 1-2 매 Q&A 완료 후: `routine.appendEntry({ entry: { phase, type: "qa", userQuestion: "{사용자 원문 그대로}", aiAnswer: "{AI 응답 원문 그대로}", refs: ["{file:line}"], links: ["{url}"] } })`
- Phase 3 코딩: `routine.appendEntry({ entry: { phase: 3, type: "coding", challengeType, challenge, userCode, review, result } })`
- Phase 4 체크포인트: `routine.appendEntry({ entry: { phase: 4, type: "checkpoint", q1, q1Answer: "{사용자 원문}", q2, q2Answer: "{사용자 원문}", aiFeedback: "{AI 피드백 원문}", result } })`
- Phase 5 완료: `routine.appendEntry({ entry: { phase: 5, type: "complete" } })`

**원문 보존 원칙:**
- `userQuestion`, `aiAnswer`, `q1Answer`, `q2Answer`, `aiFeedback`은 축약/요약 없이 **원문 그대로** 저장한다.
- 오타 수정만 허용하며, 내용 변경/축약은 금지한다.
- `transcripts/`는 세션 대화 원문 아카이브용 추가 산출물이다. JSONL 복원 근거를 대체하지 않는다.

**복원:** `routine.readLog({})` → phaseSummaries로 전체 흐름 파악, entries(최근 5개)로 상세 맥락 복원.
필요 시 `routine.readLog({ entriesMode: "full" })` 재호출.

### C. Self-check 규칙

- **Phase 전환 직후**: `routine.readLog({})` 호출하여 상태 확인 후 진행.
- **응답 생성 시 현재 Phase가 불확실하면**: 즉시 `routine.readLog({})` 호출하고 해당 상태 기준으로 진행.
- readLog 결과와 대화 컨텍스트가 충돌하면 **readLog를 신뢰**한다 (로그가 더 최신).
- **루틴 외 작업 후 복귀 감지**: 직전 AI 응답에 Phase 배너(`[ROUTINE]` 또는 `[ROUTINE:PROJECT]`)가
  없으면 중간 인터럽션으로 간주한다:
  1. `routine.readLog({})` 호출하여 현재 상태 확인
  2. 복귀 배너 출력:
     ```
     > [ROUTINE] 복귀 | Phase {N}/5 | {주제} | Q&A: {N}
     > 이전 상태에서 계속합니다.
     ```
  3. 해당 Phase 진행 계속


## Phase 0: 오리엔테이션 (5분)

### 0-PRE. 이전 세션 이어하기 체크 (최우선)

1. `routine.readLog({})` 호출 (project 모드면 context 포함)
2. `exists=true` + 마지막 entry의 type이 `"complete"`가 아님 → 이전 세션 발견:
   - 사용자에게 보고: "이전 세션: {topic}, Phase {currentPhase}, Q&A {qaCount}회. 이어서 할까요?"
   - **이어하기** → entries에서 맥락 복원, 해당 Phase 진입
   - **새로 시작** → `routine.resetLog({})` 후 아래 정상 흐름
3. `exists=false` 또는 마지막 entry가 `"complete"` → 정상 흐름 (아래 계속)
4. `exists=false` + `state.md`에 `inProgressSession`이 있으면 = 비정상 종료 복원:
   - 해당 날짜의 아카이브 JSONL 탐색
   - 아카이브 발견 시: Read하여 맥락 복원, 사용자에게 보고 후 해당 Phase 재개
   - 아카이브 미발견 시: 사용자에게 "이전 세션 비정상 종료 감지, 새로 시작합니다" 보고

### 0-PRE-FAIL. FAIL 세션 이어가기 체크

`state.md`에 `nextSeed`가 있고 `failSessionArchive` 경로가 있으면:

1. `failSessionArchive` 경로의 아카이브 JSONL 파일을 Read
2. 아카이브 entries에서 이전 세션의 전체 Q&A 맥락 복원
3. `previousApproach`와 `suggestedApproach`를 확인
4. 사용자에게 보고:
   ```
   이전 FAIL 세션 복원:
   - 주제: {topic}
   - Q&A {N}회 학습 내용 로드 완료
   - gap: {nextSeed}
   - 이전 접근: {previousApproach}
   - 제안 접근: {suggestedApproach}
   이번에는 "{suggestedApproach}" 방향으로 진행합니다.
   ```
5. 이전 세션의 Q&A 내용을 컨텍스트로 유지한 채, suggestedApproach 방향으로 Phase 1 진입
6. PASS 시: `state.md`에서 `nextSeed`, `failSessionArchive`, `previousApproach`, `suggestedApproach` 제거

접근 방식 카테고리 (Phase 0에서 FAIL seed 감지 시 활용):
1. 작동 원리 중심 (how it works)
2. 실패 케이스 중심 (when it breaks)
3. 비교 중심 (vs alternatives)
4. 구현 중심 (build it yourself)
5. 사용 패턴 중심 (practical usage)

### 0-A. 상태 확인

1. `state.md` Read — streak, nextSeed 확인
   - skill 모드: `study/.routine/state.md`
   - project 모드: `{project}/.study/.routine/state.md`
2. `history.md` Read — 최근 5행 로드
3. `stats.getDashboard(context={mode: "skill"})`로 전체 학습 상태 + 복습 대기 확인

5. 시작 시각 기록 (내부 추적용, `startTime: HH:MM` 메모)

### 0-B. 오늘의 시드 결정 (우선순위)

- A) 파싱된 주제가 있으면 → 그 주제
- B) state.md에 nextSeed가 있으면 → 제안 ("이전 세션에서 남긴 질문: {question}. 이어서 할까요?")
- C) 복습 대기가 있으면 → 제안 ("복습 대기 {N}개. 복습 기반으로 시작할까요?")
- D) 없으면 → "오늘 궁금한 게 뭔가요?"

### 0-C. 소스 탐색

**skill 모드:**
1. `Glob("ref/*/")` → ref/ 하위 디렉토리 목록
2. AI가 주제명으로 관련 ref/ 디렉토리 선택 (복수 가능)
3. 매칭 없으면: "ref/에 관련 소스 없음, 웹 검색 중심으로 진행합니다"

**project 모드:**
1. 프로젝트 디렉토리 구조 탐색
2. 주제 관련 파일/모듈 식별

### 0-D. 오리엔테이션 보고

사용자에게 보고:

```
## 루틴 시작
streak: {N}일 | 총 세션: {N}

### 최근 기록
{history 최근 5행 테이블}

### 오늘의 시드
{결정된 시드 또는 제안}

### 소스
{선택된 ref/ 디렉토리 또는 프로젝트 경로 또는 "관련 소스 없음"}

{어제 루틴 없으면: "어제 루틴 없음 — 오늘 다시 시작!"}
{미해결 seed 있으면: "미해결 seed {N}개: {목록}"}
```

### 0-E. 세션 시작 기록

사용자가 주제를 확정하면:

`routine.appendEntry({ entry: { phase: 0, type: "init", topic: "{주제명}", refDirs: ["{선택된 소스 디렉토리}"] } })`

Phase 1 진행.


## Phase 1: 탐색 — learn 패턴 (15-45분)

사용자의 궁금증에서 출발하여 자유롭게 탐색한다.

### 1-A. 근거 탐색

`references/evidence-priority.md`의 모드별 우선순위를 따른다. Phase 1-2 전체에 적용.

**근거 자동 escalation:**
- "추론:"으로 답변하려는 내용이 사실적 주장(메커니즘, 성능, 동작 방식)이면 → 자동으로 웹 검색을 먼저 시도하고, 근거를 못 찾은 경우에만 "추론:"으로 표기한다.
- 사용자가 "왜?", "근거?", "진짜?", "검증된?" 같은 검증 질문을 하면 → 즉시 웹 검색 escalation (ref/ 스킵 가능).
- 목표: 사용자가 "웹검색 해봐줘"를 직접 요청해야 하는 상황을 없앤다.

### 1-B. 답변 구조

아래 순서로 답변한다:
- **비유** — 핵심 개념마다 실생활 비유를 먼저 제시. 1:1 대응 명시. 불가 시 "비유 한계:" 처리.
  - **비유 실패 감지:** 사용자 반응에서 "이해가 안 되는데", "잘 모르겠", "다시 설명", "비유가 안 와닿" 등의 신호, 또는 동일 개념에 대한 반복 질문이 감지되면 자동으로 대안 비유를 제시한다.
    - 대안 ①: 도메인 전환 — 물리적 비유가 실패했으면 사회적/일상적 비유로 전환
    - 대안 ②: 추상도 낮추기 — 더 구체적인 일상 예시로 전환
    - 2회 실패 시: "비유 한계:" 전환 후 코드/텍스트 직접 설명으로 진행
- **코드/텍스트 설명** — 비유 프레임 위에 근거. `file:line` 또는 출처 URL 포함.
- **시각화** — ASCII 다이어그램/테이블로 핵심 정리.
- **연결** — `study/` 스캔으로 기존 학습 내용과 연결 탐색.

### 1-C. 반복

- 사용자의 추가 질문을 대기. 최소 Q&A 3회를 목표로 한다.
- 매 Q&A에서 근거 소스를 명시한다.
- **매 Q&A 완료 후**: `routine.appendEntry({ entry: { phase: 1, type: "qa", userQuestion: "{사용자 질문 원문}", aiAnswer: "{AI 응답 원문}", refs: ["{file:line}"], links: ["{url}"] } })`
- `>>다음` 신호로 Phase 2 진행. 3회 미만이면 "아직 Q&A {N}회입니다. 더 탐색하시겠어요?" 확인.
- `>>다음` 시: `routine.appendEntry({ entry: { phase: 1, type: "phase_end", summary: "{Phase 1 요약}" } })` → Phase 2 진행.

### 1-D. 이해도 체크포인트

Q&A 3회 완료 시점에 능동 회상 질문 1개를 제시한다:
- "지금까지 내용을 한 문장으로 정리하면 어떻게 될까요?"
- 사용자 답변이 핵심을 놓쳤으면 → 놓친 부분만 간결히 보충한다.
- 사용자가 "패스" 또는 다음 질문으로 넘어가면 → 해당 세션에서 더 이상 제시하지 않는다.
- 이후 3회마다 반복하되, 한 번이라도 건너뛰면 해당 세션에서 더 이상 제시하지 않는다.


## Phase 2: 심화 — study 패턴 (5-30분)

Phase 1이 "무엇/어떻게"를 탐색했다면, Phase 2는 **"왜 이렇게 만들었는가"**를 파고든다. 소스코드 내부로 들어가 설계 결정의 근거를 추적한다.

### Phase 1과의 차이

| | Phase 1 (탐색) | Phase 2 (심화) |
|---|---|---|
| 초점 | 개념 이해, 동작 원리 | 설계 의도, 트레이드오프 |
| 코드 수준 | API/사용법 중심 | 내부 구현/구조체 수준 |
| 질문 방향 | 사용자 → AI | AI → 사용자 (출제) |
| 근거 | ref/ + 웹 | ref/ 소스코드 심층 추적 |

### Phase 2 축소 조건

Phase 1에서 아래 조건을 **모두** 충족하면, Phase 2를 "축소 모드"로 전환할 수 있다:
- Phase 1 QA가 5회 이상
- Phase 1 QA 중 "왜" 수준 질문(설계 의도, 트레이드오프, 내부 구현)이 2회 이상 포함
- Phase 1 총 소요 시간이 40분 이상

**축소 모드:**
- 코드 심층 추적(2-A)은 생략 가능
- AI→사용자 출제(2-C)는 **1문제로 축소 (필수, 생략 불가)**
- Phase 2 최소 소요: 출제 1문제 + 답변 + 피드백

사용자에게 보고: "Phase 1에서 이미 설계 의도까지 탐구했으므로, Phase 2는 확인 질문 1개로 축소합니다."

조건 미충족 시 아래 **전체 모드**로 진행한다.

### 2-A. 코드 심층 추적

- Phase 1에서 다룬 개념의 **내부 구현**을 Glob, Grep, Read로 추적한다.
- 핵심 구조체/함수의 **필드별 존재 이유**를 설명한다.
- 코드 경로를 따라가며 데이터 흐름을 추적한다 (`file:line` 필수).

### 2-B. 설계 의도 추적

- "왜 이 설계인가?" + "대안은?" + "미채택 이유는?" 3단 질문.
- PR/주석/git blame 근거를 탐색한다 (가능한 경우).
- 트레이드오프를 명시한다 (성능 vs 단순성, 유연성 vs 안전성 등).

### 2-C. AI → 사용자 출제 (1~2문제)

Phase 1과 달리 **AI가 사용자에게 질문**한다:
- **출제 범위: Phase 1에서 Q&A로 다룬 주제 안에서만 출제한다.** Phase 2-A/B에서 새로 심화한 내용은 출제 소재로 사용하되, 질문의 맥락은 Phase 1에서 사용자가 이미 접한 개념이어야 한다.
- "이 함수가 X를 하는 이유는?" (코드 근거 요구)
- "Y 대신 Z를 쓴 이유는?" (트레이드오프 요구)
- 오답 시 보충 설명, 정답 시 진행.
- **매 Q&A 완료 후**: `routine.appendEntry` (§B 참조, phase: 2)

`>>다음` 시: `routine.appendEntry({ entry: { phase: 2, type: "phase_end", summary } })` → Phase 3 진행.


## Phase 3: 라이브 코딩 (10-20분)

Phase 2에서 심화한 내용을 실제 코드로 작성하여 검증한다.

### 3-A. 과제 출제

AI가 오늘 학습 주제 기반으로 코딩 과제 1개를 출제한다.

과제 유형 (주제에 따라 AI가 가장 적합한 것을 선택):

| 유형 | 설명 | 적합한 경우 |
|------|------|-----------|
| 구현 | 학습한 메커니즘의 핵심 로직 직접 구현 | 새 개념을 배운 경우 |
| 디버깅 | 버그가 있는 코드에서 문제를 찾고 수정 | 동작 원리를 깊게 다룬 경우 |
| 리팩터링 | 안티패턴 코드를 올바른 패턴으로 수정 | 설계 원칙을 다룬 경우 |
| 빈칸 채우기 | 핵심 부분이 빈칸인 코드를 완성 | 특정 API/패턴 숙달이 목표인 경우 |

출제 형식:
- **과제 유형**: [구현/디버깅/리팩터링/빈칸채우기]
- **과제 설명**: 구현할 내용을 명확히 서술
- **제약 조건**: 사용할 언어, 금지 사항 등
- **힌트** (접어두기): 필요 시 핵심 개념 리마인드

### 3-B. 코드 작성

사용자가 실제 언어(TS/JS 등)로 코드를 작성한다. AI는 기다린다.

### 3-C. 힌트 사다리 피드백

1차 리뷰 (답 보류):
- 정확성: 로직이 올바른지
- 핵심 개념 반영: 학습한 패턴/원칙이 적용되었는지
- 엣지 케이스: 놓친 경우가 있는지
- 틀린 부분이 있으면 **어디가 틀렸는지만 지적**, 정답은 공개하지 않음

재시도 기회 (1회):
- 사용자가 수정한 코드를 다시 제출
- 수정을 원하지 않으면 바로 모범 답안

2차 리뷰 (모범 답안 공개):
- 최종 코드와 모범 답안을 비교
- 차이점 분석: 무엇이 다르고, 왜 모범이 더 나은지 (또는 사용자 코드가 동등/더 나은 경우 인정)
- 학습 포인트 정리

### 3-D. 기록

`routine.appendEntry({ entry: { phase: 3, type: "coding", challengeType: "구현|디버깅|리팩터링|빈칸채우기", challenge: "{과제 설명}", userCode: "{사용자 코드 원문}", review: "{AI 리뷰 원문}", result: "pass|partial|retry" } })`

`>>다음` 시: `routine.appendEntry({ entry: { phase: 3, type: "phase_end", summary: "{Phase 3 요약}" } })` → Phase 4 진행.


## Phase 4: 체크포인트 (5-15분)

체크포인트 진입을 선언한다:

```
## 체크포인트

오늘 배운 내용을 검증합니다. 코드를 보지 않고 답해주세요.
```

### Q1: "이게 왜 이렇게 동작해?"

- 오늘 다룬 핵심 메커니즘에 대해 코드 없이 설명을 요청한다.
- 구체적인 질문으로 변환한다 (예: "Suspense가 Promise를 catch하는 흐름을 설명해주세요").

사용자 답변을 받는다.

### Q2: "나라면 어떻게 만들었을까?"

- 오늘 다룬 설계에 대해 대안 설계를 요청한다.
- 트레이드오프를 함께 물어본다.

사용자 답변을 받는다.

### 피드백 + AI 이해도 평가

사용자 답변을 기반으로 피드백한다:
- 빠진 부분 지적 (예: "X 부분이 빠졌습니다")
- 오개념 교정 (예: "실제로는 Y입니다")
- 잘 답한 부분 인정

**AI 이해도 평가** (자기평가 전에 제시):

각 질문에 대해 이해도를 3단계로 평가하고 근거를 명시한다:

```
AI 이해도 평가:
- Q1: 🟢 정확 / 🟡 부분 / 🔴 재학습 필요 — {무엇이 맞고 무엇이 부족한지}
- Q2: 🟢 정확 / 🟡 부분 / 🔴 재학습 필요 — {무엇이 맞고 무엇이 부족한지}
```

- 🟢 정확: 핵심 개념과 근거를 모두 포함
- 🟡 부분: 핵심은 맞으나 누락/부정확한 부분 존재
- 🔴 재학습 필요: 핵심 개념에 오해가 있음

### 자기 평가

```
위 AI 평가를 참고하여 자기 평가를 해주세요:
- **PASS** → 핵심 개념을 review에 등록하고 정리합니다 (Phase 5)
- **FAIL** → gap을 기록하고 다음 접근 방식을 제안합니다 (Phase 5)

FAIL은 "나는 정확히 여기서 모른다"를 아는 것입니다. 부정적인 것이 아닙니다.
```

### PASS 경로

1. 세션에서 다룬 핵심 개념 3~5개를 추출한다.
2. 사용자에게 개념 목록을 보여주고 확인을 받는다.
3. `review.saveMeta` 호출하여 개념들을 L1/streak:0/nextReview:내일로 등록한다.
   - **skill 모드**: `review.saveMeta({ context: { mode: "skill", skill: "{스킬명}" }, topic: "{토픽명}", meta: { concepts: [...], sessionCount: 1 } })`
   - **project 모드**: `review.saveMeta({ context: { mode: "project", projectPath: "{경로}" }, topic: "{토픽명}", meta: { concepts: [...], sessionCount: 1 } })`
   - skill 모드에서 `context.skill`은 필수 (예: `"react"`, `"nextjs"` 등 주제에 맞는 스킬 카테고리). 카테고리가 불명확하면 사용자에게 확인 후 저장한다.
4. `routine.appendEntry({ entry: { phase: 4, type: "checkpoint", q1, q1Answer, q2, q2Answer, aiFeedback, result: "PASS" } })` → Phase 5 진행

### FAIL 경로

1. 사용자에게 "어디서 막혔나요?" 확인한다.
2. 이전 접근 방식을 기록한다 (예: "작동 원리 중심").
3. 다음 세션용 다른 접근 방식을 제안한다.
4. `routine.appendEntry({ entry: { phase: 4, type: "checkpoint", q1, q1Answer, q2, q2Answer, aiFeedback, result: "FAIL" } })` → Phase 5 진행

### 증분 체크포인트

Phase 4 결과 기록 직후, `state.md`에 진행 중 마커를 Write:

```
inProgressSession: {topic}
inProgressPhase: 4
inProgressResult: PASS|FAIL
inProgressDate: {YYYY-MM-DD}
```

Phase 5에서 state.md 최종 갱신 시 `inProgress*` 필드를 제거한다.

규칙:
- AI가 PASS/FAIL을 판정하지 않는다. 사용자 자기 평가.
- AI 이해도 평가는 판단 근거 제공용이며, 최종 결정은 사용자에게 있다.
- FAIL에 부정적 뉘앙스 없음. "정확한 gap 발견"으로 프레이밍.


## Phase 5: 정리 (5분)

### 5-A. 학습 성과 합성

**핵심 명제 추출** — 세션 전체 Q&A를 분석하여 3~5개 핵심 명제를 추출한다:
- 형식: "~은 ~이다 (왜냐하면 ~)"
- 각 명제에 근거 출처 1개 이상 첨부.
- 세션 중 교정된 오해가 있으면 "오해 → 정정" 쌍으로 포함.

**활용 프레임워크** — "그래서 나는 이제 뭘 다르게 하는가?"에 답하는 판단 기준을 작성한다:
- 형식: "~할 때, ~를 확인/적용한다"
- 실무 시나리오 1~2개 예시 포함.

### 5-B. 결과물 기록

**PASS 경로:**
1. review 등록 완료를 보고한다 (Phase 4에서 이미 `review.saveMeta` 호출됨).

**FAIL 경로:**
1. state.md의 nextSeed에 막힌 지점 기록.
2. state.md에 접근 방식 기록:
   - `previousApproach`: 이번 세션의 접근 방식 설명
   - `suggestedApproach`: 다음 세션에 시도할 다른 방향 제안
3. state.md의 `failSessionArchive`에 아카이브될 JSONL 경로 기록.

### 5-C. state.md 갱신

Write로 `state.md` 갱신:
- `lastCompleted`: 오늘 날짜
- `totalSessions`: +1
- `totalSeeds`: FAIL면 +1
- streak 계산: lastCompleted가 어제면 streak+1, 아니면 1로 리셋
- nextSeed: FAIL이면 막힌 지점, PASS면 비우기 (미해결 seed가 있으면 유지)
- FAIL 시: `previousApproach`, `suggestedApproach` 추가
- PASS 시: `nextSeed`, `failSessionArchive`, `previousApproach`, `suggestedApproach` 제거

### 5-D. history.md 갱신

Write로 `history.md`에 행 추가:
- 날짜 연속성 유지: lastCompleted ~ 오늘 사이 빈 날이 있으면 빈 행(`| MM-DD | — | — | — | 0 |`)으로 채움
- 오늘 행: `| MM-DD | {주제} | {PASS/FAIL} | {review 등록 / seed: 질문} | {streak} |`

### 5-E. 대화 원문 추출

`routine.extractTranscript({})` 호출 (project 모드면 context 포함).
- transcript는 사람이 읽는 아카이브다. 세션 복원과 FAIL 이어하기의 canonical source는 JSONL 로그다.
- 실패 시: 경고만 출력, 나머지 정리 계속 진행.

### 5-F. 세션 로그 정리

`routine.appendEntry({ entry: { phase: 5, type: "complete" } })`
`routine.resetLog({})`

### 5-G. PASS 시 선택적 next seed 제안

PASS 경로에서, 세션 중 떠오른 후속 질문이 있으면 nextSeed로 제안한다:
- "이번 세션에서 더 파고들 만한 질문: {question}. 다음 세션에서 이어갈까요?"
- 사용자가 "네" → state.md의 nextSeed에 기록 (failSessionArchive 없이, PASS seed임을 표시)
- 사용자가 무시하거나 "아니요" → 기록하지 않음
- 후속 질문이 자연스럽게 떠오르지 않으면 생략한다. 억지로 만들지 않는다.

### 5-H. 마무리 출력

```
## 루틴 완료

| 항목 | 값 |
|------|---|
| 주제 | {주제} |
| 체크포인트 | {PASS/FAIL} |
| 결과물 | {review 등록: {개념 목록} / next-seed: {질문} + 다음 접근: {suggestedApproach}} |
| streak | {N}일 |
| 총 세션 | {N} |

### 핵심 명제
1. {명제 1} (근거: ...)
2. {명제 2} (근거: ...)
...

### 활용 프레임워크
- {판단 기준 1}
- {판단 기준 2}

{복습 대기 있으면: "복습 대기 {N}개 — review 스킬로 복습하세요."}
{다음 seed 있으면: "다음 세션 seed: {question}"}
```


## 시간 가드레일

- 목표 세션 시간: 60-90분.
- Phase별 시간 가이드:

| Phase | 최소 | 목표 | 최대 |
|-------|------|------|------|
| Phase 0 | 3분 | 5분 | 10분 |
| Phase 1 | 15분 | 30분 | 45분 |
| Phase 2 | 5분 | 15분 | 30분 |
| Phase 3 | 10분 | 15분 | 20분 |
| Phase 4 | 5분 | 10분 | 15분 |
| Phase 5 | 3분 | 5분 | 5분 |

- 75분 경과 시: "75분 경과. 현재 Phase를 마무리하고 다음으로 넘어갈까요?" 안내.
- 90분 초과 시: "90분 초과. Phase {현재}를 마무리하고 체크포인트로 진행합니다." 강한 안내.
- 사용자가 계속을 원하면 진행하되, 120분에서 강제 안내를 반복한다.


## Phase 스킵 정책

- AI가 자체 판단으로 Phase를 건너뛰지 않는다.
- **단, Phase 1에서 총 소요 시간이 50분을 초과하면:**
  1. "Phase 1이 50분을 초과했습니다. Phase 2 축소 모드로 전환할까요?" 확인.
  2. 사용자 동의 시 → Phase 2 축소 모드로 진행.
  3. 사용자가 전체 스킵을 원하면 → Phase 3으로 직행 가능 (사용자 명시 요청 필수).
- Phase 3(코딩)과 Phase 4(체크포인트)는 생략 불가.


## 사용자 신호 규칙

- 확정 신호: `>>다음`, `>>정리`, `>>끝` → 즉시 실행
- 유연 신호: `다음 단계`, `넘어가자`, `코딩하자`, `체크포인트`, `마무리`, `여기까지`
  → "Phase {N+1}로 넘어갈까요?" 확인 1회 후 실행
- 일반 대화 속 "다음", "정리", "끝"은 신호로 인식하지 않는다.


## 규칙

- Phase 순서를 건너뛰지 않는다. 예외는 §Phase 스킵 정책 참조.
- 일반적인 Write는 Phase 5 (`>>정리`) 이후에만 수행한다. **예외: `routine.appendEntry`는 Phase 전환 및 Q&A마다 호출하고, Phase 4의 `inProgress*` 마커 Write는 체크포인트 직후 수행한다.**
- 컨텍스트 복원/Phase 배너/Self-check → §컨텍스트 보존 참조.
- 근거 탐색 우선순위 → `references/evidence-priority.md` 참조.
- 사실적 주장에 "추론:"을 사용하기 전에 웹 검색을 먼저 시도한다.
- 비유는 1:1 대응을 기본으로 한다. 실패 시 도메인 전환 → 추상도 낮추기 → "비유 한계:" 순으로 대응한다.
- AI가 체크포인트 PASS/FAIL을 판정하지 않는다. AI 이해도 평가는 판단 근거 제공용이다.
- Q&A 원문은 오타 수정만 하고 그대로 기록한다.
- `study/`의 학습 내용 문서는 읽기만 한다. `state.md`, `history.md`, JSONL 로그, transcript처럼 루틴이 관리하는 상태 파일만 예외로 수정한다.
