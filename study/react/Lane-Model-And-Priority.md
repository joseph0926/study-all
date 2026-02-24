

---

## 2026-02-24 (via /learn)

## 세션 1 — Lane 비트마스크 구조와 31개 Lane 상수 정의

### 학습 범위
- 서브토픽 1: Lane 비트마스크 구조와 31개 Lane 상수 정의

### 핵심 내용

1. **Lane/Lanes 타입**: 둘 다 `number`. Lane은 비트 하나만 켜진 정수(2의 거듭제곱), Lanes는 여러 비트가 켜진 합집합.
   - `ReactFiberLane.js:17-19`

2. **31비트 사용 이유**: JS 비트 연산이 signed 32-bit integer 기반 → bit 31은 부호 비트 → 실제 사용 가능 31개.
   - `ReactFiberLane.js:41` — `TotalLanes = 31`

3. **LSB = 최고 우선순위**: bit 0(SyncHydrationLane)이 가장 높고, bit 30(DeferredLane)이 가장 낮음.

4. **`getHighestPriorityLane(lanes)` = `lanes & -lanes`**:
   - `-lanes = ~lanes + 1` (2의 보수)
   - `+1` 캐리가 전파되다가 멈추는 지점 = `~lanes`에서 처음 0을 만나는 곳 = 원래 lanes에서 최하위 set bit
   - 그 지점에서만 lanes와 -lanes 모두 1 → AND 결과 그 비트만 남음
   - `ReactFiberLane.js:756-757`

5. **비트마스크 채택 이유 (vs ExpirationTime)**:
   - 집합 연산 O(1): `mergeLanes`(OR), `includesSomeLane`(AND), `isSubsetOfLanes`
   - 독립적 배칭: 같은 우선순위라도 다른 Lane에 배치하면 독립 처리/중단/재개 가능
   - Suspense에서 핵심: 같은 Lane = 같은 운명(하나 suspend → 전체 대기), 다른 Lane = 독립 커밋

### Q&A

**Q1 (L1)**: `getHighestPriorityLane`이 `lanes & -lanes` 한 줄로 최고 우선순위를 반환할 수 있는 이유?
**A1**: `-lanes = ~lanes + 1`에서 캐리가 최하위 set bit에서 멈추고, 그 지점만 lanes와 -lanes 모두 1이므로 AND하면 최하위 비트(=최고 우선순위)만 남는다. LSB가 최고 우선순위인 설계 규칙과 결합.
**Score**: retry_pass (2의 보수 동작 이해 후 정답)

**Q2 (L2)**: ExpirationTime 대신 Lane 비트마스크를 채택한 핵심 이유?
**A2**: 32비트라는 한 축에서 모든 걸 표현 가능하지만 각 비트는 독립적이므로, 동일한 기준에서 세밀한 조절이 가능.
**Score**: first_pass

**Q3 (L3)**: 같은 TransitionLane vs 다른 TransitionLane에서 Suspense 동작 차이?
**A3**: 같은 Lane이면 하나가 suspend되면 전체 대기, 다른 Lane이면 독립 커밋. (초기 답변에서 우선순위 높낮이로 설명한 부분 보정 후 이해)
**Score**: retry_pass
