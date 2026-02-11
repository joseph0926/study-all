# React Source Code & Documentation Study Plan

> React 소스 코드(`ref/react-fork`)와 공식 문서(`ref/react.dev`)를 주제별로 학습하면서,
> 학습 결과를 바탕으로 `skills/react-aio/`의 기존 참조 문서를 검증·보강한다.

## Current State

- `react-aio`: 20개 참조 문서 + 59개 best-practice 규칙 (v19.2.4 기준)
- `ref/react-fork/`: 38개 패키지, ~7,090 파일 (핵심 5개 패키지 집중)
- `ref/react.dev/`: 46개 learn 가이드 + 88개 API 레퍼런스

## Core Principles

- 사용자가 직접 소스를 읽고 학습하며 진행 (AI가 일방적으로 작성하지 않음)
- 주제(토픽) 단위로 소스 + 문서를 묶어서 학습
- 각 토픽 완료 시 react-aio 해당 문서를 검증/개선

---

## Session Flow (각 토픽마다 반복)

```
1. 소스 파일 읽기
   └─ 사용자가 소스 코드를 읽으며 핵심 로직 파악
   └─ 궁금한 점은 실시간으로 질의/토론

2. react.dev 문서 교차 확인
   └─ 해당 토픽의 공식 설명과 소스 코드 비교
   └─ 사용자 관점 vs 내부 구현 관점 차이 이해

3. react-aio 검증
   └─ 해당 references/ 파일을 소스 코드와 대조
   └─ 부정확한 설명, 누락된 내용, 오래된 정보 식별

4. react-aio 개선
   └─ 사용자가 학습한 내용을 바탕으로 직접 개선안 결정
   └─ 최소 변경 원칙: 틀린 것만 고치고, 없는 것만 추가

5. 진행 기록
   └─ 이 파일의 토픽별 체크리스트 업데이트
```

---

## Part 1: react-fork Source Code Study (14 Topics)

순서는 bottom-up — React의 기초 자료구조부터 시작해서 상위 기능으로 올라간다.

---

### Topic 1: React Core API Surface

> React가 외부에 무엇을 노출하는지 파악

- [ ] 소스 학습 완료
- [ ] react.dev 교차 확인
- [ ] react-aio 검증/개선

**Source Files** (`ref/react-fork/packages/react/src/`):

| File | Description |
|------|-------------|
| `ReactClient.js` | 클라이언트 API 엔트리포인트 |
| `ReactServer.js` | 서버 API 엔트리포인트 |
| `ReactHooks.js` | Hook dispatcher (모든 훅의 진입점) |
| `ReactChildren.js` | Children 유틸리티 |
| `ReactContext.js` | createContext |
| `ReactMemo.js` | memo() |
| `ReactLazy.js` | lazy() |
| `ReactStartTransition.js` | startTransition |
| `jsx/ReactJSXElement.js` | JSX 엘리먼트 생성 |

**react.dev Docs** (`ref/react.dev/src/content/`):

- `learn/describing-the-ui.md`
- `reference/react/createElement.md`
- `reference/react/Children.md`

**Study Points**:

- React 패키지가 실제로 export하는 것들의 목록
- Hook dispatcher 패턴 — 왜 훅 구현이 react 패키지가 아닌 reconciler에 있는지
- JSX transform의 동작 원리 (createElement vs jsx)

**react-aio Target**: 없음 (기초 맥락 파악)

---

### Topic 2: Fiber Node & Tags

> React의 핵심 자료구조 이해

- [ ] 소스 학습 완료
- [ ] react-aio 검증/개선 (`references/fiber.md`)

**Source Files** (`ref/react-fork/packages/react-reconciler/src/`):

| File | Description |
|------|-------------|
| `ReactFiber.js` | Fiber 노드 생성, 구조체 필드 |
| `ReactWorkTags.js` | FunctionComponent, ClassComponent 등 태그 상수 |
| `ReactFiberFlags.js` | Placement, Update, Deletion 등 부작용 플래그 |
| `ReactTypeOfMode.js` | ConcurrentMode, StrictMode 등 모드 플래그 |
| `ReactInternalTypes.js` | Fiber 타입 정의 |

**react.dev Docs**: 해당 없음 (내부 구현)

**Study Points**:

- Fiber 노드의 주요 필드: `tag`, `type`, `stateNode`, `return`, `child`, `sibling`, `alternate`, `flags`, `lanes`, `memoizedState`, `memoizedProps`
- Double buffering: `current` ↔ `workInProgress` (alternate)
- WorkTag별 처리 분기

**react-aio Target**: `references/fiber.md`

- 소스 코드와 대조하여 Fiber 노드 필드 설명의 정확성 검증
- 누락된 필드나 변경된 플래그가 있는지 확인

---

### Topic 3: Work Loop

> React의 렌더링 엔진 — 가장 중요한 파일

- [ ] 소스 학습 완료
- [ ] react-aio 검증/개선 (`references/fiber.md` Work Loop 섹션)

**Source Files** (`ref/react-fork/packages/react-reconciler/src/`):

| File | Description |
|------|-------------|
| `ReactFiberWorkLoop.js` | **메인 렌더 루프** (performUnitOfWork, renderRootSync, renderRootConcurrent) |
| `ReactFiberRootScheduler.js` | 루트 스케줄링 |
| `ReactFiberRoot.js` | FiberRoot 생성/관리 |

**react.dev Docs**: 해당 없음 (내부 구현)

**Study Points**:

- Render Phase: `performUnitOfWork` → `beginWork` → `completeWork` 순회
- Commit Phase: `commitRoot` → mutation → layout → passive effects
- Sync vs Concurrent 렌더링 분기
- `shouldYield()` — 중단 가능 렌더링의 핵심

**react-aio Target**: `references/fiber.md` (Work Loop 섹션)

- Render Phase / Commit Phase 설명 정확성 검증
- Concurrent 렌더링 중단/재개 메커니즘 보강

---

### Topic 4: Reconciliation (Diffing)

> 어떻게 변경을 감지하고 최소 업데이트를 계산하는지

- [ ] 소스 학습 완료
- [ ] react.dev 교차 확인
- [ ] react-aio 검증/개선 (`references/reconciliation.md`)

**Source Files** (`ref/react-fork/packages/react-reconciler/src/`):

| File | Description |
|------|-------------|
| `ReactFiberBeginWork.js` | **컴포넌트 렌더링 시작**, 타입별 분기 처리 |
| `ReactFiberCompleteWork.js` | DOM 노드 생성, props diffing |
| `ReactChildFiber.js` | **자식 재조정 알고리즘** (리스트 diffing, key 처리) |
| `ReactFiberUnwindWork.js` | 에러/Suspense unwind |

**react.dev Docs** (`ref/react.dev/src/content/`):

- `learn/preserving-and-resetting-state.md`
- `reference/react/Fragment.md`

**Study Points**:

- O(n) diffing 전략: 같은 레벨끼리만 비교
- `beginWork`의 bailout 조건 (props 동일 + lanes 없음)
- 리스트 diffing: key를 사용한 재배치 최적화
- `completeWork`에서 실제 DOM 노드 생성 시점

**react-aio Target**: `references/reconciliation.md`

- 소스 코드 기반으로 diffing 알고리즘 설명 검증
- bailout 최적화 조건의 정확한 기술

---

### Topic 5: Lanes & Priority

> React의 우선순위 시스템

- [ ] 소스 학습 완료
- [ ] react-aio 검증/개선 (`references/scheduler.md` Lane 섹션)

**Source Files** (`ref/react-fork/packages/react-reconciler/src/`):

| File | Description |
|------|-------------|
| `ReactFiberLane.js` | **Lane 모델** (32비트 비트마스크 스케줄링) |
| `ReactEventPriorities.js` | 이벤트→Lane 우선순위 매핑 |

**react.dev Docs**: 해당 없음 (내부 구현)

**Study Points**:

- Lane 비트마스크: SyncLane, DefaultLane, TransitionLane 등
- `mergeLanes`, `includesLanes`, `getHighestPriorityLane` 연산
- 이벤트 타입별 우선순위 할당

**react-aio Target**: `references/scheduler.md` (Lane 섹션)

- Lane 상수 값과 우선순위 계층 정확성 검증

---

### Topic 6: Scheduler

> 시간 분할(Time Slicing)과 작업 큐

- [ ] 소스 학습 완료
- [ ] react-aio 검증/개선 (`references/scheduler.md`)

**Source Files** (`ref/react-fork/packages/scheduler/src/`):

| File | Description |
|------|-------------|
| `forks/Scheduler.js` | **메인 스케줄러** (작업 큐, 우선순위, shouldYield) |
| `SchedulerMinHeap.js` | 우선순위 큐 (min heap) |
| `SchedulerPriorities.js` | 우선순위 레벨 정의 |

**react.dev Docs**: 해당 없음 (내부 구현)

**Study Points**:

- Min heap 기반 작업 큐 (taskQueue, timerQueue)
- `scheduleCallback` → `workLoop` → `shouldYieldToHost`
- 5ms 타임 슬라이스
- `MessageChannel` 기반 비동기 스케줄링 (requestIdleCallback이 아닌 이유)

**react-aio Target**: `references/scheduler.md`

- 소스 코드 기반으로 스케줄러 동작 설명 전면 검증

---

### Topic 7: Hooks

> 모든 훅의 내부 구현

- [ ] 소스 학습 완료
- [ ] react.dev 교차 확인
- [ ] react-aio 검증/개선 (`references/hooks.md`)

**Source Files** (`ref/react-fork/packages/react-reconciler/src/`):

| File | Description |
|------|-------------|
| `ReactFiberHooks.js` | **모든 훅 구현** (useState, useEffect, useMemo, useCallback, useRef, useContext, useReducer, useTransition, useDeferredValue, useId, use, useActionState, useOptimistic, useEffectEvent 등) |

**react.dev Docs** (`ref/react.dev/src/content/reference/react/`):

- `useState.md`, `useEffect.md`, `useCallback.md`, `useMemo.md`
- `useRef.md`, `useContext.md`, `useReducer.md`
- `useTransition.md`, `useDeferredValue.md`
- `use.md`, `useId.md`

**Study Points**:

- Hook dispatcher 패턴: mount vs update 분기
- `memoizedState` 링크드 리스트 구조
- 업데이트 큐: `queue.pending` → circular linked list
- deps 비교: `Object.is` 기반 얕은 비교
- 왜 조건부 Hook 호출이 금지되는지 (링크드 리스트 순서)

**react-aio Target**: `references/hooks.md`

- 각 훅의 내부 동작 설명을 소스 코드와 대조 검증
- React 19 신규 훅 (use, useActionState, useOptimistic, useEffectEvent) 설명 보강

---

### Topic 8: Effects & Commit Phase

> 부작용 실행 순서와 DOM 반영

- [ ] 소스 학습 완료
- [ ] react.dev 교차 확인
- [ ] react-aio 검증/개선 (`references/effects.md`)

**Source Files** (`ref/react-fork/packages/react-reconciler/src/`):

| File | Description |
|------|-------------|
| `ReactFiberCommitWork.js` | **메인 커밋 로직** (before mutation → mutation → layout → passive) |
| `ReactFiberCommitEffects.js` | Effect 순회/실행 |
| `ReactFiberCommitHostEffects.js` | Host(DOM) 커밋 연산 |
| `ReactHookEffectTags.js` | Hook effect 플래그 (HasEffect, Layout, Passive 등) |

**react.dev Docs** (`ref/react.dev/src/content/`):

- `reference/react/useEffect.md`
- `reference/react/useLayoutEffect.md`
- `reference/react/useInsertionEffect.md`
- `learn/synchronizing-with-effects.md`
- `learn/you-might-not-need-an-effect.md`

**Study Points**:

- 커밋 3단계: beforeMutation → mutation → layout
- Passive effects (useEffect)는 별도 스케줄링 (flushPassiveEffects)
- Layout effects (useLayoutEffect)는 mutation 직후 동기 실행
- Cleanup → Setup 실행 순서

**react-aio Target**: `references/effects.md`

- 커밋 단계별 실행 순서 정확성 검증
- cleanup 타이밍 설명 보강

---

### Topic 9: Context

> Context 전파 메커니즘

- [ ] 소스 학습 완료
- [ ] react.dev 교차 확인
- [ ] react-aio 검증/개선 (`references/context.md`)

**Source Files** (`ref/react-fork/packages/react-reconciler/src/`):

| File | Description |
|------|-------------|
| `ReactFiberNewContext.js` | **Modern Context** (Provider → Consumer 전파) |
| `ReactFiberHostContext.js` | Host 환경 컨텍스트 |

**react.dev Docs** (`ref/react.dev/src/content/`):

- `reference/react/createContext.md`
- `reference/react/useContext.md`
- `learn/passing-data-deeply-with-context.md`

**Study Points**:

- Provider가 변경되면 어떻게 Consumer를 찾아가는지
- Context 값 비교: `Object.is` 사용
- 왜 Context 변경이 bailout을 무시하고 하위 트리를 강제 렌더하는지

**react-aio Target**: `references/context.md`

- Context 전파 알고리즘 정확성 검증

---

### Topic 10: Suspense & Concurrent Features

> 비동기 렌더링의 핵심

- [ ] 소스 학습 완료
- [ ] react.dev 교차 확인
- [ ] react-aio 검증/개선 (`references/suspense.md`)

**Source Files** (`ref/react-fork/packages/react-reconciler/src/`):

| File | Description |
|------|-------------|
| `ReactFiberSuspenseComponent.js` | Suspense 컴포넌트 처리 |
| `ReactFiberSuspenseContext.js` | Suspense 경계 컨텍스트 |
| `ReactFiberThenable.js` | Promise/thenable 추적 |
| `ReactFiberThrow.js` | throw 처리 (Suspense catch, Error Boundary) |
| `ReactFiberOffscreenComponent.js` | Offscreen 렌더링 |

**react.dev Docs** (`ref/react.dev/src/content/`):

- `reference/react/Suspense.md`
- `reference/react/use.md`
- `learn/escape-hatches.md`

**Study Points**:

- Promise throw → 가장 가까운 Suspense 경계 catch
- SuspenseState: `fallback` vs `primary` 트리 전환
- `use()` Hook과 Suspense의 관계
- Offscreen 트리와 메모리 관리

**react-aio Target**: `references/suspense.md`

- Suspense 내부 상태 머신 검증
- `use()` Hook 통합 설명 보강

---

### Topic 11: Transitions & Actions

> useTransition, useActionState의 내부 구현

- [ ] 소스 학습 완료
- [ ] react.dev 교차 확인
- [ ] react-aio 검증/개선 (`references/transitions.md`, `references/actions.md`)

**Source Files** (`ref/react-fork/packages/react-reconciler/src/`):

| File | Description |
|------|-------------|
| `ReactFiberAsyncAction.js` | useTransition, useActionState 내부 |
| `ReactFiberTransition.js` | Transition 추적 |
| `ReactFiberGestureScheduler.js` | Gesture 스케줄링 (신규) |

**react.dev Docs** (`ref/react.dev/src/content/reference/react/`):

- `useTransition.md`
- `useActionState.md`
- `useOptimistic.md`

**Study Points**:

- `startTransition` → TransitionLane 할당 메커니즘
- async action과 isPending 상태 관리
- useOptimistic의 낙관적 업데이트 → revert 패턴
- Gesture 스케줄링 (React 19.2+ 신규)

**react-aio Target**: `references/transitions.md`, `references/actions.md`

- Gesture 스케줄링 등 신규 내용 추가 여부 확인
- async action 내부 흐름 검증

---

### Topic 12: React DOM Renderer

> DOM 구체적인 렌더링 로직

- [ ] 소스 학습 완료
- [ ] react.dev 교차 확인
- [ ] react-aio 검증/개선 (`references/events.md`)

**Source Files** (`ref/react-fork/packages/react-dom/src/`):

| File | Description |
|------|-------------|
| `client/ReactDOMClient.js` | createRoot, hydrateRoot |
| `client/ReactDOMRoot.js` | Root 구현 |
| `shared/ReactDOMFloat.js` | 리소스 프리로딩 (Suspense) |
| `shared/ReactDOMFlushSync.js` | flushSync |

**react.dev Docs** (`ref/react.dev/src/content/reference/`):

- `react-dom/client/createRoot.md`
- `react-dom/client/hydrateRoot.md`

**Study Points**:

- createRoot가 FiberRoot를 어떻게 생성하는지
- Hydration: 서버 HTML과 클라이언트 트리 매칭
- flushSync의 동기 강제 렌더링 메커니즘
- Event delegation 아키텍처

**react-aio Target**: `references/events.md`

- 이벤트 위임 시스템 설명 검증

---

### Topic 13: Server Rendering (Fizz)

> 스트리밍 SSR 엔진

- [ ] 소스 학습 완료
- [ ] react.dev 교차 확인
- [ ] react-aio 검증/개선 (`references/server-components.md` SSR 섹션)

**Source Files** (`ref/react-fork/packages/react-server/src/`):

| File | Description |
|------|-------------|
| `ReactFizzServer.js` | **Fizz 메인 렌더러** (스트리밍 SSR) |
| `ReactFizzHooks.js` | 서버 사이드 훅 구현 |
| `ReactFizzClassComponent.js` | 서버 클래스 컴포넌트 |

**react.dev Docs** (`ref/react.dev/src/content/reference/react-dom/server/`):

- `renderToPipeableStream.md`
- `renderToReadableStream.md`

**Study Points**:

- Fizz의 스트리밍 아키텍처: segments, boundaries
- 서버에서의 Suspense: 점진적 HTML 스트리밍
- 서버 훅 vs 클라이언트 훅 차이

**react-aio Target**: `references/server-components.md` (SSR 섹션)

- Fizz 스트리밍 메커니즘 설명 보강

---

### Topic 14: Server Components (Flight)

> RSC 직렬화 프로토콜

- [ ] 소스 학습 완료
- [ ] react.dev 교차 확인
- [ ] react-aio 검증/개선 (`references/server-components.md`)

**Source Files** (`ref/react-fork/packages/react-server/src/`):

| File | Description |
|------|-------------|
| `ReactFlightServer.js` | **RSC 렌더러** (컴포넌트→클라이언트 직렬화) |
| `ReactFlightHooks.js` | Server Component 훅 |
| `ReactFlightActionServer.js` | Server Actions |
| `ReactFlightReplyServer.js` | 클라이언트→서버 직렬화 |

**react.dev Docs** (`ref/react.dev/src/content/reference/rsc/`):

- `server-components.md`
- `server-functions.md`
- `use-client.md`
- `use-server.md`

**Study Points**:

- Flight Protocol: 컴포넌트 트리의 직렬화 포맷
- 'use client' / 'use server' 경계가 어떻게 처리되는지
- ClientReference / ServerReference 메커니즘
- Server Actions의 RPC 흐름

**react-aio Target**: `references/server-components.md`

- Flight Protocol 설명 정확성 검증
- Server Actions 내부 구현 보강

---

## Part 2: react.dev Official Docs Supplementary Study (3 Sections)

Part 1에서 소스 코드로 내부 동작을 이해한 후, 공식 문서로 "사용자 관점"의 베스트 프랙티스를 보충한다.

---

### Section A: Learn Guides

> Part 1에서 다루지 않은 실용적 가이드 학습

- [ ] 학습 완료
- [ ] react-aio 검증/개선 (`references/patterns.md`, `references/anti-patterns.md`)

**Docs** (`ref/react.dev/src/content/learn/`):

| File | Topic |
|------|-------|
| `thinking-in-react.md` | React 사고 방식 |
| `responding-to-events.md` | 이벤트 핸들링 |
| `state-a-components-memory.md` | 상태의 본질 |
| `choosing-the-state-structure.md` | 상태 구조 설계 |
| `sharing-state-between-components.md` | 상태 끌어올리기 |
| `extracting-state-logic-into-a-reducer.md` | useReducer 패턴 |
| `scaling-up-with-reducer-and-context.md` | Reducer + Context 조합 |
| `referencing-values-with-refs.md` | Ref 사용법 |
| `manipulating-the-dom-with-refs.md` | DOM Ref |
| `lifecycle-of-reactive-effects.md` | Effect 생명주기 |
| `separating-events-from-effects.md` | Event vs Effect 분리 |
| `removing-effect-dependencies.md` | Effect 의존성 최적화 |
| `reusing-logic-with-custom-hooks.md` | Custom Hooks |

**react-aio Target**: `references/patterns.md`, `references/anti-patterns.md`

- 공식 가이드와 대조하여 패턴/안티패턴 누락 항목 식별
- 실용적 예제 보강

---

### Section B: API Reference

> 각 API의 공식 설명과 react-aio 내용 대조

- [ ] 학습 완료
- [ ] react-aio 검증/개선 (전체 `references/`)

**Docs** (`ref/react.dev/src/content/reference/react/`):

- 모든 훅 API 레퍼런스 (useState ~ useEffectEvent)
- 컴포넌트 API (Suspense, StrictMode, Profiler, Fragment)
- 유틸리티 API (memo, lazy, forwardRef, cache)

**react-aio Target**: 전체 `references/`

- API 시그니처, 주의사항, Pitfall 등 공식 문서에만 있는 내용 반영

---

### Section C: React Compiler (New Topic)

> react-aio에 현재 없는 영역

- [ ] 소스 학습 완료
- [ ] react.dev 문서 학습
- [ ] react-aio 신규 문서 추가 (`references/compiler.md`)

**Source Files**: `ref/react-fork/compiler/`

**Docs**:
- `ref/react.dev/src/content/learn/react-compiler/`
- `ref/react.dev/src/content/reference/react-compiler/`

**react-aio Target**:

- `references/compiler.md` 신규 문서 추가 검토
- 또는 `references/patterns.md`에 Compiler 관련 패턴 섹션 추가

---

## Files To Modify

| Action | File |
|--------|------|
| Create | `docs/react/plan.md` (this file) |
| Verify/Improve (per topic) | `skills/react-aio/references/fiber.md` |
| Verify/Improve (per topic) | `skills/react-aio/references/reconciliation.md` |
| Verify/Improve (per topic) | `skills/react-aio/references/hooks.md` |
| Verify/Improve (per topic) | `skills/react-aio/references/scheduler.md` |
| Verify/Improve (per topic) | `skills/react-aio/references/effects.md` |
| Verify/Improve (per topic) | `skills/react-aio/references/context.md` |
| Verify/Improve (per topic) | `skills/react-aio/references/suspense.md` |
| Verify/Improve (per topic) | `skills/react-aio/references/transitions.md` |
| Verify/Improve (per topic) | `skills/react-aio/references/actions.md` |
| Verify/Improve (per topic) | `skills/react-aio/references/events.md` |
| Verify/Improve (per topic) | `skills/react-aio/references/server-components.md` |
| Verify/Improve (per topic) | `skills/react-aio/references/patterns.md` |
| Verify/Improve (per topic) | `skills/react-aio/references/anti-patterns.md` |
| New (review) | `skills/react-aio/references/compiler.md` |

---

## Verification

- 각 토픽 완료 후: 수정된 react-aio 문서의 내용이 소스 코드와 일치하는지 교차 확인
- 전체 완료 후: `scripts/skills_audit.py` 실행하여 메타데이터/링크 정합성 검증
- GitHub URL 링크가 실제 소스 파일 경로와 일치하는지 확인
