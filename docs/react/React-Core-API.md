# React Core API Surface

> `/learn react` 세션 기록. 소스 코드 기반 Q&A 히스토리.

---

## 병합 정리 기준 (Q&A 원문 보존)

- plan 매핑: `docs/react/plan.md`의 Topic 1 (`react`)
- 진실 원천:
  - `ref/react-fork/packages/react/`
  - `ref/react.dev/src/content/reference/react/`
- 중복 범위 병합 규칙:
  - Symbol/iterator/objectIs/shallowEqual의 기초 정의는 `docs/react/Shared.md`를 기준으로 사용
  - 본 문서는 API surface, Hook 진입점, Client/Server 차이, Children 흐름을 기준으로 유지
  - Fiber 자료구조/Work Loop 상세는 각각 `docs/react/Fiber-Structure.md`, `docs/react/Work-Loop.md`를 기준으로 사용
- 원문 보존 정책: 아래 날짜별 Q&A 기록은 삭제/요약하지 않고 유지

---

## 2026-02-11

### 학습 로드맵

- [x] Step 1: ReactElement & $$typeof
- [x] Step 2: SharedInternals & Dispatcher 패턴
- [x] Step 3: Hooks API 선언부
- [x] Step 4: Client vs Server API 분리
- [x] Step 5: HOC 유틸리티
- [x] Step 6: cache & Transitions

### 학습 요약

React 패키지의 Core API Surface 중 ReactElement, $$typeof 패턴, SharedInternals & Dispatcher 패턴, Hooks API 선언부를 소스 코드 기반으로 학습.
Element는 `{ $$typeof, type, key, ref, props }` 형태의 불변 plain object이며,

$$
typeof에 Symbol.for()를 사용하여 JSON 직렬화 불가능한 특성으로 XSS 인젝션을 방어한다.
jsx()와 createElement()는 같은 ReactElement()를 호출하지만, jsx()는 컴파일러 타겟으로 props 객체 재사용 최적화가 가능하다.
ReactSharedInternals는 H/A/T/S/G 5개 슬롯을 가진 싱글턴 객체로, react 패키지와 렌더러(react-dom 등) 사이의 브릿지 역할을 한다.
H 슬롯은 Hooks Dispatcher, A 슬롯은 AsyncDispatcher(캐시+owner 추적)를 담으며,
렌더러가 컴포넌트 호출 직전에 슬롯을 주입하는 "의존성 역전" 구조다.
단일 객체로 통합(flatten)한 이유는 PR #28783 근거로: Dispatcher 구조 전면 개편(async 컴포넌트 owner 추적)을 위한 사전 작업 + 서드파티 내부 의존성 차단이 주 목적이며, 번들 크기 절감은 부차적 효과(-0.76kB)였다.
ReactHooks.js의 22개 Hook은 전부 `resolveDispatcher()` → `dispatcher.useXxx()` 위임 패턴을 따르며, 실제 로직은 없다.
Dispatcher 인터페이스는 react-reconciler가 소유하고(ReactInternalTypes.js:397-457), 렌더러가 렌더링 단계에 따라 H 슬롯에 Mount/Update/ContextOnly Dispatcher를 교체 주입한다.
렌더링 완료 후 H는 ContextOnlyDispatcher로 교체되며, 이 Dispatcher의 모든 Hook 메서드는 throwInvalidHookError()를 실행하여 "컴포넌트 밖에서 Hook 호출 불가" 규칙을 강제한다.
Server API(ReactServer.js)는 Client API(ReactClient.js)의 엄격한 서브셋이며, 서버에서 허용되는 Hook은 5개(use, useId, useCallback, useMemo, useDebugValue)뿐이다.
서버에서 빠지는 것들은 "설계상 빠진" 것이 아니라 서버 렌더링의 실행 모델(단일 패스, DOM 없음, 상태 없음)에서 물리적으로 동작 불가능한 것들이다.
SharedInternals도 서로 다르다: Client는 5슬롯(H/A/T/S/G), Server는 2슬롯(H/A) + TaintRegistry(민감 데이터 직렬화 방지 보안 장치).
cache()는 서버에서는 진짜 per-request 캐싱, 클라이언트에서는 no-op(캐싱 없이 래퍼만 반환). Shared Component가 양쪽에서 깨지지 않도록 양쪽 모두 export한다.

### 소스 코드 경로
- `packages/react/src/jsx/ReactJSXElement.js:170-283` — ReactElement 팩토리, jsx/createElement
- `packages/react/src/jsx/ReactJSXElement.js:291-348` — jsxProd (컴파일러 타겟)
- `packages/react/src/jsx/ReactJSXElement.js:610-746` — createElement (레거시)
- `packages/react/src/jsx/ReactJSXElement.js:892-898` — isValidElement
- `packages/shared/ReactSymbols.js:15-47` — $$typeof Symbol 정의 (15개+ 타입)
- `packages/react/src/ReactClient.js` — Client API 전체 export
- `packages/react/src/ReactServer.js` — Server API export (Client 서브셋)
- `packages/react/src/ReactSharedInternalsClient.js:24-56` — SharedStateClient 타입 정의 (H/A/T/S/G 슬롯)
- `packages/react/src/ReactSharedInternalsClient.js:60-65` — 싱글턴 객체 초기화
- `packages/shared/ReactSharedInternals.js` — 브릿지 파일 (react → shared 재수출)
- `packages/react/src/ReactClient.js:110` — `__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE` export
- `packages/react/src/ReactHooks.js:24-42` — resolveDispatcher() (H 슬롯 접근)
- `packages/react/src/ReactHooks.js:44-51` — getCacheForType() (A 슬롯 접근)
- `packages/react/src/ReactStartTransition.js` — T/S/G 슬롯 직접 접근 (스택 save/restore 패턴)
- `packages/react/src/ReactHooks.js` — 22개 Hook 선언부 전체 (resolveDispatcher + 위임)
- `packages/react-reconciler/src/ReactInternalTypes.js:397-457` — Dispatcher 타입 정의 (인터페이스 계약)
- `packages/react-reconciler/src/ReactFiberHooks.js:502-631` — renderWithHooks() (H 슬롯 주입 → 컴포넌트 호출 → finishRenderingHooks)
- `packages/react-reconciler/src/ReactFiberHooks.js:633-656` — finishRenderingHooks() (H = ContextOnlyDispatcher)
- `packages/react-reconciler/src/ReactFiberHooks.js:3870-3896` — ContextOnlyDispatcher (모든 Hook → throwInvalidHookError)
- `packages/react-reconciler/src/ReactFiberHooks.js:3898-3924` — HooksDispatcherOnMount (mountState, mountEffect 등)
- `packages/react-reconciler/src/ReactFiberHooks.js:3926-` — HooksDispatcherOnUpdate (updateState, updateEffect 등)
- `packages/react-reconciler/src/ReactFiberHooks.js:442-451` — throwInvalidHookError() (Rules of Hooks 에러 메시지)
- `packages/react/src/ReactServer.js` — Server API export 전체 (Client 서브셋, Hook 5개만)
- `packages/react/src/ReactSharedInternalsServer.js:28-45` — SharedStateServer 타입 (H/A + TaintRegistry)
- `packages/react/src/ReactSharedInternalsServer.js:49-60` — 서버 싱글턴 초기화 (H/A만 + 조건부 Taint)
- `packages/react/src/ReactCacheClient.js:16-37` — noopCache (클라이언트에서 캐싱 없이 래퍼 반환)
- `packages/react/src/ReactCacheServer.js:10` — 서버 cache (ReactCacheImpl 직접 re-export)

### Q&A 전체 기록

#### Step 1: ReactElement & $$typeof

**Q: Symbol.for()가 보안에 어떻게 도움이 되는지 이해가 안 된다. 외부에서 `{ "$$typeof": Symbol.for('react.element')... }` 이렇게 똑같은 철자를 써도 다르다고 판단한다는 뜻인가? 아니면 Symbol 자체가 주입이 안 된다는 건가? (직렬화 실패로)**

A: **Symbol은 "주입 자체가 불가능"**한 것이다. 핵심은 직렬화 실패.

공격자가 DB나 API에 악의적 데이터를 넣어도:

```js
// 공격자가 DB에 저장한 데이터:
{ "$$typeof": "Symbol.for('react.transitional.element')", "type": "script", ... }

// JSON.parse() 후:
parsed.$$typeof  // → "Symbol.for('react.transitional.element')" ← 그냥 문자열!
typeof parsed.$$typeof  // → "string"

// React의 검사:
Symbol.for('react.transitional.element') === "Symbol.for('react.transitional.element')"
// → false (Symbol !== string, 타입 자체가 다름)
```

JSON은 6가지 타입만 표현 가능: `string, number, boolean, null, object, array`. Symbol 타입은 JSON 스펙에 존재하지 않는다.

`isValidElement()`에서 확인 (`ReactJSXElement.js:892-898`):

```js
export function isValidElement(object) {
  return (
    typeof object === 'object' &&
    object !== null &&
    object.$$typeof === REACT_ELEMENT_TYPE  // Symbol === Symbol만 통과
  );
}
```

유일한 예외: 같은 JS 프로세스 내에서 `Symbol.for()`를 직접 호출하면 진짜 Symbol을 만들 수 있다. 하지만 그건 이미 임의 코드 실행이 가능한 상황이므로 방어 범위 밖. Symbol은 **네트워크 경계(JSON)에서의 인젝션**만 막는 것이 목적.

---

**Q: `const ref = props.ref !== undefined ? props.ref : null;` — 왜 undefined 대신 null을 쓰는가? `element.ref != null`로 해도 같은 효과 아닌가?**

A: 논리적으로 `!= null`(loose equality)은 null과 undefined 모두 걸러내므로 가능하다. 실제로 React 코드베이스도 `.eslintrc.js:233`에서 `eqeqeq: [ERROR, 'allow-null']`로 null 비교에서만 `!=`을 허용하며, `createElement()`에서 `config != null`을 사용한다 (ReactJSXElement.js:635).

하지만 null로 통일하는 **진짜 이유**는 Reconciler 전체에서 ref의 "빈 값"을 하나로 통일하기 위함:

```js
// Reconciler에서 ref를 다루는 곳이 수십 군데
if (ref !== null)  // null 통일 → 이것만으로 충분
```

undefined가 섞여있으면 Reconciler의 **모든** ref 체크 지점에서 `!= null`을 써야 한다. 한 군데라도 `!== null`로 쓰면 undefined인 ref가 "있는 ref"로 취급되는 버그가 생긴다. **입구에서 통일하면 하류의 모든 코드가 안전해지는 것.**

소스 주석 (`ReactJSXElement.js:177-179`):
> "An undefined `element.ref` is coerced to `null` for backwards compatibility."

---

**Q: `Object.freeze`로 React 규칙을 코드로 막는다고 이해하면 될까? React 규칙 중에 props는 불변이라는 것?**

A: 정확하다. React의 핵심 규칙 "props are read-only"를 `Object.freeze()`로 **런타임에 강제 집행**하는 장치.

`ReactJSXElement.js:276-278`:
```js
if (Object.freeze) {
  Object.freeze(element.props);
  Object.freeze(element);
}
```

실수 예시:
```jsx
function BadComponent({ items }) {
  items.push(newItem);  // TypeError: Cannot add property 3, object is not extensible
  items.sort();          // TypeError: Cannot assign to read only property '0'
}

function AnotherBad() {
  const el = <div className="a" />;
  el.props.className = "b";  // TypeError: "className" is read-only
  el.type = "span";          // TypeError: "type" is read-only
}
```

DEV에서만 freeze하는 이유: `Object.freeze()`는 성능 비용이 있고, 매 Element마다 호출하면 V8 hidden class 최적화에 영향. DEV에서 실수를 잡아주면 프로덕션에서는 freeze 없이도 안전하다고 판단. 프로덕션에서 같은 mutation 코드를 실행하면 에러 없이 조용히 무시됨 → 찾기 어려운 버그이므로 DEV에서 일찍 잡아주는 것.

---

**Q: jsx()와 createElement()의 사용 용도 차이가 있는가?**

A: 용도가 완전히 나뉜다:

| | `jsx()` / `jsxs()` | `createElement()` |
|---|---|---|
| **누가 호출?** | 컴파일러(Babel/SWC)만 | 사람이 직접 호출 가능 |
| **언제 쓰는가?** | JSX 문법을 쓸 때 (자동 변환) | JSX 없이 수동으로 Element 만들 때 |
| **현재 상태** | Modern JSX Transform (기본) | 레거시 호환 |

JSX 컴파일 예시:
```jsx
// 작성한 코드:
<MyComponent name="hello" age={25} />

// Babel 변환 결과:
jsx(MyComponent, { name: "hello", age: 25 })
//                 ^^^^^^^^^^^^^^^^^^^^^^^^^ 항상 새 객체 리터럴
```

"컴파일러가 항상 새 config 객체를 보장"하는 근거: JSX → JS 변환은 기계적이다. 컴파일러가 매번 `{ ... }` 객체 리터럴을 코드에 삽입하므로, 런타임에 매 호출마다 새 객체가 생성된다. 변환 규칙 자체가 보장하는 것.

반면 `createElement()`는 사람이 직접 호출할 수 있어서 같은 config 객체를 재사용하는 위험한 패턴이 가능:

```js
const sharedConfig = { name: "hello" };
createElement(MyComponent, sharedConfig);
sharedConfig.name = "world";               // config 수정!
createElement(MyComponent, sharedConfig);  // 같은 객체!
```

소스 주석 (`ReactJSXElement.js:325-328`):
> "If key was not spread in, we can reuse the original props object. This only works for `jsx`, not `createElement`, because `jsx` is a compiler target and the compiler always passes a new object."

---

#### Step 3: Hooks API 선언부

**Q: `const dispatcher = resolveDispatcher();` 이건 모듈 전역적으로 선언해도 되는 거 아닌가요? 아니면 함수 호출마다 새로 resolveDispatcher 호출해야 하는 이유가 있나요?**

A: **안 된다. H의 값이 렌더링 도중 계속 바뀌기 때문이다.**

모듈 전역에 선언하면:

```js
// ❌ 모듈 로드 시점에 한 번만 실행
const dispatcher = resolveDispatcher();
// → 이 시점에 H는 null (앱 시작 시)
// → dispatcher = null, 영원히 null

export function useState(initialState) {
  return dispatcher.useState(initialState);  // null.useState() → 크래시
}
```

모듈은 앱 시작 시 한 번만 평가되므로, 이후 렌더러가 H를 바꿔도 이미 캡처된 변수는 여전히 null.

같은 `useState()`가 mount에서는 `mountState()`를, update에서는 `updateState()`를 실행해야 한다. 매 호출마다 "지금 현재 H가 뭔지"를 읽어야 올바른 구현체에 위임 가능.

```
[앱 시작]     H = null
[렌더 시작]   H = HooksDispatcherOnMount   ← useState() 여기서 호출
[렌더 완료]   H = ContextOnlyDispatcher
[리렌더 시작] H = HooksDispatcherOnUpdate  ← useState() 여기서 호출
[리렌더 완료] H = ContextOnlyDispatcher
```

SharedInternals의 슬롯들은 전부 "지금 이 순간의 상태"를 담는 mutable 변수이므로 캐싱하면 안 된다.

추가로 공통 래퍼 함수(`callHook(name, ...args)`)를 만들지 않은 이유:

1. V8 인라이닝 최적화 — 동적 프로퍼티 접근(`dispatcher[name]`)은 monomorphic call이 아니라 인라인 불가
2. Flow/TS 타입 추론 파괴 — `callHook('useState', init)`의 반환 타입 추론 불가
3. 각 Hook의 DEV 가드가 다름 — useEffect는 null 체크, useContext는 Consumer 체크, useDebugValue는 DEV 전용 실행

소스 근거 (`ReactHooks.js:38-41`):
> "Will result in a null access error if accessed outside render phase. We intentionally don't throw our own error because this is in a hot path. **Also helps ensure this is inlined.**"

---

**Q: `create == null` 경고에서 create라는 인자가 콜백함수인가요? `useEffect(() => {}` 여기?**

A: **맞다.** `useEffect(() => { ... }, [])` 에서 첫 번째 인자가 `create`.

`ReactHooks.js:87-89` 시그니처:
```js
export function useEffect(
  create: () => (() => void) | void,  // ← 이것
  deps: Array<mixed> | void | null,
): void {
```

"create"라는 이름: 이 콜백이 "effect를 create(생성)한다"는 React 내부 관점. 반환 타입 `(() => void) | void`는 cleanup 함수를 반환하거나 아무것도 반환하지 않거나.

DEV 가드가 잡아주는 실수: `useEffect()` 인자 없이 호출하거나 `useEffect(undefined, [])` 같은 경우.

---

**Q: "렌더링 밖: null → resolveDispatcher()에서 DEV 에러" 이것의 근거는 뭔가요?**

A: 근거 2가지를 확인했고, 처음 설명이 부정확했음을 정정한다.

**근거 1: 초기값이 null** (`ReactSharedInternalsClient.js:60-65`)
```js
const ReactSharedInternals = ({ H: null, A: null, T: null, S: null }: any);
```

**근거 2: 렌더링 끝나면 ContextOnlyDispatcher로 교체** (`ReactFiberHooks.js:656`)
```js
function finishRenderingHooks(current, workInProgress, Component) {
  ReactSharedInternals.H = ContextOnlyDispatcher;
}
```

**정정**: 렌더링 밖에서 H는 null이 아니라 `ContextOnlyDispatcher`로 교체된다. ContextOnlyDispatcher (`ReactFiberHooks.js:3870-3896`)의 정체:

```js
export const ContextOnlyDispatcher: Dispatcher = {
  readContext,
  use,
  useCallback: throwInvalidHookError,
  useContext: throwInvalidHookError,
  useEffect: throwInvalidHookError,
  useState: throwInvalidHookError,
  // ... 나머지 전부 throwInvalidHookError
};
```

`throwInvalidHookError()` (`ReactFiberHooks.js:442-451`):
```js
function throwInvalidHookError() {
  throw new Error('Invalid hook call. Hooks can only be called inside of the body of a function component...');
}
```

null 대신 에러를 던지는 Dispatcher를 넣어둔 이유: null이면 `null.useState()`에서 "Cannot read properties of null" 같은 의미 없는 에러가 나온다. ContextOnlyDispatcher를 넣으면 React가 직접 의미 있는 에러 메시지를 제공할 수 있다.

H 슬롯 값은 "키는 그대로, 값만 교체"되는 것이다. JavaScript 객체의 프로퍼티 대입:
```js
ReactSharedInternals.H = HooksDispatcherOnMount;   // 값 대입
ReactSharedInternals.H = ContextOnlyDispatcher;     // 같은 키, 다른 값 대입
```

렌더링 생명주기 전체:

| 시점 | H 슬롯 값 | Hook 호출 시 |
|------|----------|------------|
| 앱 시작 | `null` | null 접근 에러 (최초 렌더 전) |
| Mount 렌더링 중 | `HooksDispatcherOnMount` | `mountState()` 등 실행 |
| Update 렌더링 중 | `HooksDispatcherOnUpdate` | `updateState()` 등 실행 |
| 렌더링 완료 후 | `ContextOnlyDispatcher` | `throwInvalidHookError()` |

---

#### Step 4: Client vs Server API 분리

**Q: 부수효과 없이 값만 계산하는 것이 차이점이라고 하셨는데, 이게 불가능해서 빠진걸까요? 아니면 다른 이유에 의해서 빠진걸까요?**

A: **불가능하다.** 기술적으로 실행할 수 없다. Hook별 이유:

- **상태 Hook (useState, useReducer)**: 서버 렌더링은 한 번 실행하고 끝. `setState`를 호출할 "다음 렌더"가 존재하지 않는다.
- **Effect Hook (useEffect, useLayoutEffect, useInsertionEffect)**: Effect는 "렌더링 후 DOM이 준비된 다음"에 실행. 서버에는 DOM이 없다.
- **Ref Hook (useRef, useImperativeHandle)**: Ref는 "렌더 간에 값을 유지하는 상자". 서버에서 렌더는 한 번이므로 "렌더 간"이라는 개념이 없다.
- **Transition Hook (useTransition, useDeferredValue)**: Transition은 스케줄링 힌트. 서버 렌더링은 단일 패스이므로 "나중에"가 없다.

서버에 남은 5개(use, useId, useCallback, useMemo, useDebugValue)가 동작 가능한 이유: 전부 순수 계산이거나 부수효과가 없는 것들. 특히 `useId`는 서버↔클라이언트 hydration 매칭에 필수.

---

**Q: TaintRegistryXXX는 한글자가 아니네요, 이유가 있을까요?**

A: H/A/T/S/G와 TaintRegistry의 성격이 다르다:

- **H/A/T/S/G**: 렌더링마다 수시로 교체, 핫 패스에서 접근, 서드파티 의존 차단 목적으로 난독화
- **TaintRegistryXxx**: `enableTaint` feature flag 뒤에 조건부 추가, 직렬화 시점에만 검사, 핫 패스 아님, 디버깅 시 알아볼 수 있는 게 더 중요

소스 근거 (`ReactSharedInternalsServer.js:54-60`): Taint 슬롯들은 `if (enableTaint) { ... }` 블록 안에서 조건부로 할당되며, 초기 객체 리터럴에는 포함되지 않는다.

---

**Q: no-op 캐시가 정확히 뭔가요?**

A: **no-op = "no operation" = 아무것도 안 하는 것.** `ReactCacheClient.js:16-33`:

```js
function noopCache(fn) {
  return function () {
    return fn.apply(null, arguments);
  };
}
```

서버의 `cache()`는 같은 인자로 재호출 시 캐시에서 반환하지만, 클라이언트의 `noopCache`는 매번 원본 함수를 그대로 호출한다. 캐싱 로직이 전혀 없다.

새 래퍼 함수를 반환하는 이유: 서버의 `cache()`도 새 함수를 반환하므로 외부에서 관찰 가능한 특성(참조, length, displayName)을 동일하게 맞추기 위함. 소스 주석: "it returns a new reference, extra properties like displayName are not preserved, the length of the new function is 0, etc. That way apps can't accidentally depend on those details."

---

**Q: 래퍼 함수 반환 예시를 좀 더 이해하기 쉽게 설명해주세요. 또한 SharedComponents가 어떻게 가능한건가요?**

A: JavaScript 함수의 `.length`는 선언된 매개변수 개수다:

```js
function fetchUser(id, lang) { ... }
fetchUser.length  // → 2

const cached = cache(fetchUser);
```

서버의 `cache()`는 캐싱 로직이 있는 새 함수를 만들어 반환 → `cached.length === 0`.
만약 클라이언트의 `noopCache`가 원본을 그대로 반환(`return fn`)하면 → `cached.length === 2`.
같은 코드가 환경에 따라 다른 결과를 낸다. 이걸 방지하기 위해 클라이언트도 새 래퍼 함수를 반환하여 `cached.length === 0`으로 통일한다.

클라이언트에서 `cache`를 export하는 이유: **Shared Component** 때문. Shared Component는 서버/클라이언트 양쪽에서 import될 수 있는 컴포넌트로, `import { cache } from 'react'`가 클라이언트에서도 동작해야 빌드가 깨지지 않는다. 소스 주석(`ReactCacheClient.js:21-23`): "it's only exposed as an API so that Shared Components can use per-request caching on the server without breaking on the client."

Shared Component의 동작 원리(RSC 프로토콜, 직렬화 경계 등)는 Server Components 토픽 범위이므로 별도 학습을 추천.

---

### 연결 토픽
- **HOC 유틸리티**: Step 5 — forwardRef, memo, lazy, createContext 래퍼 구조
- **Fiber 아키텍처**: Element → Fiber 변환 과정
- **Reconciliation**: Element 트리 비교(diffing) 알고리즘
- **Server Components**: Shared Component 동작 원리, RSC 프로토콜, 직렬화 경계
- **Taint API**: experimental_taintObjectReference, 민감 데이터 직렬화 방지
- **렌더러 주입 패턴**: react-dom이 H/A 슬롯에 실제 구현체를 주입하는 시점과 코드
- **HooksDispatcherOnMount vs OnUpdate**: mountState/updateState의 구현 차이 (Fiber의 memoizedState 링크드 리스트)

---

## 2026-02-11 (재개 — Step 5부터)

### 학습 로드맵
- [x] Step 1: ReactElement & $$typeof
- [x] Step 2: SharedInternals & Dispatcher 패턴
- [x] Step 3: Hooks API 선언부
- [x] Step 4: Client vs Server API 분리
- [x] Step 5: HOC 유틸리티
- [ ] Step 6: cache & Transitions

### 학습 요약
memo, forwardRef, lazy는 컴포넌트가 아니라 "타입 래퍼 객체"를 반환한다. 각 래퍼가 고유한 $$typeof(REACT_MEMO_TYPE, REACT_FORWARD_REF_TYPE, REACT_LAZY_TYPE)를 가지며, Reconciler가 이를 보고 특별한 처리 분기를 실행한다.
$$typeof는 2단계로 존재: Element 레벨(REACT_ELEMENT_TYPE, 보안용)과 Type 레벨(REACT_MEMO_TYPE 등, Reconciler 분기용).
memo가 함수가 아니라 객체를 반환하는 이유: createFiberFromTypeAndProps()에서 typeof로 먼저 분기하므로 함수를 반환하면 FunctionComponent로 분류되어 $$typeof 체크에 도달하지 못한다. 또한 Reconciler가 이전 props(Fiber에 저장), compare 함수 등 메타데이터에 접근해야 하므로 객체가 필수.
lazy()는 4단계 상태 머신(Uninitialized→Pending→Resolved/Rejected)을 내장하며, moduleObject.default만 반환하므로 named export는 유저랜드에서 .then()으로 변환 필요.
분기 코드 순서(function→string→else)는 빈도 기반 최적화: 가장 빈번한 함수 컴포넌트가 첫 번째 분기에서 바로 처리되도록.

### 소스 코드 경로
- `packages/react/src/ReactMemo.js:12-58` — memo() 전체 구현 ($$typeof: REACT_MEMO_TYPE, type, compare)
- `packages/react/src/ReactForwardRef.js:12-83` — forwardRef() 전체 구현 ($$typeof: REACT_FORWARD_REF_TYPE, render)
- `packages/react/src/ReactForwardRef.js:19-24` — DEV 가드: forwardRef(memo(...)) 순서 에러 감지
- `packages/react/src/ReactLazy.js:25-28` — lazy 상태 상수 (Uninitialized=-1, Pending=0, Resolved=1, Rejected=2)
- `packages/react/src/ReactLazy.js:70-220` — lazyInitializer() 상태 머신 (ctor 호출 → thenable.then → 상태 전이)
- `packages/react/src/ReactLazy.js:203-216` — default export 필수 검증 + moduleObject.default 반환
- `packages/react/src/ReactLazy.js:222-259` — lazy() 팩토리 (payload + _init 구조)
- `packages/react-reconciler/src/ReactFiber.js:561-663` — createFiberFromTypeAndProps() (typeof → fiberTag 결정, $$typeof switch)
- `packages/react-reconciler/src/ReactFiberBeginWork.js:4241-4321` — workInProgress.tag switch (LazyComponent→mountLazyComponent, ForwardRef→updateForwardRef, MemoComponent→updateMemoComponent)

### Q&A 전체 기록

#### Step 5: HOC 유틸리티

**Q: $$typeof가 식별자라면, 여러 상태를 가진건 어떻게 처리하나요? 예를들어 리액트 엘리먼트이면서 fowardRef라면? > REACT_FORWARD_REF_TYPE라면 이미 그거라고 가정되는건가요? > 아 마지막 설명에 $$typeof가 2단계이고, memo등 래퍼 $$typeof는 type: {...}에 존재하는군요**

A: $$typeof는 2단계로 존재하며 서로 다른 레벨이므로 충돌하지 않는다:

```
element.$$typeof === REACT_ELEMENT_TYPE       // Element 레벨 (보안용)
element.type.$$typeof === REACT_FORWARD_REF_TYPE  // Type 레벨 (Reconciler 분기용)
```

---

**Q: render 함수를 기대하지만 memo로 감싸면 객체가된다는건, 아무런 래퍼가 없는 리액트 컴포넌트가 반환하는건 render 함수라는건가요?**

A: 맞다. 함수 컴포넌트는 그 자체가 함수. `typeof MyComponent === "function"`. forwardRef의 DEV 가드(`ReactForwardRef.js:25-29`)가 `typeof render !== 'function'`으로 검사한다.

`memo()`의 반환값은 `{ $$typeof, type, compare }` 객체이므로 `typeof === "object"`. forwardRef에 넘기면 "object를 받았다"는 에러.

감싸는 순서: `memo(forwardRef(...))` OK (memo의 type은 React$ElementType이므로 뭐든 받음), `forwardRef(memo(...))` NG (forwardRef는 function만 받음).

---

**Q: moduleObject.default를 반환한다면, 만약 lazy 하는 것이 default export가 아니라 named export면 어떻게 처리되나요?**

A: lazy()는 default export만 지원한다. `ReactLazy.js:203-214`에서 `!('default' in moduleObject)` 체크 후 DEV 경고. `ReactLazy.js:216`에서 항상 `moduleObject.default`만 반환. 타입 시그니처도 `Thenable<{default: T, ...}>`로 강제.

named export를 쓰려면 유저랜드에서 변환:

```js
const MyComponent = lazy(() =>
  import('./MyModule').then(mod => ({ default: mod.MyNamedComponent }))
);
```

---

**Q: 당신이 설명해준 문제점 3개가 다 이해가 안됩니다. 실생활 비유로 설명이될까요?**

A: 레스토랑 비유:

- **Reconciler = 주방장**, **Component = 레시피**, **Fiber = 주문 이력표**
- memo가 함수 반환 = 요리사가 알아서 판단하는 상황
  - 문제 1: 요리사 손에는 "지금 이 주문"만 있다. "아까 주문"은 주방장 책상의 이력표(Fiber)에 있어서 볼 수 없다.
  - 문제 2: 주방장 눈에 모든 요리사가 똑같이 보인다. memo 전용 빠른 처리 라인으로 보내줄 수 없다.
  - 문제 3: 바쁜 주방(concurrent)에서 주방장이 순서 조율 중인데 요리사가 자기 맘대로 스킵하면 전체 타이밍이 꼬인다.
- memo가 객체 반환 = 주문서에 "재료 같으면 안 만들어도 됨" 스티커 부착 → 주방장이 읽고 판단

---

**Q: 그러면 import()는 함수가 아니라는 뜻인가요? "비동기" 함수가 아니라는건가요?**

A: **함수 자체가 아니다.** 함수처럼 보이지만 ECMAScript의 문법(syntax)/연산자다. `typeof`와 같은 성격:

```js
const myImport = import;    // SyntaxError
const myTypeof = typeof;    // SyntaxError
```

함수라면 변수에 할당하거나 `.call()`, `.apply()`를 쓸 수 있어야 하지만 불가. 비동기 결과(Promise)를 반환하는 **문법 구조(ImportCall expression)**이다.

---

**Q: memo만 이렇게 분기처리를 해야한다면, 이렇게 memo는 객체를 반환해야만 했던 이유가 있을거같은데 뭘까요? / 객체 얇은 비교를 위해서인가요? 함수 참조 비교보단**

A: 얕은 비교를 위해서가 아니라, **Reconciler에 메타데이터를 전달하기 위해서**. memo가 함수 래퍼를 반환하면:
1. 이전 props 접근 불가 — Fiber 노드에 저장된 데이터에 일반 함수는 접근 불가
2. Reconciler가 memo인지 모름 — `typeof === 'function'` → `FunctionComponent` 분류 → memo 전용 최적화 경로 불가
3. concurrent 렌더링 호환 불가 — 함수 내부에서 직접 비교/스킵하면 Reconciler 스케줄링과 충돌

객체로 반환하면 Reconciler가 `type.compare`에서 비교 함수를, `type.type`에서 원본 컴포넌트를 꺼내 모든 결정을 직접 수행한다.

---

**Q: .then() 체이닝이 가능한 유일한 이유는 Promise를 반환하기때문이군요, 그러면 thenable이라고 봐도되나요?**

A: 맞다. `Thenable ⊃ Promise ⊃ import() 반환값`. Thenable은 `.then()` 메서드만 있으면 되는 최소 인터페이스. Promise는 그 풀 스펙 구현. import()는 정식 Promise를 반환하므로 당연히 thenable이다.

---

**Q: 왜 함수를 반환하면 Reconciler가 판단을 안(못)하나요?**

A: `createFiberFromTypeAndProps()` (`ReactFiber.js:569-663`)에서 **typeof로 먼저 분기**하기 때문:

```js
if (typeof type === 'function') {        // 함수면 여기서 끝
  fiberTag = shouldConstruct(type) ? ClassComponent : FunctionComponent;
} else if (typeof type === 'string') {
  fiberTag = HostComponent;
} else {
  switch (type.$$typeof) {               // 객체일 때만 여기 도달
    case REACT_MEMO_TYPE: fiberTag = MemoComponent; break;
  }
}
```

memo가 함수를 반환하면 첫 번째 `typeof === 'function'` 분기에서 `FunctionComponent`로 분류되고, `$$typeof`를 확인하는 else 블록에 도달하지 못한다.

---

**Q: 사실 저 if/else문에서 else분기를 타는것들이 더 특이해보입니다. 그러면 얼리리턴도 가능하지 않나요?**

A: 처음에 "함수에 $$typeof 프로퍼티를 붙이고 함수 분기에서 체크"하는 제안으로 이해했으나, 실제 질문은 코드 구조: "특수 타입(object, string)을 먼저 체크하고 얼리리턴한 뒤, 나머지를 함수 컴포넌트로 처리하면 되지 않냐?"

논리적으로 동작하지만, 현재 구조가 **빈도 기반 최적화**이다:

| 순서 | 현재 구조 | 제안 구조 |
|------|----------|----------|
| 1번째 체크 | `typeof === 'function'` (가장 흔한 케이스 → 바로 끝) | `typeof === 'object'` (함수 컴포넌트도 fail 통과) |
| 2번째 체크 | `typeof === 'string'` (함수 아닌 경우만) | `typeof === 'string'` (함수 컴포넌트도 fail 통과) |
| 3번째 | else (드문 경우만) | 나머지 → 함수 컴포넌트 |

앱에서 대부분이 함수 컴포넌트이므로, 제안 구조에서는 가장 빈번한 케이스가 2번의 불필요한 체크를 거치게 된다. 핫 패스를 첫 번째 분기에 놓는 것이 의도적 설계.

---

### 연결 토픽
- **cache & Transitions**: Step 6 — startTransition 내부, useActionState, useOptimistic, ViewTransition/Activity
- **Fiber 아키텍처**: Element → Fiber 변환 과정 (createFiberFromTypeAndProps 이후)
- **Reconciliation 분기**: updateMemoComponent, updateForwardRef, mountLazyComponent의 실제 구현
- **React Compiler**: memo()를 자동으로 적용하는 컴파일러의 동작 원리
- **concurrent 스케줄링**: Reconciler가 "나중에" 처리를 결정하는 메커니즘 (lanes, priority)

---

## 2026-02-11 (재개 — Step 6부터)

> **⚠️ 심층 학습 필요**: Step 6(cache & Transitions)은 큰 그림 + 비유 수준까지만 진행. CacheNode Trie 탐색 세부, S/G 슬롯의 렌더러 측 구현, useActionState/useOptimistic의 Reconciler 처리 경로, ViewTransition CSS 연동 등은 별도 심층 세션 필요.

### 학습 로드맵
- [x] Step 1: ReactElement & $$typeof
- [x] Step 2: SharedInternals & Dispatcher 패턴
- [x] Step 3: Hooks API 선언부
- [x] Step 4: Client vs Server API 분리
- [x] Step 5: HOC 유틸리티
- [x] Step 6: cache & Transitions (큰 그림 + 비유 — 심층 학습 필요 ⚠️)

### 학습 요약
`cache()`는 서버에서 CacheNode Trie(인자 조합별 WeakMap/Map 분기)로 per-request 메모이제이션을 구현하고, 클라이언트에서는 noopCache(래퍼만 반환, 캐싱 없음)로 Shared Component 호환성을 유지한다. A 슬롯(AsyncDispatcher)의 `getCacheForType()`을 통해 렌더러가 관리하는 요청별 캐시 저장소에 접근한다.
`startTransition()`은 T 슬롯에 Transition 객체를 설정하여 "이 안의 setState는 low-priority"라는 신호를 만들고, scope 실행 후 S 슬롯 콜백으로 렌더러에 통보하며, finally에서 이전 T 값을 복원하는 save/restore 패턴이다.
Transition 객체의 `types` 필드는 `addTransitionType()`으로 문자열 태그를 추가하여 CSS ViewTransition과 연동하고, `gesture` 필드는 `startGestureTransition()`에서 제스처 제공자를 설정한다.
useTransition(isPending + startTransition), useOptimistic(낙관적 상태 + 롤백), useActionState(서버 액션 + form 통합 + permalink)는 모두 Transition 인프라 위에 구축된 Hook이다.

### 소스 코드 경로
- `packages/react/src/ReactCacheImpl.js:55-128` — cache() 서버 구현 (CacheNode Trie, WeakMap/Map 분기, 3상태 머신)
- `packages/react/src/ReactCacheImpl.js:46-53` — CacheNode 구조 (s/v/o/p 필드)
- `packages/react/src/ReactCacheImpl.js:42-44` — createCacheRoot (WeakMap)
- `packages/react/src/ReactCacheImpl.js:130-140` — cacheSignal (AbortSignal via A 슬롯)
- `packages/react/src/ReactCacheClient.js:16-33` — noopCache (클라이언트 no-op, 래퍼만 반환)
- `packages/react/src/ReactCacheClient.js:35-37` — disableClientCache 플래그 분기
- `packages/react/src/ReactStartTransition.js:30-37` — Transition 타입 정의 (types/gesture/name/startTime/_updatedFibers)
- `packages/react/src/ReactStartTransition.js:45-117` — startTransition() (T 슬롯 save/restore, S 슬롯 통보, async 처리)
- `packages/react/src/ReactStartTransition.js:119-183` — startGestureTransition() (G 슬롯, async 금지, 클린업 반환)
- `packages/react/src/ReactTransitionType.js:19-50` — addTransitionType() (T.types 배열에 태그 추가, async gap 처리)
- `packages/react/src/ReactHooks.js:170-176` — useTransition 시그니처 ([boolean, startTransition])
- `packages/react/src/ReactHooks.js:226-232` — useOptimistic 시그니처 (passthrough + reducer → [state, dispatch])
- `packages/react/src/ReactHooks.js:234-241` — useActionState 시그니처 (action + initialState + permalink → [state, dispatch, isPending])

### Q&A 전체 기록

#### Step 6: cache & Transitions

**Q: 이번 주제는 전체가 어렵네요, 실생활 비유로 cache와 transitions의 큰그림을 이해하고 다시 봐야 질문거리가 생길거같습니다**

A: Step 5의 레스토랑 비유를 확장하여 전체 그림을 설명.

**cache() = 주방의 "오늘의 조리 메모판"**

점심 서비스(= 하나의 HTTP 요청) 동안, 같은 재료 조합의 주문이 여러 번 들어올 수 있다.

```
주문 1: 연어 + 레몬 + 소금  →  처음이니까 요리함  →  메모판에 기록
주문 2: 연어 + 레몬 + 소금  →  메모판 확인 → "아까 만든 거 그대로!" (캐시 히트)
주문 3: 연어 + 레몬 + 후추  →  세 번째 재료가 다름 → 새로 요리
```

메모판은 재료 순서대로 가지를 타고 내려가는 구조(Trie):

```
연어 ─┬─ 레몬 ─┬─ 소금 → 완성 요리 A ✓
      │        └─ 후추 → 완성 요리 B ✓
      └─ 버터 ─── 소금 → (아직 주문 안 옴)
```

- 생선(객체 인자)이 상해서 버려지면 그 메모도 자동 삭제 → WeakMap
- 소금, 후추(원시값)는 상하지 않으므로 영구 메모 → Map
- 점심 서비스 끝나면 메모판 전체 초기화 → per-request 캐시
- 메모판을 얻으려면 매니저(A 슬롯)에게 요청 → `dispatcher.getCacheForType()`

홀(클라이언트)에는 메모판이 없다. 매번 주방에 그대로 넘김(noopCache). 하지만 주문서 양식은 동일 → Shared Component가 양쪽에서 동작.

**startTransition() = "급한 주문 / 여유 주문" 분류 시스템**

보통의 `setState` = 급한 주문: "테이블 3번 물이요!" → 모든 걸 멈추고 즉시 대응 (타이핑, 클릭 등 즉각 반응 UI).

`startTransition` = 여유 주문: "테이블 5번 디저트요~ 바쁘면 나중에 해도 돼요" → T 슬롯에 여유 태그 부착. 급한 주문이 들어오면 디저트 준비를 중단하고 급한 것 먼저(concurrent 인터럽트).

T 슬롯 save/restore: 이전 태그 저장 → 여유 태그로 교체 → scope 실행 → 이전 태그 복원.
S 슬롯: 매니저(렌더러)에게 "여유 주문 접수 완료" 보고 → 전체 스케줄 조율.

**Transition 생태계:**
- `addTransitionType` = 태그에 "생일파티"/"일반" 같은 종류 적기 → CSS ViewTransition이 종류별 다른 애니메이션
- `useTransition` = 웨이터 전용 버전 (태그 붙이기 + isPending 상태표)
- `useOptimistic` = "디저트 곧 나옵니다!" 미리 알려드리기 → 실제로 나오면 확정, 실패하면 롤백
- `useActionState` = 종이 주문서(form) → 주방(서버)이 처리 → JS 없어도 동작(permalink = FAX 번호)
- `startGestureTransition` = 손님이 직접 속도 조절 (스와이프 = "천천히/빨리 가져와")

전체 그림:

```
            ┌─ cache()  ──── 같은 재료면 다시 안 만듦 (서버만, 메모판)
            │
React 패키지 ─┤
            │                         ┌─ useTransition ── isPending + 태그
            └─ Transitions ──────────┤
               (T 슬롯 = 여유 태그)   ├─ useOptimistic ── 미리 알려드리기
                                      ├─ useActionState ── 종이 주문서 + 서버 액션
                                      ├─ addTransitionType ── 태그에 종류 적기
                                      └─ startGestureTransition ── 손님이 직접 속도 조절
```

---

### 심층 학습 대기 항목 ⚠️
- [ ] **CacheNode Trie 탐색 세부**: WeakMap/Map 분기 로직, TERMINATED/ERRORED 상태 전이, 에러 캐싱
- [ ] **S/G 슬롯 렌더러 측 구현**: react-dom이 S/G에 주입하는 콜백의 실제 코드
- [ ] **useActionState Reconciler 경로**: `Awaited<S>` 타입이 Reconciler에서 어떻게 처리되는지
- [ ] **useOptimistic 롤백 메커니즘**: 낙관적 상태가 서버 응답과 어떻게 동기화되는지
- [ ] **ViewTransition CSS 연동**: `addTransitionType`의 문자열이 `::view-transition-*` 선택자로 매핑되는 경로
- [ ] **Transition lanes**: T 슬롯이 null이 아닐 때 Reconciler가 업데이트를 어떤 lane에 배정하는지
- [ ] **startGestureTransition 동작**: GestureProvider/Timeline의 구현과 "속도 조절"이 실제로 어떻게 동작하는지

### 연결 토픽
- **cache & Transitions 심층**: 위 대기 항목들을 각각 또는 묶어서 심층 학습
- **Fiber 아키텍처**: Element → Fiber 변환 과정 (createFiberFromTypeAndProps 이후)
- **Reconciliation 분기**: updateMemoComponent, updateForwardRef, mountLazyComponent의 실제 구현
- **React Compiler**: memo()를 자동으로 적용하는 컴파일러의 동작 원리
- **concurrent 스케줄링**: Reconciler가 "나중에" 처리를 결정하는 메커니즘 (lanes, priority)
- **Server Components**: RSC 프로토콜, 직렬화 경계, Shared Component 동작 원리

---

## 2026-02-22

### 학습 로드맵
- Step 1: ReactChildren — Children 순회 알고리즘
  - [x] 1.1: mapIntoArray 재귀 순회 — 중첩 배열/iterable children을 평탄화하는 핵심 알고리즘
  - [x] 1.2: Key 생성과 이스케이프 — children의 고유 키를 자동으로 결정하는 규칙
  - [ ] 1.3: Lazy/Thenable children 처리 — children이 Promise/lazy일 때의 동기적 해결
- Step 2: ReactContext — Context 생성 구조
  - [ ] 2.1: createContext 내부 — Provider === context 순환 참조와 dual renderer(_currentValue/_currentValue2)
- Step 3: ReactBaseClasses — 클래스 컴포넌트 기반
  - [ ] 3.1: Component/PureComponent — updater 주입 패턴과 prototype 체인
  - [ ] 3.2: Deprecated API 가드 — Object.defineProperty getter를 통한 경고
- Step 4: ReactAct — 테스트 인프라
  - [ ] 4.1: act() scope와 actQueue — 렌더러 작업을 큐로 모으는 메커니즘
  - [ ] 4.2: flushActQueue — microtask/macrotask 재귀 플러시와 Suspense 처리
- Step 5: Taint API & 유틸리티
  - [ ] 5.1: taintUniqueValue/taintObjectReference — RSC 직렬화 보안과 FinalizationRegistry
  - [ ] 5.2: createRef, CompilerRuntime, OwnerStack — 소형 유틸리티 일괄 학습

### 학습 요약
`React.Children.map()`의 핵심인 `mapIntoArray()`는 DFS(깊이 우선) 재귀로 중첩된 children 구조를 1차원 배열로 평탄화한다. 리프 노드(null, string, number, Element, Portal)에는 콜백을 적용하고, 컨테이너(배열, iterable)는 안으로 들어가서 재귀한다. 콜백 결과가 배열이면 `c => c` 항등 콜백으로 다시 재귀 평탄화하여 항상 1차원 배열을 보장한다. Lazy children은 즉시 `init(payload)`로 해결하고, Thenable은 `resolveThenable()`으로 동기적 해결을 시도한다.
키 생성은 세 가지 장치로 충돌을 방지한다: (1) `$` 접두사로 사용자 키와 자동 인덱스 구분, (2) `.` 시작점으로 최상위 레벨 표시, (3) `:` 중첩 구분자로 배열 깊이 표현. `escape()`는 내부 구분자(`=`, `:`)를 이스케이프하고, `escapeUserProvidedKey()`는 복합 키 구분자(`/`)를 이스케이프한다. 인덱스는 `toString(36)`으로 36진수 변환하여 최단 알파뉴메릭 문자열을 생성한다.

### 소스 코드 경로
- `ref/react-fork/packages/react/src/ReactChildren.js:155-349` — mapIntoArray 전체 (재귀 순회, 리프/컨테이너 분기)
- `ref/react-fork/packages/react/src/ReactChildren.js:162-198` — 리프 노드 판별 (invokeCallback 분기)
- `ref/react-fork/packages/react/src/ReactChildren.js:200-265` — 리프 노드 처리 (콜백 적용, 배열 결과 재귀 평탄화)
- `ref/react-fork/packages/react/src/ReactChildren.js:267-349` — 컨테이너 처리 (배열, iterable, thenable, 에러)
- `ref/react-fork/packages/react/src/ReactChildren.js:366-381` — mapChildren (공개 API, mapIntoArray 래퍼)
- `ref/react-fork/packages/react/src/ReactChildren.js:32-33` — SEPARATOR('.'), SUBSEPARATOR(':') 상수
- `ref/react-fork/packages/react/src/ReactChildren.js:41-53` — escape() (=, : 이스케이프 + $ 접두사)
- `ref/react-fork/packages/react/src/ReactChildren.js:62-65` — escapeUserProvidedKey() (/ 이스케이프)
- `ref/react-fork/packages/react/src/ReactChildren.js:74-93` — getElementKey() (사용자 키 or 36진수 인덱스)
- `ref/react-fork/packages/react/src/ReactChildren.js:225-239` — cloneAndReplaceKey (복합 키 구성)
- `ref/react-fork/packages/react/src/ReactChildren.js:269-276` — 경로 누적 (nextNamePrefix + getElementKey)

### Q&A 전체 기록

#### Step 1.1: mapIntoArray 재귀 순회

**Q: children 트리를 DFS(깊이 우선)로 순회 << 제가 자료구조를 잘 몰라서 그러는데, DFS로 순회하는것을 비유적으로 설명해주세요, 또한 그 장단점과 다른 방식과의 비교도 부탁합니다**

A: **아파트 호별 방문 배달** 비유로 설명:

- DFS = "한 동을 꼭대기까지 다 돌고 나서 다음 동으로" (한 갈래를 끝까지 파고듦)
- BFS = "모든 동의 1층부터, 그 다음 모든 동의 2층" (같은 깊이를 전부 돌고 다음 깊이로)

React children에서 DFS를 쓰는 이유: 재귀 호출 스택으로 자연스럽게 구현 가능, 별도 큐 자료구조 불필요. React children은 보통 깊이 2-3단계, 형제는 많을 수 있음 → DFS의 재귀가 가장 자연스럽고 메모리 효율적.

| | DFS | BFS |
|---|---|---|
| 구현 | 재귀 호출 (콜스택 활용) | 별도 큐 필요 |
| 메모리 | 트리 깊이만큼만 | 같은 깊이의 노드 수만큼 |
| children 특성 | 중첩 배열은 깊지만 좁음 → DFS 유리 | 형제가 수천 개면 큐가 커짐 |

---

**Q: ?ReactNodeList << 이게 이전 학습 기억에 따르면 ReactNodeList | null | undefined와 대응된다고 기억하는데 맞나요?**

A: 맞다. Flow의 `?T`는 `T | null | void`(void는 TypeScript의 undefined). `?ReactNodeList` → `ReactNodeList | null | undefined`.

---

**Q: React$Node << 왜 ReactNode가 아니라 React$Node처럼 중간에 "$"를 넣었을까요?**

A: Flow의 내장(built-in) 타입 네이밍 컨벤션. `$`는 Flow 자체가 제공하는 유틸리티/글로벌 타입을 나타냄. `React$Node`는 Flow가 글로벌로 제공하는 React 타입(import 없이 사용 가능). TypeScript의 `React.ReactNode`에 대응. `ReactNodeList`는 `shared/ReactTypes.js`에서 React 팀이 직접 정의한 타입.

---

**Q: 리프 노드인가 << 리프 노드가 뭔가요?**

A: **가계도(족보)** 비유: 리프(leaf) = 나뭇잎 = 더 이상 자식이 없는 끝 노드. React children에서 리프 = 콜백을 실행할 대상 (string, number, Element). 가지(배열, iterable) = 안으로 더 들어가야 할 대상.

---

**Q: `let mappedChild = callback(child);  // 사용자 콜백 적용` < 위 Flow 타입보면 callback이 null이나 undefined일수있는거아닌가요?**

A: `?`가 붙은 것은 callback 자체가 아니라 인자와 반환값. 분해하면:
- 인자: `?React$Node` = `React$Node | null | undefined` → child가 null일 수 있음
- 반환값: `?ReactNodeList` → 결과가 null일 수 있음
- callback 자체: `?` 없음 → 항상 함수

만약 callback 자체가 nullable이었다면 `?((?React$Node) => ?ReactNodeList)`처럼 전체를 괄호로 감싸야 함.

---

**Q: "콜백의 반환값이 배열이면 ... 항상 1차원 배열을 반환하는 이유" << 반환값이 배열이면 재귀적으로 평탄화 시도 -> 근데 항상 1차원 배열 반환? 그러면 언제 끝남?**

A: 핵심은 콜백 결과가 배열일 때 재귀하면서 **콜백을 `c => c` (항등 함수)로 교체**한다는 것 (`ReactChildren.js:212`):

```js
mapIntoArray(mappedChild, array, escapedChildKey, '', c => c);
```

`c => c`는 입력을 그대로 반환하므로, 각 원소가 Element/문자열 같은 리프면 바로 `invokeCallback = true` → `array.push()` → 끝. 중첩 `[[[A]]]`이어도 배열을 재귀적으로 벗기다가 결국 리프에 도달. 깊이가 유한하면 반드시 종료.

---

**Q: 전체 흐름 요약 << 실생활 예시로 설명해주세요**

A: **편의점 도시락 포장 라인** 비유:

규칙: 최종 출하 상자에는 개별 반찬만 1열로 나란히 담아야 함 (= 1차원 배열).

- 김치(반찬 하나) → 라벨 붙여서 출하 상자에 (리프 → `array.push()`)
- 비닐봉지 [밥, 국] → 봉지를 열어서 하나씩 처리 (배열 → 재귀)
- 큰 박스 [비닐봉지[계란, 소세지], 샐러드] → 열어서 안의 것을 다시 분류 (중첩 → 재귀)
- "준비 중" 표시 봉지 → 즉시 완성 요청(`init()`) → 결과를 다시 처리 (Lazy → 재귀)

콜백 = 각 반찬에 할 작업. 콜백이 여러 개를 돌려주면(배열 반환) → 돌려받은 것도 다시 개별 포장 (재귀 평탄화, `c => c`).

Map 경고(`ReactChildren.js:294-301`): Map의 기본 iterator는 `.entries()` = `[key, value]` 쌍 → React가 기대하는 ReactNode가 아닌 배열 튜플이 나와서 경고.

---

#### Step 1.2: Key 생성과 이스케이프

**Q: 이스케이프해서 사용 << 이스케이프해서 사용이 무슨 말입니까? / =과 :는 내부 구분자로 사용될 수 있으므로 이스케이프합니다. << 아 이미 "=", ":"는 예약어 역할을 하므로 사용자가 그 값을 넘기면 예약어와 혼동되는것을 방지는하기 위해 값을 치환하는 것을 말하는건가요?**

A: 정확하다. "이스케이프"는 특별한 의미를 가진 문자를 일반 문자로 취급되게 변환하는 것. `:`는 `SUBSEPARATOR`, `=`는 이스케이프 표시자로 쓰이므로, 사용자 키에 이 문자가 포함되면 치환:

```
사용자 key: "a:b"
이스케이프 전: ".$a:b"   ← 모호
이스케이프 후: ".$a=2b"  ← 명확
```

HTML의 `<` → `&lt;`와 같은 원리.

---

**Q: 36진수를 쓰는 이유 << 짧게 유지하는 이유는 성능때문인가요? (역추론 x, 근거 탐색) / 만약 36진수로 표현해도 모자르면 중복을 허용하나요?**

A: React 소스나 PR에서 명시적 근거를 찾지 못했다. 웹 검색을 통해 확인한 결과:

Wikipedia/GitHub Gist에 따르면 "Base 36 is the most compact case-insensitive alphanumeric numeral system using ASCII characters." `toString(36)`은 JS가 기본 제공하는 최단 알파뉴메릭 문자열 생성 방법. 실제 사용 사례: Reddit(게시물 ID), TinyURL 등.

"모자라면?"에 대해: 36진수는 진법이므로 모자를 수 없다. 자릿수가 늘어나면서 어떤 정수든 표현 가능 (36 → "10", 1296 → "100"). 10진수가 숫자 10개(0-9)로 아무리 큰 수를 표현하는 것과 동일.

---

**Q: 슬래시 이스케이프 << 왜 슬래시 이스케이프는 위 두 이스케이프랑 같이 처리 안합니까?**

A: 쓰이는 맥락이 완전히 다르기 때문:

| 함수 | 대상 문자 | 쓰이는 곳 | 예약 용도 |
|------|----------|----------|----------|
| `escape()` | `=`, `:` | 내부 경로 구성 (`getElementKey`) | `.`과 `:` 경로 구분자 |
| `escapeUserProvidedKey()` | `/` | 복합 키 구성 (`cloneAndReplaceKey`) | 매핑된 키와 원래 경로의 구분자 |

비유: 주소에서 "서울시/강남구"의 `/`와 "123-45"의 `-`는 별개 구분자. 같은 이스케이프로 처리하면 오히려 혼란.

---

**Q: 그러면 사용자가 배열노드에 index를 key로 설정하면 .index(배열의 인덱스):index(배열 요소들의 인덱스) << 이렇게되나요?**

A: `$` 접두사가 사용자 키와 자동 인덱스를 구분하므로 충돌하지 않는다.

```
A (index 0, key="1"):
  getElementKey → key != null → escape("1") → "$1"
  경로: ".$1"    ← $ 있음

B (index 1, key 없음):
  getElementKey → key == null → (1).toString(36) → "1"
  경로: ".1"     ← $ 없음
```

`".$1"` ≠ `".1"` → 충돌 없음.

---

**Q: 이것은 "36개의 문자 중에서 고르는" 것이 아니라 진법이므로, 무한한 정수를 표현할 수 있습니다. << 그러면 왜 10진수가 아니라 36진수를 쓰나요?**

A: React 소스/PR에서 "왜 36진수인가"에 대한 명시적 근거는 찾지 못했다. 웹 검색으로 확인한 일반적 특성:

- Base36 = "JS `toString(radix)` 최대 radix(36)를 사용한, JS 기본 제공 가장 짧은 알파뉴메릭 표현"
- 추가 라이브러리 없이 `toString(36)` 한 줄로 가능
- 업계 관용적 패턴 (Reddit, TinyURL 등)

| 인덱스 | 10진수 | 36진수 |
|--------|--------|--------|
| 35 | `"35"` (2글자) | `"z"` (1글자) |
| 999 | `"999"` (3글자) | `"rr"` (2글자) |

Sources: [Base36 - Wikipedia](http://taggedwiki.zubiaga.org/new_content/4371ed6069e9f63139c02a0e20563432), [GitHub Gist](https://gist.github.com/graste/615e263e7a99fa03a776), [MDN toString()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/toString)

---

**Q: 10진수로 대체 가능합니까?**

A: 소스 코드 기반 검증 결과, 대체 가능하다. `$` 접두사가 사용자 키와 인덱스 키를 분리하고, 경로 구분자(`.`, `:`)는 어느 진법의 문자셋과도 겹치지 않으므로, `toString(10)`으로 바꿔도 키 충돌은 발생하지 않는다. 유일한 차이는 문자열 길이뿐.

---

**Q: 그러면 문자열 길이가 10진수보다 약간 짧을 경우가 높겠군요?**

A: 맞다. 인덱스 0~9는 동일, 10~35에서 36진수가 1자리 짧음, 36~99에서 동일, 100 이상에서 다시 36진수가 짧아짐. children 수가 10개 미만이면 차이 없고, 많아질수록 36진수가 점점 유리.

---

### 연결 토픽
- **Lazy/Thenable children 처리 (Step 1.3)**: children이 Promise/lazy일 때 resolveThenable의 동기적 해결 메커니즘
- **ReactContext (Step 2)**: createContext의 Provider/Consumer 순환 참조와 dual renderer
- **ReactBaseClasses (Step 3)**: Component/PureComponent updater 주입 패턴
- **ReactAct (Step 4)**: act() 테스트 유틸리티의 actQueue/flushActQueue 메커니즘
- **Taint API (Step 5)**: RSC 직렬화 보안과 FinalizationRegistry
- **Reconciliation (Topic 6)**: ReactChildFiber.js에서의 children reconciliation — Children.map과 다른 경로

---
