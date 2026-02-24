# React Deep-Dive Plan

> 소스코드 기반 딥 학습 로드맵. 진실 원천: `ref/react-fork/`

## Legacy (이전 학습)

- [x] React-Core-API — `react/` API surface, Hooks 선언부, memo/forwardRef/lazy, Children
- [x] Shared — `shared/` ReactSymbols, ReactTypes, 비교 알고리즘, FeatureFlags
- [x] Fiber-Structure — `react-reconciler/` FiberNode 구조, WorkTag, Flags, Double Buffering
- [x] Work-Loop — `react-reconciler/` FiberRoot, scheduleUpdateOnFiber, Render/Commit 흐름

## 신규 토픽

- [ ] Topic 1: Hooks Dispatcher 내부 구현
  - 소스: `react-reconciler/src/ReactFiberHooks.js`
  - mount/update dispatcher 분리, useState 큐 기반 업데이트(updateReducer), useEffect pushEffect 체인
- [ ] Topic 2: Reconciliation — beginWork 분기 로직
  - 소스: `react-reconciler/src/ReactFiberBeginWork.js`, `ReactChildFiber.js`
  - WorkTag별 분기, reconcileChildren(diff), key/index 매칭, bailout 최적화
- [ ] Topic 3: Commit Phase 3단계
  - 소스: `react-reconciler/src/ReactFiberCommitWork.js`
  - beforeMutation → mutation → layout, DOM 조작 타이밍, passive effect 스케줄링
- [ ] Topic 4: Scheduler — 우선순위와 시간 분할
  - 소스: `scheduler/src/forks/Scheduler.js`
  - TaskQueue(min-heap), 5단계 Priority, shouldYieldToHost, MessageChannel 시간 분할
- [ ] Topic 5: Lanes 모델 — 우선순위 비트마스크
  - 소스: `react-reconciler/src/ReactFiberLane.js`
  - 31비트 Lane 설계, mergeLanes/pickArbitraryLane, Transition Lane 배치, Starvation 방지
- [ ] Topic 6: Suspense와 Offscreen 트리
  - 소스: `react-reconciler/src/ReactFiberSuspenseComponent.js`, `ReactFiberThenable.js`
  - Promise throw → catch, fallback/primary 전환, use() Hook 연결
- [ ] Topic 7: react-dom-bindings — 이벤트 시스템
  - 소스: `react-dom-bindings/src/events/`
  - SyntheticEvent, 이벤트 위임(root listener), 이벤트 우선순위 매핑
