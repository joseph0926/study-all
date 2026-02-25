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

## Q5. "`scheduleUpdateOnFiber`는 렌더패스를 트리거하는 유일한 입구이다. 하지만 scheduleUpdateOnFiber가 유일한 트리거는 아니다" — 이게 결론중 하나였습니다. 맞나요?

**맞습니다. 하지만 문장 자체에 자기모순이 있어 보이므로, 왜 모순이 아닌지 정리합니다.**

두 문장이 **다른 레벨**을 말하고 있기 때문에 모순이 아닙니다:

| | 대상 | scheduleUpdateOnFiber가 유일한가? |
|---|---|---|
| **레벨 1** | **렌더 패스 시작** (work loop 진입) | O — 유일한 입구 (hydration용 `scheduleInitialHydrationOnRoot` 제외) |
| **레벨 2** | **개별 fiber의 리렌더링** | X — props 전파, context lane 마킹 등은 scheduleUpdateOnFiber 없이 발생 |

소스코드 근거:

- **레벨 1**: `ReactFiberWorkLoop.js:967` — `scheduleUpdateOnFiber`가 `ensureRootIsScheduled`를 호출 → work loop 시작. 별도 경로인 `scheduleInitialHydrationOnRoot`(`ReactFiberWorkLoop.js:1095`)도 주석에 "special fork of scheduleUpdateOnFiber"라고 명시되어 있음
- **레벨 2**: `ReactFiberBeginWork.js:4173` — `oldProps !== newProps`로 자식 리렌더링, `ReactFiberNewContext.js:245` — consumer lanes 직접 마킹

### 비유: 건물 화재 경보 시스템

| React | 비유 |
|-------|------|
| `scheduleUpdateOnFiber` | 건물 중앙 화재 경보 버튼 (이것만 누르면 전체 대피 시작) |
| 렌더 패스 시작 | 대피 방송 시작 |
| `beginWork`로 각 fiber 방문 | 각 층을 돌며 확인 |
| props 변경으로 자식 리렌더링 | 경보 누른 적 없는 3층도, 연기(=새 props)가 보이면 대피시킴 |

---

## Q6. 비유 관점에서 질문입니다 → 화재가 나면 중앙 경보 버튼도 울리고 연기도 올라옵니다. 근데 3층이 연기로 인해 대피라고 확정할수있는 코드적 근거가 뭔가요? 아니면 비유가 약간 부정확한건가요?

**비유가 부정확합니다.** "연기"는 독립적으로 올라오는 환경 신호이지만, React의 props 변경은 그렇지 않습니다.

### 코드 추적: 자식의 `pendingProps`는 어떻게 설정되는가

```
부모 setState
    │
    ▼
scheduleUpdateOnFiber(root, parentFiber, lane)     ← 유일한 입구
    │
    ▼
work loop 시작 → beginWork(parentFiber)
    │
    ▼
부모 컴포넌트 함수 실행 → createElement(Child, { value: 1 })
    │                       ↑ 새 props 객체 생성
    ▼
reconcileChildren → createWorkInProgress(childFiber, newProps)
    │
    ▼
ReactFiber.js:357   workInProgress.pendingProps = pendingProps;
    │                ↑ 부모의 reconciliation이 자식 fiber에 새 props를 "배달"
    ▼
work loop이 자식에 도착 → beginWork(childFiber)
    │
    ▼
ReactFiberBeginWork.js:4170-4174
    oldProps = current.memoizedProps;      // 이전 props
    newProps = workInProgress.pendingProps; // 부모가 방금 넣어준 새 props
    if (oldProps !== newProps) {
      didReceiveUpdate = true;             // 리렌더링
    }
```

핵심 근거: `ReactFiber.js:327,357` — `createWorkInProgress(current, pendingProps)`에서 **부모의 reconciliation 과정이 자식 fiber의 `pendingProps`를 직접 설정**합니다. 자식이 스스로 무언가를 감지하는 것이 아닙니다.

### 왜 "연기" 비유가 틀린가

| | 화재 비유 (연기) | React 실제 동작 |
|---|---|---|
| **신호 발생** | 연기가 환경에서 **자연 발생**하여 올라감 | 부모가 render 중 `createElement`로 **능동적으로 생성** |
| **감지 주체** | 3층이 **독립적으로** 연기를 감지 | work loop이 방문해야만 비교 발생 |
| **인과관계** | 화재 → 연기 (간접, 환경 매개) | 부모 render → props 배달 → 자식 비교 (직접, 순차) |

연기는 **수동적 부산물**이지만, React의 새 props는 **부모가 능동적으로 만들어서 자식 fiber에 꽂아주는 것**입니다.

### 수정된 비유: 보안 팀의 층별 순회 점검

| React | 수정된 비유 |
|-------|-----------|
| `scheduleUpdateOnFiber` | 건물 관리실에 "점검 요청" 접수 |
| work loop 시작 | 보안 팀 출동, 위에서부터 층별 순회 |
| 부모 `beginWork` → render | 해당 층 관리자가 **새 업무지시서**(props)를 작성 |
| `createWorkInProgress(child, newProps)` | 관리자가 하위 층 사물함에 **새 지시서를 직접 넣어둠** |
| 자식 `beginWork` | 보안 팀이 하위 층 도착 → 사물함의 지시서를 이전 것과 비교 |
| `oldProps !== newProps` | "지시서가 다르네" → 해당 층도 점검 실시 |

이 비유에서 하위 층은 **스스로 아무것도 감지하지 않음** (연기 같은 독립 신호 없음). **보안 팀이 방문해야만** 비교가 일어나고, 새 지시서는 **상위 층 관리자가 직접 넣어준 것**입니다.

---

## Q7. scheduleUpdateOnFiber가 시작해야만 "oldProps !== newProps" 비교가 가능해지는 거 아닌가요? 그러면 결국 "scheduleUpdateOnFiber가 실행되어야만 리렌더링이 일어난다"는 맞나요?

**맞습니다 — 단, "어딘가에서"라는 조건이 붙습니다.**

사용자의 추론:

```
전제 1: oldProps !== newProps 비교는 beginWork 안에서만 일어난다
전제 2: beginWork는 work loop 안에서만 실행된다
전제 3: work loop은 scheduleUpdateOnFiber가 시작한다
결론:   scheduleUpdateOnFiber 없이는 리렌더링이 불가능하다
```

이 추론은 **유효**합니다. 하지만 "scheduleUpdateOnFiber가 실행되어야만"에서 **주어가 누구인지**에 따라 의미가 달라집니다:

```
                                    "해당 fiber에 대해"  "시스템 어딘가에서"
                                    ─────────────────  ─────────────────
scheduleUpdateOnFiber가
실행되어야만 리렌더링이 일어난다         ❌ 거짓            ✅ 참
```

소스코드 근거:

```jsx
function Parent() {
  const [count, setCount] = useState(0);
  return <Child value={count} />;
}
```

```
scheduleUpdateOnFiber(root, parentFiber, lane)   ← Parent에 대해 호출됨
         │
         ▼
    work loop 시작
         │
         ▼
    beginWork(parentFiber)  → Parent 함수 실행 → 새 props 생성
         │
         ▼
    beginWork(childFiber)   → oldProps !== newProps → 리렌더링
         │
         └─ Child에 대한 scheduleUpdateOnFiber는 호출된 적 없음
            하지만 Parent에 대한 호출이 없었다면 여기 도달 불가
```

### 세 문장의 참/거짓

| 문장 | 판정 |
|------|------|
| "scheduleUpdateOnFiber(시스템 어딘가)가 실행되어야만 리렌더링이 일어난다" | **참** (필요조건) |
| "scheduleUpdateOnFiber(해당 fiber)가 실행되어야만 그 fiber가 리렌더링된다" | **거짓** (props/context 전파) |
| "scheduleUpdateOnFiber가 리렌더링의 유일한 트리거다" | **모호** (위 둘 중 어느 해석이냐에 따라 다름) |

### 비유: 도미노

| React | 비유 |
|-------|------|
| `scheduleUpdateOnFiber` | **첫 번째 도미노를 손으로 밀기** |
| work loop → 부모 render → 자식 props 변경 | 도미노가 연쇄적으로 쓰러짐 |
| 자식의 리렌더링 | 중간 도미노가 쓰러짐 |

"손으로 밀어야만(scheduleUpdateOnFiber) 도미노가 쓰러진다(리렌더링)" — **시스템 레벨에서 참**. 하지만 "중간 도미노가 쓰러진 이유"는 "손으로 밀렸기 때문"이 아니라 "앞 도미노에 맞았기 때문(props 전파)"입니다. 이게 **fiber 레벨에서 거짓**인 이유입니다.

---

## 2026-02-24 (via /learn)

Q1~Q4를 통해 "상태 업데이트만이 유일한 리렌더링 트리거"라는 명제를 React 소스코드(scheduleUpdateOnFiber, beginWork, propagateContextChanges, forceStoreRerender, dispatchSetState) 기반으로 검증. 최종 결론: scheduleUpdateOnFiber는 렌더 패스의 유일한 입구이지만, 렌더 패스 내부에서 개별 fiber의 리렌더링은 props 전파/context lane 마킹 등 다양한 경로로 발생한다.

## 2026-02-25 (via /learn)

Q5~Q7을 통해 "scheduleUpdateOnFiber가 유일한 트리거"라는 문장의 모호성을 분석. 화재 경보 비유의 부정확성을 코드(ReactFiber.js:357 createWorkInProgress, ReactFiberBeginWork.js:4170-4174 oldProps/newProps 비교)로 검증하고 도미노 비유로 교체. 최종 정리: "시스템 레벨에서 scheduleUpdateOnFiber는 필요조건(참)", "fiber 레벨에서 해당 fiber의 scheduleUpdateOnFiber는 필요조건이 아님(거짓)" — 주어(시스템 vs 해당 fiber)에 따라 참/거짓이 갈린다.


---

## 2026-02-25 (/learn)

Q5~Q7: "scheduleUpdateOnFiber가 유일한 트리거" 문장의 레벨별 참/거짓 분석. 화재 경보 비유 → 코드(ReactFiber.js:357, ReactFiberBeginWork.js:4170-4174)로 부정확성 검증 → 도미노 비유로 교체. 결론: 시스템 레벨에서 필요조건(참), fiber 레벨에서 필요조건 아님(거짓).
