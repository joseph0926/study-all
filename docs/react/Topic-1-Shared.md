# Topic 1: shared

> `/learn react` 세션 기록. 소스 코드 기반 Q&A 히스토리.

---

## 2026-02-19

### 학습 로드맵
- Step 1: ReactSymbols — 타입 식별 시스템
  - [x] 1.1: Symbol.for() 기반 타입 태그 상수 — React가 엘리먼트 종류를 구분하는 방법
  - [x] 1.2: getIteratorFn & ASYNC_ITERATOR — iterable/async children 지원
- Step 2: ReactTypes & ReactElementType — 공유 타입 정의
  - [ ] 2.1: ReactNode / ReactElement 핵심 타입 계층 — React가 다루는 모든 값의 타입
  - [ ] 2.2: Thenable / Wakeable / Usable — Suspense와 `use()` Hook의 기초 타입
  - [ ] 2.3: Context / Provider / Consumer 타입 — Context API 자료구조
- Step 3: objectIs & shallowEqual — 비교 알고리즘
  - [ ] 3.1: objectIs — Object.is 폴리필과 -0, NaN 특수 케이스
  - [ ] 3.2: shallowEqual — React.memo와 hooks deps 비교의 핵심
- Step 4: ReactFeatureFlags — 기능 플래그 시스템
  - [ ] 4.1: 플래그 분류 체계와 릴리스 채널 — __EXPERIMENTAL__, __PROFILE__
  - [ ] 4.2: forks/ 디렉토리 — 환경별(www, native, test) 플래그 오버라이드
- Step 5: SharedInternals & 유틸리티
  - [ ] 5.1: ReactSharedInternals — 패키지 간 내부 통신 채널
  - [ ] 5.2: getComponentNameFromType — Symbol 기반 컴포넌트명 추출
  - [ ] 5.3: DEV 유틸리티 — CheckStringCoercion, formatProdErrorMessage

### 학습 요약
- React는 `Symbol.for()`로 만든 고유 심볼 값을 사용해 엘리먼트/컴포넌트 종류를 식별한다. JSON 직렬화 불가능한 Symbol을 $$typeof에 사용하여 XSS를 방어하고, `Symbol.for()`의 전역 레지스트리로 다중 React 인스턴스 호환을 보장한다.
- React 19에서 REACT_ELEMENT_TYPE이 `'react.element'` → `'react.transitional.element'`로 변경되었다. ref가 별도 필드에서 props 안으로 이동(ref-as-prop)하면서, 옛 엘리먼트와 새 엘리먼트를 구분하는 버전 경계선 역할.
- $$typeof 체크는 **2단계**: (1) ReactChildFiber.js에서 `element.$$typeof`로 "React 엘리먼트인가" 판별, (2) ReactFiber.js에서 `element.type.$$typeof`로 "어떤 종류의 컴포넌트인가" 분류.
- `getIteratorFn`은 `Symbol.iterator` (또는 폴백 `'@@iterator'`)를 가진 객체에서 iterator 팩토리 함수를 추출한다. 배열, Iterable, AsyncIterable 자식은 모두 Fragment Fiber로 감싸져 처리된다.
- Generator 객체는 `[Symbol.iterator]() { return this; }`여서 재순회 불가능 → React가 경고. 단, GeneratorFunction 컴포넌트의 직접 자식은 예외(컴포넌트 재호출로 새 Generator 생성 가능).

### 소스 코드 경로
- `ref/react-fork/packages/shared/ReactSymbols.js:15-47` — 18개 Symbol 타입 태그 상수
- `ref/react-fork/packages/shared/ReactSymbols.js:49-65` — getIteratorFn, ASYNC_ITERATOR
- `ref/react-fork/packages/shared/ReactTypes.js` — 공유 Flow 타입 정의
- `ref/react-fork/packages/shared/ReactElementType.js:12-26` — ReactElement 타입
- `ref/react-fork/packages/react/src/jsx/ReactJSXElement.js:170-238` — ReactElement 팩토리 (REACT_ELEMENT_TYPE, ref-as-prop)
- `ref/react-fork/packages/react/src/jsx/ReactJSXElement.js:892-898` — isValidElement
- `ref/react-fork/packages/react-reconciler/src/ReactChildFiber.js:301-310` — REACT_LEGACY_ELEMENT_TYPE 가드 (버전 불일치 에러)
- `ref/react-fork/packages/react-reconciler/src/ReactChildFiber.js:737-773` — $$typeof 1단계 체크 (element → REACT_ELEMENT_TYPE, REACT_PORTAL_TYPE, REACT_LAZY_TYPE)
- `ref/react-fork/packages/react-reconciler/src/ReactChildFiber.js:775-787` — iterable 자식 감지 → Fragment 생성
- `ref/react-fork/packages/react-reconciler/src/ReactChildFiber.js:1375-1384` — reconcileChildrenIteratable (iteratorFn.call)
- `ref/react-fork/packages/react-reconciler/src/ReactChildFiber.js:1387-1408` — Generator 경고 로직
- `ref/react-fork/packages/react-reconciler/src/ReactFiber.js:642-664` — $$typeof 2단계 체크 (type.$$typeof → REACT_MEMO_TYPE, REACT_FORWARD_REF_TYPE 등)
- `ref/react-fork/packages/react/src/ReactMemo.js:25-29` — memo() 타입 디스크립터 생성
- `ref/react-fork/packages/react/src/ReactForwardRef.js:51-54` — forwardRef() 타입 디스크립터 생성

### Q&A 전체 기록

#### Step 1.1: Symbol.for() 기반 타입 태그 상수

**Q: React 19에서 엘리먼트 타입이 바뀌었습니다, 이 변경은 React 19의 ref-as-prop 변경과 관련됩니다 << 왜 바뀐건가요? ref-as-prop은 fowardRef 디프리케이트랑 연관이있나요?**

A: 네, 정확히 연관됩니다. React 19에서 `ref`의 위치가 변경되었습니다:

- React 18: `{ $$typeof: REACT_LEGACY_ELEMENT_TYPE, type, key, ref: refArg, props }` — ref가 별도 필드
- React 19: `{ $$typeof: REACT_ELEMENT_TYPE, type, key, props: { ...props, ref: refProp } }` — ref가 props 안으로

`ReactJSXElement.js:170-238`에서 실제 코드:

```js
function ReactElement(type, key, props, owner, debugStack, debugTask) {
  // ★ 핵심: ref 인자를 무시하고, props.ref를 진짜로 취급한다
  const refProp = props.ref;
  const ref = refProp !== undefined ? refProp : null;
  element = {
    $$typeof: REACT_ELEMENT_TYPE,  // 'react.transitional.element'
    type, key, ref, props,
  };
}
```

심볼 자체를 바꾼 이유는 **버전 호환성 가드** 때문입니다. `ReactChildFiber.js:301-310`에서 옛 React로 만든 엘리먼트가 들어오면 즉시 에러를 던집니다:

```js
if (newChild.$$typeof === REACT_LEGACY_ELEMENT_TYPE) {
  throw new Error('A React Element from an older version of React was rendered...');
}
```

심볼 값 자체가 버전 경계선 역할을 합니다. React 18 라이브러리의 엘리먼트(`'react.element'`)가 React 19 reconciler에 들어오면, ref 위치가 달라서 조용히 버그가 나는 대신 명확한 에러를 던집니다.

---

**Q: 제가 당신의 설명을 듣고 유추해봤을때는, "$$typeof 필드에 사용 — 이 객체가 React 엘리먼트인가?" << 이게 코드적으로 가드가 되어있을거같습니다. 해당 심볼의 값을 확인한다던지? 근데 $$typeof 필드에 "어떤 래퍼 타입인가?" << 이거면 아마도 내부적으로 "이 객체가 React 엘리먼트 이면서 xx한 래퍼 타입인가?"를 내포하고있을거같습니다. 하지만 심볼을 중첩객체처럼 두가지 상태를 표현하지는 못할거같은데, 그러면 가드 코드가 어떻게되는겁니까?**

A: 유추가 정확합니다. 핵심은 $$typeof가 **한 객체에 하나**가 아니라, **두 겹의 객체에 각각 하나씩** 있다는 것입니다.

`React.memo(MyComponent)`를 JSX에서 쓰면 **두 겹의 객체**가 만들어집니다:

```js
// 1단계: memo()가 "타입 디스크립터" 객체를 만듦 (ReactMemo.js:25-29)
const MemoComp = React.memo(MyComponent);
// MemoComp = { $$typeof: REACT_MEMO_TYPE, type: MyComponent, compare: null }

// 2단계: JSX가 "엘리먼트" 객체를 만듦
<MemoComp foo="bar" />
// → {
//     $$typeof: REACT_ELEMENT_TYPE,     ← 1단계 체크 대상
//     type: {                            ← 2단계 체크 대상
//       $$typeof: REACT_MEMO_TYPE,
//       type: MyComponent,
//       compare: null
//     },
//     props: { foo: "bar" },
//   }
```

- **1단계 체크** (ReactChildFiber.js:737): `element.$$typeof` — "React 엘리먼트 맞나?"
- **2단계 체크** (ReactFiber.js:642): `element.type.$$typeof` — "어떤 종류의 컴포넌트인가?"

심볼 하나에 두 상태를 넣는 게 아니라, **서로 다른 깊이의 $$typeof를 2번 체크**하는 구조입니다:
```
element.$$typeof → REACT_ELEMENT_TYPE (1단계 통과)
element.type.$$typeof → REACT_MEMO_TYPE (2단계에서 Memo로 분류)
```

비유: 공항 보안 검색의 (1) 탑승권 확인 → (2) 게이트 분류.

---

#### Step 1.2: getIteratorFn & ASYNC_ITERATOR

**Q: "이 객체가 순회 가능한지"를 판별 << 왜 객체가 순회 가능한지 판단합니까?**

A: React의 children은 단일 값, 배열, 또는 **어떤 iterable이든** 올 수 있기 때문입니다.

```jsx
<ul>{[<li/>, <li/>, <li/>]}</ul>        // 배열
<ul>{new Set([<li/>, <li/>])}</ul>      // Set도 iterable
```

reconciler가 children을 처리할 때, "하나의 자식으로 처리할지, 여러 자식으로 펼쳐서 처리할지"를 결정해야 합니다. 순회 가능하면 하나씩 꺼내서 각각 Fiber로 만듭니다.

---

**Q: 접두사 MAYBE_와 FAUX_는 왜 붙인걸까요? FAUX는 제가 뜻을 모르지만 당신이 말해준걸보면 폴백 관련인거같은데, MAYBE는 왜 "아마도"라는 불확실성을 접두사로 붙인지 모르겠습니다**

A: **FAUX**: 프랑스어로 "가짜"라는 뜻. `'@@iterator'`는 Symbol이 없던 시절의 관례적(가짜) iterator 프로토콜.

**MAYBE_**: `Symbol.iterator`가 모든 환경에 존재하는 게 아니기 때문. `MAYBE_ITERATOR_SYMBOL = Symbol.iterator`에서 오래된 환경이면 `undefined`가 됨. "이 변수에 iterator 심볼이 들어있을 수도 있고 아닐 수도 있다"는 뜻. 현대 환경에서는 항상 존재하지만, 코드 작성 당시의 방어적 코딩 흔적.

---

**Q: 이전 어떤 학습에서 js임에도 `maybeIterable: ?any` 타입스크립트처럼 쓸수있는 이유가 flow라는 문법?때문이라고 들었습니다. 그러면 저 코드는 만약 타입스크립트였다면 `maybeIterable?: any`를 뜻하는건가요? -> 근데 그러면 `?() => ?Iterator<any>`는 뭘 의미하는지 잘 모르겠습니다**

A: Flow 문법이 맞지만, TypeScript의 `?:`와는 **다른 의미**입니다. Flow에서 `?T`는 **nullable type** = `T | null | void`:

```
Flow                          TypeScript 대응
─────────────────────────────────────────────
?any                          any | null | undefined
?() => ?Iterator<any>         (() => Iterator<any> | null | undefined) | null | undefined
```

분해: `?() => ?Iterator<any>` → 함수 자체가 nullable(null일 수 있음) + 반환값도 nullable(Iterator 또는 null). 즉 `getIteratorFn`은 "iterator 팩토리 함수를 반환하거나, null을 반환한다."

---

**Q: `typeof maybeIterable !== 'object'` < 이건 원시타입이 아님을 검증하는건가요?**

A: 맞습니다. 다만 정확히는:

| typeof 결과 | 예시 | 결과 |
|---|---|---|
| `'number'` | 42 | 걸러짐 |
| `'string'` | 'hello' | 걸러짐 |
| `'boolean'` | true | 걸러짐 |
| `'function'` | () => {} | 걸러짐 ★ |
| `'object'` | {}, [] | 통과 |
| `'object'` | null | 통과하지만 위에서 null 체크로 걸러짐 |

함수도 걸러지는 게 포인트. `[Symbol.iterator]`를 가진 것은 객체뿐이니까요.

---

**Q: `(MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL]) || maybeIterable[FAUX_ITERATOR_SYMBOL]` << 이 라인대로라면 `MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL]` < 이건 boolean을 반환하지 않나요?**

A: **아닙니다.** JavaScript의 `&&`와 `||`는 boolean이 아니라 **실제 값을 반환**합니다.

- `A && B`: A가 truthy면 → B를 반환, A가 falsy면 → A를 반환
- `A || B`: A가 truthy면 → A를 반환, A가 falsy면 → B를 반환

풀어쓰면:
```js
let maybeIterator;
if (MAYBE_ITERATOR_SYMBOL) {  // Symbol.iterator가 존재하는 환경
  maybeIterator = maybeIterable[MAYBE_ITERATOR_SYMBOL];  // → iterator 함수 또는 undefined
}
if (!maybeIterator) {  // 없으면 폴백
  maybeIterator = maybeIterable[FAUX_ITERATOR_SYMBOL];  // → '@@iterator' 메서드 또는 undefined
}
```

최종적으로 `maybeIterator`에는 함수(iterator 팩토리) 또는 undefined가 들어감. 그래서 아래에서 `typeof maybeIterator === 'function'`으로 재확인.

---

**Q: Symbol.iterator는 getIteratorFn를 거쳐서 리턴/export되는데, 왜 Symbol.asyncIterator는 그냥 export 하나요?**

A: `getIteratorFn`이 래퍼 함수인 이유는 `'@@iterator'` 폴백 로직 때문. `Symbol.asyncIterator`는 폴백이 필요 없음 — async iteration은 Symbol보다 나중에 나온 기능이라 Symbol.asyncIterator가 없으면 async iteration 자체가 불가능. 폴백 로직이 없으니 래퍼가 불필요하고, 호출부에서 인라인으로 체크:
```js
typeof newChild[ASYNC_ITERATOR] === 'function'
```

---

**Q: 왜 Fragment Fiber로 감싸서 처리하나요?**

A: Fiber 트리는 각 노드가 하나의 Fiber인 트리 구조. 형제는 `sibling` 포인터로 연결. 배열/iterable은 여러 자식을 한 묶음으로 표현하므로 Fiber 트리에 넣으려면 하나의 부모 노드가 필요. Fragment가 그 역할 — DOM에는 아무것도 렌더링하지 않으면서 Fiber 트리의 부모 역할:

```
ul (HostComponent)
  │
  Fragment (배열을 감싸는 가상 노드)
    │
    li "A" → sibling → li "B"
```

---

**Q: 왜 .call(newChildrenIterable)로 호출하면 실제 Iterator 객체를 얻나요?**

A: Iterator 프로토콜 동작 방식 때문. `getIteratorFn`은 `[Symbol.iterator]` **메서드 자체**(팩토리 함수)를 반환. 이 메서드는 `this`를 사용해서 Iterator를 만듦. 메서드가 객체에서 분리되어 반환되므로 `this`를 잃어버림 → `.call(newChildrenIterable)`로 원래 객체를 `this`로 다시 바인딩.

```js
const arr = [1, 2, 3];
const fn = getIteratorFn(arr);       // fn === Array.prototype[Symbol.iterator]
const iterator = fn.call(arr);       // this=arr로 호출 → Iterator 반환
// arr[Symbol.iterator]()와 동일
iterator.next(); // { value: 1, done: false }
```

---

**Q: "Generator는 [Symbol.iterator]() { return this; }여서 iterator === iterable입니다. 리렌더링 시 다시 순회할 수 없으므로 React가 경고합니다. 단, GeneratorFunction 컴포넌트의 직접 자식인 경우는 예외" < 하나도 이해못했습니다**

A: 처음부터 단계별로 설명:

**1단계: Generator 함수 vs Generator 객체**
```js
function* numberGen() { yield 1; yield 2; yield 3; }  // Generator "함수"
const gen = numberGen();  // Generator "객체" — next()로 하나씩 꺼냄
gen.next(); // { value: 1, done: false }
gen.next(); // { value: 2, done: false }
gen.next(); // { value: 3, done: false }
gen.next(); // { value: undefined, done: true } ← 끝, 되돌릴 수 없음
```

**2단계: 배열은 재순회 가능, Generator는 불가능**
```js
const arr = [1, 2, 3];
for (const x of arr) {}  // 순회 가능
for (const x of arr) {}  // 또 순회 가능 ✅

const gen = numberGen();
for (const x of gen) {}  // 순회 가능
for (const x of gen) {}  // 아무것도 안 나옴 ❌
```

**3단계: iterator === iterable 의미**

배열: `arr[Symbol.iterator]()` → **새 Iterator** 생성 (arr !== iterator)
Generator: `gen[Symbol.iterator]()` → **자기 자신** 반환 (`gen === gen[Symbol.iterator]()`)

Generator의 `[Symbol.iterator]`가 `return this`를 하기 때문. 새 Iterator를 만들지 않으므로 재순회 불가능.

**4단계: React에서의 문제**

React는 리렌더링 시 children을 다시 순회해야 함. Generator를 children으로 전달하면 첫 렌더링에서 소진되어 리렌더링 시 빈 결과 → React가 `iterator === iterable`을 감지하면 경고.

**5단계: GeneratorFunction 컴포넌트 예외**
```jsx
function* MyList() { yield <li>A</li>; yield <li>B</li>; }
<MyList />
// React가 MyList()를 호출 → 새 Generator 객체 생성
// 리렌더링 시 MyList()를 다시 호출 → 또 새 Generator 생성 → OK ✅
```

`ReactChildFiber.js:1393-1398`에서 부모가 GeneratorFunction이고 자식이 Generator이면 경고를 건너뜀 — 컴포넌트 재호출로 매번 새 Generator를 만들 수 있으니까.

### 연결 토픽
- **ReactTypes (Step 2)**: ReactSymbols의 심볼들이 실제 타입 정의에서 어떻게 사용되는지
- **React.memo / shallowEqual (Step 3)**: REACT_MEMO_TYPE 심볼을 사용하는 memo의 내부 비교 알고리즘
- **Fiber Structure (Topic 4)**: $$typeof 2단계 체크 후 생성되는 Fiber 노드의 구조
- **Reconciliation (Topic 6)**: ReactChildFiber.js의 전체 자식 재조정 알고리즘

---
