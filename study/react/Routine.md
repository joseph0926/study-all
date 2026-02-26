

---

## 2026-02-26 (via /learn)

## 2026-02-26 세션 #1 — React 불변성 강제 여부 (Phase 2에서 중단)

### Phase 1 (Q&A 5회)
- React는 state에 Object.freeze 적용 안 함. Object.is 참조 비교만 수행 (규약 기반)
- React Compiler가 빌드타임(정적분석) + DEV런타임(Proxy, make-read-only-util)으로 mutation 감지/차단
- Immer는 규약을 "부정"이 아니라 "보완". COW + structural sharing으로 새 참조 반환
- Proxy의 get/set trap으로 변경 경로만 lazy하게 shallow copy
- opt-in이라 단순 업데이트에는 오버헤드 없음

### Phase 2 (Q&A 2회)
- useState는 useReducer의 특수 케이스 (basicStateReducer)
- 두 겹 bailout: 1차 eager(스케줄링 전), 2차 render-phase(렌더 중)
- eager bailout해도 큐에 update 보존 — reducer 의존 값 변경 시 rebase 필요

### 미완 seed
- mutation된 객체가 eager bailout 후 rebase될 때 eagerState vs reducer 재계산 불일치 문제
