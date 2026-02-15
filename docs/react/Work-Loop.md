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
