# JSX-객체-반환-원리

> 최초 질문: jsx는 왜 객체를 반환할까요? (어떤 원리로 객체를 반환하냐?도 궁금하지만 여러 선택지중 왜 객체였을까?가 더 궁금합니다)
> 일시: 2026-02-25

---

## Q1. jsx는 왜 객체를 반환할까요? (어떤 원리로 객체를 반환하냐?도 궁금하지만 여러 선택지중 왜 객체였을까?가 더 궁금합니다)

### 비유: 건축 설계 도면 vs 건물

| 비유 요소 | 실제 개념 | 대응 이유 |
|-----------|----------|----------|
| 설계 도면 (종이) | ReactElement (plain object) | 건물 자체가 아닌, 건물의 **서술(description)** |
| 도면의 항목들 (용도, 재료, 치수) | `{ type, key, props }` | 무엇을(type), 어떻게(props) 만들지를 **데이터로** 기술 |
| 건축가 | React 렌더러 (react-dom, react-native 등) | 도면을 받아 **실제로 짓는** 주체 |
| 도면의 표준 규격 인증 마크 | `$$typeof: Symbol.for('react.transitional.element')` | 이 도면이 정식 도면인지 **위조 방지** 검증 |
| 도면을 여러 시공사에게 전달 가능 | 하나의 element를 react-dom, react-native 등 다양한 렌더러가 소비 | 도면(data)과 시공(rendering)의 **분리** |

핵심: JSX는 건물(DOM)을 직접 만드는 것이 아니라, **건물을 어떻게 만들지 서술한 도면을 만든다**. 도면이 종이(plain object)인 것은 누구나 읽을 수 있고, 복사/비교/전달이 쉽기 때문이다.

### 메커니즘: JSX → 컴파일러 → 함수 호출 → 객체

JSX는 컴파일 타임에 함수 호출로 변환된다:

```jsx
// JSX
<div className="hello">world</div>

// 컴파일러 출력 (modern transform)
jsx('div', { className: 'hello', children: 'world' })
```

`jsx()` 함수가 반환하는 것이 ReactElement 객체. 실제 소스:

`ref/react-fork/packages/react/src/jsx/ReactJSXElement.js:170-237` — `ReactElement` 팩토리:

```js
function ReactElement(type, key, props, owner, debugStack, debugTask) {
  element = {
    $$typeof: REACT_ELEMENT_TYPE,
    type,
    key,
    ref,
    props,
  };
  return element;
}
```

### 왜 여러 선택지 중 "plain object"였는가?

#### 대안 A: DOM 노드 직접 반환

- DOM 노드는 mutable하고 stateful. 비교(diffing)가 어렵고, 직렬화/역직렬화 불가. 브라우저 환경에 종속되어 react-native 등 다중 렌더러를 지원할 수 없음.

#### 대안 B: HTML 문자열 (Template Strings)

- XSS 보안 위험. 이벤트 핸들러 연결 불가(`onClick={fn}`을 문자열로 표현 불가). 비교/재사용 불가(파싱 필요). 타입 정보 소실.

#### 대안 C: 클래스 인스턴스 (`new ReactElement(...)`)

`ReactJSXElement.js:162-168`의 주석:
> "Factory method to create a new React element. This **no longer adheres to the class pattern**, so do not use new to call it. Also, **instanceof check will not work**."

- 클래스 인스턴스는 prototype chain이 있어 직렬화/역직렬화가 복잡(Server Components 전송 시 문제). `instanceof` 검사는 여러 React 버전 공존 시 깨짐. 대신 `$$typeof` Symbol로 검증.

#### 최종 선택: Plain Object — 이유 5가지

1. **렌더러 독립성**: reconciler(`ReactChildFiber.js:737-738`)는 `$$typeof` switch로 element를 소비. DOM API 의존 없음.
2. **비교 용이성**: 객체는 `===`로 동일 참조인지, `type`과 `key`로 같은 종류인지 즉시 판별.
3. **직렬화 가능**: React Server Components에서 서버→클라이언트 전송 시 JSON 직렬화가 자연스러움.
4. **함수형 합성의 자연스러운 매개체**: react-basic의 핵심 전제 "UIs are simply a projection of data into a different form of data."
5. **최소 API 표면적**: Sebastian Markbage의 설계 철학. 메서드도, prototype도, 마법도 없는 가장 명시적이고 최소한의 추상화.

### 시각화

```
 JSX 코드                 컴파일러              ReactElement (plain object)
┌─────────────────┐     ┌────────┐     ┌──────────────────────────────────┐
│ <MyBtn color=   │     │ Babel  │     │ {                                │
│   "blue">       │ ──→ │ / SWC  │ ──→ │   $$typeof: Symbol(react.elem), │
│   Click         │     │        │     │   type: MyBtn,                   │
│ </MyBtn>        │     └────────┘     │   key: null,                     │
└─────────────────┘                    │   props: {                       │
                                       │     color: "blue",               │
                                       │     children: "Click"            │
                                       │   }                              │
                                       │ }                                │
                                       └──────────┬───────────────────────┘
                                                  │
                    ┌─────────────────────────────┼──────────────────────┐
                    ▼                             ▼                      ▼
              react-dom                    react-native          react-test-renderer

 대안 비교:
 ┌────────────────────┬────────────┬───────────┬──────────┬──────────────┐
 │                    │ Plain Obj  │ DOM Node  │ String   │ Class Inst   │
 ├────────────────────┼────────────┼───────────┼──────────┼──────────────┤
 │ 렌더러 독립        │     ✓      │     ✗     │    ✗     │      ✓       │
 │ 비교 용이 (diff)   │     ✓      │     ✗     │    ✗     │      ✓       │
 │ 직렬화 (RSC)       │     ✓      │     ✗     │    ✓     │      ✗       │
 │ 이벤트 핸들러      │     ✓      │     ✓     │    ✗     │      ✓       │
 │ XSS 안전           │     ✓      │     ✓     │    ✗     │      ✓       │
 │ instanceof 안전    │     ✓      │     ✗     │    ✓     │      ✗       │
 │ Object.freeze 가능 │     ✓      │     ✗     │    ✗     │      △       │
 │ 최소 오버헤드       │     ✓      │     ✗     │    ✓     │      ✗       │
 └────────────────────┴────────────┴───────────┴──────────┴──────────────┘
```

---

## Q2. 그럼 최적화를 위해 참조를 동일하게한다 — 이것은 element 객체의 참조를 동일하게 만드는건가요?

element 객체의 참조가 아니라, **`props` 객체의 참조**이다.

### 흐름

1. 부모가 리렌더 → `jsx()` 재실행 → **새 element** 생성 (무조건)
2. reconciler가 `element.props`를 꺼내 fiber의 `pendingProps`로 전달 (`ReactChildFiber.js:616`)
3. `beginWork`에서 **props 참조 비교** (`ReactFiberBeginWork.js:4170-4174`):

```js
const oldProps = current.memoizedProps;
const newProps = workInProgress.pendingProps; // = element.props

if (oldProps !== newProps) {
  didReceiveUpdate = true;  // → 리렌더
}
```

### 일반 컴포넌트 vs React.memo 컴포넌트

- **일반 컴포넌트**: `oldProps !== newProps` (O(1), 참조 비교). jsx()가 매번 새 객체를 만들므로 항상 true → 항상 리렌더.
- **React.memo 컴포넌트**: `shallowEqual(prevProps, nextProps)` (O(n), 각 값 `===` 비교). props의 각 값이 같은 참조면 bailout.

### memo의 비용 두 가지

1. **비교 비용** (런타임, 매 렌더마다): `Object.keys()` × 2 + props 수만큼 `is()` 비교
2. **메모이제이션 비용** (메모리): useCallback/useMemo가 클로저 + deps 배열 보관, 이전 memoizedProps도 GC 되지 않고 유지

---

## Q3. 부모가 리렌더되면 → jsx() 함수가 재실행 → 객체 새로 생성됨. 맞나요?

맞다.

```
부모 함수 재실행 → return <Child value={1} />
                → 컴파일 후: jsx(Child, { value: 1 })  ← 함수 호출
                → ReactElement { $$typeof, type, props }  ← 새 객체
```

JS 언어 차원에서 `{ ... }` 리터럴은 실행될 때마다 새 참조를 만드는 것이 기본 동작. React 특유의 현상이 아니라 JS의 당연한 동작이다.

---

## Q4. 그러면 memo를 쓰던 안쓰던 반환하는 객체는 무조건 새로 생성되는거고, memo로 래핑하면 객체 동일 키를 비교하여 다른게 하나라도 있으면 리렌더 / memo 래핑이 아니라면 그냥 oldProps === newProps인거죠?

맞다.

```
부모 리렌더 → jsx() 실행 → 새 element 객체 (무조건)
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
              일반 컴포넌트            React.memo 컴포넌트
          oldProps !== newProps      shallowEqual(old, new)
          → 항상 true → 리렌더      → 각 값 === 비교 → 다르면 리렌더
```

---

## Q5. old에만 있거나, new에만 있는 값이 있으면 어떻게 되나요?

`shallowEqual.js:32-48`:

```js
const keysA = Object.keys(objA);
const keysB = Object.keys(objB);

if (keysA.length !== keysB.length) {  // 키 개수 다르면 즉시 false
  return false;
}

for (let i = 0; i < keysA.length; i++) {
  const currentKey = keysA[i];
  if (
    !hasOwnProperty.call(objB, currentKey) ||  // A에만 있는 키 체크
    !is(objA[currentKey], objB[currentKey])
  ) {
    return false;
  }
}
```

키 개수가 다르거나, 한쪽에만 있는 키가 있으면 **항상 리렌더**된다.

---

## Q6. memo 컴포넌트에 넘기는 함수는 useCallback으로 감싸는 이유가 oldProps.someFn === newProps.someFn이 되도록하는거죠?

맞다. `shallowEqual`에서 `is(objA[currentKey], objB[currentKey])`로 함수도 `===` 비교하는데, JS에서 함수는 객체이므로 같은 참조여야만 `true`. `useCallback`은 deps가 바뀌지 않는 한 이전 함수 참조를 그대로 반환하여 이 비교를 통과시킨다.

---

## Q7. 함수가 아니라 그냥 참조타입도 동일한가요? (배열, 객체 등)

동일하다. `shallowEqual`의 `is()`는 내부적으로 `===`이므로 모든 참조 타입에 같은 규칙이 적용된다.

```
원시값:  1 === 1                    → true  (값 비교)
문자열:  "abc" === "abc"            → true  (값 비교)
함수:    (() => {}) === (() => {})  → false (참조 비교)
배열:    [1,2] === [1,2]           → false (참조 비교)
객체:    {a:1} === {a:1}           → false (참조 비교)
```

`shallowEqual`이 "shallow"인 이유가 바로 이것. 1단계 값만 `===`로 비교하고, 안의 내용물까지 재귀적으로 들어가지 않는다.

---

## Q8. 중첩객체이고 중첩된 값이 바뀌면 어떻게되나요? oldProps.someObj = {a: {b: 1}, c: 2} → newProps.someObj = {a: {b: 0}, c: 2}

`shallowEqual`은 1단계만 보므로, 같은 참조의 중첩 객체를 mutation하면 **변경을 감지하지 못한다**.

```
mutation:        obj.a.b = 0          → 같은 참조 → shallowEqual 통과 → 변경 감지 실패
불변 업데이트:   { ...obj, a: { ...obj.a, b: 0 } }  → 새 참조 → shallowEqual 실패 → 리렌더
```

이것이 React에서 불변성(immutability)을 지켜야 하는 이유. shallowEqual 기반 bailout 메커니즘이 정상 작동하기 위한 전제 조건이다.

---

## Q9. 그러면 memo로 래핑된 하위 컴포넌트에서 {a.b}의 값을 0으로 기대했는데 1이 나오는 경우가 생기겠네요

맞다. mutation으로 중첩 값을 변경하면, 같은 참조이므로 shallowEqual이 통과 → 자식은 리렌더 안 됨 → **UI와 상태의 불일치**가 발생한다.

---

## Q10. 불변 업데이트 → 다시 useMemo → props 넘기기보다는 그냥 useMemo로 안감싸는게 더 맞는 패턴일까요? (중첩 객체 한정)

맞다. 중첩 객체가 state 자체라면 useMemo는 불필요하다.

```jsx
function Parent() {
  const [config, setConfig] = useState({ a: { b: 1 }, c: 2 });

  const handleClick = () => {
    setConfig(prev => ({ ...prev, a: { ...prev.a, b: 0 } }));
    // 불변 업데이트 → 새 참조 → 이것 자체가 새 state
  };

  // config는 이미 state → 바뀌면 새 참조, 안 바뀌면 같은 참조
  // useMemo로 감쌀 이유가 없음
  return <MemoChild config={config} />;
}
```

`useState`의 불변 업데이트가 이미 "바뀌면 새 참조, 안 바뀌면 같은 참조"를 보장하기 때문에, useMemo가 하는 일을 state가 대신한다.

---

## 연결

| 대상 토픽 | 관계 | 근거 |
|-----------|------|------|
| `study/react/legacy/React-Core-API.md` Step 1 | **동일 주제 심화** | ReactElement의 구조(`$$typeof`, `type`, `key`, `props`)를 학습했으며, 본 세션은 "왜 그 구조가 객체인가"의 설계 근거를 다룸 |
| `study/react/legacy/Fiber-Structure.md` Step 1 | **하위 소비자** | ReactElement(plain object)는 reconciler에서 `createFiberFromElement`를 통해 Fiber 노드로 변환됨. 도면(element)→작업 단위(fiber)의 관계 |
| `study/learn/React-리렌더링-트리거.md` | **인과 관계** | 부모의 리렌더 시 `createElement(Child, { ... })`가 새 props 객체를 매번 생성하여 `!==` 비교에 의해 자식이 리렌더됨 — plain object의 referential equality 특성이 리렌더링 메커니즘의 전제 |


---

## 2026-02-25 (via /learn)

## 2026-02-25 세션 요약

JSX가 왜 plain object를 반환하는지 설계 근거를 학습. 4가지 대안(DOM 노드, 문자열, 클래스 인스턴스, plain object) 비교 후 plain object가 선택된 이유(렌더러 독립성, 비교 용이성, 직렬화 가능, 함수형 합성, 최소 API 표면적)를 소스 코드 기반으로 분석. 이어서 memo/shallowEqual 기반 bailout 메커니즘에서 "참조 동일성"이 element가 아닌 props 객체(및 개별 값) 수준임을 확인. shallowEqual의 1단계 비교 한계, 중첩 객체에서 불변성이 필요한 이유, useState가 이미 참조 관리를 해주므로 중첩 객체 state에는 useMemo가 불필요한 패턴까지 다룸. Q&A 10개.
