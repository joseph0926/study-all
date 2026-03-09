# React-리렌더링-트리거 Review QnA

---

## 2026-02-25 (via /review)

### scheduleUpdateOnFiber 호출 경로 [retry_pass → L1]
**Q**: scheduleUpdateOnFiber를 호출하는 경로를 4가지 이상 나열하세요
**A**: setState(useState/useReducer/class), useSyncExternalStore, forceUpdate, Context(오답)
**Hint**: Context는 scheduleUpdateOnFiber를 호출하지 않고 consumer.lanes에 직접 마킹. root.render() 누락
**Score**: retry_pass

### 2계층 모델 [retry_pass → L1]
**Q**: 2계층 모델에서 참/거짓 레벨과 scheduleUpdateOnFiber 없이 리렌더링되는 경우 2가지를 코드 근거와 함께 설명
**A**: 시스템 레벨 참/fiber 레벨 거짓 정확. 부모→자식 props 전파 1가지만 답변
**Hint**: Context 전파(ReactFiberNewContext.js:245 consumer.lanes 직접 마킹) 누락, 코드 근거 미제시
**Score**: retry_pass

### 컴포넌트 함수 호출 보장 [retry_pass → L1]
**Q**: scheduleUpdateOnFiber 호출 시 해당 fiber 컴포넌트 함수가 무조건 호출되는가?
**A**: 거짓. scheduleUpdateOnFiber의 호출 단위는 fiber가 아니므로 해당 fiber라는 말이 오류
**Hint**: 실제 반례는 batching 중 언마운트. scheduleUpdateOnFiber(root, fiber, lane)으로 특정 fiber를 인자로 받음
**Score**: retry_pass

### 렌더 vs 커밋 용어 구분 [first_pass → L1]
**Q**: 컴포넌트 함수가 호출됐지만 리렌더링은 아니다 — 이 문장이 모순인 이유와 정확한 표현
**A**: 함수 호출 자체가 렌더링. 원래 의도: 렌더 단계까지만 보장, 커밋 단계 미보장
**Score**: first_pass
