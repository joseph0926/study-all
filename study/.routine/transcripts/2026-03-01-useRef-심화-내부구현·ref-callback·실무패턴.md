# Transcript: useRef 심화: 내부구현·ref callback·실무패턴
> 날짜: 2026-03-01 | 클라이언트: claude-code | 메시지: 40개

---

## [07:46:23] AI

주제 확정: **useRef 심화 — 내부구현 · ref callback · 실무패턴**. Phase 1으로 진입합니다.

먼저 소스를 탐색합니다.

---

## [07:46:28] AI



> 도구 호출: Agent

---

## [07:48:47] AI

소스 탐색 완료. Phase 1으로 진입합니다.

> [ROUTINE] Phase 1/5 | useRef 심화: 내부구현·ref callback·실무패턴 | Q&A: 0 | 경과: 3분

---

좋습니다. 이전 learn 세션에서 useRef의 **"왜 렌더 중에 읽으면 안 되는가"**까지 다뤘으니, 오늘은 그 아래 층을 파봅니다. 큰 그림부터 시작합니다.

---

## 1. useRef 내부 구현 — Hook 링크드 리스트에서의 위치

### 비유: 사물함 복도

| 실생활 | React Hook 시스템 |
|---------|-------------------|
| 복도에 사물함이 **순서대로** 나열 | Fiber의 `memoizedState`에 Hook이 **링크드 리스트**로 연결 |
| 사물함마다 **다른 용도** (책가방, 운동화, 도시락) | 각 Hook마다 **다른 타입** (useState, useRef, useEffect) |
| useRef 사물함 = **자물쇠 없는 사물함** | update queue도 dispatch도 없는 plain object 저장 |
| useState 사물함 = **변경 시 방송 장치 달린 사물함** | queue + dispatch → `scheduleUpdateOnFiber` |

**비유 한계**: 실제로는 사물함이 배열이 아니라 `next` 포인터로 연결된 링크드 리스트입니다.

### 코드 근거: Hook 타입 정의

`ref/react/packages/react-reconciler/src/ReactFiberHooks.js:194-200`

```ts
export type Hook = {
  memoizedState: any,      // ← useRef는 여기에 {current: T}를 저장
  baseState: any,
  baseQueue: Update<any, any> | null,
  queue: any,              // ← useRef는 이게 null (queue 없음!)
  next: Hook | null,       // ← 다음 Hook을 가리키는 포인터
};
```

`ref/react/packages/react-reconciler/src/ReactFiberHooks.js:263-268`

```js
// Hooks are stored as a linked list on the fiber's memoizedState field.
let currentHook: Hook | null = null;
let workInProgressHook: Hook | null = null;
```

### 링크드 리스트 생성 — `mountWorkInProgressHook`

`ref/react/packages/react-reconciler/src/ReactFiberHooks.js:979-998`

```js
function mountWorkInProgressHook(): Hook {
  const hook: Hook = {
    memoizedState: null,
    baseState: null,
    baseQueue: null,
    queue: null,       // ← 모든 Hook이 동일한 빈 구조로 시작
    next: null,
  };

  if (workInProgressHook === null) {
    // 첫 번째 Hook → fiber.memoizedState에 직접 연결
    currentlyRenderingFiber.memoizedState = workInProgressHook = hook;
  } else {
    // 이후 Hook → 이전 Hook의 next에 연결
    workInProgressHook = workInProgressHook.next = hook;
  }
  return workInProgressHook;
}
```

### useRef가 이 위에서 하는 일

```js
// mountRef (ReactFiberHooks.js:2602-2607)
function mountRef<T>(initialValue: T): {current: T} {
  const hook = mountWorkInProgressHook();  // Hook 노드 생성 + 리스트에 연결
  const ref = {current: initialValue};
  hook.memoizedState = ref;                // 그냥 저장. 끝.
  return ref;
}

// updateRef (ReactFiberHooks.js:2609-2612)
function updateRef<T>(initialValue: T): {current: T} {
  const hook = updateWorkInProgressHook();
  return hook.memoizedState;               // 이전 객체 그대로 반환. 끝.
}
```

### 시각화: 컴포넌트 안에 3개 Hook이 있을 때

```
function MyComp() {
  const [count, setCount] = useState(0);   // Hook #1
  const ref = useRef(null);                // Hook #2
  useEffect(() => {}, []);                 // Hook #3
}

Fiber.memoizedState
    │
    ▼
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│ Hook #1 (useState)  │     │ Hook #2 (useRef)    │     │ Hook #3 (useEffect) │
│                     │     │                     │     │                     │
│ memoizedState: 0    │──►  │ memoizedState:      │──►  │ memoizedState:      │
│ queue: {            │next │  {current: null}    │next │  Effect {...}       │
│   dispatch: fn,     │     │ queue: null ← 없음! │     │ queue: null         │
│   pending: null     │     │                     │     │                     │
│ }                   │     │                     │     │                     │
└─────────────────────┘     └─────────────────────┘     └─────────────────────┘
     ▲                            ▲
     │                            │
 setState → dispatch         ref.current = x
 → scheduleUpdateOnFiber     → 아무 일도 안 일어남
 → 리렌더링!                 → React가 모름
```

**핵심**: useRef의 Hook 노드는 다른 Hook과 **완전히 동일한 구조**로 리스트에 들어갑니다. 차이는 `queue`가 `null`이라는 것 — React와 통신할 채널이 아예 없다는 뜻입니다.

---

## 2. ref callback — attach/detach 타이밍

이전 learn에서 "useRef의 ref 객체"를 다뤘는데, React에는 ref를 전달하는 방식이 **3가지**입니다.

### 비유: 택배 수령 방식

| 택배 수령 | React ref 방식 |
|-----------|---------------|
| **사서함** — 택배가 오면 고정 사서함에 넣어둠 | **객체 ref** `useRef()` — `ref.current = instance` |
| **전화번호** — 택배 오면 전화로 알려줌 | **callback ref** `(el) => { ... }` — 함수 호출로 알림 |
| **전화번호 + 부재중 처리** — 수령 시 전화, 반송 시도 전화 | **cleanup callback ref** `(el) => { return () => { ... } }` |

### 코드 근거: `commitAttachRef`

`ref/react/packages/react-reconciler/src/ReactFiberCommitEffects.js:756-823`

```js
function commitAttachRef(finishedWork: Fiber) {
  const ref = finishedWork.ref;
  if (ref !== null) {
    const instanceToUse = getPublicInstance(finishedWork.stateNode);

    if (typeof ref === 'function') {
      // callback ref → 함수 호출, cleanup 저장
      finishedWork.refCleanup = ref(instanceToUse);
    } else {
      // 객체 ref → .current에 직접 할당
      ref.current = instanceToUse;
    }
  }
}
```

### `safelyDetachRef` — 분리 시

`ref/react/packages/react-reconciler/src/ReactFiberCommitEffects.js:841-907`

```js
export function safelyDetachRef(current: Fiber, nearestMountedAncestor) {
  const ref = current.ref;
  const refCleanup = current.refCleanup;  // ← attachRef에서 저장한 cleanup

  if (ref !== null) {
    if (typeof refCleanup === 'function') {
      // cleanup ref → cleanup 함수 호출
      refCleanup();
    } else if (typeof ref === 'function') {
      // callback ref (cleanup 없음) → null을 전달해서 해제 알림
      ref(null);
    } else {
      // 객체 ref → .current = null
      ref.current = null;
    }
  }
}
```

### 시각화: ref 3가지 방식의 생명주기

```
[객체 ref: useRef()]
  mount:   ref.current = <div>
  update:  (ref가 바뀌지 않으면 아무 일 없음)
  unmount: ref.current = null

[callback ref: (el) => { myRef = el }]
  mount:   fn(<div>) 호출
  unmount: fn(null) 호출    ← null로 "해제됨" 알림
  ⚠️ 리렌더마다 함수가 새로 생성되면 detach→attach 반복!

[cleanup callback ref: (el) => { ...; return () => cleanup() }]
  mount:   fn(<div>) 호출 → cleanup 저장
  unmount: cleanup() 호출   ← null 대신 cleanup 함수 사용
  ✓ useEffect의 cleanup과 동일한 패턴
```

### 언제 attach/detach가 발생하는가?

`ref/react/packages/react-reconciler/src/ReactFiberBeginWork.js:1381-1400`의 `markRef`:

```js
function markRef(current: Fiber | null, workInProgress: Fiber) {
  const ref = workInProgress.ref;
  if (ref === null) {
    if (current !== null && current.ref !== null) {
      // ref가 있었는데 없어짐 → detach 필요
      workInProgress.flags |= Ref | RefStatic;
    }
  } else {
    if (current === null || current.ref !== ref) {
      // 새 ref이거나 ref가 바뀜 → attach 필요
      workInProgress.flags |= Ref | RefStatic;
    }
  }
}
```

**핵심**: `current.ref !== ref` — **참조 동일성**으로 비교합니다. 인라인 함수 `ref={(el) => ...}`는 매 렌더마다 새 함수 → 매번 detach/attach.

### 실무 함정: 인라인 callback ref

```jsx
// ❌ 매 렌더마다 detach → attach (ref가 매번 새 함수)
<div ref={(el) => { console.log('attached', el) }} />

// ✅ 안정적 참조 — useCallback으로 감싸기
const callbackRef = useCallback((el) => {
  if (el) console.log('attached', el);
}, []);
<div ref={callbackRef} />

// ✅ 또는 cleanup 패턴 (React 19+)
<div ref={(el) => {
  // attach 로직
  return () => { /* detach 로직 */ };
}} />
```

---

여기까지가 **내부 구현 + ref callback 패턴**입니다. 이어서 **실무 useRef/ref 패턴**을 다루기 전에 — 여기까지 궁금한 점이 있으신가요?

특히:
- Hook 링크드 리스트에서 **조건부 Hook 호출이 왜 금지**되는지 (이미 아실 수 있지만 내부 구현과 연결)
- callback ref의 **cleanup 패턴**이 왜 추가됐는지
- `markRef`의 참조 비교가 실무에서 어떤 버그를 만드는지

자유롭게 질문해주세요.

---

## [08:17:36] 사용자

첫 번째 Hook → fiber.memoizedState에 직접 연결, 이후 Hook → 이전 Hook의 next에 연결 << currentlyRenderingFiber는 어디서 온걸까? -> ref/react/packages/react-reconciler/src/ReactFiberHooks.js를 보니 let 변수이고 초기값은 null -> 그러면 currentlyRenderingFiber는 언제 Fiber로 초기화되는걸까요?

---

workInProgressHook = workInProgressHook.next = hook; << 이건 hook의 값을 workInProgressHook.next에 할당하고 그걸 workInProgressHook 자체로 할당하는거같은데, 왜 한번에 workInProgressHook = hook을 안할까요?

---

.memoizedState에는 hook을 할당하는거 아니였는지? -> const ref = {current: initialValue};
  hook.memoizedState = ref; << 이건 객체를 할당하네요?

---

이전 객체 그대로 반환. 끝. << 그래도 매번 함수 ㄹ호출 형태(updateWorkInProgressHook())이므로 최신값 보장은 되는게 맞을까요?

---

2,3번 설명까지 이해하기에는 아직 위 질문들이 이해가 안되어 위 질문들 해결 후 2,3번 다시 설명해주셔야할거같습니다

---

## [08:17:42] AI



> 도구 호출: Read

---

## [08:17:43] AI



> 도구 호출: Read

---

## [08:17:44] AI



> 도구 호출: Read

---

## [08:17:48] AI



> 도구 호출: Read

---

## [08:17:58] AI



> 도구 호출: mcp__study__routine_appendEntry

---

## [08:18:59] AI



> [ROUTINE] Phase 1/5 | useRef 심화: 내부구현·ref callback·실무패턴 | Q&A: 1 | 경과: 5분

좋은 질문 4개입니다. 하나씩 코드로 답합니다.

---

## Q1. `currentlyRenderingFiber`는 언제 Fiber로 초기화되는가?

### 비유: 공장 컨베이어벨트의 "현재 작업대" 표시등

| 공장 | React |
|------|-------|
| 컨베이어벨트에 제품(컴포넌트)이 올라옴 | reconciler가 Fiber를 처리하기 시작 |
| **"현재 작업대" 표시등**을 이 제품에 켬 | `currentlyRenderingFiber = workInProgress` |
| 작업자들(hook들)이 표시등을 보고 "아, 지금 이 제품에 부품을 달면 되겠구나" | hook들이 `currentlyRenderingFiber`를 보고 어느 Fiber에 연결할지 앎 |
| 제품 작업 끝나면 표시등 끔 | `currentlyRenderingFiber = (null: any)` |

### 코드 근거

`ref/react/packages/react-reconciler/src/ReactFiberHooks.js:511`

```js
export function renderWithHooks(current, workInProgress, Component, props, ...) {
  renderLanes = nextRenderLanes;
  currentlyRenderingFiber = workInProgress;  // ← 여기서 초기화!
  
  workInProgress.memoizedState = null;       // 기존 hook 리스트 초기화
  workInProgress.updateQueue = null;
  // ...
  
  let children = Component(props, secondArg); // ← 여기서 컴포넌트 함수 실행
  //                                             이 안에서 useRef() 등이 호출됨
  //                                             → mountWorkInProgressHook()
  //                                             → currentlyRenderingFiber.memoizedState = hook
  // ...
}
```

**호출 체인**:

```
beginWork(fiber)
  → updateFunctionComponent(...)
    → renderWithHooks(current, workInProgress, Component, ...)
      → currentlyRenderingFiber = workInProgress   ← ★ 여기!
      → Component(props)                           ← 컴포넌트 함수 실행
        → useRef()
          → mountRef()
            → mountWorkInProgressHook()
              → currentlyRenderingFiber.memoizedState = hook  ← 이때 참조
```

**정리**: `currentlyRenderingFiber`는 **모듈 레벨 전역 변수**이고, `renderWithHooks`가 컴포넌트 함수를 호출하기 **직전에** 현재 처리 중인 Fiber로 설정합니다. hook들은 이 변수를 통해 "나는 지금 어떤 Fiber에 속해 있는가"를 알 수 있습니다.

---

## Q2. `workInProgressHook = workInProgressHook.next = hook`은 왜 한 번에 안 하나?

### 핵심: 이전 노드의 `next`를 연결해야 하기 때문

```js
workInProgressHook = hook;  // ❌ 이렇게 하면?
```

이건 **커서만 옮기는 것**입니다. 이전 Hook 노드의 `next`가 새 Hook을 가리키지 않으므로 **리스트가 끊깁니다**.

```js
workInProgressHook.next = hook;   // 1) 이전 노드의 next → 새 노드 연결
workInProgressHook = hook;        // 2) 커서를 새 노드로 이동
```

이 두 줄을 한 줄로 합친 것이:

```js
workInProgressHook = workInProgressHook.next = hook;
```

### 시각화

```
[= hook만 한 경우] — 리스트가 끊어짐

Hook#1          Hook#2(새로 만듦)
┌──────────┐    ┌──────────┐
│ next: null│    │ next:null│
└──────────┘    └──────────┘
                     ▲
                     │
              workInProgressHook (커서만 이동)
              
Hook#1.next는 여전히 null → Hook#2를 찾을 방법 없음!


[.next = hook 후 = hook] — 정상

Hook#1              Hook#2
┌──────────┐  next  ┌──────────┐
│ next: ────│──────►│ next:null│
└──────────┘        └──────────┘
                         ▲
                         │
                  workInProgressHook
                  
Hook#1 → Hook#2 연결 완성!
```

### JS 평가 순서

```js
workInProgressHook = workInProgressHook.next = hook;
// JS는 오른쪽부터 평가 (right-to-left assignment):
// 1단계: workInProgressHook.next = hook   (이전 노드에 새 노드 연결)
// 2단계: workInProgressHook = (위 결과)   (커서를 새 노드로 이동)
```

---

## Q3. `memoizedState`가 두 군데서 다르게 쓰이는 이유

혼동이 자연스럽습니다. **같은 이름이 다른 레벨에서 다른 의미**로 쓰입니다.

### 비유: "주소"라는 단어

| 레벨 | "주소" | 실제 의미 |
|------|--------|----------|
| **건물** (Fiber) | 건물 주소 = "서울시 강남구 ..." | `fiber.memoizedState` = **Hook 리스트의 첫 번째 노드** |
| **사물함** (Hook) | 사물함 안 물건의 보관 주소 = 내용물 | `hook.memoizedState` = **각 Hook의 실제 데이터** |

### 코드로 확인

```
Fiber.memoizedState ──→ Hook#1(useState)
                         │
                         ├─ hook.memoizedState = 0        ← state 값
                         ├─ hook.queue = { dispatch, ... } 
                         │
                         └─ hook.next ──→ Hook#2(useRef)
                                          │
                                          ├─ hook.memoizedState = {current: null}  ← ref 객체
                                          ├─ hook.queue = null
                                          │
                                          └─ hook.next ──→ Hook#3(useEffect)
                                                           │
                                                           └─ hook.memoizedState = Effect{...}
```

| 코드 | 레벨 | 저장하는 것 |
|------|------|-----------|
| `currentlyRenderingFiber.memoizedState = hook` | Fiber 레벨 | Hook 리스트의 **헤드 노드** |
| `hook.memoizedState = ref` | Hook 레벨 | 이 Hook의 **실제 데이터** |
| `hook.memoizedState = 0` | Hook 레벨 | useState의 **state 값** |
| `hook.memoizedState = Effect{...}` | Hook 레벨 | useEffect의 **effect 객체** |

**각 Hook 타입이 자기 데이터를 `hook.memoizedState`에 저장하는 형태가 다릅니다**:
- useState → 원시값 또는 객체
- useRef → `{current: T}`
- useEffect → `Effect` 객체
- useMemo → `[memoizedValue, deps]`

---

## Q4. `updateRef`에서 매번 함수 호출이니 최신값 보장이 되는가?

### 짧은 답: "최신 ref **객체**"가 반환되지만, 그게 중요한 게 아닙니다

```js
function updateRef<T>(initialValue: T): {current: T} {
  const hook = updateWorkInProgressHook();
  return hook.memoizedState;  // ← mountRef에서 만든 그 {current: T} 객체
}
```

`updateWorkInProgressHook()`은 current fiber의 Hook에서 `memoizedState`를 **복사**합니다:

`ref/react/packages/react-reconciler/src/ReactFiberHooks.js:1050-1058`

```js
const newHook: Hook = {
  memoizedState: currentHook.memoizedState,  // ← 이전 hook의 데이터 복사
  baseState: currentHook.baseState,
  baseQueue: currentHook.baseQueue,
  queue: currentHook.queue,
  next: null,
};
```

하지만 여기서 핵심은 — **useRef의 경우 이 "복사"가 얕은 복사(shallow copy)**라는 것입니다:

```
mountRef 때:
  hook.memoizedState = { current: null }   ← 이 객체를 X라 하자
                              │
                              ▼
                        메모리 주소: 0xABC

updateRef 때 (리렌더):
  newHook.memoizedState = currentHook.memoizedState
                        = X                ← 같은 객체 참조!
                              │
                              ▼
                        메모리 주소: 0xABC (동일)

이벤트 핸들러에서:
  ref.current = "hello"       ← 0xABC 객체의 current 필드 변경

다음 updateRef:
  return hook.memoizedState   ← 0xABC → { current: "hello" } ✓ 최신값
```

**최신값이 보장되는 이유**는 함수 호출 때문이 아니라, **mount 때 만든 객체가 단 한 번만 생성되고 이후 모든 곳에서 같은 참조를 공유**하기 때문입니다. `ref.current = x`는 그 공유 객체의 필드를 직접 수정하는 것이므로, 누가 언제 읽든 최신값입니다.

```
컴포넌트 함수      이벤트 핸들러      useEffect
    │                  │                │
    └──────────────────┴────────────────┘
                       │
                       ▼
              동일한 객체: { current: T }
              (메모리 주소 0xABC)
```

이것이 useState와의 결정적 차이입니다:
- **useState**: 매 렌더마다 **스냅샷** (값 복사) → 클로저에 갇힌 시점의 값
- **useRef**: 모든 곳에서 **같은 객체 참조** → 항상 최신 값

---

4개 질문이 해결되었으면 2번(ref callback 패턴), 3번(실무 패턴) 설명으로 넘어갑니다. 추가로 궁금한 점이 있으신가요?

---

## [08:22:06] 사용자

네 2번으로 넘어가주세요

---

## [08:22:10] AI



> 도구 호출: Read

---

## [08:22:11] AI



> 도구 호출: Read

---

## [08:22:15] AI



> 도구 호출: Read

---

## [08:22:16] AI



> 도구 호출: Grep

---

## [08:22:20] AI



> 도구 호출: Read

---

## [08:22:29] AI



> 도구 호출: mcp__study__routine_appendEntry

---

## [08:23:27] AI

> [ROUTINE] Phase 1/5 | useRef 심화: 내부구현·ref callback·실무패턴 | Q&A: 2 | 경과: 8분

---

## 2. ref callback 패턴 — attach/detach의 전체 흐름

### 비유: 호텔 체크인/체크아웃 시스템

| 호텔 | React ref |
|------|-----------|
| 손님(DOM 노드)이 **체크인** | 컴포넌트가 **mount** → `commitAttachRef` |
| 손님이 **체크아웃** | 컴포넌트가 **unmount** → `safelyDetachRef` |
| **사물함 번호 적어두기** (고정 키) | 객체 ref: `ref.current = <div>` |
| **프론트에 전화** (즉시 알림) | callback ref: `ref(<div>)` 호출 |
| 체크아웃 시 **프론트에 다시 전화** "빈방이요" | callback ref: `ref(null)` 호출 |
| 체크아웃 시 **퇴실 청소팀 호출** | cleanup callback ref: `cleanup()` 호출 |

---

### 2-A. ref가 처리되는 두 단계: render → commit

ref 처리는 **render phase**와 **commit phase**에 걸쳐 있습니다.

```
[Render Phase]                              [Commit Phase]
beginWork                                   Mutation 단계        Layout 단계
  │                                            │                    │
  ▼                                            ▼                    ▼
markRef(current, wip)                    safelyDetachRef      safelyAttachRef
  │                                      (이전 ref 해제)      (새 ref 연결)
  ▼
"이 Fiber에 ref 작업 필요하다"
→ flags |= Ref
```

**1단계 — Render phase: `markRef`** (플래그만 세움)

`ref/react/packages/react-reconciler/src/ReactFiberBeginWork.js:1381-1400`

```js
function markRef(current: Fiber | null, workInProgress: Fiber) {
  const ref = workInProgress.ref;
  
  if (ref === null) {
    if (current !== null && current.ref !== null) {
      // ref가 있었는데 없어짐 → Ref 플래그
      workInProgress.flags |= Ref | RefStatic;
    }
  } else {
    if (current === null || current.ref !== ref) {
      // 새 mount이거나, ref 참조가 바뀜 → Ref 플래그
      workInProgress.flags |= Ref | RefStatic;
    }
  }
}
```

여기서는 **실제 ref 작업을 하지 않습니다**. "이 Fiber는 나중에 ref 처리가 필요하다"는 깃발만 꽂습니다.

**2단계 — Commit phase: detach → attach 순서**

`ref/react/packages/react-reconciler/src/ReactFiberCommitWork.js`

```
commitMutationEffects (Mutation 단계)
  │
  ├─ HostComponent (예: <div>):
  │    if (flags & Ref) {
  │      if (current !== null) {
  │        safelyDetachRef(current, ...)  ← 이전 ref 먼저 해제 (line 2092-2095)
  │      }
  │    }
  │
  ▼ (DOM 변경 등이 여기서 일어남)

commitLayoutEffects (Layout 단계)
  │
  ├─ HostComponent:
  │    if (flags & Ref) {
  │      safelyAttachRef(finishedWork, ...)  ← 새 ref 연결 (line 692-694)
  │    }
```

**핵심: detach가 먼저, attach가 나중입니다.** Mutation 단계에서 이전 ref를 해제하고, Layout 단계에서 새 ref를 연결합니다.

---

### 2-B. `commitAttachRef` — ref 연결의 3가지 분기

`ref/react/packages/react-reconciler/src/ReactFiberCommitEffects.js:756-823`

핵심 로직만 추출하면:

```js
function commitAttachRef(finishedWork: Fiber) {
  const ref = finishedWork.ref;
  if (ref !== null) {
    // 1) DOM 인스턴스 가져오기
    const instanceToUse = getPublicInstance(finishedWork.stateNode);

    // 2) ref 타입에 따라 분기
    if (typeof ref === 'function') {
      // ★ callback ref → 함수 호출, 리턴값을 cleanup으로 저장
      finishedWork.refCleanup = ref(instanceToUse);
    } else {
      // ★ 객체 ref → .current에 직접 할당
      ref.current = instanceToUse;
    }
  }
}
```

### 2-C. `safelyDetachRef` — ref 해제의 3가지 분기

`ref/react/packages/react-reconciler/src/ReactFiberCommitEffects.js:841-907`

```js
export function safelyDetachRef(current, nearestMountedAncestor) {
  const ref = current.ref;
  const refCleanup = current.refCleanup;  // ← attach 때 저장한 cleanup

  if (ref !== null) {
    if (typeof refCleanup === 'function') {
      // ★ 분기 1: cleanup 함수가 있다 → cleanup() 호출
      refCleanup();
      current.refCleanup = null;           // 이중 호출 방지

    } else if (typeof ref === 'function') {
      // ★ 분기 2: callback ref인데 cleanup 없다 → ref(null) 호출
      ref(null);

    } else {
      // ★ 분기 3: 객체 ref → .current = null
      ref.current = null;
    }
  }
}
```

### 시각화: 3가지 ref 방식의 attach/detach 전체 흐름

```
━━━ 객체 ref (useRef / createRef) ━━━

  mount:     commitAttachRef → ref.current = <div>
  unmount:   safelyDetachRef → ref.current = null
  ref 변경:  불가능 (같은 객체 참조 유지)

  타이밍: Layout 단계에서 attach, Mutation 단계에서 detach


━━━ callback ref (cleanup 없음) ━━━

  mount:     commitAttachRef → ref(<div>)       리턴값 없음 → refCleanup = undefined
  unmount:   safelyDetachRef → ref(null)        ← null을 인자로 "해제됨" 알림
  ref 변경:  매 렌더 새 함수 → detach(null) → attach(<div>) 반복!

  safelyDetachRef 분기: typeof refCleanup !== 'function'
                        typeof ref === 'function'
                        → ref(null)


━━━ cleanup callback ref (React 19+) ━━━

  mount:     commitAttachRef → cleanup = ref(<div>)   리턴값 저장!
  unmount:   safelyDetachRef → cleanup()              ← null 안 보냄, cleanup 호출
  ref 변경:  cleanup() → ref(<div>) → 새 cleanup 저장

  safelyDetachRef 분기: typeof refCleanup === 'function'
                        → refCleanup()
```

---

### 2-D. `markRef`의 참조 비교 — 인라인 함수가 위험한 이유

`markRef`의 핵심 조건:

```js
if (current === null || current.ref !== ref) {
  workInProgress.flags |= Ref;  // ref 작업 스케줄
}
```

`current.ref !== ref` — **참조 동일성(`===`)으로 비교**합니다.

```jsx
// ❌ 인라인 함수: 매 렌더마다 새 함수 객체 생성
function App() {
  return <div ref={(el) => { /* ... */ }} />;
}

// 렌더 1: ref = function@0x100
// 렌더 2: ref = function@0x200  ← !== → Ref 플래그 ON!
// 렌더 3: ref = function@0x300  ← !== → Ref 플래그 ON!
//
// 매번: safelyDetachRef(이전 ref) → commitAttachRef(새 ref)
//       ref(null) 호출            → ref(<div>) 호출
```

```jsx
// ✅ useCallback: 같은 함수 참조 유지
function App() {
  const callbackRef = useCallback((el) => { /* ... */ }, []);
  return <div ref={callbackRef} />;
}

// 렌더 1: ref = function@0x100
// 렌더 2: ref = function@0x100  ← === → Ref 플래그 OFF, 아무 일 없음
// 렌더 3: ref = function@0x100  ← === → Ref 플래그 OFF
```

```jsx
// ✅ cleanup callback ref: 매번 새 함수여도 cleanup 패턴이 안전하게 처리
function App() {
  return (
    <div ref={(el) => {
      // attach 로직 (el은 <div>)
      el.focus();
      return () => {
        // detach 로직 — ref(null) 대신 이 함수가 호출됨
      };
    }} />
  );
}
```

### 시각화: 인라인 callback ref의 리렌더 시 동작

```
[렌더 1]                    [렌더 2]                    [렌더 3]
ref = fn@A                  ref = fn@B                  ref = fn@C

                    Mutation 단계:              Mutation 단계:
                    safelyDetachRef             safelyDetachRef
                    → fn@A(null) 호출           → fn@B(null) 호출
                    
                    Layout 단계:                Layout 단계:
                    commitAttachRef             commitAttachRef
                    → fn@B(<div>) 호출          → fn@C(<div>) 호출

매 렌더마다:  detach(null) → attach(<div>) → detach(null) → attach(<div>) ...
```

cleanup callback ref라면:

```
[렌더 1]                    [렌더 2]
ref = fn@A                  ref = fn@B

Layout: fn@A(<div>) 호출    Mutation: cleanup@A() 호출   ← null 안 보냄!
→ cleanup@A 저장            Layout: fn@B(<div>) 호출
                            → cleanup@B 저장
```

---

여기까지 ref callback의 **내부 동작 흐름** 전체입니다. 궁금한 점 있으신가요?

이해되면 **3번(실무 useRef/ref 패턴)** — 실제로 언제 어떤 ref 방식을 쓰는지, 흔한 함정과 해결법으로 넘어갑니다.

---

## [08:27:08] 사용자

아니요 이 상태로는 2,3번 이해 못할거같습니다. 일단 >>정리해주세요

---

## [08:27:37] AI



> 도구 호출: mcp__study__routine_appendEntry

---

## [08:27:48] AI

> [ROUTINE] Phase 4/5 | useRef 심화: 내부구현·ref callback·실무패턴 | Q&A: 2 | 경과: 10분

## 체크포인트

정리 전에 간단히 검증합니다. 코드를 보지 않고 답해주세요.

**Q1: "이게 왜 이렇게 동작해?"**

오늘 다룬 것 중 — `mountWorkInProgressHook()`에서 첫 번째 Hook은 `fiber.memoizedState`에 직접 연결하고, 이후 Hook은 `next`로 연결하는 구조였습니다. **이 구조 때문에 React가 Hook을 조건문 안에서 호출하지 못하게 하는 이유를 설명해주세요.**

**Q2: "나라면 어떻게 만들었을까?"**

useRef가 Hook 링크드 리스트에 `{current: T}`를 저장하는 방식 대신, 만약 당신이 React를 설계한다면 **다른 방식으로 ref 값을 저장할 수 있었을까요?** 떠오르는 대안이 있다면 그 트레이드오프와 함께 말해주세요.

---

## [08:31:03] 사용자

Q1: 해당 구조 때문에 왜 조건문 안에서 호출못하나요?
Q2: 글쎄요, Hook이라는 범위에서는 useRef가 맞지만, 리액트 흐름에서는 useRef는 벗어나있습니다. 그러면 굳이 Hook으로 묶어야하는가?

---

## [08:31:25] AI



> [ROUTINE] Phase 4/5 | useRef 심화: 내부구현·ref callback·실무패턴 | Q&A: 2 | 경과: 12분

### 피드백

**Q1** — 질문을 되돌려주신 건 솔직한 반응입니다. 보충하겠습니다.

핵심은 **링크드 리스트는 인덱스가 없고 순서에만 의존**한다는 점입니다.

```
렌더 1: useState → useRef → useEffect
        Hook#1  →  Hook#2 →  Hook#3

렌더 2 (조건문으로 useRef 스킵):
        useState → useEffect
        Hook#1  →  Hook#2(???)
        
updateWorkInProgressHook()는 current의 Hook#1 → Hook#2 → Hook#3을
순서대로 걸어갑니다. 2번째 호출에서 current의 Hook#2(useRef 데이터)를
useEffect에 매칭시켜버립니다 → 타입 불일치, 데이터 꼬임.
```

배열이었으면 `hooks[1]`로 직접 접근할 수 있지만, 링크드 리스트는 **"N번째 호출 = N번째 노드"**라는 순서 대응만 가능합니다. 호출 순서가 바뀌면 대응이 깨집니다.

**Q2** — 아주 좋은 지적입니다. "useRef는 React 렌더링 흐름에서 벗어나 있는데 굳이 Hook으로 묶어야 하는가?" — 이건 실제로 타당한 의문입니다.

맞습니다. useRef는 queue도 없고, dispatch도 없고, 리렌더를 트리거하지도 않습니다. 순수하게 보면 **컴포넌트 바깥의 모듈 변수**나 **WeakMap** 같은 것으로도 구현 가능합니다. 실제로 `createRef()`는 Hook이 아닌 일반 함수(`{current: null}` 반환)로 존재합니다.

그럼에도 Hook으로 묶은 이유는 — **생명주기 바인딩** 때문입니다. Hook 리스트에 있으면 Fiber가 unmount될 때 함께 정리됩니다. 모듈 변수라면 개발자가 직접 정리해야 하고, 같은 컴포넌트가 여러 번 마운트되면 인스턴스 간 값이 공유되는 버그가 생깁니다. 하지만 "Hook이어야만 하는가"라는 질문 자체는 설계 트레이드오프를 정확히 짚은 것입니다.

---

### 자기 평가

```
자기 평가를 해주세요:
- PASS → 핵심 개념을 review에 등록하고 정리합니다 (Phase 5)
- FAIL → gap을 기록하고 다음 접근 방식을 제안합니다 (Phase 5)

FAIL은 "나는 정확히 여기서 모른다"를 아는 것입니다. 부정적인 것이 아닙니다.
```

---

## [08:32:40] 사용자

PASS

---

## [08:32:52] AI

> [ROUTINE] Phase 4/5 | useRef 심화: 내부구현·ref callback·실무패턴 | Q&A: 2 | 경과: 13분

PASS입니다. 이번 세션에서 다룬 핵심 개념을 review에 등록합니다.

### review 등록 후보 (4개)

| # | 개념 | 설명 |
|---|------|------|
| 1 | **Hook 링크드 리스트 구조** | fiber.memoizedState → Hook#1 → Hook#2 (next 포인터), 조건부 호출 금지 이유 |
| 2 | **currentlyRenderingFiber 초기화 타이밍** | renderWithHooks에서 컴포넌트 함수 호출 직전에 workInProgress로 설정 |
| 3 | **memoizedState 이중 레벨** | Fiber.memoizedState = Hook 리스트 헤드 vs Hook.memoizedState = 각 Hook 데이터 |
| 4 | **useRef 객체 참조 공유** | mount 시 {current: T} 한 번 생성, 이후 동일 참조 반환 → 모든 곳에서 최신값 |

이 4개로 등록할까요? 수정/추가/삭제할 항목이 있으면 알려주세요.

---

## [08:33:46] 사용자

네

---

## [08:33:53] AI



> 도구 호출: mcp__study__review_saveMeta

---

## [08:33:59] AI



> 도구 호출: mcp__study__routine_appendEntry

---

## [08:34:10] AI



> 도구 호출: mcp__study__review_saveMeta

---

## [08:34:19] AI



> 도구 호출: mcp__study__routine_appendEntry

---

## [08:34:23] AI



> 도구 호출: mcp__study__context_resolve

---

## [08:34:34] AI



> 도구 호출: mcp__study__review_saveMeta

---

## [08:34:44] AI



> 도구 호출: mcp__study__routine_appendEntry

---

## [08:34:48] AI

review 등록 완료. Phase 5 정리로 진입합니다.

---

## [08:34:49] AI



> 도구 호출: mcp__study__routine_appendEntry

---

## [08:34:49] AI



> 도구 호출: Read

---

## [08:34:50] AI



> 도구 호출: Read

---

## [08:34:56] AI



> 도구 호출: Write

---

## [08:35:01] AI



> 도구 호출: Write

---

## [08:35:04] AI



> 도구 호출: mcp__study__routine_extractTranscript

---
