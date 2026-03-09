---
title: "useEffect-사이드이펙트-역할"
---
# useEffect-사이드이펙트-역할

> 최초 질문: 왜 useEffect가 사이드 이펙트에 해결책이 될수있을까요? 결국 useEffect도 렌더링 흐름에 관여된/관여하는 훅이고 단지 렌더 후 실행됨, 의존성 변경시 실행됨이라는 특징만 존재하는거 아닌가요?
> 일시: 2026-03-04

⚠️ JSONL 원문 추출 실패 → 세션 컨텍스트에서 재구성

---

## Q1. 왜 useEffect가 사이드 이펙트에 해결책이 될 수 있을까요?

### 비유: 식당의 주방과 배달 시스템

| 비유 요소 | 실제 개념 | 대응 이유 |
|-----------|-----------|-----------|
| 주방 조리 (순수 작업) | render 함수 실행 | 레시피(state, props)대로 요리(JSX)만 만듦. 조리 중 배달하지 않음 |
| 조리 중 "배달 메모" 작성 | `pushSimpleEffect()` — Effect 객체 생성 | 조리 중엔 메모(데이터)만 만들고, 실제 배달(실행)은 안 함 |
| 요리 완성 후 배달부에게 메모 전달 | `scheduleCallback(NormalPriority, flushPassiveEffects)` | 조리(render) 완료 + 서빙(DOM commit) 후 배달부가 메모를 수거 |
| 배달부가 이전 배달 회수 후 새 배달 | cleanup → create 순서 실행 | 이전 구독 해제 → 새 구독 등록 |
| 주방장이 조리를 폐기하고 다시 시작 | Concurrent Mode의 render 중단/재시작 | 메모만 있으므로 폐기해도 배달은 일어나지 않음 = 안전 |

### 핵심: "렌더 후 실행"이 아니라 "render 중 실행하지 않는다"가 본질

render 중 useEffect가 하는 일은 **데이터 구조를 만드는 것뿐**:

```javascript
// ref/react/packages/react-reconciler/src/ReactFiberHooks.js:2614-2628
function mountEffectImpl(fiberFlags, hookFlags, create, deps) {
  const hook = mountWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  currentlyRenderingFiber.flags |= fiberFlags;       // fiber에 플래그만 설정
  hook.memoizedState = pushSimpleEffect(
    HookHasEffect | hookFlags,
    createEffectInstance(),
    create,    // ← 콜백을 "저장"만 함. 호출하지 않음!
    nextDeps,
  );
}
```

실제 실행은 commit 이후 `commitHookEffectListMount`에서:

```javascript
// ref/react/packages/react-reconciler/src/ReactFiberCommitEffects.js:141-177
export function commitHookEffectListMount(flags, finishedWork) {
  // ...effect 연결 리스트 순회
  const create = effect.create;
  const inst = effect.inst;
  destroy = create();          // ← 여기서 비로소 실행!
  inst.destroy = destroy;      // cleanup 함수 저장
}
```

이 함수 자체도 **비동기로 스케줄링**:

```javascript
// ref/react/packages/react-reconciler/src/ReactFiberWorkLoop.js:3779-3788
scheduleCallback(NormalSchedulerPriority, () => {
  flushPassiveEffects();    // ← 브라우저 페인트 이후에 실행
});
```

useEffect의 `Passive` 플래그(`0b1000`)가 이 분리를 표현:

```javascript
// ref/react/packages/react-reconciler/src/ReactHookEffectTags.js:12-20
export const HasEffect = /* */ 0b0001;  // 실행 필요 표시
export const Insertion = /* */ 0b0010;  // DOM 삽입 전
export const Layout =    /* */ 0b0100;  // DOM 변경 직후 (동기)
export const Passive =   /* */ 0b1000;  // 페인트 후 (비동기) ← useEffect
```

useEffect의 진정한 계약 4가지:

1. **render 순수성 보장** — render 중 콜백을 호출하지 않음
2. **생명주기 바인딩** — 컴포넌트 mount/update/unmount에 자동 연동
3. **자동 cleanup** — `inst.destroy = create()`로 이전 이펙트 정리
4. **의존성 기반 최적화** — `areHookInputsEqual(nextDeps, prevDeps)`로 불필요한 재실행 방지 (`ReactFiberHooks.js:2649`)

```
React 실행 흐름과 useEffect의 위치
═══════════════════════════════════════════════════════════════

 ┌─── RENDER PHASE (순수, 중단 가능) ──────────────────────┐
 │  Component()                                             │
 │    ├── useState()    → state 읽기                        │
 │    ├── useEffect(fn) → Effect 객체 생성 (fn 저장만!)     │
 │    │              { tag: Passive|HasEffect,              │
 │    │                create: fn,         ← 미실행         │
 │    │                deps: [...] }                        │
 │    └── return <JSX>                                      │
 │  ⚠️ 여기서 React가 render를 버릴 수 있음!                │
 └──────────────────────────────────────────────────────────┘
                          ↓
 ┌─── COMMIT PHASE (동기, 중단 불가) ──────────────────────┐
 │  DOM 변경 (Mutation) + useLayoutEffect 실행              │
 └──────────────────────────────────────────────────────────┘
                          ↓
 ┌─── 브라우저 페인트 ─────────────────────────────────────┐
 └──────────────────────────────────────────────────────────┘
                          ↓
 ┌─── PASSIVE EFFECT (비동기) ─────────────────────────────┐
 │  effect.inst.destroy?.() → effect.create() → 드디어 실행 │
 └──────────────────────────────────────────────────────────┘
```

---

## Q2. useEffect 도입이 동시 렌더링보다 이전 아닌가요?

맞다. useEffect(16.8, 2019)가 Concurrent Mode(18.0, 2022)보다 **3년** 먼저.

| 시점 | 이벤트 | 의미 |
|------|--------|------|
| 2017-09 | React 16.0 — **Fiber 아키텍처** | render phase를 중단 가능하게 재설계 |
| 2018-03 | React 16.3 — `componentWillMount` **UNSAFE 표시** | render phase 사이드 이펙트를 위험 분류 |
| 2019-02 | React 16.8 — **Hooks (useEffect)** | 사이드 이펙트를 선언적으로 관리하는 API |
| 2022-03 | React 18.0 — **Concurrent Features 출시** | 실제 render 중단/재시작 실전 투입 |

### useEffect는 두 가지 문제를 동시에 풀었다

**문제 1 (즉각적, Concurrent와 무관): 클래스 라이프사이클의 로직 분산**

```javascript
// 하나의 관심사(구독)가 3곳에 분산
class Chat extends React.Component {
  componentDidMount()    { subscribe(this.props.id); }
  componentDidUpdate(prev) {
    if (prev.id !== this.props.id) {
      unsubscribe(prev.id);
      subscribe(this.props.id);
    }
  }
  componentWillUnmount() { unsubscribe(this.props.id); }
}

// useEffect: 하나의 선언으로 통합
useEffect(() => {
  subscribe(id);
  return () => unsubscribe(id);
}, [id]);
```

**문제 2 (전향적, Concurrent 대비): render phase 순수성 강화**

`componentWillMount`는 render phase에서 **직접 호출**되었다:

```javascript
// ref/react/packages/react-reconciler/src/ReactFiberClassComponent.js:830-842
// mountClassInstance 내부 (render phase에서 호출됨)
if (...) {
  callComponentWillMount(workInProgress, instance);  // ← render phase에서 실행!
}

// 반면 componentDidMount는 플래그만 설정
if (typeof instance.componentDidMount === 'function') {
  workInProgress.flags |= Update | LayoutStatic;     // ← 플래그만! commit에서 실행
}
```

### 결론

> useEffect는 **클래스 라이프사이클의 DX 문제**(로직 분산)를 해결하면서,
> **동시에** Fiber가 설계해둔 render/commit 분리 원칙을 함수 컴포넌트에서도 따르게 만들었다.
> Concurrent Mode는 이 설계의 **수혜자**이지, useEffect의 **유일한 동기**가 아니다.

---

## Q3. "render 중 사이드이펙트 실행 불가/분리"가 정확히 무슨 말인지

### React의 3단계 공사 과정

| 공사 단계 | React 페이즈 | 무엇을 하나 | 핵심 특성 |
|-----------|-------------|-------------|-----------|
| 1. 도면 검토 | **Render phase** | fiber 순회, 새 도면 작성 | **연필 작업** — 종이 위에서만, 실제 건물 손대지 않음 |
| 2. 현장 시공 | **Commit: Mutation** | DOM 실제 수정 | **망치 작업** — 되돌리기 어려움 |
| 3. 후속 업무 | **Commit: Passive Effects** | useEffect 콜백 실행 | **사무 작업** — 건물과 무관한 외부 업무 |

### 구체적 코드 예시

```javascript
function MyComponent({ userId }) {
  // ── 이 함수 본문 전체가 "render phase"에서 실행됨 ──
  const [data, setData] = useState(null);        // state 읽기
  const name = data ? data.name : 'loading';     // 계산
  useEffect(() => {
    fetchUser(userId).then(setData);             // ← 이 콜백은 지금 실행 안 됨!
  }, [userId]);
  return <div>{name}</div>;                      // JSX 반환 (도면)
}
```

이 단계에서 일어나는 일은 오직: 값 읽기, 계산, 데이터 구조 생성. 이 단계는 **폐기될 수 있기 때문**:

```
━━━ useEffect를 쓴 경우 (안전) ━━━━━━━━━━━━━━━━━━━━━

 render phase (1차)
 │ MyComponent() → Effect 객체 생성 (fn 미실행)
 │ ChildB() 처리 중...
 │  ⚡ 긴급 업데이트! → 1차 폐기
 │  → fn은 한 번도 실행 안 됨 → 부작용 없음 ✅
 │
 render phase (2차) → 전체 완료
 commit phase → DOM 변경
 passive effects → fn() 딱 1번 실행 ✅


━━━ render 중 직접 fetch한 경우 (위험) ━━━━━━━━━━━━━

 render phase (1차)
 │ MyComponent() → fetch(userId) 나감! 🚨
 │  ⚡ 긴급 업데이트! → 1차 폐기
 │  → fetch는 이미 나감! 되돌릴 수 없음 🚨
 │
 render phase (2차)
 │ MyComponent() → 같은 fetch 또 나감 🚨🚨
 │ → 동일 요청 2번 → 예측 불가 상태
```

### "분리"란

> **render phase에서는 "무엇을 해야 하는지" 메모만 남기고 (Effect 객체),
> "실제로 하는 것"은 render가 확정된 이후(commit 이후)로 미룬다.**

"분리"는 추상적 원칙이 아니라, **코드 실행 시점을 물리적으로 다른 단계에 배치하는 것**.

---

## Q4. 사용자 이해 확인 + 보충

사용자 정리:
- render 단계: 코드를 읽고 계획을 짜는 단계
- commit 단계: 계획대로 실제 수행하는 단계
- passive effects 단계: render 때 저장한 effect fn 실제로 실행하는 단계

**보충**: commit과 passive effects 둘 다 "실제 수행"이지만 **대상이 다르다**:

| 단계 | 무엇을 실행 | 예시 |
|------|------------|------|
| commit (mutation) | **DOM 변경** — render가 짠 계획대로 | div 추가, text 변경, 속성 수정 |
| passive effects | **외부 세계와의 상호작용** — useEffect 콜백 | fetch, 구독, 타이머, 로깅 |

commit은 "React가 관리하는 화면을 바꾸는 것", passive effects는 "React 바깥 세계에 영향을 주는 것".

---

## Q5. passive effects의 결과는 리액트가 예측하기 어렵고 관리 어렵겠네요

맞다. 그리고 그게 바로 **React가 의도적으로 설계한 경계선**.

React가 effect **결과**에 대해 할 수 있는 것과 없는 것:

| React가 관리하는 것 | React가 관리하지 않는 것 |
|-------------------|----------------------|
| **언제** 실행할지 (deps 비교) | fetch 응답이 뭔지 |
| **언제** 정리할지 (cleanup 호출) | 구독이 어떤 데이터를 받을지 |
| **실행 순서** (부모→자식 mount, 자식→부모 unmount) | 외부 API가 성공할지 실패할지 |

effect의 결과를 React 세계로 다시 가져오려면 **반드시 state를 거쳐야** 한다:

```javascript
useEffect(() => {
  fetchUser(id).then(data => {
    setData(data);   // ← 외부 결과를 React state로 "입국"시킴
  });                //    이 순간 scheduleUpdateOnFiber → 새 render 트리거
}, [id]);
```

FORGE의 **"경계선은 의도적"** 원칙의 또 다른 사례. React는 effect의 결과를 예측/관리하지 않되, 그 결과가 **state를 통해 돌아오면** 다시 자신의 render 파이프라인으로 처리한다. 데이터 페칭 라이브러리(React Query 등)가 존재하는 이유도 이것 — React가 의도적으로 비워둔 영역을 채우는 것.

---

## 연결

| 대상 토픽 | 관계 | 근거 |
|-----------|------|------|
| `study/learn/topics/FORGE-React-렌더링-파이프라인/note.md` | 상위 프레임워크 | "서술-실행 분리" 원칙(useEffect는 fn을 서술로 저장, 실행은 passive effects), "경계선은 의도적" 원칙(effect 결과를 React가 관리하지 않는 것은 설계 결정) |
| `study/learn/topics/React-리렌더링-트리거/note.md` | 인과 관계 | scheduleUpdateOnFiber로 render 트리거 → render 결과 Effect 생성 → passive effects에서 실행 → effect 내 setState가 다시 scheduleUpdateOnFiber 호출 |
| `study/learn/topics/React-데이터-페칭-불관여/note.md` | 동일 원칙 적용 | React가 데이터 페칭을 하지 않는 이유와, effect 결과를 관리하지 않는 이유는 같은 "경계선은 의도적" 원칙 |


---

## 2026-03-04 (via /learn)

Q&A 5건. (1) useEffect가 사이드이펙트 해결책인 이유 — render 중 Effect 객체만 생성, 실행은 passive effects 단계. (2) 도입 시점 — Fiber(16.0)→UNSAFE(16.3)→useEffect(16.8)→Concurrent(18.0), DX문제+render순수성을 동시 해결. (3) "render 중 사이드이펙트 분리"의 의미 — render는 폐기 가능하므로 실행 시점을 물리적으로 다른 단계에 배치. (4) render/commit/passive 3단계 이해 확인 + commit은 DOM변경, passive는 외부세계 상호작용. (5) effect 결과는 React가 관리하지 않음 — 의도적 경계선, state를 통해 React 세계로 재진입.
