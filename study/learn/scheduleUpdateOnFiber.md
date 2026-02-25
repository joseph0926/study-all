# scheduleUpdateOnFiber

> 최초 질문: react의 scheduleUpdateOnFiber에 대해서 설명해주세요
> 일시: 2026-02-25

---

## Q1. react의 scheduleUpdateOnFiber에 대해서 설명해주세요

### 비유: 소방서 중앙 신고 접수대

`scheduleUpdateOnFiber`는 **소방서의 중앙 신고 접수대**입니다. 도시(앱) 어디서든 화재(상태 변경)가 발생하면 반드시 이 접수대를 거쳐야 소방차(렌더 패스)가 출동합니다.

| React | 비유 |
|-------|------|
| `scheduleUpdateOnFiber(root, fiber, lane)` | 접수대에 "어디서(fiber), 얼마나 긴급한지(lane)" 신고 |
| `prepareFreshStack` (suspend 상태일 때) | 현재 출동 중인 소방차를 복귀시키고 처음부터 재출동 |
| `markRootUpdated(root, lane)` | 신고 접수 대장에 "이 지역에 미처리 건 있음" 기록 |
| `ensureRootIsScheduled(root)` | 소방차 출동 명령 — 이미 출동 중이면 무시, 아니면 즉시 배차 |
| 렌더 패스 내 업데이트 감지 | 출동 중 새 신고 → 현재 출동 중단하고 재배치할지 판단 |

### 코드 설명

`scheduleUpdateOnFiber`의 함수 본체를 단계별로 분석합니다.

#### 시그니처와 호출자

```ts
// ref/react-fork/packages/react-reconciler/src/ReactFiberWorkLoop.js:967
export function scheduleUpdateOnFiber(
  root: FiberRoot,
  fiber: Fiber,
  lane: Lane,
)
```

세 가지 인자를 받습니다:
- `root`: fiber 트리가 속한 FiberRoot (DOM의 `#root`)
- `fiber`: 업데이트가 발생한 fiber 노드
- `lane`: 업데이트의 우선순위 비트

**비유 매칭**: "어떤 도시(root)의 어느 건물(fiber)에서 어떤 등급(lane)의 화재가 발생했는가"

**호출 지점** — 이 함수를 호출하는 곳이 곧 "렌더 패스를 시작시킬 수 있는 모든 경로"입니다:

| 호출자 | 파일:라인 | 트리거 |
|-------|----------|-------|
| `dispatchReducerAction` | `ReactFiberHooks.js:3590` | `useReducer` dispatch |
| `dispatchSetStateInternal` | `ReactFiberHooks.js:3692` | `useState` setState |
| `enqueueSetState` | `ReactFiberClassComponent.js:183` | `this.setState()` |
| `enqueueForceUpdate` | `ReactFiberClassComponent.js:235` | `this.forceUpdate()` |
| `forceStoreRerender` | `ReactFiberHooks.js:1890` | `useSyncExternalStore` |
| `updateContainerImpl` | `ReactFiberReconciler.js:455` | `root.render()` |
| `useOptimistic` dispatch | `ReactFiberHooks.js:3786` | `useOptimistic` |
| `refreshCache` | `ReactFiberHooks.js:3521` | `use(refreshContext)` |

#### 단계 1: Suspended 렌더 중단 체크 (line 984-1004)

```js
// ReactFiberWorkLoop.js:986-996
if (
  (root === workInProgressRoot &&
    (workInProgressSuspendedReason === SuspendedOnData ||
      workInProgressSuspendedReason === SuspendedOnAction)) ||
  root.cancelPendingCommit !== null
) {
  prepareFreshStack(root, NoLanes);
  markRootSuspended(root, workInProgressRootRenderLanes, ...);
}
```

**현재 이 root에서 렌더가 진행 중이고 Suspense로 인해 멈춰있다면**, 새 업데이트가 그 Suspend를 풀어줄 수 있으므로 **현재 렌더를 버리고 처음부터 다시 시작**합니다.

**비유 매칭**: 소방차가 길이 막혀(Suspend) 대기 중인데, 새 신고가 들어오면 "혹시 이 신고가 길을 뚫어줄 수 있을지 모르니" 현재 출동을 리셋하고 처음부터 재배치.

#### 단계 2: Root에 pending update 마킹 (line 1007)

```js
// ReactFiberWorkLoop.js:1007
markRootUpdated(root, lane);
```

`ReactFiberLane.js:825-826`에서 실제 구현:
```js
root.pendingLanes |= updateLane;
```

root의 `pendingLanes` 비트마스크에 해당 lane 비트를 OR로 켭니다.

**비유 매칭**: 신고 접수 대장에 "이 등급(lane)의 미처리 건이 있음"을 기록.

#### 단계 3: 렌더 중 업데이트인지 분기 (line 1009-1092)

여기서 **두 갈래**로 나뉩니다:

**경로 A: 렌더 페이즈 안에서 발생한 업데이트 (line 1009-1024)**

```js
if ((executionContext & RenderContext) !== NoContext && root === workInProgressRoot) {
  // render phase update — 경고 + 추적만
  workInProgressRootRenderPhaseUpdatedLanes = mergeLanes(..., lane);
}
```

렌더 중에 `setState`를 호출한 경우. 이때는 현재 렌더 패스에 "추가 작업"으로 기록만 합니다. `ensureRootIsScheduled`를 호출하지 **않습니다** — 이미 렌더 중이므로.

**경로 B: 일반 업데이트 (line 1025-1092) — 대부분의 경우**

```js
} else {
  // ... DevTools/Transition 추적 ...

  if (root === workInProgressRoot) {
    // 현재 렌더 중인 root에 interleaved update
    workInProgressRootInterleavedUpdatedLanes = mergeLanes(..., lane);

    if (workInProgressRootExitStatus === RootSuspendedWithDelay) {
      markRootSuspended(...);  // 현재 렌더 중단, 새 업데이트로 전환
    }
  }

  ensureRootIsScheduled(root);  // ★ 핵심: 스케줄러에 작업 등록
}
```

#### 단계 4: `ensureRootIsScheduled` — 실제 스케줄링 (line 1073)

이것이 **핵심 호출**입니다. `ReactFiberRootScheduler.js:116-152`에서:

```js
export function ensureRootIsScheduled(root: FiberRoot): void {
  // 1) root를 스케줄 링크드 리스트에 추가
  if (root === lastScheduledRoot || root.next !== null) {
    // 이미 스케줄됨 — skip
  } else {
    lastScheduledRoot.next = root;
    lastScheduledRoot = root;
  }

  // 2) microtask 예약
  mightHavePendingSyncWork = true;
  ensureScheduleIsScheduled();  // → scheduleImmediateRootScheduleTask()
}
```

**비유 매칭**: 소방차 출동 명령 — 이미 배차된 root면 무시하고, 아니면 출동 대기열(linked list)에 넣고 microtask로 실제 스케줄링을 예약합니다.

중요한 점: 여기서 **즉시 렌더가 시작되지 않습니다**. microtask(Promise.resolve)를 통해 현재 이벤트 핸들러가 끝난 후에 `processRootScheduleInMicrotask`가 실행되면서 실제 work loop이 시작됩니다. 이것이 React의 **자동 배칭**이 가능한 이유입니다 — 같은 이벤트 안의 여러 setState는 하나의 microtask로 합쳐집니다.

### 시각화: 전체 흐름

```
setState() / dispatch()
    │
    ▼
requestUpdateLane(fiber)     ← 우선순위(lane) 결정
    │
    ▼
enqueueConcurrentHookUpdate  ← update 객체를 큐에 추가
    │
    ▼
┌─────────────────────────────────────────────────────┐
│        scheduleUpdateOnFiber(root, fiber, lane)     │
│                                                     │
│  ① Suspended 렌더 체크                               │
│     └─ 멈춰있으면 → prepareFreshStack (리셋)          │
│                                                     │
│  ② markRootUpdated(root, lane)                      │
│     └─ root.pendingLanes |= lane                    │
│                                                     │
│  ③ 렌더 중 업데이트?                                  │
│     ├─ YES → renderPhaseUpdatedLanes 기록만           │
│     └─ NO  ↓                                        │
│                                                     │
│  ④ ensureRootIsScheduled(root)                      │
│     └─ root를 스케줄 큐에 등록                         │
│     └─ microtask 예약                                │
└─────────────────────────────────────────────────────┘
    │
    ▼ (microtask 실행 시점)
processRootScheduleInMicrotask
    │
    ▼
scheduleTaskForRootDuringMicrotask
    │
    ▼
performWorkOnRoot → work loop 시작
    │
    ▼
beginWork(각 fiber) → 트리 순회
```

### 연결

| 대상 토픽 | 관계 | 근거 |
|-----------|------|------|
| `study/learn/React-리렌더링-트리거.md` | **상위 메커니즘 → 세부 구현** | 해당 문서에서 `scheduleUpdateOnFiber`를 "렌더 패스의 유일한 입구"로 정의하고, 호출 지점을 나열함. 이번 학습은 그 함수 **내부**에서 일어나는 일을 단계별로 분석 |
| `study/react/Lane-Model-And-Priority.md` | **전제 지식 (lane 비트마스크)** | `scheduleUpdateOnFiber`가 받는 `lane` 파라미터의 비트마스크 구조, `markRootUpdated`에서 `pendingLanes |= lane` 연산의 의미를 이해하려면 Lane 모델 이해가 전제됨 |

---

## Q2. "이 root에서 렌더가 진행 중이고 Suspense로 인해 멈춰있다면" — 렌더를 시작한 후 체크하는 건가요? 즉 이 함수가 렌더를 시작하는 게 아닌 건가요?

### `scheduleUpdateOnFiber`는 렌더를 **직접 시작하지 않습니다**

이 함수는 **"렌더를 예약(schedule)하는 함수"**이지, **"렌더를 실행(perform)하는 함수"**가 아닙니다.

### 코드 근거: 누가 렌더를 실제로 시작하는가

```
scheduleUpdateOnFiber        ← 예약만 함
    │
    ▼
ensureRootIsScheduled        ← microtask 예약
    │
    ▼ (현재 이벤트 핸들러 종료 후, microtask 실행)
processRootScheduleInMicrotask
    │
    ▼
scheduleTaskForRootDuringMicrotask
    │
    ▼
performWorkOnRoot            ← 여기서 실제 work loop 시작
```

`ReactFiberRootScheduler.js:116-141`에서 `ensureRootIsScheduled`는 root를 큐에 넣고 microtask를 예약할 뿐, **즉시 렌더를 실행하지 않습니다**.

### Suspended 체크가 보고 있는 것은 **이전에 시작된 렌더**

```
[시점 1] 어떤 setState → scheduleUpdateOnFiber → 렌더 시작
            │
            ▼
         work loop 진행 중 Suspense throw → 렌더가 "멈춤"(suspended)
            │                                 workInProgressRoot = 이 root
            │                                 workInProgressSuspendedReason = SuspendedOnData
            │
[시점 2] 새로운 setState → scheduleUpdateOnFiber 다시 호출
            │
            ▼
         "어? 이 root에서 이전 렌더가 멈춰있네"  ← 이 체크
            │
            ▼
         prepareFreshStack → 멈춰있던 렌더를 버리고 리셋
```

`workInProgressRoot`와 `workInProgressSuspendedReason`은 **모듈 레벨 변수**로, 이전 렌더 패스의 상태가 남아있는 것입니다.

### 비유 보정

| React | 비유 |
|-------|------|
| `scheduleUpdateOnFiber` | 접수대에 **신고 접수** (출동 명령서 작성) |
| `ensureRootIsScheduled` | 명령서를 **출동 대기열에 넣음** |
| `performWorkOnRoot` | 소방차가 **실제 출동** |
| Suspended 체크 | 접수 시 "이 지역에 이미 출동했다가 길 막혀서 대기 중인 소방차가 있나?" 확인 → 있으면 그 소방차를 복귀시키고 처음부터 재배치 |

### 함수 이름의 의미

`schedule`UpdateOnFiber — 이름 자체가 "스케줄(예약)한다"입니다. `perform`이나 `execute`가 아닙니다. 이것이 React의 자동 배칭이 가능한 구조적 이유이기도 합니다. 같은 이벤트 안에서 여러 번 호출되어도 **예약만 쌓이고**, 실제 렌더는 microtask에서 **한 번만** 실행됩니다.

---

## Q3. "버린다"가 위험하게 들립니다. 이전 업데이트가 유실될 가능성은? 계속 멈추고 버리고가 반복되어 병목될 가능성은?

### 1. 버린 업데이트가 유실되는가? — **아닙니다**

"버린다"는 것은 **렌더 진행 상태(work-in-progress 트리)**를 버리는 것이지, **업데이트 객체 자체**를 버리는 것이 아닙니다.

#### 핵심: 업데이트와 렌더는 다른 곳에 저장됩니다

```
setState(newValue)
    │
    ▼
① enqueueConcurrentHookUpdate(fiber, queue, update, lane)
    │   └─ concurrentQueues[] 배열에 update 저장  ← 여기가 안전 금고
    │   └─ ReactFiberConcurrentUpdates.js:97-100
    │
    ▼
② scheduleUpdateOnFiber(root, fiber, lane)
    │   └─ Suspended 상태면 prepareFreshStack → work-in-progress 트리 리셋
    │                                           ↑ 이것만 버림
    ▼
③ 새 렌더 시작 시 prepareFreshStack 내부에서:
    finishQueueingConcurrentUpdates()   ← 금고에서 꺼내서 fiber 큐에 연결
    // ReactFiberWorkLoop.js:2257
```

`ReactFiberConcurrentUpdates.js:89-112`를 보면:

```js
function enqueueUpdate(fiber, queue, update, lane) {
  // 글로벌 배열에 임시 저장 (렌더와 무관한 별도 공간)
  concurrentQueues[concurrentQueuesIndex++] = fiber;
  concurrentQueues[concurrentQueuesIndex++] = queue;
  concurrentQueues[concurrentQueuesIndex++] = update;
  concurrentQueues[concurrentQueuesIndex++] = lane;
}
```

이 배열은 `prepareFreshStack`이 리셋하는 대상이 **아닙니다**. `prepareFreshStack`은 `workInProgress`, `workInProgressRootRenderLanes` 같은 **렌더 진행 상태**만 초기화합니다.

그리고 새 렌더가 시작될 때 `finishQueueingConcurrentUpdates()`(`ReactFiberWorkLoop.js:2257`)가 이 배열에서 update 객체를 꺼내서 각 fiber의 큐에 연결합니다:

```js
// ReactFiberConcurrentUpdates.js:67-77
if (queue !== null && update !== null) {
  const pending = queue.pending;
  if (pending === null) {
    update.next = update; // 순환 리스트 생성
  } else {
    update.next = pending.next;
    pending.next = update;
  }
  queue.pending = update;
}
```

#### 비유

| | 비유 |
|---|---|
| update 객체 | 우편물 |
| `concurrentQueues[]` | 우체국 보관함 (안전) |
| work-in-progress 트리 | 배달원의 배달 경로 메모 |
| `prepareFreshStack` | 배달 경로 메모를 찢고 새로 작성 — **우편물은 보관함에 그대로 있음** |
| `finishQueueingConcurrentUpdates` | 새 배달 시작 시 보관함에서 우편물을 꺼내 각 집 우편함에 넣기 |

**버리는 것은 "배달 경로"이지 "우편물"이 아닙니다.**

### 2. 무한 suspend-restart 병목은? — **Lane 시스템이 방지합니다**

#### 방어 1: `markRootSuspended` — suspended lane을 분리

```js
// ReactFiberLane.js:851-860
export function markRootSuspended(root, suspendedLanes, spawnedLane, ...) {
  root.suspendedLanes |= suspendedLanes;    // 멈춘 lane을 기록
  root.pingedLanes &= ~suspendedLanes;      // ping 대기 상태로
}
```

`scheduleUpdateOnFiber`에서 restart할 때 `markRootSuspended`를 호출합니다(`ReactFiberWorkLoop.js:998-1003`). 이전 렌더의 lane은 `root.suspendedLanes`에 기록됩니다. 새 렌더를 스케줄링할 때 scheduler는 `pendingLanes`에서 `suspendedLanes`를 제외하므로, **데이터가 준비될 때까지 그 lane을 재시도하지 않습니다**.

#### 방어 2: 새 업데이트가 다른 lane을 받음

```js
// ReactFiberWorkLoop.js:844-848 (markRootUpdated 내부)
if (updateLane !== IdleLane) {
  root.suspendedLanes = NoLanes;  // 새 업데이트가 오면 suspend 해제
  root.pingedLanes = NoLanes;
}
```

새 업데이트가 도착하면 `suspendedLanes`를 클리어하지만, 이때 새 렌더는 **이전 lane + 새 lane을 합쳐서** 처리합니다. 새 업데이트의 데이터가 이미 있다면 Suspend가 발생하지 않고 렌더가 완주됩니다.

#### 방어 3: Ping 메커니즘 — Promise 해결 시 정확한 재시도

Suspense가 throw한 Promise가 resolve되면 `pingSuspendedRoot`가 호출되어 해당 lane만 정확히 `pingedLanes`에 마킹합니다. **데이터가 준비된 lane만 재시도**하므로 맹목적 반복이 아닙니다.

#### 시각화: 병목이 일어나지 않는 이유

```
[시점 1] setState → lane A 할당 → 렌더 시작
              │
              ▼
         Suspense throw (Promise 미완료)
              │
              ├─ lane A → root.suspendedLanes에 기록
              │           (데이터 올 때까지 재시도 안 함)
              │
[시점 2] 새 setState → lane B 할당 → restart
              │
              ▼
         렌더 (lane A + B) 시작
              │
              ├─ lane A의 Suspense → 데이터 아직 없음 → 다시 suspend
              │   └─ BUT: lane B의 업데이트는 이미 반영됨
              │
              ├─ React는 lane B만이라도 커밋할 수 있는지 판단
              │
[시점 3] Promise resolve → ping → lane A만 정확히 재시도
              │
              ▼
         렌더 (lane A) → 데이터 있음 → 완주 → 커밋
```

---

## Q4. Suspense 데이터가 안 올 수도 있을 것 같습니다. Suspense resolve를 포기하나요? 포기한다면 그 기준점은?

### 결론: "포기"가 아니라 "기다리면서 다른 것을 보여줍니다"

React는 데이터가 안 오더라도 Promise를 **영원히 기다립니다**. 다만 **사용자에게 빈 화면을 보여주지 않기 위해**, 일정 시점에 Suspense의 fallback(로딩 스피너 등)을 커밋합니다. 나중에 Promise가 resolve되면 그때 다시 시도합니다.

### 업데이트 종류에 따라 전략이 다르다

#### 경우 1: Transition (startTransition) — **무기한 대기, fallback 안 보여줌**

```js
// ReactFiberWorkLoop.js:1415-1437
case RootSuspendedAtTheShell: {
  // This is a transition, so we should exit without committing a
  // placeholder and without scheduling a timeout. Delay indefinitely
  // until we receive more data.
  markRootSuspended(root, lanes, ...);
  return;  // ← 아무것도 커밋하지 않고 그냥 리턴
}
```

주석 그대로: **"Delay indefinitely until we receive more data."**

Transition은 "이전 화면을 유지한 채 새 화면을 준비하는" 업데이트입니다. 데이터가 안 오면 **이전 화면이 그대로 남아있습니다**.

`shouldRemainOnPreviousScreen` 함수(`ReactFiberWorkLoop.js:2405-2460`)가 이 판단을 합니다:

```js
// ReactFiberWorkLoop.js:2424-2429
if (includesOnlyTransitions(workInProgressRootRenderLanes)) {
  if (getShellBoundary() === null) {
    // 이전 화면에 보이는 콘텐츠가 사라지면 안 됨 → 이전 화면 유지
    return true;
  }
}
```

#### 경우 2: 일반 업데이트 (SyncLane 등) — **즉시 fallback 커밋**

```js
// ReactFiberWorkLoop.js:2457-2459
// For all other Lanes besides Transitions and Retries, we should not wait
// for the data to load.
return false;  // ← 이전 화면 유지 안 함 → 바로 fallback 보여줌
```

SyncLane이나 DefaultLane 같은 일반 업데이트에서 Suspend가 발생하면, **즉시 Suspense boundary의 fallback을 커밋**합니다. 이것도 "포기"가 아니라, fallback을 보여주면서 Promise를 계속 기다리는 것입니다.

#### 경우 3: Retry — **300ms 스로틀 후 fallback 커밋**

```js
// ReactFiberWorkLoop.js:1482-1528
const msUntilTimeout =
  globalMostRecentFallbackTime + FALLBACK_THROTTLE_MS - now();
                                  // ↑ 300ms (line 525)
if (msUntilTimeout > 10) {
  root.timeoutHandle = scheduleTimeout(
    completeRootWhenReady.bind(...),
    msUntilTimeout,
  );
  return;
}
```

이전에 fallback이 커밋된 후 재시도(retry)할 때, **너무 빠르게 로딩 스피너가 깜빡이는 것을 방지**하기 위해 300ms 스로틀을 걸어놓습니다.

### Promise가 영원히 resolve 안 되면?

#### Ping 메커니즘: Promise가 resolve되어야만 재시도

```js
// ReactFiberWorkLoop.js:4959-4966
const ping = pingSuspendedRoot.bind(null, root, wakeable, lanes);
wakeable.then(ping, ping);  // ← resolve든 reject든 ping
```

`attachPingListener`(`ReactFiberWorkLoop.js:4924-4967`)에서 **Promise의 `.then()`에 ping 콜백을 등록**합니다. Promise가 resolve/reject되면 `pingSuspendedRoot`가 호출되어 해당 lane을 `pingedLanes`에 마킹하고, `ensureRootIsScheduled`로 재시도를 스케줄링합니다.

**Promise가 영원히 pending이면?** → ping이 영영 오지 않습니다. 그러면:

```
┌──────────────────┬──────────────────────────────────────────┐
│ 업데이트 유형      │ "데이터 안 올 때" 최종 상태                │
├──────────────────┼──────────────────────────────────────────┤
│ Transition       │ 이전 화면이 영원히 유지됨                  │
│                  │ (fallback도 안 보임, 업데이트가 "없던 일"  │
│                  │  처럼 보임)                               │
│                  │ lane은 root.suspendedLanes에 잠긴 채 남음  │
├──────────────────┼──────────────────────────────────────────┤
│ 일반 업데이트     │ fallback(로딩 스피너)이 영원히 보임        │
│ (Sync/Default)   │ Promise가 resolve되어야만 콘텐츠로 교체    │
├──────────────────┼──────────────────────────────────────────┤
│ Retry            │ fallback이 이미 보이는 상태에서            │
│                  │ 로딩 스피너가 영원히 유지됨                 │
└──────────────────┴──────────────────────────────────────────┘
```

### React에 "타임아웃 후 포기" 메커니즘은 없는가?

**없습니다.** React 자체에는 "N초 후 Suspense를 포기하고 에러로 전환" 같은 빌트인 타임아웃이 없습니다. 이것은 **의도적 설계**입니다 — 타임아웃 정책은 앱 레벨의 결정이기 때문입니다.

타임아웃이 필요하면 앱 코드에서 직접 구현해야 합니다:

```jsx
function fetchWithTimeout(url, ms) {
  return Promise.race([
    fetch(url),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), ms)
    )
  ]);
}
```

Promise가 reject되면 → ping이 호출됨 → 재시도 → throw된 Error가 **Error Boundary**로 전파됨. 이것이 "포기"에 가장 가까운 경로입니다.

### 시각화

```
Promise 상태별 React 동작 흐름:

setState → scheduleUpdateOnFiber → 렌더 시작
    │
    ▼
Suspense에서 Promise throw
    │
    ├─ Promise에 ping listener 등록: wakeable.then(ping, ping)
    │
    ▼
┌─ Transition?
│   ├─ YES → 이전 화면 유지 (fallback 안 보임)
│   └─ NO  → fallback 즉시 커밋 (로딩 스피너)
│
│  ... 시간 경과 ...
│
├─ Promise resolve → ping → pingSuspendedRoot
│   │                         │
│   │                         ├─ pingedLanes |= lanes
│   │                         └─ ensureRootIsScheduled
│   │                                    │
│   ▼                                    ▼
│   데이터 있음 → 렌더 완주 → 콘텐츠 커밋   ✅
│
├─ Promise reject → ping → 재시도 → Error throw
│   └─ Error Boundary가 catch → 에러 UI 표시  ⚠️
│
└─ Promise 영원히 pending → ping 안 옴
    └─ Transition: 이전 화면 영원히 유지        🔄
    └─ 일반: fallback 영원히 표시               ⏳
       (React는 포기하지 않음 — 앱이 처리해야 함)
```

---

## Q5. 무한 대기 시 성능적 문제는 없을까요?

### 결론: 성능 문제는 **거의 없습니다** — "무한 대기"는 사실상 "아무것도 안 하는 것"이기 때문입니다

### 핵심: suspended 상태는 폴링이 아니라 "완전한 정지"

React는 주기적으로 "데이터 왔나?" 확인하지 않습니다. Promise의 `.then()` 콜백에 의한 **이벤트 구동(event-driven)** 방식이므로, 데이터가 안 오면 **React 코드가 아예 실행되지 않습니다.**

#### 근거 1: 스케줄러가 suspended lane을 완전히 무시

`getNextLanes`(`ReactFiberLane.js:249-361`)에서:

```js
// ReactFiberLane.js:284
const nonIdleUnblockedLanes = nonIdlePendingLanes & ~suspendedLanes;
//                                                   ↑ suspended 비트를 빼고 계산
```

suspended된 lane은 `~suspendedLanes` 마스크로 **제거**됩니다. pinged되지 않는 한 `getNextLanes`는 `NoLanes`를 반환합니다.

#### 근거 2: `NoLanes`면 스케줄 큐에서 제거

`scheduleTaskForRootDuringMicrotask`(`ReactFiberRootScheduler.js:420-438`)에서:

```js
if (
  nextLanes === NoLanes ||
  (root === workInProgressRoot && isWorkLoopSuspendedOnData())
) {
  // Fast path: There's nothing to work on.
  cancelCallback(existingCallbackNode);
  root.callbackNode = null;
  root.callbackPriority = NoLane;
  return NoLane;
}
```

그리고 `processRootScheduleInMicrotask`(`ReactFiberRootScheduler.js:290-312`)에서:

```js
const nextLanes = scheduleTaskForRootDuringMicrotask(root, currentTime);
if (nextLanes === NoLane) {
  // This root has no more pending work. Remove it from the schedule.
  root.next = null;           // ← 스케줄 링크드 리스트에서 제거
}
```

**root 자체가 스케줄 큐에서 빠집니다.** 다음 microtask에서 이 root를 순회하지도 않습니다.

#### 근거 3: ping 리스너는 Promise에 한 번만 등록

```js
// ReactFiberWorkLoop.js:4954-4966
if (!threadIDs.has(lanes)) {          // 이미 등록했으면 스킵
  threadIDs.add(lanes);
  const ping = pingSuspendedRoot.bind(null, root, wakeable, lanes);
  wakeable.then(ping, ping);         // 딱 한 번만 등록
}
```

중복 등록도 없고, 폴링도 없습니다.

### 남는 비용 분석

```
┌─────────────────────┬───────────────┬──────────────────────────┐
│ 항목                 │ 비용          │ 설명                     │
├─────────────────────┼───────────────┼──────────────────────────┤
│ CPU (work loop)     │ 0             │ 스케줄 큐에서 제거됨       │
│                     │               │ 어떤 코드도 실행 안 됨     │
├─────────────────────┼───────────────┼──────────────────────────┤
│ 타이머/인터벌        │ 0             │ setInterval 없음          │
│                     │               │ Promise.then 콜백만 대기   │
├─────────────────────┼───────────────┼──────────────────────────┤
│ 메모리: ping 리스너  │ 미미          │ 클로저 1개 + Set 엔트리 1개│
│                     │               │ per (wakeable, lanes) 쌍  │
├─────────────────────┼───────────────┼──────────────────────────┤
│ 메모리: pingCache    │ 미미          │ WeakMap → Promise GC 시   │
│                     │               │ 자동 정리                 │
├─────────────────────┼───────────────┼──────────────────────────┤
│ 메모리: fiber 트리   │ ⚠️ 유일한 비용│ 아래 상세 설명             │
├─────────────────────┼───────────────┼──────────────────────────┤
│ lane 비트            │ 거의 0        │ 32-bit 정수 하나의 비트 1개│
└─────────────────────┴───────────────┴──────────────────────────┘
```

#### 유일한 실질 비용: fiber 트리 메모리

Transition의 경우, React는 **이전 화면(current 트리)을 유지**하면서 **새 화면의 work-in-progress 트리도 유지**합니다. suspended 상태에서 두 트리가 공존합니다.

하지만 `prepareFreshStack`이 호출되면 work-in-progress 트리는 리셋됩니다:

```js
// ReactFiberWorkLoop.js:2227-2229
resetWorkInProgressStack();
workInProgressRoot = root;
const rootWorkInProgress = createWorkInProgress(root.current, null);
```

#### pingCache가 WeakMap인 이유

```js
// ReactFiberWorkLoop.js:415
const PossiblyWeakMap = typeof WeakMap === 'function' ? WeakMap : Map;

// ReactFiberWorkLoop.js:4944
pingCache = root.pingCache = new PossiblyWeakMap();
pingCache.set(wakeable, threadIDs);  // key가 Promise 객체
```

WeakMap이므로, Promise 객체가 어디서도 참조되지 않으면 **GC가 자동으로 pingCache 엔트리를 정리**합니다. 영원히 pending인 Promise도 외부 참조가 사라지면 GC 대상입니다.

### 시각화: 무한 대기 시 시스템 상태

```
Promise 영원히 pending 시:

┌─ 스케줄러 ─────────────────────────┐
│                                    │
│  스케줄 큐: [ ]  (root 제거됨)      │  ← CPU 0
│  콜백: null                        │
│                                    │
└────────────────────────────────────┘

┌─ Root ─────────────────────────────┐
│                                    │
│  pendingLanes:   0b...00100        │  ← lane 비트만 켜져 있음
│  suspendedLanes: 0b...00100        │  ← 같은 비트가 suspended
│  pingedLanes:    0b...00000        │  ← ping 없음
│  callbackNode:   null              │  ← 스케줄 안 됨
│                                    │
│  pingCache: WeakMap {              │
│    Promise → Set { lanes }         │  ← Promise GC 시 자동 정리
│  }                                 │
│                                    │
└────────────────────────────────────┘

┌─ Promise ──────────────────────────┐
│                                    │
│  .then(ping, ping)  ← 콜백 대기중  │  ← 이벤트 루프 비용 0
│                                    │  (브라우저 microtask queue에
│                                    │   등록만 된 상태, 폴링 없음)
└────────────────────────────────────┘

활성 타이머: 0개
활성 인터벌: 0개
실행 중인 React 코드: 없음
→ 사실상 "React가 존재하지 않는 것"과 동일한 CPU 비용
```

**요약**: 무한 대기는 "React가 아무것도 안 하고 있는" 상태입니다. 실질적 성능 문제는 없습니다. 비용이 있다면 fiber 트리와 ping 리스너의 메모리뿐이고, WeakMap 덕분에 Promise GC 시 자동 정리됩니다.

---

## 연결

| 대상 토픽 | 관계 | 근거 |
|-----------|------|------|
| `study/learn/React-리렌더링-트리거.md` | **상위 메커니즘 → 세부 구현** | 해당 문서에서 `scheduleUpdateOnFiber`를 "렌더 패스의 유일한 입구"로 정의. 이번 학습은 함수 내부 단계별 분석과 Suspense 관련 동작까지 확장 |
| `study/react/Lane-Model-And-Priority.md` | **전제 지식 (lane 비트마스크)** | `markRootUpdated`의 `pendingLanes \|= lane`, `getNextLanes`의 `& ~suspendedLanes` 마스킹 등 lane 비트 연산이 scheduleUpdateOnFiber의 핵심 메커니즘 |


---

## 2026-02-25 (/learn)

Q1~Q5를 통해 scheduleUpdateOnFiber 함수의 내부 동작을 단계별로 분석. (1) 함수는 렌더를 직접 시작하지 않고 예약(schedule)만 함 — ensureRootIsScheduled → microtask → performWorkOnRoot 경로 확인, (2) suspended 렌더 리셋 시 update 객체는 concurrentQueues[] 배열에 안전하게 보존됨(finishQueueingConcurrentUpdates로 복원), (3) Lane 시스템(suspendedLanes, pingedLanes)이 무한 suspend-restart 병목을 방지, (4) Suspense의 Promise가 영원히 pending이면 React는 포기하지 않고 Transition은 이전 화면 유지/일반 업데이트는 fallback 표시 — 빌트인 타임아웃 없음(앱 레벨 책임), (5) 무한 대기 시 CPU 비용 0(스케줄 큐에서 root 제거, 이벤트 구동 방식), 메모리도 WeakMap pingCache로 자동 정리.
