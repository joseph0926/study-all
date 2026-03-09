---
title: "useState-useReducer-관계"
---
# useState-useReducer-관계

> 최초 질문: useMemo가 useCallback의 하나의 많이 사용되는 패턴을 훅으로 만든것처럼 useState도 useReducer의 패턴중 하나를 훅으로 만든게 맞나요?
> 일시: 2026-03-03

---

## Q1. useMemo가 useCallback의 하나의 많이 사용되는 패턴을 훅으로 만든것처럼 useState도 useReducer의 패턴중 하나를 훅으로 만든게 맞나요?

## 핵심 결론: 맞습니다. 다만 방향을 정정하면 더 정확합니다.

`useState`는 `useReducer`의 특화 패턴이 맞습니다. 다만, 비교 대상 쌍의 **방향**이 반대입니다:

- `useCallback`이 `useMemo`의 특화 패턴 (useMemo → useCallback)
- `useState`가 `useReducer`의 특화 패턴 (useReducer → useState)

---

### 비유: 범용 조리 도구 vs 특화 도구

| 비유 요소 | 실제 대응 |
|-----------|----------|
| 만능 칼 (어떤 재료든 자를 수 있음) | `useReducer` (어떤 reducer 함수든 받음) |
| 피자 커터 (원형 자르기에 특화) | `useState` (값 교체/함수 업데이트에 특화) |
| 만능 보관함 (뭐든 캐싱) | `useMemo` (함수 실행 결과 캐싱) |
| 함수 전용 보관함 (함수만 캐싱) | `useCallback` (함수 자체를 캐싱) |

만능 칼로 피자도 자를 수 있지만, 피자만 자를 거면 피자 커터가 편하듯 — `useReducer`로 단순 상태도 관리할 수 있지만, 단순 값 교체만 할 거면 `useState`가 편합니다.

---

### 코드 근거

**1) useState → useReducer 위임 (ref/ 소스)**

`ref/react/packages/react-reconciler/src/ReactFiberHooks.js:1251-1253`:
```js
function basicStateReducer<S>(state: S, action: BasicStateAction<S>): S {
  return typeof action === 'function' ? action(state) : action;
}
```

이것이 `useState`의 전부입니다. action이 함수면 `action(state)` 호출, 아니면 값 그대로 반환하는 **미리 정해진 reducer**입니다.

`ref/react/packages/react-reconciler/src/ReactFiberHooks.js:1936-1940`:
```js
function updateState<S>(initialState: (() => S) | S) {
  return updateReducer(basicStateReducer, initialState);
}
```

`updateState`는 `updateReducer`에 `basicStateReducer`를 넣어 **그대로 위임**합니다. `rerenderState`도 동일합니다 (`:1942-1945`).

마운트 시에도 동일한 구조 — `mountStateImpl`이 생성하는 `UpdateQueue`에 `lastRenderedReducer: basicStateReducer`를 설정합니다 (`:1915`).

**2) useCallback ↔ useMemo 관계 (ref/ 소스)**

`ref/react/packages/react-reconciler/src/ReactFiberHooks.js:2895-2899`:
```js
function mountCallback<T>(callback: T, deps): T {
  const hook = mountWorkInProgressHook();
  hook.memoizedState = [callback, nextDeps];  // 함수 자체를 저장
  return callback;
}
```

`ref/react/packages/react-reconciler/src/ReactFiberHooks.js:2916-2932`:
```js
function mountMemo<T>(nextCreate: () => T, deps): T {
  const hook = mountWorkInProgressHook();
  const nextValue = nextCreate();            // 함수를 실행하여 결과를 저장
  hook.memoizedState = [nextValue, nextDeps];
  return nextValue;
}
```

차이: `useMemo`는 `nextCreate()`를 **실행**하고, `useCallback`은 함수를 **그대로 보관**합니다. 즉 `useCallback(fn, deps)` ≡ `useMemo(() => fn, deps)`.

---

### 시각화: 두 쌍의 구조적 대칭

```
┌─────────────────────────────────────────────────────┐
│              범용 훅 → 특화 훅 패턴                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  useReducer(reducer, init)                          │
│       │                                             │
│       │  reducer를 basicStateReducer로 고정           │
│       ▼                                             │
│  useState(init)                                     │
│    = useReducer(basicStateReducer, init)             │
│                                                     │
│  ─────────────────────────────────────              │
│                                                     │
│  useMemo(createFn, deps)                            │
│       │                                             │
│       │  createFn을 () => fn 으로 고정                │
│       ▼                                             │
│  useCallback(fn, deps)                              │
│    = useMemo(() => fn, deps)                        │
│                                                     │
├─────────────────────────────────────────────────────┤
│  공통 패턴: 범용 훅의 인자 하나를 고정 → 특화 훅        │
└─────────────────────────────────────────────────────┘
```

---

## Q2. basicStateReducer가 다른곳에서도 쓰이나요? / useCallback은 함수의 참조를 저장하는 건가요?

### 1. basicStateReducer 분리 이유

6곳에서 사용됩니다:

| 위치 | 용도 |
|------|------|
| `:1915` | `mountStateImpl` — queue 초기화 |
| `:1939` | `updateState` — 업데이트 처리 |
| `:1945` | `rerenderState` — 리렌더 처리 |
| `:2003` | `mountFormState` 관련 |
| `:3303` | `useActionState` mount |
| `:3326` | `useActionState` mount |

여러 곳에서 **동일한 reducer를 참조**해야 하니 추출이 실용적입니다.

### 2. useCallback — 함수의 참조를 저장

네, JavaScript에서 함수는 객체이고, 변수에 함수를 할당하면 그 **객체의 참조(메모리 주소)**를 저장합니다.

```js
// useCallback
hook.memoizedState = [callback, nextDeps];    // 함수 객체의 참조를 저장

// useMemo
const nextValue = nextCreate();               // 함수를 실행
hook.memoizedState = [nextValue, nextDeps];   // 실행 결과값을 저장
```

---

## Q3. "참조를 저장한다"가 머릿속에 잘 안 그려집니다

### 비유 한계: "피자집 위치" ≠ 참조

피자집 비유의 문제 — 피자집에 갈 때마다 **새로운 피자를 만들어서** 줍니다. 참조는 그게 아닙니다.

### 정정된 비유

```
값을 저장 (원시값, useMemo)
→ 치즈 피자를 만들어서 냉장고에 넣어둔다
→ 꺼내면 그 피자 자체가 나온다

참조를 저장 (객체/함수, useCallback)
→ 치즈 피자를 만들어서 3번 테이블에 올려둔다
→ "3번 테이블"이라고 메모해둔다
→ 먹고 싶으면 3번 테이블로 가면 된다
→ 피자는 이미 거기 있다 (다시 만드는 게 아님)
```

| | 비유 | JS |
|---|---|---|
| **값** | 피자 자체를 들고 있음 | `42`, `"hello"` — 변수에 값이 직접 들어있음 |
| **참조** | 테이블 번호를 들고 있음 | `0x7f3a2b` — 변수에 메모리 주소가 들어있음 |

---

## Q4. 같은 참조를 바라본다 = 모두 3번 테이블을 바라본다 맞나요?

네, 정확합니다.

```
let fn = () => console.log("hi");

let a = fn;   // a → 3번 테이블
let b = fn;   // b → 3번 테이블
let c = fn;   // c → 3번 테이블

a === b  // true  (같은 테이블 번호니까)
b === c  // true
```

반대로 "참조가 다르다"는:

```
let fn1 = () => console.log("hi");
let fn2 = () => console.log("hi");  // 내용은 같지만 새로 만듦

fn1 === fn2  // false
```

내용이 똑같은 치즈 피자인데 하나는 **3번 테이블**, 하나는 **7번 테이블** — 테이블 번호가 다르니까 `===`는 `false`.

이게 `useCallback`이 해결하는 문제 — deps가 안 바뀌면 **기존 테이블 번호를 그대로 반환**.

---

## Q5. 저장된 참조를 사용함 = 3번 테이블에 가서 피자 먹음?

**"먹음"** 부분이 비유의 한계입니다. 피자를 먹으면 사라지지만, 참조를 사용해도 원본은 그대로 남아있습니다.

| 동작 | 비유 |
|------|------|
| 참조 저장 | 3번 테이블에 피자 올려두고, "3번"이라고 메모 |
| 참조 사용 | 3번 테이블에 가서 피자를 **시식** — 피자는 그대로 남아있음 |
| 참조 소멸 | 아무도 3번 테이블 메모를 안 갖고 있으면, 직원(GC)이 치워감 |

---

## Q6. useReducer의 작동 방식을 쉽게 설명해주세요

### 비유: 은행 창구

```
┌──────────┐    요청서(action)     ┌──────────┐    새 잔액(new state)
│          │ ──────────────────→  │          │ ──────────────────→  화면에 표시
│   고객    │   "입금 5만원"       │  은행원   │   100만 → 105만
│ (컴포넌트) │   "출금 3만원"       │ (reducer) │
│          │                     │          │
└──────────┘                     └──────────┘
  dispatch(action)              reducer(state, action)
```

| 비유 | 실제 |
|------|------|
| 통장 잔액 | `state` (현재 상태) |
| 요청서 | `action` (무엇을 할지 설명하는 객체) |
| 은행원 | `reducer` 함수 (요청서를 보고 잔액을 계산하는 규칙) |
| 창구에 요청서 제출 | `dispatch(action)` |

```js
function bankReducer(잔액, 요청서) {
  switch (요청서.type) {
    case '입금': return 잔액 + 요청서.amount;
    case '출금': return 잔액 - 요청서.amount;
  }
}

const [잔액, 창구제출] = useReducer(bankReducer, 1_000_000);
창구제출({ type: '입금', amount: 50_000 });
// → 은행원이 계산 → 1_050_000 → 리렌더
```

**고객은 잔액을 직접 수정하지 않습니다.** 항상 요청서를 제출하고, 은행원(reducer)이 규칙에 따라 계산합니다.

---

## Q7. 왜 직접 수정하지 않는 패턴? 불변성과 연관있나요?

맞습니다. **불변성과 직접적으로 연관**됩니다.

```
방법 A (직접 수정 허용 — 가변)
→ 통장 하나를 고객이 직접 수정함
→ 은행원: "뭐가 바뀐 거지?" 알 방법이 없음

방법 B (새 통장 반환 — 불변)
→ 은행원이 항상 새 통장을 발급함
→ 은행원: 이전 통장 ≠ 새 통장? → 바뀌었네 → 알림(리렌더)
```

소스 근거 — `ref/react/.../ReactFiberHooks.js:3671`:
```js
if (is(eagerState, currentState)) {
  // Fast path. We can bail out without scheduling React to re-render.
  return false;
}
```

직접 수정하면 `Object.is(state, state)` → 항상 true → React는 변화를 감지할 수 없음 → 버그.

---

## Q8. 고객이 직접 수정하고 알리는 패턴은 고려하지 않았을까요?

세 패턴 다 실제로 존재합니다:

```
패턴 A — React (은행원 경유): 요청서 제출 → 새 통장 발급 → 비교
패턴 B — Vue, MobX: 직접 수정 + 자동 감시 장치(Proxy)가 알림
패턴 C — 옛 Angular: 직접 수정 + 고객이 수동 알림
```

React가 패턴 A를 선택한 원래 이유는 **변화 감지 단순화**(Object.is 참조 비교만으로 충분)입니다.

이 불변 패턴이 이미 있었기에 나중에 동시성 렌더링(되감기/재처리)이 가능해졌지만, 동시성이 패턴 선택의 원인은 아닙니다 (Q9 정정 참조).

---

## Q9. 동시 렌더링 때문에 이 패턴을 사용한 건 역추론 아닌가요?

맞는 지적입니다. 순서를 정정하면:

| 시기 | 사건 |
|------|------|
| 2014 | Flux 아키텍처 (Facebook) |
| 2015 | Redux (reducer 패턴 대중화) |
| 2019 | useReducer (React 16.8 Hooks) |
| 2022 | Concurrent Rendering (React 18) |

```
원인 → 결과 (올바른 순서):

불변 패턴 채택 (변화 감지 단순화)
    → 업데이트가 자연스럽게 큐에 쌓이는 구조
    → 되감기/재처리가 가능한 구조가 됨
    → 동시성 렌더링 구현 가능해짐
```

---

## Q10. useReducer 흐름 확인 — 은행원 = reducer 함수

"은행원 = 리액트"보다는 **"은행원 = reducer 함수"**가 더 정확합니다.

```
고객(컴포넌트) → 요청서(action) → dispatch → 은행원(reducer) → 새 통장
                                                                  ↓
                                              은행 시스템(React): Object.is 비교
                                                                  ↓
                                              다르면 리렌더 / 같으면 무시
```

---

## Q11. Object.is 비교는 무조건 이루어지나?

아닙니다. 두 시점에서 발생하는데, 첫 번째는 조건부입니다.

**1) dispatch 시점 — 조건부 (eager bailout)**

큐가 비어있을 때만 (`alternate === null || alternate.lanes === NoLanes`, `:3650-3651`).

**2) 렌더 단계 — 항상** (`:1539`)

```
상황 A: 창구가 한가함 (큐 비어있음) → 즉시 비교 → bail out 가능
상황 B: 요청서 쌓여있음 → 즉시 비교 안 함 → 렌더 단계에서 전부 처리 후 비교
```

---

## Q12. 1차 방어막(여유있으면 Object.is) → 2차 방어막(무조건) 맞나요?

맞습니다.

```
dispatch 호출
    │
    ▼
[1차 방어막] 큐 비어있나? ── Yes ──→ Object.is 비교 ── 같으면 ──→ bail out (렌더 안 함)
    │                                    │
    No (대기 중인 게 있음)                 다르면
    │                                    │
    ▼                                    ▼
  렌더 스케줄링 ◄─────────────────────────┘
    │
    ▼
[2차 방어막] Object.is 비교 (항상)── 같으면 ──→ markWorkInProgressReceivedUpdate 안 함
                                   다르면 ──→ markWorkInProgressReceivedUpdate
```

---

## Q13. 정확히 뭘 Object.is 하나?

**이전 상태**와 **새 상태**를 비교합니다.

**1차 방어막** (`:3663-3671`):
```js
const currentState = queue.lastRenderedState;              // 이전 상태
const eagerState = lastRenderedReducer(currentState, action); // reducer 결과
if (is(eagerState, currentState)) { ... }
```

**2차 방어막** (`:1539`):
```js
if (!is(newState, hook.memoizedState)) { ... }
//       새 상태    이전 상태
```

---

## Q14. reducer 전후를 Object.is(얕은 비교)하는 거네요?

맞지만 정정 — **Object.is ≠ 얕은 비교**입니다. 참조 동일성(reference equality) 비교입니다.

```
Object.is({a: 1}, {a: 1})   // false (다른 객체)
shallowEqual({a: 1}, {a: 1}) // true  (프로퍼티 값이 같으니까)
```

| 비교 방식 | 보는 범위 | 사용처 |
|-----------|----------|--------|
| `Object.is` | 참조(주소)만 | `useState`, `useReducer` bail out |
| 얕은 비교 | 1단계 프로퍼티 | `React.memo`, `useSelector` |
| 깊은 비교 | 전체 중첩 구조 | React 내부에서 안 씀 |

---

## Q15. Object.is vs 얕은 비교 — 왜 Object.is?

### 비용 차이

```
Object.is(a, b)           → O(1) — 비교 1번
shallowEqual(a, b)        → O(n) — 프로퍼티 개수만큼 비교
```

### 추론: "어디서 멈출 것인가" (공식 근거 없음)

얕은 비교를 도입하면 "1단계는 잡는데 2단계는 못 잡는" 예측 불가능한 경계가 생김. Object.is는 규칙이 단순 — 같은 참조면 같고, 아니면 다르다.

### 추론: 책임 분리 (공식 근거 없음)

Object.is 방식은 개발자가 의도를 참조로 명시. 얕은 비교 방식은 프레임워크가 추측.

---

## Q16. 위 설명의 근거가 있나요?

웹 검색 + react.dev 문서 확인 결과, **공식 근거를 찾지 못했습니다**.

| 설명 | 상태 |
|------|------|
| O(1) vs O(n) 비용 차이 | **사실** (알고리즘 특성) |
| "몇 단계까지?" 경계 모호 | **추론** — 공식 근거 없음 |
| 책임 분리 | **추론** — 공식 근거 없음 |

공식 문서는 "Object.is로 비교하고, 같으면 리렌더를 건너뛴다. 따라서 객체/배열은 교체(replace)하라"는 사용법만 명시.

Sources: [react.dev — useState](https://react.dev/reference/react/useState)

---

## Q17. 전체 이해 정리

> useReducer는 컴포넌트에서 action - dispatch -> 정의된 규칙인 reducer 함수로 전달 -> reducer 적용 전/후 비교 (Object.is, 큐 비었을때만) false면 리렌더 -> 최종 렌더에서 Object.is 비교 -> 마찬가지로 false면 리렌더

정확한 이해입니다. Object.is가 false(다름)를 반환하면 리렌더.

---

## 연결

| 대상 토픽 | 관계 | 근거 |
|-----------|------|------|
| `study/src/topics/useRef-내부구현-패턴/note.md` | 동일 hook 인프라 | useState/useReducer/useRef 모두 `mountWorkInProgressHook()`으로 hook 노드를 생성하고 `memoizedState`에 값을 저장하는 동일 구조 |
| `study/learn/topics/React-리렌더링-트리거/note.md` | 인과 관계 | useState의 dispatch(`dispatchSetState`)와 useReducer의 dispatch(`dispatchReducerAction`)가 리렌더링을 트리거하는 경로 |
| `study/learn/topics/React-리렌더링-비용과-메모이제이션/note.md` | 상위 메커니즘 | useCallback의 참조 동일성 유지 → React.memo의 얕은 비교에서 bail out → 리렌더링 비용 절감 체인 |


---

## 2026-03-03 (via /learn)

useState는 useReducer의 특화 패턴 (basicStateReducer 고정), useCallback은 useMemo의 특화 패턴. 참조 개념 비유 (테이블 번호), useReducer 은행 창구 비유, 불변성과 Object.is 비교(1차 eager bailout + 2차 렌더 단계), Object.is vs 얕은 비교 설계 이유 (공식 근거 미발견). 17개 Q&A.
