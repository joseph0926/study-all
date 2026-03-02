# useRef-렌더링-참조규칙 Review QnA

---

## 2026-03-02 (via /review)

### 트리거-일관성 이중 차원 [first_pass → L1]
**Q**: React 문서의 두 문장 — '렌더링에 필요하지 않은 값을 참조' vs '렌더링 중 ref.current를 읽지 마라' — 이 모순이 아닌 이유는?
**A**: 첫번째는 트리거 차원(scheduleUpdateOnFiber 경로 없음), 두번째는 일관성 차원(Concurrent Mode에서 렌더 폐기 시 ref 값 오염, tearing 가능)
**Score**: first_pass

### mountRef 구조 [first_pass → L1]
**Q**: mountRef와 mountState 비교 시 useRef가 리렌더링을 트리거할 수 없는 코드 레벨 이유는?
**A**: queue도 없고, dispatch도 없고, scheduleUpdateOnFiber를 호출할 경로 자체가 없음
**Score**: first_pass

### 초기화 멱등성 [first_pass → L1]
**Q**: if (ref.current === null) 초기화 패턴이 렌더 중에도 안전한 이유는?
**A**: 멱등성 — 초기화는 null→값 단방향 전이만 존재하므로 Concurrent Mode에서도 ref.current를 바꿀 수 없음
**Score**: first_pass

### Concurrent tearing [first_pass → L1]
**Q**: 렌더 중 ref.current를 읽을 때 발생하는 3가지 심각도 층위는?
**A**: 1. 값 안바뀜(의도된 동작), 2. 우연한 반영(다른 state 변경에 의존), 3. tearing(같은 ref를 바라보는 컴포넌트들이 다른 값 렌더링)
**Score**: first_pass

### React contract [first_pass → L1]
**Q**: 'ref 렌더 관여 금지'와 'state 불변' 두 규칙의 공통점은?
**A**: 둘 다 코드적 가드가 없음 — JS/런타임 강제 없이 DEV 경고와 문서로만 안내되는 개발자 규약
**Score**: first_pass
