---
name: routine
description: learn → study → checkpoint → forge 파이프라인을 하나의 세션에서 오케스트레이션 — 매 세션이 판단 프레임워크 또는 다음 질문으로 끝남
argument-hint: "[주제]"
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Write, WebSearch, WebFetch, mcp__study__routine_appendEntry, mcp__study__routine_readLog, mcp__study__routine_resetLog, mcp__study__stats_getDashboard, mcp__study__review_getQueue
---

입력: `$ARGUMENTS` (선택. 예: `Suspense 타이밍`, 비어있으면 이전 seed 또는 대시보드 기반 제안)

---

## 컨텍스트 보존 (필수)

이 파이프라인은 90분+ 세션을 전제한다. 컨텍스트 컴팩션이 발생해도 오케스트레이션을 유지하기 위해 아래 3가지를 반드시 지킨다.

### A. Phase 배너

**매 응답의 첫 줄**에 아래 형식의 배너를 출력한다:

```
> [ROUTINE] Phase {N}/5 | {주제} | Q&A: {누적횟수} | 경과: {분}분
```

### B. JSONL 세션 로그 (`routine.appendEntry` / `routine.readLog`)

`session-state.md` 대신 JSONL 기반 세션 로그를 사용한다.

**기록 시점:**
- Phase 전환 시: `routine.appendEntry({ entry: { phase, type: "phase_end", summary } })`
- Phase 1-2 매 Q&A 완료 후: `routine.appendEntry({ entry: { phase, type: "qa", question, keyInsight, refs, links } })`
- Phase 3 체크포인트: `routine.appendEntry({ entry: { phase: 3, type: "checkpoint", q1, q1Answer, q2, q2Answer, result } })`
- Phase 5 완료: `routine.appendEntry({ entry: { phase: 5, type: "complete" } })`

**복원:** `routine.readLog({})` → exists, topic, currentPhase, qaCount, entries 로 맥락 복원.

### C. Self-check 규칙

- **Phase 전환 직후**: `routine.readLog({})` 호출하여 상태 확인 후 진행.
- **응답 생성 시 현재 Phase가 불확실하면**: 즉시 `routine.readLog({})` 호출하고 해당 상태 기준으로 진행.
- readLog 결과와 대화 컨텍스트가 충돌하면 **readLog를 신뢰**한다 (로그가 더 최신).

---

## Phase 0: 오리엔테이션 (5분)

### 0-PRE. 이전 세션 이어하기 체크 (최우선)

1. `routine.readLog({})` 호출
2. `exists=true` + 마지막 entry의 type이 `"complete"`가 아님 → 이전 세션 발견:
   - 사용자에게 보고: "이전 세션: {topic}, Phase {currentPhase}, Q&A {qaCount}회. 이어서 할까요?"
   - **이어하기** → entries에서 맥락 복원, 해당 Phase 진입
   - **새로 시작** → `routine.resetLog({ archive: true })` 후 아래 정상 흐름
3. `exists=false` 또는 마지막 entry가 `"complete"` → 정상 흐름 (아래 계속)

### 0-A. 상태 확인

1. `study/.routine/state.md` Read — streak, nextSeed 확인
2. `study/.routine/history.md` Read — 최근 5행 로드
3. `stats.getDashboard(context={mode: "skill"})`로 전체 학습 상태 확인
4. `review.getQueue(context={mode: "skill"})`로 복습 대기 확인

5. 시작 시각 기록 (내부 추적용, `startTime: HH:MM` 메모)

### 0-B. 오늘의 시드 결정 (우선순위)

- A) `$ARGUMENTS`가 있으면 → 그 주제
- B) state.md에 nextSeed가 있으면 → 제안 ("이전 세션에서 남긴 질문: {question}. 이어서 할까요?")
- C) 복습 대기가 있으면 → 제안 ("복습 대기 {N}개. 복습 기반으로 시작할까요?")
- D) 없으면 → "오늘 궁금한 게 뭔가요?"

### 0-C. ref/ 소스 탐색

1. `Glob("ref/*/")` → ref/ 하위 디렉토리 목록
2. AI가 주제명으로 관련 ref/ 디렉토리 선택 (복수 가능)
3. 매칭 없으면: "ref/에 관련 소스 없음, 웹 검색 중심으로 진행합니다"

### 0-D. 오리엔테이션 보고

사용자에게 보고:

```
## 루틴 시작
streak: {N}일 | 총 세션: {N} | 총 forge: {N}

### 최근 기록
{history 최근 5행 테이블}

### 오늘의 시드
{결정된 시드 또는 제안}

### ref/ 소스
{선택된 ref/ 디렉토리 또는 "관련 소스 없음"}

{어제 루틴 없으면: "어제 루틴 없음 — 오늘 다시 시작!"}
{미해결 seed 있으면: "미해결 seed {N}개: {목록}"}
```

### 0-E. 세션 시작 기록

사용자가 주제를 확정하면:

`routine.appendEntry({ entry: { phase: 0, type: "init", topic: "{주제명}", refDirs: ["{선택된 ref 디렉토리}"] } })`

Phase 1 진행.

---

## Phase 1: 탐색 — learn 패턴 (30-45분)

사용자의 궁금증에서 출발하여 자유롭게 탐색한다.

### 1-A. 근거 탐색

우선순위를 순서대로 시도한다:

| 우선순위 | 소스 | 도구 | 조건 |
|---------|------|------|------|
| 1 | `ref/` 하위 소스코드 | Glob, Grep, Read | 관련 코드 존재 시 `file:line` 인용 |
| 2 | 웹 검색 | WebSearch, WebFetch | ref/에서 충분한 근거를 못 찾은 경우 |
| 3 | 추론 | — | 1+2 결과를 바탕으로 AI가 추론. 반드시 "추론:" 접두사 명시 |

ref/ 폴백 규칙:
- ref/ 탐색 결과가 없을 때: "ref/에 관련 소스 없음, 웹 검색으로 전환합니다" 사용자 알림 후 우선순위 2로 진행
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
- **매 Q&A 완료 후**: `routine.appendEntry({ entry: { phase: 1, type: "qa", question: "{질문}", keyInsight: "{핵심}", refs: ["{file:line}"], links: ["{url}"] } })`
- `>>다음` 신호로 Phase 2 진행. 3회 미만이면 "아직 Q&A {N}회입니다. 더 탐색하시겠어요?" 확인.
- `>>다음` 시: `routine.appendEntry({ entry: { phase: 1, type: "phase_end", summary: "{Phase 1 요약}" } })` → Phase 2 진행.

---

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
- **매 Q&A 완료 후**: `routine.appendEntry({ entry: { phase: 2, type: "qa", question: "{질문}", keyInsight: "{핵심}", refs: ["{file:line}"], links: ["{url}"] } })`

`>>다음` 신호로 Phase 3 진행.
- `>>다음` 시: `routine.appendEntry({ entry: { phase: 2, type: "phase_end", summary: "{Phase 2 요약}" } })` → Phase 3 진행.

---

## Phase 3: 체크포인트 (10분)

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
- **PASS** → mini-forge로 넘어갑니다 (Phase 4)
- **FAIL** → 정확한 gap을 기록하고 다음 세션 seed로 남깁니다 (Phase 5)

FAIL은 "나는 정확히 여기서 모른다"를 아는 것입니다. 부정적인 것이 아닙니다.
```

- **PASS** → `routine.appendEntry({ entry: { phase: 3, type: "checkpoint", q1, q1Answer, q2, q2Answer, result: "PASS" } })` → Phase 4 진행
- **FAIL** → 사용자에게 "어디서 막혔나요?" 확인 → `routine.appendEntry({ entry: { phase: 3, type: "checkpoint", q1, q1Answer, q2, q2Answer, result: "FAIL" } })` → Phase 5로 건너뜀

규칙:
- Claude가 PASS/FAIL을 판정하지 않는다. 사용자 자기 평가.
- FAIL에 부정적 뉘앙스 없음. "정확한 gap 발견"으로 프레이밍.

---

## Phase 4: 결정화 — mini-forge (20-30분)

체크포인트 PASS 시에만 진입.

### 4-A. 원칙 추출

이번 세션 학습 내용에서 핵심 원칙 1개를 추출한다:
- **이름**: 2~5단어
- **한 줄 요약**: 1문장
- **근거**: `file:line` 또는 출처
- **"나라면"**: Phase 3 Q2의 대안 설계 + 트레이드오프

### 4-B. 판단 시나리오

원칙을 기반으로 실전 시나리오 1~2개를 구성한다:
- **상황**: 실제 코딩/설계 시 마주치는 상황
- **떠올려**: 어떤 원칙을 떠올려야 하는지
- **안티패턴**: 이렇게 하면 안 되는 이유

### 4-C. 기억법

한 줄 비유 또는 이미지로 원칙을 기억할 수 있게 정리한다.

### 4-D. 사용자 확인

mini-forge 결과를 보여주고 사용자 확인을 받는다.
수정 요청이 있으면 반영한다.

`>>정리` 또는 `>>끝` 또는 사용자 확인으로 Phase 5 진행.

---

## Phase 5: 정리 (5분)

### 5-A. 결과물 기록

**PASS 경로** (Phase 4 완료):
1. `study/.routine/forges/{YYYY-MM-DD}-{주제}.md`에 mini-forge Write.

**FAIL 경로** (Phase 3에서 직행):
1. state.md의 nextSeed에 막힌 지점 기록.

### 5-B. state.md 갱신

Write로 `study/.routine/state.md` 갱신:
- `lastCompleted`: 오늘 날짜
- `totalSessions`: +1
- `totalForges`: PASS면 +1
- `totalSeeds`: FAIL면 +1
- streak 계산: lastCompleted가 어제면 streak+1, 아니면 1로 리셋
- nextSeed: FAIL이면 막힌 지점, PASS면 비우기 (미해결 seed가 있으면 유지)

### 5-C. history.md 갱신

Write로 `study/.routine/history.md`에 행 추가:
- 날짜 연속성 유지: lastCompleted ~ 오늘 사이 빈 날이 있으면 빈 행(`| MM-DD | — | — | — | 0 |`)으로 채움
- 오늘 행: `| MM-DD | {주제} | {PASS/FAIL} | {forge: 파일명 / seed: 질문} | {streak} |`

### 5-D. 세션 로그 정리

`routine.appendEntry({ entry: { phase: 5, type: "complete" } })`
`routine.resetLog({ archive: true })`

### 5-E. 마무리 출력

```
## 루틴 완료

| 항목 | 값 |
|------|---|
| 주제 | {주제} |
| 체크포인트 | {PASS/FAIL} |
| 결과물 | {forge 파일명 / next-seed 질문} |
| streak | {N}일 |
| 총 세션 | {N} |

{복습 대기 있으면: "복습 대기 {N}개 — `/review`로 복습하세요."}
{다음 seed 있으면: "다음 세션 seed: {question}"}
```

---

## 시간 가드레일

- Phase 진입 시 시작 시각 대비 경과 시간을 체크한다.
- 90분 초과 시: "90분이 경과했습니다. 현재 Phase를 마무리하고 정리로 넘어갈까요?" 확인.
- 사용자가 계속을 원하면 진행, 아니면 현재 Phase 완료 후 Phase 5로 유도.

---

## mini-forge 문서 템플릿

파일: `study/.routine/forges/{YYYY-MM-DD}-{주제}.md`

```markdown
# Mini-Forge: {주제}
> 날짜: YYYY-MM-DD
> 세션: #{totalSessions}
> 체크포인트: PASS

## 원칙
> {한 줄 요약}

**근거**: {file:line 또는 출처}
**나라면**: {대안 설계 + 트레이드오프}

## 판단 시나리오

### 상황 1: {실무 상황}
**떠올려**: {어떤 원칙}
**안티패턴**: {이렇게 하면 안 되는 이유}

### 상황 2: {실무 상황}
**떠올려**: {어떤 원칙}
**안티패턴**: {이렇게 하면 안 되는 이유}

## 기억법
{한 줄 비유 또는 이미지}
```

---

## 사용자 신호 규칙

- `>>다음` — Phase 전환 (Phase 1→2, Phase 2→3)
- `>>정리` 또는 `>>끝` — 현재 Phase 완료 후 Phase 5 실행
- 일반 대화 속 "다음", "정리", "끝"은 신호로 인식하지 않는다 (`>>` 접두사 필수).

---

## 규칙

- Phase 순서를 건너뛰지 않는다. 예외: FAIL 시 Phase 4 → Phase 5 직행.
- 쓰기 동작은 Phase 5 (`>>정리`) 이후에만 수행한다. **예외: `routine.appendEntry`는 Phase 전환 및 Q&A마다 호출한다.**
- **컨텍스트 복원**: 현재 Phase나 진행 상태가 불확실하면, `routine.readLog({})` 호출 후 해당 상태 기준으로 진행한다.
- **Phase 배너**: 매 응답 첫 줄에 `> [ROUTINE] Phase {N}/5 | ...` 배너를 반드시 출력한다.
- ref/ 코드가 있으면 반드시 먼저 탐색한다. 웹 검색만으로 대체하지 않는다.
- ref/ 전환 알림 필수: ref/ 탐색 결과 없을 시 "ref/에 관련 소스 없음, 웹 검색으로 전환합니다" 알림 후 진행.
- 근거의 출처(ref 코드/웹/추론)를 항상 명시한다.
- 웹 소스 인용 시 버전 또는 날짜를 반드시 병기한다.
- 비유는 1:1 대응을 기본으로 한다. 불가 시 "비유 한계:" 처리.
- Claude가 체크포인트 PASS/FAIL을 판정하지 않는다. 사용자 자기 평가.
- Q&A 원문은 오타 수정만 하고 그대로 기록한다.
- 기존 study/ 파일은 읽기만 한다. 수정하지 않는다.
- AI가 자체 판단으로 Phase를 건너뛰지 않는다.
