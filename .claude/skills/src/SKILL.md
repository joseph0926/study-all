---
name: src
description: 소스코드 패턴 리딩 — 핵심 코드에서 패턴을 발견하고, "왜 이렇게 작성했을까?" 사고 후 미니 코딩으로 체화한다.
argument-hint: "[project-path] <주제>"
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Bash, Write, WebSearch, WebFetch, mcp__study__context_resolve, mcp__study__session_appendLog, mcp__study__session_getSourcePaths, mcp__study__session_getSourceDigest
---

입력: `$ARGUMENTS` (예: `react-useRef` 또는 `/path/to/project 상태관리`)

실행 순서:

## Phase 0: 패턴 발견

1. **모드 판별**: `$ARGUMENTS`의 첫 토큰이 `/`로 시작하는 경로면 → **project 모드**, 아니면 → **skill 모드**
   - project 모드: `<project-path>` + `<주제>` 파싱 → `context.resolve(mode=project, projectPath=<project-path>)`
   - skill 모드: `context.resolve(mode=skill, skill=src)`
2. 사용자 입력에서 주제명 추출 (간결한 kebab-case, 예: `react-useRef`, `상태관리-패턴`)
3. 세션 복원/초기화

   상태 파일:
   - skill 모드: `study/src/session-state.md`
   - project 모드: `{project}/.study/src/session-state.md`

   3-A. Read 시도:
     - 파일 없음 또는 `# COMPLETED` → 새 세션 → Step 3-C
     - 활성 내용 + 당일 → "이전 세션 복원. 패턴 {N}부터 계속합니다." → 상태 복원 → Step 4
     - 활성 내용 + 이전 날짜 → "이전 세션 발견 ({날짜}). 이어서/새로?" → 사용자 선택

   3-B. 복원 정보:
     - topic, patternPlan, currentPattern, completedPatterns

   3-C. 새 세션 → 상태 파일 초기화 Write:
     ```
     # SESSION-STATE
     updated: {YYYY-MM-DD HH:MM}
     topic: {주제명}
     currentPattern: 0
     completedPatterns: 0
     ---
     ## Pattern Plan
     (미결정)
     ---
     ## Completed Patterns
     (없음)
     ```

4. 소스 탐색 — 모드별 우선순위:

   **skill 모드:**

   | 우선순위 | 소스 | 도구 | 조건 |
   |---------|------|------|------|
   | 1 | `ref/` 하위 소스코드 | Glob, Grep, Read | 관련 코드 존재 시 |
   | 2 | 웹 검색 | WebSearch, WebFetch | ref/에 관련 소스 없을 때 |

   ref/ 폴백 규칙:
   - ref/ 탐색 결과가 없을 때: "ref/에 관련 소스 없음, 웹 검색으로 전환합니다" 사용자 알림 후 우선순위 2로 진행

   **project 모드:**

   | 우선순위 | 소스 | 도구 | 조건 |
   |---------|------|------|------|
   | 1 | 프로젝트 소스코드 | Glob, Grep, Read | `file:line` 인용 필수 |
   | 2 | ref/ 교차참조 | Glob, Grep, Read | 프로젝트 import 대상 라이브러리의 소스가 ref/에 존재할 때 |
   | 3 | 웹 검색 | WebSearch, WebFetch | 외부 패턴 이해 필요 시 |

5. **패턴 플랜 생성**: AI가 주제 관련 핵심 코드에서 JS/TS/React 패턴 3~5개 식별

   패턴 플랜 형식:
   ```
   | # | 패턴 | 코드 위치 | 핵심 질문 |
   |---|------|----------|----------|
   | 1 | plain object 래퍼 | ReactFiberHooks.js:2602 | 왜 class가 아니라 { current: value }? |
   | 2 | mount/update 분리 | ReactFiberHooks.js:2602,2609 | 왜 하나로 합치지 않고 분리? |
   | 3 | linked list 상태 저장 | ReactFiberHooks.js:1050 | 왜 배열이 아니라 linked list? |
   ```

6. 사용자 확인/조정 후 Phase 1 진입
   - session-state.md에 패턴 플랜 Write

## Phase 1: 패턴 사이클 (메인) — 패턴당 4단계

각 패턴에 대해 아래 4단계를 순서대로 수행한다.

**Step 1. 코드 스니펫 + 패턴 지목**
- 해당 패턴이 사용된 코드 스니펫 표시 (5~15줄)
- 패턴명과 사용 위치를 짧게 지목
- 코드에 AI 주석을 달지 않음 (원본 그대로)
- 코드 경로 `file:line` 명시

**Step 2. "왜 이렇게 작성했을까?" — 사용자 사고 유도**
- 구체적 질문 제시: "왜 X 대신 Y를 사용했을까?", "다른 방법은 없었을까?"
- 사용자가 자기 가설을 세움

사용자 답변 수준별 처리:
- **잘 설명함**: 인정 + 핵심 보충 → Step 4
- **부분적**: 맞는 부분 인정 + 놓친 관점 보충 → Step 4
- **모르겠음**: 힌트 1개 → 재시도 → 그래도 모르면 AI 설명 → Step 4

**Step 3. AI 피드백**
- 맞는 부분 인정 (구체적으로)
- 빠진 관점 보충 (트레이드오프, 대안, 성능, 유지보수 등)
- 오개념 교정
- 관련 패턴명이 있으면 명명 (mutable container, discriminated union 등)

**Step 4. 변형 실험**
- AI가 방금 본 코드에서 **하나를 바꾸는** 과제를 출제
  - 예: "이 코드에서 `{ current: value }`를 class로 바꿔보세요. 어떤 차이가 생길까요?"
  - 예: "linked list 대신 배열로 바꿔보세요. 어떤 문제가 생길까요?"
  - 예: "mount/update를 하나의 함수로 합쳐보세요. 무엇이 달라질까요?"
- 사용자가 기존 코드를 변형한 코드 작성
- AI 리뷰: 동작 차이 + 원본 패턴이 더 나은 이유 (또는 사용자 변형이 나은 경우 인정)
- 핵심: **백지 시작 없음** — 항상 기존 코드에서 출발 → 변형 → 차이 체감

패턴 완료 후:
- session-state.md 갱신 (completedPatterns++, currentPattern 다음으로)
- 다음 패턴으로 이동

## Phase 2: 패턴 연결 (선택)

- 모든 패턴 사이클 완료 후 진입
- 발견한 패턴들이 어떻게 합쳐져서 전체 기능을 만드는지
- 패턴 간 관계 ASCII 다이어그램
- 사용자 `>>정리`로 건너뛰기 가능

## 종료 (`>>정리`)

1. 패턴 워크스루 문서 Write
   - skill 모드: `study/src/{주제명}.md`
   - project 모드: `{project}/.study/src/{주제명}.md`

2. `session.appendLog(context, topic=<주제명>, content=<요약>)`로 세션 기록
   - project 모드에서는 `via="via /src (project mode)"` 추가

3. session-state.md → `# COMPLETED\n` 마커로 Write

**문서 템플릿:**

```markdown
# {주제} — 패턴 워크스루

> 주제: {주제}
> 소스: {ref/ 경로 또는 프로젝트 경로}
> 일시: YYYY-MM-DD

---

## 패턴 1: {패턴명}

> 파일: {file:line}

### 코드
{원본 코드 스니펫}

### 왜 이렇게?
- 핵심 이유: {...}
- 대안과 트레이드오프: {...}

### 변형 실험
- 과제: {변형 지시 — 예: "class로 바꿔보세요"}
- 사용자 변형 코드: {변형 결과}
- 차이점: {원본 vs 변형의 동작/성능/안전성 차이}

---

## 패턴 2: {패턴명}
...

---

## 패턴 연결
{패턴들이 합쳐져서 전체 기능을 만드는 구조}

## 연결

| 대상 토픽 | 관계 | 근거 |
|-----------|------|------|
```

신호 규칙:
- `>>다음` — 현재 패턴의 변형 실험을 건너뛰고 다음 패턴
- `>>정리` / `>>끝` — 현재까지 완료된 내용으로 문서화 실행
- `>>` 접두사 필수. 일반 대화 속 "정리", "다음"은 신호로 인식하지 않는다.

규칙:
- **AI가 먼저 설명하지 않음**: 코드 + 질문 → 사용자 사고 → AI 피드백 순서를 지킨다.
- **패턴 중심**: 소스코드 전체 흐름 해석이 아니라, 사용된 JS/TS/React 패턴을 이해하는 것이 목표.
- 패턴당 코드 스니펫 5~15줄. 패턴 이해에 필요한 부분만 발췌.
- 변형 실험은 기존 코드에서 하나를 바꾸는 과제 (백지 시작 없음, 기존 코드에서 출발).
- 복습 등록 안 함 (그것은 `/routine`의 역할).
- skill 모드: ref/ 코드 우선, 없으면 알림 후 웹 전환.
- project 모드: 프로젝트 소스코드를 반드시 먼저 탐색한다.
- ref/ 전환 알림 필수: ref/ 탐색 결과 없을 시 "ref/에 관련 소스 없음, 웹 검색으로 전환합니다" 알림 후 진행 (무언의 전환 금지).
- session-state.md만 매 패턴 완료 후 갱신, 나머지 쓰기는 `>>정리` 이후.
- project 모드에서 프로젝트 코드를 수정하지 않는다 (읽기 전용).
