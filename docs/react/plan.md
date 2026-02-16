# React Source Code & Documentation Study Plan

> React 소스 코드(`ref/react-fork`)와 공식 문서(`ref/react.dev`)를 주제별로 학습하면서,
> 학습 결과를 바탕으로 `skills/react-aio/`의 기존 참조 문서를 검증·보강한다.

## Current State

- **Skill**: react-aio — 19개 참조 문서 + 59개 best-practice 규칙 (v19.2.4 기준)
- **Source**: `ref/react-fork/packages/` — 38개 패키지 + `compiler/` (총 ~7,000+ 파일)
- **Docs**: `ref/react.dev/` — 46개 learn 가이드 + API 레퍼런스

## Coverage Analysis

| Status | Module | Skill Target |
|--------|--------|--------------|
| ✅ 커버 | react | hooks.md, memo.md, lazy.md, context.md, refs.md, transitions.md, activity.md, actions.md |
| ✅ 커버 | react-reconciler | fiber.md, reconciliation.md, hooks.md, effects.md, suspense.md, error-handling.md, refs.md, context.md |
| ✅ 커버 | scheduler | scheduler.md |
| ✅ 커버 | shared | memo.md, lazy.md, portals.md (부분) |
| ✅ 커버 | react-dom-bindings | events.md, actions.md |
| ✅ 커버 | react-dom | portals.md, actions.md |
| ✅ 커버 | react-server | server-components.md |
| ✅ 커버 | react-server-dom-webpack | server-components.md |
| ⬜ 미커버 | react-client | 신규 생성 필요 |
| ⬜ 미커버 | react-is | 신규 생성 필요 |
| ⬜ 미커버 | react-cache | 신규 생성 필요 |
| ⬜ 미커버 | react-refresh | 신규 생성 필요 |
| ⬜ 미커버 | react-markup | 신규 생성 필요 |
| ⬜ 미커버 | use-sync-external-store | 신규 생성 필요 |
| ⬜ 미커버 | use-subscription | 신규 생성 필요 |
| ⬜ 미커버 | react-native-renderer | 신규 생성 필요 |
| ⬜ 미커버 | react-art | 신규 생성 필요 |
| ⬜ 미커버 | react-noop-renderer | 신규 생성 필요 |
| ⬜ 미커버 | react-test-renderer | 신규 생성 필요 |
| ⬜ 미커버 | react-server-dom-turbopack | 신규 생성 필요 |
| ⬜ 미커버 | react-server-dom-parcel | 신규 생성 필요 |
| ⬜ 미커버 | react-server-dom-esm | 신규 생성 필요 |
| ⬜ 미커버 | react-server-dom-unbundled | 신규 생성 필요 |
| ⬜ 미커버 | react-server-dom-fb | 신규 생성 필요 |
| ⬜ 미커버 | react-devtools-shared | 신규 생성 필요 |
| ⬜ 미커버 | react-devtools | 신규 생성 필요 |
| ⬜ 미커버 | react-devtools-core | 신규 생성 필요 |
| ⬜ 미커버 | react-devtools-inline | 신규 생성 필요 |
| ⬜ 미커버 | react-devtools-fusebox | 신규 생성 필요 |
| ⬜ 미커버 | react-devtools-extensions | 신규 생성 필요 |
| ⬜ 미커버 | react-devtools-shell | 신규 생성 필요 |
| ⬜ 미커버 | react-devtools-timeline | 신규 생성 필요 |
| ⬜ 미커버 | react-suspense-test-utils | 신규 생성 필요 |
| ⬜ 미커버 | eslint-plugin-react-hooks | 신규 생성 필요 |
| ⬜ 미커버 | dom-event-testing-library | 신규 생성 필요 |
| ⬜ 미커버 | jest-react | 신규 생성 필요 |
| ⬜ 미커버 | internal-test-utils | 신규 생성 필요 |
| ⬜ 미커버 | compiler | 신규 생성 필요 |
| 🔗 고아 ref | — | `references/patterns.md` (크로스커팅, 패키지 비특정) |
| 🔗 고아 ref | — | `references/anti-patterns.md` (크로스커팅, 패키지 비특정) |
| 🔗 고아 ref | — | `references/best-practices/` (크로스커팅, 패키지 비특정) |

- **커버율**: 8/39 모듈 (20.5%)

## Core Principles

- 사용자가 직접 소스를 읽고 학습하며 진행 (AI가 일방적으로 작성하지 않음)
- 주제(토픽) 단위로 소스 + 문서를 묶어서 학습
- 각 토픽 완료 시 해당 스킬 레퍼런스 문서를 검증/개선

## Session Flow (각 토픽마다 반복)

1. 소스 파일 읽기 (사용자 주도, 질의/토론)
2. 공식 문서 교차 확인
3. 스킬 reference 검증 (소스 코드 대조)
4. 최소 개선 (사용자 결정)
5. plan.md 체크리스트 업데이트

---

## Part 1: Core Runtime (13 Topics)

순서는 모듈 간 import 의존 관계 기반 — 의존되는 모듈부터 배치.
`react-reconciler`(100+ files)는 파일 그룹별 분할 (사유: 단일 src/ 디렉토리에 100+ 파일, 논리적 파일 그룹별 분할).

---

### Topic 1: shared ⬜ 미커버

> React 전체 패키지가 공유하는 유틸리티/상수 (의존 관계 없음 — 기초 레이어)

- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선

**Source Files** (`ref/react-fork/packages/shared/`):

| File | Role |
|------|------|
| `ReactSymbols.js` | REACT_ELEMENT_TYPE 등 Symbol 상수 |
| `ReactTypes.js` | 공유 타입 정의 |
| `ReactFeatureFlags.js` | Feature flag 설정 |
| `objectIs.js` | Object.is 폴리필 |
| `shallowEqual.js` | 얕은 비교 (memo, deps 비교) |
| `getComponentNameFromType.js` | 컴포넌트명 추출 유틸 |
| `isValidElementType.js` | 유효한 엘리먼트 타입 체크 |
| `hasOwnProperty.js` | OwnProperty 체크 유틸 |

**Study Points** (소스 구조에서 도출):
- ReactSymbols: REACT_ELEMENT_TYPE, REACT_FRAGMENT_TYPE 등 Symbol 상수 목록
- shallowEqual/objectIs: deps 비교의 기초 알고리즘
- ReactFeatureFlags: 기능 활성화/비활성화 분기 패턴
- 의존 모듈: 없음 (최하위 레이어)

**Docs**: 해당 없음 (내부 구현)

**Skill Target**: `references/memo.md`, `references/lazy.md` 일부 (shallowEqual 관련)

---

### Topic 2: scheduler ✅ 커버

> 시간 분할(Time Slicing)과 우선순위 작업 큐 (의존 관계 없음)

- [ ] 소스 학습 완료
- [ ] skill 검증/개선 (`references/scheduler.md`)

**Source Files** (`ref/react-fork/packages/scheduler/src/`):

| File | Role |
|------|------|
| `forks/Scheduler.js` | 메인 스케줄러 (작업 큐, shouldYield) |
| `SchedulerMinHeap.js` | 우선순위 큐 (min heap) |
| `SchedulerPriorities.js` | ImmediateP, UserBlockingP, NormalP, LowP, IdleP |
| `SchedulerFeatureFlags.js` | 스케줄러 Feature flags |
| `SchedulerProfiling.js` | 프로파일링 |

**Study Points** (소스 구조에서 도출):
- Entrypoint exports: `scheduleCallback`, `cancelCallback`, `shouldYieldToHost`, `getCurrentTime`
- Min heap: taskQueue, timerQueue 구조
- 5ms 타임 슬라이스, `MessageChannel` 기반 비동기 스케줄링
- 의존 모듈: 없음

**Docs**: 해당 없음 (내부 구현)

**Skill Target**: `references/scheduler.md`

---

### Topic 3: React-Core-API ✅ 커버

> React 패키지의 공개 API Surface (→ shared 의존)
> 기존 학습 기록: `docs/react/React-Core-API.md` (2026-02-11, Step 1-6 완료)

- [x] 소스 학습 완료 — ReactElement/$$typeof, SharedInternals/Dispatcher, Hooks API 선언부, Client vs Server API, HOC 유틸리티, cache & Transitions
- [ ] docs 교차 확인
- [ ] skill 검증/개선

**Source Files** (`ref/react-fork/packages/react/`):

| File | Role |
|------|------|
| `index.js` | 전체 export 목록 |
| `src/ReactClient.js` | 클라이언트 API 엔트리포인트 |
| `src/ReactServer.js` | 서버 API 엔트리포인트 |
| `src/ReactHooks.js` | Hook dispatcher (모든 훅의 진입점) |
| `src/ReactChildren.js` | Children 유틸리티 |
| `src/ReactContext.js` | createContext |
| `src/ReactMemo.js` | memo() |
| `src/ReactLazy.js` | lazy() |
| `src/ReactStartTransition.js` | startTransition |
| `jsx/ReactJSXElement.js` | JSX 엘리먼트 생성 |

**Study Points** (소스 구조에서 도출):
- Entrypoint exports: Component, Fragment, Profiler, StrictMode, Suspense, Activity, createElement, cloneElement, isValidElement, createContext, forwardRef, lazy, memo, use, cache, cacheSignal, startTransition, useId, useState, useReducer, useEffect, useLayoutEffect, useInsertionEffect, useCallback, useMemo, useRef, useContext, useImperativeHandle, useDebugValue, useTransition, useDeferredValue, useActionState, useOptimistic
- Hook dispatcher 패턴: `ReactSharedInternals.H`를 통한 간접 호출
- 의존 모듈: shared (ReactSymbols, ReactTypes)

**Docs** (`ref/react.dev/src/content/`):
- `learn/describing-the-ui.md`
- `reference/react/createElement.md`
- `reference/react/Children.md`

**Skill Target**: 여러 references (hooks.md, memo.md, lazy.md, context.md, refs.md, transitions.md, activity.md, actions.md)

---

### Topic 4: Fiber-Structure ✅ 커버

> Fiber 노드 자료구조, WorkTag, Flags, Mode (→ shared 의존)
> 분할 사유: react-reconciler 100+ files를 논리적 파일 그룹별로 분할
> 기존 학습 기록: `docs/react/Fiber-Structure.md` (2026-02-13~14, Step 1-4 완료)

- [x] 소스 학습 완료 — FiberNode 생성자/필드 5카테고리, WorkTag 31개 상수/type→tag 변환, Flags & Mode 비트마스크, Double Buffering/createWorkInProgress
- [x] skill 검증/개선 (`references/fiber.md`) — WorkTag 테이블 확장, Flags/Mode/Double Buffering 섹션 추가, Lane 값 수정

**Source Files** (`ref/react-fork/packages/react-reconciler/src/`):

| File | Role |
|------|------|
| `ReactFiber.js` | Fiber 노드 생성, 구조체 필드 |
| `ReactWorkTags.js` | FunctionComponent, HostComponent 등 태그 상수 |
| `ReactFiberFlags.js` | Placement, Update, Deletion 등 부작용 플래그 |
| `ReactTypeOfMode.js` | ConcurrentMode, StrictMode 등 모드 플래그 |
| `ReactInternalTypes.js` | Fiber 타입 정의 |

**Study Points** (소스 구조에서 도출):
- Fiber 노드 필드: tag, type, stateNode, return, child, sibling, alternate, flags, lanes, memoizedState, memoizedProps
- Double buffering: current ↔ workInProgress (alternate)
- WorkTag 상수 목록과 분기 처리
- 의존 모듈: shared (ReactTypes)

**Docs**: 해당 없음 (내부 구현)

**Skill Target**: `references/fiber.md`

---

### Topic 5: react-reconciler — Work Loop ✅ 커버

> React 렌더링 엔진의 메인 루프 (→ shared, scheduler 의존)
> 분할 사유: react-reconciler 파일 그룹 분할
> 기존 학습 기록: `docs/react/Work-Loop.md` (2026-02-15~16, Step 2/5 완료)

- [ ] 소스 학습 완료 (Step 3/5 — FiberRoot/전역변수 + 업데이트 진입점 + Render Phase 완료. 미완료: Step 4 performUnitOfWork, Step 5 Commit Phase)
- [ ] skill 검증/개선 (`references/fiber.md` Work Loop 섹션)

**Source Files** (`ref/react-fork/packages/react-reconciler/src/`):

| File | Role |
|------|------|
| `ReactFiberWorkLoop.js` | 메인 렌더 루프 (performUnitOfWork, renderRootSync, renderRootConcurrent) |
| `ReactFiberRootScheduler.js` | 루트 스케줄링 |
| `ReactFiberRoot.js` | FiberRoot 생성/관리 |

**Study Points** (소스 구조에서 도출):
- export: performUnitOfWork, renderRootSync, renderRootConcurrent, commitRoot
- Render Phase → Commit Phase 전환
- shouldYield()를 통한 중단 가능 렌더링
- 의존 모듈: scheduler (scheduleCallback, shouldYieldToHost), shared

**Docs**: 해당 없음 (내부 구현)

**Skill Target**: `references/fiber.md` (Work Loop 섹션)

---

### Topic 6: react-reconciler — Reconciliation ✅ 커버

> 변경 감지와 최소 업데이트 계산 (→ shared 의존)
> 분할 사유: react-reconciler 파일 그룹 분할

- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선 (`references/reconciliation.md`)

**Source Files** (`ref/react-fork/packages/react-reconciler/src/`):

| File | Role |
|------|------|
| `ReactFiberBeginWork.js` | 컴포넌트 렌더링 시작, 타입별 분기 |
| `ReactFiberCompleteWork.js` | DOM 노드 생성, props diffing |
| `ReactChildFiber.js` | 자식 재조정 알고리즘 (리스트 diffing, key 처리) |
| `ReactFiberUnwindWork.js` | 에러/Suspense unwind |

**Study Points** (소스 구조에서 도출):
- beginWork: WorkTag별 분기 (FunctionComponent, HostComponent 등)
- bailout 조건: props === pendingProps && !includesSomeLane
- reconcileChildFibers: 단일 자식 vs 배열 자식 diffing
- completeWork: HostComponent의 실제 DOM 생성
- 의존 모듈: shared (ReactTypes, ReactSymbols)

**Docs** (`ref/react.dev/src/content/`):
- `learn/preserving-and-resetting-state.md`

**Skill Target**: `references/reconciliation.md`

---

### Topic 7: react-reconciler — Lanes & Priority ✅ 커버

> React의 우선순위 시스템 (→ shared 의존)
> 분할 사유: react-reconciler 파일 그룹 분할

- [ ] 소스 학습 완료
- [ ] skill 검증/개선 (`references/scheduler.md` Lane 섹션)

**Source Files** (`ref/react-fork/packages/react-reconciler/src/`):

| File | Role |
|------|------|
| `ReactFiberLane.js` | Lane 모델 (32비트 비트마스크 스케줄링) |
| `ReactEventPriorities.js` | 이벤트→Lane 우선순위 매핑 |

**Study Points** (소스 구조에서 도출):
- Lane 비트마스크 상수: SyncLane, DefaultLane, TransitionLane 등
- export: mergeLanes, includesSomeLane, getHighestPriorityLane, getNextLanes
- 이벤트 타입별 우선순위 할당 매핑
- 의존 모듈: shared

**Docs**: 해당 없음 (내부 구현)

**Skill Target**: `references/scheduler.md` (Lane 섹션)

---

### Topic 8: react-reconciler — Hooks ✅ 커버

> 모든 Hook의 내부 구현 (→ shared, react 의존)
> 분할 사유: react-reconciler 파일 그룹 분할

- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선 (`references/hooks.md`)

**Source Files** (`ref/react-fork/packages/react-reconciler/src/`):

| File | Role |
|------|------|
| `ReactFiberHooks.js` | 모든 훅 구현 (mount/update dispatcher) |

**Study Points** (소스 구조에서 도출):
- HooksDispatcherOnMount / HooksDispatcherOnUpdate: mount vs update 분기
- memoizedState 링크드 리스트 구조
- 업데이트 큐: queue.pending → circular linked list
- 개별 훅: mountState, updateState, mountEffect, updateEffect, mountMemo, updateMemo, mountCallback, mountRef, mountContext
- React 19 신규 훅: mountUse, mountActionState, mountOptimistic, mountEffectEvent
- 의존 모듈: shared (objectIs), react (타입)

**Docs** (`ref/react.dev/src/content/reference/react/`):
- `useState.md`, `useEffect.md`, `useCallback.md`, `useMemo.md`, `useRef.md`, `useContext.md`, `useReducer.md`, `use.md`, `useId.md`

**Skill Target**: `references/hooks.md`

---

### Topic 9: react-reconciler — Effects & Commit ✅ 커버

> 커밋 단계와 Effect 실행 순서 (→ shared 의존)
> 분할 사유: react-reconciler 파일 그룹 분할

- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선 (`references/effects.md`)

**Source Files** (`ref/react-fork/packages/react-reconciler/src/`):

| File | Role |
|------|------|
| `ReactFiberCommitWork.js` | 메인 커밋 로직 (before mutation → mutation → layout → passive) |
| `ReactFiberCommitEffects.js` | Effect 순회/실행 |
| `ReactFiberCommitHostEffects.js` | Host(DOM) 커밋 연산 |
| `ReactHookEffectTags.js` | HasEffect, Layout, Passive 등 플래그 |

**Study Points** (소스 구조에서 도출):
- 커밋 3단계: beforeMutation → mutation → layout
- Passive effects (useEffect): flushPassiveEffects로 별도 스케줄링
- Layout effects (useLayoutEffect): mutation 직후 동기 실행
- Effect tags: HasEffect, Insertion, Layout, Passive
- 의존 모듈: shared

**Docs** (`ref/react.dev/src/content/`):
- `reference/react/useEffect.md`, `reference/react/useLayoutEffect.md`, `reference/react/useInsertionEffect.md`
- `learn/synchronizing-with-effects.md`, `learn/you-might-not-need-an-effect.md`

**Skill Target**: `references/effects.md`

---

### Topic 10: react-reconciler — Context ✅ 커버

> Context 전파 메커니즘 (→ shared 의존)
> 분할 사유: react-reconciler 파일 그룹 분할

- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선 (`references/context.md`)

**Source Files** (`ref/react-fork/packages/react-reconciler/src/`):

| File | Role |
|------|------|
| `ReactFiberNewContext.js` | Modern Context (Provider → Consumer 전파) |
| `ReactFiberHostContext.js` | Host 환경 컨텍스트 |

**Study Points** (소스 구조에서 도출):
- Provider 값 변경 → Consumer 탐색 알고리즘
- Object.is 기반 값 비교
- Context 변경이 bailout을 무시하는 메커니즘
- 의존 모듈: shared (objectIs)

**Docs** (`ref/react.dev/src/content/`):
- `reference/react/createContext.md`, `reference/react/useContext.md`
- `learn/passing-data-deeply-with-context.md`

**Skill Target**: `references/context.md`

---

### Topic 11: react-reconciler — Suspense & Concurrent ✅ 커버

> 비동기 렌더링, Suspense, Offscreen (→ shared 의존)
> 분할 사유: react-reconciler 파일 그룹 분할

- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선 (`references/suspense.md`, `references/activity.md`)

**Source Files** (`ref/react-fork/packages/react-reconciler/src/`):

| File | Role |
|------|------|
| `ReactFiberSuspenseComponent.js` | Suspense 컴포넌트 처리 |
| `ReactFiberSuspenseContext.js` | Suspense 경계 컨텍스트 |
| `ReactFiberThenable.js` | Promise/thenable 추적 |
| `ReactFiberThrow.js` | throw 처리 (Suspense catch) |
| `ReactFiberOffscreenComponent.js` | Offscreen/Activity 렌더링 |

**Study Points** (소스 구조에서 도출):
- Promise throw → Suspense 경계 catch 메커니즘
- SuspenseState: fallback vs primary 트리 전환
- use() Hook과 thenable 추적
- Offscreen/Activity: UI 숨김/보존
- 의존 모듈: shared

**Docs** (`ref/react.dev/src/content/`):
- `reference/react/Suspense.md`, `reference/react/use.md`

**Skill Target**: `references/suspense.md`, `references/activity.md`

---

### Topic 12: react-reconciler — Transitions & Actions ✅ 커버

> useTransition, useActionState, Gesture 스케줄링 (→ shared 의존)
> 분할 사유: react-reconciler 파일 그룹 분할

- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선 (`references/transitions.md`, `references/actions.md`)

**Source Files** (`ref/react-fork/packages/react-reconciler/src/`):

| File | Role |
|------|------|
| `ReactFiberAsyncAction.js` | useTransition, useActionState 내부 |
| `ReactFiberTransition.js` | Transition 추적 |
| `ReactFiberGestureScheduler.js` | Gesture 스케줄링 (React 19.2+) |

**Study Points** (소스 구조에서 도출):
- startTransition → TransitionLane 할당
- async action과 isPending 상태 관리
- useOptimistic: 낙관적 업데이트 → revert
- GestureScheduler: View Transition 연동 (신규)
- 의존 모듈: shared

**Docs** (`ref/react.dev/src/content/reference/react/`):
- `useTransition.md`, `useActionState.md`, `useOptimistic.md`

**Skill Target**: `references/transitions.md`, `references/actions.md`

---

### Topic 13: react-reconciler — Error Handling ✅ 커버

> Error Boundary와 에러 전파 (→ shared 의존)
> 분할 사유: react-reconciler 파일 그룹 분할

- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선 (`references/error-handling.md`)

**Source Files** (`ref/react-fork/packages/react-reconciler/src/`):

| File | Role |
|------|------|
| `ReactFiberThrow.js` | 에러 throw 처리 (Error Boundary catch 포함) |
| `ReactFiberUnwindWork.js` | 에러 발생 시 unwind 처리 |
| `ReactCapturedValue.js` | 캡처된 에러 값 |

**Study Points** (소스 구조에서 도출):
- throwException: Error Boundary 탐색 알고리즘
- getDerivedStateFromError / componentDidCatch 호출
- Suspense catch vs Error catch 분기
- 의존 모듈: shared

**Docs** (`ref/react.dev/src/content/`):
- `reference/react/Component.md` (componentDidCatch, getDerivedStateFromError)

**Skill Target**: `references/error-handling.md`

---

## Part 2: DOM Rendering (2 Topics)

---

### Topic 14: react-dom-bindings ✅ 커버

> DOM 연산, 이벤트 위임, CSS/속성 처리 (→ shared, react-reconciler 의존)

- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선 (`references/events.md`)

**Source Files** (`ref/react-fork/packages/react-dom-bindings/src/`):

| File | Role |
|------|------|
| `client/ReactDOMComponent.js` | DOM 컴포넌트 생성/업데이트 |
| `client/ReactFiberConfigDOM.js` | Reconciler ↔ DOM 호스트 설정 |
| `events/DOMPluginEventSystem.js` | 이벤트 위임 시스템 |
| `events/ReactDOMEventListener.js` | 이벤트 리스너 등록 |
| `events/SyntheticEvent.js` | SyntheticEvent 생성 |
| `events/getEventTarget.js` | 이벤트 타겟 결정 |
| `server/ReactFizzConfigDOM.js` | 서버 사이드 DOM 설정 |
| `shared/CSSPropertyOperations.js` | CSS 속성 처리 |

**Subdirs**: client/, events/, server/, shared/

**Study Points** (소스 구조에서 도출):
- 이벤트 위임: root에 리스너 등록, 버블링/캡처 분기
- SyntheticEvent: 네이티브 이벤트 래핑
- DOMPluginEventSystem: 이벤트 플러그인 아키텍처
- DOM property/attribute diffing
- 의존 모듈: shared, react-reconciler (Fiber 타입, EventPriority)

**Docs** (`ref/react.dev/src/content/`):
- `learn/responding-to-events.md`

**Skill Target**: `references/events.md`

---

### Topic 15: react-dom ✅ 커버

> createRoot, hydrateRoot, Portals, flushSync (→ shared, react-reconciler, react-dom-bindings, react-server 의존)

- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선 (`references/portals.md`)

**Source Files** (`ref/react-fork/packages/react-dom/`):

| File | Role |
|------|------|
| `index.js` | 전체 export: createPortal, flushSync, prefetchDNS, preconnect, preload, preinit, useFormState, useFormStatus |
| `src/client/ReactDOMRoot.js` | createRoot, hydrateRoot 구현 |
| `src/client/ReactDOMClient.js` | 클라이언트 엔트리포인트 |
| `src/shared/ReactDOM.js` | 공유 API |
| `src/shared/ReactDOMFloat.js` | 리소스 프리로딩 (Suspense) |
| `src/shared/ReactDOMFlushSync.js` | flushSync |

**Subdirs**: src/client/, src/server/, src/shared/, npm/

**Study Points** (소스 구조에서 도출):
- Entrypoint exports: createPortal, flushSync, prefetchDNS, preconnect, preload, preloadModule, preinit, preinitModule, requestFormReset, useFormState, useFormStatus
- createRoot → FiberRoot 생성 과정
- Hydration: 서버 HTML ↔ 클라이언트 트리 매칭
- flushSync: 동기 강제 렌더링
- 의존 모듈: react-reconciler, react-dom-bindings, react-server, shared

**Docs** (`ref/react.dev/src/content/reference/`):
- `react-dom/client/createRoot.md`, `react-dom/client/hydrateRoot.md`

**Skill Target**: `references/portals.md`

---

## Part 3: Server Rendering (3 Topics)

---

### Topic 16: react-server — Fizz (Streaming SSR) ✅ 커버

> 스트리밍 SSR 엔진 (→ shared, react, react-reconciler 의존)

- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선 (`references/server-components.md` SSR 섹션)

**Source Files** (`ref/react-fork/packages/react-server/src/`):

| File | Role |
|------|------|
| `ReactFizzServer.js` | Fizz 메인 렌더러 (스트리밍 SSR) |
| `ReactFizzHooks.js` | 서버 사이드 훅 구현 |
| `ReactFizzClassComponent.js` | 서버 클래스 컴포넌트 |

**Study Points** (소스 구조에서 도출):
- Fizz 스트리밍 아키텍처: segments, boundaries
- 서버 Suspense: 점진적 HTML 스트리밍
- 서버 훅 vs 클라이언트 훅 차이
- 의존 모듈: shared, react (LazyComponent), react-reconciler (Dispatcher)

**Docs** (`ref/react.dev/src/content/reference/react-dom/server/`):
- `renderToPipeableStream.md`, `renderToReadableStream.md`

**Skill Target**: `references/server-components.md` (SSR 섹션)

---

### Topic 17: react-server — Flight + react-client (RSC) ✅ 커버

> RSC 직렬화 프로토콜, 클라이언트 소비 (→ shared, react 의존)

- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선 (`references/server-components.md`)

**Source Files**:

`ref/react-fork/packages/react-server/src/`:

| File | Role |
|------|------|
| `ReactFlightServer.js` | RSC 렌더러 (컴포넌트→클라이언트 직렬화) |
| `ReactFlightHooks.js` | Server Component 훅 |
| `ReactFlightActionServer.js` | Server Actions |
| `ReactFlightReplyServer.js` | 클라이언트→서버 직렬화 |

`ref/react-fork/packages/react-client/src/`:

| File | Role |
|------|------|
| `ReactFlightClient.js` | Flight 프로토콜 클라이언트 소비 |

**Study Points** (소스 구조에서 도출):
- Flight Protocol: 컴포넌트 트리 직렬화 포맷
- 'use client' / 'use server' 경계 처리
- ClientReference / ServerReference 메커니즘
- Server Actions RPC 흐름
- react-client: Flight 응답 파싱, provisional_useTransition, use, useFormStatus
- 의존 모듈: shared, react (LazyComponent)

**Docs** (`ref/react.dev/src/content/reference/rsc/`):
- `server-components.md`, `server-functions.md`, `use-client.md`, `use-server.md`

**Skill Target**: `references/server-components.md`

---

### Topic 18: react-server-dom-* (Bundler Variants) ⬜ 미커버

> Flight 프로토콜의 번들러별 구현 (webpack, turbopack, parcel, esm, unbundled, fb)
> 그룹핑 사유: 6개 패키지가 동일한 Flight 프로토콜의 번들러 어댑터 변형

- [ ] 소스 학습 완료
- [ ] skill 검증/개선

**Source Files**:

| Package | Key Files | Role |
|---------|-----------|------|
| `react-server-dom-webpack` | `src/client/`, `src/server/` | webpack 번들러용 Flight |
| `react-server-dom-turbopack` | `src/client/`, `src/server/` | Turbopack 번들러용 Flight |
| `react-server-dom-parcel` | `src/client/`, `src/server/` | Parcel 번들러용 Flight |
| `react-server-dom-esm` | `src/client/`, `src/server/` | ESM 환경용 Flight |
| `react-server-dom-unbundled` | `src/client/`, `src/server/` | 비번들 환경용 Flight |
| `react-server-dom-fb` | `src/` | Meta 내부용 Flight |

**Study Points** (소스 구조에서 도출):
- 각 번들러 어댑터의 client/server 엔트리포인트 구조
- 번들러별 모듈 참조 해석(resolve) 차이
- webpack의 PluginServerRegister 등 번들러 통합 패턴
- 의존 모듈: react-server, react-client, shared

**Docs**: 해당 없음 (번들러별 구현 세부사항)

**Skill Target**: 신규 생성 필요 또는 `references/server-components.md` 확장

---

## Part 4: Utilities (3 Topics)

---

### Topic 19: react-is + react-cache + use-subscription ⬜ 미커버

> 소규모 유틸리티 패키지
> 그룹핑 사유: 각 2~4개 소스 파일의 소규모 패키지

- [ ] 소스 학습 완료
- [ ] skill 검증/개선

**Source Files**:

| Package | Key File | Exports |
|---------|----------|---------|
| `react-is` (2 files) | `src/ReactIs.js` | isValidElementType, isFragment, isSuspense, isProfiler, isStrictMode 등 |
| `react-cache` (3 files) | `src/ReactCacheOld.js` | unstable_createResource, unstable_readResource |
| `use-subscription` (4 files) | `src/useSubscription.js` | useSubscription |

**Study Points** (소스 구조에서 도출):
- react-is: ReactSymbols 기반 타입 체크
- react-cache: Suspense 통합 캐싱 (legacy/experimental)
- use-subscription: 외부 소스 구독 패턴
- 의존 모듈: shared (ReactSymbols)

**Docs**: 해당 없음

**Skill Target**: 신규 생성 필요

---

### Topic 20: use-sync-external-store ⬜ 미커버

> 외부 상태 소스 동기화 Hook

- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선

**Source Files** (`ref/react-fork/packages/use-sync-external-store/`):

| File | Role |
|------|------|
| `src/useSyncExternalStore.js` | 메인 구현 |
| `src/useSyncExternalStoreShim.js` | React 18 이전 호환 shim |
| `src/useSyncExternalStoreWithSelector.js` | selector 지원 확장 |

**Study Points** (소스 구조에서 도출):
- Entrypoint exports: useSyncExternalStore, useSyncExternalStoreWithSelector
- Tearing 방지 메커니즘
- Shim vs native 구현 분기
- 의존 모듈: react

**Docs** (`ref/react.dev/src/content/reference/react/`):
- `useSyncExternalStore.md`

**Skill Target**: 신규 생성 필요

---

### Topic 21: react-refresh + react-markup ⬜ 미커버

> 개발/유틸리티 패키지
> 그룹핑 사유: 각 6~12개 소스 파일의 중소규모 유틸리티

- [ ] 소스 학습 완료
- [ ] skill 검증/개선

**Source Files**:

| Package | Key File | Exports |
|---------|----------|---------|
| `react-refresh` (6 files) | `src/ReactFreshRuntime.js` | performReactRefresh, createSignature, enqueueRender |
| `react-markup` (12 files) | `src/ReactMarkupClient.js`, `src/ReactMarkupServer.js` | renderToMarkup (client/server) |

**Study Points** (소스 구조에서 도출):
- react-refresh: HMR 메커니즘, signature 기반 컴포넌트 추적
- react-markup: 마크업 렌더링 타겟 (실험적)
- 의존 모듈: shared, react-reconciler

**Docs**: 해당 없음

**Skill Target**: 신규 생성 필요

---

## Part 5: Alternative Renderers (1 Topic)

---

### Topic 22: react-native-renderer + react-art + react-noop-renderer ⬜ 미커버

> React Reconciler 기반 대체 렌더러
> 그룹핑 사유: react-noop-renderer(6 files), react-art(4 files)는 소규모; react-native-renderer(85+ files)가 주 학습 대상

- [ ] 소스 학습 완료
- [ ] skill 검증/개선

**Source Files**:

| Package | Key File | Role |
|---------|----------|------|
| `react-native-renderer` (85+ files) | `src/ReactNativeRenderer.js`, `src/ReactFabric.js` | React Native 렌더러 (Legacy + Fabric) |
| `react-art` (4 files) | `src/ReactART.js` | 벡터 그래픽 렌더러 |
| `react-noop-renderer` (6 files) | `src/createReactNoop.js` | 테스트용 no-op 렌더러 |

**Study Points** (소스 구조에서 도출):
- Reconciler의 HostConfig 인터페이스 구현 패턴
- react-native-renderer: Legacy vs Fabric 아키텍처
- react-noop-renderer: 커스텀 렌더러 최소 구현 참조
- 의존 모듈: react-reconciler, shared

**Docs**: 해당 없음

**Skill Target**: 신규 생성 필요

---

## Part 6: Testing (1 Topic)

---

### Topic 23: react-test-renderer + Testing Infrastructure ⬜ 미커버

> 테스트 렌더러 및 테스트 인프라
> 그룹핑 사유: 테스트 관련 5개 패키지 — dom-event-testing-library(8), jest-react(3), internal-test-utils(13), react-suspense-test-utils(3), react-test-renderer(12)

- [ ] 소스 학습 완료
- [ ] skill 검증/개선

**Source Files**:

| Package | Key File | Role |
|---------|----------|------|
| `react-test-renderer` (12 files) | `src/ReactTestRenderer.js` | 테스트용 렌더러 |
| `react-suspense-test-utils` (3 files) | `src/ReactSuspenseTestUtils.js` | Suspense 테스트 유틸 |
| `jest-react` (3 files) | `src/JestReact.js` | Jest 환경 설정 |
| `internal-test-utils` (13 files) | `index.js` | 내부 테스트 헬퍼 |
| `dom-event-testing-library` (8 files) | `index.js` | DOM 이벤트 테스트 |

**Study Points** (소스 구조에서 도출):
- react-test-renderer: create, unmountComponentAtNode, toJSON
- act() 메커니즘: 동기적 렌더링/이펙트 완료 보장
- 의존 모듈: react-reconciler, shared

**Docs**: 해당 없음

**Skill Target**: 신규 생성 필요

---

## Part 7: DevTools (2 Topics)

---

### Topic 24: react-devtools-shared ⬜ 미커버

> DevTools 핵심 로직 (140+ files)

- [ ] 소스 학습 완료
- [ ] skill 검증/개선

**Source Files** (`ref/react-fork/packages/react-devtools-shared/`):

| Subdir | Role |
|--------|------|
| `src/backend/` | 렌더러 연결, Fiber 트리 인스펙션 |
| `src/devtools/` | 프론트엔드 UI 스토어 |
| `src/config/` | 설정 |

**Study Points** (소스 구조에서 도출):
- backend: attachRenderer, setupHighlighter, setupTraceUpdates
- devtools: ProfilingCache, ProfilerStore, 컴포넌트 트리 뷰
- Bridge: backend ↔ frontend 통신
- 의존 모듈: react-reconciler (내부 타입)

**Docs**: 해당 없음

**Skill Target**: 신규 생성 필요

---

### Topic 25: react-devtools Variants ⬜ 미커버

> DevTools UI, 브라우저 확장, 타임라인
> 그룹핑 사유: 6개 패키지가 모두 react-devtools-shared 기반 변형

- [ ] 소스 학습 완료
- [ ] skill 검증/개선

**Source Files**:

| Package | Role |
|---------|------|
| `react-devtools` | 스탠드얼론 DevTools |
| `react-devtools-core` (3 files) | backend, editor, standalone 모듈 |
| `react-devtools-inline` (13 files) | 인라인 DevTools |
| `react-devtools-fusebox` (3 files) | Fusebox 번들러용 |
| `react-devtools-extensions` (50+ files) | 브라우저 확장 |
| `react-devtools-shell` (50+ files) | 개발/테스트 셸 |
| `react-devtools-timeline` (65+ files) | 타임라인 프로파일러 |

**Study Points** (소스 구조에서 도출):
- 각 변형의 빌드/배포 패턴
- 브라우저 확장: background script, content script, panel 구조
- Timeline: content-views, view-base 렌더링 아키텍처
- 의존 모듈: react-devtools-shared

**Docs**: 해당 없음

**Skill Target**: 신규 생성 필요

---

## Part 8: Tooling (3 Topics)

---

### Topic 26: eslint-plugin-react-hooks ⬜ 미커버

> React Hooks ESLint 규칙

- [ ] 소스 학습 완료
- [ ] skill 검증/개선

**Source Files** (`ref/react-fork/packages/eslint-plugin-react-hooks/src/`):

| Subdir/File | Role |
|-------------|------|
| `rules/RulesOfHooks.js` | rules-of-hooks 규칙 |
| `rules/ExhaustiveDeps.js` | exhaustive-deps 규칙 |
| `code-path-analysis/` | 코드 경로 분석 |
| `shared/` | 공유 유틸 |

**Study Points** (소스 구조에서 도출):
- RulesOfHooks: 조건부 훅 호출 감지 알고리즘
- ExhaustiveDeps: deps 배열 자동 완성/검증
- 코드 경로 분석: ESLint code path API 활용
- 의존 모듈: 없음 (ESLint 플러그인)

**Docs**: 해당 없음

**Skill Target**: 신규 생성 필요

---

### Topic 27: react-debug-tools ⬜ 미커버

> DevTools용 Hook 디버깅 유틸리티

- [ ] 소스 학습 완료
- [ ] skill 검증/개선

**Source Files** (`ref/react-fork/packages/react-debug-tools/src/`):

| File | Role |
|------|------|
| `ReactDebugTools.js` | Hook 정보 추출 메인 |
| `ReactDebugHooks.js` | Hook 타입별 디버그 정보 |

**Study Points** (소스 구조에서 도출):
- getHooks, parseHookName: Fiber에서 Hook 정보 추출
- DevTools와의 연동 인터페이스
- 의존 모듈: react-reconciler (Fiber 내부 타입)

**Docs**: 해당 없음

**Skill Target**: 신규 생성 필요

---

### Topic 28: compiler (React Compiler) ⬜ 미커버

> React Compiler — 자동 메모이제이션 바벨 플러그인 (500+ files)

- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선

**Source Files** (`ref/react-fork/compiler/packages/babel-plugin-react-compiler/src/`):

| Subdir | Role |
|--------|------|
| `Entrypoint/` | Babel 플러그인 진입점 (Pipeline, Program, Options) |
| `HIR/` | High-level IR (BuildHIR, Environment, Globals, Types) |
| `Inference/` | 타입/뮤테이션 추론 (InferMutationAliasingEffects, DropManualMemoization) |
| `Optimization/` | 최적화 패스 |
| `ReactiveScopes/` | 반응형 스코프 분석 |
| `Validation/` | 검증 패스 |
| `CodeGen/` | 코드 생성 |

**Study Points** (소스 구조에서 도출):
- 컴파일 파이프라인: Parse → HIR → Inference → Optimization → CodeGen
- HIR: 고수준 중간 표현
- ReactiveScopes: 자동 useMemo/useCallback 삽입 단위
- 의존 모듈: 없음 (독립 Babel 플러그인)

**Docs** (`ref/react.dev/src/content/`):
- `learn/react-compiler/` 디렉토리
- `reference/react-compiler/` 디렉토리

**Skill Target**: 신규 생성 필요 (`references/compiler.md`)

---

## Part 9: Docs Supplementary Study (3 Sections)

Part 1~8에서 소스 코드로 내부 동작을 이해한 후, 공식 문서로 "사용자 관점"의 베스트 프랙티스를 보충한다.

---

### Section A: Learn Guides

> Part 1~8에서 다루지 않은 실용적 가이드 학습

- [ ] 학습 완료
- [ ] skill 검증/개선 (`references/patterns.md`, `references/anti-patterns.md`)

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

**Skill Target**: `references/patterns.md`, `references/anti-patterns.md`

---

### Section B: API Reference

> 각 API의 공식 설명과 react-aio 내용 대조

- [ ] 학습 완료
- [ ] skill 검증/개선 (전체 `references/`)

**Docs** (`ref/react.dev/src/content/reference/react/`):
- 모든 훅 API 레퍼런스 (useState ~ useEffectEvent)
- 컴포넌트 API (Suspense, StrictMode, Profiler, Fragment)
- 유틸리티 API (memo, lazy, forwardRef, cache)

**Skill Target**: 전체 `references/`

---

### Section C: Best Practices Cross-Check

> 기존 best-practices 규칙 검증

- [ ] 학습 완료
- [ ] skill 검증/개선 (`references/best-practices/`)

**Docs**: 소스 코드 학습 결과 + react.dev 가이드 기반으로 59개 규칙 교차 검증

**Skill Target**: `references/best-practices/index.md`, `references/best-practices/rules/`

---

## Files To Modify

| Action | File | Source |
|--------|------|--------|
| Verify/Improve | `skills/react-aio/references/fiber.md` | Topics 4, 5 |
| Verify/Improve | `skills/react-aio/references/reconciliation.md` | Topic 6 |
| Verify/Improve | `skills/react-aio/references/scheduler.md` | Topics 2, 7 |
| Verify/Improve | `skills/react-aio/references/hooks.md` | Topics 3, 8 |
| Verify/Improve | `skills/react-aio/references/effects.md` | Topic 9 |
| Verify/Improve | `skills/react-aio/references/context.md` | Topic 10 |
| Verify/Improve | `skills/react-aio/references/suspense.md` | Topic 11 |
| Verify/Improve | `skills/react-aio/references/activity.md` | Topic 11 |
| Verify/Improve | `skills/react-aio/references/transitions.md` | Topic 12 |
| Verify/Improve | `skills/react-aio/references/actions.md` | Topic 12 |
| Verify/Improve | `skills/react-aio/references/error-handling.md` | Topic 13 |
| Verify/Improve | `skills/react-aio/references/events.md` | Topic 14 |
| Verify/Improve | `skills/react-aio/references/portals.md` | Topic 15 |
| Verify/Improve | `skills/react-aio/references/server-components.md` | Topics 16, 17 |
| Verify/Improve | `skills/react-aio/references/memo.md` | Topic 1 (shared) |
| Verify/Improve | `skills/react-aio/references/lazy.md` | Topic 1 (shared) |
| Verify/Improve | `skills/react-aio/references/refs.md` | Topic 8 (hooks) |
| Review (고아) | `skills/react-aio/references/patterns.md` | Section A |
| Review (고아) | `skills/react-aio/references/anti-patterns.md` | Section A |
| Review (고아) | `skills/react-aio/references/best-practices/` | Section C |
| Create (신규) | `skills/react-aio/references/compiler.md` | Topic 28 |

## Verification

- 각 토픽 완료 후: 수정된 레퍼런스 문서의 내용이 소스 코드와 일치하는지 교차 확인
- 전체 완료 후: `bash scripts/check-docs.sh` 실행하여 문서 정합성 검증
