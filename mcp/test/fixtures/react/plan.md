# React Source Code & Documentation Study Plan

> React 소스 코드(`ref/react-fork`)와 공식 문서(`ref/react.dev`)를 주제별로 학습하면서,
> 학습 결과를 바탕으로 `skills/react-aio/`의 기존 참조 문서를 검증·보강한다.

## Current State

- **Skill**: react-aio — 19개 참조 문서 + 59개 best-practice 규칙 (v19.2.4 기준)
- **Source**: `ref/react-fork/packages/` — 38개 패키지 + `compiler/packages/` 8개 (총 46 모듈, ~3,672 files)
- **Docs**: `ref/react.dev/` — 46개 learn 가이드 + 77개 API 레퍼런스 (총 ~144 .md files)

## Coverage Analysis

| Status | Module | Skill Target |
|--------|--------|--------------|
| ✅ 커버 | react | hooks.md, memo.md, lazy.md, context.md, refs.md, transitions.md, activity.md, actions.md |
| ✅ 커버 | react-reconciler | fiber.md, reconciliation.md, hooks.md, effects.md, suspense.md, error-handling.md, refs.md, context.md |
| ✅ 커버 | scheduler | scheduler.md |
| ✅ 커버 | shared | memo.md, lazy.md (shallowEqual 관련, 부분) |
| ✅ 커버 | react-dom-bindings | events.md, actions.md (부분) |
| ✅ 커버 | react-dom | portals.md, actions.md (부분) |
| ✅ 커버 | react-server | server-components.md |
| ✅ 커버 | react-server-dom-webpack | server-components.md (부분) |
| ⬜ 미커버 | react-client | 신규 생성 필요 |
| ⬜ 미커버 | react-is | 신규 생성 필요 |
| ⬜ 미커버 | react-cache | 신규 생성 필요 |
| ⬜ 미커버 | react-refresh | 신규 생성 필요 |
| ⬜ 미커버 | react-markup | 신규 생성 필요 |
| ⬜ 미커버 | use-sync-external-store | 신규 생성 필요 |
| ⬜ 미커버 | use-subscription | 신규 생성 필요 |
| ⬜ 미커버 | react-server-dom-turbopack | 신규 생성 필요 |
| ⬜ 미커버 | react-server-dom-parcel | 신규 생성 필요 |
| ⬜ 미커버 | react-server-dom-esm | 신규 생성 필요 |
| ⬜ 미커버 | react-server-dom-unbundled | 신규 생성 필요 |
| ⬜ 미커버 | react-server-dom-fb | 신규 생성 필요 |
| ⬜ 미커버 | react-native-renderer | 신규 생성 필요 |
| ⬜ 미커버 | react-art | 신규 생성 필요 |
| ⬜ 미커버 | react-noop-renderer | 신규 생성 필요 |
| ⬜ 미커버 | react-test-renderer | 신규 생성 필요 |
| ⬜ 미커버 | react-devtools-shared | 신규 생성 필요 |
| ⬜ 미커버 | react-devtools | 신규 생성 필요 |
| ⬜ 미커버 | react-devtools-core | 신규 생성 필요 |
| ⬜ 미커버 | react-devtools-inline | 신규 생성 필요 |
| ⬜ 미커버 | react-devtools-fusebox | 신규 생성 필요 |
| ⬜ 미커버 | react-devtools-extensions | 신규 생성 필요 |
| ⬜ 미커버 | react-devtools-shell | 신규 생성 필요 |
| ⬜ 미커버 | react-devtools-timeline | 신규 생성 필요 |
| ⬜ 미커버 | react-debug-tools | 신규 생성 필요 |
| ⬜ 미커버 | react-suspense-test-utils | 신규 생성 필요 |
| ⬜ 미커버 | eslint-plugin-react-hooks | 신규 생성 필요 |
| ⬜ 미커버 | dom-event-testing-library | 신규 생성 필요 |
| ⬜ 미커버 | jest-react | 신규 생성 필요 |
| ⬜ 미커버 | internal-test-utils | 신규 생성 필요 |
| ⬜ 미커버 | babel-plugin-react-compiler | 신규 생성 필요 |
| ⬜ 미커버 | eslint-plugin-react-compiler | 신규 생성 필요 |
| ⬜ 미커버 | react-compiler-healthcheck | 신규 생성 필요 |
| ⬜ 미커버 | react-compiler-runtime | 신규 생성 필요 |
| ⬜ 미커버 | make-read-only-util | 신규 생성 필요 |
| ⬜ 미커버 | react-forgive | 신규 생성 필요 |
| ⬜ 미커버 | react-mcp-server | 신규 생성 필요 |
| ⬜ 미커버 | snap | 신규 생성 필요 |
| 🔗 고아 ref | — | `references/patterns.md` (크로스커팅, 패키지 비특정) |
| 🔗 고아 ref | — | `references/anti-patterns.md` (크로스커팅, 패키지 비특정) |
| 🔗 고아 ref | — | `references/best-practices/` (크로스커팅, 패키지 비특정) |

- **커버율**: 8/46 모듈 (17.4%)

## Core Principles

- 사용자가 직접 소스를 읽고 학습하며 진행 (AI가 일방적으로 작성하지 않음)
- 주제(토픽) 단위로 소스 + 문서를 묶어서 학습
- 각 토픽 완료 시 해당 스킬 레퍼런스 문서를 검증/개선

## Session Flow (각 토픽마다 반복)

1. 소스 파일 읽기 (사용자 주도, 질의/토론)
2. 공식 문서 교차 확인
3. 스킬 reference 검증 (소스 코드 대조)
4. 최소 개선 (사용자 결정)
5. Study-Skill Verification 테이블 업데이트

## Learning Strategy: Top-Down Concept Chain

**개념 체인 기반** 학습 — 사용자가 쓰는 API에서 시작하여 내부 구현으로 수직 드릴다운.

```
useState 사용 (Topic 1)
  → 상태가 저장되는 구조: Fiber (Topic 3)
  → 렌더링 엔진: Work Loop (Topic 4)
  → Hook 내부 구현 (Topic 5)
  → 변경 감지: Reconciliation (Topic 6)
  → DOM 반영: Effects & Commit (Topic 7)
```

Phase 간 수직 연결을 우선하고, 같은 Phase 내 수평 확장은 이후에 진행.

---

## Phase 1: Hooks & Rendering Core — 핵심 경로 (7 Topics)

useState/useEffect를 시작점으로 삼아 React 렌더링의 핵심 메커니즘을 수직으로 탐색한다.

---

### Topic 1: react ✅ 커버

> React 패키지의 공개 API Surface — 모든 React 앱의 진입점

**Source Files** (`ref/react-fork/packages/react/`, 82 files):

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
- Client vs Server API surface 차이 (ReactClient.js vs ReactServer.js)
- 의존 모듈: shared (ReactSymbols, ReactTypes)

**Docs** (`ref/react.dev/src/content/`):
- `reference/react/` — 49개 API 레퍼런스 파일
- `learn/describing-the-ui.md`, `learn/adding-interactivity.md`

**Skill Target**: hooks.md, memo.md, lazy.md, context.md, refs.md, transitions.md, activity.md, actions.md

---

### Topic 2: shared ⬜ 미커버 (ref 부분 커버)

> React 전체 패키지가 공유하는 유틸리티/상수 — deps 비교, Symbol 상수, Feature Flags
> **왜 여기서**: useState의 deps 비교(shallowEqual), 엘리먼트 타입 식별(ReactSymbols)의 기초

**Source Files** (`ref/react-fork/packages/shared/`, 52 files):

| File | Role |
|------|------|
| `ReactSymbols.js` | REACT_ELEMENT_TYPE 등 Symbol 상수 |
| `ReactTypes.js` | 공유 타입 정의 |
| `ReactElementType.js` | 엘리먼트 타입 정의 |
| `ReactFeatureFlags.js` | Feature flag 설정 |
| `objectIs.js` | Object.is 폴리필 |
| `shallowEqual.js` | 얕은 비교 (memo, deps 비교) |
| `getComponentNameFromType.js` | 컴포넌트명 추출 유틸 |
| `ReactSharedInternals.js` | 패키지 간 내부 통신 채널 |
| `ReactDOMSharedInternals.js` | DOM 패키지 공유 내부 |
| `CheckStringCoercion.js` | 문자열 변환 검증 |

**Study Points** (소스 구조에서 도출):
- ReactSymbols: REACT_ELEMENT_TYPE, REACT_FRAGMENT_TYPE 등 Symbol 상수 목록
- shallowEqual/objectIs: deps 비교의 기초 알고리즘 (useMemo, useCallback, memo의 근간)
- ReactFeatureFlags: 기능 활성화/비활성화 분기 패턴
- forks/ 디렉토리: 환경별(www, native, test) 오버라이드
- 의존 모듈: 없음 (최하위 레이어)

**Docs**: 해당 없음 (내부 구현)

**Skill Target**: `references/memo.md`, `references/lazy.md` (shallowEqual 관련)

---

### Topic 3: react-reconciler — Fiber Structure ✅ 커버

> Fiber 노드 자료구조 — useState가 저장되는 곳
> **왜 여기서**: Topic 1의 Hook이 `memoizedState`에 저장됨 → Fiber 구조 이해 필요

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
- **연결**: `memoizedState` → Topic 5(Hooks)에서 링크드 리스트 구조 상세 학습
- 의존 모듈: shared (ReactTypes)

**Docs**: 해당 없음 (내부 구현)

**Skill Target**: `references/fiber.md`

---

### Topic 4: react-reconciler — Work Loop ✅ 커버

> React 렌더링 엔진의 메인 루프 — setState 호출 후 무엇이 실행되는가
> **왜 여기서**: Topic 3의 Fiber 트리를 어떻게 순회하고 업데이트하는지

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
- **연결**: Render Phase에서 Topic 5(Hooks)와 Topic 6(Reconciliation)이 실행됨
- 의존 모듈: scheduler (scheduleCallback, shouldYieldToHost), shared

**Docs**: 해당 없음 (내부 구현)

**Skill Target**: `references/fiber.md` (Work Loop 섹션)

---

### Topic 5: react-reconciler — Hooks ✅ 커버

> 모든 Hook의 내부 구현 — useState, useEffect, useMemo가 실제로 동작하는 방식
> **왜 여기서**: Topic 1의 API → Topic 3의 Fiber → Topic 4의 Work Loop을 이해한 상태에서 드릴다운

**Source Files** (`ref/react-fork/packages/react-reconciler/src/`):

| File | Role |
|------|------|
| `ReactFiberHooks.js` | 모든 훅 구현 (mount/update dispatcher) |

**Study Points** (소스 구조에서 도출):
- HooksDispatcherOnMount / HooksDispatcherOnUpdate: mount vs update 분기
- memoizedState 링크드 리스트 구조 (Topic 3의 Fiber.memoizedState 필드)
- 업데이트 큐: queue.pending → circular linked list
- 개별 훅: mountState, updateState, mountEffect, updateEffect, mountMemo, updateMemo, mountCallback, mountRef, mountContext
- React 19 신규 훅: mountUse, mountActionState, mountOptimistic, mountEffectEvent
- **연결**: shallowEqual(Topic 2) 사용, Fiber.memoizedState(Topic 3) 저장, Work Loop(Topic 4)에서 실행
- 의존 모듈: shared (objectIs), react (타입)

**Docs** (`ref/react.dev/src/content/reference/react/`):
- useState.md, useEffect.md, useCallback.md, useMemo.md, useRef.md, useContext.md, useReducer.md, use.md, useId.md

**Skill Target**: `references/hooks.md`

---

### Topic 6: react-reconciler — Reconciliation ✅ 커버

> 변경 감지와 최소 업데이트 계산 — 어떤 컴포넌트가 리렌더링되는가
> **왜 여기서**: Work Loop(Topic 4)의 Render Phase에서 실행되는 핵심 알고리즘

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
- **연결**: beginWork에서 Topic 5(Hooks) dispatcher 호출, bailout에서 Topic 2(shallowEqual) 사용
- 의존 모듈: shared (ReactTypes, ReactSymbols)

**Docs**: `learn/preserving-and-resetting-state.md`

**Skill Target**: `references/reconciliation.md`

---

### Topic 7: react-reconciler — Effects & Commit ✅ 커버

> 커밋 단계와 Effect 실행 순서 — useEffect/useLayoutEffect가 언제 실행되는가
> **왜 여기서**: Work Loop(Topic 4)의 Commit Phase — Render Phase(Topic 6) 이후 DOM 반영

**Source Files** (`ref/react-fork/packages/react-reconciler/src/`):

| File | Role |
|------|------|
| `ReactFiberCommitWork.js` | 메인 커밋 로직 (before mutation → mutation → layout → passive) |
| `ReactFiberCommitEffects.js` | Effect 순회/실행 |
| `ReactFiberCommitHostEffects.js` | Host(DOM) 커밋 연산 |
| `ReactFiberCommitViewTransitions.js` | View Transitions 커밋 (React 19.2+) |
| `ReactHookEffectTags.js` | HasEffect, Layout, Passive 등 플래그 |

**Study Points** (소스 구조에서 도출):
- 커밋 3단계: beforeMutation → mutation → layout
- Passive effects (useEffect): flushPassiveEffects로 별도 스케줄링
- Layout effects (useLayoutEffect): mutation 직후 동기 실행
- View Transitions: 커밋 시 DOM 전환 애니메이션 (신규)
- Effect tags: HasEffect, Insertion, Layout, Passive
- **연결**: Topic 5(Hooks)에서 등록한 Effect가 여기서 실행됨
- 의존 모듈: shared

**Docs**:
- `reference/react/useEffect.md`, `reference/react/useLayoutEffect.md`, `reference/react/useInsertionEffect.md`
- `learn/synchronizing-with-effects.md`, `learn/you-might-not-need-an-effect.md`

**Skill Target**: `references/effects.md`

---

## Phase 2: DOM & Advanced Features — 수평 확장 (9 Topics)

Phase 1의 핵심 경로를 이해한 상태에서, DOM 연동과 고급 기능으로 확장한다.

---

### Topic 8: react-dom ✅ 커버

> DOM 렌더링 진입점 — createRoot, hydrateRoot, Portals, flushSync
> **왜 여기서**: Phase 1에서 Reconciler 내부를 이해했으니 DOM 연동 학습

**Source Files** (`ref/react-fork/packages/react-dom/`, 221 files):

| File | Role |
|------|------|
| `index.js` | 전체 export: createPortal, flushSync, prefetchDNS, preconnect, preload, preinit |
| `src/client/ReactDOMRoot.js` | createRoot, hydrateRoot 구현 |
| `src/client/ReactDOMClient.js` | 클라이언트 엔트리포인트 |
| `src/shared/ReactDOMFloat.js` | 리소스 프리로딩 (Suspense 연동) |
| `src/shared/ReactDOMFlushSync.js` | flushSync |
| `src/server/ReactDOMFizzServerBrowser.js` | 브라우저 SSR |
| `src/server/ReactDOMFizzServerNode.js` | Node SSR |
| `src/server/ReactDOMFizzStaticBrowser.js` | Static prerender |

**Study Points** (소스 구조에서 도출):
- Entrypoint exports: createPortal, flushSync, prefetchDNS, preconnect, preload, preloadModule, preinit, preinitModule, requestFormReset, useFormState, useFormStatus
- createRoot → FiberRoot 생성 과정 (Topic 4 Work Loop 연결)
- Hydration: 서버 HTML ↔ 클라이언트 트리 매칭
- flushSync: 동기 강제 렌더링
- 의존 모듈: react-reconciler, react-dom-bindings, react-server, shared

**Docs** (`ref/react.dev/src/content/reference/react-dom/`):
- `client/createRoot.md`, `client/hydrateRoot.md`
- `server/renderToPipeableStream.md`, `server/renderToReadableStream.md`
- `createPortal.md`, `flushSync.md`

**Skill Target**: `references/portals.md`, `references/actions.md` (부분)

---

### Topic 9: react-dom-bindings ✅ 커버

> DOM 연산, 이벤트 위임, CSS/속성 처리
> **왜 여기서**: react-dom이 내부적으로 사용하는 DOM 바인딩 레이어

**Source Files** (`ref/react-fork/packages/react-dom-bindings/`, 93 files):

| File | Role |
|------|------|
| `src/client/ReactDOMComponent.js` | DOM 컴포넌트 생성/업데이트 |
| `src/client/ReactFiberConfigDOM.js` | Reconciler ↔ DOM 호스트 설정 |
| `src/events/DOMPluginEventSystem.js` | 이벤트 위임 시스템 |
| `src/events/ReactDOMEventListener.js` | 이벤트 리스너 등록 |
| `src/events/SyntheticEvent.js` | SyntheticEvent 생성 |
| `src/events/getEventTarget.js` | 이벤트 타겟 결정 |
| `src/server/ReactFizzConfigDOM.js` | 서버 사이드 DOM 설정 |
| `src/shared/CSSPropertyOperations.js` | CSS 속성 처리 |

**Study Points** (소스 구조에서 도출):
- 이벤트 위임: root에 리스너 등록, 버블링/캡처 분기
- SyntheticEvent: 네이티브 이벤트 래핑
- DOMPluginEventSystem: 이벤트 플러그인 아키텍처
- DOM property/attribute diffing
- 의존 모듈: shared, react-reconciler (Fiber 타입, EventPriority)

**Docs**: `learn/responding-to-events.md`

**Skill Target**: `references/events.md`

---

### Topic 10: react-reconciler — Context ✅ 커버

> Context 전파 메커니즘
> **왜 여기서**: Reconciliation(Topic 6) 이해 후 Context가 bailout을 무시하는 메커니즘 학습

**Source Files** (`ref/react-fork/packages/react-reconciler/src/`):

| File | Role |
|------|------|
| `ReactFiberNewContext.js` | Modern Context (Provider → Consumer 전파) |
| `ReactFiberHostContext.js` | Host 환경 컨텍스트 |

**Study Points** (소스 구조에서 도출):
- Provider 값 변경 → Consumer 탐색 알고리즘
- Object.is 기반 값 비교 (Topic 2 shallowEqual과의 차이)
- Context 변경이 bailout을 무시하는 메커니즘 (Topic 6 Reconciliation 연결)
- 의존 모듈: shared (objectIs)

**Docs**:
- `reference/react/createContext.md`, `reference/react/useContext.md`
- `learn/passing-data-deeply-with-context.md`

**Skill Target**: `references/context.md`

---

### Topic 11: react-reconciler — Suspense & Activity ✅ 커버

> 비동기 렌더링, Suspense, Activity(Offscreen)
> **왜 여기서**: Reconciliation(Topic 6)의 특수 경로 — Promise throw 처리

**Source Files** (`ref/react-fork/packages/react-reconciler/src/`):

| File | Role |
|------|------|
| `ReactFiberSuspenseComponent.js` | Suspense 컴포넌트 처리 |
| `ReactFiberSuspenseContext.js` | Suspense 경계 컨텍스트 |
| `ReactFiberThenable.js` | Promise/thenable 추적 |
| `ReactFiberThrow.js` | throw 처리 (Suspense catch) |
| `ReactFiberOffscreenComponent.js` | Offscreen/Activity 렌더링 |
| `ReactFiberActivityComponent.js` | Activity 컴포넌트 |

**Study Points** (소스 구조에서 도출):
- Promise throw → Suspense 경계 catch 메커니즘
- SuspenseState: fallback vs primary 트리 전환
- use() Hook과 thenable 추적 (Topic 5 Hooks 연결)
- Activity: UI 숨김/보존, hydration 경계
- 의존 모듈: shared

**Docs**:
- `reference/react/Suspense.md`, `reference/react/use.md`, `reference/react/Activity.md`

**Skill Target**: `references/suspense.md`, `references/activity.md`

---

### Topic 12: react-reconciler — Transitions & Actions ✅ 커버

> useTransition, useActionState, Gesture 스케줄링
> **왜 여기서**: Suspense(Topic 11)와 연동하는 concurrent 기능

**Source Files** (`ref/react-fork/packages/react-reconciler/src/`):

| File | Role |
|------|------|
| `ReactFiberAsyncAction.js` | useTransition, useActionState 내부 |
| `ReactFiberTransition.js` | Transition 추적 |
| `ReactFiberGestureScheduler.js` | Gesture 스케줄링 (React 19.2+) |
| `ReactFiberViewTransitionComponent.js` | ViewTransition 컴포넌트 |

**Study Points** (소스 구조에서 도출):
- startTransition → TransitionLane 할당 (Topic 13 Lanes 연결)
- async action과 isPending 상태 관리
- useOptimistic: 낙관적 업데이트 → revert
- GestureScheduler: View Transition 연동 (신규)
- 의존 모듈: shared

**Docs**:
- `reference/react/useTransition.md`, `reference/react/useActionState.md`, `reference/react/useOptimistic.md`
- `reference/react/ViewTransition.md`

**Skill Target**: `references/transitions.md`, `references/actions.md`

---

### Topic 13: react-reconciler — Lanes & Priority ✅ 커버

> React의 우선순위 시스템
> **왜 여기서**: Transitions(Topic 12)의 TransitionLane이 어떻게 스케줄링되는지

**Source Files** (`ref/react-fork/packages/react-reconciler/src/`):

| File | Role |
|------|------|
| `ReactFiberLane.js` | Lane 모델 (32비트 비트마스크 스케줄링) |
| `ReactEventPriorities.js` | 이벤트→Lane 우선순위 매핑 |

**Study Points** (소스 구조에서 도출):
- Lane 비트마스크 상수: SyncLane, DefaultLane, TransitionLane 등
- export: mergeLanes, includesSomeLane, getHighestPriorityLane, getNextLanes
- 이벤트 타입별 우선순위 할당 매핑
- **연결**: Topic 4(Work Loop)의 getNextLanes, Topic 6(Reconciliation)의 bailout 조건
- 의존 모듈: shared

**Docs**: 해당 없음 (내부 구현)

**Skill Target**: `references/scheduler.md` (Lane 섹션)

---

### Topic 14: scheduler ✅ 커버

> 시간 분할(Time Slicing)과 우선순위 작업 큐
> **왜 여기서**: Lanes(Topic 13) → 실제 작업 스케줄링 구현

**Source Files** (`ref/react-fork/packages/scheduler/`, 28 files):

| File | Role |
|------|------|
| `index.js` | 엔트리포인트 |
| `src/forks/Scheduler.js` | 메인 스케줄러 (작업 큐, shouldYield) |
| `src/SchedulerMinHeap.js` | 우선순위 큐 (min heap) |
| `src/SchedulerPriorities.js` | ImmediateP, UserBlockingP, NormalP, LowP, IdleP |
| `src/SchedulerFeatureFlags.js` | 스케줄러 Feature flags |
| `src/SchedulerProfiling.js` | 프로파일링 |

**Study Points** (소스 구조에서 도출):
- Entrypoint exports: `scheduleCallback`, `cancelCallback`, `shouldYieldToHost`, `getCurrentTime`
- Min heap: taskQueue, timerQueue 구조
- 5ms 타임 슬라이스, `MessageChannel` 기반 비동기 스케줄링
- **연결**: Work Loop(Topic 4)의 shouldYield() 호출 대상
- 의존 모듈: 없음

**Docs**: 해당 없음 (내부 구현)

**Skill Target**: `references/scheduler.md`

---

### Topic 15: react-reconciler — Error Handling ✅ 커버

> Error Boundary와 에러 전파

**Source Files** (`ref/react-fork/packages/react-reconciler/src/`):

| File | Role |
|------|------|
| `ReactFiberThrow.js` | 에러 throw 처리 (Error Boundary catch 포함) |
| `ReactFiberUnwindWork.js` | 에러 발생 시 unwind 처리 |
| `ReactCapturedValue.js` | 캡처된 에러 값 |

**Study Points** (소스 구조에서 도출):
- throwException: Error Boundary 탐색 알고리즘
- getDerivedStateFromError / componentDidCatch 호출
- Suspense catch(Topic 11) vs Error catch 분기
- 의존 모듈: shared

**Docs**: `reference/react/Component.md` (componentDidCatch, getDerivedStateFromError)

**Skill Target**: `references/error-handling.md`

---

### Topic 16: react-reconciler — Remaining Files ✅ 커버 (부분)

> Phase 1~2에서 다루지 않은 react-reconciler 잔여 파일들
> Hydration, ClassComponent, Profiler, ViewTransition, MutationTracking 등

**Source Files** (`ref/react-fork/packages/react-reconciler/src/`):

| File | Role |
|------|------|
| `ReactFiberHydrationContext.js` | 하이드레이션 컨텍스트 |
| `ReactFiberHydrationDiffs.js` | 하이드레이션 diff |
| `ReactFiberShellHydration.js` | Shell 하이드레이션 |
| `ReactFiberClassComponent.js` | 클래스 컴포넌트 처리 |
| `ReactFiberClassUpdateQueue.js` | 클래스 업데이트 큐 |
| `ReactFiberCacheComponent.js` | 캐시 컴포넌트 |
| `ReactFiberMutationTracking.js` | 뮤테이션 추적 |
| `ReactFiberPerformanceTrack.js` | 성능 추적 |
| `ReactProfilerTimer.js` | 프로파일러 타이머 |
| `ReactFiberStack.js` | 스택 프레임 관리 |
| `ReactFiberTreeContext.js` | 트리 컨텍스트 |
| `ReactFiberTreeReflection.js` | 트리 반사 |
| `ReactFiberConcurrentUpdates.js` | 동시성 업데이트 |
| `ReactFiberReconciler.js` | Reconciler 공개 API |
| `ReactFiberScope.js` | 스코프 처리 |
| `ReactFiberHotReloading.js` | HMR 지원 |
| `ReactFiberDuplicateViewTransitions.js` | 중복 ViewTransition 감지 |
| `ReactFiberApplyGesture.js` | 제스처 적용 |

**Study Points** (소스 구조에서 도출):
- Hydration: 서버 HTML → 클라이언트 Fiber 매칭 과정 (Topic 8 react-dom 연결)
- ClassComponent: setState, forceUpdate, lifecycle 메서드
- Cache: CacheComponent, Suspense 캐시 통합
- 의존 모듈: shared

**Docs**: `reference/react-dom/client/hydrateRoot.md`

**Skill Target**: `references/fiber.md`, `references/reconciliation.md` (부분 보강)

---

## Phase 3: Server & Tooling — RSC, 컴파일러, 개발 도구 (7 Topics)

Phase 1~2의 클라이언트 런타임 이해를 바탕으로 서버 렌더링과 개발 도구로 확장.

---

### Topic 17: react-server + react-client ✅ 커버 (부분)

> RSC 직렬화/소비 프로토콜 — Fizz(스트리밍 SSR) + Flight(RSC 프로토콜) + 클라이언트 소비
> 그룹핑 사유: Flight 프로토콜의 서버 측(react-server)과 클라이언트 측(react-client) — 양면 학습

**Source Files**:

`ref/react-fork/packages/react-server/` (76 files):

| File | Role |
|------|------|
| `src/ReactFizzServer.js` | Fizz 메인 렌더러 (스트리밍 SSR) |
| `src/ReactFizzHooks.js` | 서버 사이드 훅 구현 |
| `src/ReactFlightServer.js` | RSC 렌더러 (컴포넌트→클라이언트 직렬화) |
| `src/ReactFlightHooks.js` | Server Component 훅 |
| `src/ReactFlightActionServer.js` | Server Actions |
| `src/ReactFlightReplyServer.js` | 클라이언트→서버 직렬화 |

`ref/react-fork/packages/react-client/` (34 files):

| File | Role |
|------|------|
| `src/ReactFlightClient.js` | Flight 프로토콜 클라이언트 소비 |

**Study Points** (소스 구조에서 도출):
- Fizz 스트리밍: segments, boundaries, 점진적 HTML
- Flight Protocol: 컴포넌트 트리 직렬화 포맷
- 'use client' / 'use server' 경계 처리
- ClientReference / ServerReference 메커니즘
- Server Actions RPC 흐름
- react-client: Flight 응답 파싱
- 의존 모듈: shared, react

**Docs** (`ref/react.dev/src/content/`):
- `reference/rsc/server-components.md`, `reference/rsc/server-functions.md`
- `reference/rsc/use-client.md`, `reference/rsc/use-server.md`
- `reference/react-dom/server/renderToPipeableStream.md`

**Skill Target**: `references/server-components.md`

---

### Topic 18: react-server-dom-* (Bundler Variants) ⬜ 미커버

> Flight 프로토콜의 번들러별 구현 (webpack, turbopack, parcel, esm, unbundled, fb)
> 그룹핑 사유: 6개 패키지가 동일 Flight 프로토콜의 번들러 어댑터 변형

**Source Files** (218 files 합계):

| Package | Files | Role |
|---------|-------|------|
| react-server-dom-webpack | 65 | webpack 번들러용 Flight |
| react-server-dom-turbopack | 53 | Turbopack 번들러용 Flight |
| react-server-dom-parcel | 44 | Parcel 번들러용 Flight |
| react-server-dom-esm | 27 | ESM 환경용 Flight |
| react-server-dom-unbundled | 27 | 비번들 환경용 Flight |
| react-server-dom-fb | 2 | Meta 내부용 Flight |

**Study Points** (소스 구조에서 도출):
- 각 번들러 어댑터의 client/server 엔트리포인트 구조
- 번들러별 모듈 참조 해석(resolve) 차이
- webpack PluginServerRegister 등 번들러 통합 패턴
- 의존 모듈: react-server, react-client, shared

**Docs**: `reference/rsc/` (간접 참조)

**Skill Target**: `references/server-components.md` 확장 또는 신규 생성

---

### Topic 19: use-sync-external-store ⬜ 미커버

> 외부 상태 소스 동기화 Hook

**Source Files** (`ref/react-fork/packages/use-sync-external-store/`, 22 files):

| File | Role |
|------|------|
| `src/useSyncExternalStore.js` | 메인 구현 |
| `src/useSyncExternalStoreShim.js` | React 18 이전 호환 shim |
| `src/useSyncExternalStoreWithSelector.js` | selector 지원 확장 |

**Study Points** (소스 구조에서 도출):
- Entrypoint exports: useSyncExternalStore, useSyncExternalStoreWithSelector
- Tearing 방지 메커니즘 (Concurrent Mode 연결)
- Shim vs native 구현 분기
- 의존 모듈: react

**Docs**: `reference/react/useSyncExternalStore.md`

**Skill Target**: 신규 생성 필요

---

### Topic 20: eslint-plugin-react-hooks ⬜ 미커버

> React Hooks ESLint 규칙

**Source Files** (`ref/react-fork/packages/eslint-plugin-react-hooks/`, 26 files):

| File/Subdir | Role |
|-------------|------|
| `src/index.ts` | 플러그인 엔트리포인트 |
| `src/rules/RulesOfHooks.ts` | rules-of-hooks 규칙 |
| `src/rules/ExhaustiveDeps.ts` | exhaustive-deps 규칙 |
| `src/code-path-analysis/` | 코드 경로 분석 |
| `src/shared/` | 공유 유틸 |

**Study Points** (소스 구조에서 도출):
- RulesOfHooks: 조건부 훅 호출 감지 알고리즘 (Topic 5 Hooks 연결 — 왜 순서가 중요한지)
- ExhaustiveDeps: deps 배열 자동 완성/검증
- 코드 경로 분석: ESLint code path API 활용
- 의존 모듈: 없음 (ESLint 플러그인)

**Docs**: `reference/eslint-plugin-react-hooks/` (1 file)

**Skill Target**: 신규 생성 필요

---

### Topic 21: babel-plugin-react-compiler ⬜ 미커버

> React Compiler — 자동 메모이제이션 바벨 플러그인 (~2,000 files)
> 분할 사유: 13개 하위 디렉토리 기준, 파일 수가 매우 많아 개요 수준 학습

**Source Files** (`ref/react-fork/compiler/packages/babel-plugin-react-compiler/src/`):

| Subdir | Role |
|--------|------|
| `Entrypoint/` | Babel 플러그인 진입점 (Pipeline, Program, Options) |
| `HIR/` | High-level IR (BuildHIR, Environment, Globals, Types) |
| `Inference/` | 타입/뮤테이션 추론 |
| `Optimization/` | 최적화 패스 |
| `ReactiveScopes/` | 반응형 스코프 분석 |
| `Validation/` | 검증 패스 |
| `Babel/` | Babel AST 변환 |
| `Flood/` | Flood 분석 |
| `SSA/` | SSA (Static Single Assignment) 변환 |
| `Transform/` | 변환 패스 |
| `TypeInference/` | 타입 추론 |
| `Utils/` | 유틸리티 |

**Study Points** (소스 구조에서 도출):
- 컴파일 파이프라인: Parse → HIR → SSA → Inference → Optimization → ReactiveScopes → Validation → CodeGen
- HIR: 고수준 중간 표현
- ReactiveScopes: 자동 useMemo/useCallback 삽입 단위 (Topic 5 Hooks의 자동화)
- 의존 모듈: 없음 (독립 Babel 플러그인)

**Docs** (`ref/react.dev/src/content/`):
- `reference/react-compiler/` (8 files)

**Skill Target**: 신규 생성 필요 (`references/compiler.md`)

---

### Topic 22: Compiler Sub-packages + Small Utils ⬜ 미커버

> React Compiler 보조 패키지 + 소규모 유틸리티
> 그룹핑 사유: 소규모 패키지 10개 묶음

**Source Files** (76 files 합계):

| Package | Files | Role |
|---------|-------|------|
| eslint-plugin-react-compiler | 15 | 컴파일러 ESLint 규칙 |
| react-mcp-server | 8 | MCP 서버 |
| react-forgive | 9 | Error Recovery |
| snap | 17 | 스냅샷 도구 |
| react-compiler-healthcheck | 6 | 호환성 체크 |
| make-read-only-util | 4 | 읽기 전용 유틸 |
| react-compiler-runtime | 2 | 런타임 헬퍼 |
| react-is | 6 | 타입 체크 유틸 |
| react-cache | 5 | Suspense 캐싱 (legacy) |
| use-subscription | 4 | 외부 소스 구독 |

**Study Points** (소스 구조에서 도출):
- react-compiler-runtime: 컴파일된 코드가 의존하는 런타임 헬퍼
- react-is: ReactSymbols 기반 타입 체크 (Topic 2 shared 연결)
- react-cache: Suspense 통합 캐싱 (legacy/experimental)
- 의존 모듈: babel-plugin-react-compiler (부분), shared (ReactSymbols)

**Docs**: 해당 없음

**Skill Target**: 신규 생성 필요

---

## Phase 4: Infrastructure — 렌더러, 테스트, DevTools (6 Topics)

Phase 1~3에서 이미 간단히 다룬 개념들을 심화 학습.

---

### Topic 23: react-refresh + react-markup ⬜ 미커버

> 개발/유틸리티 패키지
> 그룹핑 사유: 각 10~12개 소스 파일의 중소규모 유틸리티

**Source Files** (22 files 합계):

| Package | Files | Key File | Exports |
|---------|-------|----------|---------|
| react-refresh | 10 | `src/ReactFreshRuntime.js` | performReactRefresh, createSignature, enqueueRender |
| react-markup | 12 | `src/ReactMarkupClient.js`, `src/ReactMarkupServer.js` | renderToMarkup |

**Study Points** (소스 구조에서 도출):
- react-refresh: HMR 메커니즘, signature 기반 컴포넌트 추적
- react-markup: 마크업 렌더링 타겟 (실험적)
- 의존 모듈: shared, react-reconciler

**Docs**: 해당 없음

**Skill Target**: 신규 생성 필요

---

### Topic 24: react-native-renderer + react-art + react-noop-renderer ⬜ 미커버

> React Reconciler 기반 대체 렌더러
> 그룹핑 사유: Reconciler의 HostConfig 인터페이스 구현 패턴 학습

**Source Files** (102 files 합계):

| Package | Files | Key File | Role |
|---------|-------|----------|------|
| react-native-renderer | 72 | `src/ReactNativeRenderer.js`, `src/ReactFabric.js` | React Native 렌더러 |
| react-art | 12 | `src/ReactART.js` | 벡터 그래픽 렌더러 |
| react-noop-renderer | 18 | `src/createReactNoop.js` | 테스트용 no-op 렌더러 |

**Study Points** (소스 구조에서 도출):
- Reconciler의 HostConfig 인터페이스 구현 패턴
- react-native-renderer: Legacy vs Fabric 아키텍처
- react-noop-renderer: 커스텀 렌더러 최소 구현 참조
- 의존 모듈: react-reconciler, shared

**Docs**: 해당 없음

**Skill Target**: 신규 생성 필요

---

### Topic 25: Testing Infrastructure ⬜ 미커버

> 테스트 렌더러 및 테스트 인프라
> 그룹핑 사유: 테스트 관련 5개 패키지

**Source Files** (39 files 합계):

| Package | Files | Key File | Role |
|---------|-------|----------|------|
| react-test-renderer | 12 | `src/ReactTestRenderer.js` | 테스트용 렌더러 |
| react-suspense-test-utils | 3 | `src/ReactSuspenseTestUtils.js` | Suspense 테스트 유틸 |
| jest-react | 3 | `src/JestReact.js` | Jest 환경 설정 |
| internal-test-utils | 13 | `index.js` | 내부 테스트 헬퍼 |
| dom-event-testing-library | 8 | `index.js` | DOM 이벤트 테스트 |

**Study Points** (소스 구조에서 도출):
- react-test-renderer: create, unmountComponentAtNode, toJSON
- act() 메커니즘: 동기적 렌더링/이펙트 완료 보장
- 의존 모듈: react-reconciler, shared

**Docs**: 해당 없음

**Skill Target**: 신규 생성 필요

---

### Topic 26: react-devtools-shared ⬜ 미커버

> DevTools 핵심 로직 (453 files)

**Source Files** (`ref/react-fork/packages/react-devtools-shared/`, 453 files):

| Subdir | Role |
|--------|------|
| `src/backend/` | 렌더러 연결, Fiber 트리 인스펙션 |
| `src/devtools/` | 프론트엔드 UI 스토어 |
| `src/hooks/` | Hook 인스펙션 |
| `src/hydrationData/` | 하이드레이션 데이터 |
| `src/sax/` | SAX 파서 |
| `src/storage/` | 스토리지 |
| `src/utils/` | 유틸리티 |

**Study Points** (소스 구조에서 도출):
- backend: attachRenderer, setupHighlighter, setupTraceUpdates
- devtools: ProfilingCache, ProfilerStore, 컴포넌트 트리 뷰
- Bridge: backend ↔ frontend 통신
- 의존 모듈: react-reconciler (내부 타입)

**Docs**: `reference/dev-tools/react-performance-tracks.md`

**Skill Target**: 신규 생성 필요

---

### Topic 27: react-devtools Variants ⬜ 미커버

> DevTools UI, 브라우저 확장, 타임라인
> 그룹핑 사유: 7개 패키지가 모두 react-devtools-shared 기반 변형

**Source Files** (188 files 합계):

| Package | Files | Role |
|---------|-------|------|
| react-devtools | 3 | 스탠드얼론 DevTools |
| react-devtools-core | 7 | backend, editor, standalone 모듈 |
| react-devtools-inline | 13 | 인라인 DevTools |
| react-devtools-fusebox | 3 | Fusebox 번들러용 |
| react-devtools-extensions | 47 | 브라우저 확장 |
| react-devtools-shell | 49 | 개발/테스트 셸 |
| react-devtools-timeline | 66 | 타임라인 프로파일러 |

**Study Points** (소스 구조에서 도출):
- 각 변형의 빌드/배포 패턴
- 브라우저 확장: background script, content script, panel 구조
- Timeline: content-views, view-base 렌더링 아키텍처
- 의존 모듈: react-devtools-shared

**Docs**: 해당 없음

**Skill Target**: 신규 생성 필요

---

### Topic 28: react-debug-tools ⬜ 미커버

> DevTools용 Hook 디버깅 유틸리티

**Source Files** (`ref/react-fork/packages/react-debug-tools/`, 8 files):

| File | Role |
|------|------|
| `index.js` | 엔트리포인트 |
| `src/ReactDebugTools.js` | Hook 정보 추출 메인 |
| `src/ReactDebugHooks.js` | Hook 타입별 디버그 정보 |

**Study Points** (소스 구조에서 도출):
- getHooks, parseHookName: Fiber에서 Hook 정보 추출 (Topic 5 Hooks 연결)
- DevTools와의 연동 인터페이스
- 의존 모듈: react-reconciler (Fiber 내부 타입)

**Docs**: 해당 없음

**Skill Target**: 신규 생성 필요

---

## Docs Supplementary Study (3 Sections)

Phase 1~4에서 소스 코드로 내부 동작을 이해한 후, 공식 문서로 "사용자 관점"의 베스트 프랙티스를 보충한다.

---

### Section A: Learn Guides

> Phase 1~4에서 다루지 않은 실용적 가이드 학습

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

**Docs** (`ref/react.dev/src/content/reference/react/`):
- 모든 훅 API 레퍼런스 (useState ~ useEffectEvent)
- 컴포넌트 API (Suspense, StrictMode, Profiler, Fragment, Activity, ViewTransition)
- 유틸리티 API (memo, lazy, forwardRef, cache, cacheSignal)

**Skill Target**: 전체 `references/`

---

### Section C: Best Practices Cross-Check

> 기존 best-practices 규칙 검증

**Docs**: 소스 코드 학습 결과 + react.dev 가이드 기반으로 59개 규칙 교차 검증

**Skill Target**: `references/best-practices/index.md`, `references/best-practices/rules/`

---

## Files To Modify

| Action | File | Source |
|--------|------|--------|
| Verify/Improve | `references/hooks.md` | Topics 1, 5 |
| Verify/Improve | `references/memo.md` | Topics 1, 2 |
| Verify/Improve | `references/lazy.md` | Topics 1, 2 |
| Verify/Improve | `references/context.md` | Topics 1, 10 |
| Verify/Improve | `references/refs.md` | Topics 1, 5 |
| Verify/Improve | `references/transitions.md` | Topics 1, 12 |
| Verify/Improve | `references/activity.md` | Topics 1, 11 |
| Verify/Improve | `references/actions.md` | Topics 1, 8, 12 |
| Verify/Improve | `references/portals.md` | Topic 8 |
| Verify/Improve | `references/server-components.md` | Topics 17, 18 |
| Verify/Improve | `references/fiber.md` | Topics 3, 4, 16 |
| Verify/Improve | `references/reconciliation.md` | Topics 6, 16 |
| Verify/Improve | `references/scheduler.md` | Topics 13, 14 |
| Verify/Improve | `references/effects.md` | Topic 7 |
| Verify/Improve | `references/events.md` | Topic 9 |
| Verify/Improve | `references/suspense.md` | Topic 11 |
| Verify/Improve | `references/error-handling.md` | Topic 15 |
| Create (신규) | `references/compiler.md` | Topics 21, 22 |
| Review (고아) | `references/patterns.md` | Section A |
| Review (고아) | `references/anti-patterns.md` | Section A |
| Review (고아) | `references/best-practices/` | Section C |

## Topic-Docs Mapping

> 학습 파일 ↔ 토픽 연결. `/learn` 첫 세션 시 자동 등록, `/study-skill` 생성 시 기존 파일 스캔.

| Topic | docs_file |
|-------|-----------|
| Topic 1: react | React-Core-API.md |
| Topic 2: shared | Shared.md |
| Topic 3: Fiber Structure | Fiber-Structure.md |
| Topic 4: Work Loop | Work-Loop.md |

## Study-Skill Verification

> `/study-skill` 검증 완료 기록. 토픽별 소스 대조/스킬 개선 완료 시 기록.

| Topic | verified | 변경 파일 |
|-------|----------|----------|

## Verification

- 각 토픽 완료 후: 수정된 레퍼런스 문서의 내용이 소스 코드와 일치하는지 교차 확인
- 전체 완료 후: `bash scripts/check-docs.sh` 실행하여 문서 정합성 검증
