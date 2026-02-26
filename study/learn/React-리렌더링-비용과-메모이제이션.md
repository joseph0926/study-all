# React-리렌더링-비용과-메모이제이션

> 최초 질문: react의 리렌더링의 비용은 실제로 어느정도인지? (관련 질문: 메모제이션이 왜 필요했을까? / 애초에 설계단계에서 메모제이션을 디폴트로 두지 않았던 이유? -> react 19 react 컴파일러로 뒤늦게 디폴트 도입하려는 이유? 등등..)
> 일시: 2026-02-26

---

## Q1. React의 리렌더링 비용은 실제로 어느 정도인가? (+ 메모이제이션 설계 역사)

### 비유: 식당의 주문 처리 시스템

| React 개념 | 식당 비유 |
|-----------|----------|
| **리렌더링 (render)** | 주방에서 **레시피를 다시 읽는 것** (요리 자체는 아님) |
| **커밋 (commit/DOM 변경)** | 실제 **요리를 만들어 테이블에 서빙**하는 것 |
| **불필요한 리렌더링** | 메뉴가 안 바뀌었는데 **레시피를 처음부터 다시 읽는 것** |
| **`React.memo`** | "주문이 같으면 레시피 다시 읽지 마" 라고 **포스트잇 붙이기** |
| **useMemo/useCallback** | 반복되는 소스/채소 손질을 **미리 해둔 반조리 통에 라벨 붙이기** |
| **React Compiler** | 주방장 대신 **자동화 시스템이 알아서** 모든 포스트잇과 반조리를 관리 |

핵심: 리렌더링 = "레시피를 다시 읽는 것"이지, "요리를 다시 만드는 것"이 아닙니다. 이 구분이 비용 논의의 출발점입니다.

### 1. 리렌더링의 실제 비용 — 무엇이 일어나는가

리렌더링이 발생하면 **3단계 비용**이 순차적으로 발생합니다.

#### 단계 A: 컴포넌트 함수 실행 (Render Phase)

컴포넌트 함수가 호출되어 새 JSX(React Element 트리)를 반환합니다.

```jsx
function TodoList({ todos, filter }) {
  // ① 매번 새로 실행되는 연산
  const filtered = todos.filter(t => t.status === filter); // O(N)
  // ② 매번 새 함수 객체 생성
  const handleClick = () => { /* ... */ };
  // ③ JSX → createElement 호출 → 새 객체 생성
  return filtered.map(t => <TodoItem key={t.id} todo={t} onClick={handleClick} />);
}
```

비용 요소:
- 함수 본문의 **모든 JS 연산** 재실행 (변수 선언, 계산, 객체 생성 등)
- hooks 실행 (`updateWorkInProgressHook` 호출 등)
- JSX → `createElement` → **새 props 객체 생성** (매번 `!==` 참조가 다름)

#### 단계 B: Reconciliation (Diffing)

새 React Element 트리를 이전 Fiber 트리와 비교합니다.

ref/ 소스 `ReactChildFiber.js:1172`의 `reconcileChildrenArray`:

```js
// ReactChildFiber.js:1206-1218
for (; oldFiber !== null && newIdx < newChildren.length; newIdx++) {
  if (oldFiber.index > newIdx) {
    nextOldFiber = oldFiber;
    oldFiber = null;
  } else {
    nextOldFiber = oldFiber.sibling;
  }
  const newFiber = updateSlot(
    returnFiber,
    oldFiber,
    newChildren[newIdx],
    lanes,
  );
```

비유 매칭: 이것은 "이전 요리와 새 레시피를 한 줄씩 대조"하는 과정입니다. 리스트의 경우 O(N) 선형 비교를 수행합니다.

#### 단계 C: Commit (DOM 변경)

Diff 결과가 있을 때만 실제 DOM API를 호출합니다. **변경이 없으면 commit은 일어나지 않습니다.**

> **핵심 인사이트**: 대부분의 "불필요한 리렌더링"에서 C단계(DOM 변경)는 발생하지 않습니다. 비용은 A + B 단계에 집중됩니다.

#### 구체적 수치 (웹 출처)

| 시나리오 | 대략적 비용 | 출처 |
|---------|-----------|------|
| 단순 컴포넌트 1회 리렌더 | **0.01~0.1ms** | 추론: createElement + hooks 몇 번 = 마이크로초 수준 |
| 리스트 100개 자식 cascade | **1~10ms** | [3perf.com - React Monitoring](https://3perf.com/blog/react-monitoring/) |
| 복잡한 트리 1000+ 컴포넌트 | **16~100ms+** (프레임 드롭) | [DEV Community - Cost of Re-renders](https://dev.to/maurya-sachin/the-cost-of-re-renders-how-to-make-react-apps-actually-reactive-3mc6) |
| 최적화 전 → 후 (React Compiler) | **30~60% scripting 시간 감소** | 웹 검색 결과 (2025) |

추론: 개별 컴포넌트의 리렌더링 비용은 **매우 낮습니다**. 문제는 **cascade(전파)**입니다. 부모 하나가 리렌더링되면 모든 자식이 연쇄적으로 리렌더링되고, 이것이 수백~수천 컴포넌트에 걸치면 체감 성능이 악화됩니다.

### 2. 메모이제이션이 왜 필요했는가

이전 학습(`React-리렌더링-트리거.md`)에서 확인했듯이, `beginWork`의 props 비교는 **참조 동등성(`===`)**으로 수행됩니다:

```js
// ReactFiberBeginWork.js:4173-4174
if (oldProps !== newProps || hasLegacyContextChanged()) {
  didReceiveUpdate = true;  // → 리렌더링!
}
```

부모가 리렌더링되면 `createElement(Child, { value: count })` → **매번 새 props 객체** → `oldProps !== newProps` → 자식도 리렌더링. 비유로 하면: "주문 내용이 같아도 **새 종이에 적었으면** 레시피를 다시 읽어야 함".

`React.memo`는 이것을 `shallowEqual`로 바꿉니다:

```js
// ReactFiberBeginWork.js:551-552 (updateSimpleMemoComponent)
if (
  shallowEqual(prevProps, nextProps) &&
  current.ref === workInProgress.ref
) {
  didReceiveUpdate = false;  // → bailout! (리렌더링 건너뜀)
```

비유 매칭: "종이가 달라도 **내용이 같으면** 레시피 다시 안 읽겠다"는 포스트잇.

그런데 `shallowEqual`은 **1단계 깊이**만 비교합니다. props 안에 매번 새로 생성되는 함수나 객체가 있으면:

```jsx
<Child onClick={() => doSomething()} />  // 매 렌더마다 새 함수 참조
```

`shallowEqual`도 실패합니다. 그래서 `useCallback`과 `useMemo`가 필요해진 것입니다:

```js
// ReactFiberHooks.js:2902-2913 (updateCallback)
function updateCallback<T>(callback: T, deps): T {
  const hook = updateWorkInProgressHook();
  const prevDeps = prevState[1];
  if (areHookInputsEqual(nextDeps, prevDeps)) {
    return prevState[0];  // deps가 같으면 이전 참조 재사용
  }
  hook.memoizedState = [callback, nextDeps];
  return callback;
}
```

비유 매칭: `useCallback` = "소스 레시피가 같으면 **어제 만든 소스를 같은 통에서 꺼내 쓰기**" (같은 참조를 유지).

### 3. 왜 처음부터 메모이제이션을 디폴트로 두지 않았는가

Dan Abramov의 ["Before You memo()"](https://overreacted.io/before-you-memo/) 글의 핵심 논지와 실제 코드 구현을 대조합니다.

**이유 ①: 메모이제이션 자체에 비용이 있다**

```js
// ReactFiberHooks.js:2935-2948 (updateMemo)
function updateMemo<T>(nextCreate: () => T, deps): T {
  const hook = updateWorkInProgressHook();         // hook 체인 순회
  const prevDeps = prevState[1];
  if (areHookInputsEqual(nextDeps, prevDeps)) {    // deps 배열 순회 비교
    return prevState[0];                            // cache hit
  }
  const nextValue = nextCreate();                   // cache miss → 실행
  hook.memoizedState = [nextValue, nextDeps];       // 저장
  return nextValue;
}
```

매 리렌더마다 **무조건** 실행되는 비용:
- `updateWorkInProgressHook()` — hook 체인 순회
- `areHookInputsEqual()` — deps 배열의 모든 요소를 `Object.is`로 비교
- 메모리: `[value, deps]` 배열을 fiber의 `memoizedState`에 유지

추론: 비용이 매우 저렴한 연산(단순 숫자 덧셈 등)에 `useMemo`를 걸면, **비교 비용 > 재계산 비용**이 되어 오히려 느려집니다.

비유 매칭: "5초면 끝나는 간단한 채소 손질인데, 반조리 통에 라벨 붙이고 찾고 확인하는 시간이 7초" → 비효율.

**이유 ②: 정확한 deps 관리가 어렵다 (인간 에러)**

```jsx
// 잘못된 메모이제이션 — deps에 obj를 넣었지만 매 렌더마다 새 객체
const config = { theme: 'dark' };  // 매번 새 참조!
const result = useMemo(() => process(config), [config]); // 매번 cache miss
```

**이유 ③: 구조적 해결이 더 근본적이다**

Dan Abramov의 핵심 주장 (overreacted.io, 2021):
> "before you apply optimizations like `memo` or `useMemo`, it might make sense to look if you can split the parts that change from the parts that don't change."

두 가지 패턴:
- **State를 아래로 내리기**: 변경되는 state를 사용하는 부분만 별도 컴포넌트로 분리
- **Content를 위로 올리기**: `children` prop으로 변하지 않는 콘텐츠를 전달

이 방법들은 **리렌더링 자체를 방지**하므로 메모이제이션보다 근본적입니다.

### 4. React Compiler가 뒤늦게 자동 메모이제이션을 도입하려는 이유

React Compiler는 빌드 타임에 **모든 컴포넌트와 hooks를 자동으로 메모이제이션**합니다.

ref/ 소스에서 확인한 메커니즘:

**Step 1: 수동 메모이제이션 제거** (`Pipeline.ts:35` — `dropManualMemoization`)

기존 `useMemo`/`useCallback`을 제거하고 컴파일러가 처음부터 분석합니다.

**Step 2: Reactive Scope 분석**

컴파일러가 코드를 HIR(High-level IR)로 변환한 후, **어떤 값이 어떤 입력에 의존하는지** 정적으로 분석합니다 (`InferReactiveScopeVariables`, `PropagateScopeDependenciesHIR`).

**Step 3: `useMemoCache`를 이용한 캐시 코드 생성**

```js
// CodegenReactiveFunction.ts:174-189
const cacheCount = compiled.memoSlotsUsed;
if (cacheCount !== 0) {
  // const $ = useMemoCache(N);  ← N개 슬롯의 캐시 배열 할당
  preface.push(
    t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier(cx.synthesizeName('$')),
        t.callExpression(t.identifier(useMemoCacheIdentifier), [
          t.numericLiteral(cacheCount),
        ]),
      ),
    ]),
  );
}
```

`useMemoCache`의 런타임 구현 (`ReactFiberHooks.js:1167`):

```js
function useMemoCache(size: number): Array<mixed> {
  // fiber.updateQueue.memoCache에서 캐시 배열을 가져오거나 생성
  // 각 슬롯이 REACT_MEMO_CACHE_SENTINEL이면 "아직 계산 안 됨"
  // 캐시 hit 시: 이전 값 반환 (비교 없이 슬롯 인덱스로 직접 접근)
}
```

비유 매칭: `useMemo`가 "라벨을 읽고 내용물을 확인"하는 방식이라면, `useMemoCache`는 **번호가 매겨진 서랍장**입니다. deps 비교 대신 **인덱스로 직접 접근**하고, 입력이 바뀌었을 때만 sentinel 값으로 표시해 재계산합니다.

**왜 "뒤늦게" 가능해졌는가?**

| 과거의 장벽 | 컴파일러가 해결한 방법 |
|-----------|-------------------|
| deps 관리 실수 | 정적 분석으로 **의존성을 자동 추출** |
| 불필요한 메모이제이션 비용 | Reactive Scope 분석으로 **필요한 것만** 메모이제이션 |
| 인간이 판단하기 어려운 경우 | 컴파일러가 **모든 코드 경로**를 분석 |
| 코드 가독성 저하 | 빌드 타임에 처리되므로 **소스 코드는 깨끗하게 유지** |

추론: 결국 React 팀은 "메모이제이션은 대부분 필요하지만, 인간이 정확하게 적용하기엔 너무 지루하고 에러가 많다"는 결론에 도달한 것입니다. 컴파일러가 이 문제를 **기계적으로, 빌드 타임에, 정확하게** 해결합니다.

### 시각화: 리렌더링 비용과 메모이제이션 전략의 진화

```
리렌더링 발생 시 비용 분해
═══════════════════════════════════════════════════════════════

                 단계 A          단계 B          단계 C
              (함수 실행)     (Reconciliation)   (DOM Commit)
                  │                │                │
  비용 구성:     JS 연산          Fiber Diff       DOM API
              hook 실행        key 매칭          Layout
              객체 생성        참조 비교          Paint
                  │                │                │
                  ▼                ▼                ▼
  단일 컴포넌트: ~0.01ms         ~0.01ms        변경시만 발생
  100개 cascade: ~1-10ms         ~1-5ms          ~0-5ms
  1000+ cascade: ~16-100ms+      ~10-50ms        ~0-50ms
                  │                                 │
                  └─── 여기가 문제 ─────────────────┘
                        (cascade가 비용을 증폭)


메모이제이션 전략 진화
═══════════════════════════════════════════════════════════════

  2015  React 초기
  │     "리렌더링은 저렴하다. 필요하면 shouldComponentUpdate"
  │
  2018  React.memo / useMemo / useCallback 도입
  │     "수동으로 필요한 곳에 적용하세요"
  │     ⚠️ 문제: 인간의 실수, 코드 복잡도 증가, 비용 판단 어려움
  │
  2021  Dan Abramov "Before You memo()"
  │     "구조적 해결(composition)을 먼저, memo는 최후 수단"
  │     → state 내리기, children 올리기
  │
  2024  React Compiler (React Forget → React Compiler)
  │     "컴파일러가 자동으로 전부 메모이제이션"
  │     → dropManualMemoization → ReactiveScope 분석 → useMemoCache
  │
  2025  React Compiler 안정화 (Stable)
        "memo/useMemo/useCallback 대부분 불필요"


수동 vs 자동 메모이제이션 비교
═══════════════════════════════════════════════════════════════

  수동 (useMemo):
  ┌──────────────┐  매 렌더마다
  │ hook 체인 순회 ├─→ deps 배열 비교 ─→ hit? ─→ 이전값 반환
  │              │                         miss? ─→ 재계산 + 저장
  └──────────────┘
  비용: O(deps.length) 비교 + hook 오버헤드

  자동 (useMemoCache):
  ┌──────────────┐  매 렌더마다
  │ 캐시[$index]  ├─→ sentinel? ─→ yes → 계산 + 저장
  │              │                 no  → 이전값 반환
  └──────────────┘
  비용: 인덱스 접근 O(1) + 컴파일러가 변경 시점을 정확히 결정
```

Sources:
- [Before You memo() — Dan Abramov (overreacted.io)](https://overreacted.io/before-you-memo/)
- [React Compiler Introduction — react.dev](https://react.dev/learn/react-compiler/introduction)
- [The Cost of Re-Renders — DEV Community](https://dev.to/maurya-sachin/the-cost-of-re-renders-how-to-make-react-apps-actually-reactive-3mc6)
- [How To Measure and Monitor React Render Performance — 3perf.com](https://3perf.com/blog/react-monitoring/)

---

## Q2. React Compiler의 동작 원리를 자세하고 쉽게 설명

### 비유: 자동 번역 공장 (소스코드 → 최적화된 코드)

| React Compiler 개념 | 비유 |
|---------------------|------|
| **원본 소스코드** | 한국어 원고 (개발자가 쓴 React 코드) |
| **lower → HIR** | 원고를 **문장 구조 분석표**로 변환 (주어/동사/목적어 파싱) |
| **SSA** | 모든 변수에 **고유 번호** 매기기 ("x는 3번째로 사용된 x_3") |
| **InferMutationAliasingEffects** | "이 변수가 어디서 **변하는지**, 어디로 **흘러가는지** 추적" |
| **InferReactiveScopeVariables** | "함께 변하는 것들을 **같은 상자(scope)**에 묶기" |
| **useMemoCache 코드 생성** | 각 상자에 **번호표 서랍** 붙이기 — "입력이 같으면 서랍에서 꺼내 쓰기" |
| **최종 출력** | 자동 최적화된 일본어 번역본 (사람이 읽을 필요 없는 빌드 결과물) |

핵심: 컴파일러는 "개발자의 깨끗한 소스코드"를 입력받아, "모든 메모이제이션이 자동 적용된 코드"를 **빌드 타임에** 출력합니다. 런타임 비용이 아니라 빌드 비용입니다.

### 전체 파이프라인 — 6단계로 나누어 설명

`Pipeline.ts:117-597`의 `run()` → `runWithEnvironment()` 함수가 전체 흐름입니다.

#### Stage 1: Lowering (Babel AST → HIR)

```
Pipeline.ts:163
const hir = lower(func, env).unwrap();
```

Babel이 파싱한 AST(추상 구문 트리)를 **HIR(High-level Intermediate Representation)**로 변환합니다.

비유 매칭: 한국어 원고를 **문장 구조 분석표**로 변환하는 것. JSX, 조건문, 반복문 등을 기본 블록(BasicBlock) + 명령어(Instruction) + 종결자(Terminal) 형태로 정규화합니다.

```
원본 JSX:     <Foo x={a + b} />
     ↓
HIR:          t0 = a + b           (Instruction)
              t1 = createElement(Foo, {x: t0})  (Instruction)
              return t1            (Terminal)
```

#### Stage 2: 수동 메모이제이션 제거 + SSA 변환

```
Pipeline.ts:178    dropManualMemoization(hir)     // useMemo/useCallback 제거
Pipeline.ts:195    enterSSA(hir)                   // SSA 형태로 변환
```

**왜 기존 useMemo를 제거하는가?** 컴파일러가 **처음부터** 전체 함수를 분석해서 최적의 메모이제이션을 적용하기 때문입니다. 개발자가 수동으로 건 memo는 컴파일러 분석을 방해할 수 있습니다.

`DropManualMemoization.ts`에서 확인:

```
// DropManualMemoization.ts:36-47
type ManualMemoCallee = {
  kind: 'useMemo' | 'useCallback';
  loadInstr: TInstruction<LoadGlobal> | TInstruction<PropertyLoad>;
};
// → useMemo/useCallback 호출을 찾아 일반 표현식으로 치환
```

비유 매칭: 번역 전에 **원본에 달린 메모 스티커를 전부 떼어내는 것**. 번역 공장이 자체적으로 더 정확한 메모를 다시 붙일 거니까.

**SSA (Static Single Assignment)**: 모든 변수를 "한 번만 할당되는" 형태로 변환합니다.

```
// before SSA          // after SSA
let x = 1;            let x_0 = 1;
x = x + 1;            let x_1 = x_0 + 1;
use(x);               use(x_1);
```

비유 매칭: 모든 변수에 **고유 일련번호**를 붙이는 것. 이렇게 하면 "이 값이 어디서 만들어졌고 어디서 쓰이는지" 추적이 명확해집니다.

#### Stage 3: 효과 추론 (Effect Inference)

```
Pipeline.ts:230    analyseFunctions(hir)
Pipeline.ts:233    inferMutationAliasingEffects(hir)
Pipeline.ts:258    inferMutationAliasingRanges(hir)
```

이 단계가 컴파일러의 **핵심 두뇌**입니다. 각 명령어(Instruction)에 대해:

- **이 값은 변형(mutate)되는가?**
- **이 값은 다른 값을 참조(alias)하는가?**
- **이 값은 언제부터 언제까지 변형 가능한가?** (MutableRange)

```
// 예시: 효과 추론 결과
let x = {};        // Create x     (x의 mutable range 시작)
x.foo = 1;         // Mutate x
let y = x;         // Alias x → y  (x와 y는 같은 값을 가리킴)
use(y);            //               (x의 mutable range 끝)
```

비유 매칭: 문장 분석표에서 "이 단어가 문장의 **주어인지 목적어인지**, 앞의 어떤 단어를 **가리키는 대명사인지**" 분석하는 것. 이 정보가 있어야 "어디를 캐시할지" 결정할 수 있습니다.

#### Stage 4: Reactive Scope 추론 (가장 중요!)

```
Pipeline.ts:340    inferReactiveScopeVariables(hir)
```

`InferReactiveScopeVariables.ts:30-45`의 주석이 핵심 설명을 담고 있습니다:

```
// InferReactiveScopeVariables.ts:30-45
// 이것은 4개 패스 중 1번째로, 함수를 독립적으로 메모이제이션 가능한
// 단위(reactive scope)로 분할하는 방법을 결정합니다:
// 1. InferReactiveScopeVariables — 함께 변형되는 변수들을 같은 scope에 할당
// 2. AlignReactiveScopesToBlockScopes — scope를 블록 경계에 정렬
// 3. MergeOverlappingReactiveScopes — 겹치는 scope 병합
// 4. BuildReactiveBlocks — 각 scope의 명령문들을 그룹화
```

**Reactive Scope이란?** "입력이 바뀔 때만 다시 계산해야 하는 코드 블록"입니다. 함께 변형되는(co-mutate) 변수들은 같은 scope에 묶입니다.

```jsx
// 원본
function Component({ items, filter }) {
  const filtered = items.filter(i => i.status === filter);  // items, filter에 의존
  const count = filtered.length;                             // filtered에 의존
  return <List data={filtered} count={count} />;             // filtered, count에 의존
}
```

컴파일러의 분석:
```
Scope A: { filtered, count } ← 의존성: [items, filter]
  (items나 filter가 바뀔 때만 재계산)

Scope B: { JSX 결과 } ← 의존성: [filtered, count]
  (filtered나 count가 바뀔 때만 재생성)
```

비유 매칭: "함께 변하는 것들을 **같은 상자**에 넣는 것". 상자 A의 재료(items, filter)가 안 바뀌면 상자 A를 열지 않습니다. 상자 A가 안 바뀌면 상자 B(JSX)도 열지 않습니다.

이후 파이프라인에서 불필요한 scope를 정리합니다:

```
Pipeline.ts:471    pruneNonEscapingScopes    — 함수 밖으로 나가지 않는 값은 메모 불필요
Pipeline.ts:478    pruneNonReactiveDependencies — 절대 안 바뀌는 의존성 제거
Pipeline.ts:485    pruneUnusedScopes         — 빈 scope 제거
Pipeline.ts:499    pruneAlwaysInvalidatingScopes — 매번 무효화되는 scope 제거
```

비유 매칭: "어차피 매번 열어야 하는 상자는 상자를 쓸 필요가 없다", "아무도 꺼내 쓰지 않는 상자는 만들 필요가 없다" 같은 최적화.

#### Stage 5: 코드 생성 (Codegen)

```
Pipeline.ts:575    const ast = codegenFunction(reactiveFunction, ...)
```

`CodegenReactiveFunction.ts`에서 각 Reactive Scope를 **`$[index]` 캐시 패턴**으로 변환합니다.

ref/ fixture 예제로 실제 변환을 봅시다 (`simple.expect.md`):

**입력:**
```javascript
export default function foo(x, y) {
  if (x) {
    return foo(false, y);
  }
  return [y * 10];
}
```

**출력:**
```javascript
import { c as _c } from "react/compiler-runtime";
export default function foo(x, y) {
  const $ = _c(4);        // ① 4칸짜리 캐시 배열 할당
  if (x) {
    let t0;
    if ($[0] !== y) {     // ② 의존성(y)이 바뀌었나?
      t0 = foo(false, y); // ③ 바뀌었으면 재계산
      $[0] = y;           // ④ 의존성 저장
      $[1] = t0;          // ⑤ 결과 저장
    } else {
      t0 = $[1];          // ⑥ 안 바뀌었으면 캐시에서 반환
    }
    return t0;
  }
  const t0 = y * 10;
  let t1;
  if ($[2] !== t0) {      // 같은 패턴 반복
    t1 = [t0];
    $[2] = t0;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  return t1;
}
```

비유 매칭: 각 Reactive Scope가 **번호표 서랍**이 됩니다. 서랍에는 `[의존성, 결과]` 쌍이 저장됩니다. 매 렌더마다 "의존성이 같은지" 한 번만 확인하고, 같으면 서랍에서 꺼냅니다.

`useMemo`와의 결정적 차이를 다시 한번 강조:

```
// useMemo: deps 배열의 모든 요소를 Object.is로 비교 (O(N))
areHookInputsEqual(nextDeps, prevDeps)  // 배열 순회

// Compiler: 캐시 인덱스로 직접 접근 + 단일 !== 비교 (O(1))
if ($[0] !== y) { ... }                 // 인덱스 접근
```

#### Stage 6: useMemoCache 런타임

생성된 코드에서 `_c(4)`는 `useMemoCache(4)`를 호출합니다.

`ReactFiberHooks.js:1167-1246`에서 확인한 런타임:

```js
function useMemoCache(size: number): Array<mixed> {
  // 1. fiber.updateQueue.memoCache에서 기존 캐시를 찾음
  // 2. 없으면 current fiber(이전 렌더)에서 clone
  // 3. 그것도 없으면 새 캐시 생성
  // 4. 각 슬롯 초기값: REACT_MEMO_CACHE_SENTINEL (미계산 표시)
}
```

비유 매칭: 컴포넌트가 처음 렌더링될 때 **빈 서랍장**을 만들고, 다음 렌더링부터는 **이전 서랍장을 그대로 가져와** 슬롯별로 확인합니다.

또 하나 핵심 — `useMemo`를 컴파일러가 어떻게 처리하는지 (`useMemo-simple.expect.md`):

**입력:**
```javascript
function component(a) {
  let x = useMemo(() => [a], [a]);
  return <Foo x={x}></Foo>;
}
```

**출력:**
```javascript
import { c as _c } from "react/compiler-runtime";
function component(a) {
  const $ = _c(4);
  let t0;
  if ($[0] !== a) {      // useMemo가 사라지고 동일한 캐시 패턴으로 변환!
    t0 = [a];
    $[0] = a;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const x = t0;
  let t1;
  if ($[2] !== x) {      // JSX도 자동 메모이제이션!
    t1 = <Foo x={x} />;
    $[2] = x;
    $[3] = t1;
  } else {
    t1 = $[3];
  }
  return t1;
}
```

주목: `useMemo(() => [a], [a])`가 제거되고, 컴파일러의 **동일한 `$[index]` 패턴**으로 대체되었습니다. 그리고 개발자가 수동으로 하지 않았던 **JSX 메모이제이션**까지 자동으로 추가됩니다.

### 시각화: 컴파일러 파이프라인 전체 흐름

```
React Compiler Pipeline (Pipeline.ts:117-597)
═══════════════════════════════════════════════════════════════════════

  [개발자의 React 코드]
         │
         ▼
  ┌─────────────────────────────────────────────────────────────────┐
  │ Stage 1: Lowering (Babel AST → HIR)                            │
  │  lower(func, env)                                    :163      │
  │  "문장 구조 분석표 생성"                                         │
  └─────────────────────────────────────────────────────────────────┘
         │
         ▼
  ┌─────────────────────────────────────────────────────────────────┐
  │ Stage 2: 정규화                                                 │
  │  dropManualMemoization  ── useMemo/useCallback 제거  :178      │
  │  enterSSA              ── 변수에 고유번호             :195      │
  │  eliminateRedundantPhi ── 불필요한 합류점 제거        :198      │
  │  "메모 스티커 제거 + 변수 번호 매기기"                           │
  └─────────────────────────────────────────────────────────────────┘
         │
         ▼
  ┌─────────────────────────────────────────────────────────────────┐
  │ Stage 3: 효과 추론 (핵심 두뇌)                                   │
  │  analyseFunctions             ── 내부 함수 분석      :230      │
  │  inferMutationAliasingEffects ── 변형/참조 추적      :233      │
  │  inferMutationAliasingRanges  ── 변형 구간 계산      :258      │
  │  inferReactivePlaces          ── 반응적 위치 표시    :306      │
  │  "이 변수 어디서 변함? 어디로 흘러감? 언제까지 변함?"              │
  └─────────────────────────────────────────────────────────────────┘
         │
         ▼
  ┌─────────────────────────────────────────────────────────────────┐
  │ Stage 4: Reactive Scope (메모이제이션 단위 결정)                  │
  │  inferReactiveScopeVariables   ── 함께 변하는 변수 묶기  :340  │
  │  alignReactiveScopesToBlockScopes ── 블록 경계 정렬     :390  │
  │  mergeOverlappingReactiveScopes   ── 겹치는 scope 병합  :397  │
  │  propagateScopeDependenciesHIR    ── 의존성 전파         :429  │
  │  "같은 상자에 넣을 것 결정 + 상자의 재료 목록 확정"               │
  │                                                                │
  │  pruneNonEscapingScopes          ── 불필요한 scope 제거  :471  │
  │  pruneAlwaysInvalidatingScopes   ── 매번 무효화 scope 제거:499 │
  │  "어차피 열어야 하는 상자, 아무도 안 쓰는 상자 → 제거"            │
  └─────────────────────────────────────────────────────────────────┘
         │
         ▼
  ┌─────────────────────────────────────────────────────────────────┐
  │ Stage 5: 코드 생성                                              │
  │  buildReactiveFunction  ── HIR → ReactiveFunction     :454     │
  │  codegenFunction        ── ReactiveFunction → JS AST  :575     │
  │                                                                │
  │  각 ReactiveScope →  if ($[i] !== dep) {                       │
  │                         result = compute();                     │
  │                         $[i] = dep; $[i+1] = result;           │
  │                       } else { result = $[i+1]; }              │
  └─────────────────────────────────────────────────────────────────┘
         │
         ▼
  ┌─────────────────────────────────────────────────────────────────┐
  │ Stage 6: 런타임 (useMemoCache)                                  │
  │  ReactFiberHooks.js:1167                                       │
  │  const $ = useMemoCache(N)  ← fiber에 N칸 캐시 배열             │
  │  초기값: REACT_MEMO_CACHE_SENTINEL (미계산 표시)                  │
  │  "번호표 서랍장을 fiber에 부착"                                   │
  └─────────────────────────────────────────────────────────────────┘
         │
         ▼
  [최적화된 코드 — 모든 값/JSX가 자동 캐시됨]
```

---

## Q3. Compiler 심층 질문 6가지

### 3-1. "정규화가 100% 완벽하게 가능한가? 예측 불가능한 코드는?"

**결론: 100% 불가능합니다. 그래서 컴파일러에는 정교한 "포기(bailout)" 시스템이 있습니다.**

#### 소스 근거: 에러 카테고리와 bailout 메커니즘

`CompilerError.ts:619-680`에 **20개 이상의 에러 카테고리**가 정의되어 있습니다:

```
ErrorCategory {
  Hooks,              // 조건부 hook 호출 등
  Immutability,       // props 변형
  Globals,            // 전역 변수 변형
  Refs,               // render 중 ref 접근
  Syntax,             // 지원하지 않는 JS 문법
  Todo,               // 아직 미구현 패턴
  UnsupportedSyntax,  // 지원 불가 패턴
  ...
}
```

컴파일러가 처리 못하는 코드를 만나면 **두 가지 종류의 포기**를 합니다:

```js
// CompilerError.ts:339-349
// ① throwTodo — "이건 아직 구현 안 했어" (graceful bailout)
static throwTodo(options): never {
  // category: ErrorCategory.Todo
  throw errors;  // → 원본 코드를 그대로 유지
}

// CompilerError.ts:315-330
// ② invariant — "이건 있을 수 없는 상태" (hard failure)
static invariant(condition, options): asserts condition {
  // category: ErrorCategory.Invariant
  throw errors;  // → 진짜 버그
}
```

그리고 `Program.ts:744`에서 **try-catch로 감싸서** 컴파일 실패 시 원본 코드를 유지합니다:

```js
// Program.ts:740-746
} catch (err) {
  return {kind: 'error', error: err};
  // → handleError로 전달 → 원본 코드 유지, 경고만 출력
}
```

`Program.ts:630-644`:
```js
if (compileResult.kind === 'error') {
  handleError(compileResult.error, programContext, fn.node.loc ?? null);
  // client 모드에서는 retry도 시도
  const retryResult = retryCompileFunction(fn, fnType, programContext);
  if (retryResult == null) {
    return null;  // → 원본 코드 그대로 사용
  }
}
```

비유: 번역 공장에서 "이 문장은 번역 불가"라고 판단하면, **원문을 그대로 출력**합니다. 번역 공장이 원문을 망가뜨리는 일은 없습니다.

#### 컴파일러가 포기하는 대표적 패턴들

| 패턴 | 카테고리 | 이유 |
|------|---------|------|
| 조건부 hook 호출 | `Hooks` | React 규칙 위반 — 정적 분석 불가 |
| render 중 `ref.current` 접근 | `Refs` | 부수효과 — 안전한 캐시 불가 |
| 전역 변수 변형 | `Globals` | 외부 상태 의존 — 순수하지 않음 |
| try-catch 안의 JSX | `ErrorBoundaries` | 예외 경로 분석 어려움 |
| 미지의 함수 호출 패턴 | `Todo` | 아직 미구현 |

**핵심 설계 철학**: 컴파일러는 **"확신이 없으면 건드리지 않는다"** 원칙입니다. 100%가 아닌 대신, **0%의 파손 위험**을 목표로 합니다.

### 3-2. "SSA에서 변수가 기하급수적으로 늘지 않는가? 성능 문제는?"

**결론: 선형으로 늘어납니다. 기하급수적 증가는 발생하지 않습니다.**

SSA의 핵심 규칙은 "각 변수에 대한 각 **할당(assignment)**마다 새 이름을 만든다"입니다:

```
// 원본에 변수 x가 3번 할당되면:
let x = 1;      → x_0 = 1
x = x + 1;      → x_1 = x_0 + 1
x = x * 2;      → x_2 = x_1 * 2

// 3번 할당 → 3개 SSA 변수. 비율은 1:1.
```

추론: SSA 변수 수는 **원본 코드의 할당 횟수**에 비례합니다. `N`개의 할당이 있으면 SSA 변수도 최대 `N`개. 이것은 O(N)이지 O(2^N)이 아닙니다.

조건분기에서의 Phi 노드도 마찬가지입니다:

```
if (cond) {
  x = 1;        → x_0 = 1
} else {
  x = 2;        → x_1 = 2
}
use(x);          → x_2 = φ(x_0, x_1)  // Phi 노드: 합류점
```

Phi 노드 수 = 분기 수 × 분기에서 재할당되는 변수 수. 여전히 선형입니다.

**성능 측면**: SSA는 **컴파일 타임**에만 존재합니다. 런타임 JS 코드에는 SSA 변수가 나타나지 않습니다. `Pipeline.ts:198`의 `eliminateRedundantPhi`가 불필요한 Phi 노드를 제거하고, 최종 `renameVariables` (`Pipeline.ts:550`)에서 다시 읽기 쉬운 변수명으로 복원합니다.

비유 매칭: "변수에 고유번호를 붙이는 것"은 **분석 단계에서만 사용하는 임시 라벨**이고, 최종 번역본에는 원래 이름으로 돌아갑니다.

### 3-3. "효과 추론이 3개로만 이루어져 있나? 모든 것을 표현 가능한가?"

**Q2에서 단순화해서 설명한 것입니다. 실제로는 3개가 아니라 17가지 효과 종류가 있습니다.**

`AliasingEffects.ts:29-175`에서 정의된 전체 AliasingEffect 유니온 타입:

```
// 변형(Mutation) 계열 — 5가지
Mutate                     — 값과 직접 별칭을 변형
MutateConditionally        — 값이 mutable일 때만 변형
MutateTransitive           — 값 + 직접 별칭 + 전이적 캡처 모두 변형
MutateTransitiveConditionally — 위의 조건부 버전
MutateFrozen               — 동결된 값 변형 시도 (에러!)

// 데이터 흐름(Data Flow) 계열 — 6가지
Capture                    — a의 정보가 b에 캡처 (b 변형 ≠ a 변형)
Alias                      — a와 b가 같은 값을 가리킴 (b 변형 = a 변형)
MaybeAlias                 — a와 b가 같은 값일 수도 있음 (불확실)
Assign                     — 직접 할당 (into = from)
ImmutableCapture           — 불변 데이터 흐름 (escape 분석용)
CreateFrom                 — from과 같은 종류의 새 값 생성

// 생성(Creation) 계열 — 2가지
Create                     — 새 값 생성 (ValueKind 지정)
CreateFunction             — 함수 표현식 생성 + captures 목록

// 호출(Invocation) — 1가지
Apply                      — 함수 호출 (receiver, args, result 포함)

// 특수 목적 — 3가지
Freeze                     — 값을 불변으로 동결
Render                     — render 중 접근됨 (JSX props 등)
Impure                     — render-unsafe 부수효과
MutateGlobal               — 전역 변수 변형 (에러!)
```

**왜 이렇게 세분화되어 있는가?**

핵심 이유는 `Capture`와 `Alias`의 차이입니다:

```js
// Capture: array.push(item)
// → array에 item의 정보가 캡처됨
// → array를 직접 변형해도 item은 변하지 않음
// → 하지만 array를 깊이 변형하면 item이 변할 수 있음

// Alias: const y = identity(x)
// → y가 x 자체일 수 있음
// → y를 변형하면 x도 변할 수 있음
```

이 미묘한 차이를 구분하지 못하면, 컴파일러가 **같은 scope에 넣어야 할 것을 분리하거나**, **분리해야 할 것을 합쳐버립니다**. 그래서 17가지로 세분화한 것입니다.

**모든 것을 표현 가능한가?**

추론: 아닙니다. 그래서 `MaybeAlias`가 존재합니다. 시그니처를 모르는 함수 호출에 대해:

```js
// AliasingEffects.ts:96-107
// foo(x)가 무엇을 반환하는지 모를 때:
// 1. 새 값을 반환? 2. x를 캡처한 값? 3. x 자체?
// → MaybeAlias로 "불확실성"을 표현하고, 보수적으로 처리
```

표현 불가능한 것은 **보수적으로 처리**(더 넓은 scope로 묶거나 bailout)하는 것이 원칙입니다.

### 3-4. "잘못 설계된 React 앱에서 상자(scope)가 극단적으로 적을 수 있는가?"

**맞습니다. 그리고 컴파일러는 이를 감지하여 아예 scope를 제거(prune)합니다.**

`PruneAlwaysInvalidatingScopes.ts:17-26`의 주석이 정확히 이 상황을 설명합니다:

```js
// PruneAlwaysInvalidatingScopes.ts:17-26
/**
 * Some instructions will *always* produce a new value, and unless memoized
 * will *always* invalidate downstream reactive scopes. This pass finds such
 * values and prunes downstream memoization.
 */
```

구체적으로 `PruneAlwaysInvalidatingScopes.ts:42-53`:

```js
case 'ArrayExpression':
case 'ObjectExpression':
case 'JsxExpression':      // ← JSX도!
case 'JsxFragment':
case 'NewExpression': {
  if (lvalue !== null) {
    this.alwaysInvalidatingValues.add(lvalue.identifier);
    if (!withinScope) {
      this.unmemoizedValues.add(lvalue.identifier);  // scope 밖에서 새 객체 생성
    }
  }
```

그리고 `PruneAlwaysInvalidatingScopes.ts:90-113`:

```js
for (const dep of scopeBlock.scope.dependencies) {
  if (this.unmemoizedValues.has(dep.identifier)) {
    // 이 scope의 의존성이 "항상 무효화되는 값"이면
    // → scope 자체를 제거 (메모이제이션해봤자 매번 miss)
    return {
      kind: 'replace',
      value: {
        kind: 'pruned-scope',  // scope 제거!
        scope: scopeBlock.scope,
        instructions: scopeBlock.instructions,
      },
    };
  }
}
```

**극단적 예시:**

```jsx
// 잘못 설계된 코드: render마다 새 객체를 scope 밖에서 생성
function Bad({ data }) {
  const config = { theme: 'dark', lang: 'ko' }; // 매번 새 객체!
  const processed = transform(data, config);     // config이 매번 바뀌니 scope 무효화
  return <Display data={processed} />;           // processed도 매번 바뀌니 scope 무효화
}
```

컴파일러의 판단:
1. `config` → `ObjectExpression` → **항상 새 값** → `unmemoizedValues`에 추가
2. `processed`가 `config`에 의존 → scope가 매번 무효화 → **scope 제거(prune)**
3. JSX도 `processed`에 의존 → **연쇄적으로 scope 제거**

결과: 거의 모든 scope가 prune되어 **컴파일러가 적용되기 전과 동일한 코드**가 됩니다.

하지만 이것은 **컴파일러의 한계가 아니라 정확한 판단**입니다. 의미 없는 캐시 비교(`$[0] !== config`)를 제거함으로써 오히려 **불필요한 오버헤드를 방지**합니다.

### 3-5. "첫 계산에서는 무조건 if문을 통과하는가?"

**맞습니다. `REACT_MEMO_CACHE_SENTINEL` 값이 이를 보장합니다.**

`ReactFiberHooks.js:1231-1234`:

```js
let data = memoCache.data[memoCache.index];
if (data === undefined) {
  data = memoCache.data[memoCache.index] = new Array(size);
  for (let i = 0; i < size; i++) {
    data[i] = REACT_MEMO_CACHE_SENTINEL;  // 초기값: sentinel
  }
}
```

생성된 코드에서:

```js
const $ = _c(4);  // $[0], $[1], $[2], $[3] 모두 REACT_MEMO_CACHE_SENTINEL

// 첫 렌더:
if ($[0] !== y) {        // REACT_MEMO_CACHE_SENTINEL !== y → true!
  t0 = foo(false, y);   // 계산 실행
  $[0] = y;             // 의존성 저장
  $[1] = t0;            // 결과 저장
}

// 두 번째 렌더 (y가 안 바뀜):
if ($[0] !== y) {        // y !== y → false!
  // 건너뜀
} else {
  t0 = $[1];            // 캐시에서 반환
}
```

추론: 이것은 의도된 설계입니다. **초기 렌더에서는 어차피 모든 값을 계산해야 하므로** sentinel이 `!==`을 보장하는 것은 정확한 동작입니다. 첫 렌더의 추가 비용은 `$[0] !== SENTINEL` 비교 한 번뿐으로, 무시할 수 있는 수준입니다.

### 3-6. "JSX 메모이제이션 vs React.memo — 다른 것인가?"

**네, 완전히 다른 레벨에서 작동합니다.**

#### React.memo = Fiber 레벨 (런타임)

`ReactFiberBeginWork.js:549-557` (`updateSimpleMemoComponent`):

```js
// work loop이 이 fiber에 도착했을 때:
if (
  shallowEqual(prevProps, nextProps) &&  // props 얕은 비교
  current.ref === workInProgress.ref
) {
  didReceiveUpdate = false;              // → bailout! 컴포넌트 함수 호출 안 함
}
```

`React.memo`는 **이미 fiber에 도착한 후**, props를 비교하여 **컴포넌트 함수 호출 자체를 건너뜁니다**.

#### Compiler의 JSX 메모이제이션 = Element 참조 레벨 (빌드타임)

```jsx
// 입력
function Component({ name }) {
  return <Greeting name={name} />;
}

// 컴파일러 출력
function Component({ name }) {
  const $ = _c(2);
  let t0;
  if ($[0] !== name) {
    t0 = <Greeting name={name} />;  // 새 JSX Element 객체 생성
    $[0] = name;
    $[1] = t0;
  } else {
    t0 = $[1];                      // 이전 JSX Element 객체 재사용!
  }
  return t0;
}
```

컴파일러의 JSX 메모이제이션은 **`createElement` 호출 자체를 건너뛰어 같은 참조의 Element 객체를 반환**합니다.

#### 이것이 왜 중요한가?

`beginWork`의 판단 기준 (`ReactFiberBeginWork.js:4173`):

```js
if (oldProps !== newProps) {  // 참조 비교!
  didReceiveUpdate = true;
}
```

컴파일러가 JSX Element를 캐시하면, **부모가 리렌더링되어도 자식 Element의 참조가 동일**합니다. 그러면:

```
부모 리렌더링 → beginWork(자식 fiber)
  → oldProps === newProps (같은 Element 객체!)
  → didReceiveUpdate = false
  → bailout!  (React.memo 없이도!)
```

#### 차이 정리

```
작동 지점         React.memo                  Compiler JSX 캐시
──────────────  ─────────────────────────  ──────────────────────────
언제?           런타임 (work loop 중)       빌드타임 (코드 변환)
어디서?         beginWork (fiber 방문 시)   컴포넌트 함수 내부 (render 중)
비교 방식        shallowEqual(전체 props)   $[i] !== dep (개별 의존성)
효과            컴포넌트 함수 호출 건너뜀     createElement 호출 건너뜀
                                          → props 참조 유지
                                          → 결과적으로 자식 bailout 유발
상호 보완?       YES! 둘 다 적용 가능        Compiler가 있으면 memo 불필요한
                                          경우가 대부분
```

---

## 연결

| 대상 토픽 | 관계 | 근거 |
|-----------|------|------|
| `study/learn/React-리렌더링-트리거.md` | **전제 → 결과 (cascade의 근본 원인)** | "왜 리렌더링이 발생하는가"(트리거)를 알아야 "그 비용이 어느 정도인가"(이번 주제)를 논할 수 있음. 특히 `oldProps !== newProps` 참조 비교(BeginWork:4173)가 cascade의 근본 원인이고, 이것이 메모이제이션이 필요한 이유의 코드적 근거이며, Compiler가 JSX 참조 유지로 해결하는 지점 |
| `study/react/Lane-Model-And-Priority.md` | **비용 조절의 다른 축** | Lane 모델은 리렌더링의 **우선순위**를 결정하여 비용을 시간적으로 분산시키는 메커니즘. 메모이제이션이 "리렌더링 자체를 건너뛰는" 전략이라면, Lane은 "리렌더링을 언제 실행할지 조절하는" 전략 |


---

## 2026-02-26 (/learn)

## 2026-02-26 (via /learn)

Q1~Q3 (6개 서브질문 포함) 총 8개 질문을 통해 React 리렌더링 비용과 메모이제이션 전략을 소스코드 기반으로 분석.

**Q1**: 리렌더링 3단계 비용(함수실행→Reconciliation→DOM Commit), cascade가 핵심 문제, 메모이제이션 필요 이유(oldProps!==newProps), 디폴트 아니었던 이유(메모 자체 비용/deps 실수/구조적 해결 우선), React Compiler가 자동화한 메커니즘(dropManualMemoization→ReactiveScope→useMemoCache).

**Q2**: React Compiler 6단계 파이프라인 상세(lower→HIR, SSA, 효과추론 17종, ReactiveScope 4패스, codegen $[i] 패턴, useMemoCache 런타임). fixture 실증(simple.expect.md, useMemo-simple.expect.md).

**Q3**: (3-1) 정규화 100% 불가→bailout 시스템(throwTodo/invariant, ErrorCategory 20+종, try-catch→원본유지). (3-2) SSA 변수 O(N) 선형, 컴파일타임만. (3-3) 효과 17종(Mutate 5, DataFlow 6, Create 2, Apply 1, Special 3+), MaybeAlias로 불확실성. (3-4) 잘못된 앱→pruneAlwaysInvalidatingScopes가 무의미 scope 제거. (3-5) 첫 렌더: SENTINEL→무조건 계산(의도된 설계). (3-6) JSX캐시≠React.memo — JSX캐시는 createElement 건너뜀(참조유지), memo는 fiber에서 shallowEqual.

주요 소스: Pipeline.ts, CodegenReactiveFunction.ts, InferReactiveScopeVariables.ts, AliasingEffects.ts, PruneAlwaysInvalidatingScopes.ts, CompilerError.ts, Program.ts, ReactFiberBeginWork.js, ReactFiberHooks.js, ReactChildFiber.js
