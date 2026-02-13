# Fiber Node & Tags

> `/learn react` 세션 기록. 소스 코드 기반 Q&A 히스토리.

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

| 필드 | 비유 | 실제 |
|------|------|------|
| `tag` | 배송 유형 (일반/냉동/편의점) — 처리 방식이 완전히 다름 | `beginWork`에서 tag별로 switch 분기 |
| `key` | 송장번호 — 같은 받는사람이 여러 개 시켜도 구분 | 리스트 diffing 시 항목 식별 |
| `elementType` | 주문서에 적힌 상품명 원본 | `React.memo(MyComp)`면 memo 객체 전체 |
| `type` | 실제 출고된 상품 (보통 주문서와 같지만 교체될 수 있음) | 래핑 해제된 함수, HMR 시 교체된 함수 |
| `stateNode` | 배송 완료된 실물 | DOM Element, 클래스 인스턴스, FiberRoot |

`elementType`과 `type`의 차이는 `ReactFiber.js:721-723`에서 확인:
```js
fiber.elementType = type;     // element.type 원본 그대로
fiber.type = resolvedType;    // resolve된 결과 (lazy면 null, HMR이면 교체된 함수)
```
대부분의 경우 둘은 같지만, Lazy/Memo/ForwardRef/HMR 상황에서 달라진다.

---

**Q: "children 배열이 아니라 단일 연결 리스트입니다.": 그러면 index 필드는 직접 지정하는 겁니까? 아니면 단일 연결 리스트에도 index 개념이 있나요?**

A: `index`는 linked list 자체의 속성이 아니라, reconciliation 시 부모가 직접 할당한다. `ReactChildFiber.js:511-516`의 `placeChild` 함수:

```js
function placeChild(newFiber, lastPlacedIndex, newIndex) {
  newFiber.index = newIndex;  // 부모가 자식 배열 순회하면서 직접 번호 부여
  const current = newFiber.alternate;
  if (current !== null) {
    const oldIndex = current.index;
    if (oldIndex < lastPlacedIndex) {
      newFiber.flags |= Placement;  // 이동 필요
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
