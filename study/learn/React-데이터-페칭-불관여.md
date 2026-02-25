# React-데이터-페칭-불관여

> 최초 질문: react에서는 왜 fetch나 mutate에 관여를 안할까요?
> 일시: 2026-02-25

---

## Q1. react에서는 왜 fetch나 mutate에 관여를 안할까요?

### 비유: 공항 안내 전광판

React를 **공항 안내 전광판**에 비유하면 이 질문의 핵심이 선명해진다.

| 공항 전광판 | React |
|------------|-------|
| 전광판 자체 | React 컴포넌트 트리 (렌더링 엔진) |
| 항공편 데이터 시스템 (FIDS) | 데이터 페칭 레이어 (React Query, SWR, Relay 등) |
| 개별 항공편 상태 | `state` / `props` 한 조각 |
| 데이터 시스템이 상태를 갱신 | `setState()` 호출 |
| 전광판이 새 데이터로 화면 갱신 | React reconciliation → commit |

**핵심**: 전광판은 항공기의 위치를 추적하거나, 기상청에 날씨를 물어보지 않는다. 전광판의 유일한 책임은 **"주어진 데이터를 정확하게 표시하는 것"**이다. 항공편 데이터를 수집/캐싱/동기화하는 건 전혀 다른 시스템(FIDS)의 몫이다.

React도 마찬가지다. React의 핵심 계약은 `state → UI` 매핑이다. 데이터를 **어디서** 가져오고, **어떻게** 캐싱하고, **언제** 무효화하는지는 React의 관심사가 아니다.

### 코드/텍스트 설명

#### 1. React의 핵심 계약: `state → UI`

React의 모든 리렌더링은 `scheduleUpdateOnFiber`라는 단일 관문을 통과한다. 이 함수는 **"어떤 fiber에, 어떤 우선순위로 업데이트가 있다"**만 알면 된다. 데이터가 fetch에서 왔든, WebSocket에서 왔든, localStorage에서 왔든 상관없다.

```
// ref/react-fork/packages/react-reconciler/src/ReactFiberWorkLoop.js:967
export function scheduleUpdateOnFiber(root, fiber, lane)
```

비유 매칭: 전광판(React)은 데이터가 레이더에서 왔든 수동 입력이든 **입력 채널을 구분하지 않는다**. 그냥 "새 데이터가 왔으니 화면을 갱신"할 뿐이다.

#### 2. `use()` 훅 — "프로토콜"이지 "구현"이 아니다

React 19의 `use()` 훅은 데이터 페칭에 관여하는 것처럼 보이지만, 실제로는 **Thenable(Promise)을 소비하는 프로토콜**일 뿐이다:

```js
// ref/react-fork/packages/react-reconciler/src/ReactFiberHooks.js:1150-1165
function use<T>(usable: Usable<T>): T {
  if (usable !== null && typeof usable === 'object') {
    if (typeof usable.then === 'function') {
      const thenable: Thenable<T> = (usable: any);
      return useThenable(thenable);   // ← Promise를 "읽기"만 함
    } else if (usable.$$typeof === REACT_CONTEXT_TYPE) {
      const context: ReactContext<T> = (usable: any);
      return readContext(context);
    }
  }
  throw new Error('An unsupported type was passed to use(): ' + String(usable));
}
```

`use()`는 Promise를 **만들지도, 캐싱하지도, 재시도하지도 않는다**. `.then`이 있는 객체를 받아서 상태(`fulfilled`/`rejected`/`pending`)를 확인하고, pending이면 `SuspenseException`을 throw하여 렌더를 중단할 뿐이다.

#### 3. `trackUsedThenable` — 캐싱도 외부에 위임

```js
// ref/react-fork/packages/react-reconciler/src/ReactFiberThenable.js:144-149
console.error(
  'A component was suspended by an uncached promise. Creating ' +
    'promises inside a Client Component or hook is not yet ' +
    'supported, except via a Suspense-compatible library or framework.',
);
```

React는 **직접 Promise를 만들지 말라**고 경고한다. "Suspense-compatible library or framework"(React Query, SWR, Relay, Next.js 등)가 Promise 생성과 캐싱을 담당하고, React는 그 결과를 소비만 한다.

#### 4. 왜 이런 설계를 선택했는가 — 3가지 이유

**이유 1: 관심사 분리 (Single Responsibility)**

데이터 페칭에는 HTTP 통신, 캐싱, 재시도, 중복 요청 제거, optimistic update, 에러 복구 등 **렌더링과 완전히 독립적인 복잡성**이 있다. 이걸 React에 넣으면 React가 "UI 렌더링 라이브러리"가 아니라 "프레임워크"가 된다.

추론: React 팀은 "React the library"(클라이언트 렌더링)와 "React as architecture"(프레임워크 수준 의견)를 명확히 구분한다. 데이터 페칭 의견은 후자에 속하며, Next.js/Remix/Relay 같은 프레임워크 레벨에서 구현된다.

**이유 2: 데이터 소스 다양성**

REST, GraphQL, WebSocket, IndexedDB, localStorage, Web Worker — 데이터 소스는 무한히 다양하다. React가 특정 페칭 방식을 내장하면, 나머지 소스와의 호환이 어색해진다. 대신 React는 **범용 프로토콜(Thenable/Promise)**만 제공하여 어떤 데이터 소스든 통합할 수 있게 한다.

출처: [Dan Abramov의 코멘트](https://dev.to/dan_abramov/comment/6kdc)

**이유 3: 캐싱 전략의 다양성**

stale-while-revalidate, time-based invalidation, normalized cache, optimistic cache — 캐싱 전략은 앱마다 다르다. React가 하나를 선택하면 나머지가 불가능해진다. React는 `state → UI` 계약만 유지함으로써, 어떤 캐싱 전략이든 `setState`를 호출하는 것만으로 통합할 수 있다.

### 시각화

```
┌─────────────────────────────────────────────────────────┐
│                    React의 경계                          │
│                                                          │
│  ┌──────────────┐    state/props    ┌────────────────┐  │
│  │  Component    │ ───────────────→  │  Reconciler     │  │
│  │  Tree         │                   │  (Fiber)        │  │
│  │              │  ← SuspenseExn ─  │                 │  │
│  └──────┬───────┘                   └───────┬─────────┘  │
│         │ use(promise)                      │ commit      │
│         │                                   ▼             │
│  ┌──────┴───────┐                   ┌────────────────┐  │
│  │  Thenable     │                   │  DOM / Host    │  │
│  │  Protocol     │                   │  (화면 갱신)    │  │
│  └──────▲───────┘                   └────────────────┘  │
│         │                                                │
├─────────┼────────────────────────────────────────────────┤
│         │  Promise 제공                                   │
│  ┌──────┴───────────────────────────────────────────┐   │
│  │           외부 데이터 레이어 (React 바깥)          │   │
│  │  React Query  │  SWR  │  Relay  │  직접 fetch     │   │
│  │  캐싱, 재시도, 중복 제거, 무효화, optimistic...    │   │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Q2. RSC 이후 react.cache() 내장 제공은 "state → UI" 명제를 깨뜨린 것 아닌가?

### 비유 수정: 전광판에서 "스마트 전광판"으로

이전 비유를 정정한다. RSC 이전의 React는 **단순 전광판**이었지만, RSC 이후의 React는 **항공편 데이터를 직접 조회할 수 있는 스마트 전광판**이다.

| 이전 (클라이언트 React) | 이후 (RSC 포함 React) |
|-------------------------|----------------------|
| 전광판: 데이터만 표시 | 스마트 전광판: 직접 DB 조회 가능 |
| FIDS가 데이터 수집 → 전광판에 전달 | 전광판 자체가 항공편 시스템에 접근 |
| `cache`는 외부 라이브러리의 몫 | `react.cache()`를 내장 제공 |
| 컴포넌트는 동기 함수 | 서버 컴포넌트는 `async` 함수 가능 |

비유 한계: 다만 스마트 전광판도 "HTTP 클라이언트를 내장"한 건 아니다. `fetch` 자체를 React가 만든 게 아니라, `async` 컴포넌트 안에서 사용자가 호출한 `fetch`의 **결과를 캐싱하는 인프라**를 제공한 것이다.

### 코드 설명: "깨졌는가?"에 대한 정직한 분석

결론부터: **반은 깨졌고, 반은 안 깨졌다.**

#### 깨진 부분: React가 캐싱에 직접 관여한다

`react.cache()`의 실제 구현:

```js
// ref/react-fork/packages/react/src/ReactCacheImpl.js:55-127
export function cache<A: Iterable<mixed>, T>(fn: (...A) => T): (...A) => T {
  return function () {
    const dispatcher = ReactSharedInternals.A;
    if (!dispatcher) {
      return fn.apply(null, arguments); // dispatcher 없으면 캐싱 없이 실행
    }
    const fnMap = dispatcher.getCacheForType(createCacheRoot);
    // ... 인자를 키로 사용하여 트리 구조 캐시 탐색 ...
    if (cacheNode.s === TERMINATED) {
      return cacheNode.v;  // 캐시 히트
    }
    const result = fn.apply(null, arguments);
    terminatedNode.s = TERMINATED;
    terminatedNode.v = result;
    return result;  // 캐시 미스 → 실행 후 저장
  };
}
```

이건 **메모이제이션**이다. React가 `(함수 + 인자) → 결과`를 **request 스코프 내에서 캐싱**한다. "React는 캐싱에 관여하지 않는다"는 명제와 명확히 충돌한다.

서버에서 이 캐시의 저장소는 `request.cache`:

```js
// ref/react-fork/packages/react-server/src/flight/ReactFlightAsyncDispatcher.js:15-21
function resolveCache(): Map<Function, mixed> {
  const request = resolveRequest();
  if (request) {
    return getCache(request);  // ← request 단위 캐시
  }
  return new Map();
}

// ref/react-fork/packages/react-server/src/ReactFlightServer.js:696
this.cache = new Map();  // ← RSC request마다 새 캐시 생성
```

React가 **request-scoped 캐시 인프라를 직접 소유**한다.

#### 안 깨진 부분: React는 여전히 "fetch를 호출"하지 않는다

**1. `cache()`는 "무엇을 fetch할지" 모른다**

`cache()`는 임의의 함수를 메모이제이션하는 범용 도구이다. HTTP, DB, 파일 시스템 — 안에서 무엇을 하든 상관없다. React는 `fn`의 내부를 알지도, 관여하지도 않는다.

**2. 서버 컴포넌트의 `async`도 "프로토콜"이다**

```js
// ref/react-fork/packages/react-server/src/ReactFlightServer.js:1772
result = Component(props, secondArg);  // ← 그냥 함수 호출
```

React는 컴포넌트를 그냥 함수로 호출한다. `result`가 Promise면 대기할 뿐, React가 네트워크 요청을 시작하는 코드는 한 줄도 없다.

**3. 클라이언트에서 `cache()`는 noop이다**

```js
// ref/react-fork/packages/react/src/ReactCacheClient.js:16-33
function noopCache<A: Iterable<mixed>, T>(fn: (...A) => T): (...A) => T {
  // On the client (i.e. not a Server Components environment) `cache` has
  // no caching behavior. We just return the function as-is.
  //
  // We intend to implement client caching in a future major release.
  return function () {
    return fn.apply(null, arguments);
  };
}
```

클라이언트 React의 경계를 의식적으로 지키고 있다는 증거이다.

#### 수정된 명제

| 관심사 | React가 관여하는가? | 근거 |
|--------|-------------------|------|
| HTTP 호출/WebSocket/DB 쿼리 | **아니오** | `fetch`, `prisma`, `sql` 등은 전부 사용자 코드 |
| 서버 요청 단위 메모이제이션 | **예 (서버만)** | `react.cache()` + `request.cache` |
| 클라이언트 캐싱 (stale-while-revalidate 등) | **아니오** | `ReactCacheClient.js:17` — noop |
| async 컴포넌트 지원 | **예 (서버만)** | RSC에서 `async function` 컴포넌트 허용 |
| 캐시 무효화/재검증 | **아니오** | Next.js의 `revalidateTag` 등은 프레임워크 레벨 |
| Optimistic update | **아니오** | React Query/SWR/Relay의 영역 |

### 시각화

```
데이터 흐름:  Transport → Caching → State → UI

                     React의 관여 범위
─────────────────────────────────────────────────────
 Before RSC:                          [state → UI]
 After RSC:              [cache ──── state → UI]
                          (서버만)

 여전히 React 밖:
 [transport]              [invalidation]  [optimistic]
  fetch()                  revalidateTag   useMutation
  prisma.find()            revalidatePath
  sql``                    cache tags
```

추론: React 팀은 의도적으로 **"라이브러리 vs 아키텍처"** 경계를 확장하고 있다. `cache()`는 그 확장의 첫 발걸음이고, 클라이언트 `cache()`는 "future major release"에서 구현 예정이라고 주석에 명시되어 있다(`ReactCacheClient.js:21`). 경계선은 계속 왼쪽으로 이동 중이다.

---

## Q3. React 18+ 내장 프리미티브로 react-query를 대체할 수 있지 않은가? 2-3번 관계가 모호해졌다

### 비유: 주방의 역할 분담 변화

**이전 (React 17 이하):**

| 역할 | 담당 | 비유 |
|------|------|------|
| 1. 재료 구매 (fetch) | `fetch`/`axios` | 시장에서 재료 사기 |
| 2. 냉장고 관리 (cache/state) | react-query | 재료 보관, 유통기한 관리, 재주문 |
| 3. 요리 → 서빙 (UI) | React | 접시에 담아 내놓기 |

주방(React)은 냉장고(캐시)를 **갖고 있지 않았다**. 별도 냉장고 업체(react-query)를 데려와야 했다.

**이후 (React 18+):**

| 역할 | 담당 | 비유 |
|------|------|------|
| 1. 재료 구매 (fetch) | 여전히 `fetch`/`axios` | 변화 없음 |
| 2+3. 냉장고 + 요리 + 서빙 | **React 자체** | 주방에 냉장고가 빌트인 |

React가 **빌트인 냉장고**(cache, Suspense, useActionState, useOptimistic)를 장착하면서, 2번과 3번의 경계가 녹았다.

비유 한계: 다만 이 빌트인 냉장고는 "기본형"이다. 유통기한 자동 관리(stale-while-revalidate), 자동 재주문(background refetch), 재고 실시간 모니터링(devtools) 같은 고급 기능은 없다. react-query는 **스마트 냉장고**이다.

### 코드/텍스트 설명: React 내장 프리미티브 vs react-query 매핑

#### 1. Promise 언래핑 + 로딩/에러 상태 → 완전히 대체 가능

```js
// React 18+ 내장
<ErrorBoundary fallback={<Error />}>
  <Suspense fallback={<Loading />}>
    <UserProfile id={id} />
  </Suspense>
</ErrorBoundary>

function UserProfile({ id }) {
  const user = use(fetchUser(id));
  return <div>{user.name}</div>;
}
```

소스 근거 — `use()`는 thenable의 상태를 확인하고, pending이면 `SuspenseException`을 throw한다:

```js
// ref/react-fork/packages/react-reconciler/src/ReactFiberThenable.js:193-202
switch (thenable.status) {
  case 'fulfilled': return thenable.value;
  case 'rejected':  throw thenable.reason;
  default:          /* pending → SuspenseException throw → Suspense fallback */
}
```

#### 2. Mutation + pending 상태 → 대체 가능

`useActionState`가 action + pending + 결과를 하나로 묶는다:

```js
// ref/react-fork/packages/react-reconciler/src/ReactFiberHooks.js:2355-2437
function mountActionState(action, initialState) {
  const stateHook = mountWorkInProgressHook();           // 결과 상태
  const pendingStateHook = mountStateImpl(false);         // isPending
  const actionQueueHook = mountWorkInProgressHook();      // 액션 큐 (순차 실행)
  return [initialState, dispatch, false];
  //      ↑ state      ↑ action   ↑ isPending
}
```

#### 3. Optimistic Update → 대체 가능

```js
// ref/react-fork/packages/react-reconciler/src/ReactFiberHooks.js:1948
function mountOptimistic<S, A>(passthrough: S, reducer: ?(S, A) => S)
```

`useOptimistic`은 서버 응답 전에 UI를 먼저 갱신하고, 실제 결과가 오면 되돌리는 패턴을 내장한다.

#### 4. Transition으로 async 흐름 제어 → 대체 가능

```js
// ref/react-fork/packages/react-reconciler/src/ReactFiberHooks.js:3151-3173
if (typeof returnValue.then === 'function') {
  const thenable = returnValue;
  const thenableForFinishedState = chainThenableValue(thenable, finishedState);
  dispatchSetStateInternal(fiber, queue, thenableForFinishedState, ...);
}
```

`startTransition`이 async 함수를 받으면, Promise가 resolve될 때까지 이전 UI를 유지한다.

### 기능별 대체 가능 여부

```
react-query 기능            React 내장 대체              커버 여부
─────────────────────────────────────────────────────────────
Promise → data/loading/err  use() + Suspense + ErrBound   ✅ 완전
mutation + isPending        useActionState                 ✅ 완전
optimistic update           useOptimistic                  ✅ 완전
async 흐름 제어             startTransition                ✅ 완전
request 중복 제거           cache() (서버)                 ⚠️ 서버만
─────────────────────────────────────────────────────────────
stale-while-revalidate      없음                           ❌
background refetch          없음                           ❌
window focus refetch        없음                           ❌
polling / interval          없음                           ❌
query key 기반 무효화       없음                           ❌
infinite scroll pagination  없음                           ❌
offline 지원                없음                           ❌
devtools                    없음                           ❌
```

✅ 영역 = "요청 → UI 반영"의 기본 사이클. 이제 React만으로 충분하다.

❌ 영역 = "캐시 운영". 데이터를 한번 가져온 뒤 **시간이 흐르면서** 발생하는 문제들 — 언제 stale로 볼 것인가, 언제 다시 가져올 것인가, 어떤 키를 무효화할 것인가. 여전히 React의 범위 밖이다.

### 시각화: 3-step 모델의 변화

```
[Before React 18]

  Step 1              Step 2                    Step 3
  Transport           Promise + Cache Control   UI
  ─────────           ─────────────────────     ────────
  fetch/axios    →    react-query             → React
                      ├ useQuery                ├ 컴포넌트
                      ├ useMutation             ├ 조건부 렌더링
                      ├ caching                 └ JSX
                      ├ refetching
                      └ devtools

  ┃ 경계 명확 ┃          ┃ 경계 명확 ┃


[After React 18+ / RSC]

  Step 1              Step 2+3 (융합)
  Transport           React 자체
  ─────────           ──────────────────────────────
  fetch/axios    →    use()         ← Promise 소비
                      Suspense      ← 로딩 상태
                      ErrorBoundary ← 에러 상태
                      useActionState ← mutation
                      useOptimistic  ← 낙관적 갱신
                      startTransition ← async 제어
                      cache()        ← 중복 제거 (서버)

                      ┃ 여전히 React 밖 ┃
                      ─────────────────────
                      stale-while-revalidate
                      background refetch
                      query invalidation
                      polling, devtools ...
                      → react-query가 여전히 필요한 영역
```

추론: React 18+은 **"요청 → UI 반영" 기본 사이클**에서 react-query를 대체할 수 있다. 남은 갭은 **"시간 기반 캐시 운영"** — 이것이 react-query를 여전히 쓰는 진짜 이유이고, React가 아직 "의도적으로" 넘지 않은 경계선이다.

---

## 연결

| 대상 토픽 | 관계 | 근거 |
|-----------|------|------|
| `study/learn/React-리렌더링-트리거.md` | 하위 메커니즘 | 외부 라이브러리가 `setState`를 호출하면 결국 `scheduleUpdateOnFiber`로 이어짐. RSC에서 `cache()`된 결과도 클라이언트 hydration 시 같은 경로 통과 |
| `study/learn/scheduleUpdateOnFiber.md` | 하위 메커니즘 | React의 유일한 리렌더링 입구. `useActionState`의 dispatch, `startTransition` 모두 내부적으로 `dispatchSetState` → `scheduleUpdateOnFiber` 경로 |


---

## 2026-02-25 (via /learn)

Q1: React가 fetch/mutate에 관여하지 않는 이유 — state→UI 매핑이 핵심 계약, use()는 Thenable 소비 프로토콜일 뿐, transport/caching/invalidation은 외부 레이어 몫. Q2: RSC의 cache()가 명제를 깨뜨리는가 — 반은 깨짐(서버 request-scoped 캐싱 직접 소유), 반은 안 깨짐(transport 관여 없음, 클라이언트 cache()는 noop). Q3: React 18+ 프리미티브로 react-query 대체 가능한가 — 기본 사이클(use+Suspense+useActionState+useOptimistic)은 대체 가능, 시간 기반 캐시 운영(SWR/refetch/invalidation/polling)은 여전히 React 밖.
