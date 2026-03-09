---
title: "Topic 3: Fiber Node And Tags"
aliases:
  - "Fiber-Structure"
---
# Topic 3: Fiber Node And Tags

> `/learn react` 세션 기록. 소스 코드 기반 Q&A 히스토리.

---

## 병합 정리 기준 (Q&A 원문 보존)

- plan 매핑: `docs/react/plan.md`의 Topic 3 (`react-reconciler — Fiber Structure`)
- 진실 원천:
  - `ref/react-fork/packages/react-reconciler/src/ReactFiber.js`
  - `ref/react-fork/packages/react-reconciler/src/ReactWorkTags.js`
  - `ref/react-fork/packages/react-reconciler/src/ReactFiberFlags.js`
  - `ref/react-fork/packages/react-reconciler/src/ReactTypeOfMode.js`
- 중복 범위 병합 규칙:
  - `scheduleUpdateOnFiber`, `renderRootSync/concurrent`, `commitRoot` 실행 흐름은 `docs/react/Work-Loop.md`를 기준으로 사용
  - 본 문서는 Fiber 데이터 구조/태그/플래그/더블버퍼링 설명을 기준으로 유지
- 원문 보존 정책: 아래 날짜별 Q&A 기록은 삭제/요약하지 않고 유지

---

## 2026-02-13

### 학습 로드맵

- [x] Step 1: Fiber Node 구조 — FiberNode 생성자, 필드 5개 카테고리(Instance/Tree/Props/Effects/Priority)
- [ ] Step 2: WorkTag 전체 목록과 type→tag 변환 — 31개 태그 상수, createFiberFromTypeAndProps 분기 로직
- [ ] Step 3: Flags & Mode 비트마스크 — 부작용 플래그, 모드 플래그, Commit Phase 마스크
- [ ] Step 4: Double Buffering — createWorkInProgress — current ↔ workInProgress 쌍, 노드 재사용/복제 전략

### 학습 요약

- Fiber 노드는 React의 작업 단위(unit of work)로, 컴포넌트 하나당 Fiber 하나가 생성됨
- FiberNode 생성자는 4개 인자(tag, pendingProps, key, mode)만 받고, 나머지 필드는 null/0/NoFlags로 초기화 — V8 Hidden Class 최적화를 위해 모든 필드를 생성 시점에 선언
- 필드는 5개 카테고리: Instance(tag/key/elementType/type/stateNode), Tree(return/child/sibling/index), Props/State(pendingProps/memoizedProps/memoizedState/updateQueue/dependencies), Effects(flags/subtreeFlags/deletions), Priority(lanes/childLanes) + alternate(Double Buffering)
- 트리 구조는 배열이 아닌 단일 연결 리스트(child→sibling 체인) — Concurrent Mode의 중단/재개를 가능하게 하는 아키텍처 전제 조건
- Profiler 필드 초기값 `-0`과 `-1.1`은 V8 Shape 안정성을 위한 Double 타입 강제 + 센티널 값 역할 (Sebastian Markbåge, PR #30942)

### 소스 코드 경로

- `ref/react-fork/packages/react-reconciler/src/ReactFiber.js:138-211` — FiberNode 생성자 (constructor function)
- `ref/react-fork/packages/react-reconciler/src/ReactFiber.js:236-301` — createFiberImplObject (plain object 버전)
- `ref/react-fork/packages/react-reconciler/src/ReactFiber.js:303-305` — createFiber (feature flag 분기)
- `ref/react-fork/packages/react-reconciler/src/ReactFiber.js:561-731` — createFiberFromTypeAndProps (type→tag 변환)
- `ref/react-fork/packages/react-reconciler/src/ReactWorkTags.js` — 31개 WorkTag 상수
- `ref/react-fork/packages/react-reconciler/src/ReactFiberFlags.js` — 부작용 플래그
- `ref/react-fork/packages/react-reconciler/src/ReactTypeOfMode.js` — 모드 비트마스크
- `ref/react-fork/packages/react-reconciler/src/ReactInternalTypes.js:89-210` — Fiber 타입 정의
- `ref/react-fork/packages/react-reconciler/src/ReactProfilerTimer.js:593-595` — actualStartTime < 0 센티널 판별
- `ref/react-fork/packages/react-reconciler/src/ReactChildFiber.js:511-539` — placeChild (index 할당)

### Q&A 전체 기록

#### Step 1: Fiber Node 구조

**Q: "생성자가 받는 인자는 딱 4개: tag, pendingProps, key, mode. 나머지 필드는 모두 null/0/NoFlags로 초기화됩니다.": 이럴거면 넘길때 4개만 넘기면 안되는걸까요? / 굳이 다 받은다음에 null등으로 바꾼느 이유가 뭘까요?**

A: V8 Hidden Class 최적화 때문이다. V8은 객체 생성 시 속성의 순서와 구조를 기반으로 "Hidden Class"를 할당하고, 같은 Hidden Class를 공유하는 객체들은 프로퍼티 접근이 매우 빠르다. 만약 프로퍼티를 나중에 동적으로 추가하면 Hidden Class가 변경되어 V8이 최적화를 포기한다(megamorphic).

소스 코드에 직접적인 증거가 있다. `ReactFiber.js:180-191`에서 GitHub issue #14365와 Chromium bug #8538을 참조하며 "makes React unusably slow for some applications"이라고 명시. V8 엔지니어(@bmeurer, @mathiasbynens)가 직접 분석 — `Object.preventExtensions()`와 double 필드 마이그레이션 결합 시 모든 FiberNode가 서로 다른 Shape를 가지게 됨.

Profiler 필드에서 `0` 대신 `-0`, `-1` 대신 `-1.1`을 쓰는 이유도 같은 원리 — V8은 정수(Smi)와 부동소수점(Double)을 다른 내부 표현으로 저장하므로, 처음부터 Double로 초기화하여 Shape 변경을 방지.

---

**Q: (Q1 추가) 실제로 성능 차이가 테스트된 게 있나요? 아니면 최적화가 되었다는 근거?**

A: GitHub issue #14365에서 실제 측정된 성능 문제가 보고됨:

1. 증상: Profiling 모드에서 `getHostSibling()` 함수가 극도로 느려짐 (Chrome만)
2. 원인: V8 엔지니어가 직접 진단 — 모든 FiberNode가 서로 다른 Shape를 가지게 되어 인라인 캐싱 포기
3. 해결: 처음부터 Double 값으로 초기화하여 Shape 일관성 유지

이건 V8 엔지니어가 직접 진단하고, React 팀이 수정한 실제 사례. 다만, "모든 필드를 null로 미리 선언하는 것" 자체에 대한 별도 벤치마크는 소스에서 확인하지 못했다. 위 이슈가 "Shape가 달라지면 실제로 심각한 성능 저하가 발생한다"는 것을 입증하므로, 미리 선언은 같은 원리의 예방적 적용이다.

---

**Q: "비유하면, tag는 '명함의 직함', type은 '실제 그 사람', stateNode는 '그 사람의 사무실(실제 결과물)'"입니다.": Instance 전체를 좀 더 쉽고 정확한 비유로 다시 설명해주세요**

A: 택배 시스템 비유:

| 필드          | 비유                                                   | 실제                                    |
| ------------- | ------------------------------------------------------ | --------------------------------------- |
| `tag`         | 배송 유형 (일반/냉동/편의점) — 처리 방식이 완전히 다름 | `beginWork`에서 tag별로 switch 분기     |
| `key`         | 송장번호 — 같은 받는사람이 여러 개 시켜도 구분         | 리스트 diffing 시 항목 식별             |
| `elementType` | 주문서에 적힌 상품명 원본                              | `React.memo(MyComp)`면 memo 객체 전체   |
| `type`        | 실제 출고된 상품 (보통 주문서와 같지만 교체될 수 있음) | 래핑 해제된 함수, HMR 시 교체된 함수    |
| `stateNode`   | 배송 완료된 실물                                       | DOM Element, 클래스 인스턴스, FiberRoot |

`elementType`과 `type`의 차이는 `ReactFiber.js:721-723`에서 확인:

```js
fiber.elementType = type; // element.type 원본 그대로
fiber.type = resolvedType; // resolve된 결과 (lazy면 null, HMR이면 교체된 함수)
```

대부분의 경우 둘은 같지만, Lazy/Memo/ForwardRef/HMR 상황에서 달라진다.

---

**Q: "children 배열이 아니라 단일 연결 리스트입니다.": 그러면 index 필드는 직접 지정하는 겁니까? 아니면 단일 연결 리스트에도 index 개념이 있나요?**

A: `index`는 linked list 자체의 속성이 아니라, reconciliation 시 부모가 직접 할당한다. `ReactChildFiber.js:511-516`의 `placeChild` 함수:

```js
function placeChild(newFiber, lastPlacedIndex, newIndex) {
  newFiber.index = newIndex; // 부모가 자식 배열 순회하면서 직접 번호 부여
  const current = newFiber.alternate;
  if (current !== null) {
    const oldIndex = current.index;
    if (oldIndex < lastPlacedIndex) {
      newFiber.flags |= Placement; // 이동 필요
    }
  }
}
```

index의 실제 용도:

1. 리스트 재배치 최적화: oldIndex와 newIndex를 비교해서 DOM 이동 필요 여부 판단
2. `useId` 알고리즘: 배열 내 위치 기반으로 고유 ID 생성

---

**Q: (Q3/Q4 추가) linked list 선택도 이론적 최적화인가요? 검증된 근거가 있나요?**

A: 마이크로 최적화가 아니라 아키텍처 설계 선택이다. "배열보다 빠르다"는 벤치마크가 아니라 "이 구조가 아니면 중단/재개가 불가능하다"는 구조적 필수 조건.

React 15(Stack Reconciler)는 JavaScript의 실제 콜스택에 의존하여 재귀적으로 트리를 순회 — 중간에 멈출 수 없음. 컴포넌트 1만 개 렌더링 시 1만 개의 스택 프레임이 쌓이고, 애니메이션 프레임 드롭 문제가 광범위하게 보고됨.

Fiber는 콜스택을 JavaScript 객체로 재구현("virtual stack frame"). linked list로 연결했기 때문에 현재 작업 중인 노드(workInProgress) 포인터 하나만 기억하면 언제든 중단/재개 가능. 배열이었다면 별도 인덱스 + 깊이 정보를 관리해야 하고, 중첩된 배열 구조에서 이를 일관되게 유지하는 것은 극도로 복잡.

비유: Stack Reconciler = 책을 소리내어 읽기(끝까지 멈출 수 없음). Fiber = 책에 북마크를 끼워가며 읽기(언제든 중단/재개 가능). return/child/sibling이 바로 그 "북마크 시스템".

정량적 근거(linked list vs array 벤치마크)는 React 팀이 공개한 적이 소스에서 확인되지 않음. 이것은 "어떤 게 더 빠른가"가 아니라 "가능한가 vs 불가능한가"의 문제였기 때문.

---

**Q: 전체 개념을 실생활 비유 및 시각화로 더 쉽게 설명해주세요**

A: 병원 진료 시스템 비유:

```
🏥 병원 = React 앱
📋 진료 차트 = Fiber 노드
```

각 카테고리 매핑:

- 환자 식별(Instance): tag=진료과, key=환자번호, type=담당의사, stateNode=환자본인
- 조직도 위치(Tree): return=상급부서, child=첫번째 하위업무, sibling=같은부서 다음업무, index=대기순서
- 진료 내용(Props/State): pendingProps=새 접수 증상, memoizedProps=지난 진료 증상, memoizedState=현재 처방
- 필요한 조치(Effects): flags=이 환자 처치, subtreeFlags=하위부서 처치 여부
- 긴급도(Priority): lanes=응급도, childLanes=하위 응급환자 여부

트리 순회 시각화:

```
     [병원장/HostRoot]
          │ child
      [내과/App]
          │ child
    [1번환자] ──sibling──▶ [2번환자] ──sibling──▶ [3번환자]
    index=0               index=1                 index=2
```

순회 순서: 병원장→내과→1번→1번의검사결과→(완료)→2번→(완료)→3번→(완료)→내과완료→병원장완료. 이것이 beginWork(아래로) → completeWork(위/옆으로) 순회.

---

**Q: (Q1 실생활 비유 추가) 왜 전체 객체를 다 정의하는지는 이해 OK, 근데 왜 값이 -0, -1.1인지 잘 모르겠음**

A: V8은 숫자를 내부적으로 두 가지 형태로 저장:

- Smi (Small Integer): `0`, `1`, `-1` → 포인터 안에 직접 인코딩 (매우 빠름)
- Double (HeapNumber): `-0`, `3.14`, `-1.1` → 힙에 별도 객체로 할당

`0`과 `-0`은 JS에서 `0 === -0`이 true이지만, V8 내부에서는 완전히 다른 타입.

서류 캐비넷 비유:

- `0`으로 초기화 → "작은 서랍(Smi) 설치" → 나중에 3.14 넣을 때 "작은 서랍 뜯어내고 큰 서랍(Double)으로 교체" → 배치도 변경
- `-0`으로 초기화 → "처음부터 큰 서랍(Double) 설치" → 3.14 넣어도 "그냥 넣으면 됨" → 배치도 유지

그리고 `-0`과 `-1.1`이 다른 이유:

- `actualDuration`은 `!== 0`으로 판별 → `-0 !== 0`은 `false` ✅ ("측정 안 됨")
- `actualStartTime`은 `< 0`으로 판별 → `-0 < 0`은 `false` ❌ (JS에서 -0은 0과 동등)
- 그래서 `actualStartTime`은 `< 0`이 `true`가 되는 진짜 음수 Double인 `-1.1` 사용

`ReactProfilerTimer.js:593`: `if (((fiber.actualStartTime: any): number) < 0)` — 센티널 판별

---

**Q: 저 숫자값들에 대한 설명이 주석 등으로 있나요?**

A: 없다. 주석은 "왜 Double로 초기화하는가"(`ReactFiber.js:180-191`)만 설명하고, "왜 -0이고 왜 -1.1인가"는 설명하지 않는다. 사용처 코드(`< 0`, `!== 0`)에서 역추론해야 알 수 있는 암묵적 지식(tribal knowledge).

---

**Q: 한번 웹검색을 통해 근거나 이유를 찾아봐줄 수 있나요?**

A: Git 커밋 히스토리에서 찾았다. Sebastian Markbåge의 커밋 `94e4acaa1` — PR #30942 "[Fiber] Set profiler values to doubles":

커밋 메시지 핵심:

> "At some point this trick was added to initialize the value first to NaN and then replace them with zeros and negative ones."
> "However, this fix has been long broken and has deopted the profiling build for years because closure compiler optimizes out the first write."
> "I'm not sure because I haven't A/B-tested this in the JIT yet but I think we can use negative zero and -1.1 as the initial values instead since they're not simple integers."

사실 정리:

1. 원래는 NaN으로 먼저 쓰고 0/-1로 덮어쓰는 2단계 방식이었음
2. Closure Compiler가 첫 번째 NaN 쓰기를 최적화로 제거해버려서 수년간 깨진 채 방치
3. Sebastian이 `-0`과 `-1.1`로 직접 초기화하는 방식으로 변경
4. 본인이 직접 인정: "I'm not sure because I haven't A/B-tested this in the JIT yet but I think..." — 벤치마크 없이 경험적 판단

참고:

- https://github.com/facebook/react/pull/30942
- https://github.com/facebook/react/issues/14365

### 연결 토픽

- Step 2-4 (미완료): WorkTag 전체 목록과 type→tag 변환, Flags & Mode 비트마스크, Double Buffering
- Topic 3: Work Loop: beginWork/completeWork의 트리 순회가 Fiber의 child/sibling/return 구조를 따라감
- Topic 4: Reconciliation: placeChild에서 index를 활용한 리스트 재배치 최적화
- Topic 7: Hooks: memoizedState 필드에 hooks linked list가 저장되는 메커니즘

---

## 2026-02-13 (재개 — Step 2부터)

### 학습 로드맵

- [x] Step 1: Fiber Node 구조 — FiberNode 생성자, 필드 5개 카테고리(Instance/Tree/Props/Effects/Priority)
- [x] Step 2: WorkTag 전체 목록과 type→tag 변환 — 31개 태그 상수, createFiberFromTypeAndProps 분기 로직
- [ ] Step 3: Flags & Mode 비트마스크 — 부작용 플래그, 모드 플래그, Commit Phase 마스크
- [ ] Step 4: Double Buffering — createWorkInProgress — current ↔ workInProgress 쌍, 노드 재사용/복제 전략

### 학습 요약

- WorkTag는 Fiber 노드의 "직종"을 나타내는 정수 상수 (0~31), 5개 카테고리(사용자 컴포넌트/호스트/구조·제어/데이터·컨텍스트/에러·내부)로 분류
- `createFiberFromTypeAndProps`는 JSX의 `type`을 보고 WorkTag를 결정하는 3-way 분기: `typeof type`이 `function`(→shouldConstruct로 Class/Function 구분) / `string`(→HostComponent/HostHoistable/HostSingleton) / 그 외(→심볼·`$$typeof` 체크)
- `shouldConstruct`는 `type.prototype.isReactComponent` 체크 — ES6 class도 `typeof`하면 `'function'`이므로 이것이 유일한 구분 방법
- `isReactComponent`는 함수 컴포넌트 구분용이 아니라, React 0.13에서 `createClass` vs `React.Component` 구분을 위해 도입된 것. 0.14에서 함수 컴포넌트가 추가되며 자연스럽게 class/function 구분 역할도 겸하게 됨
- `elementType`은 원본 type, `type`은 resolve된 결과(HMR 교체, lazy=null) — 분기는 원본으로, 저장은 resolved로
- WorkTag가 순차 정수인 이유: Fiber는 한 번에 하나의 tag만 가지므로 비트마스크 불필요, V8 Smi 최적화 + switch 점프 테이블 활용
- 빈 번호(2, 20)는 제거된 태그(IndeterminateComponent, FundamentalComponent)의 자리 — 외부 도구 호환성을 위해 재할당하지 않음
- React 팀은 "이상적 설계"보다 "안정적 생태계"를 우선 — `isReactComponent` 이름 변경(breaking change 비용 > 가독성 이득)이나 `{}` → `true` 변경(이득 = 0)을 하지 않는 이유

### 소스 코드 경로

- `ReactWorkTags.js` — 32개 WorkTag 상수 (0~31, 2와 20 결번)
- `ReactFiber.js:397-544` — createFiberFromTypeAndProps (type→tag 변환, 3-way 분기)
- `ReactBaseClasses.js` — `Component.prototype.isReactComponent = {}` (shouldConstruct 판별 근거)

> 참고: `ref/` 소스가 현재 없어 GitHub raw 소스(v19.2.4)와 스킬 레퍼런스(`~/.claude/skills/react-aio/references/fiber.md`)를 사용

### Q&A 전체 기록

#### Step 2: WorkTag 전체 목록과 type→tag 변환

**Q: 사소한 질문이긴 하지만 `let resolvedType = type;`로 할당 이후 분기 처리는 typeof type 처럼 다시 type으로 하고있습ㅂ니다. 특별한 이유가 있을까요?**

A: `type`과 `resolvedType`는 역할이 다르다. `type`은 원본 입력으로 분류(classification)에 사용하고, `resolvedType`은 최종 저장값으로 분기 과정에서 변형될 수 있다.

`resolvedType`이 바뀌는 지점:

```javascript
if (typeof type === 'function') {
  if (shouldConstruct(type)) {
    fiberTag = ClassComponent;
    if (__DEV__) {
      resolvedType = resolveClassForHotReloading(resolvedType); // ← 변형!
    }
  }
}
// ...
case REACT_LAZY_TYPE:
  fiberTag = LazyComponent;
  resolvedType = null;  // ← lazy는 아직 resolve 안 됐으므로 null!
```

함수 끝에서 두 값이 각각 다른 필드에 저장된다:

```javascript
fiber.elementType = type; // 원본 그대로 (주문서 원본)
fiber.type = resolvedType; // resolve된 결과 (HMR 교체, lazy=null)
```

Step 1의 택배 비유로: `elementType`은 주문서에 적힌 상품명, `type`은 실제 출고된 상품. 보통은 같지만, HMR이나 lazy 로딩 상황에서 달라진다. 분기는 원본(`type`)으로 해야 정확하다.

---

**Q: `type.prototype && type.prototype.isReactComponent` < 이게 왜/어떻게 구분을 짓는건가요?**

A: React.Component의 상속 체인을 이용한 구분이다.

`React.Component` 정의 시:

```javascript
// ReactBaseClasses.js
Component.prototype.isReactComponent = {}; // 빈 객체 (truthy)
```

`shouldConstruct` 함수:

```javascript
function shouldConstruct(Component) {
  const prototype = Component.prototype;
  return !!(prototype && prototype.isReactComponent);
}
```

| 컴포넌트 종류                 | `prototype`               | `prototype.isReactComponent` | 결과                |
| ----------------------------- | ------------------------- | ---------------------------- | ------------------- |
| `class App extends Component` | 존재 (Component에서 상속) | `{}` (truthy)                | `ClassComponent`    |
| `function App() {}`           | 존재하지만                | `undefined`                  | `FunctionComponent` |
| `const App = () => {}`        | `undefined` (화살표 함수) | 접근 불가                    | `FunctionComponent` |

핵심은 JavaScript의 프로토타입 상속. `class App extends React.Component`를 하면, `App.prototype`이 `Component.prototype`을 상속받으므로 `App.prototype.isReactComponent`가 `{}`를 반환한다.

이것이 React가 함수와 클래스를 구분하는 유일한 방법이다. `typeof`만으로는 구분 불가 — ES6 class도 `typeof`하면 `'function'`이다:

```javascript
class Foo {}
typeof Foo; // 'function'  ← class와 function 구분 불가!
```

---

**Q: type을 숫자로 매핑한 이유나 특별한 규칙이있나요?**

A: 성능 + 메모리 이유로 숫자를 사용한다:

1. 정수 비교가 문자열 비교보다 빠름: `tag === 0`은 CPU 단일 명령어, `tag === 'FunctionComponent'`는 문자열 길이만큼 비교
2. V8 Smi 최적화: 0~31 범위의 정수는 Smi(Small Integer)로 포인터 안에 직접 인코딩 — 힙 할당 없음
3. switch 최적화: V8은 연속된 정수 switch를 점프 테이블로 컴파일 가능 — O(1) 분기

번호 배정에 특별한 의미론적 규칙은 없다. 대체로 React에 추가된 시간순이다.

Flags와의 중요한 차이:
| | WorkTag | Flags |
|---|---------|-------|
| 값 | 순차 정수 (0, 1, 3, 5...) | 2의 거듭제곱 (1, 2, 4, 8...) |
| 조합 | 불가 — Fiber는 한 번에 하나의 tag만 | 가능 — `flags | Update | Placement` |
| 이유 | 컴포넌트는 "함수이면서 클래스"일 수 없음 | 부작용은 동시에 여러 개 가능 |

빈 번호(2, 20)는 과거 `IndeterminateComponent`(2)와 `FundamentalComponent`(20)가 있었으나 v19에서 제거. DevTools, 직렬화된 데이터, 디버깅 로그 등 외부 도구와의 호환성 유지를 위해 번호를 재할당하지 않는다.

---

**Q: prototype.isReactComponent 는 class 컴포넌트 초기부터 있던 속성일까요? 즉, 함수형 컴포넌트가 나오고 그것과 구분하기 위해 추가된건지? 아니면 원래 있던 속성인지? 원래 있던 속성이면 어떤 역할을 햇던건가요? 원래는 클래스 컴포넌트만 있었으니 분기용은 아닐거같습니다**

A: 사용자의 직감이 맞다. 원래 함수 컴포넌트 구분용이 아니었다.

타임라인:

| 시점                  | 변화                                                                   |
| --------------------- | ---------------------------------------------------------------------- |
| ~React 0.13 (2015.03) | ES6 class 지원 추가 → `React.Component` 도입 + `isReactComponent` 추가 |
| React 0.14 (2015.10)  | Stateless Functional Component 도입                                    |

0.13 시점에는 컴포넌트를 만드는 방법이 두 가지였다:

```javascript
// 방법 1: createClass (React 고유 API)
var App = React.createClass({
  mixins: [SomeMixin],           // 믹스인 지원
  handleClick() { ... },         // 자동 this 바인딩
});

// 방법 2: ES6 class (새로 추가)
class App extends React.Component {
  handleClick() { ... }          // 자동 바인딩 없음!
}
```

이 둘은 내부 동작이 달랐다: `createClass`는 자동 `this` 바인딩, 믹스인 지원, `getInitialState` 등 고유 라이프사이클을 가졌고, `React.Component`는 없었다. React 내부에서 이 둘을 구분해야 했으므로 `isReactComponent`가 추가됨 — "이것은 `React.Component` 기반 클래스다"라는 정체성 마커.

그 후 0.14에서 함수 컴포넌트가 추가되자, 이미 존재하던 `isReactComponent`가 자연스럽게 "class vs function" 구분 역할도 겸하게 된 것. 새로운 메커니즘을 추가한 게 아니라, 기존 마커가 새 용도에도 맞아떨어진 케이스.

`createClass`는 v16에서 제거되었고, 원래 용도는 사라졌지만 마커는 남아서 현재 역할을 수행.

---

**Q: 소스에서 확인하지 못했지만, Dan Abramov의 블로그에 따르면 과거 특정 테스트 라이브러리의 직렬화 이슈를 회피하기위한 것, isReactComponent 이름 << 이처럼 레거시를 처리하지 못한걸까요? 안할걸까요? / 예를들어 isReactComponent보다 isClassComponent가 더 명시적인 이름인거같고, 특정 테스트 라이브러리의 직렬화 이슈를 회피하기 위해 React가 대응하는건 뭔가 역방향인거같습니다**

A: "안 한 것"에 가깝고, 이유가 있다.

이름 변경(`isClassComponent`):

- `isReactComponent`는 React 내부 속성이지만 사실상 공개 API. React DevTools, 테스팅 라이브러리, SSR 프레임워크 등 서드파티가 이 속성명에 의존
- 비용: 생태계 전체에 영향을 주는 breaking change
- 이득: 이름이 좀 더 명확해짐 (기능 변화 없음)
- 비용 대비 이득이 맞지 않다

React 팀이 breaking change를 하는 경우의 패턴:

| 변경                         | 이유                         | 소요 기간           |
| ---------------------------- | ---------------------------- | ------------------- |
| `createClass` 제거           | 기술적 부채 + ES6 class 표준 | 0.13 → v16 (약 2년) |
| String refs 제거             | 성능 문제 + 소유권 추적 불가 | v15 → v19 (약 5년)  |
| `isReactComponent` 이름 변경 | 논의된 적 없음               | —                   |

기능적 문제가 있는 것만 긴 deprecation 기간을 거쳐 변경한다. 동작에 문제가 없는 이름 변경은 비용만 발생시키므로 하지 않는다.

`{}` vs `true` — React가 테스트 라이브러리에 대응한 것이 역방향 아닌가:
사용자의 직감이 맞으나 2015년 시점 맥락이 있다. React는 아직 지배적 프레임워크가 아니었고, 생태계를 키워야 하는 입장에서 기존 도구들과의 마찰을 최소화하는 것이 합리적이었다. 기술적 판단이 아니라 생태계 전략적 판단.

---

**Q: HostSingleton에서 이름의 싱글톤은 왜 붙은건가요?**

A: 디자인 패턴의 싱글톤 패턴에서 온 이름. HTML 문서에서 단 하나만 존재할 수 있는 DOM 요소를 가리킨다: `<html>`, `<head>`, `<body>`.

일반 `HostComponent`(`<div>`, `<span>`)는 몇 개든 만들 수 있지만, 이 셋은 이미 존재하는 것을 "입양(adopt)"해야 한다:

```
일반 HostComponent: React가 createElement('div') → 새 DOM 노드 생성 → 삽입
HostSingleton: <body>는 이미 있음 → 새로 만들 수 없음 → 기존 것을 찾아서 연결
```

SSR + 하이드레이션 시 중요: 서버에서 보낸 HTML에 이미 `<html>`, `<head>`, `<body>`가 있고, React는 새로 만드는 게 아니라 기존 DOM 노드를 Fiber에 연결해야 한다. `HostSingleton` 태그가 있으면 "새 DOM을 만들지 말고 기존 것을 찾아라"는 다른 처리 경로를 탄다.

---

**Q: {} 대신 true로 바꾸면 안 되는 건가? 이름 변경과 동일한 상황인가?**

A: 이름 변경과는 상황이 다르다.

`shouldConstruct`는 truthy 체크만 한다:

```javascript
return !!(prototype && prototype.isReactComponent);
```

| 값     | `!!value` | 결과 |
| ------ | --------- | ---- |
| `{}`   | `true`    | 통과 |
| `true` | `true`    | 통과 |

React 내부적으로 안 깨지고, 서드파티도 대부분 같은 truthy 체크 패턴을 사용하므로 거의 안 깨진다.

그러면 왜 안 바꾸는가 — **바꿀 이유가 없기 때문이다.**

|               | 이름 변경 (`isClassComponent`) | 값 변경 (`true`) |
| ------------- | ------------------------------ | ---------------- |
| breaking 위험 | 높음                           | 거의 없음        |
| 이득          | 가독성 향상 (작지만 존재)      | 없음             |
| 결론          | 안 함 (비용 > 이득)            | 안 함 (이득 = 0) |

`{}` → `true`로 바꾸는 PR을 올리면 리뷰어 입장에서: "동작이 바뀌는 건 없고, 어딘가 깨질 가능성이 0.01%라도 있고, 이 변경으로 사용자가 얻는 건 아무것도 없다. 왜 머지해야 하는가?" — benefit이 존재하지 않는 상황이다.

### 연결 토픽

- Step 3-4 (미완료): Flags & Mode 비트마스크, Double Buffering
- shouldConstruct: `ReactFiber.js` 내 함수 — class vs function 구분의 유일한 메커니즘
- HostHoistable/HostSingleton: 렌더러(react-dom) 특화 태그 — `isHostHoistableType`, `isHostSingletonType` 판별 로직
- beginWork switch: `ReactFiberBeginWork.js`에서 tag별 분기 — WorkTag가 실제 사용되는 핵심 지점
- Hyrum's Law와 React 생태계 전략: 기술 부채 vs 의도적 안정성 선택

---

## 2026-02-14 (재개 — Step 3부터)

### 학습 로드맵

- [x] Step 1: Fiber Node 구조 — FiberNode 생성자, 필드 5개 카테고리(Instance/Tree/Props/Effects/Priority)
- [x] Step 2: WorkTag 전체 목록과 type→tag 변환 — 31개 태그 상수, createFiberFromTypeAndProps 분기 로직
- [x] Step 3: Flags & Mode 비트마스크 — 부작용 플래그, 모드 플래그, Commit Phase 마스크
- [ ] Step 4: Double Buffering — createWorkInProgress — current ↔ workInProgress 쌍, 노드 재사용/복제 전략

### 학습 요약

- Flags는 2의 거듭제곱(비트마스크) — 각 flag가 하나의 비트(스위치)만 차지하므로 `|=`로 조합, `&`로 확인 가능. WorkTag(순차 정수)와 근본적 차이
- Flags는 클라이언트 Fiber Reconciler 전용 — `react-server` 패키지에서 `ReactFiberFlags` import 0건, 서버에는 Fiber 자체가 없으므로 flags도 없음
- Flags 3계층: Commit Flags(렌더별 수명) / Non-effect Flags(부작용은 아니지만 필드 재사용) / Static Flags(Fiber 수명 동안 유지, bailout 시에도 버블업)
- DevTools 호환 flags(`PerformedWork`, `Placement`, `DidCapture`, `Hydrating`)는 주석 컨벤션으로만 보호 — `Object.freeze`는 원시값에 무의미하고, 주석이 경고하는 "소스 코드 변경"은 코드 메커니즘으로 막을 수 없는 종류의 문제
- 비트 재사용: JS는 31비트까지만 안전 → 서로 다른 Fiber 타입에서 절대 동시에 쓰이지 않는 flags는 같은 비트를 공유 (예: `Callback` = `Hydrate`)
- subtreeFlags: 이전 방식(effect list 연결 리스트)을 대체 — 성능 최적화가 아니라 Suspense/Concurrent 기능 지원이 도입 동기. Commit Phase에서 `subtreeFlags === NoFlags`인 서브트리를 통째로 건너뜀
- Mode: 비트마스크이지만 Flags와 반대 — 위→아래 상속, 한 번 설정되면 불변, "어떤 환경에서 돌아가는가"를 표현 (ConcurrentMode, ProfileMode, StrictLegacyMode 등)

### 소스 코드 경로

- `ref/react-fork/packages/react-reconciler/src/ReactFiberFlags.js:18-50` — Commit Flags (DevTools 호환 4개 + 변경 가능한 나머지)
- `ref/react-fork/packages/react-reconciler/src/ReactFiberFlags.js:42-51` — 비트 재사용 (Hydrate=Callback, ScheduleRetry=StoreConsistency 등)
- `ref/react-fork/packages/react-reconciler/src/ReactFiberFlags.js:60-64` — Non-effect Flags (Incomplete, ShouldCapture 등)
- `ref/react-fork/packages/react-reconciler/src/ReactFiberFlags.js:66-87` — Static Flags (LayoutStatic, PassiveStatic, MaySuspendCommit 등)
- `ref/react-fork/packages/react-reconciler/src/ReactFiberFlags.js:97-145` — Commit Phase 마스크 (BeforeMutationMask, MutationMask, LayoutMask, PassiveMask, StaticMask)
- `ref/react-fork/packages/react-reconciler/src/ReactTypeOfMode.js:12-21` — Mode 비트마스크 6개 상수
- `ref/react-fork/packages/react-reconciler/src/ReactFiberCompleteWork.js:804-805` — 일반 렌더 시 모든 flags 버블업
- `ref/react-fork/packages/react-reconciler/src/ReactFiberCompleteWork.js:859-864` — bailout 시 StaticMask만 버블업
- `ref/react-fork/packages/react-reconciler/src/ReactFiberCompleteWork.js:844` — subtreeFlags를 부모에 합산
- `ref/react-fork/packages/react-reconciler/src/ReactFiberCommitWork.js:2020-2026` — Mutation Phase에서 subtreeFlags 체크로 서브트리 스킵
- `ref/react-fork/packages/react-reconciler/src/ReactFiberCommitWork.js:442` — BeforeMutation Phase에서 subtreeFlags 체크

### Q&A 전체 기록

#### Step 3: Flags & Mode 비트마스크

**Q: Flags: Fiber에 어떤 부작용(side effect)이 필요한지를 << 이 말은 앞서 배운 개념중에 Server 로직에는 이펙트가 없다랑 상충되는걸 보면, 서버에는 Fiber에 Flags 개념은 적용 안됩니까?**

A: 맞다. RSC(Server Components)에서는 Fiber 자체가 없으므로 Flags도 없다. SSR(`react-dom/server`)과 RSC는 구분이 필요하다:

|            | SSR (`react-dom/server`) | RSC (Server Components)                  |
| ---------- | ------------------------ | ---------------------------------------- |
| Fiber 사용 | 사용함                   | 사용 안 함 — Fiber 없이 직접 스트림 생성 |
| Flags      | 일부 사용                | 해당 없음                                |

소스에서 확인: `react-server` 패키지에서 `ReactFiberFlags`를 import하는 파일이 0개. SSR 서버 코드(`react-dom/src/server`)에서도 0개.

Flags는 클라이언트(브라우저)의 Fiber Reconciler 전용 개념. 서버에는 DOM도, ref도, useEffect도 없으므로 부작용을 추적할 필요 자체가 없다.

---

**Q: 이유: 하나의 Fiber에 여러 부작용이 동시에 필요할 수 있기 때문입니다 << 2의 거듭제곱인 이유가 정확히 말하면 2진수인 이유라고 이해해도될까요?**

A: 거의 맞지만 더 정확하게는 "각 flag가 2진수에서 서로 다른 자릿수 하나만 차지하기 때문". 모든 숫자는 2진수로 표현 가능하지만, 예를 들어 `3`(`0b0011`)을 flag로 쓰면 1번째+2번째 자리 둘 다 켜져서, `3 | 2 = 0b0011`과 `3` 자체를 구분할 수 없다. 2의 거듭제곱만 쓰면 각 flag가 정확히 하나의 비트만 차지하므로 조합해도 100% 구분 가능.

---

**Q: |= << 이 연산자는 뭔가요?**

A: JavaScript의 비트 OR 대입 연산자. `+=`와 같은 패턴:

```javascript
flags |= Update; // = flags = flags | Update;
count += 1; // = count = count + 1;
```

`|`(비트 OR)는 "해당 비트를 켠다":

```
flags  = 0b0010  (Placement만 켜짐)
Update = 0b0100
flags |= Update
→ 0b0010 | 0b0100 = 0b0110  (Placement + Update 둘 다 켜짐)
```

---

**Q: 나머지는 자유롭게 변경/추가 가능. << 뭘 변경/추가해도된다는건가요?**

A: React 내부 개발자(Meta 팀)가 비트 값의 위치를 바꾸거나 새 flag를 추가해도 된다는 뜻. 사용자가 바꾸라는 게 아니다.

소스 주석이 React 팀 내부용 가이드: DevTools는 별도 패키지로 배포되므로, `PerformedWork`의 비트 위치를 바꾸면 구버전 DevTools가 깨진다. 하지만 `Update`같은 건 DevTools가 직접 참조하지 않으므로 React 팀이 자유롭게 재배치 가능.

---

**Q: 계층 1: Commit Flags (라인 18~50) — 특정 커밋의 수명을 가짐 << 변경이 불가능함을 코드적으로 막아놨나요?**

A: 아니다. 코드적으로는 전혀 막지 않았다. `const`는 런타임 재할당만 막고, `Object.freeze`는 원시값(숫자)에 적용할 게 없다.

주석이 경고하는 진짜 대상은 "다음 PR에서 이 비트 위치를 바꾸는 React 팀 동료"인데, 이건 어떤 코드 메커니즘으로도 막을 수 없다. 소스를 열어서 `0b010`을 `0b100`으로 고치는 걸 JavaScript가 막을 방법은 없다.

React는 `Object.freeze`를 쓸 곳에는 적극 사용한다:

- `ReactJSXElement.js:276-278` — element props/element freeze
- `ReactBaseClasses.js:13` — 빈 객체 freeze
- `ReactFiberLegacyContext.js:27` — 빈 컨텍스트 freeze

하지만 `ReactFiberFlags.js`에는 해당 없음 — 원래 코드로 막을 수 있는 종류의 문제가 아니다.

React는 같은 패턴을 다른 곳에서도 사용: `__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED` — 외부 개발자가 내부 API를 쓰지 말라는 경고를 이름 컨벤션으로만 지킴. React 19에서는 `_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE`로 이름 변경.

---

**Q: 2의 거듭제곱만 쓰면 각 flag가 정확히 하나의 비트만 차지하므로 조합해도 어떤 flag들이 켜져 있는지 100% 구분 가능합니다 << 이건 수학적 이해가 필요할거같은데 제가 배움이 짧아 잘 모릅니다. 좀더 알려주실수있나요?**

A: 스위치 패널로 생각하면 된다. 벽에 스위치 5개가 나란히 있고, 각 스위치는 ON(1) / OFF(0):

```
스위치:  [5번] [4번] [3번] [2번] [1번]
상태:      0     0     0     0     0     ← 전부 꺼짐
```

규칙: 각 flag는 스위치 하나만 담당:

```
Placement     = 스위치 2번만  →  0  0  0  1  0
Update        = 스위치 3번만  →  0  0  1  0  0
ChildDeletion = 스위치 5번만  →  1  0  0  0  0
```

조합(OR):

```
Placement =  0  0  0  1  0
Update    =  0  0  1  0  0
OR(|)     =  0  0  1  1  0   ← 2번, 3번 스위치 켜짐 — 어떤 flags인지 한눈에 알 수 있음
```

만약 스위치 하나를 두 flag가 공유하면:

```
FlagA = 0  1  1   ← 2번+3번 (= 6, 2의 거듭제곱이 아님)
FlagB = 0  1  0   ← 2번만 (= 2)

FlagA만 켰을 때:    0  1  1
둘 다 켰을 때(OR):  0  1  1   ← FlagA만 켠 것과 똑같음! 구분 불가
```

2의 거듭제곱(`1, 2, 4, 8, 16...`)은 2진수로 쓰면 항상 스위치 하나만 ON이므로 어떤 조합이든 구분 가능.

---

**Q: 0b0110 & 0b0100 = 0b0100 << 공통인 부분만 추출한다 라고 이해해도되나요?**

A: 정확하다. `&`(AND)는 양쪽 모두 1인 자리만 1로 남긴다:

```
  0  1  1  0     ← flags (Placement + Update)
& 0  1  0  0     ← Update 마스크
──────────────
  0  1  0  0     ← Update 자리만 살아남음 (≠ 0 → "Update 켜져있다!")
```

"공통인 부분만 추출한다"는 표현이 정확. 비트 AND를 "마스킹(masking)"이라고 부르는 이유가, 보고 싶은 비트만 남기고 나머지를 가리는(mask) 동작이기 때문.

---

**Q: Object.freeze나 타입 시스템으로 강제할 수도 있겠지만, React 팀은 주석 + 코드 리뷰로 충분하다고 판단한 것으로 보입니다. < 안한걸까요? 못한걸까요? 그냥 놓친걸까요? / 웹검색도 동원해서 찾아주세요**

A: "안 한 것"도 "못 한 것"도 "놓친 것"도 아니다. 원래 코드로 막을 수 있는 종류의 문제가 아니다.

"Don't change these values"가 말하는 "변경"은 두 가지:

|           | 런타임 변경            | 소스 코드 변경                 |
| --------- | ---------------------- | ------------------------------ |
| 의미      | 코드 실행 중 값을 바꿈 | 다음 버전에서 비트 위치를 바꿈 |
| 방어 수단 | `const` (이미 적용)    | 주석 + 코드 리뷰 (유일한 방법) |

`Object.freeze`는 객체 속성 변경 방지이지 원시값(숫자)에는 의미가 없다. 주석이 경고하는 "소스 코드 변경"은 어떤 JavaScript 메커니즘으로도 막을 수 없다.

소스에서 확인: React는 `Object.freeze`를 쓸 곳에는 적극 사용(ReactJSXElement, ReactBaseClasses, ReactFiberLegacyContext). ReactFiberFlags에 안 쓴 건 필요 없어서.

React 생태계 동일 패턴: `__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED` — 이름 컨벤션으로만 보호. React 19에서 `_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE`로 변경.

참고:

- https://github.com/reactjs/react.dev/issues/3896
- https://overreacted.io/how-does-the-development-mode-work/

---

**Q: 1000개를 전부 순회하며 "너 업데이트 필요해?"를 확인하면 낭비 -> 그래서 대안이 아래에서 버블업 후 최종비교 라는 말인거같은데요, 그러면 "낭비"가 방지되나요? 즉 최적화가 되나요? 근거가있는지도 궁금합니다**

A: 이전 설명의 프레이밍이 부정확했다. 정정:

subtreeFlags는 "성능 최적화를 위해 도입"이 아니라, 이전 방식(effect list)을 대체하면서 Suspense/Concurrent 기능을 가능하게 하려고 도입된 것.

|                  | 이전 방식 (React 16 — effect list)         | 현재 방식 (React 18+ — subtreeFlags) |
| ---------------- | ------------------------------------------ | ------------------------------------ |
| 구조             | 부작용 있는 Fiber만 연결 리스트로 연결     | 트리 순회 + subtreeFlags로 스킵      |
| Commit 방문 노드 | 딱 부작용 있는 노드만                      | 약간 더 많음 (트리 구조 따라감)      |
| Suspense 지원    | 평면 목록으로는 트리 구조 기반 결정 어려움 | 자연스럽게 지원                      |

subtreeFlags의 트리 스킵이 성능에 기여하는 것은 맞지만, 그것이 도입 동기는 아니다.

버블업 비용은 Render Phase에서 `completeWork` 시 이미 하고 있는 작업에 `|=` 한 줄 추가하는 수준(추가 비용 거의 0). 스킵 효과는 Commit Phase(동기 실행, 메인 스레드 블로킹)에서 발휘.

참고: PR #19322 (https://github.com/facebook/react/pull/19322)

---

**Q: 솔직히 개념2,3은 이해하기 어렵고 쉽사리 질문도 어렵습니다. 실생활 비유가 가능할까요?**

A: 두 가지 비유:

**subtreeFlags — 택배 분류 센터:**

이전 방식(effect list): 배송 필요한 3건만 "급송 목록"에 올림 → 기사가 딱 3곳만 방문 (매우 빠름). 문제: 서울 지역이 도로 공사 중(Suspense)이면 목록 관리가 복잡.

현재 방식(subtreeFlags): 전국→서울/부산/대전(허브)→강남/강북(지역)→각 가정. 각 허브에 "배송건 있음/없음" 표시판. 기사가 허브 표시판 확인 → "부산: 없음" → 부산 통째로 건너뜀. 도로 공사 중이면 서울 허브 표시판에 "보류"만 표시하면 자연스럽게 처리.

"표시판 붙이기"(버블업)는 택배 접수 시(Render Phase) 자동 처리 = 추가 비용 거의 0. "표시판 보고 건너뛰기"는 실제 배달(Commit Phase) 때 효과 발휘.

**Mode — 건물 구역 규칙:**

쇼핑몰 3층=도서관 구역("조용히" 모드 ON). 열람실, 회의실, 화장실 전부 자동으로 "조용히". 1층=게임 구역(OFF) → 오락실, VR룸 시끄러워도 OK.

Mode 핵심 3가지:

1. 위→아래 상속: 도서관(부모) → 열람실(자식) → 개인석(손자) 전부 "조용히"
2. 한 번 정해지면 불변: 영업 중에 도서관이 갑자기 클럽으로 안 바뀜
3. 여러 규칙 동시 적용: "조용히"(StrictMode) + "출입 기록"(ProfileMode) + "자유 이동"(ConcurrentMode)

Flags vs Mode 비유 비교:

|      | Flags                          | Mode                           |
| ---- | ------------------------------ | ------------------------------ |
| 비유 | 택배 표시판 "배송건 있음/없음" | 건물 구역 규칙 "도서관/게임존" |
| 방향 | 아래→위 (가정→허브→전국)       | 위→아래 (건물→층→방)           |
| 수명 | 매번 새로 (오늘 배송건 ≠ 내일) | 고정 (도서관은 계속 도서관)    |

### 연결 토픽

- Step 4 (미완료): Double Buffering — createWorkInProgress — current ↔ workInProgress 쌍, 노드 재사용/복제 전략
- Commit Phase 세부 흐름: BeforeMutation → Mutation → Layout → Passive 각 단계에서 마스크별 flags 처리
- effect list → subtreeFlags 전환: PR #19322, Suspense/Concurrent 지원 동기
- Lanes 시스템: Priority 카테고리의 lanes/childLanes도 비트마스크 — Flags와 유사한 원리이지만 "우선순위" 표현

---

## 2026-02-14 (재개 — Step 4부터)

### 학습 로드맵

- [x] Step 1: Fiber Node 구조 — FiberNode 생성자, 필드 5개 카테고리(Instance/Tree/Props/Effects/Priority)
- [x] Step 2: WorkTag 전체 목록과 type→tag 변환 — 31개 태그 상수, createFiberFromTypeAndProps 분기 로직
- [x] Step 3: Flags & Mode 비트마스크 — 부작용 플래그, 모드 플래그, Commit Phase 마스크
- [x] Step 4: Double Buffering — createWorkInProgress — current ↔ workInProgress 쌍, 노드 재사용/복제 전략

### 학습 요약

- Double Buffering: 화면에 보이는 트리(current)와 작업 중인 트리(workInProgress) 두 벌을 유지하여, Commit 시 `root.current = finishedWork` 포인터 한 줄로 트리를 교체
- `createWorkInProgress`의 두 경로: alternate가 없으면(최초) 새 Fiber 생성 + 쌍 연결, 있으면(리렌더) flags/subtreeFlags만 리셋하고 재사용 — "pooling" 전략으로 메모리 할당/GC 부담 감소
- `stateNode`는 current와 workInProgress가 공유 — 같은 DOM 노드를 가리킴
- alternate 생성은 lazy — 실제로 렌더 경로에서 방문된 노드만 alternate를 가짐. 한 번도 업데이트가 도달하지 않은 깊은 서브트리는 alternate가 없을 수 있음
- alternate 소멸은 언마운트 시(`detachFiberAfterEffects`) — 한 번 생기면 컴포넌트가 제거될 때까지 재사용
- `NoFlags`는 `number` 타입, 값은 `0`(2진수 31자리 전부 0) — "아무 부작용도 없다"
- `createFiber` 인자가 4개(tag, pendingProps, key, mode)인 이유: 모든 생성 경로의 공통분모만 인자로 받고, `elementType`/`type`/`stateNode`는 경로마다 다르게 설정

### 소스 코드 경로

- `ref/react-fork/packages/react-reconciler/src/ReactFiber.js:327-444` — createWorkInProgress (경로 A: 새 생성, 경로 B: 재사용, 공통: 필드 복사)
- `ref/react-fork/packages/react-reconciler/src/ReactFiber.js:330-334` — "lazily created" 주석 (alternate 생성 시점 근거)
- `ref/react-fork/packages/react-reconciler/src/ReactFiber.js:138-150` — FiberNode 생성자 시그니처 (4개 인자 + 3개 null 초기화)
- `ref/react-fork/packages/react-reconciler/src/ReactFiber.js:446-515` — resetWorkInProgress (second pass용 리셋)
- `ref/react-fork/packages/react-reconciler/src/ReactFiberWorkLoop.js:2229-2230` — prepareFreshStack에서 루트 alternate 생성
- `ref/react-fork/packages/react-reconciler/src/ReactFiberWorkLoop.js:4020-4024` — root.current = finishedWork (포인터 스왑, Mutation 후 Layout 전)
- `ref/react-fork/packages/react-reconciler/src/ReactFiberFlags.js:15,18` — NoFlags 타입(number)과 값(0b000...0)
- `ref/react-fork/packages/react-reconciler/src/ReactFiberBeginWork.js:3780-3801` — bailoutOnAlreadyFinishedWork (childLanes 체크 → cloneChildFibers 또는 null 리턴)
- `ref/react-fork/packages/react-reconciler/src/ReactChildFiber.js:2114-2139` — cloneChildFibers (직계 자식만 createWorkInProgress)
- `ref/react-fork/packages/react-reconciler/src/ReactFiberCommitWork.js:1310-1314` — detachFiberAfterEffects (언마운트 시 alternate = null, GC 대상)

### Q&A 전체 기록

#### Step 4: Double Buffering — createWorkInProgress

**Q: createFiber에 current.tag, pendingProps, current.key, current.mode는 인자로 넘기는데, 아래 3개는 왜 직접 할당하나요?**

A: `createFiber`(= `FiberNode` 생성자)의 시그니처(`ReactFiber.js:138-144`)를 보면, 인자로 받는 4개(`tag`, `pendingProps`, `key`, `mode`)는 **모든 Fiber 생성 경로에서 공통**이다. `createFiberFromTypeAndProps`, `createFiberFromElement`, `createFiberFromText`, `createWorkInProgress` — 어디서 만들든 이 4개는 항상 필요.

반면 `elementType`, `type`, `stateNode`는 **생성 경로마다 다르게 설정**된다:

| 생성 경로 | elementType | type | stateNode |
|-----------|------------|------|-----------|
| `createFiberFromTypeAndProps` | `element.type` | `resolvedType` (HMR/lazy 처리) | null (나중에 설정) |
| `createWorkInProgress` | `current.elementType` | `current.type` | `current.stateNode` (공유) |
| `createFiberFromText` | 설정 안 함 (null) | 설정 안 함 (null) | null |

만약 이것들까지 인자로 받으면 7개 인자가 되고, 호출하는 쪽마다 대부분 `null, null, null`을 넘기게 됨. 생성자는 "모든 경로의 공통분모"만 받고, 나머지는 각 경로에서 필요한 것만 설정하는 것이 더 깔끔.

---

**Q: NoFlags << 는 무슨 타입? 무슨 값인가요?**

A: `ReactFiberFlags.js:15, 18`:

```javascript
export type Flags = number;
export const NoFlags = /*  */ 0b0000000000000000000000000000000;
```

- 타입: `number` (Flow 타입 별칭 `Flags`로 선언, 실체는 그냥 숫자)
- 값: `0` (2진수 31자리가 전부 0)

의미: "아무 부작용도 없다" — Step 3의 스위치 패널 비유에서 모든 스위치가 꺼진 상태. `createWorkInProgress` 경로 B에서 `workInProgress.flags = NoFlags`는 이전 렌더의 부작용 표시를 전부 지우고, 바로 다음 공통 경로에서 `workInProgress.flags = current.flags & StaticMask`로 Static flags만 복원.

---

**Q: 화이트보드가 첫렌더 이후는 무조건 2개라 확정적으로 봐도되나요?**

A: 아니다. 2개가 보장되는 것은 **실제로 방문(work)된 노드만**. `createWorkInProgress`는 lazy하게 alternate를 만든다 — 소스 주석(`ReactFiber.js:330-334`)이 직접 말함:

> "This is **lazily created** to avoid allocating extra objects for things that are **never updated**."

`bailoutOnAlreadyFinishedWork`(`ReactFiberBeginWork.js:3780`)에서 `childLanes === NoLanes`이면 `return null`로 서브트리 전체를 스킵 — 그 아래 노드는 `createWorkInProgress`가 호출되지 않으므로 alternate가 생기지 않음.

`cloneChildFibers`(`ReactChildFiber.js:2114-2139`)는 **직계 자식만** clone하므로, bailout된 노드의 자식까지는 생기지만 그 아래 손자는 안 생김.

| 상황 | alternate 존재 |
|------|---------------|
| 한 번이라도 렌더 경로에서 방문된 노드 | 있음 |
| 한 번도 업데이트 필요 없었던 깊은 서브트리 | 없을 수 있음 |
| 루트 Fiber | 항상 있음 (매 렌더 시작점) |

화이트보드 비유 수정: 2개가 항상 전체에 있는 게 아니라, "수정이 필요했던 부분"에만 2번째 보드가 생기고, 한 번도 안 바뀐 구석은 1번째 보드만 있는 상태.

---

**Q: 한 번도 업데이트 필요 없었던 깊은 서브트리 < 여기서 "한번도"가 어느 타임라인 기준에서의 한번인가요? 앱이 종료되기전까지?**

A: **"Fiber가 마운트된 시점 ~ 현재 시점"**이 기준. 앱 종료까지가 아니라, 동적이다.

타임라인 예시:

```
[초기 마운트]
  모든 Fiber가 createFiberFromElement 등으로 "새로" 생성
  → alternate = null (전부)
  → 예외: 루트 HostRoot만 prepareFreshStack에서 alternate 생성

[1번째 리렌더 — Sidebar에서 setState]
  App: bailout → cloneChildFibers → Sidebar, Content에 alternate 생성
  Content: childLanes === NoLanes → return null (완전 스킵)
  Content의 자식 Header, Logo: 방문 안 됨 → alternate 없음

[2번째 리렌더 — 또 Sidebar에서 setState]
  같은 경로 → Header, Logo 여전히 alternate 없음

[3번째 리렌더 — 이번엔 Content에서 setState 발생!]
  Content: beginWork 진입 → 자식 처리
  Header: 이때 처음으로 createWorkInProgress → alternate 생성! ✅
```

오늘 alternate가 없는 노드도, 내일 업데이트가 도달하면 그때 생긴다. "한 번도"는 "지금까지 한 번도"이지, "영원히"가 아님.

alternate 소멸은 언마운트 시에만 — `detachFiberAfterEffects`(`ReactFiberCommitWork.js:1310-1314`):

```javascript
function detachFiberAfterEffects(fiber: Fiber) {
  const alternate = fiber.alternate;
  if (alternate !== null) {
    fiber.alternate = null;          // 연결 끊기
    detachFiberAfterEffects(alternate); // 상대쪽도 정리
  }
  fiber.child = null;
  fiber.deletions = null;
  // ... 모든 참조 제거 → GC 대상
}
```

소스 주석의 "reclaim the extra memory if needed"(`ReactFiber.js:333-334`)는 이 언마운트 시 GC를 가리킴.

| 질문 | 답 |
|------|-----|
| alternate 생성 시점 | 해당 노드가 렌더 경로에서 처음 방문될 때 (lazy) |
| alternate 소멸 시점 | 컴포넌트가 언마운트될 때 |
| 그 사이 | 한 번 생기면 계속 재사용 (쌍이 번갈아감) |

### 연결 토픽

- Work Loop (beginWork/completeWork): createWorkInProgress로 만든 workInProgress를 실제 순회하는 루프 — child/sibling/return 구조를 따라감
- Reconciliation (diffing): reconcileChildFibers에서 자식 Fiber를 재사용/생성/삭제하는 알고리즘 — createWorkInProgress 호출 지점
- Commit Phase: root.current = finishedWork 스왑 타이밍과 BeforeMutation/Mutation/Layout/Passive 단계 흐름
- Lanes 시스템: childLanes가 0이면 서브트리 스킵 — alternate lazy 생성의 전제 조건
- Bailout 메커니즘: bailoutOnAlreadyFinishedWork와 cloneChildFibers의 관계 — 어디까지 alternate가 전파되는가

---

## 부록: Work-Loop에서 이관된 Fiber 개념 Q&A

### 이관 메모
- 원문 출처: `docs/react/Work-Loop.md` Step 3 후반부
- 이관 사유: Fiber 개념/범위 설명은 Topic 3(Fiber Structure)와 직접 중첩

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
