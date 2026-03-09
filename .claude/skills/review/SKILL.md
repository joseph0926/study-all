---
name: review
description: 복습 대기열을 기준으로 1문제씩 출제하고 결과를 study MCP에 기록한다. "복습하자", "복습 시간", "복습 할게", "review 하자", "간격 반복", "외운 거 확인" 등 복습 관련 요청 시 사용한다.
argument-hint: "[skill] [topic]"
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Write, WebSearch, WebFetch, mcp__study__context_resolve, mcp__study__review_getQueue, mcp__study__review_getMeta, mcp__study__review_recordResult, mcp__study__review_saveMeta, mcp__study__review_appendQnA, mcp__study__review_removeConcept
---

입력: `$ARGUMENTS` (`[skill] [topic]`, 둘 다 선택)

---

## 세션 상태 보존

### session-state.md

상태 파일: `study/review/session-state.md`

Phase 전환마다 Write로 갱신한다:

```
# REVIEW-SESSION
updated: {YYYY-MM-DD HH:MM}
skill: {skill|all}
phase: {N}
total: {대기 개념 수}
completed: {완료 수}
scores: first={n} retry={n} wrong={n}
items:
  - {skill}/{topic}/{concept}: {score}
```

복원:
- Phase 0 진입 시 Read
- `# COMPLETED` 또는 파일 없음 → 새 세션
- 활성 내용 + 당일 → "이전 복습 세션: {completed}/{total}개 완료. 이어서 할까요?" 확인
- 활성 내용 + 이전 날짜 → "이전 세션 발견 ({날짜}). 이어서/새로?" → 사용자 선택
- 이어하기 → 남은 개념부터 Phase 1 계속
- 새로 시작 → 새 세션 초기화

---

## Phase 0: 큐 확인

1. `$ARGUMENTS`에서 `[skill] [topic]` 파싱 (둘 다 선택)
2. 세션 복원 체크 (위 참조)
3. 큐 로드:
   - skill 지정 시: `review.getQueue(context={mode=skill, skill=<skill>}, skill=<skill>)`
   - skill 미지정 시: `review.getQueue(context={mode=skill})` → 전체 skill 큐
   - topic 지정 시: 해당 topic 개념만 필터링
4. 큐가 비어있으면: "복습 대기 개념이 없습니다. `/routine`으로 학습을 진행하세요." → 종료
5. 배치 결정: overdueDays 순 정렬, 최대 10개
6. 오리엔테이션 출력:

```
## 복습 세션

| 항목 | 값 |
|------|---|
| 대기 개념 | {총}개 |
| 오늘 목표 | {배치 크기}개 |
| 졸업 누적 | {graduated}개 |

### 오늘 복습 대상
| # | 스킬 | 토픽 | 개념 | 레벨 | overdue |
|---|------|------|------|------|---------|
| 1 | react | useRef-실무-패턴 | plain object 래퍼 | L1 | 3일 |
| ... |
```

7. session-state.md 초기화 Write (phase: 0)
8. 사용자 확인 후 Phase 1 진행

---

## Phase 1: 복습 루프

### 배너

매 응답 첫 줄:
```
> [REVIEW] {completed}/{total}개 | 정답률: {first+retry}/{completed} | 현재: {skill}/{concept}
```

### 1-A. 출제

각 개념에 대해:

1. `review.getMeta(context, skill=<skill>, topic=<topic>)` → 개념의 현재 레벨/streak 확인
2. 학습 기록 참조: `study/{skill}/topics/<topic>/note.md` 또는 MCP가 resolve한 topic note Read → 해당 개념이 다뤄진 부분 탐색
3. 레벨별 출제 전략:

| 레벨 | 인지 수준 | 출제 방식 | 예시 |
|------|----------|----------|------|
| L1 | 회상(Recall) | 핵심 사실/정의 질문 | "useRef의 current가 렌더 간 유지되는 이유는?" |
| L2 | 이해(Understand) | 메커니즘/원리 설명 요구 | "왜 useRef 변경은 리렌더를 트리거하지 않는지 설명해주세요" |
| L3 | 적용(Apply) | 코드 기반 판단/비교 | "이 코드에서 useRef 대신 useState를 쓰면 어떤 문제가 생길까요?" |
| L4 | 평가(Evaluate) | 설계 판단/트레이드오프 | "interval ref vs rAF — 이 상황에서 어떤 접근이 적절한가?" |

출제 형식:
```
### Q{N}. [{skill}/{topic}] {개념명} (L{N})

{질문}
```

### 1-B. 사용자 답변 → 힌트 사다리 피드백

```
사용자 답변
  ├─ 정확 → 인정 + 보충 포인트 → first_pass
  ├─ 부분적 → 맞는 부분 인정 + 힌트 1개 제시 → 재시도 기회
  │   ├─ 재시도 성공 → retry_pass
  │   └─ 재시도 실패 → 핵심 설명 (학습 기록 인용) → wrong
  └─ 모름/오답 → 핵심 설명 (학습 기록 인용) → wrong
```

피드백 원칙:
- **왜 맞았는지/틀렸는지** 설명한다 (채점만 하지 않는다)
- 학습 기록 경로를 인용한다: "이 내용은 `study/{skill}/topics/<topic>/note.md`에서 다뤘습니다"
- 오답 시 정답을 간결하게 설명하되, 전체 강의를 하지 않는다 (그건 `/learn`의 역할)
- L3~L4에서 오답이면 "이 부분은 `/learn {관련 주제}`로 보충하면 좋겠습니다" 제안 가능

### 1-C. 즉시 기록

매 개념 완료 후:
1. `review.recordResult(context, skill, topic, concept, score)` → 간격/레벨 업데이트
2. 결과 응답에서 `nextReviewDate`, `level`, `graduated` 확인
3. 변동 보고: "L1→L2 승급, 다음 복습: 7일 후" 또는 "L2→L1 하락, 내일 다시"
4. session-state.md 갱신 (completed++, scores 업데이트)
5. 다음 개념으로 이동

### 1-D. 배치 완료 또는 `>>정리`

- 배치 내 모든 개념 완료 → Phase 2 자동 진입
- `>>정리` → 현재까지 완료된 내용으로 Phase 2 진입
- 배치 완료 후 남은 대기 개념이 있으면: "남은 {N}개를 계속할까요?" 확인

---

## Phase 2: 정리

### 2-A. Q&A 기록

`review.appendQnA(context, skill, topic, items)` 호출:
- 세션 중 수행한 모든 Q&A를 topic별로 그룹화하여 기록
- 각 item: `{ concept, question, userAnswer, hint?, score, level }`

### 2-B. 세션 요약 출력

```
## 복습 완료

| 항목 | 값 |
|------|---|
| 복습 개념 | {N}개 |
| 정답률 | {first+retry}/{total} ({%}) |
| first_pass | {N}개 |
| retry_pass | {N}개 |
| wrong | {N}개 |

### 레벨 변동
| 개념 | 변동 | 다음 복습 |
|------|------|----------|
| {concept} | L1→L2 | {date} |
| {concept} | L2→L1 | 내일 |

{졸업 있으면}
### 신규 졸업
- {concept} (streak 3+, 간격 반복 완료)

{오답 있으면}
### 틀린 개념
- {concept}: {간략한 핵심 포인트} → 다음 복습: 내일

{남은 대기 있으면}
복습 대기 {N}개 남음 — 다시 `/review`로 이어갈 수 있습니다.
```

### 2-C. 세션 종료

session-state.md → `# COMPLETED\n` 마커로 Write

---

## 사용자 신호 규칙

- `>>정리` 또는 `>>끝` — 현재까지 완료된 내용으로 Phase 2 실행
- `>>건너뛰기` — 현재 개념을 건너뛰고 다음으로 (점수 기록 안 함)
- 일반 대화 속 "정리", "끝"은 신호로 인식하지 않는다 (`>>` 접두사 필수).

## 규칙

- 간격/레벨 계산을 프롬프트에서 재구현하지 않는다. MCP `recordResult`의 결과를 신뢰한다.
- 학습 기록(`study/{skill}/topics/` 및 legacy topic note)은 읽기만 한다. 수정하지 않는다.
- 쓰기 동작은 Phase 2(`>>정리` 이후)에만 수행한다. 예외: `recordResult`(매 개념), `session-state.md`(Phase 전환).
- 출제 시 학습 기록을 반드시 참조한다. 학습 기록 없이 일반 지식만으로 출제하지 않는다.
- AI가 자체 판단으로 Phase를 건너뛰지 않는다.
