# react-reconciler — Hooks

> `/learn react` 세션 기록. 소스 코드 기반 Q&A 히스토리.

---

## 2026-02-18

### 학습 로드맵
- Step 1: Hook 인프라 (Infrastructure)
  - [x] 1.1: renderWithHooks — Dispatcher 전환과 컴포넌트 호출 루프
  - [ ] 1.2: mountWorkInProgressHook / updateWorkInProgressHook — Hook 링크드 리스트 빌딩
  - [ ] 1.3: Dispatcher 테이블 — Mount/Update/Rerender/ContextOnly 4종 매핑
- Step 2: useState & useReducer
  - [ ] 2.1: mountState / mountReducer — 초기화와 UpdateQueue 생성
  - [ ] 2.2: updateReducerImpl — 순환 링크드 리스트 업데이트 큐 처리 알고리즘
  - [ ] 2.3: dispatchSetState — Eager State 최적화와 리렌더링 스케줄링
- Step 3: useEffect 계열
  - [ ] 3.1: Effect 자료구조와 mountEffectImpl / updateEffectImpl
  - [ ] 3.2: useEffect / useLayoutEffect / useInsertionEffect — tag 분기
  - [ ] 3.3: useEffectEvent — 최신 값 캡처 패턴
- Step 4: useMemo / useCallback / useRef
  - [ ] 4.1: mountMemo / updateMemo, mountCallback / updateCallback
  - [ ] 4.2: mountRef / updateRef, useImperativeHandle
- Step 5: use Hook & 고급 Hook
  - [ ] 5.1: use — Thenable과 Context 분기 처리
  - [ ] 5.2: useSyncExternalStore — 외부 스토어 동기화와 Tearing 방지
  - [ ] 5.3: useMemoCache — React Compiler 연동
- Step 6: React 19 Actions & Transitions
  - [ ] 6.1: useOptimistic — 낙관적 업데이트와 rebase 메커니즘
  - [ ] 6.2: useActionState — 액션 큐와 isPending 관리
  - [ ] 6.3: useTransition & useDeferredValue — Lane 기반 우선순위 렌더링

### 학습 요약
- `renderWithHooks`는 함수 컴포넌트의 Hook 시스템 진입점으로, 컴포넌트 호출 전 적절한 Dispatcher(Mount/Update)를 `ReactSharedInternals.H`에 세팅하고, 호출 후 `ContextOnlyDispatcher`로 전환하여 컴포넌트 밖에서의 Hook 호출을 차단한다.
- Mount/Update 판별 기준: `current === null || current.memoizedState === null`이면 Mount.
- `workInProgress`의 `memoizedState/updateQueue/lanes`를 null로 초기화하지만, `current`는 이전 렌더 결과를 보존하는 읽기 전용 참조이므로 초기화하지 않는다 (Double Buffering 패턴).
- `finishRenderingHooks`에서 모듈 레벨 전역 변수들(`renderLanes`, `currentlyRenderingFiber`, `currentHook`, `workInProgressHook` 등)을 모두 null/초기값으로 리셋한다.
- 렌더 도중 setState가 호출되면 `enqueueRenderPhaseUpdate`에서 `didScheduleRenderPhaseUpdateDuringThisPass = true`로 세팅되고, 컴포넌트 호출 반환 후 이 플래그를 감지하여 `renderWithHooksAgain`으로 재실행한다 (최대 25회).

### 소스 코드 경로
- `ref/react-fork/packages/react-reconciler/src/ReactFiberHooks.js:7` — @flow 선언 (Flow 타입 시스템)
- `ref/react-fork/packages/react-reconciler/src/ReactFiberHooks.js:258-292` — 모듈 레벨 전역 변수 (renderLanes, currentlyRenderingFiber, currentHook, workInProgressHook 등)
- `ref/react-fork/packages/react-reconciler/src/ReactFiberHooks.js:502-631` — renderWithHooks 함수 (Dispatcher 전환, 컴포넌트 호출, render phase update 감지)
- `ref/react-fork/packages/react-reconciler/src/ReactFiberHooks.js:560-563` — Mount/Update Dispatcher 선택 로직
- `ref/react-fork/packages/react-reconciler/src/ReactFiberHooks.js:633-749` — finishRenderingHooks (전역 변수 정리, ContextOnlyDispatcher 전환, Hook 수 불일치 에러)
- `ref/react-fork/packages/react-reconciler/src/ReactFiberHooks.js:3628-3698` — dispatchSetStateInternal (isRenderPhaseUpdate 분기, Eager State 최적화)
- `ref/react-fork/packages/react-reconciler/src/ReactFiberHooks.js:3810-3836` — isRenderPhaseUpdate, enqueueRenderPhaseUpdate (didScheduleRenderPhaseUpdateDuringThisPass 세팅)

### Q&A 전체 기록

#### Step 1.1: renderWithHooks — Dispatcher 전환과 컴포넌트 호출 루프

**Q: let currentlyRenderingFiber: Fiber = (null: any); < 이건 무슨 문법인가요? 해당 파일은 js인데 : any < 이게 가능한지?**

A: 이것은 **Flow** 타입 어노테이션이다. TypeScript가 아니라, Meta 내부에서 개발한 정적 타입 체커인 Flow를 사용한다. React 소스 코드는 `.js` 확장자를 사용하지만 파일 상단 7번 줄에 `@flow` 주석이 있어 Flow로 타입 체크된다.

```javascript
// Flow 문법 분해
let currentlyRenderingFiber: Fiber = (null: any);
//                          ^^^^^^   ^^^^^^^^^^^
//                          변수 타입   타입 캐스팅
```

- `: Fiber` → 변수의 타입은 `Fiber`
- `(null: any)` → Flow의 타입 캐스팅 문법. `null`을 `any` 타입으로 캐스팅해서 `Fiber` 타입 변수에 할당. TypeScript의 `null as any`와 같은 역할
- 빌드 시 Flow 어노테이션은 모두 제거되어 순수 JavaScript로 변환됨

소스: `ReactFiberHooks.js:7` (`@flow` 선언), `ReactFiberHooks.js:261`

---

**Q: 컴포넌트 호출이 끝나면 작업대를 치웁니다 < 여기서 "치운다"라는 표현이 구체적으로 뭘 의미합니까?**

A: `finishRenderingHooks` (633~749줄)에서 수행하는 모듈 레벨 전역 변수 초기화를 의미한다. 구체적으로:

| 라인 | 동작 | 의미 |
|------|------|------|
| 656 | `ReactSharedInternals.H = ContextOnlyDispatcher` | Hook 호출 차단 Dispatcher로 전환 |
| 663 | `renderLanes = NoLanes` | 현재 렌더 우선순위 초기화 |
| 664 | `currentlyRenderingFiber = null` | "지금 렌더 중인 Fiber" 해제 |
| 666 | `currentHook = null` | current 트리 Hook 포인터 해제 |
| 667 | `workInProgressHook = null` | WIP 트리 Hook 포인터 해제 |
| 696 | `didScheduleRenderPhaseUpdate = false` | 렌더 중 업데이트 플래그 리셋 |
| 700-701 | `thenableIndexCounter = 0; thenableState = null` | use() 관련 상태 리셋 |

즉 "치운다" = 이 컴포넌트 렌더에만 유효했던 모듈 레벨 전역 변수들을 전부 null/초기값으로 되돌리는 것. 다음 컴포넌트의 `renderWithHooks` 호출이 깨끗한 상태에서 시작할 수 있도록 한다.

소스: `ReactFiberHooks.js:633-749`

---

**Q: current는 왜 초기화 안하나요? (workInProgress 처럼)**

A: `workInProgress`를 초기화하는 이유는 이 Fiber가 지금부터 새로 렌더링할 대상이기 때문이다. Hook들이 실행되면서 `memoizedState`에 새 링크드 리스트를 하나씩 구축한다.

`current`를 초기화하지 않는 이유는 **current가 "이전 렌더 결과"를 보존한 읽기 전용 참조**이기 때문이다.

```
current (이전 렌더 결과)          workInProgress (새 렌더 대상)
┌─────────────────────┐          ┌─────────────────────────┐
│ memoizedState:      │          │ memoizedState: null      │ ← 초기화
│   hook1 → hook2 → … │  읽기→   │   (Hook들이 하나씩 생성)   │
│ (건드리지 않음!)     │          │                          │
└─────────────────────┘          └─────────────────────────┘
```

Update 시 `updateWorkInProgressHook` 함수가 `current.memoizedState`에서 기존 Hook 값을 읽어와 복사한다. current를 초기화해버리면 이전 상태를 읽을 수 없게 된다. 이것이 Topic 4(Fiber Structure)에서 배운 Double Buffering 패턴의 연장 — `current`는 화면에 표시된 "완성본", `workInProgress`는 새로 작업 중인 "작업본"이다.

소스: `ReactFiberHooks.js:526-528` (workInProgress 초기화), `ReactFiberHooks.js:1000-1070` (updateWorkInProgressHook에서 current 읽기)

---

**Q: didScheduleRenderPhaseUpdateDuringThisPass 이 전역변수는 renderWithHooks 실행전에 결정되거나 실행 후에 결정되는값 아닌가요?(즉 renderWithHooks실행중 저 변수 값이 변경되지 않는 한 "감지"라는 표현이 맞는지 궁금합니다 -> 즉 여기서 감지라 쓰신 이유가 뭔가요?)**

A: 이 변수는 `renderWithHooks` 실행 **도중에** 바뀐다. 구체적으로 `Component(props, secondArg)` 호출(596~598줄) **안에서** setState가 호출되면 값이 변경된다.

콜 체인:

```
renderWithHooks (502줄)
  ├── ReactSharedInternals.H = HooksDispatcherOnUpdate  (560줄)
  ├── Component(props, secondArg)                        (596줄)
  │     └── (컴포넌트 내부에서)
  │           setState(newValue)                         ← 사용자 코드
  │             └── dispatchSetState                     (3598줄)
  │                   └── dispatchSetStateInternal       (3628줄)
  │                         ├── isRenderPhaseUpdate()    (3644줄)
  │                         │     → fiber === currentlyRenderingFiber? → true!
  │                         └── enqueueRenderPhaseUpdate (3818줄)
  │                               └── didScheduleRenderPhaseUpdateDuringThisPass = true  ← 여기서 변경! (3825줄)
  │
  ├── if (didScheduleRenderPhaseUpdateDuringThisPass)    (602줄)
  │     └── renderWithHooksAgain(...)                    ← 컴포넌트 재실행
```

"감지"라는 표현을 쓴 이유: 컴포넌트 호출이라는 블랙박스 안에서 어떤 일이 일어났는지를, 컴포넌트 호출 반환 후에 전역 플래그로 확인하는 구조이기 때문이다. 실제 사례:

```javascript
function Counter() {
  const [count, setCount] = useState(0);
  if (count === 0) {
    setCount(1);  // 렌더 도중 setState → render phase update!
  }
  return <div>{count}</div>;
}
```

소스: `ReactFiberHooks.js:3810-3816` (isRenderPhaseUpdate), `ReactFiberHooks.js:3818-3836` (enqueueRenderPhaseUpdate), `ReactFiberHooks.js:3628-3644` (dispatchSetStateInternal에서 분기)

### 연결 토픽
- Step 1.2 (mountWorkInProgressHook / updateWorkInProgressHook): renderWithHooks에서 초기화한 전역 변수들이 Hook 링크드 리스트 구축에 어떻게 사용되는지
- Topic 4 (Fiber Structure): Double Buffering 패턴 — current/workInProgress 관계
- Topic 5 (Work Loop): renderWithHooks가 호출되는 상위 컨텍스트 (beginWork → updateFunctionComponent)
- Topic 7 (Lanes & Priority): renderLanes가 Hook 업데이트 처리에 미치는 영향
