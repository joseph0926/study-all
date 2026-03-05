# Transcript: useEffect 실무 패턴
> 날짜: 2026-03-05 | 클라이언트: claude-code | 메시지: 73개

---

## [08:38:51] AI

> [ROUTINE] Phase 1/5 | useEffect 실무 패턴 | Q&A: 0 | 경과: 1분

---

## Phase 1: 탐색 — useEffect 실무 패턴

useRef, useReducer에 이어 useEffect입니다. 이전 세션들에서 Fiber/Hook 링크드 리스트 구조를 이미 다뤘으니, 그 위에서 useEffect가 어떻게 동작하는지 탐색해봅시다.

먼저 큰 그림부터 잡겠습니다.

### useEffect의 핵심 멘탈 모델

**비유: 호텔 체크인/체크아웃 시스템**

| useEffect | 호텔 |
|-----------|------|
| effect 함수 | 체크인 절차 (방 배정, 짐 정리) |
| cleanup 함수 | 체크아웃 절차 (방 청소, 키 반납) |
| 의존성 배열 | 예약 조건 (조건이 바뀌면 재배정) |
| `[]` 빈 배열 | 장기 투숙 (체크인 1번, 체크아웃은 퇴실 시) |
| 배열 없음 | 매일 체크아웃 → 재체크인 |

핵심: **체크아웃(cleanup)이 먼저, 그 다음 체크인(effect)**. 이전 effect를 정리한 후 새 effect를 실행합니다.

### useEffect 실행 타이밍

```
렌더 Phase          커밋 Phase           브라우저 페인트 후
─────────────       ─────────────       ─────────────────
컴포넌트 호출  →    DOM 변경 적용  →    ┌ cleanup (이전 effect)
state 계산          ref 업데이트        └ effect 실행 (새 effect)
vDOM 생성                                    ↑
                                        비동기! (setTimeout과 유사)
```

- `useEffect`는 **페인트 후 비동기**로 실행됩니다
- `useLayoutEffect`는 **페인트 전 동기**로 실행됩니다
- 이 차이가 실무에서 큰 영향을 미칩니다

---

여기서부터 자유롭게 탐색합시다. 어떤 부분이 가장 궁금한가요?

1. **의존성 배열 함정** — 빠지기 쉬운 stale closure, 불필요한 재실행 등
2. **cleanup 타이밍과 패턴** — 구독 해제, 타이머 정리, AbortController 등
3. **데이터 페칭 패턴** — useEffect로 fetch하는 것의 문제점과 대안
4. **useEffect vs useLayoutEffect** — 언제 어떤 것을 써야 하는지

또는 다른 방향도 환영합니다!

---

## [08:39:56] 사용자

1->2->3->4

---

## [08:40:01] AI

> [ROUTINE] Phase 1/5 | useEffect 실무 패턴 | Q&A: 0 | 경과: 2분

좋습니다, 순서대로 갑시다! 먼저 **의존성 배열 함정**부터.

소스코드에서 의존성 비교 로직을 찾아보겠습니다.

---

## [08:40:06] AI



> 도구 호출: Agent

---

## [08:41:15] AI



> [ROUTINE] Phase 1/5 | useEffect 실무 패턴 | Q&A: 1 | 경과: 3분

## 1. 의존성 배열 함정

### 핵심: Object.is로 비교한다

소스코드를 확인했습니다. `ReactFiberHooks.js:453-500`의 `areHookInputsEqual`:

```js
// ref/react/packages/react-reconciler/src/ReactFiberHooks.js:453
function areHookInputsEqual(nextDeps, prevDeps) {
  if (prevDeps === null) return false;  // mount → 항상 실행
  
  for (let i = 0; i < prevDeps.length && i < nextDeps.length; i++) {
    if (is(nextDeps[i], prevDeps[i])) continue;  // Object.is()
    return false;
  }
  return true;
}
```

**비유: 호텔 예약 조건표**
- 각 의존성 = 예약 조건 한 줄
- `Object.is`로 비교 = **같은 종이인지** 확인 (내용이 아니라 동일 참조)
- 조건이 하나라도 바뀌면 → 체크아웃 + 재체크인

### 함정 1: 매 렌더마다 새 객체/배열

```js
// ❌ 매 렌더마다 새 객체 생성 → Object.is 실패 → 무한 재실행
useEffect(() => {
  fetchUser(filter);
}, [{ status: 'active' }]);  // 매번 새 객체!

// ✅ 원시값으로 분해
useEffect(() => {
  fetchUser(filter);
}, [filter.status]);  // 문자열 비교 → 안정적
```

### 함정 2: Stale Closure

```js
function Timer() {
  const [count, setCount] = useState(0);
  
  // ❌ count가 항상 0 (클로저가 초기값 캡처)
  useEffect(() => {
    const id = setInterval(() => {
      console.log(count);  // 항상 0!
      setCount(count + 1); // 항상 1로 설정!
    }, 1000);
    return () => clearInterval(id);
  }, []);  // 빈 배열 → 재실행 안 됨 → 클로저 갱신 안 됨

  // ✅ 함수형 업데이트로 해결
  useEffect(() => {
    const id = setInterval(() => {
      setCount(prev => prev + 1);  // 최신 state 참조
    }, 1000);
    return () => clearInterval(id);
  }, []);
}
```

**비유 한계:** 클로저 문제는 호텔 비유로 설명이 어렵습니다. 별도 비유: **사진 vs 창문**
- 빈 배열 `[]` = 체크인 당시 **사진**을 찍어 벽에 걸어둔 것 (값이 고정)
- 의존성에 포함 = **창문**을 열어 밖을 보는 것 (항상 최신)
- 함수형 업데이트 `prev =>` = 사진 없이 **현재 방 상태를 직접 확인**하는 것

### 함정 3: 함수를 의존성에 넣기

```js
// ❌ fetchData가 매 렌더마다 새 함수 → effect 무한 실행
function Component({ userId }) {
  const fetchData = () => fetch(`/api/${userId}`);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);  // 매번 새 참조!

  // ✅ 방법 1: useCallback
  const fetchData = useCallback(() => fetch(`/api/${userId}`), [userId]);

  // ✅ 방법 2: effect 안으로 이동 (더 간단)
  useEffect(() => {
    const fetchData = () => fetch(`/api/${userId}`);
    fetchData();
  }, [userId]);
}
```

### 내부 동작 시각화

```
updateEffectImpl (ReactFiberHooks.js:2631)
│
├─ nextDeps !== null?
│   ├─ Yes → areHookInputsEqual(nextDeps, prevDeps)
│   │         ├─ true  → pushSimpleEffect(hookFlags)        ← HookHasEffect 없음 → 실행 안 됨
│   │         └─ false → pushSimpleEffect(HookHasEffect)    ← 실행됨!
│   └─ No (deps 없음) → 항상 HookHasEffect → 매번 실행
│
└─ effect → Fiber.updateQueue (원형 연결 리스트)
```

`HookHasEffect` 플래그가 있어야만 커밋 Phase에서 실제로 effect가 실행됩니다 (`ReactFiberHooks.js:2631-2669`).

---

궁금한 점 있으면 질문하시고, 괜찮으면 **2. cleanup 타이밍과 패턴**으로 넘어갑니다!

---

## [08:45:18] 사용자

전체적으로 Object.is 비교이므로 참조가 바뀌면 useEffect의 setup 함수가 재실행된다는게 기본 베이스이고,
함정1은 의존성 배열에서 참조타입을 넣으면 매 렌더마다 참조가 재생성되므로 setup함수가 계속 재실행됨
함정2는 useState의 패턴아닌가요? (함수형 인자가 아니면 클로저를 참조하여 최신값 보장이안된는)
함정3은 함정 1과 비슷한것이고

---

## [08:45:26] AI



> 도구 호출: mcp__study__routine_appendEntry

---

## [08:45:38] AI

> [ROUTINE] Phase 1/5 | useEffect 실무 패턴 | Q&A: 1 | 경과: 5분

정확합니다. 함정 2에 대해 좋은 지적입니다.

stale closure는 **useEffect 고유 문제가 아니라 클로저 + setState 패턴의 문제**입니다. `setInterval` 안에서 `count`를 직접 참조하면 클로저가 캡처한 시점의 값에 갇히는 건 useEffect든 어디든 동일하죠.

useEffect에서 이게 자주 등장하는 이유는 `[]` 빈 배열로 "한 번만 실행"을 의도하면서 내부에서 외부 변수를 참조하는 패턴이 흔하기 때문입니다. 하지만 본질은 **의존성 누락**입니다.

정리하면 useEffect 의존성 함정의 본질은 딱 하나:

```
참조 동일성(Object.is) 기반 비교
├─ 참조타입을 deps에 넣음 → 매번 새 참조 → 불필요한 재실행 (함정 1, 3)
└─ deps에서 빼놓고 내부에서 참조 → 의존성 누락 → stale 값 (함정 2의 본질)
```

---

## 2. Cleanup 타이밍과 패턴

cleanup이 언제, 어떤 순서로 실행되는지 소스에서 확인해보겠습니다.

---

## [08:45:40] AI



> 도구 호출: Grep

---

## [08:45:44] AI



> 도구 호출: Grep

---

## [08:45:48] AI



> 도구 호출: Grep

---

## [08:45:52] AI



> 도구 호출: Read

---

## [08:45:53] AI



> 도구 호출: Read

---

## [08:45:57] AI



> 도구 호출: Grep

---

## [08:46:01] AI



> 도구 호출: Grep

---

## [08:46:05] AI



> 도구 호출: Grep

---

## [08:46:08] AI



> 도구 호출: Grep

---

## [08:46:12] AI



> 도구 호출: Grep

---

## [08:46:15] AI



> 도구 호출: Read

---

## [08:46:19] AI



> 도구 호출: Grep

---

## [08:46:40] AI

이제 전체 그림이 보입니다. 핵심 호출 순서를 확인했습니다.

### Cleanup 실행 순서 (소스 근거)

`ReactFiberWorkLoop.js:4742-4743`에서 순서가 확정됩니다:

```js
// ReactFiberWorkLoop.js:4742-4743
commitPassiveUnmountEffects(root.current);  // 1. 먼저 모든 cleanup 실행
commitPassiveMountEffects(root, ...);       // 2. 그 다음 모든 effect 실행
```

**cleanup 실행 로직** (`ReactFiberCommitEffects.js:248-293`):

```js
function commitHookEffectListUnmount(flags, finishedWork, ...) {
  const lastEffect = updateQueue.lastEffect;
  let effect = firstEffect;
  do {
    if ((effect.tag & flags) === flags) {
      const destroy = inst.destroy;     // cleanup 함수
      if (destroy !== undefined) {
        inst.destroy = undefined;        // 한 번만 실행되도록
        safelyCallDestroy(..., destroy); // try-catch로 안전 호출
      }
    }
    effect = effect.next;  // 원형 연결 리스트 순회
  } while (effect !== firstEffect);
}
```

### 시각화: Cleanup 타이밍

```
컴포넌트 A (deps 변경)     컴포넌트 B (언마운트)
         │                          │
         ▼                          ▼
    ┌─ 렌더 Phase ──────────────────────┐
    │  A 재렌더  →  B 제거 예약          │
    └────────────────────────────────────┘
                    │
    ┌─ 커밋 Phase ──┼────────────────────┐
    │  DOM 변경 적용                      │
    └───────────────┼────────────────────┘
                    │
    ┌─ 페인트 후 ───┼────────────────────┐
    │                                     │
    │  Phase 1: 모든 cleanup 먼저        │
    │    A의 이전 cleanup()              │
    │    B의 cleanup()                    │
    │                                     │
    │  Phase 2: 모든 effect 실행         │
    │    A의 새 effect()                 │
    │    (B는 언마운트 → effect 없음)     │
    └─────────────────────────────────────┘
```

핵심: **모든 컴포넌트의 cleanup이 먼저 → 그 다음 모든 effect가 실행**. 개별 컴포넌트 단위가 아닙니다.

### 실무 Cleanup 패턴 3가지

**1. 구독 해제**
```js
useEffect(() => {
  const sub = eventEmitter.subscribe(handler);
  return () => sub.unsubscribe();  // 이전 구독 해제 후 새 구독
}, [handler]);
```

**2. 타이머 정리**
```js
useEffect(() => {
  const id = setTimeout(() => setShow(true), 1000);
  return () => clearTimeout(id);  // 리렌더 시 이전 타이머 취소
}, []);
```

**3. AbortController (fetch)**
```js
useEffect(() => {
  const controller = new AbortController();
  fetch(url, { signal: controller.signal })
    .then(res => res.json())
    .then(setData)
    .catch(err => {
      if (err.name !== 'AbortError') throw err;
    });
  return () => controller.abort();  // 이전 요청 취소
}, [url]);
```

---

여기까지 의존성 + cleanup 패턴입니다. 질문 있으면 하시고, 없으면 **3. 데이터 페칭 패턴**으로 넘어갑니다!

---

## [08:48:27] 사용자

클린업 함수를 써야하는 판단은 어떻게 해야 맞나요 ?

---

## [08:48:42] AI



> 도구 호출: mcp__study__routine_appendEntry

---

## [08:49:01] AI

> [ROUTINE] Phase 1/5 | useEffect 실무 패턴 | Q&A: 2 | 경과: 8분

좋은 질문입니다. 판단 기준은 하나입니다:

### "내가 만든 연결을 되돌려야 하는가?"

**비유: 캠핑장 규칙** — "떠날 때 왔을 때보다 깨끗하게"

```
effect가 뭔가를 시작/연결/변경했는가?
│
├─ Yes → cleanup 필요
│   ├─ 구독(subscribe)    → unsubscribe
│   ├─ 타이머(setTimeout) → clearTimeout
│   ├─ fetch 요청         → abort
│   ├─ 이벤트 리스너      → removeEventListener
│   ├─ DOM 수동 변경      → 원복
│   └─ 외부 라이브러리 인스턴스 → destroy
│
└─ No → cleanup 불필요
    ├─ console.log
    ├─ state 설정 (setCount)
    ├─ ref 값 저장 (ref.current = ...)
    └─ analytics 이벤트 발송 (fire-and-forget)
```

핵심 구분: **React 외부 시스템과 동기화(synchronize)**하는가?

| 패턴 | 외부 연결? | cleanup? |
|------|-----------|----------|
| `ws.connect()` | WebSocket 서버 | `ws.close()` |
| `el.addEventListener()` | 브라우저 이벤트 | `el.removeEventListener()` |
| `fetch(url)` | 네트워크 요청 | `controller.abort()` |
| `setInterval()` | 브라우저 타이머 | `clearInterval()` |
| `observer.observe(el)` | IntersectionObserver | `observer.disconnect()` |
| `document.title = x` | DOM 속성 | `document.title = prev` |
| `setData(result)` | ❌ React 내부 | 불필요 |
| `ref.current = value` | ❌ React 내부 | 불필요 |

### cleanup 안 하면 실제로 뭐가 터지나?

```js
// ❌ cleanup 없이 이벤트 리스너
useEffect(() => {
  window.addEventListener('resize', handler);
}, []);
// 컴포넌트 언마운트 → handler가 계속 살아있음 → 메모리 누수
// handler 안에서 setState → 언마운트된 컴포넌트에 업데이트 시도

// ❌ cleanup 없이 setInterval
useEffect(() => {
  setInterval(() => setCount(c => c + 1), 1000);
}, []);
// 컴포넌트 마운트/언마운트 반복 → 인터벌이 계속 쌓임 → 카운트 가속
```

한 줄 요약: **"effect가 React 바깥에 뭔가를 만들었으면, cleanup에서 치워라"**

질문 더 있으면 하시고, 없으면 **3. 데이터 페칭 패턴**으로!

---

## [08:50:07] 사용자

effect가 React 바깥에 뭔가를 만들었으면, cleanup에서 치워라 << effect 안의 로직으로 인해 사이드이펙트가 발생하면 cleanup해라 라는 말이죠?

---

## [08:50:22] AI



> 도구 호출: mcp__study__routine_appendEntry

---

## [08:50:33] AI

> [ROUTINE] Phase 1/5 | useEffect 실무 패턴 | Q&A: 3 | 경과: 10분

거의 맞는데, 미세한 구분이 있습니다.

useEffect **자체가** 사이드이펙트를 위한 것이라서, 그 안의 모든 것이 사이드이펙트입니다. 그래서 "사이드이펙트가 발생하면 cleanup"이라고 하면 전부 cleanup해야 하는 셈이 됩니다.

더 정확한 기준은 **지속성**입니다:

```
사이드이펙트의 종류
│
├─ Fire-and-forget (발사 후 잊어도 됨)
│   analytics.track('page_view')   → cleanup ❌
│   console.log('mounted')         → cleanup ❌
│   ref.current = value            → cleanup ❌
│
└─ Ongoing (지속적 연결/점유)
    addEventListener(...)          → cleanup ✅
    setInterval(...)               → cleanup ✅
    fetch(진행 중)                  → cleanup ✅
    ws.connect()                   → cleanup ✅
```

**"사이드이펙트가 발생하면"** 보다는 **"사이드이펙트가 계속 살아있으면"** cleanup이 필요하다가 더 정확합니다.

한 번 쏘고 끝나는 것은 치울 게 없고, 계속 돌아가는 것은 꺼줘야 하니까요.

다음 주제인 **데이터 페칭 패턴**으로 넘어갈까요?

---

## [08:50:56] 사용자

네 

---

## [08:51:22] AI



> [ROUTINE] Phase 1/5 | useEffect 실무 패턴 | Q&A: 3 | 경과: 11분

## 3. 데이터 페칭 패턴

### useEffect로 fetch하는 기본 패턴

```js
useEffect(() => {
  const controller = new AbortController();
  
  setLoading(true);
  fetch(`/api/user/${id}`, { signal: controller.signal })
    .then(res => res.json())
    .then(data => {
      setData(data);
      setLoading(false);
    })
    .catch(err => {
      if (err.name !== 'AbortError') {
        setError(err);
        setLoading(false);
      }
    });

  return () => controller.abort();
}, [id]);
```

### 이 패턴의 문제점들

**비유: 식당에서 주문하기**
- id가 바뀔 때마다 = 새 주문
- cleanup 없으면 = 이전 주문이 나중에 도착해서 현재 테이블에 올려놓음 (race condition)

```
문제 1: Race Condition
─────────────────────
id=1로 fetch 시작 ──── (느림) ──────────── 응답 도착 → setData(user1) ← 늦게 덮어씀!
id=2로 fetch 시작 ──── 응답 도착 → setData(user2)
                                            ↑ 이게 먼저 와도 user1이 나중에 덮어씀

해결: AbortController cleanup
id=1 fetch → abort! (취소됨)
id=2 fetch ──── 응답 도착 → setData(user2) ✅
```

```
문제 2: 보일러플레이트 폭발
─────────────────────
매 컴포넌트마다:
- loading 상태
- error 상태  
- AbortController
- catch에서 AbortError 분기
- 언마운트 시 setState 방지
→ 반복 코드가 너무 많음
```

```
문제 3: 워터폴
─────────────────────
Parent: useEffect → fetch('/api/user')
  └─ Child: useEffect → fetch('/api/posts')  ← Parent 렌더 후에야 시작
       └─ GrandChild: useEffect → fetch('/api/comments') ← 또 기다림

페인트 후 → 페인트 후 → 페인트 후 (순차적)
```

### 그래서 실무에서는?

| 방법 | 장점 | 단점 | 적합한 경우 |
|------|------|------|-----------|
| `useEffect + fetch` | 단순, 의존성 없음 | 보일러플레이트, race condition | 간단한 1회성 호출 |
| **React Query / SWR** | 캐싱, 자동 재검증, 상태 관리 | 라이브러리 의존 | 대부분의 실무 |
| **React Router loader** | 렌더 전 데이터 준비, 워터폴 없음 | 라우트 구조에 종속 | 라우트 기반 앱 |
| **RSC (서버 컴포넌트)** | 서버에서 직접 fetch, 번들 없음 | Next.js 등 프레임워크 필요 | SSR/SSG 앱 |

React 공식 문서도 이걸 인정합니다 — ["useEffect로 데이터를 가져오는 것은 인기 있는 방법이지만... 상당한 단점이 있습니다"](https://react.dev/reference/react/useEffect#fetching-data-with-effects)

### 핵심 포인트

```
useEffect + fetch를 쓰게 되는 상황
│
├─ 단순 1회성 호출, 라이브러리 추가 부담 → OK (AbortController 필수)
│
└─ 그 외 대부분
    ├─ 캐싱/재검증 필요 → React Query / SWR
    ├─ 라우트 전환 시 데이터 → loader (이전 세션에서 학습!)
    └─ SSR → RSC / getServerSideProps
```

useEffect fetch가 안티패턴이라기보다는, **"대부분의 실무 요구사항에 비해 너무 로우레벨"**이라는 것입니다.

---

질문 있으면 하시고, 없으면 마지막 **4. useEffect vs useLayoutEffect**로!

---

## [08:54:01] 사용자

네 4번으로 넘어가주세요

---

## [08:54:15] AI



> 도구 호출: mcp__study__routine_appendEntry

---

## [08:54:18] AI

소스에서 두 Hook의 차이를 확인하겠습니다.

---

## [08:54:20] AI



> 도구 호출: Grep

---

## [08:54:48] AI

> [ROUTINE] Phase 1/5 | useEffect 실무 패턴 | Q&A: 4 | 경과: 12분

## 4. useEffect vs useLayoutEffect

### 소스코드에서 차이 확인

두 Hook은 **같은 `mountEffectImpl` / `updateEffectImpl`을 호출**합니다. 차이는 **플래그 2개뿐**:

```js
// ReactFiberHooks.js:2686
mountEffectImpl(PassiveEffect, HookPassive, create, deps);     // useEffect

// ReactFiberHooks.js:2774-2781
mountEffectImpl(UpdateEffect, HookLayout, create, deps);       // useLayoutEffect
```

| | useEffect | useLayoutEffect |
|---|---|---|
| Fiber 플래그 | `PassiveEffect` | `UpdateEffect` |
| Hook 플래그 | `HookPassive` | `HookLayout` |
| **실행 시점** | 페인트 **후** (비동기) | 페인트 **전** (동기) |

같은 엔진, 다른 스케줄링입니다.

### 타이밍 시각화

```
렌더 Phase        커밋 Phase              브라우저
───────────       ──────────────          ─────────
컴포넌트 호출  →  DOM 변경 적용
                       │
                       ├─ useLayoutEffect  ← 여기서 동기 실행 (브라우저 블로킹)
                       │    cleanup → effect
                       │
                       ├─ 브라우저 페인트 ──→  화면에 반영
                       │
                       └─ useEffect         ← 페인트 후 비동기 실행
                            cleanup → effect
```

### 비유: 무대 연극

| | useLayoutEffect | useEffect |
|---|---|---|
| 비유 | **막간에 무대 세팅** | **공연 후 뒷정리** |
| | 관객이 보기 전에 소품 배치 | 관객이 본 후에 다음 준비 |
| | 관객은 완성된 장면만 봄 | 관객은 잠깐 이전 상태를 봄 |

### 실무: 언제 useLayoutEffect?

**useEffect로 충분한 경우 (99%)**
- 데이터 페칭
- 이벤트 리스너 등록
- 로깅/분석
- 구독 설정

**useLayoutEffect가 필요한 경우 (1%)**

```js
// 케이스 1: 레이아웃 측정 후 위치 조정
function Tooltip({ targetRef }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });

  // ❌ useEffect → 깜빡임! (초기 위치 페인트 → 올바른 위치로 이동)
  // ✅ useLayoutEffect → 페인트 전에 위치 계산 → 올바른 위치로 바로 표시
  useLayoutEffect(() => {
    const rect = targetRef.current.getBoundingClientRect();
    setPos({ x: rect.left, y: rect.bottom });
  }, [targetRef]);

  return <div style={{ position: 'absolute', left: pos.x, top: pos.y }}>...</div>;
}
```

```js
// 케이스 2: DOM 변경 직후 동기적으로 읽어야 할 때
useLayoutEffect(() => {
  const height = ref.current.scrollHeight;
  ref.current.style.height = `${height}px`;  // 페인트 전에 적용 → 깜빡임 없음
}, [content]);
```

```js
// 케이스 3: 스크롤 위치 복원
useLayoutEffect(() => {
  containerRef.current.scrollTop = savedScrollTop;
}, [savedScrollTop]);
```

### 판단 플로우

```
useEffect vs useLayoutEffect?
│
├─ "사용자가 중간 상태를 잠깐이라도 보면 안 되는가?"
│   ├─ Yes → useLayoutEffect
│   │   (깜빡임, 레이아웃 점프 방지)
│   └─ No  → useEffect (기본)
│
└─ 주의: useLayoutEffect는 동기 실행이므로
    오래 걸리면 프레임 드롭 발생!
```

---

Phase 1에서 4가지 주제를 모두 다뤘습니다:
1. 의존성 배열 함정 (Object.is, 참조 비교)
2. Cleanup 타이밍과 패턴 (지속적 연결이면 cleanup)
3. 데이터 페칭 (useEffect fetch는 로우레벨, 대안들)
4. useEffect vs useLayoutEffect (같은 엔진, 다른 스케줄링)

질문 더 있으면 하시고, `>>다음`으로 Phase 2 심화로 넘어갑니다!

---

## [09:30:32] 사용자

>>다음

---

## [09:30:39] AI



> 도구 호출: mcp__study__routine_appendEntry

---

## [09:30:43] AI



> 도구 호출: mcp__study__routine_appendEntry

---

## [09:30:46] AI



> 도구 호출: mcp__study__routine_readLog

---

## [09:31:08] AI

> [ROUTINE] Phase 2/5 | useEffect 실무 패턴 | Q&A: 5 | 경과: 52분

## Phase 2: 심화 — "왜 이렇게 만들었는가"

Phase 1에서 동작 원리와 실무 패턴을 다뤘으니, 이제 **설계 의도**를 파고듭니다.

### 2-A. 핵심 설계 질문: "왜 useEffect는 비동기인가?"

소스에서 확인한 것처럼, useEffect와 useLayoutEffect의 차이는 플래그 하나입니다:

```js
// useEffect:       PassiveEffect  + HookPassive   → 페인트 후 비동기
// useLayoutEffect: UpdateEffect   + HookLayout    → 페인트 전 동기
```

React 팀이 useEffect를 **기본을 비동기로** 설계한 이유:

- `componentDidMount`/`componentDidUpdate`는 동기였음 → 무거운 작업이 들어가면 **프레임 드롭**
- useEffect를 비동기로 만들면 → 브라우저가 먼저 페인트 → 사용자는 즉시 화면을 봄
- **트레이드오프**: 깜빡임 가능성 (레이아웃 측정 등) ↔ 기본 성능 향상

```
class 시절 (동기):
  render → componentDidMount(동기, 블로킹) → 페인트
  └─ 무거운 작업 시 사용자가 빈 화면을 봄

Hook 시절 (비동기 기본):
  render → 페인트 → useEffect(비동기)
  └─ 사용자가 먼저 화면을 봄 → 대부분의 경우 더 나은 UX
```

### 2-B. Effect 원형 연결 리스트 — 왜 이 구조인가?

Phase 1에서 본 `pushEffectImpl` (`ReactFiberCommitEffects.js`)에서 effect들은 **원형 연결 리스트**로 관리됩니다:

```
Fiber.updateQueue.lastEffect
    │
    ▼
  effect3 → effect1 → effect2 → effect3 (원형)
    ↑                              │
    └──────────────────────────────┘

lastEffect가 마지막을 가리키고, lastEffect.next가 첫 번째를 가리킴
```

**왜 배열이 아니라 원형 연결 리스트인가?**

1. **삽입 O(1)**: 배열은 push O(1)이지만, 원형 연결 리스트는 head/tail 접근이 모두 O(1)
2. **순회 보장**: `lastEffect.next`부터 시작 → `lastEffect`까지 순회 = 선언 순서대로 실행
3. **Fiber 전체 Hook 시스템과 일관성**: Hook 자체도 연결 리스트 (useRef 세션에서 학습!)

---

### 출제: AI → 사용자

Phase 1에서 배운 내용을 기반으로 질문합니다.

**Q1.** `commitPassiveUnmountEffects`가 `commitPassiveMountEffects`보다 **먼저** 호출되는 이유는 무엇일까요? 만약 순서가 반대라면 (mount → unmount) 어떤 문제가 생길까요?

---

## [09:34:10] 사용자

위 설명과 문제가 다른 범위를 내고있습니다

---

## [09:34:17] AI



> [ROUTINE] Phase 2/5 | useEffect 실무 패턴 | Q&A: 5 | 경과: 53분

맞습니다, 죄송합니다. Phase 2 심화와 출제가 Phase 1에서 다룬 범위 안에서 나와야 합니다.

Phase 1에서 다룬 **실무 패턴** 관점으로 돌아가겠습니다.

---

### 출제: AI → 사용자

**Q1.** 아래 코드에서 버그가 있습니다. 무엇이 문제이고, 왜 그런지 설명해주세요.

```js
function SearchResults({ query }) {
  const [results, setResults] = useState([]);

  useEffect(() => {
    fetch(`/api/search?q=${query}`)
      .then(res => res.json())
      .then(data => setResults(data));
  }, [query]);

  return <ul>{results.map(r => <li key={r.id}>{r.title}</li>)}</ul>;
}
```

---

## [09:35:46] 사용자

useEffect의 setup 함수는 렌더 후 실행됨, 반면 JSX 평가는 render 시점에 진행됨 -> 즉 r.id, r.title에서 r이 undefined일수있음

---

## [09:35:53] AI



> [ROUTINE] Phase 2/5 | useEffect 실무 패턴 | Q&A: 6 | 경과: 54분

흠, 그 부분은 사실 문제가 아닙니다. `results`의 초기값이 `[]`(빈 배열)이라 `[].map()`은 아무것도 렌더하지 않아서 `r`이 undefined가 되는 상황은 없습니다.

**힌트:** Phase 1에서 다뤘던 데이터 페칭의 3가지 문제 중 하나와 관련됩니다. `query`가 빠르게 바뀌는 상황을 생각해보세요.

다시 한번 시도해보시겠어요?

---

## [09:36:59] 사용자

중단 시그널이 없어서 이전것 fetch중 -> 다음것이 먼저 fetch 완료 << 이런 상황 발생 가능

---

## [09:37:09] AI



> [ROUTINE] Phase 2/5 | useEffect 실무 패턴 | Q&A: 6 | 경과: 55분

정확합니다! **Race condition**입니다.

```
query="a" → fetch 시작 ──── (느림) ──────── setResults(a결과) ← 늦게 덮어씀!
query="ab" → fetch 시작 ── setResults(ab결과)
                                              ↑ "ab" 검색인데 "a" 결과가 보임
```

cleanup에서 AbortController로 이전 요청을 취소해야 합니다:

```js
useEffect(() => {
  const controller = new AbortController();
  fetch(`/api/search?q=${query}`, { signal: controller.signal })
    .then(res => res.json())
    .then(data => setResults(data))
    .catch(err => {
      if (err.name !== 'AbortError') throw err;
    });
  return () => controller.abort();
}, [query]);
```

Phase 1에서 다룬 cleanup 판단 기준 — **진행 중인 요청 = 지속적 연결 → cleanup 필요** — 이 정확히 적용되는 케이스입니다.

---

**Q2.** 아래 코드에서 useEffect와 useLayoutEffect 중 어느 것을 써야 하고, 왜 그런가요?

```js
function AutoResizeTextarea({ value }) {
  const ref = useRef(null);

  use???Effect(() => {
    const el = ref.current;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return <textarea ref={ref} value={value} readOnly />;
}
```

---

## [09:39:19] 사용자

useLayoutEffect: 지금 setup 함수에서 하는 작업은 dom의 높이를 측정한 후 스타일 적용하는 로직 -> 페인트 전에 이루어져야함

---

## [09:39:39] AI



> 도구 호출: mcp__study__routine_appendEntry

---

## [09:39:47] AI

> [ROUTINE] Phase 2/5 | useEffect 실무 패턴 | Q&A: 6 | 경과: 56분

정답입니다!

부연하면 — useEffect로 하면:

```
페인트 (height: auto) → 사용자가 줄어든 textarea를 잠깐 봄 → scrollHeight로 재설정 → 깜빡임!
```

useLayoutEffect로 하면:

```
DOM 변경 (height: auto) → scrollHeight 계산 + 적용 → 페인트 (완성된 높이)
```

Phase 1의 판단 기준 — **"사용자가 중간 상태를 보면 안 되는가? → useLayoutEffect"** — 그대로 적용됩니다.

---

Q1, Q2 모두 잘 답하셨습니다. `>>다음`으로 Phase 3 라이브 코딩으로 넘어갈까요, 아니면 심화 질문 더 하시겠어요?

---

## [09:40:49] 사용자

>>다음

---

## [09:41:00] AI



> 도구 호출: mcp__study__routine_appendEntry

---

## [09:41:09] AI

> [ROUTINE] Phase 3/5 | useEffect 실무 패턴 | Q&A: 6 | 경과: 57분

## Phase 3: 라이브 코딩

### 과제

- **유형**: 구현
- **설명**: `useDebounce` 커스텀 Hook을 구현하세요. 입력값이 변경된 후 지정된 delay(ms)만큼 대기한 뒤에야 디바운스된 값을 반환합니다.
- **제약 조건**: TypeScript, `useEffect` + `useState`만 사용
- **시그니처**:

```ts
function useDebounce<T>(value: T, delay: number): T
```

- **동작 예시**:

```ts
const [text, setText] = useState('');
const debouncedText = useDebounce(text, 300);

// text가 빠르게 바뀌어도 debouncedText는 마지막 변경 후 300ms 뒤에만 업데이트
```

<details>
<summary>힌트 (필요 시 열기)</summary>

- `setTimeout`으로 delay 후 값을 설정
- cleanup에서 이전 타이머를 정리해야 합니다 — Phase 1에서 다룬 패턴

</details>

코드를 작성해주세요!

---

## [09:46:04] 사용자

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedText, setDebouncedText] = useState<T>(() => value)

  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedText(value)
    }, delay)

    return () => clearTimeout(id)
  }, [value])

  return debouncedText
}

---

## [09:46:10] AI



> [ROUTINE] Phase 3/5 | useEffect 실무 패턴 | Q&A: 6 | 경과: 58분

### 1차 리뷰

**정확성**: 핵심 로직 정확합니다. 타이머 설정 → cleanup에서 정리 → value 안정화 후 업데이트.

**지적 1가지:**
- `delay`가 의존성 배열에 빠져 있습니다. `delay`가 바뀌면 어떻게 될까요?

수정하시겠어요, 아니면 바로 모범 답안으로?

---

## [09:46:23] 사용자

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedText, setDebouncedText] = useState<T>(() => value)

  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedText(value)
    }, delay)

    return () => clearTimeout(id)
  }, [value, delay])

  return debouncedText
}

---

## [09:46:31] AI



> 도구 호출: mcp__study__routine_appendEntry

---

## [09:46:40] AI

> [ROUTINE] Phase 3/5 | useEffect 실무 패턴 | Q&A: 6 | 경과: 59분

### 2차 리뷰 (모범 답안 비교)

**모범 답안:**

```ts
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(() => value);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debouncedValue;
}
```

**비교: 사실상 동일합니다.** Pass!

유일한 차이는 변수명 `debouncedText` vs `debouncedValue` — generic Hook이므로 `value`가 더 범용적이지만, 동작에는 영향 없습니다.

**학습 포인트 정리:**
- `setTimeout` + `clearTimeout` cleanup = Phase 1에서 다룬 "지속적 연결 → cleanup" 패턴 그대로
- 의존성 배열에 `value`와 `delay` 모두 포함 = 두 값 중 하나라도 바뀌면 이전 타이머 취소 + 새 타이머 시작
- `useState(() => value)` 지연 초기화 = 첫 렌더 시 초기값으로 바로 반환

---

`>>다음`으로 Phase 4 체크포인트로 넘어갑니다!

---

## [09:47:08] 사용자

>>다음

---

## [09:47:14] AI



> 도구 호출: mcp__study__routine_appendEntry

---

## [09:47:19] AI



> [ROUTINE] Phase 4/5 | useEffect 실무 패턴 | Q&A: 6 | 경과: 60분

## 체크포인트

오늘 배운 내용을 검증합니다. 코드를 보지 않고 답해주세요.

---

### Q1: "이게 왜 이렇게 동작해?"

useEffect의 cleanup이 실행되는 타이밍과 순서를 설명해주세요. 특히, 컴포넌트 A(deps 변경)와 컴포넌트 B(언마운트)가 같은 커밋에 있을 때 cleanup과 effect가 어떤 순서로 실행되는지 설명해주세요.

---

## [09:47:41] 사용자

이전 cleanup -> 현재 effect -> 현재 cleanup

---

## [09:47:52] AI



> [ROUTINE] Phase 4/5 | useEffect 실무 패턴 | Q&A: 6 | 경과: 61분

한 컴포넌트 내에서의 순서는 맞습니다. 하지만 질문의 핵심은 **여러 컴포넌트가 같은 커밋에 있을 때**의 순서였습니다.

소스에서 확인한 것처럼 (`ReactFiberWorkLoop.js:4742-4743`):

```
commitPassiveUnmountEffects(root.current);  // 1. 모든 cleanup 먼저
commitPassiveMountEffects(root, ...);       // 2. 모든 effect 실행
```

즉:

```
A의 cleanup → B의 cleanup → A의 새 effect
(개별 컴포넌트 단위가 아니라, 전체 cleanup 먼저 → 전체 effect)
```

이 부분 기억해두시면 좋겠습니다.

---

### Q2: "나라면 어떻게 만들었을까?"

React 팀은 useEffect를 **기본 비동기(페인트 후 실행)**로 설계하고, useLayoutEffect를 **동기(페인트 전)**로 분리했습니다. 만약 당신이 설계한다면 — 기본을 동기로 하고 비동기 버전을 별도로 만들 수도 있었을 텐데, 왜 현재 설계가 더 나은 선택인지 설명해주세요.

---

## [09:49:52] 사용자

useEffect는 보통 리액트가 관리하는게 아닌 사이드이펙트 로직을 관리합니다. 따라서 "이 작업이 언제끝날지? 실패할지? 성공할지?"등을 리액트가 예측할수없습니다. 극단적인 상황에서 fetch가 10초 걸린다고 가정했을때 동기적이라면 메인스레드가 10초가 블로킹됩니다. 이처럼 관리할 수 없는 영역이 아니므로 비동기로 돌리는게 맞다고 봅니다

---

## [09:50:28] AI



> 도구 호출: mcp__study__routine_appendEntry

---

## [09:50:38] AI

> [ROUTINE] Phase 4/5 | useEffect 실무 패턴 | Q&A: 6 | 경과: 62분

### 피드백

**Q1**: 단일 컴포넌트 내 순서는 맞지만, 핵심인 **여러 컴포넌트 간 순서**가 빠졌습니다. `A의 cleanup → B의 cleanup → A의 새 effect` — 전체 cleanup이 먼저, 전체 effect가 나중. 이 점 기억해두세요.

**Q2**: 정확합니다. 사이드이펙트는 React가 예측/제어할 수 없는 영역이므로 비동기가 안전한 기본값이라는 판단이 좋습니다. 추가로, 비동기 기본 덕분에 브라우저가 먼저 페인트 → 대부분의 경우 더 나은 체감 성능이라는 점도 있습니다.

---

### 자기 평가

자기 평가를 해주세요:
- **PASS** → 핵심 개념을 review에 등록하고 정리합니다 (Phase 5)
- **FAIL** → gap을 기록하고 다음 접근 방식을 제안합니다 (Phase 5)

FAIL은 "나는 정확히 여기서 모른다"를 아는 것입니다. 부정적인 것이 아닙니다.

---

## [09:50:50] 사용자

PASS

---

## [09:51:00] AI

> [ROUTINE] Phase 4/5 | useEffect 실무 패턴 | Q&A: 6 | 경과: 63분

오늘 세션에서 다룬 핵심 개념 5개입니다:

| # | 개념 | 설명 |
|---|------|------|
| 1 | Object.is 의존성 비교 | deps는 참조 비교, 참조타입 주의, 의존성 누락이 본질 |
| 2 | cleanup 판단 기준 (지속성) | fire-and-forget은 불필요, 지속적 연결(구독/타이머/fetch)은 필요 |
| 3 | 전체 cleanup → 전체 effect 순서 | 컴포넌트별이 아니라 모든 cleanup 먼저 실행 후 모든 effect 실행 |
| 4 | useEffect fetch 한계와 대안 | race condition/워터폴 문제, React Query/loader/RSC 대안 |
| 5 | useEffect vs useLayoutEffect 판단 | 같은 엔진 다른 플래그, 중간 상태가 보이면 안 되면 useLayoutEffect |

이 5개를 review에 등록할까요?

---

## [09:59:46] 사용자

네

---

## [09:59:53] AI



> 도구 호출: mcp__study__review_saveMeta

---

## [09:59:55] AI

Review 등록 완료. Phase 5 정리로 넘어갑니다.

---

## [09:59:56] AI



> 도구 호출: mcp__study__routine_appendEntry

---

## [09:59:58] AI



> 도구 호출: mcp__study__routine_extractTranscript

---

## [09:59:58] AI



> 도구 호출: Read

---

## [09:59:59] AI



> 도구 호출: Read

---
