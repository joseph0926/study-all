# React-context-전달과-상태경계 Review QnA

---

## 2026-03-08 (via /review)

### Context-vs-상태관리-경계 [first_pass → L1]
**Q**: `Context`를 "상태 관리" 자체가 아니라 "값 전달 메커니즘"으로 봐야 하는 이유를 설명해보세요. 답변에는 1) 누가 값을 소유하고 업데이트하는지 2) `Context`가 실제로 맡는 역할이 무엇인지 포함하세요.
**A**: 리액트에서 값을 소유하고 업데이트하는 주체는 state, ref등입니다. cotext는 값을 전달하는 역할만 수행합니다. 다만 흔히 전역 상태 관리자라고 오해하기 쉬운 이유는 Context Provider를 전역에 감싼 후 안에 컴포넌트에서 useContext(context)로 상태를 꺼낼수있기때문입니다. 이는 Context 범위내에서 값을 전달한거지, 값을 전역 등록 후 사용하는게 아닙니다
**Score**: first_pass

### Provider-배치와-전역성 [first_pass → L1]
**Q**: 왜 `Provider`를 앱 루트에 두면 `Context`가 전역 상태처럼 보이지만, 실제 규칙은 여전히 "가장 가까운 위쪽 Provider" 기준이라고 말할 수 있나요? 답변에는 1) 전역처럼 보이게 만드는 배치 이유 2) 실제 lookup 규칙이 왜 전역 등록 모델과 다른지 포함하세요.
**A**: 전역처럼 보이는 이유는 전역에 Provider를 하나만 두면 모든 하위 컴포넌트가 해당 Provider를 보기때문입니다. 하지만 context의 규칙은 가장 가까이(위에)에 있는 Provider를 소비합니다. 따라서 전역에 <AProvider>로 감싸도 B 컴포넌트 바로 위에 <BProvider>로 감싸져있으면 BProvider를 소비합니다
**Score**: first_pass

### 값-vs-상태-표현 [retry_pass → L1]
**Q**: 왜 `Context`를 `상태 전달자`보다 `값 전달자`라고 부르는 편이 더 정확한가요? 답변에는 1) `Context`가 전달할 수 있는 값의 범위 2) 왜 `state`라는 표현은 책임을 과하게 암시하는지 포함하세요.
**A**: useState, useReducer 값을 소유하고 이들의 메커니즘으로 값을 업데이트 시킵니다. 또한 값이 변경되면 해당 값을 구독하는 컴포넌트 모두가 리렌더링됩니다
**Hint**: 누가 값을 소유하나요? 누가 값을 바꾸나요? 값이 바뀌면 어디까지 다시 렌더되나요?
**Score**: retry_pass

### state-ref-store와-Context-역할분담 [first_pass → L1]
**Q**: 실시간 대시보드 같은 화면에서 `state`, `ref`, `Context`, 외부 `store`를 각각 언제 쓰는지 역할을 나눠 설명해보세요. 답변에는 1) `state`가 맡는 것 2) `ref`가 맡는 것 3) `Context`가 맡는 것 4) 외부 `store`가 맡는 것을 포함하세요.
**A**: state: 로컬 UI 상태
ref: 렌더와 무관한 변경 가능한 값
context: 값 전달자
외부 store: 자주 바뀌는 실시간 값
**Score**: first_pass

### ref-전달-비반응성-주의점 [first_pass → L1]
**Q**: 왜 `ref`를 `Context`로 전달할 수는 있어도, 그것을 "실시간 반응형 데이터 공유" 설명으로 쓰면 부정확할 수 있나요? 답변에는 1) `ref.current`가 바뀔 때 렌더 관점에서 어떤 일이 일어나는지 2) 그래서 `ref`를 `Context`로 전달할 때 더 적절한 사례가 무엇인지 포함하세요.
**A**: ref.current의 값 변화는 리액트가 알수없습니다. 즉 실시간으로 ref.current의 값이 변경되어도 리액트가 렌더링하는 값은 리렌더링 전까지 동일합니다. 따라서 해당 예시에서 ref는 유효하지 않습니다
ref는 렌더에 관여하지 않는 값이지만 저장해야하는 값을 보통 저장하는데 사용합니다. 예를들어 특정 객체의 참조라던지..
**Score**: first_pass
