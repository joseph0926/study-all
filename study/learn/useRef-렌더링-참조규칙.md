# useRef-렌더링-참조규칙

> 최초 질문: react의 useRef docs에서는 `useRef는 렌더링에 필요하지 않은 값을 참조할 수 있게 해주는 React 훅입니다.` 라고 말합니다. 하지만 뒤에서 `초기화를 제외하고, 렌더링되는 동안 `ref.current`를 읽거나 변경하지 않아야합니다. 그것은 컴포넌트의 동작을 예측 불가능하게 만듭니다.`라고 말합니다. 약간 모순되는것 같다는 느낌이듭니다. useRef는 렌더링에 필요하지 않은 값을 참조할수있게 하지만, useRef의 산출물인 ref.current는 렌더링중에 읽거나 변경하면 안된다는건 렌더링에는 필요하지 않은 값이지만, 렌더링에 영향은 준다는 뜻일까요?
> 일시: 2026-03-01

---

## Q1. useRef는 렌더링에 필요하지 않은 값인데 렌더링 중 읽으면 안 되는 이유 — 모순 아닌가?

좋은 질문입니다. 이 두 문장은 모순이 아니라 **서로 다른 차원의 이야기**입니다. 핵심은 "렌더링에 필요하지 않다"와 "렌더링 중에 읽지 마라"에서 **"렌더링"이 가리키는 것이 다르다**는 점입니다.

---

## 비유: 메모장 vs 칠판

| 실생활 | React |
|---------|-------|
| **칠판** — 수업 중 학생들이 보는 공식 게시판 | `useState`의 state — 화면에 보여지는 값 |
| **선생님이 칠판에 쓰면** 학생들이 즉시 반응 | `setState` → `dispatchSetState` → `scheduleUpdateOnFiber` → **리렌더링 트리거** |
| **개인 메모장** — 수업 내용과 무관한 선생님의 개인 기록 | `useRef`의 ref.current — 렌더링 결과에 반영 안 됨 |
| 메모장에 뭘 적어도 **학생들은 모름** (수업에 변화 없음) | ref.current 변경 → **리렌더링 트리거 안 됨** |
| **수업 중에** 메모장을 슬쩍 보면? 수업이 2번 반복되면 **다른 내용이 적혀있을 수 있음** | 렌더링 중 ref.current를 읽으면? **Concurrent Mode에서 렌더가 중단/재시작될 때 값이 달라질 수 있음** |

---

## 코드 근거: useRef vs useState의 구조적 차이

### useRef — update queue가 없다

`ref/react/packages/react-reconciler/src/ReactFiberHooks.js:2602-2612`

```js
function mountRef<T>(initialValue: T): {current: T} {
  const hook = mountWorkInProgressHook();
  const ref = {current: initialValue};
  hook.memoizedState = ref;   // 그냥 plain object 저장
  return ref;
}

function updateRef<T>(initialValue: T): {current: T} {
  const hook = updateWorkInProgressHook();
  return hook.memoizedState;  // 이전 객체를 그대로 반환. 끝.
}
```

**`mountRef`는 `{current: initialValue}` 라는 평범한 객체를 만들어서 hook에 저장할 뿐입니다.** `queue`도 없고, `dispatch`도 없고, `scheduleUpdateOnFiber`를 호출할 경로 자체가 없습니다.

### useState — update queue + scheduleUpdateOnFiber

대비로 `mountState`를 보면 (`ref/react/.../ReactFiberHooks.js:1894-1933`):

```js
function mountStateImpl<S>(initialState): Hook {
  const hook = mountWorkInProgressHook();
  hook.memoizedState = hook.baseState = initialState;
  const queue: UpdateQueue = {    // ← update queue 생성!
    pending: null,
    lanes: NoLanes,
    dispatch: null,
    lastRenderedReducer: basicStateReducer,
    lastRenderedState: initialState,
  };
  hook.queue = queue;
  return hook;
}

function mountState<S>(initialState) {
  const hook = mountStateImpl(initialState);
  const dispatch = dispatchSetState.bind(null, currentlyRenderingFiber, queue);
  // ↑ dispatch가 scheduleUpdateOnFiber를 호출하는 경로
  queue.dispatch = dispatch;
  return [hook.memoizedState, dispatch];
}
```

**"렌더링에 필요하지 않은 값"이라는 문서의 의미:**
→ `ref.current`를 바꿔도 **리렌더링을 스케줄링하는 메커니즘이 존재하지 않는다**는 뜻입니다. `useState`는 `dispatch` → `dispatchSetState` → `scheduleUpdateOnFiber`라는 경로로 React에 "다시 그려줘"라고 알리지만, `useRef`는 그 경로가 **아예 없습니다**.

### 그러면 "렌더링 중에 읽지 마라"는 무슨 뜻인가?

이건 **Concurrent Mode**와 관련됩니다. `renderWithHooks`를 보면 (`ref/react/.../ReactFiberHooks.js:502-581`):

```js
export function renderWithHooks(current, workInProgress, Component, props, ...) {
  currentlyRenderingFiber = workInProgress;
  // ...
  let children = Component(props, secondArg);  // ← 여기서 컴포넌트 함수 실행
  // ...
}
```

그리고 `renderWithHooksAgain` (`ref/react/.../ReactFiberHooks.js:787-822`):

```js
function renderWithHooksAgain(workInProgress, Component, props, secondArg) {
  // render phase update가 있으면 다시 실행
  let numberOfReRenders = 0;
  do {
    // Start over from the beginning of the list
    currentHook = null;
    workInProgressHook = null;
    // ...
    numberOfReRenders += 1;
    // 컴포넌트를 다시 호출
  } while (didScheduleRenderPhaseUpdateDuringThisPass);
}
```

Concurrent Mode에서 React는:
1. **렌더링을 중간에 중단**할 수 있습니다 (time slicing)
2. **렌더링을 폐기하고 재시작**할 수 있습니다
3. **같은 컴포넌트를 여러 번 호출**할 수 있습니다 (Strict Mode의 double invocation)

`ref.current`는 **React가 관리하지 않는 뮤터블 값**입니다. 렌더링 중에 이 값을 읽으면:

- **1차 렌더 시도**: ref.current = `A` → JSX에 `A` 반영
- **React가 이 렌더를 폐기** (더 높은 우선순위 업데이트 때문에)
- **그 사이 이벤트 핸들러에서** ref.current = `B`로 변경
- **2차 렌더 시도**: ref.current = `B` → JSX에 `B` 반영

**같은 state에 대해 두 번의 렌더 시도가 다른 결과를 만듭니다.** React의 핵심 전제 — "같은 입력(props, state)이면 같은 출력(JSX)" — 이 깨지는 것입니다.

반면 `useState`의 값은 **React의 update queue 안에서 관리**되므로, 렌더가 몇 번 재시도되든 **같은 state 스냅샷**을 보장합니다.

---

## 시각화: 두 문장이 말하는 차원

```
"렌더링에 필요하지 않은 값"          "렌더링 중 읽지 마라"
      ↓                                    ↓
[트리거 차원]                        [일관성 차원]

  useState:                         useState:
  setValue(x)                       render#1: state=A → JSX(A)
      │                             render#2: state=A → JSX(A)  ✓ 동일
      ▼                             (React가 state 스냅샷 보장)
  scheduleUpdateOnFiber
      │                             useRef:
      ▼                             render#1: ref.current=A → JSX(A)
  리렌더링 발생!                     ─── 외부에서 ref.current=B 변경 ───
                                    render#2: ref.current=B → JSX(B)  ✗ 다름!
  useRef:                           (React가 ref 값을 관리 안 함)
  ref.current = x
      │
      ▼
  (아무 일도 안 일어남)
  리렌더링 없음!
```

정리하면:

| 문장 | 의미하는 차원 | 핵심 |
|------|-------------|------|
| "렌더링에 필요하지 않은 값" | **트리거** — ref를 바꿔도 리렌더 안 됨 | `scheduleUpdateOnFiber` 경로 없음 |
| "렌더링 중 읽지 마라" | **일관성** — Concurrent Mode에서 값 안정성 보장 못 함 | 렌더가 중단/재시작될 때 mutable ref는 값이 달라질 수 있음 |

**모순이 아니라 서로 다른 보증에 대한 이야기입니다.** "렌더링을 유발하지 않는다"는 것과 "렌더링 중에 안전하게 읽을 수 있다"는 것은 별개의 속성입니다.

---

## 연결

이전 학습 `study/learn/React-리렌더링-비용과-메모이제이션.md`에서 React Compiler의 `Refs` 카테고리를 다룬 부분이 직접 관련됩니다:

> render 중 `ref.current` 접근 → `Refs` → 부수효과 — 안전한 캐시 불가 (line 721)

React Compiler가 `ref.current` 접근을 `Refs` 카테고리로 분류해 자동 메모이제이션에서 제외하는 이유가 바로 이것입니다 — **렌더 중 ref 접근은 순수하지 않은 부수효과**이기 때문에 캐시 결과를 안전하게 재사용할 수 없습니다.

---

## Q2. 그러면 초기화중에는 괜찮다는 예외는 초기화중에는 동시성 모드가 불가능해서 그런가요?

아닙니다. **초기화 중에도 Concurrent Mode는 동일하게 작동합니다.** 예외가 허용되는 이유는 동시성 모드의 유무가 아니라 **멱등성(idempotency)** 때문입니다.

---

## 비유: 빈 노트의 첫 페이지

| 실생활 | React 초기화 패턴 |
|---------|-------------------|
| 빈 노트를 받으면 **첫 페이지에 이름을 적는다** | `if (ref.current === null) { ref.current = new X(); }` |
| 이미 이름이 적혀있으면 **넘어간다** | `ref.current !== null` → 아무것도 안 함 |
| 누가 몇 번을 확인하든 **결과는 같다**: 이름이 적혀있음 | 몇 번 렌더를 재시도하든 **결과는 같다**: 초기화된 값 |

핵심: **"첫 페이지에 이름 적기"는 1번 하든 100번 확인하든 결과가 동일합니다.** 이것이 멱등성입니다.

---

## 코드 근거: React 테스트 코드가 명시적으로 허용

`ref/react/packages/react-reconciler/src/__tests__/useRef-test.internal.js:158-180`

```js
it('should not warn about lazy init during render', async () => {
  function Example() {
    const ref1 = useRef(null);
    const ref2 = useRef(undefined);
    // Read: safe because lazy init:
    if (ref1.current === null) {
      ref1.current = 123;
    }
    if (ref2.current === undefined) {
      ref2.current = 123;
    }
    return null;
  }

  await act(() => {
    ReactNoop.render(<Example />);
  });

  // Should not warn after an update either.  ← 리렌더링에서도 안전
  await act(() => {
    ReactNoop.render(<Example />);
  });
});
```

React 팀이 `// Read: safe because lazy init:` 라는 주석까지 달아놓았습니다.

## 공식 문서의 표현

> "the result is always the same, and the condition only executes during initialization so it's fully predictable."
> (결과가 항상 동일하고, 조건이 초기화 중에만 실행되므로 완전히 예측 가능합니다.)

— 외부 코드: (react.dev, useRef 문서, 2025)

---

## 왜 멱등하면 안전한가 — Concurrent Mode 시나리오 비교

**일반적인 렌더 중 ref 읽기 (위험):**

```
render#1: ref.current = "A" → JSX("A")
── React가 render#1을 폐기 ──
── 이벤트 핸들러에서 ref.current = "B" ──
render#2: ref.current = "B" → JSX("B")   ← 같은 state인데 다른 결과!
```

**초기화 패턴 (안전):**

```
render#1: ref.current === null → ref.current = new X() → JSX(...)
── React가 render#1을 폐기 ──
── 외부에서 ref.current를 null로 되돌릴 방법 없음 ──
render#2: ref.current !== null → 기존 값 유지 → JSX(...)  ← 동일한 결과!
```

**핵심 차이**: 초기화 패턴에서 `ref.current`는 `null → 값`으로 한 방향으로만 전이합니다. 외부에서 다시 `null`로 되돌리지 않는 한, **몇 번 렌더를 재시도하든 결과가 동일합니다.** 이것이 React가 "렌더링은 순수해야 한다"고 할 때 실제로 요구하는 속성 — **같은 입력이면 같은 출력** — 을 만족합니다.

---

## 시각화: 일반 읽기 vs 초기화 패턴

```
[일반 렌더 중 ref 읽기]                [초기화 패턴]

  ref.current                          ref.current
      │                                    │
      ▼                                    ▼
  외부에서 자유롭게 변경 가능           null → 값 (단방향 전이)
      │                                    │
      ▼                                    ▼
  render#1: 값 A                       render#1: null → new X()
  render#2: 값 B  ← 달라짐!           render#2: X 이미 있음 → 유지
  render#3: 값 C  ← 또 달라짐!        render#3: X 이미 있음 → 유지
                                            │
  ✗ 비순수 (unpredictable)             ✓ 멱등 (idempotent)
```

정리하면: **"동시성 모드가 꺼져서 안전하다"가 아니라, "동시성 모드에서 몇 번 재시도해도 결과가 같으니까 안전하다"**입니다.

---

## Q3. 아, 초기값 설정은 단방향이라 그렇군요, 그러면 렌더 중 ref 읽기가 왜 문제가 되는지도 이해시켜주세요. 렌더링에 관여되지 않은 값을 useRef로 관리하는데, 같은 state일때 다른 값을 가지는게 뭐가 문제인가요? state가 같음 -> 리렌더링 안됨 -> 값은 바뀌었는데 화면에 반영안됨 << 이 문제인가요?

핵심을 찌르는 질문입니다. 사실 "화면에 반영 안 됨"은 문제의 **절반**이고, 더 심각한 문제가 있습니다.

---

## 비유: 공연의 대본과 배우의 즉흥 메모

| 실생활 | React |
|---------|-------|
| **대본(script)** — 연출가가 관리, 바뀌면 공연을 다시 리허설 | `state` — React가 관리, 바뀌면 리렌더링 |
| **배우의 개인 메모** — 연출가 몰래 적은 즉흥 대사 | `ref.current` — React가 모르는 값 |
| 연출가: "대본이 안 바뀌었으니 리허설 안 해도 돼" | React: "state 안 바뀌었으니 bailout" |
| 그런데 배우가 즉흥 메모를 보고 대사를 바꿈 → **공연마다 다른 대사** | ref.current를 렌더에 사용 → **렌더마다 다른 JSX** |
| 문제: 1막 배우는 메모 ver.A를 봤고, 2막 배우는 메모 ver.B를 봄 → **이야기가 안 맞음** | 문제: 트리의 윗부분은 ref=A로, 아랫부분은 ref=B로 렌더 → **화면이 찢어짐(tearing)** |

---

## 문제는 3가지 층위가 있습니다

### 문제 1: "화면에 반영 안 됨" — 맞습니다, 이건 예상된 동작

질문에서 추론하신 것이 정확합니다:

```jsx
function Counter() {
  const countRef = useRef(0);

  return (
    <div>
      <p>{countRef.current}</p>  {/* 렌더 중 ref 읽기 */}
      <button onClick={() => { countRef.current++ }}>+1</button>
    </div>
  );
}
```

버튼을 눌러도 `countRef.current`는 바뀌지만 화면은 안 바뀝니다. **이건 useRef의 설계 의도대로입니다** — 리렌더링을 트리거하지 않으니까요. 여기까지는 "모순"이 아니라 "의도된 제한"입니다.

### 문제 2: 진짜 위험 — React의 최적화가 깨진다

더 심각한 것은 **다른 이유로 리렌더링이 발생했을 때**입니다:

```jsx
function Dashboard() {
  const cachedDataRef = useRef(null);
  const [userName, setUserName] = useState("Kim");

  // 렌더 중에 ref를 읽어서 JSX를 결정
  return (
    <div>
      <h1>{userName}</h1>
      {cachedDataRef.current
        ? <DataView data={cachedDataRef.current} />
        : <Loading />}
    </div>
  );
}
```

시나리오:
1. `cachedDataRef.current = null` → `<Loading />` 표시
2. fetch 완료 → 이벤트 핸들러에서 `cachedDataRef.current = data` (리렌더 안 됨)
3. `setUserName("Park")` → 리렌더 발생
4. 이제야 `<DataView>` 표시됨

**문제**: 데이터가 언제 화면에 나타나는지가 **관련 없는 다른 state 변경에 의존**합니다. `userName`을 안 바꿨으면 데이터는 영영 안 보입니다. 이건 디버깅이 극도로 어려운 버그입니다.

### 문제 3: 가장 심각 — Concurrent Mode에서 UI tearing

`ref/react/packages/react-reconciler/src/ReactFiberHooks.js:1846-1854`의 주석이 이 문제를 암시합니다:

```js
// Something may have been mutated in between render and commit. This could
// have been in an event that fired before the passive effects, or it could
// have been in a layout effect.
```

이건 `useSyncExternalStore`가 **외부 mutable 값의 tearing을 방지**하기 위해 존재하는 이유입니다. ref.current를 렌더에 사용하면 이 보호 없이 동일한 문제에 노출됩니다:

```jsx
function Parent() {
  const sharedRef = useRef("A");

  // Concurrent Mode에서 React는 이 트리를 시간 분할로 렌더링
  return (
    <>
      <Child1 ref={sharedRef} />  {/* 시간 슬라이스 1에서 렌더: ref="A" */}
      {/* ── 여기서 시간 양보, 이벤트 발생, ref.current = "B" ── */}
      <Child2 ref={sharedRef} />  {/* 시간 슬라이스 2에서 렌더: ref="B" */}
    </>
  );
}
```

**같은 렌더 패스**인데 Child1은 "A"를, Child2는 "B"를 봅니다. 이것이 **tearing(찢어짐)**입니다.

`useState`는 이 문제가 없습니다 — React가 렌더 시작 시 **state 스냅샷을 고정**하기 때문입니다. `useSyncExternalStore`도 `checkIfSnapshotChanged` (`ReactFiberHooks.js:1876-1885`)로 일관성을 검증합니다. 하지만 `ref.current`는 어떤 보호도 없습니다.

---

## 시각화: 3가지 문제 층위

```
[문제 1: 반영 안 됨]        [문제 2: 우연한 반영]       [문제 3: Tearing]
(예상된 동작)              (예측 불가)               (UI 불일치)

ref=0 → ref=1              ref=null → ref=data        ref="A" → ref="B"
   │                          │                          │
   ▼                          ▼                          ▼
화면: 0 (안 바뀜)          화면: Loading...            ┌ Child1: "A" ─┐
                              │                        │              │ 같은 렌더인데
"이건 알겠어,                 │ (언젠가 다른 state       │              │ 다른 값!
 useRef니까"                  │  변경이 일어나면...)      └ Child2: "B" ─┘
                              ▼
                           화면: DataView              ← 이게 tearing
                           "언제 보일지 모름"

  심각도: 낮음                심각도: 중간               심각도: 높음
  (의도된 동작)              (디버깅 어려움)            (UI 일관성 파괴)
```

---

## 핵심 정리

질문하신 "값은 바뀌었는데 화면에 반영 안 됨"은 문제 1이고, 이건 사실 **문제가 아니라 의도된 동작**입니다.

React 문서가 진짜 경고하는 것은 **문제 2와 3**입니다:

| | `useState` | `useRef` (렌더 중 읽기) |
|---|---|---|
| 값 변경 → 화면 반영 | 보장 (scheduleUpdateOnFiber) | 보장 안 됨 (트리거 없음) |
| 같은 렌더에서 일관성 | 보장 (스냅샷 고정) | 보장 안 됨 (mutable) |
| Concurrent tearing | 방지됨 | **노출됨** |

**"렌더링에 필요하지 않은 값"을 렌더링에 사용하는 순간, React의 모든 안전장치 바깥에 놓이게 됩니다.** 그래서 "읽지 마라"가 아니라 정확히는 **"렌더 출력을 결정하는 데 사용하지 마라"**입니다.

---

## Q4. 아, 문제 1: 값 변경 반영이 개발자 컨트롤 되지 않고, 다른 state 변화에 의존해야하는 상황 또는 아예 반영안될수도있겠군요. 문제 2: 1초때 ref값은 A였고, 그값으로 <CompA/>를 렌더링했는데 0.5초 후 렌더링되는 <CompB/>에는 그 사이에 값이 바뀌어 B로 렌더링되면 같은 값을 기대했는데 다른 값으로 렌더링될수도있군요 => 예를들어 userName = "테스트1"이였는데 0.5초 사이에 "테스트2"로 바꾸면 네비바에는 테스트1로, 푸터에는 테스트2로 뜨는 버그가 나는,,

정확합니다. 두 문제 모두 이해가 맞습니다.

**문제 1** — ref 값 변경이 화면에 반영되는 시점이 개발자 통제 밖이고, 최악의 경우 영영 반영 안 될 수도 있습니다. 다른 state가 바뀌어야만 "우연히" 보이는 구조입니다.

**문제 2** — 네비바에 "테스트1", 푸터에 "테스트2"가 동시에 뜨는 것이 바로 tearing입니다. 정확한 예시입니다. `useState("테스트1")`이었다면 React가 렌더 전체에 걸쳐 스냅샷을 고정하므로 네비바와 푸터 모두 "테스트1"을 보장합니다. 이런 외부 mutable 값을 렌더에 안전하게 사용해야 할 때가 바로 `useSyncExternalStore`가 만들어진 이유입니다 — `checkIfSnapshotChanged` (`ReactFiberHooks.js:1876`)로 렌더 중 값이 바뀌었는지 검증하고, 바뀌었으면 동기 리렌더를 강제합니다.

---

## Q5. 그러면 다시 처음으로 돌아와서 `useRef`는 React에서 렌더링과 관련 없는 값을 컨트롤하기 위한 탈출구 훅이지만, 이 값을 렌더링에 이용하면 위험하다 라고 결론을 내려도될까요? 지금까지 QnA를 다시보면 React에서 useRef를 제공하는 이유는 state가 필요없는 = 즉 렌더링에 필요없지만 값은 필요한 것을 관리할때 useRef를 쓰라는 의도같은데, 그걸 굳이 렌더링에 관여되게 하면 발생하는 문제가 위에서 언급한 문제2,3 같습니다

정확합니다. 그 결론이 맞습니다.

정리하면:

- **useRef의 설계 의도**: "렌더링에 필요 없지만 값은 필요한 것"을 관리하는 탈출구 (타이머 ID, DOM 참조, 이전 props 캐시 등)
- **문서의 두 문장**: 모순이 아니라 같은 의도의 앞뒤면 — "렌더링 밖에서 쓰라고 만든 것"(기능 설명)이니 "렌더링 안에서 쓰지 마라"(사용 규칙)
- **굳이 렌더링에 관여시키면**: React의 스냅샷 고정, bailout 최적화, tearing 방지 등 **모든 안전장치 바깥**에 놓이게 됨

코드 근거로도 확인됩니다 — `mountRef`(`ReactFiberHooks.js:2602`)는 `{current: T}` plain object만 만들고, `updateRef`(`ReactFiberHooks.js:2609`)는 그걸 그대로 반환할 뿐입니다. update queue도, dispatch도, `scheduleUpdateOnFiber` 경로도 **의도적으로 없습니다**. 렌더링 시스템과 연결하지 않겠다는 설계가 코드 구조 자체에 드러나 있습니다.

---

## Q6. 그러면 useRef의 값을 어지간하면 렌더링에 관여시키지 말라 << 이건 react의 state는 불변해야한다 << 이것처럼 코드로 강제되는 룰은 아니지만, 지키지 않으면 버그가 발생할수있는 룰이군요?

맞습니다. 그리고 흥미로운 점은 — 비교 대상으로 드신 "state는 불변해야 한다"도 사실 **코드로 강제되지 않습니다**.

```js
// 이것도 코드로 막히지 않음 — 하지만 React가 변경을 감지 못해 버그 발생
const [user, setUser] = useState({ name: "Kim" });
user.name = "Park";  // 직접 변이 — JS 에러 없음, React 에러도 없음
```

두 규칙 모두 같은 카테고리입니다:

| | state 불변 | ref 렌더 관여 금지 |
|---|---|---|
| JS 레벨 강제 | X (객체는 자유롭게 변이 가능) | X (ref.current는 자유롭게 읽기 가능) |
| React 런타임 강제 | X (변이해도 에러 안 남) | X (읽어도 에러 안 남) |
| DEV 모드 경고 | O (StrictMode double render로 감지 시도) | O (렌더 중 ref 읽기 경고) |
| 어기면? | React가 변경을 못 봄 → 화면 안 바뀜 | 위에서 다룬 문제 2, 3 |

**둘 다 "React의 전제(contract)"를 깨뜨리는 행위**이고, JavaScript가 막아주지 않기 때문에 DEV 경고와 문서로만 안내합니다. React가 의존하는 전제 — "렌더는 순수함수다" — 를 지키는 것은 개발자의 몫입니다.

---

## 연결

| 대상 토픽 | 관계 | 근거 |
|-----------|------|------|
| `study/learn/React-리렌더링-비용과-메모이제이션.md` | 상위 메커니즘 | React Compiler가 `ref.current` 접근을 `Refs` 카테고리로 분류해 자동 메모이제이션에서 제외하는 이유가 본 토픽의 핵심 — 렌더 중 ref 접근은 순수하지 않은 부수효과이므로 캐시를 안전하게 재사용 불가 (line 721) |
| `study/learn/React-리렌더링-트리거.md` | 전제 지식 | `scheduleUpdateOnFiber` → 리렌더링 트리거 경로를 useRef가 의도적으로 갖지 않는다는 것이 본 토픽의 출발점 |
