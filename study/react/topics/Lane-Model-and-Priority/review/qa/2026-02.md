# Lane-Model-and-Priority Review QnA

---

## 2026-02-24 (via /review)

### Lane 비트마스크 구조 (getHighestPriorityLane, lanes & -lanes) [retry_pass → L1]
**Q**: getHighestPriorityLane(lanes)이 lanes & -lanes 한 줄로 최고 우선순위를 반환할 수 있는 이유는?
**A**: 최하위 비트만 남기는 이유는 우선순위 가장 높은것을 남기기 위함. 2의 보수 보충 설명 후 이해 완료: 캐리가 멈추는 지점 = ~lanes에서 처음 0을 만나는 곳 = 원래 lanes에서 처음 1인 곳 = 최하위 set bit
**Score**: retry_pass

### Lane vs ExpirationTime 설계 동기 [first_pass → L2]
**Q**: ExpirationTime 대신 Lane 비트마스크를 채택한 핵심 이유?
**A**: 32비트라는 한 축에서 모든 걸 표현 가능하지만 각 비트는 독립적이므로, 동일한 기준에서 세밀한 조절이 가능
**Score**: first_pass

### 같은 Lane vs 다른 Lane의 Suspense 동작 차이 [retry_pass → L3]
**Q**: 같은 TransitionLane vs 다른 TransitionLane에서 Suspense 동작 차이?
**A**: 같은 업데이트 배치에 넣는 경우 Suspense가 낮으므로 우선순위 높은 작업을 대기 후 완료되면 진행됨. 다른 배치일 경우 각각 진행됨. (보정: 우선순위 문제가 아니라 같은 Lane = 같은 운명)
**Score**: retry_pass
