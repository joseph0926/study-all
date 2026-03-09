# useReducer-실무-패턴 Review QnA

---

## 2026-03-03 (via /review)

### useState는 useReducer의 특수 케이스 [first_pass → L1]
**Q**: React 소스코드에서 updateState 함수는 내부적으로 어떤 함수를 호출하며, 이때 사용되는 고정 reducer의 이름과 동작은?
**A**: updateReducer, basicStateReducer
**Score**: first_pass

### eager bailout 최적화 차이 [first_pass → L1]
**Q**: useState의 dispatch에는 eager bailout이 있고 useReducer에는 없는 근본적인 이유는?
**A**: reducer 함수는 사용자가 정의함, 함수 참조가 안정적이라고 단언 불가능 -> eager bailout 불가능
**Score**: first_pass

### useEffect 내 setState 판별 플로우 [retry_pass → L1]
**Q**: useEffect 안에서 setState를 하는 코드의 개선 판별 순서 4단계는?
**A**: 1. 파생값→변수/useMemo 2. 의존성 3. 사이드이펙트→useEffect유지 4. useReducer 고려 (이벤트 핸들러에서 함께 처리 단계 누락)
**Score**: retry_pass

### reducer 순수성 원칙 [first_pass → L1]
**Q**: state를 직접 변경하고 return state하는 reducer의 문제점과 React가 변경을 감지하지 못하는 이유는?
**A**: state를 직접 변경 -> 불변성 위반 -> 새 객체를 반환해야 함
**Score**: first_pass

### useReducer 실무 위치 [retry_pass → L1]
**Q**: useReducer를 써야 하는 좁은 케이스를 한 문장으로 정의하고 판별 신호 하나를 말하세요
**A**: 컴포넌트 로컬 + 상태 전이 규칙이 비즈니스 로직 (판별 신호: 불가능한 상태 조합 존재 — 누락)
**Score**: retry_pass
