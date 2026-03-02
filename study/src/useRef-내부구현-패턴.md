# useRef-내부구현-패턴 — 패턴 워크스루

> 주제: useRef 내부구현에 사용된 JS/React 코드 패턴
> 소스: ref/react/packages/react-reconciler/src/
> 일시: 2026-03-02

---

## 패턴 1: Dispatcher swap (Strategy 패턴)

> 파일: ReactFiberHooks.js:560-563

### 코드
```js
ReactSharedInternals.H =
  current === null || current.memoizedState === null
    ? HooksDispatcherOnMount
    : HooksDispatcherOnUpdate;
```

```js
const HooksDispatcherOnMount: Dispatcher = {
  useRef: mountRef,
  useState: mountState,
  // ...
};

const HooksDispatcherOnUpdate: Dispatcher = {
  useRef: updateRef,
  useState: updateState,
  // ...
};
```

### 왜 이렇게?
- 핵심 이유: 1번의 dispatcher 교체로 이후 모든 hook 호출이 분기 없이 올바른 함수로 직행. hook N개 × if-else 대신 dispatcher swap 1번.
- 대안과 트레이드오프: 각 hook 내부 if-else 방식은 단일 hook에서는 차이 없지만, hook ~20개 × phase 4개(Mount, Update, Rerender, DEV)에서 80개 분기가 산재. dispatcher swap은 새 phase 추가 = 객체 1개 추가로 끝남.

### 변형 실험
- 과제: if-else 방식으로 useRef 재작성
- 사용자 변형 코드:
```js
let isMount = false;
function useRef(initialValue) {
  if (isMount) {
    const hook = mountWorkInProgressHook();
    const ref = { current: initialValue };
    hook.memoizedState = ref;
    return ref;
  } else {
    const hook = updateWorkInProgressHook();
    return hook.memoizedState;
  }
}
```
- 차이점: 단일 hook에서는 차이 미미. 시스템 규모(20+ hooks, 4+ phases)에서 분기 집중도와 확장성 차이가 드러남.

---

## 패턴 2: Bitmask flag 합성

> 파일: ReactFiberBeginWork.js:1387,1397

### 코드
```js
workInProgress.flags |= Ref | RefStatic;
```

### 왜 이렇게?
- 핵심 이유: Fiber는 트리의 모든 노드마다 존재. 숫자 하나로 N개 플래그 관리, 객체/Set 대비 힙 할당 없음.
- 대안과 트레이드오프: 객체 `{ ref: true, update: false }` 방식은 개별 필드 접근은 읽기 쉬지만, 그룹 단위 복합 연산(`flags & (Ref | Update | Placement)`)에서 비트마스크가 간결하고 O(1). React는 20+ 플래그를 그룹 마스크로 빈번하게 검사.

### 변형 실험
- 과제: flags를 객체로 바꿔서 markRef 재작성
- 사용자 변형 코드:
```js
workInProgress.flags.Ref = true;
workInProgress.flags.RefStatic = true;
```
- 차이점: 단순 on/off는 동일. 복합 확인(`flags & (Ref | Update)` vs `flags.Ref || flags.Update`), 그룹 마스크(`flags &= LayoutMask`), 다수 플래그 동시 조작에서 비트마스크가 유리.

---

## 패턴 3: Double buffer hook 복원 (current ↔ alternate)

> 파일: ReactFiberHooks.js:1007,1050-1058

### 코드
```js
currentHook = nextCurrentHook;

const newHook: Hook = {
  memoizedState: currentHook.memoizedState,
  baseState: currentHook.baseState,
  baseQueue: currentHook.baseQueue,
  queue: currentHook.queue,
  next: null,
};
```

### 왜 이렇게?
- 핵심 이유: React는 Fiber 트리를 2벌(current/workInProgress) 유지. current hook을 직접 재사용하면 WIP에서의 변경이 current를 오염시킴. Concurrent Mode에서 렌더 폐기 시 롤백할 원본이 없어짐.
- 대안과 트레이드오프: 직접 재사용(`workInProgressHook = currentHook`)은 객체 생성 비용 없지만, 렌더 폐기 시 current 트리 오염 → 중복 update 처리, 잘못된 state.

### 변형 실험
- 과제: clone 없이 currentHook 직접 재사용
- 사용자 변형 코드:
```js
if (workInProgressHook === null) {
  currentlyRenderingFiber.memoizedState = workInProgressHook = currentHook;
} else {
  workInProgressHook = workInProgressHook.next = currentHook;
}
```
- 차이점: 렌더 중 setState → currentHook.queue.pending 직접 변경 → 렌더 폐기 시 current hook 오염 → 폐기된 update 재처리.

---

## 패턴 4: Cleanup return 계약 + 이중 null 방어

> 파일: ReactFiberCommitEffects.js:797,873-877

### 코드
```js
// attach
finishedWork.refCleanup = ref(instanceToUse);

// detach
refCleanup();
// ...
finally {
  current.refCleanup = null;
  const finishedWork = current.alternate;
  if (finishedWork != null) {
    finishedWork.refCleanup = null;
  }
}
```

### 왜 이렇게?
- 핵심 이유: double buffer 구조에서 current와 alternate가 같은 refCleanup 함수를 참조. cleanup 호출 후 한쪽만 null로 초기화하면 다른 경로에서 이중 호출 가능. 코드 주석: "Nullify all references to it to prevent double invocation."
- 대안과 트레이드오프: current만 null 처리 시 alternate 경로를 통한 cleanup 재호출 위험.

### 변형 실험
- 과제: alternate 쪽 null 제거
- 차이점: double buffer의 다른 쪽에서 cleanup에 접근 가능 → 이중 호출 버그. (detach/attach 타이밍의 구체적 시나리오는 ref callback 학습 시 다룰 예정)

---

## 패턴 연결

```
[mount]  ① Dispatcher swap → mountRef()
            → Hook 링크드 리스트 추가
            → ② Bitmask: flags |= Ref | RefStatic (commit 예약)

[update] ① Dispatcher swap → updateRef()
            → ③ Double buffer clone (원본 보존)
            → 같은 {current: T} 객체 반환

[commit] Mutation: safelyDetachRef → ④ 이중 null 방어
         Layout: commitAttachRef → cleanup 저장
```

공통 원칙: **Concurrent Mode에서 렌더는 언제든 폐기될 수 있다** — ③ clone과 ④ 이중 null을 모두 필요하게 만드는 전제.

## 연결

| 대상 토픽 | 관계 | 근거 |
|-----------|------|------|
| `study/learn/useRef-렌더링-참조규칙.md` | 개념적 전제 | mountRef/updateRef의 구조적 차이, Concurrent Mode tearing — 본 워크스루의 패턴 3,4가 그 안전장치의 코드 구현 |
| `study/.routine/transcripts/2026-03-01-useRef-심화-내부구현·ref-callback·실무패턴.md` | 선행 학습 | Hook 링크드 리스트, memoizedState 이중 레벨, ref callback attach/detach — 본 워크스루에서 코드 패턴 관점으로 재탐색 |


---

## 2026-03-02 (via /learn)

## /src 세션: useRef-내부구현-패턴 (2026-03-02)

소스: ref/react/packages/react-reconciler/src/ (ReactFiberHooks.js, ReactFiberBeginWork.js, ReactFiberCommitEffects.js)

### 패턴 4개 완료
1. **Dispatcher swap (Strategy)** — 1번의 객체 교체로 N개 hook 분기 제거, phase 추가 = 객체 1개
2. **Bitmask flag 합성** — 숫자 하나로 20+ 플래그 관리, 그룹 연산 O(1)
3. **Double buffer hook clone** — current hook 불변 보존, 렌더 폐기 시 안전한 롤백
4. **Cleanup return + 이중 null 방어** — double buffer 양쪽 정리로 cleanup 이중 호출 방지

공통 원칙: Concurrent Mode에서 렌더 폐기 가능성이 ③④를 필요하게 만듦.
