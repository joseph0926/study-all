---
name: test
description: 학습 기반 코딩 문제 출제 → 사용자 구현 → 4축 평가 → 레벨 프로파일 갱신
argument-hint: "<skill> [level]"
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Write, mcp__study__context_resolve, mcp__study__stats_getDashboard, mcp__study__session_appendLog, mcp__study__review_getMeta
---

입력: `$ARGUMENTS` (예: `react`, `react L3`)

---

## 세션 상태 보존

### session-state.md

상태 파일: `study/test/session-state.md`

Phase 전환마다 Write로 갱신한다:

```
# TEST-SESSION
updated: {YYYY-MM-DD HH:MM}
skill: {skill}
level: {level}
currentPhase: {N}
problemCount: {N}
problems:
  - {NNN}-{name}: {score}
```

- Phase 0 완료 시: 초기화 Write (currentPhase: 0)
- Phase 1 완료 시: currentPhase: 1 + 문제 정보
- Phase 2 완료 시: currentPhase: 2 + 평가 결과
- Phase 4 완료 시: `# COMPLETED\n` 마커로 덮어쓰기

복원:
- Phase 0 진입 시 `study/test/session-state.md` Read
- `# COMPLETED` 또는 파일 없음 → 새 세션
- 활성 내용 → "이전 test 세션: Phase {N}, {skill} L{level}. 이어서 할까요?" 확인

---

## Phase 0: 인벤토리 수집

1. `$ARGUMENTS`에서 `[skill] [level]` 파싱 (`skill` 필수, `level` 선택)
2. `context.resolve(mode=skill, skill=test)`
3. `stats.getDashboard(context={mode=skill})` → 전체 스킬/토픽 현황
4. 대상 skill의 `review.getMeta(context={mode=skill, skill=<skill>}, skill=<skill>, topic=<각 토픽>)` → 약점 개념 추출 (wrong/retry_pass)
5. `study/test/profile.md` Read → 기존 레벨 이력 (없으면 새 프로파일)
6. 시작 레벨 결정:
   - 명시 레벨 > profile.md 기록 > 약점 기반 추정 > 기본 L2
7. 인벤토리 보고:

   ```
   ## 테스트 인벤토리
   - 대상 스킬: {skill}
   - 시작 레벨: L{N} ({결정 근거})
   - 학습 토픽: {N}개
   - 약점 개념: {N}개 (wrong/retry_pass)
   - 약점 상세: {개념 목록}
   - 기존 프로파일: {있으면 요약 / 없으면 "신규"}
   ```

8. 사용자 확인 후 Phase 1 진행.

---

## Phase 1: 문제 출제

### 1-A. 번호 결정

`study/test/problems/` Glob → 기존 문제 파일에서 다음 번호 결정 (001부터 시작).

### 1-B. 문제 설계

문제 유형 (레벨에 따라 선택):

| 유형 | 설명 | 레벨 | Bloom's 인지 수준 |
|------|------|------|-------------------|
| A. 구현 | 학습한 원리를 활용한 함수/컴포넌트 구현 | L1~L3 | Apply |
| B. 리팩터링 | 주어진 코드 개선 | L2~L4 | Analyze |
| C. 설계 | 아키텍처/API 설계 | L3~L5 | Create |
| D. 예측 | 코드 실행 결과/동작을 내부 원리 기반으로 추론 | L1~L3 | Analyze |
| E. 디버깅 | 문제 상황의 원인을 내부 구현 기반으로 파악 + 수정 | L2~L4 | Evaluate |
| F. 응용 | 내부 지식을 실제 코드에 적용하여 문제 해결 | L2~L5 | Evaluate/Create |

레벨별 우선 유형:
- L1: A, D 우선 (기본 구현 + 동작 예측)
- L2: A, D, E (구현 + 예측 + 디버깅 시작)
- L3: A, B, D, E, F (전 유형)
- L4: B, C, E, F (리팩터링/설계/디버깅/응용 중심)
- L5: C, E, F (설계/디버깅/응용 고급)

설계 원칙:
- 약점 개념을 반드시 1개 이상 포함
- 학습한 소스코드의 실제 패턴을 기반으로 출제
- `study/{skill}/` 학습 기록 + `ref/` 소스 참조
- 내부 유틸 재구현이 아닌, 원리를 활용한 실전 코드 구현이어야 함

### 유형별 품질 기준

#### A. 구현
판별 기준:
- 학습한 내부 원리를 활용해야만 올바르게 구현할 수 있는 문제여야 함
- 단순 API 래핑이 아닌, 원리 이해가 설계 결정에 영향을 미쳐야 함
금지:
- 내부 유틸 함수를 그대로 재구현 (예: 소스코드 한 줄 복사로 풀리는 문제)
- 공식 문서의 예제 코드만으로 풀 수 있는 수준

#### D. 예측
판별 기준:
- 코드 스니펫을 주고 "무엇이 일어나는가" + "왜 그런가"를 함께 요구
- "왜"의 답이 학습한 내부 구현을 근거로 해야만 설명 가능해야 함
- 예측 결과가 직관과 다를 수 있는 상황을 우선 출제
금지:
- 단순 API 반환값 암기 (예: "이 함수의 결과는?")
- 공식 문서만 읽어도 답할 수 있는 수준
- 코드 없이 개념만 묻는 서술형

#### E. 디버깅
판별 기준:
- 실제로 발생 가능한 버그/성능 문제 시나리오를 제시
- 원인 파악에 내부 동작 지식이 필요해야 함 (표면적 증상만으론 부족)
- 원인 설명 + 수정 코드 모두 요구
금지:
- 단순 문법 오류 (typo, missing semicolon)
- 스택트레이스만 읽으면 풀리는 문제
- 학습 범위 밖의 지식이 필요한 문제

#### F. 응용
판별 기준:
- 실무 시나리오에서 학습한 내부 지식을 적용하여 문제를 해결
- "이 지식이 없으면 공식 문서 방식으로 풀겠지만, 있으면 더 나은 해법이 가능" 구조
- 최적화, 성능 개선, 올바른 API 선택 등 실전 판단을 요구
금지:
- 학습 내용과 무관한 일반 코딩 문제
- 내부 지식 없이도 동일한 해법에 도달하는 문제

### 1-C. 문제 파일 작성

유형 A/B/C/E/F → `study/test/problems/{NNN}-{name}.ts` Write:

```typescript
/**
 * 문제 {NNN}: {제목}
 * 레벨: L{N}
 * 유형: {A/B/C/E/F}
 * 관련 스킬: {skill}
 * 관련 개념: {concept1, concept2}
 *
 * ## 문제
 * {문제 설명}
 *
 * ## 제약
 * - {제약 조건}
 *
 * ## 주석 규격 (구현 시 반드시 포함)
 * 각 핵심 결정에 아래 주석을 달아주세요:
 * // 제약: {이 결정에 영향을 준 제약}
 * // 왜?: {이 접근을 선택한 이유}
 * // 근거: {학습한 내용 중 근거}
 * // 대안: {고려한 대안과 미채택 이유}
 * // 약점: {이 접근의 약점/트레이드오프}
 */

// 여기에 구현하세요
```

유형 D → `study/test/problems/{NNN}-{name}.md` Write:

```markdown
# 문제 {NNN}: {제목}

> 레벨: L{N} | 유형: D (예측) | 스킬: {skill}
> 관련 개념: {concept1, concept2}

## 코드

\`\`\`typescript
{예측 대상 코드 스니펫}
\`\`\`

## 질문
{구체적 질문 — "무엇이 일어나는가" + "왜 그런가"}

## 작성란

### 예측 결과
{여기에 작성}

### 근거 (내부 구현 기반)
{여기에 작성 — 반드시 소스코드 경로/동작 흐름 포함}

### 직관과 다른 점 (있다면)
{여기에 작성}
```

### 1-D. 사용자 안내

```
## 문제 출제 완료
- 파일: `study/test/problems/{NNN}-{name}.{ts|md}`
- 레벨: L{N} / 유형: {유형}

[유형 A/B/C/E/F] 에디터에서 구현한 후 "평가해줘"라고 말씀해주세요.
주석 규격(제약/왜?/근거/대안/약점)을 빠짐없이 포함해주세요.

[유형 D] 작성란을 채운 후 "평가해줘"라고 말씀해주세요.
예측 결과 + 근거(소스코드 경로/동작 흐름) + 직관과 다른 점을 포함해주세요.
```

`session-state.md` 갱신 (currentPhase: 1).

---

## Phase 2: 평가

### 2-A. 제출 코드 읽기

사용자가 "평가해줘"라고 하면 문제 파일 Read.

### 2-B. 4축 평가

| 축 | 평가 내용 | 배점 |
|----|-----------|------|
| Problem Framing | 제약 인식, 문제 분해, 엣지 케이스 식별 | 25% |
| Solution Design | 패턴 선택, 트레이드오프 인식, 대안 고려 | 25% |
| Implementation | 코드 품질, 정확성, 관용적 표현 | 25% |
| Self-Awareness | 주석 규격 완성도, 약점 인식, 개선 방향 | 25% |

각 축에 대해:
- 점수: 1~5 (1: 미흡, 2: 기초, 3: 적정, 4: 우수, 5: 탁월)
- 근거: 구체적 코드 라인 참조
- 피드백: 개선 포인트

### 2-C. 레벨 추정

4축 평균 점수 → 레벨 매핑:
- 1.0~1.9: L1 (입문)
- 2.0~2.9: L2 (기초)
- 3.0~3.9: L3 (중급)
- 4.0~4.5: L4 (고급)
- 4.6~5.0: L5 (전문)

### 2-D. 평가 출력

```
## 평가 결과: {NNN}-{name}

### 4축 점수
| 축 | 점수 | 요약 |
|----|------|------|
| Problem Framing | {N}/5 | {한 줄} |
| Solution Design | {N}/5 | {한 줄} |
| Implementation | {N}/5 | {한 줄} |
| Self-Awareness | {N}/5 | {한 줄} |

### 추정 레벨: L{N}
{레벨 판정 근거}

### 상세 피드백
{축별 구체적 피드백}

### 핵심 개선 포인트
- {1}
- {2}
```

### 2-E. 진행 판단

`session-state.md` 갱신 (currentPhase: 2).

- 누적 문제 수 < 3: "판정에 {N}문제 더 필요합니다." → `>>다음` 안내
- 누적 문제 수 >= 3: "레벨 판정이 가능합니다. `>>다음`으로 추가 문제, `>>정리`로 마무리."

---

## Phase 3: 루프

- `>>다음` → 레벨 조정 (이전 평가 기반) 후 Phase 1 반복
  - 이전 문제 정답률 높으면 레벨 상향
  - 낮으면 동일 레벨 유지 또는 하향
  - 약점 개념 중 아직 출제하지 않은 것 우선
- `>>정리` 또는 `>>끝` → Phase 4

---

## Phase 4: 결과 저장

### 4-A. 문제별 결과 파일

`study/test/results/{NNN}-{name}.md` Write (각 문제별):

```markdown
# 결과: {NNN}-{name}

> 날짜: {YYYY-MM-DD}
> 스킬: {skill}
> 레벨: L{N}
> 유형: {유형}

## 4축 평가

| 축 | 점수 | 요약 |
|----|------|------|
| Problem Framing | {N}/5 | {요약} |
| Solution Design | {N}/5 | {요약} |
| Implementation | {N}/5 | {요약} |
| Self-Awareness | {N}/5 | {요약} |

## 상세 피드백
{피드백}

## 핵심 개선 포인트
- {1}
- {2}
```

### 4-B. 프로파일 갱신

`study/test/profile.md` Write (누적):

```markdown
# 코딩 테스트 프로파일

> 최종 갱신: {YYYY-MM-DD}

## 현재 레벨

| 스킬 | 레벨 | 테스트 수 | 최근 날짜 |
|------|------|----------|----------|
| {skill} | L{N} | {N} | {YYYY-MM-DD} |

## 이력

| 날짜 | 스킬 | 문제 | 레벨 | 평균 점수 |
|------|------|------|------|----------|
| {YYYY-MM-DD} | {skill} | {NNN}-{name} | L{N} | {N.N} |
```

기존 프로파일이 있으면 해당 스킬 행만 갱신/추가한다.

### 4-C. 히스토리 추가

`study/test/history.md` Write (행 추가):

```markdown
# 테스트 히스토리

| 날짜 | 스킬 | 문제 수 | 최종 레벨 | 평균 점수 | 약점 반영 |
|------|------|--------|----------|----------|----------|
| {YYYY-MM-DD} | {skill} | {N} | L{N} | {N.N} | {개념 목록} |
```

### 4-D. 세션 로그

`session.appendLog(context={mode=skill, skill=test}, topic="test-{skill}", content=<세션 요약>)`

### 4-E. 세션 종료

`session-state.md` → `# COMPLETED` 마커로 덮어쓰기.

### 4-F. 마무리 출력

```
## 테스트 세션 완료

### 세션 요약
- 스킬: {skill}
- 문제 수: {N}
- 최종 레벨: L{N}
- 평균 점수: {N.N}/5

### 4축 추이
| 축 | 평균 | 추세 |
|----|------|------|
| Problem Framing | {N.N} | {↑/→/↓} |
| Solution Design | {N.N} | {↑/→/↓} |
| Implementation | {N.N} | {↑/→/↓} |
| Self-Awareness | {N.N} | {↑/→/↓} |

### 저장된 파일
- 결과: `study/test/results/{목록}`
- 프로파일: `study/test/profile.md`
- 히스토리: `study/test/history.md`
```

---

## 사용자 신호 규칙

- `>>다음` — Phase 2 → Phase 1 (다음 문제)
- `>>정리` 또는 `>>끝` — 세션 종료 + Phase 4 실행
- 일반 대화 속 "다음", "정리", "끝"은 신호로 인식하지 않는다 (`>>` 접두사 필수).

## 규칙

- 기존 `study/{skill}/` 파일은 **읽기만** 한다. 수정하지 않는다.
- 쓰기 동작은 Phase 4 (`>>정리` 이후)에만 수행한다. 예외: 문제 파일 (Phase 1), `session-state.md` (Phase 전환).
- 문제 파일: 유형 A/B/C/E/F는 `.ts` 기본 (사용자 요청 시 변경 가능), 유형 D는 `.md`.
- 주석 규격(제약/왜?/근거/대안/약점)은 유형 A/B/C/E/F 평가의 핵심 지표다. 유형 D는 마크다운 작성란(예측 결과/근거/직관과 다른 점)으로 대체.
- 레벨 판정은 3문제 이상 누적 시에만 프로파일에 반영한다.
- AI가 자체 판단으로 Phase를 건너뛰지 않는다.
