# Work Loop

> `/learn react` 세션 기록. 소스 코드 기반 Q&A 히스토리.

---

## 2026-02-15

### 학습 로드맵
- [x] Step 1: FiberRoot와 전역 상태 변수 — FiberRoot 구조, 모듈 레벨 상태(workInProgress, executionContext 등)
- [ ] Step 2: 업데이트 진입점 — scheduleUpdateOnFiber → ensureRootIsScheduled — setState가 렌더링을 트리거하는 경로
- [ ] Step 3: Render Phase — renderRootSync / renderRootConcurrent — Sync vs Concurrent 분기, 시간 분할
- [ ] Step 4: performUnitOfWork와 트리 순회 — beginWork → completeUnitOfWork 순회 패턴
- [ ] Step 5: Commit Phase — completeRoot → commitRoot — 커밋 단계 구조 (mutation, layout, passive effects)

### 학습 요약
- FiberRoot(`FiberRootNode`)는 React 앱의 관리 메타데이터 객체로, HostRoot Fiber와 순환 참조(`root.current ↔ fiber.stateNode`)를 형성한다. FiberRoot는 스케줄링(callbackNode, pendingLanes)을 담당하고, HostRoot Fiber는 렌더링 트리 순회에 참여한다.
- Work Loop의 현재 상태는 모듈 레벨 전역 변수(`workInProgress`, `workInProgressRoot`, `executionContext` 등)로 추적된다.
- `executionContext`는 3비트 비트마스크(BatchedContext=0b001, RenderContext=0b010, CommitContext=0b100)로, Render와 Commit은 코드 가드에 의해 절대 동시에 켜지지 않는다(2-Phase 아키텍처).
- FiberRoot의 `next` 필드는 여러 React 앱(마이크로 프론트엔드)을 스케줄링하기 위한 단일 링크드 리스트. 대부분의 앱에서는 길이 1.
- Concurrent 작업은 루트별 독립 Scheduler 태스크로 등록되어 시간 분할 인터리빙이 가능하지만, Sync 작업은 순차 처리된다.

### 소스 코드 경로
- `ref/react-fork/packages/react-reconciler/src/ReactFiberRoot.js:50-155` — FiberRootNode 생성자
- `ref/react-fork/packages/react-reconciler/src/ReactFiberRoot.js:157-235` — createFiberRoot (FiberRoot ↔ HostRoot Fiber 순환 참조 생성)
- `ref/react-fork/packages/react-reconciler/src/ReactFiberWorkLoop.js:419-431` — ExecutionContext, RootExitStatus 상수 정의
- `ref/react-fork/packages/react-reconciler/src/ReactFiberWorkLoop.js:434` — `executionContext` 전역 변수
- `ref/react-fork/packages/react-reconciler/src/ReactFiberWorkLoop.js:443-452` — SuspendedReason 9가지 상수
- `ref/react-fork/packages/react-reconciler/src/ReactFiberWorkLoop.js:1122` — Render/Commit 재진입 방지 가드
- `ref/react-fork/packages/react-reconciler/src/ReactFiberRootScheduler.js:116-152` — ensureRootIsScheduled (FiberRoot 링크드 리스트 관리)
- `ref/react-fork/packages/react-reconciler/src/ReactFiberRootScheduler.js:259-348` — processRootScheduleInMicrotask (루트별 태스크 스케줄링)
- `ref/react-fork/packages/react-reconciler/src/ReactFiberRootScheduler.js:384-509` — scheduleTaskForRootDuringMicrotask (Lane→Scheduler 우선순위 매핑, 태스크 등록)
- `ref/react-fork/packages/react-reconciler/src/ReactFiberRootScheduler.js:513-606` — performWorkOnRootViaSchedulerTask (Concurrent 태스크 진입점)

### Q&A 전체 기록

#### Step 1: FiberRoot와 전역 상태 변수

**Q: FiberRoot는 개념적인 개념이고 Fiber(HostRoot)는 물리적 (태그등)인 개념인건가요?**

A: 둘 다 물리적인 JavaScript 객체이지만, 역할이 다르다. FiberRoot는 앱 관리 메타데이터(스케줄링, Lane, 콜백), HostRoot Fiber는 렌더링 트리의 최상위 노드(child, sibling, return, flags). "개념적 vs 물리적"보다 "관리자 vs 참여자"가 더 정확한 비유.

소스에서 둘의 관계:
```js
// ReactFiberRoot.js:208-212
// Cyclic construction.
const uninitializedFiber = createHostRootFiber(tag, isStrictMode);
root.current = uninitializedFiber;       // FiberRoot → HostRoot Fiber
uninitializedFiber.stateNode = root;     // HostRoot Fiber → FiberRoot
```

---

**Q: current와 next가 있는걸 보면 링크드 리스트인거같은데, 그러면 이전 Fiber와 마찬가지로 단일 링크드 리스트인가요?**

A: 맞다. `ReactFiberRootScheduler.js:124-133`에서 확인:
```js
if (lastScheduledRoot === null) {
  firstScheduledRoot = lastScheduledRoot = root;
} else {
  lastScheduledRoot.next = root;
  lastScheduledRoot = root;
}
```
`firstScheduledRoot` → root1 → root2 → ... → `lastScheduledRoot(next=null)`. 단, Fiber의 child/sibling 리스트(트리 순회용)와는 목적이 다르다 — 이것은 **여러 React 앱을 스케줄링**하기 위한 대기열. 대부분의 앱에서는 FiberRoot가 하나뿐이라 길이 1.

---

**Q: 왜 BatchedContext 만 export 안할까요?**

A: `BatchedContext`는 `ReactFiberWorkLoop.js` 내부(`batchedUpdates`, `flushSyncFromReconciler`)에서만 사용된다. 외부 모듈에서 참조할 필요가 없기 때문에 단순한 캡슐화. 반면 `RenderContext`, `CommitContext`는 다른 파일(hooks, event 시스템)에서 "지금 React가 어떤 단계에 있는지" 확인할 때 import해서 사용하므로 export.

---

**Q: ExecutionContext는 3비트 비트마스크입니다 << 이 말은 실제로 실행되는 컨텍스트는 3비트 비트마스크라는 건가요?**

A: 그렇다. `executionContext`라는 하나의 변수가 3비트 비트마스크:
```
비트 위치:  [2]  [1]  [0]
           Commit Render Batched
```
비트 연산으로 사용:
```js
executionContext |= RenderContext;     // Render 플래그 켜기
(executionContext & RenderContext) !== NoContext   // "렌더 중인가?"
(executionContext & (RenderContext | CommitContext)) !== NoContext  // "렌더 또는 커밋 중인가?"
```
Topic 2에서 배운 Fiber의 `flags`와 동일한 패턴.

---

**Q: Suspended Reason의 9가지 이유를 전부 알아두는게 좋을까요?**

A: 지금은 3개만 기억하면 충분:

| Reason | 언제 발생 |
|--------|----------|
| `SuspendedOnData` (2) | Suspense — Promise throw (가장 흔함) |
| `SuspendedOnAction` (9) | Server Action 실행 중 |
| `SuspendedOnHydration` (8) | Selective hydration |

나머지는 엣지 케이스/내부 최적화용. 핵심은 "Work Loop가 여러 이유로 중단될 수 있고, 중단 이유에 따라 복구 전략이 다르다"는 개념. `renderRootConcurrent`의 `switch (workInProgressSuspendedReason)` 분기에서 나중에 확인하면 됨.

---

**Q: 순환 참조임에도 문제없는 이유가 뭔가요?**

A: JavaScript에서 순환 참조가 문제가 되는 경우 2가지:
1. **메모리 누수(GC)** — 현대 GC(Mark-and-Sweep)는 순환 참조를 정상 수거. 루트 집합에서 도달 불가능하면 둘 다 수거됨. (옛 IE6의 Reference Counting GC에서만 문제)
2. **직렬화(JSON.stringify)** — FiberRoot/Fiber는 내부 자료구조이므로 직렬화할 일 없음.

React가 순환 참조를 선택한 이유는 양방향 O(1) 접근이 hot path에서 필요하기 때문:
```js
// ReactFiberBeginWork.js:1783 — 매 HostRoot 렌더링마다
const root = (workInProgress.stateNode: FiberRoot);
// ReactFiberConcurrentUpdates.js:274 — 업데이트 스케줄링마다
return node.tag === HostRoot ? (node.stateNode: FiberRoot) : null;
```
V8 Hidden Class 인라인 캐싱으로 프로퍼티 접근은 사실상 메모리 오프셋 접근과 동일. Map lookup이나 이벤트 버스의 간접성보다 빠르고, GC 관리도 자동(WeakMap 불필요).

---

**Q: 근데 이걸 위해서는 중간에 이벤트 버스? 같은 중간 장소를 두는 방법도 있지 않았을까요? 사실 저라면 순환참조보다 이걸 먼저 떠올렸을거같은데, 제가 순환참조에 대한 편견이있는걸까요?**

A: 편견이 아니라 건전한 엔지니어링 감각. 대안 비교:

| 기준 | 중앙 레지스트리(Map) | 순환 참조 |
|------|--------------|----------|
| 접근 속도 | O(1) 해시 | O(1) 프로퍼티 |
| 메모리 | 별도 Map 필요 | 추가 메모리 없음 |
| GC 관리 | WeakMap 필요 (Fiber 삭제 시) | 자동 (같이 수거됨) |
| 결합도 | 낮음 | 높음 |
| 디버깅 | 간접 | 직접 |

React 팀은 "내부 자료구조 간의 결합은 허용, 외부 API 경계만 깨끗하게"라는 철학. FiberRoot와 HostRoot Fiber는 항상 1:1이고 하나 없이 다른 하나가 존재할 수 없으니 결합도가 높아도 괜찮다는 판단. 순환 참조에 경계심을 가지되, "왜 위험한가?"(GC? 직렬화? 수명?)를 따져보면 여기서는 합리적.

---

**Q: 대부분의 앱에서는 FiberRoot가 하나뿐이라 이 리스트의 길이가 1입니다. 마이크로 프론트엔드처럼 여러 React 앱이 공존할 때만 의미가 있습니다. << 그러면 대부분의 경우에는 FiberRoot의 next가 null이고, 마이크로 프론트엔드같은 경우에면 next에 값이 연결된다는건가요?**

A: 맞다. 일반 SPA(`createRoot()` 한 번)에서는:
```
firstScheduledRoot → [FiberRoot A (next: null)] ← lastScheduledRoot
```
마이크로 프론트엔드(`createRoot()` 여러 번)에서는:
```
firstScheduledRoot → [FiberRoot A] → [FiberRoot B] → [FiberRoot C (next: null)] ← lastScheduledRoot
```

---

**Q: 비트 위치: [2] [1] [0] / Commit Render Batched << 이러면 이론적으로 커밋중이면서 렌더중이면서 배치중인 상태도 표현 가능하겠군요, 실제로 그런 경우가있을까요?**

A: 이론적으로 8가지 조합이 가능하지만, 실제 코드 흐름에서 Render와 Commit은 절대 동시에 켜지지 않는다.

- `0b011` (Render + Batched) — **가능**
- `0b101` (Commit + Batched) — **가능**
- `0b110` (Commit + Render) — **불가능**. `performWorkOnRoot` 진입 가드가 차단
- `0b111` (전부) — **불가능**

```js
// ReactFiberWorkLoop.js:1122
if ((executionContext & (RenderContext | CommitContext)) !== NoContext) {
  throw new Error('Should not already be working.');
}
```

`executionContext |= CommitContext` 설정 후 항상 `executionContext = prevExecutionContext`로 복원하는 패턴을 사용. 이것이 React의 **2-Phase 아키텍처**의 근본 보장 — Render Phase와 Commit Phase는 항상 순차적.

---

**Q: Render Phase와 Commit Phase는 항상 순차적입니다. < 이유가 뭔가요? 그리고 뭐가 먼저이고 뭐가 나중인가요?**

A: 순서는 **Render → Commit. 항상.** 비유: 설계도 그리기(Render) → 실제 공사(Commit).

순차적이어야 하는 이유 3가지:
1. **의존성**: Commit은 Render의 결과물(flags)에 의존. Render가 끝나야 "어떤 Fiber에 어떤 변경이 필요한지"가 결정됨.
2. **취소 가능성 차이**: Render Phase는 취소/재시작 가능(Concurrent), Commit Phase는 불가능(DOM 변경 시작 → 반드시 끝까지. 중간에 멈추면 UI 불일치).
3. **코드 가드**: `performWorkOnRoot`에서 `(executionContext & (RenderContext | CommitContext)) !== NoContext` 체크로 재진입 방지.

소스에서 순서:
```js
// ReactFiberWorkLoop.js:1159-1161
let exitStatus = shouldTimeSlice
  ? renderRootConcurrent(root, lanes)   // 먼저 Render
  : renderRootSync(root, lanes, true);
// ... Render 완료 후에야 completeRoot → commitRoot 호출
```

---

**Q: 그러면 마이크로프론트엔드는 항상 하나의 앱 작업이 끝나야 다른 앱의 작업이 수행될수있나요?**

A: 아니다. `processRootScheduleInMicrotask`의 루프는 직접 렌더링하지 않고, 각 루트마다 **독립적인 콜백**을 Scheduler 태스크 큐에 등록한다:
```js
// ReactFiberRootScheduler.js:500-503
const newCallbackNode = scheduleCallback(
  schedulerPriorityLevel,
  performWorkOnRootViaSchedulerTask.bind(null, root),
);
```

Scheduler가 우선순위 큐(min heap)에서 꺼내서 실행하며, Concurrent 렌더링은 `workLoopConcurrent`의 시간 제한(25ms/5ms)에 걸려 양보(yield) 가능. 그 사이에 다른 루트의 태스크가 실행될 수 있다.

| 상황 | 동작 |
|------|------|
| Concurrent 작업 (Transition 등) | 루트별 독립 태스크, 시간 분할 인터리빙 가능 |
| Sync 작업 (클릭 핸들러 등) | `flushSyncWorkAcrossRoots_impl`에서 순차 처리 |

### 연결 토픽
- **scheduleUpdateOnFiber → ensureRootIsScheduled**: Step 1에서 다룬 FiberRoot/전역 변수가 실제로 어떻게 사용되는지 — setState가 렌더링을 트리거하는 전체 경로
- **Scheduler (Topic 6)**: FiberRoot 스케줄링 대기열에서 등록된 태스크가 Scheduler의 min heap에서 어떻게 우선순위별로 실행되는지
- **Lanes & Priority (Topic 5)**: pendingLanes, expiredLanes 등 FiberRoot의 Lane 필드가 스케줄링 결정에 어떻게 관여하는지

---

## 2026-02-16 (재개 — Step 2부터)

### 학습 로드맵
- [x] Step 1: FiberRoot와 전역 상태 변수 — FiberRoot 구조, 모듈 레벨 상태(workInProgress, executionContext 등)
- [ ] Step 2: 업데이트 진입점 — scheduleUpdateOnFiber → ensureRootIsScheduled — setState가 렌더링을 트리거하는 경로
- [ ] Step 3: Render Phase — renderRootSync / renderRootConcurrent — Sync vs Concurrent 분기, 시간 분할
- [ ] Step 4: performUnitOfWork와 트리 순회 — beginWork → completeUnitOfWork 순회 패턴
- [ ] Step 5: Commit Phase — completeRoot → commitRoot — 커밋 단계 구조 (mutation, layout, passive effects)

### 학습 요약
- `setState`의 정체는 `dispatchSetState.bind(null, currentlyRenderingFiber, queue)`로 생성된 함수. `.bind()`로 컴포넌트의 Fiber를 영구 고정하여, 나중에 호출 시에도 올바른 Fiber를 참조한다.
- Eager State 최적화: 큐가 비어있을 때(`fiber.lanes === NoLanes && alternate.lanes === NoLanes`) 렌더링 없이 state를 미리 계산하여 값이 같으면 bailout. 단, update는 큐에 보존되어 나중에 다른 이유로 리렌더 시 재처리된다.
- `fiber.lanes`는 해당 Fiber 자신의 대기 업데이트만 추적. 다른 Fiber의 업데이트와는 독립적.
- alternate는 Double Buffering 메커니즘 — current(화면)와 workInProgress(새로 그리는 중)가 서로를 `alternate`로 참조하며, 커밋 시 포인터 교체로 역할이 바뀐다.
- 전체 경로: `setState` → `dispatchSetState` → `scheduleUpdateOnFiber` → `markRootUpdated` → `ensureRootIsScheduled` → microtask → `processRootScheduleInMicrotask` → `scheduleTaskForRootDuringMicrotask` (Sync는 즉시 flush, Concurrent는 Scheduler 태스크 등록)

### 소스 코드 경로
- `ref/react-fork/packages/react-reconciler/src/ReactFiberHooks.js:1922-1934` — mountState (dispatchSetState.bind로 setter 생성)
- `ref/react-fork/packages/react-reconciler/src/ReactFiberHooks.js:261` — currentlyRenderingFiber 전역 변수
- `ref/react-fork/packages/react-reconciler/src/ReactFiberHooks.js:3598-3626` — dispatchSetState (setState 진입점)
- `ref/react-fork/packages/react-reconciler/src/ReactFiberHooks.js:3628-3698` — dispatchSetStateInternal (Eager State 최적화, Update 큐 등록, scheduleUpdateOnFiber 호출)
- `ref/react-fork/packages/react-reconciler/src/ReactFiberConcurrentUpdates.js:104-110` — fiber.lanes 업데이트 (eager bailout용)
- `ref/react-fork/packages/react-reconciler/src/ReactFiberWorkLoop.js:967-1093` — scheduleUpdateOnFiber (Suspended 감지, markRootUpdated, 렌더 중 업데이트 분기)
- `ref/react-fork/packages/react-reconciler/src/ReactFiberLane.js:825-849` — markRootUpdated (root.pendingLanes |= lane)
- `ref/react-fork/packages/react-reconciler/src/ReactFiberRootScheduler.js:116-152` — ensureRootIsScheduled (루트 링크드 리스트 추가 + microtask 예약)
- `ref/react-fork/packages/react-reconciler/src/ReactFiberRootScheduler.js:154-169` — ensureScheduleIsScheduled (중복 microtask 방지)
- `ref/react-fork/packages/react-reconciler/src/ReactFiberRootScheduler.js:650-695` — scheduleImmediateRootScheduleTask (microtask 또는 Scheduler macrotask 등록)
- `ref/react-fork/packages/react-reconciler/src/ReactFiberRootScheduler.js:259-348` — processRootScheduleInMicrotask (루트 순회 + 태스크 등록 + Sync flush)
- `ref/react-fork/packages/react-reconciler/src/ReactFiberRootScheduler.js:384-509` — scheduleTaskForRootDuringMicrotask (Lane→Scheduler 우선순위 매핑)
- `ref/react-fork/packages/react-reconciler/src/ReactFiber.js:327-355` — createWorkInProgress (alternate/Double Buffering 구현)

### Q&A 전체 기록

#### Step 2: 업데이트 진입점 — scheduleUpdateOnFiber → ensureRootIsScheduled

**Q: requestUpdateLane(fiber); << 여기서 넘기는 fiber는 (dispatchSetState가 받는 fiber는) 어디서 오는거고 값이 뭔가요?**

A: `ReactFiberHooks.js:1927-1931`의 `mountState`에서 `.bind()`로 미리 고정된 것이다:

```js
// mountState — useState()가 최초 호출될 때
const dispatch = dispatchSetState.bind(
  null,
  currentlyRenderingFiber,  // ← 이 순간의 값 = 지금 렌더링 중인 Fiber 노드
  queue,
);
```

`currentlyRenderingFiber` (`ReactFiberHooks.js:261`)는 모듈 레벨 전역 변수로, beginWork가 컴포넌트를 렌더링하기 직전에 설정된다. `.bind()`는 함수의 인자를 영구적으로 고정하므로, 나중에 `setCount(5)`를 호출하면 실제로 `dispatchSetState(FiberA, queue, 5)`가 된다. fiber의 값은 그 `useState`를 가진 컴포넌트의 Fiber 노드다.

---

**Q: eagerState는 뭔가요?**

A: "미리 계산해보는 state". 비유: 택배 주문을 넣기 전에 "지금 재고랑 똑같은 물건을 주문하는 거 아니야?"라고 미리 확인하는 것. 같으면 주문 자체를 취소.

소스 (`ReactFiberHooks.js:3648-3678`):

```js
if (fiber.lanes === NoLanes && (alternate === null || alternate.lanes === NoLanes)) {
  const currentState = queue.lastRenderedState;
  const eagerState = lastRenderedReducer(currentState, action);
  update.hasEagerState = true;
  update.eagerState = eagerState;
  if (is(eagerState, currentState)) {
    enqueueConcurrentHookUpdateAndEagerlyBailout(fiber, queue, update);
    return false;  // 렌더링 안 함
  }
}
```

큐가 비어있을 때만(= 대기 중인 다른 업데이트가 없을 때만) eager 계산을 하고, 값이 같으면 렌더링 스케줄링 자체를 하지 않는다. 큐에 대기 업데이트가 있으면 이전 업데이트 결과에 따라 현재 state가 달라질 수 있어 eager 계산을 건너뛴다.

---

**Q: alternate는 저번 학습중에 배운거같은데 아직 어떤 개념인지 명확히 잘 이해가 안됩니다**

A: **Double Buffering(이중 버퍼링)** 개념. 비유: 화이트보드 2개 — 하나는 관객에게 보여주는 보드(current), 다른 하나는 뒤에서 새로운 내용을 그리는 보드(workInProgress). 그리기가 끝나면 교체.

소스 (`ReactFiber.js:327-355`):

```js
export function createWorkInProgress(current, pendingProps) {
  let workInProgress = current.alternate;
  if (workInProgress === null) {
    workInProgress = createFiber(current.tag, pendingProps, current.key, current.mode);
    workInProgress.alternate = current;    // wip → current 연결
    current.alternate = workInProgress;    // current → wip 연결
  } else {
    // 이미 있으면 재활용 (GC 부담 감소)
    workInProgress.pendingProps = pendingProps;
    workInProgress.flags = NoFlags;
  }
}
```

current는 "화면에 커밋된 트리", workInProgress는 "새로 그리는 중인 트리". 커밋 시 `root.current = workInProgress`로 포인터 교체. 이전 current는 다음 렌더의 alternate(재활용 대상)가 된다.

---

**Q: 제가 잘못 이해한걸수있지만, "지금 렌더링 중인 Fiber" < 만약 지금 렌더링중인 Fiber에서의 setState가 트리거되지 않고 갑자기 다른 fiber의 setState가 트리거되면 어떻게되나요? (가능한지는 모르겠습니다)**

A: 문제없다. `currentlyRenderingFiber`는 dispatch 시점에 읽는 게 아니라, `useState`가 마운트될 때 `.bind()`로 이미 고정되어 있기 때문이다:

```
t1: A 렌더링 중 → useState() → dispatch = dispatchSetState.bind(null, FiberA, queue)
t2: B 렌더링 중 → currentlyRenderingFiber = FiberB
t3: 사용자 클릭 → setCount(5) 호출 → dispatchSetState(FiberA, queue, 5)
                                                       ↑
                                              bind 때 고정된 값, B와 무관
```

setter 함수는 "자기가 태어난 컴포넌트의 Fiber"를 평생 기억한다. `currentlyRenderingFiber`가 나중에 다른 값으로 바뀌어도 이미 바인딩된 함수에는 영향 없다.

---

**Q: bind때 고정이라는게 어떠한 의미를 가집니까?**

A: JavaScript의 `.bind()` 메서드는 함수의 인자를 영구적으로 고정한다:

```js
function add(a, b) { return a + b; }
const add5 = add.bind(null, 5);   // a = 5로 영구 고정
add5(3);   // add(5, 3) → 8
add5(10);  // add(5, 10) → 15
// 5는 절대 바뀌지 않음
```

React에서도 동일:

```js
const setCount = dispatchSetState.bind(null, FiberA, queue);
setCount(5);    // → dispatchSetState(FiberA, queue, 5)
setCount(10);   // → dispatchSetState(FiberA, queue, 10)
```

setter 함수는 "자기가 태어난 컴포넌트의 Fiber"를 평생 기억한다. 이것이 `useState`가 올바른 컴포넌트의 state를 업데이트할 수 있는 메커니즘이다.

---

**Q: "대기 중인 다른 업데이트가 없을 때만" 해당 로직을 실행하는 이유가 -> "이전 업데이트 결과에 따라 현재 state가 달라질 수 있어서"라면 대기중인 다른 업데이트가 해당 setState와 전혀 상관없는 업데이트여도 마찬가지입니까?**

A: `fiber.lanes`는 **이 fiber 자신의** 대기 업데이트만 추적한다. 소스 (`ReactFiberConcurrentUpdates.js:104-110`):

```js
// The fiber's `lane` field is used in some places to check if any work is
// scheduled, to perform an eager bailout, so we need to update it immediately.
fiber.lanes = mergeLanes(fiber.lanes, lane);
```

다른 fiber에 대기 업데이트가 있어도 이 fiber의 eager 계산에는 영향 없다:

```
Fiber A: lanes = SyncLane  (대기 업데이트 있음)
Fiber B: lanes = NoLanes   (대기 업데이트 없음)
B에서 setState(5) → B.lanes === NoLanes → eager 계산 진행 ✅
```

같은 fiber에서 연속 setState가 발생하면:

```
Fiber B: setState(5)  → B.lanes = SyncLane
Fiber B: setState(10) → B.lanes !== NoLanes → eager 건너뜀 ❌
```

---

**Q: state만 같으면 렌더링을 스킵하는게 안전한가요? (엣지 케이스 여부?)**

A: 완전히 "버리는" 것은 아니라 안전하다. 2가지 안전장치가 있음:

1. Update 객체는 큐에 남겨둔다:
```js
enqueueConcurrentHookUpdateAndEagerlyBailout(fiber, queue, update);
// 렌더링은 스케줄링하지 않지만, update는 큐에 넣어둠
```

2. 나중에 다른 이유로 리렌더되면 큐에 남아있던 update도 재처리된다. 소스의 주석 (`ReactFiberHooks.js:3672-3675`):
```js
// Fast path. We can bail out without scheduling React to re-render.
// It's still possible that we'll need to rebase this update later,
// if the component re-renders for a different reason and by that
// time the reducer has changed.
```

eager bailout은 "렌더링 스케줄링을 건너뛴다"는 것이지 "업데이트를 완전히 무시한다"는 것이 아니다.

---

**Q: alternate는 그러면 대기중인 화이트보드의 값을 들고있는건가요?**

A: 시점에 따라 역할이 바뀐다:

```
[렌더링 중이 아닐 때]
  current (화면) ←→ alternate (이전 렌더의 잔여 값, 재활용 대기)

[렌더링 중일 때]
  current (화면)  ←→  workInProgress (새로 그리는 중)
  memoizedState: 3     memoizedState: 5 (새 값)
```

eagerState 조건에서 `alternate.lanes`도 확인하는 이유:
- `fiber` = current 쪽, `alternate` = workInProgress 쪽 (있다면)
- 양쪽 다 대기 업데이트가 없어야 "현재 state가 확정됨"을 보장할 수 있다
- `alternate === null`은 아직 한 번도 리렌더된 적 없는 것(최초 마운트 후 첫 업데이트). 이때는 current 쪽만 확인하면 된다.

### 연결 토픽
- **Render Phase (Step 3)**: Step 2에서 스케줄링된 태스크가 실제로 renderRootSync/renderRootConcurrent에서 어떻게 실행되는지
- **Lanes & Priority**: `requestUpdateLane`이 어떻게 Lane을 결정하는지, Lane이 Scheduler 우선순위로 어떻게 매핑되는지
- **Hooks 내부 동작**: `mountState`/`updateState`에서 hook 링크드 리스트와 update 큐가 어떻게 관리되는지

---

## 2026-02-16 (재개 — Step 3부터)

### 학습 로드맵
- [x] Step 1: FiberRoot와 전역 상태 변수 — FiberRoot 구조, 모듈 레벨 상태(workInProgress, executionContext 등)
- [x] Step 2: 업데이트 진입점 — scheduleUpdateOnFiber → ensureRootIsScheduled — setState가 렌더링을 트리거하는 경로
- [x] Step 3: Render Phase — renderRootSync / renderRootConcurrent — Sync vs Concurrent 분기, 시간 분할
- [ ] Step 4: performUnitOfWork와 트리 순회 — beginWork → completeUnitOfWork 순회 패턴
- [ ] Step 5: Commit Phase — completeRoot → commitRoot — 커밋 단계 구조 (mutation, layout, passive effects)

### 학습 요약
- `performWorkOnRoot`에서 `shouldTimeSlice` 판단: `!forceSync && !includesBlockingLane(lanes) && !includesExpiredLane(root, lanes)` → true면 Concurrent, false면 Sync.
- `renderRootSync`는 `workLoopSync()` 호출 — `while (workInProgress !== null) { performUnitOfWork(workInProgress); }` — 중단 없이 모든 Fiber를 처리.
- `renderRootConcurrent`는 `workLoopConcurrent()` 호출 — `while (workInProgress !== null && now() < yieldAfter)` — 시간 예산(nonIdle: 25ms, Idle: 5ms) 초과 시 메인 스레드에 양보.
- 두 workLoop의 차이는 **딱 하나**: 시간 체크 조건(`now() < yieldAfter`)의 유무.
- Lane 만료 시간은 하드코딩: SyncLane 250ms, TransitionLane 5000ms, IdleLane은 만료 안 함. Meta 프로덕션 메트릭 기반 경험적 결정.
- Concurrent 모드에서 Suspend 시 `isThenableResolved`로 먼저 확인 → 이미 resolve되었으면 `replaySuspendedUnitOfWork`로 재실행, 아니면 리스너 등록 후 루프 탈출.
- Fiber 개념 재정립: Fiber 1개 = React 엘리먼트 1개(컴포넌트뿐 아니라 `<div>`, `<span>` 등 HTML 태그도 각각 Fiber). `workInProgress`는 지금 처리할 Fiber를 가리키는 포인터, `performUnitOfWork`는 그 Fiber 1개를 처리하고 포인터를 다음으로 옮기는 함수.

### 소스 코드 경로
- `ref/react-fork/packages/react-reconciler/src/ReactFiberWorkLoop.js:1117-1305` — performWorkOnRoot (shouldTimeSlice 판단, renderRoot 호출, exitStatus 분기)
- `ref/react-fork/packages/react-reconciler/src/ReactFiberWorkLoop.js:1148-1157` — shouldTimeSlice 결정 로직
- `ref/react-fork/packages/react-reconciler/src/ReactFiberWorkLoop.js:2596-2741` — renderRootSync (Sync 렌더링 루프)
- `ref/react-fork/packages/react-reconciler/src/ReactFiberWorkLoop.js:2745-2750` — workLoopSync (중단 없는 루프, 3줄)
- `ref/react-fork/packages/react-reconciler/src/ReactFiberWorkLoop.js:2752-3026` — renderRootConcurrent (Concurrent 렌더링 루프, Suspend 처리 포함)
- `ref/react-fork/packages/react-reconciler/src/ReactFiberWorkLoop.js:3029-3043` — workLoopConcurrent (시간 예산 기반 루프)
- `ref/react-fork/packages/react-reconciler/src/ReactFiberLane.js:477-539` — computeExpirationTime (Lane별 만료 시간 계산)
- `ref/react-fork/packages/react-reconciler/src/ReactFiberLane.js:541-588` — markStarvedLanesAsExpired (만료된 Lane을 expiredLanes에 표시)
- `ref/react-fork/packages/react-reconciler/src/ReactFiberLane.js:696-700` — includesExpiredLane
- `ref/react-fork/packages/shared/ReactFeatureFlags.js:137-138` — syncLaneExpirationMs=250, transitionLaneExpirationMs=5000

### Q&A 전체 기록

#### Step 3: Render Phase — renderRootSync / renderRootConcurrent

**Q: 너무 오래 대기의 기준이 뭔가요? / 그리고 대기가 길어진 이유가 있을거같은데 그거 상관없이 특정 대기 기간이 넘으면 무조건 실행인가요?**

A: 만료 시간은 Lane 종류별로 하드코딩되어 있다. `computeExpirationTime` (`ReactFiberLane.js:477-539`):

| Lane 종류 | 만료 시간 | 비유 |
|-----------|----------|------|
| SyncLane, InputContinuousLane, GestureLane | 250ms | 사용자 입력 — 즉시 반응 |
| DefaultLane, TransitionLane (1-14) | 5000ms (5초) | 비동기 전환 |
| IdleLane, OffscreenLane, DeferredLane | 만료 안 함 | 한가할 때만 |

이유 상관없이 만료되면 강제 Sync 실행. `markStarvedLanesAsExpired` (`ReactFiberLane.js:556`)의 주석: "assume the update is being starved and mark it as expired to force it to finish".

단, 예외로 suspended된 Lane(데이터 대기 중)은 만료 타이머를 시작하지 않음 (`ReactFiberLane.js:574`):
```js
if ((lane & suspendedLanes) === NoLanes || (lane & pingedLanes) !== NoLanes) {
  expirationTimes[index] = computeExpirationTime(lane, currentTime);
}
```

---

**Q: "중단없는" << 이 말은 한 렌더링 사이클동안을 의미하나요?**

A: 맞다. `workLoopSync`가 도는 동안 메인 스레드를 놓지 않는다. 사용자 클릭, 키 입력은 큐에 쌓이고, 애니메이션 프레임은 건너뛰며, setTimeout/Promise 콜백도 대기. Fiber 트리 순회가 끝나야(`workInProgress === null`) 메인 스레드가 해방된다.

---

**Q: "양보없음", "모든 Fiber를 한 번에 처리" << 이말은 순차적으로 대기열 모든 job을 실행한다는 의미일까요?**

A: "대기열의 모든 job"이 아니라, 이번 렌더에서 처리해야 할 Fiber 트리 전체를 한 번에 순회한다는 뜻.

```
workLoopSync:
  performUnitOfWork(HostRoot)      ← 트리 최상단부터
  performUnitOfWork(App)
  performUnitOfWork(Header)
  performUnitOfWork(Nav)
  performUnitOfWork(Main)
  performUnitOfWork(Footer)
  ... workInProgress === null      ← 트리 순회 완료, 루프 종료
```

`performUnitOfWork`는 한 번에 Fiber 1개를 처리. `workLoopSync`는 이걸 모든 Fiber에 대해 중단 없이 반복. 반면 `workLoopConcurrent`는 중간에 시간 체크(`now() < yieldAfter`)를 하므로 25ms 초과 시 루프를 탈출하고, 다음 Scheduler 태스크에서 이어서 진행.

---

**Q: workLoopSync와 workLoopConcurrent가 각각 어떨때 어떤게 실행될지는 사용자가 컨트롤합니까? 리액트 내부 로직이 컨트롤합니까?**

A: 둘 다. 사용자가 API 선택으로 간접 결정하고, React가 그 선택을 바탕으로 내부 판단.

| 사용자 API | → 할당되는 Lane | → 결과 |
|-----------|----------------|-------|
| `setState()` (이벤트 핸들러 내) | SyncLane | Sync (Blocking Lane) |
| `startTransition(() => setState())` | TransitionLane | Concurrent |
| `flushSync(() => setState())` | SyncLane + forceSync | Sync (강제) |
| `useDeferredValue` | TransitionLane | Concurrent |

판단 로직 (`ReactFiberWorkLoop.js:1148-1157`):
```
shouldTimeSlice = !forceSync
                  && !includesBlockingLane(lanes)
                  && !includesExpiredLane(root, lanes)
```
사용자가 "무엇을"(어떤 API) 결정하고, React가 "어떻게"(Sync/Concurrent) 실행. `startTransition`을 쓰면 Concurrent의 "자격"을 얻지만, 만료되면 React가 Sync로 강등.

---

**Q: Step 2에서 scheduleTaskForRootDuringMicrotask가 Scheduler에 등록한 콜백 → performWorkOnRootViaSchedulerTask → performWorkOnRoot 흐름을 시각화해주세요**

A:

```
사용자: setCount(5)
    │
    ▼
dispatchSetState(fiber, queue, 5)           ← bind로 고정된 fiber
    │
    ├── Eager State 체크 (값 같으면 여기서 끝)
    │
    ▼
scheduleUpdateOnFiber(fiber, lane)
    │
    ├── markRootUpdated(root, lane)          ← root.pendingLanes |= lane
    │
    ▼
ensureRootIsScheduled(root)
    │
    ├── root를 링크드 리스트에 추가
    │
    ▼
[microtask 경계] ─────────────────────────────
    │
    ▼
processRootScheduleInMicrotask()
    │
    ├── 각 root 순회
    │
    ▼
scheduleTaskForRootDuringMicrotask(root)
    │
    ├── getNextLanes(root) → 처리할 Lane 결정
    ├── Lane → Scheduler 우선순위 매핑
    │
    ├── Sync Lane?  ──YES──▶ syncQueue에 추가
    │                         │
    │                         ▼
    │                       flushSyncWorkAcrossRoots()
    │                         │
    │                         ▼
    │                       performWorkOnRoot(root, lanes, forceSync=true)
    │                         │
    │                         ▼
    │                       shouldTimeSlice = false (forceSync)
    │                         │
    │                         ▼
    │                       renderRootSync()
    │                         │
    │                         ▼
    │                       workLoopSync()
    │                         while (wip !== null)
    │                           performUnitOfWork(wip)   ← 중단 없음
    │
    └── Transition Lane? ──YES──▶ scheduleCallback(priority, callback)
                                   │
                                   ▼
                                 [Scheduler 큐에 등록]
                                   │
                                   ▼ (Scheduler가 꺼내서 실행)
                                 performWorkOnRootViaSchedulerTask()
                                   │
                                   ▼
                                 performWorkOnRoot(root, lanes, forceSync=false)
                                   │
                                   ▼
                                 shouldTimeSlice = true
                                   │
                                   ▼
                                 renderRootConcurrent()
                                   │
                                   ▼
                                 workLoopConcurrent()
                                   while (wip !== null && now() < yieldAfter)
                                     performUnitOfWork(wip)   ← 25ms/5ms 후 양보
```

---

**Q: 하드코딩된 만료시간 기준이 뭘까요? PR이나 주석등에 있나요?**

A: 이론적 공식이 아니라, Meta의 프로덕션 메트릭에서 경험적으로 결정된 값. `ReactFiberLane.js:484-492`의 주석:

> "This is set to the corresponding constant as in Scheduler.js. When we made it larger, a product metric in www regressed, suggesting there's a user interaction that's being starved by a series of synchronous updates."

- 250ms (`syncLaneExpirationMs`): Scheduler의 `userBlockingPriorityTimeout`과 동일 (`SchedulerFeatureFlags.js:13`). Meta가 이 값을 늘렸더니 프로덕션에서 사용자 인터랙션 반응성이 떨어져서 250ms 유지.
- 5000ms (`transitionLaneExpirationMs`): Transition은 "느려도 괜찮은 작업"이므로 넉넉하게 5초. 구체적인 PR 근거는 소스에서 확인하지 못했지만, "사용자가 인지하기 시작하는 지연" 기준으로 보임.

---

**Q: fiber에 대한 개념과 범위를 아직 완벽히 이해 못해서 실생활 예시로 완벽히 이해하고 싶습니다**

A: 레스토랑 "주문 티켓 시스템" 비유로 설명:

- **Fiber 하나 = 주문 티켓 1장**: 메뉴 종류(tag), 주문 내용(pendingProps), 지난번 결과(memoizedState), 해야 할 작업(flags), 긴급도(lanes) 등이 적혀 있음.
- **Fiber 트리 = 티켓들의 연결**: child(첫 하위 항목), sibling(같은 레벨 다음), return(상위). 배열이 아니라 링크드 리스트이므로 한 장씩 처리하다 멈출 수 있음 — Concurrent 렌더링의 핵심.
- **Double Buffering = 서빙 트레이 2개**: current(테이블 위, 손님이 보는 것) ↔ workInProgress(주방에서 준비 중). 완성되면 트레이 교체(Commit).
- **workLoopSync = 모든 티켓 쉬지 않고 처리** (주방 문 잠금).
- **workLoopConcurrent = 25ms마다 주방 문 열고 VIP 주문 확인**.
- **Fiber 이전(Stack Reconciler)**: 재귀 호출로 전체 트리를 한 숨에 처리, 중단 불가. **Fiber 이후**: 각 엘리먼트가 독립 티켓이므로 아무 티켓 사이에서든 멈출 수 있음.

한 줄 정리: **Fiber는 컴포넌트를 "한 번에 처리해야 하는 재귀 호출"에서 "하나씩 처리할 수 있는 독립 작업 단위"로 바꾼 자료구조.**

---

**Q: fiber 1개가 그러면 하나의 컴포넌트라고 매핑해서 이해해도됩니까?**

A: 거의 맞지만, 정확히는 아니다. Fiber 1개 = 컴포넌트 1개가 아니라, **React 엘리먼트 1개**.

```jsx
function App() {
  return (
    <div>              // ← Fiber 1개 (HostComponent)
      <Header />       // ← Fiber 1개 (FunctionComponent)
      <span>hello</span> // ← Fiber 1개 (HostComponent)
    </div>
  );
}
```

Fiber 트리: App(Fiber) → div(Fiber) → Header(Fiber) → h1(Fiber), span(Fiber). **Fiber 5개, 컴포넌트는 2개**(App, Header). `<div>`, `<span>` 같은 HTML 태그도 각각 Fiber.

---

**Q: React 엘리먼트 1개가 하나의 fiber이고, performUnitOfWork는 지금 처리해야할 fiber(리액트 엘리먼트)의 포인터를 가리킨다 << 이렇게 이해하면되나요?**

A: 맞다. 한 가지만 정밀하게 하면:

- `performUnitOfWork`는 **함수** (Fiber 1개를 처리하는 함수)
- `workInProgress`가 **포인터** (지금 처리할 Fiber를 가리킴)

```js
function workLoopSync() {
  while (workInProgress !== null) {       // ← 포인터가 null이 아닌 동안
    performUnitOfWork(workInProgress);    // ← 그 Fiber를 처리
  }
}
```

정리: React 엘리먼트 1개 = Fiber 1개, `workInProgress` = 지금 처리할 Fiber를 가리키는 포인터, `performUnitOfWork` = 그 포인터가 가리키는 Fiber 1개를 처리하고 포인터를 다음으로 옮기는 함수.

### 연결 토픽
- **performUnitOfWork와 트리 순회 (Step 4)**: Fiber 트리를 어떤 순서로 순회하는지 — beginWork(내려가기) → completeUnitOfWork(올라오기) 패턴
- **Commit Phase (Step 5)**: Render Phase에서 flags가 표시된 Fiber들을 실제 DOM에 반영하는 단계
- **Reconciliation (Topic 6)**: beginWork 내부에서 자식 Fiber를 어떻게 비교/재활용하는지 — key와 diffing 알고리즘
