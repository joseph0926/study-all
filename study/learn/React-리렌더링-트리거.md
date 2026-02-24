# React-리렌더링-트리거

> 최초 질문: React의 상태 업데이트만이 유일한 리렌더링 트리거다 << 이 말을 명제처럼 사용해도되나요?
> 일시: 2026-02-25

---

## Q1. "React의 상태 업데이트만이 유일한 리렌더링 트리거다" — 이 말을 명제처럼 사용해도 되나요?

**결론부터: "거의 맞지만, 엄밀하게는 틀립니다."** 명제로 사용하려면 범위를 좁혀야 합니다.

### 소스코드 근거: 리렌더링을 촉발하는 경로는 여러 가지

React에서 리렌더링이 스케줄링되는 **중앙 관문**은 `scheduleUpdateOnFiber`입니다. 이 함수를 호출하는 모든 경로가 곧 리렌더링 트리거입니다. ref/ 소스에서 확인한 호출 지점들:

**1. `useState` / `useReducer`의 dispatch** — 가장 대표적인 "상태 업데이트"
- `ReactFiberHooks.js:3590` — `dispatchReducerAction` 내부
- `ReactFiberHooks.js:3692` — `dispatchSetState` 내부

**2. 클래스 컴포넌트의 `this.setState()`**
- `ReactFiberClassComponent.js:183` — `enqueueSetState`

**3. 클래스 컴포넌트의 `this.forceUpdate()`** — 상태 변경 없이 리렌더링 강제
- `ReactFiberClassComponent.js:235` — `update.tag = ForceUpdate`로 설정 후 `scheduleUpdateOnFiber` 호출

**4. `useSyncExternalStore`의 외부 스토어 변경 감지**
- `ReactFiberHooks.js:1887-1891` — `forceStoreRerender`가 `scheduleUpdateOnFiber(root, fiber, SyncLane)` 호출
- 이것은 **React 상태와 무관한 외부 스토어 값 변경**에 의한 리렌더링입니다.

**5. `root.render()` / `updateContainer`** — 루트 레벨 리렌더링
- `ReactFiberReconciler.js:455` — `updateContainerImpl` 내부

**6. 부모 리렌더링에 의한 자식 리렌더링** — 별도의 `scheduleUpdateOnFiber` 없이 발생
- `ReactFiberBeginWork.js:4173-4174` — `oldProps !== newProps`이면 `didReceiveUpdate = true`
- 부모가 리렌더링되면 자식에게 **새로운 props 객체**가 전달되고, 참조가 다르면 자식도 렌더링됩니다. 이때 자식 fiber에는 어떤 update도 enqueue되지 않습니다.

**7. Context 변경에 의한 소비자 리렌더링**
- `ReactFiberNewContext.js:245` — `consumer.lanes = mergeLanes(consumer.lanes, renderLanes)` 로 소비 fiber에 직접 lane을 마킹
- Provider의 value가 바뀌면 `useContext`를 사용하는 **소비자 fiber에 직접 작업을 스케줄링**합니다.

### 그래서 왜 "거의 맞다"고 하는가?

위 경로들을 넓은 의미로 보면:
- 1, 2, 3번 → React의 "상태 업데이트 메커니즘" (update queue에 enqueue)
- 5번 → 루트 fiber의 상태 업데이트
- 7번 → context 변경도 결국 `provider fiber의 상태(value)가 변경`되어 시작됨

이 관점에서 **"어딘가의 상태가 변해야 리렌더링이 시작된다"**는 대체로 맞습니다.

### 반례(명제가 깨지는 경우)

| 반례 | 설명 |
|------|------|
| `forceUpdate()` | 상태를 변경하지 않고 리렌더링 강제 (`update.tag = ForceUpdate`) |
| `useSyncExternalStore` | React 외부 스토어 변경 → `forceStoreRerender` → 상태 업데이트 없이 렌더 스케줄링 |
| 부모 리렌더링 → 자식 | 자식은 아무 상태도 변경하지 않았지만 `props !== prevProps`로 렌더링됨 |

### 권장 표현

명제로 쓰려면 이렇게 좁히는 것이 정확합니다:

> **"React에서 렌더링 사이클을 *최초로 촉발*하는 것은 `scheduleUpdateOnFiber` 호출이며, 이는 (1) 상태 업데이트 (setState/dispatch), (2) forceUpdate, (3) 외부 스토어 변경 (useSyncExternalStore), (4) 루트 render 호출에 의해 발생한다. 이후 부모→자식 전파와 context 전파는 이 최초 촉발의 파생이다."**

---

## Q2. `scheduleUpdateOnFiber`가 "리렌더링의 유일한 트리거"인가?

**"렌더 패스를 시작하는 유일한 입구"로는 맞지만, "개별 컴포넌트가 리렌더링되는 유일한 이유"로는 틀립니다.** 두 가지 레벨을 구분해야 합니다.

### 레벨 1: 렌더 패스(work loop) 시작 — `scheduleUpdateOnFiber`가 유일한 입구

맞습니다. 새로운 렌더 패스를 **시작**시키는 것은 `scheduleUpdateOnFiber`입니다. (hydration용 `scheduleInitialHydrationOnRoot` 제외)

### 레벨 2: 이미 시작된 렌더 패스 안에서 — `beginWork`가 각 fiber의 운명을 결정

렌더 패스가 시작되면, React는 트리를 위에서 아래로 순회하며 **각 fiber마다** `beginWork`를 호출합니다. 이때 `scheduleUpdateOnFiber` 없이도 리렌더링이 발생하는 경우가 있습니다:

**경우 A: 부모 리렌더링 → 자식 props 변경**

```
ReactFiberBeginWork.js:4173-4174
```
```js
if (oldProps !== newProps || hasLegacyContextChanged()) {
  didReceiveUpdate = true;  // → 자식이 리렌더링됨
}
```

자식 fiber에는 어떤 update도 enqueue되지 않았고, `scheduleUpdateOnFiber`도 호출되지 않았습니다. 단지 부모가 `createElement(Child, { ... })`를 다시 실행하면서 **새 props 객체**를 만들었을 뿐인데 `!==` 비교에 의해 리렌더링됩니다.

**경우 B: Context 전파 — lane 직접 마킹**

```
ReactFiberNewContext.js:245
```
```js
consumer.lanes = mergeLanes(consumer.lanes, renderLanes);
```

`scheduleContextWorkOnParentPath`는 `scheduleUpdateOnFiber`를 호출하지 않습니다. 대신 **소비자 fiber의 lanes에 직접 비트를 마킹**하고, 부모 경로의 `childLanes`를 갱신합니다 (`ReactFiberNewContext.js:149-174`). 이것은 이미 진행 중인 렌더 패스 안에서 `beginWork`가 해당 fiber를 방문할 때 "할 일이 있다"고 인식하게 만드는 방식입니다.

### 정리: 2계층 모델

```
scheduleUpdateOnFiber        ← 렌더 패스를 시작하는 유일한 입구
    │
    ▼
 work loop 시작
    │
    ▼ (트리 순회)
 beginWork(각 fiber)          ← 개별 fiber의 리렌더링 여부를 결정
    ├─ scheduled update 있음?     (lanes 체크)
    ├─ props가 바뀌었음?           (oldProps !== newProps)
    └─ context가 바뀌었음?         (consumer lanes 마킹)
```

따라서:

> **"`scheduleUpdateOnFiber`는 렌더 패스를 촉발하는 유일한 입구다"** → 명제로 사용 가능
>
> **"`scheduleUpdateOnFiber`가 리렌더링의 유일한 트리거다"** → 부정확. 렌더 패스 내부에서 props 전파와 context lane 마킹에 의해 `scheduleUpdateOnFiber` 없이 리렌더링되는 fiber가 다수 존재

---

## Q3. "리렌더링이 일어나면 무조건 `scheduleUpdateOnFiber`가 호출된다" — 맞나요?

**아닙니다.** Q2에서 이미 보았듯이, 렌더 패스 내부에서 리렌더링되는 자식 fiber들은 `scheduleUpdateOnFiber` 호출 없이 렌더링됩니다.

구체적으로 반례:

### 반례 1: 부모 리렌더링 → 자식 리렌더링

```jsx
function Parent() {
  const [count, setCount] = useState(0); // ← 여기서만 scheduleUpdateOnFiber 발생
  return <Child value={count} />;        // ← Child에 대한 scheduleUpdateOnFiber는 없음
}
```

`Parent`의 `setCount` → `scheduleUpdateOnFiber(root, parentFiber, lane)` → 렌더 패스 시작 → `beginWork(parentFiber)` → `beginWork(childFiber)` 시 `oldProps !== newProps`로 리렌더링.

**`Child`는 리렌더링되지만 `scheduleUpdateOnFiber`는 `Parent` fiber에 대해서만 호출되었습니다.**

### 반례 2: Context 소비자

`ReactFiberNewContext.js:245`에서 `consumer.lanes`에 직접 비트를 마킹할 뿐, `scheduleUpdateOnFiber`를 호출하지 않습니다.

### 정확한 관계

```
scheduleUpdateOnFiber → 반드시 렌더 패스 시작   (O, 충분조건)
리렌더링 발생 → 반드시 scheduleUpdateOnFiber     (X, 필요조건 아님)
```

정확히 말할 수 있는 명제는:

> **"모든 리렌더링은 어떤 `scheduleUpdateOnFiber` 호출에 의해 시작된 렌더 패스 안에서 일어난다."**

---

## Q4. "scheduleUpdateOnFiber가 호출되면 무조건 해당 Fiber의 컴포넌트 함수가 호출된다. 하지만 그게 리렌더링을 보장하지는 않는다" — 맞나요?

**거의 맞지만 두 가지 보정이 필요합니다.**

### 1. "무조건 컴포넌트 함수가 호출된다" — 반례 존재

`scheduleUpdateOnFiber` 호출 후, 해당 fiber가 렌더 패스에서 처리되기 **전에 언마운트**되면 컴포넌트 함수는 호출되지 않습니다.

```jsx
// 같은 이벤트 핸들러 안에서 batching
setCount(1);     // Child fiber에 scheduleUpdateOnFiber
setShow(false);  // Parent가 Child를 트리에서 제거

// → 하나의 렌더 패스로 batching
// → Parent beginWork → Child 제거 → Child의 컴포넌트 함수 호출 안 됨
```

그래서 "무조건"이 아니라 **"해당 fiber가 트리에 남아있는 한"**이라는 조건이 필요합니다.

### 2. 용어 문제 — "컴포넌트 함수 호출"이 곧 "렌더링"

React 용어에서:

| React 용어 | 의미 |
|-----------|------|
| **렌더링(render)** | 컴포넌트 함수 호출 |
| **커밋(commit)** | DOM 반영 |

"컴포넌트 함수가 호출됐지만 리렌더링은 아니다"는 React 용어 체계에서 모순입니다. 함수가 호출된 것 자체가 리렌더링입니다. 의도하신 것은:

> **"컴포넌트 함수가 호출되지만(= 리렌더링), 커밋(DOM 변경)을 보장하지는 않는다."**

### 최종 수정

> **"`scheduleUpdateOnFiber`가 호출되면, 해당 fiber가 트리에 남아있는 한 컴포넌트 함수가 호출된다(= 리렌더링). 하지만 상태가 동일하면 bailout되어 커밋(DOM 변경)은 일어나지 않을 수 있다."**

---

## 최종 명제 정리

```
1. 리렌더링의 유일한 트리거는 상태 업데이트가 아니다                          ✅ 참
2. scheduleUpdateOnFiber 호출 → 반드시 리렌더링                            ⚠️ 부정확
   → 컴포넌트 함수는 호출되지만(fiber가 트리에 남아있는 한),
     상태가 동일하면 bailout될 수 있다(커밋 미발생)
3. 리렌더링 발생 → 반드시 scheduleUpdateOnFiber 호출                       ❌ 거짓
   → 부모 리렌더링에 의한 props 전파, context lane 마킹 등은
     scheduleUpdateOnFiber 없이 발생
```

정확한 명제:

> **"모든 리렌더링은 어떤 `scheduleUpdateOnFiber` 호출에 의해 시작된 렌더 패스 안에서 일어난다. `scheduleUpdateOnFiber`는 렌더 패스의 유일한 입구이지만, 렌더 패스 내부에서 개별 fiber가 리렌더링되는 이유는 (1) scheduled update, (2) props 변경, (3) context 변경으로 다양하다."**


---

## 2026-02-24 (via /learn)

Q1~Q4를 통해 "상태 업데이트만이 유일한 리렌더링 트리거"라는 명제를 React 소스코드(scheduleUpdateOnFiber, beginWork, propagateContextChanges, forceStoreRerender, dispatchSetState) 기반으로 검증. 최종 결론: scheduleUpdateOnFiber는 렌더 패스의 유일한 입구이지만, 렌더 패스 내부에서 개별 fiber의 리렌더링은 props 전파/context lane 마킹 등 다양한 경로로 발생한다.
