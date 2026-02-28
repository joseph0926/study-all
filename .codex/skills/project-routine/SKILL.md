---
name: project-routine
description: 커스텀 프로젝트 대상 learn → study → checkpoint → forge 오케스트레이션. 프로젝트 코드/문서를 우선 탐색하고 세션 상태를 <project>/.study/.routine에 기록한다. Codex에서는 `$project-routine <project-path> [주제]`으로 호출한다.
---

# project-routine

입력: `$project-routine <project-path> [주제]`

예시:
- `/path/to/my-app`
- `/path/to/my-app 인증 상태 동기화`


## 컨텍스트 보존 (필수)

### A. Phase 배너

매 응답 첫 줄:

```
> [PROJECT-ROUTINE] Phase {N}/6 | {주제} | Q&A: {누적횟수} | 경과: {분}분
```

### B. JSONL 세션 로그 (`routine.*`, project context)

다음 호출은 반드시 project context를 포함한다:

- `routine.appendEntry({ context: { mode: "project", projectPath }, entry: ... })`
- `routine.readLog({ context: { mode: "project", projectPath } })`
- `routine.resetLog({ context: { mode: "project", projectPath } })`

로그 경로: `<project>/.study/.routine/.session-log.jsonl`

**원문 보존 원칙:**
- `userQuestion`, `aiAnswer`, `q1Answer`, `q2Answer`, `aiFeedback`은 축약/요약 없이 **원문 그대로** 저장한다.
- 오타 수정만 허용하며, 내용 변경/축약은 금지한다.
- JSONL 한 줄이 길어지는 것은 허용한다 — 원문 보존이 축약보다 우선한다.

**복원:** `routine.readLog({ context: { mode: "project", projectPath } })` → phaseSummaries로 전체 흐름 파악, entries(최근 5개)로 상세 맥락 복원.
필요 시 `routine.readLog({ context: { mode: "project", projectPath }, entriesMode: "full" })` 재호출.

### C. Self-check 규칙

- Phase 전환 직후 `routine.readLog`로 현재 phase 확인
- phase 불확실 시 `routine.readLog` 재호출
- 대화 문맥과 로그가 충돌하면 로그를 신뢰
- **루틴 외 작업 후 복귀 감지**: 직전 AI 응답에 Phase 배너(`[PROJECT-ROUTINE]`)가
  없으면 중간 인터럽션으로 간주한다:
  1. `routine.readLog({ context: { mode: "project", projectPath } })` 호출하여 현재 상태 확인
  2. 복귀 배너 출력:
     ```
     > [PROJECT-ROUTINE] 복귀 | Phase {N}/6 | {주제} | Q&A: {N}
     > 이전 상태에서 계속합니다.
     ```
  3. 해당 Phase 진행 계속


## Phase 0: 오리엔테이션

1. `$ARGUMENTS`에서 `<project-path>` + `[주제]` 파싱
2. `context.resolve(mode=project, projectPath=<project-path>)`
3. `routine.readLog(project context)`로 이어하기 확인

### 0-PRE-FAIL. FAIL 세션 이어가기 체크

`<project>/.study/.routine/state.md`에 `nextSeed` + `failSessionArchive`가 있으면:

1. `failSessionArchive` 경로의 아카이브 JSONL 파일을 Read
2. 아카이브 entries에서 이전 세션의 전체 Q&A 맥락 복원
3. 사용자에게 보고:
   ```
   이전 FAIL 세션 복원:
   - 주제: {topic}
   - Q&A {N}회 학습 내용 로드 완료
   - gap: {nextSeed}
   이전 학습을 기반으로 gap 주제부터 이어갑니다.
   ```
4. 이전 세션의 Q&A 내용을 컨텍스트로 유지한 채 Phase 1 진입
   - Phase 1은 gap(nextSeed) 주제에 집중하되, 이전 학습 전체를 포괄
5. Phase 5 mini-forge 작성 시: **이전 FAIL 세션 + 현재 세션** 학습 내용을 모두 포함
6. PASS 시: `state.md`에서 `nextSeed`, `failSessionArchive` 제거

4. `<project>/.study/.routine/state.md`, `history.md` 읽기 (없으면 새로 시작)
5. `stats.getDashboard(context={mode: "skill"})`로 전체 학습 상태 확인
6. `review.getQueue(context={mode: "project", projectPath=<project-path>})`로 프로젝트 복습 대기 확인

시드 우선순위:
- A) 인자 주제
- B) state.md nextSeed
- C) 프로젝트 복습 대기
- D) 사용자 입력

세션 시작:

`routine.appendEntry({ context: { mode: "project", projectPath }, entry: { phase: 0, type: "init", topic, projectPath } })`


## Phase 1: 탐색 (learn 패턴)

근거 우선순위:

| 우선순위 | 소스 | 조건 |
|---|---|---|
| 1 | 프로젝트 소스코드 | `file:line` 인용 필수 |
| 2 | 프로젝트 문서 (README, docs, ADR) | 존재 시 |
| 3 | ref/ 교차참조 | import 라이브러리 소스가 있을 때 |
| 4 | 웹 검색 | 내부 근거가 부족할 때 |
| 5 | 추론 | 1~4 근거 기반, `추론:` 접두사 |

- 최소 Q&A 3회 목표
- 매 Q&A 후 `routine.appendEntry` 기록 (`phase: 1, type: "qa"`)
- `>>다음`이면 `phase_end` 기록 후 Phase 2


## Phase 2: 심화 (study 패턴)

- 핵심 함수/구조체를 코드 레벨로 추적
- 설계 의도(주석/커밋/구조)와 대안 트레이드오프 설명
- 1~2개 코드 기반 질문으로 이해 확인
- 매 Q&A 후 `routine.appendEntry` (`phase: 2, type: "qa"`)
- `>>다음`이면 `phase_end` 기록 후 Phase 3


## Phase 3: 라이브 코딩 (15-20분)

Phase 2에서 심화한 내용을 실제 코드로 작성하여 검증한다.

### 3-A. 과제 출제

AI가 오늘 학습 주제 기반으로 코딩 과제 1개를 출제한다 (프로젝트 코드 컨텍스트 포함).

과제 유형 (주제에 따라 AI가 가장 적합한 것을 선택):

| 유형 | 설명 | 적합한 경우 |
|------|------|-----------|
| 구현 | 학습한 메커니즘의 핵심 로직 직접 구현 | 새 개념을 배운 경우 |
| 디버깅 | 버그가 있는 코드에서 문제를 찾고 수정 | 동작 원리를 깊게 다룬 경우 |
| 리팩터링 | 안티패턴 코드를 올바른 패턴으로 수정 | 설계 원칙을 다룬 경우 |
| 빈칸 채우기 | 핵심 부분이 빈칸인 코드를 완성 | 특정 API/패턴 숙달이 목표인 경우 |

### 3-B. 코드 작성

사용자가 실제 언어(TS/JS 등)로 코드를 작성한다. AI는 기다린다.

### 3-C. 힌트 사다리 피드백

1차 리뷰 (답 보류): 틀린 부분이 있으면 어디가 틀렸는지만 지적, 정답 미공개.
재시도 기회 (1회): 사용자가 수정한 코드를 다시 제출. 수정을 원하지 않으면 바로 모범 답안.
2차 리뷰 (모범 답안 공개): 최종 코드와 모범 답안 비교, 차이점 분석, 학습 포인트 정리.

### 3-D. 기록

`routine.appendEntry({ context: { mode: "project", projectPath }, entry: { phase: 3, type: "coding", challengeType, challenge, userCode, review, result } })`

`>>다음` 시: `routine.appendEntry({ context: { mode: "project", projectPath }, entry: { phase: 3, type: "phase_end", summary } })` → Phase 4 진행.


## Phase 4: 체크포인트

질문:
1. "이 동작이 왜 이렇게 설계됐는가?"
2. "나라면 어떻게 바꾸고 어떤 비용을 감수할까?"

사용자 자기평가:
- PASS: Phase 5 진행
- FAIL: gap을 nextSeed로 남기고 Phase 6 직행

기록:

`routine.appendEntry({ context: { mode: "project", projectPath }, entry: { phase: 4, type: "checkpoint", q1, q1Answer, q2, q2Answer, result } })`

### 증분 체크포인트

Phase 4 결과 기록 직후, `<project>/.study/.routine/state.md`에 진행 중 마커를 Write:

```
inProgressSession: {topic}
inProgressPhase: 4
inProgressResult: PASS|FAIL
inProgressDate: {YYYY-MM-DD}
```

Phase 6에서 state.md 최종 갱신 시 `inProgress*` 필드를 제거한다.

Phase 0에서 state.md 읽을 때 `inProgressSession`이 있으면:
- JSONL이 없으나 inProgress가 있음 = 비정상 종료 발생
- 해당 날짜 아카이브 JSONL 탐색하여 복원 시도


## Phase 5: mini-forge

체크포인트 PASS에서만 수행:

- 원칙 1개 추출 (이름/한 줄/근거/트레이드오프)
- 실전 시나리오 1~2개
- 기억법 1줄

사용자 확인 후 `>>정리` 또는 `>>끝` 시 Phase 6


## Phase 6: 정리

기록 경로:
- PASS: `<project>/.study/.routine/forges/{YYYY-MM-DD}-{주제}.md`
- FAIL: `<project>/.study/.routine/state.md`의 nextSeed 갱신

### 6-D. 대화 원문 추출

`routine.extractTranscript({ context: { mode: "project", projectPath: "<project-path>" } })` 호출.
- 저장: `<project>/.study/.routine/transcripts/{YYYY-MM-DD}-{주제}.md`
- 실패 시: 경고만 출력, 나머지 정리 계속 진행.

필수 갱신:
- `<project>/.study/.routine/state.md`
- `<project>/.study/.routine/history.md`
- `routine.appendEntry({ phase: 6, type: "complete" })`
- `routine.resetLog({})`


## 사용자 신호 규칙

- `>>다음` — Phase 전환
- `>>정리` 또는 `>>끝` — 현재 Phase 마감 후 Phase 6
- 일반 문장 속 "다음/정리/끝"은 신호로 인식하지 않음


## 규칙

- Phase 순서를 건너뛰지 않는다 (FAIL만 Phase 5 생략)
- 쓰기 동작은 Phase 6에서만 수행한다
예외: `routine.appendEntry`는 Q&A/전환 시 즉시 기록
- 프로젝트 코드/문서를 먼저 탐색하고, 웹 검색만으로 대체하지 않는다
- 근거 출처(코드/문서/웹/추론)를 항상 명시한다
