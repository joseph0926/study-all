# React Internals 학습 로드맵

> 전제 지식: legacy/Fiber-Structure (FiberNode 구조), legacy/Work-Loop (FiberRoot, executionContext)

## Topics

### 1. Lane Model & Priority
- [x] Lane 비트마스크 구조와 31개 Lane 상수 정의
- [ ] markRootUpdated / markStarvedLanesAsExpired — 업데이트 등록과 기아 방지
- [ ] getNextLanes / getHighestPriorityLane — 다음 작업 선택 알고리즘
- [ ] entangleLanes / entangleTransitions — Lane 얽힘과 Transition 배칭
- [ ] mergeLanes / intersectLanes / isSubsetOfLanes — 비트 연산 유틸과 사용처

### 2. Hooks Dispatcher & Update Queue
- [ ] Dispatcher 패턴 — mount/update/rerender 3벌 분리 이유
- [ ] Hook 링크드 리스트 — mountWorkInProgressHook / updateWorkInProgressHook
- [ ] useState/useReducer 통합 — dispatchSetState와 원형 업데이트 큐
- [ ] useEffect/useLayoutEffect — pushEffect와 effect 태그 비트마스크
- [ ] useMemo/useCallback — areHookInputsEqual과 deps 비교 전략

### 3. Child Reconciliation (Diffing)
- [ ] reconcileChildFibers 진입점 — ChildReconciler 클로저와 shouldTrackSideEffects
- [ ] 단일 자식(reconcileSingleElement) — key/type 일치 판정과 기존 fiber 재사용
- [ ] 다중 자식(reconcileChildrenArray) — 2-pass 알고리즘 (선형 스캔 + Map 폴백)
- [ ] key의 역할 — mapRemainingChildren과 O(n) 보장 메커니즘
- [ ] 삭제 마킹 — deleteChild / deleteRemainingChildren과 Deletion 플래그

### 4. BeginWork & Bailout
- [ ] beginWork 분기 구조 — WorkTag별 switch와 updateFunctionComponent 경로
- [ ] bailout 조건 — oldProps === newProps / hasScheduledUpdateOrContext / includesSomeLane
- [ ] attemptEarlyBailoutIfNoScheduledUpdate — 서브트리 스킵 최적화
- [ ] renderWithHooks — 함수 컴포넌트 호출과 Dispatcher 교체 타이밍
- [ ] reconcileChildren 호출 — beginWork에서 child reconciliation 연결

### 5. Commit Phase (3 Sub-phases)
- [ ] commitRoot 진입 — finishedWork 수확과 우선순위 컨텍스트 설정
- [ ] beforeMutation — getSnapshotBeforeUpdate 호출, 스크롤 위치 저장
- [ ] mutation — commitMutationEffects, DOM 삽입/갱신/삭제 실행
- [ ] layout — commitLayoutEffects, useLayoutEffect/componentDidMount 실행
- [ ] passive effects — flushPassiveEffects, useEffect의 비동기 스케줄링 이유

### 6. Suspense & Thenable Capture
- [ ] SuspenseException 메커니즘 — throwException에서 thenable 감지
- [ ] trackUsedThenable — use() 훅과 thenable 상태 머신 (pending/fulfilled/rejected)
- [ ] SuspenseBoundary 찾기 — 가장 가까운 Suspense fiber로의 unwind
- [ ] fallback 렌더링 — primaryChild 숨기기와 fallbackChild 표시 전환
- [ ] ping & retry — thenable resolve 시 재렌더링 트리거 경로

### 7. Context Propagation
- [ ] createContext 내부 — _currentValue 필드와 Provider/Consumer fiber
- [ ] pushProvider / popProvider — 스택 기반 값 관리와 트리 순회 연동
- [ ] propagateContextChange — 깊이 우선 탐색으로 소비자 찾기
- [ ] readContext / useContext — 의존성 등록과 변경 감지
- [ ] 최적화 — eager bailout과 context 변경 시 bailout 무효화

