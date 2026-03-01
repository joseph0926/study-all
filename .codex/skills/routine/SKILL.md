---
name: routine
description: 메인 학습 파이프라인 (learn→study→coding→checkpoint→review) — 프로젝트 경로를 지정하면 프로젝트 모드로 동작한다 Codex에서는 `$routine [project-path] [주제]`으로 호출한다.
---

# routine

입력: `$routine [project-path] [주제]`

## 모드 판별

`$ARGUMENTS`의 첫 토큰이 `/`로 시작하는 경로면 → **project 모드**, 아니면 → **skill 모드**.

- project 모드: `<project-path>` + `[주제]` 파싱 → `context.resolve(mode=project, projectPath=<project-path>)`
- skill 모드: 별도 context.resolve 불필요 (기본)

모드에 따라 아래가 달라진다:
- 상태 경로: skill → `study/.routine/`, project → `{project}/.study/.routine/`
- 근거 탐색 우선순위
- Phase 배너 접두사
- `routine.*` 호출 시 context 전달


## 컨텍스트 보존 (필수)

이 파이프라인은 105분+ 세션을 전제한다. 컨텍스트 컴팩션이 발생해도 오케스트레이션을 유지하기 위해 아래 3가지를 반드시 지킨다.

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

- A) `$ARGUMENTS`에서 주제가 있으면 → 그 주제
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


## Phase 1: 탐색 — learn 패턴 (30-45분)

사용자의 궁금증에서 출발하여 자유롭게 탐색한다.

### 1-A. 근거 탐색

모드별 우선순위를 순서대로 시도한다:

**skill 모드:**

| 우선순위 | 소스 | 도구 | 조건 |
|---------|------|------|------|
| 1 | `ref/` 하위 소스코드 | Glob, Grep, Read | 관련 코드 존재 시 `file:line` 인용 |
| 2 | 웹 검색 | WebSearch, WebFetch | ref/에서 충분한 근거를 못 찾은 경우 |
| 3 | 추론 | — | 1+2 결과를 바탕으로 AI가 추론. 반드시 "추론:" 접두사 명시 |

**project 모드:**

| 우선순위 | 소스 | 조건 |
|---|---|---|
| 1 | 프로젝트 소스코드 | `file:line` 인용 필수 |
| 2 | 프로젝트 문서 (README, docs, ADR) | 존재 시 |
| 3 | ref/ 교차참조 | import 라이브러리 소스가 있을 때 |
| 4 | 웹 검색 | 내부 근거가 부족할 때 |
| 5 | 추론 | 1~4 근거 기반, `추론:` 접두사 |

ref/ 폴백 규칙:
- ref/ 탐색 결과가 없을 때: "ref/에 관련 소스 없음, 웹 검색으로 전환합니다" 사용자 알림 후 진행
- 웹 소스 인용 시 버전 또는 날짜를 반드시 병기한다.

### 1-B. 답변 구조

아래 순서로 답변한다:
- **비유** — 핵심 개념마다 실생활 비유를 먼저 제시. 1:1 대응 명시. 불가 시 "비유 한계:" 처리.
- **코드/텍스트 설명** — 비유 프레임 위에 근거. `file:line` 또는 출처 URL 포함.
- **시각화** — ASCII 다이어그램/테이블로 핵심 정리.
- **연결** — `study/` 스캔으로 기존 학습 내용과 연결 탐색.

### 1-C. 반복

- 사용자의 추가 질문을 대기. 최소 Q&A 3회를 목표로 한다.
- 매 Q&A에서 근거 소스를 명시한다.
- **매 Q&A 완료 후**: `routine.appendEntry({ entry: { phase: 1, type: "qa", userQuestion: "{사용자 질문 원문}", aiAnswer: "{AI 응답 원문}", refs: ["{file:line}"], links: ["{url}"] } })`
- `>>다음` 신호로 Phase 2 진행. 3회 미만이면 "아직 Q&A {N}회입니다. 더 탐색하시겠어요?" 확인.
- `>>다음` 시: `routine.appendEntry({ entry: { phase: 1, type: "phase_end", summary: "{Phase 1 요약}" } })` → Phase 2 진행.


## Phase 2: 심화 — study 패턴 (30-45분)

Phase 1에서 탐색한 주제를 소스코드 수준으로 심화한다.

### 2-A. 코드 추적

- Glob, Grep, Read로 관련 소스코드를 탐색한다.
- `file:line` 경로를 확보한다.
- 핵심 구조체/함수의 필드별 존재 이유를 설명한다.

### 2-B. 설계 의도 추적

- PR/주석/git blame 근거를 탐색한다 (가능한 경우).
- "왜 이 설계인가?" + "대안은?" 질문에 답한다.
- 대안이 있으면 미채택 이유를 설명한다.

### 2-C. Q&A

- 1~2문제 출제 (코드 기반):
  - "이 함수가 X를 하는 이유는?"
  - "Y 대신 Z를 쓴 이유는?"
- 오답 시 보충 설명, 정답 시 진행.
- **매 Q&A 완료 후**: `routine.appendEntry({ entry: { phase: 2, type: "qa", userQuestion: "{사용자 질문 원문}", aiAnswer: "{AI 응답 원문}", refs: ["{file:line}"], links: ["{url}"] } })`

`>>다음` 신호로 Phase 3 진행.
- `>>다음` 시: `routine.appendEntry({ entry: { phase: 2, type: "phase_end", summary: "{Phase 2 요약}" } })` → Phase 3 진행.


## Phase 3: 라이브 코딩 (15-20분)

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


## Phase 4: 체크포인트 (10분)

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

### 피드백

사용자 답변을 기반으로 피드백한다:
- 빠진 부분 지적 (예: "X 부분이 빠졌습니다")
- 오개념 교정 (예: "실제로는 Y입니다")
- 잘 답한 부분 인정

### 자기 평가

```
자기 평가를 해주세요:
- **PASS** → 핵심 개념을 review에 등록하고 정리합니다 (Phase 5)
- **FAIL** → gap을 기록하고 다음 접근 방식을 제안합니다 (Phase 5)

FAIL은 "나는 정확히 여기서 모른다"를 아는 것입니다. 부정적인 것이 아닙니다.
```

### PASS 경로

1. 세션에서 다룬 핵심 개념 3~5개를 추출한다.
2. 사용자에게 개념 목록을 보여주고 확인을 받는다.
3. `review.saveMeta` 호출하여 개념들을 L1/streak:0/nextReview:내일로 등록한다.
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
- FAIL에 부정적 뉘앙스 없음. "정확한 gap 발견"으로 프레이밍.


## Phase 5: 정리 (5분)

### 5-A. 결과물 기록

**PASS 경로:**
1. review 등록 완료를 보고한다 (Phase 4에서 이미 `review.saveMeta` 호출됨).

**FAIL 경로:**
1. state.md의 nextSeed에 막힌 지점 기록.
2. state.md에 접근 방식 기록:
   - `previousApproach`: 이번 세션의 접근 방식 설명
   - `suggestedApproach`: 다음 세션에 시도할 다른 방향 제안
3. state.md의 `failSessionArchive`에 아카이브될 JSONL 경로 기록.

### 5-B. state.md 갱신

Write로 `state.md` 갱신:
- `lastCompleted`: 오늘 날짜
- `totalSessions`: +1
- `totalSeeds`: FAIL면 +1
- streak 계산: lastCompleted가 어제면 streak+1, 아니면 1로 리셋
- nextSeed: FAIL이면 막힌 지점, PASS면 비우기 (미해결 seed가 있으면 유지)
- FAIL 시: `previousApproach`, `suggestedApproach` 추가
- PASS 시: `nextSeed`, `failSessionArchive`, `previousApproach`, `suggestedApproach` 제거

### 5-C. history.md 갱신

Write로 `history.md`에 행 추가:
- 날짜 연속성 유지: lastCompleted ~ 오늘 사이 빈 날이 있으면 빈 행(`| MM-DD | — | — | — | 0 |`)으로 채움
- 오늘 행: `| MM-DD | {주제} | {PASS/FAIL} | {review 등록 / seed: 질문} | {streak} |`

### 5-D. 대화 원문 추출

`routine.extractTranscript({})` 호출 (project 모드면 context 포함).
- 실패 시: 경고만 출력, 나머지 정리 계속 진행.

### 5-E. 세션 로그 정리

`routine.appendEntry({ entry: { phase: 5, type: "complete" } })`
`routine.resetLog({})`

### 5-F. 마무리 출력

```
## 루틴 완료

| 항목 | 값 |
|------|---|
| 주제 | {주제} |
| 체크포인트 | {PASS/FAIL} |
| 결과물 | {review 등록: {개념 목록} / next-seed: {질문} + 다음 접근: {suggestedApproach}} |
| streak | {N}일 |
| 총 세션 | {N} |

{복습 대기 있으면: "복습 대기 {N}개 — `$review`로 복습하세요."}
{다음 seed 있으면: "다음 세션 seed: {question} (접근: {suggestedApproach})"}
```


## 시간 가드레일

- Phase 진입 시 시작 시각 대비 경과 시간을 체크한다.
- 105분 초과 시: "105분이 경과했습니다. 현재 Phase를 마무리하고 정리로 넘어갈까요?" 확인.
- 사용자가 계속을 원하면 진행, 아니면 현재 Phase 완료 후 Phase 5으로 유도.


## 사용자 신호 규칙

- `>>다음` — Phase 전환 (Phase 1→2, Phase 2→3, Phase 3→4)
- `>>정리` 또는 `>>끝` — 현재 Phase 완료 후 Phase 5 실행
- 일반 대화 속 "다음", "정리", "끝"은 신호로 인식하지 않는다 (`>>` 접두사 필수).


## 규칙

- Phase 순서를 건너뛰지 않는다.
- 쓰기 동작은 Phase 5 (`>>정리`) 이후에만 수행한다. **예외: `routine.appendEntry`는 Phase 전환 및 Q&A마다 호출한다.**
- **컨텍스트 복원**: 현재 Phase나 진행 상태가 불확실하면, `routine.readLog({})` 호출 후 해당 상태 기준으로 진행한다.
- **Phase 배너**: 매 응답 첫 줄에 Phase 배너를 반드시 출력한다.
- skill 모드: ref/ 코드가 있으면 반드시 먼저 탐색한다. 웹 검색만으로 대체하지 않는다.
- project 모드: 프로젝트 코드/문서를 먼저 탐색하고, 웹 검색만으로 대체하지 않는다.
- ref/ 전환 알림 필수: ref/ 탐색 결과 없을 시 알림 후 진행.
- 근거의 출처(ref 코드/웹/추론)를 항상 명시한다.
- 웹 소스 인용 시 버전 또는 날짜를 반드시 병기한다.
- 비유는 1:1 대응을 기본으로 한다. 불가 시 "비유 한계:" 처리.
- AI가 체크포인트 PASS/FAIL을 판정하지 않는다. 사용자 자기 평가.
- Q&A 원문은 오타 수정만 하고 그대로 기록한다.
- 기존 study/ 파일은 읽기만 한다. 수정하지 않는다.
- AI가 자체 판단으로 Phase를 건너뛰지 않는다.
