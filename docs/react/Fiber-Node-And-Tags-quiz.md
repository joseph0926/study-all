# Fiber Node And Tags — 복습 퀴즈

> 생성일: 2026-02-15
> 소스: `docs/react/Fiber-Node-And-Tags.md`

---

## [1/15] Fiber Node 구조 — V8 Hidden Class 최적화

**Q**: FiberNode 생성자는 실제로 사용하는 인자가 4개뿐인데, 나머지 수십 개 필드를 전부 `null`/`0`/`NoFlags`로 초기화합니다. 왜 나중에 필요할 때 동적으로 추가하지 않고, 생성 시점에 모든 필드를 미리 선언하나요?

**A**: V8은 객체 생성 시 속성의 순서와 구조를 기반으로 "Hidden Class"를 할당하고, 같은 Hidden Class를 공유하는 객체들은 프로퍼티 접근이 매우 빠르기 때문입니다

**판정**: ✅ 통과

**보충**: 동적으로 추가하면 Hidden Class가 변경되어 V8이 최적화를 포기(megamorphic)한다. GitHub issue #14365에서 V8 엔지니어(@bmeurer)가 직접 진단한 사례가 있음. 📍 `ReactFiber.js:180-191`

---

## [2/15] Fiber Node 구조 — 5개 필드 카테고리

**Q**: FiberNode의 필드는 5개 카테고리로 분류됩니다. 각 카테고리 이름과 대표 필드 1개씩을 말해주세요.

**A**: Instance(tag, key, type, stateNode) / Tree(return, child, sibling, index) / Props/State(pendingProps, memoizedProps, memoizedState) / Effects(flags, subtreeFlags) / Priority(lanes, childLanes) — 병원 비유 포함하여 답변

**판정**: ✅ 통과

**보충**: 카테고리 이름 5개와 역할만 기억하면 구체적 필드는 소스를 보면 바로 떠올림. 📍 `ReactFiber.js:138-211`

---

## [3/15] Fiber Node 구조 — 트리 구조와 Concurrent Mode

**Q**: Fiber 트리는 `children` 배열이 아니라 단일 연결 리스트(`child`/`sibling`/`return`)로 구성되어 있습니다. 이 구조를 선택한 근본적인 이유는 무엇인가요?

**A**: 배열은 한번 시작하면 중단이 불가능하지만 단일 링크드 리스트의 경우는 포인터를 기억하고있으면 언제든 중단 후 다른작업 처리 후 돌아올수있으니 구조적 이유가 큽니다

**판정**: ✅ 통과

**보충**: Stack Reconciler(React 15) = "책을 소리내어 읽기(끝까지 멈출 수 없음)", Fiber = "북마크를 끼워가며 읽기(언제든 중단/재개)". 📍 React 15의 실제 문제: 컴포넌트 1만 개 렌더링 시 1만 개 스택 프레임 → 애니메이션 프레임 드롭

---

## [4/15] Fiber Node 구조 — Profiler 초기값

**Q**: Profiler 필드에서 `actualDuration`은 `-0`으로, `actualStartTime`은 `-1.1`로 초기화합니다. 둘 다 Double 타입을 강제하기 위한 것인데, 왜 같은 값을 쓰지 않고 서로 다른 값을 쓰나요?

**A**: -0은 === 0에 만족하면서 이후 double값으로 변경될때 최적화까지 고려하여 -0을 사용하는것(js에서는 0 === -0이지만 V8에서는 아님 (smi, double)) / 반면 -1.1은 double이면서 < 0 만 만족하면 되기때문입니다

**판정**: ✅ 통과

**보충**: `actualDuration`은 `!== 0`으로 판별 → `-0 !== 0`은 `false` → "측정 안 됨". `actualStartTime`은 `< 0`으로 판별 → `-0 < 0`은 `false`(JS에서 -0은 0과 동등) → `-0`을 쓸 수 없음 → `< 0`이 `true`인 진짜 음수 Double `-1.1` 사용. 📍 `ReactProfilerTimer.js:593`

---

## [5/15] WorkTag — class vs function 컴포넌트 구분

**Q**: ES6 class도 `typeof`하면 `'function'`을 반환합니다. React는 어떤 메커니즘으로 ClassComponent와 FunctionComponent를 구분하나요?

**A**: shouldConstruct라는 함수로 판단 -> 내부에 type.prototype.isReactComponent 플래그로 구분 / isReactComponent는 ES6이후와 이전 클래스 컴포넌트 비교용이였지만, ES6 이전 클래스가 사라지면서 자연스럽게 function 컴포넌트와 class 컴포넌트 비교용으로 사용됨

**판정**: ✅ 통과

**보충**: 정확히는 `React.createClass` vs `React.Component(ES6 class)` 구분용. React 0.13에서 도입, 0.14에서 함수 컴포넌트 추가 후 자연스럽게 겸용, v16에서 createClass 제거. 📍 `ReactBaseClasses.js` — `Component.prototype.isReactComponent = {}`

---

## [6/15] WorkTag — elementType vs type

**Q**: Fiber에는 `elementType`과 `type` 두 필드가 있습니다. 대부분 같은 값이지만 달라지는 경우가 있습니다. 이 둘의 역할 차이와, 값이 달라지는 상황을 설명해주세요.

**A**: 보통 `fiber.elementType = type`로 되므로 같다고 알고있지만, elementType은 주문서에 적힌 상품명이라면 type은 실제 출고되는 상품명임, << 여기까지만 알고있습니다

**판정**: 🔶 아쉬움

**보충**: 값이 달라지는 구체적 상황 — HMR: `resolveClassForHotReloading(resolvedType)`로 교체된 함수, LazyComponent: `resolvedType = null`. 분기는 원본(`type`)으로, 저장은 resolved(`resolvedType`)로. 📍 `ReactFiber.js:721-723`

**Q (변형)**: `createFiberFromTypeAndProps`에서 `let resolvedType = type;`으로 시작하는데, 이후 분기 조건은 `typeof type`처럼 원본 `type`을 사용합니다. 분류(classification)에 `resolvedType`이 아닌 `type`을 쓰는 이유는 무엇인가요?

**A**: resolvedType의 값은 변할수있기때문입니다. 조건문에서 type은 원본 type에 대한 조건을 판단하기 위함으로 값이 변할수있는 resolvedType은 사용하면 안됩니다

**판정**: ✅ 통과

**보충**: `resolvedType`은 분기 과정에서 HMR 교체나 `null`(lazy)로 변형될 수 있으므로, 분류 기준은 항상 불변인 원본 `type`을 써야 정확함.

---

## [7/15] WorkTag — 순차 정수 vs 비트마스크

**Q**: WorkTag는 순차 정수(0, 1, 3, 5...)이고, Flags는 2의 거듭제곱(1, 2, 4, 8...)입니다. 왜 WorkTag는 비트마스크를 쓰지 않나요?

**A**: WorkTag는 동시에 여러 상태를 가질수없지만, Flags는 여러 상태를 가질수있기때문입니다. 2의 거듭제곱인 이유도 여러 상태를 동시에 표현할때 겹치지 않기위함입니다

**판정**: ✅ 통과

**보충**: Fiber는 "함수이면서 클래스"일 수 없지만, 부작용은 `Placement + Update`처럼 동시 가능. 순차 정수의 성능 이점: V8 Smi 최적화 + switch 점프 테이블(O(1) 분기).

---

## [8/15] Flags — 비트 재사용

**Q**: JavaScript의 비트 연산은 31비트까지만 안전합니다. React는 flag 수가 많아지자 어떤 전략으로 이 제한을 우회했나요?

**A**: 절대 동시에 사용되지 않을 flag들의 값을 같은 값으로 설정하여 우회하였습니다

**판정**: ✅ 통과

**보충**: 예: `Callback` = `Hydrate` — 클래스 컴포넌트의 콜백과 하이드레이션은 서로 다른 Fiber 타입에서 발생하므로 같은 비트를 공유. 📍 `ReactFiberFlags.js:42-51`

---

## [9/15] Flags — 3계층 분류

**Q**: Flags는 수명과 동작 방식에 따라 3개 계층으로 분류됩니다. 각 계층의 이름과 핵심 특성을 설명해주세요.

**A**: Flags 3계층: Commit Flags(렌더별 수명) / Non-effect Flags(부작용은 아니지만 필드 재사용) / Static Flags(Fiber 수명 동안 유지, bailout 시에도 버블업) — 자세히 모르므로 복습 필요

**판정**: ✅ 통과

**보충**: Commit Flags(Placement, Update, ChildDeletion) 📍 `:18-50` / Non-effect Flags(Incomplete, ShouldCapture) 📍 `:60-64` / Static Flags(LayoutStatic, PassiveStatic) 📍 `:66-87`

---

## [10/15] Flags — subtreeFlags 도입 동기

**Q**: React 16의 effect list(연결 리스트)를 React 18+에서 subtreeFlags(트리 순회 + 버블업)로 대체했습니다. 이 변경의 주된 동기는 무엇이었나요?

**A**: Suspense같은 개념이 도입되어서입니다. 연결 리스트가 더 빠르지만 연결 리스트는 평면 목록입니다. 즉 전국에 택배 배송을 위해 1000개의 주소중 실제 가야할 3개의 주소 3개 체크는 가능하지만, 가야할곳이 특정 날짜까지는 접근 불가라 일단 못감 -> 이후 가야함 같은 표현이 불가능하기때문에 Suspense처럼 일단 대기 후 promise가 resolve되면 렌더링같은 것을 표현 못하기때문에 약간의 성능이 떨어져도 subtreeFlags로 대체하였습니다.

**판정**: ✅ 통과

**보충**: 성능 최적화가 도입 동기가 아니라 기능 지원이 동기. 버블업 비용은 completeWork에서 `|=` 한 줄(추가 비용 거의 0). 📍 PR #19322, `ReactFiberCompleteWork.js:844`

---

## [11/15] Mode — Flags와의 차이

**Q**: Mode도 비트마스크이지만 Flags와 근본적으로 다릅니다. 방향, 수명, 역할 세 가지 관점에서 차이를 설명해주세요.

**A**: Mode는 그 구역에 대한 규칙이라 거기에 속하는것들은 그 규칙을 적용받음 (위 -> 아래) / 반면 flags는 이전 질문에서 이어지듯 subtreeFlags(버블업)입니다 (아래 -> 위)

**판정**: 🔶 아쉬움

**보충**: 방향은 정확. 빠진 부분 — 수명: Flags는 매 렌더마다 리셋 vs Mode는 한 번 설정되면 불변. 역할: Flags는 "무엇을 해야 하는가"(부작용) vs Mode는 "어떤 환경에서 돌아가는가". 📍 `ReactTypeOfMode.js:12-21`

**Q (변형)**: `<StrictMode>` 안에 있는 컴포넌트의 자식, 그 자식의 자식까지 전부 StrictMode가 적용됩니다. Mode가 이렇게 동작할 수 있는 이유는 Fiber의 어떤 특성 때문인가요?

**A**: 트리 형태로 인자를 받기때문인가요?

**판정**: 🔶 아쉬움

**보충**: `createFiber(tag, pendingProps, key, mode)` — 4번째 인자 `mode`는 부모에서 전달받은 값이고, 한 번 설정되면 변경되지 않음. 모든 자식 Fiber 생성 시 같은 mode 값이 인자로 전달되어 자동 상속. 📍 `ReactTypeOfMode.js:12-21`

---

## [12/15] Double Buffering — 핵심 메커니즘

**Q**: React의 Double Buffering에서, 작업이 끝난 workInProgress 트리를 화면에 반영하는 과정은 구체적으로 어떻게 이루어지나요?

**A**: root.current = finishedWork — 비유적으로는 화이트보드 2개가있고, 사용자에게 A 보드를 보여주고있을때 B 보드가 준비하고있다가 B보드를 보여주고 A보드를 다시 준비로 하는것입니다

**판정**: ✅ 통과

**보충**: 포인터 한 줄로 트리 전체를 교체. Mutation Phase 후, Layout Phase 전에 스왑. 📍 `ReactFiberWorkLoop.js:4020-4024`

---

## [13/15] Double Buffering — createWorkInProgress 두 경로

**Q**: `createWorkInProgress`는 상황에 따라 두 가지 경로로 나뉩니다. 어떤 조건에서 어떤 경로를 타는지, 그리고 두 번째 경로가 성능에 어떤 이점을 주는지 설명해주세요.

**A**: alternate가 있는지 판단 후 있으면 flags/subtreeFlags만 리셋하고 재사용 / 없으면 새 Fiber 생성 + 쌍 연결

**판정**: ✅ 통과

**보충**: 재사용 경로의 성능 이점은 pooling 전략 — 새 객체를 할당하지 않고 기존 Fiber를 리셋 후 재사용하므로 메모리 할당/GC 부담 감소. 📍 `ReactFiber.js:327-444`

---

## [14/15] Double Buffering — alternate lazy 생성

**Q**: "첫 렌더 이후에는 모든 Fiber가 alternate를 가진다"는 맞는 말인가요? 그렇지 않다면 alternate가 없는 노드는 어떤 경우인가요?

**A**: 첫 렌더 이후가 아니라 한번이라도 리렌더된 모든 Fiber가 더 맞을거같습니다 / 리렌더가 트리거되지 않은 노드들은 alternate 없습니다

**판정**: ✅ 통과

**보충**: 정확히는 "렌더 경로에서 방문(work)된 노드만" alternate를 가짐. `bailoutOnAlreadyFinishedWork`에서 `childLanes === NoLanes`이면 서브트리 전체 스킵 → alternate 미생성. 📍 `ReactFiber.js:330-334` — "This is lazily created to avoid allocating extra objects for things that are never updated."

---

## [15/15] Double Buffering — stateNode 공유

**Q**: current Fiber와 workInProgress Fiber는 별개의 객체입니다. 그런데 `stateNode` 필드는 어떻게 처리되나요? 왜 그런 방식을 택했을까요?

**A**: 공유합니다. 자세한 이유는 모르겠습니다

**판정**: 🔶 아쉬움

**보충**: DOM 노드는 실제 화면에 렌더된 실물이므로 복제할 수도, 복제할 이유도 없음. Fiber는 작업 계획(차트)이라 두 벌 만들 수 있지만, DOM은 실제 결과물이라 하나만 존재. 택배 비유: 화이트보드(Fiber)는 2개지만 실제 배송된 물건(DOM Element)은 1개. 📍 `ReactFiber.js:327-444` — `workInProgress.stateNode = current.stateNode`
