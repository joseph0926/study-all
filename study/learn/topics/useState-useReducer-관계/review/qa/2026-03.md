# useState-useReducer-관계 Review QnA

---

## 2026-03-03 (via /review)

### useState-useReducer-특화패턴 [retry_pass → L1]
**Q**: useState(initialState)는 내부적으로 어떤 함수에 위임하며, 이때 고정되는 인자는 무엇인가요?
**A**: useReducer에 위임, basicStateReducer가 고정 (힌트 후)
**Score**: retry_pass

### useCallback-useMemo-특화패턴 [first_pass → L1]
**Q**: useCallback(fn, deps)는 useMemo로 동치 표현할 수 있습니다. 어떻게 쓰면 동일한가요? 그리고 둘의 내부 동작 차이(mount 시)를 한 문장으로 설명해주세요.
**A**: useMemo(() => fn, deps) / useMemo는 함수를 실행한 값을 저장, useCallback은 함수 참조를 저장
**Score**: first_pass

### basicStateReducer-동작 [first_pass → L1]
**Q**: basicStateReducer의 구현을 코드로 작성해주세요.
**A**: function basicStateReducer(state, action) { return typeof action === 'function' ? action(state) : action; }
**Score**: first_pass

### 참조-vs-값 [first_pass → L1]
**Q**: fn1 = () => 'hello'; fn2 = () => 'hello'; fn3 = fn1; fn1===fn2? fn1===fn3?
**A**: fn1===fn2: false (참조 다름), fn1===fn3: true (참조 같음)
**Score**: first_pass

### useReducer-dispatch-흐름 [first_pass → L1]
**Q**: useReducer의 실행 흐름을 컴포넌트 → 최종 리렌더까지 순서대로 나열해주세요.
**A**: 컴포넌트에서 action을 dispatch → reducer 실행 → 큐 비었으면 Object.is 비교(1차) → 같으면 bailout, 다르면 리렌더 → 렌더 단계에서 Object.is(2차)
**Score**: first_pass

### 불변성-변화감지 [first_pass → L1]
**Q**: React가 state를 직접 수정(mutation)하면 변화를 감지하지 못하는 이유를 Object.is 관점에서 설명해주세요.
**A**: 참조타입 직접 수정 → Object.is(state, state) → true → 리렌더 안 함
**Score**: first_pass

### Object.is-2단계방어막 [first_pass → L1]
**Q**: dispatch 후 Object.is 비교가 발생하는 두 시점과 각각의 조건을 설명해주세요. 1차에서 bail out되면 2차는 실행되나요?
**A**: 1차: 큐 비었을 때 eager bailout, 2차: 렌더 단계 무조건 비교. 1차 bailout시 2차 스킵
**Score**: first_pass

### Object.is-vs-얕은비교 [first_pass → L1]
**Q**: Object.is와 얕은 비교(shallowEqual)의 차이를 시간복잡도와 사용처로 구분해주세요.
**A**: Object.is: O(1) 참조비교, 얕은비교: O(n) 1단계 프로퍼티 비교
**Score**: first_pass
