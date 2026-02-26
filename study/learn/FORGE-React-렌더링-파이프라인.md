# FORGE: React 렌더링 파이프라인

> 생성일: 2026-02-26
> 기반 토픽: React-리렌더링-트리거, scheduleUpdateOnFiber, JSX-객체-반환-원리, React-데이터-페칭-불관여, React-리렌더링-비용과-메모이제이션
> 범위: 전체

---

## 통합 비유: React City — 도시 행정 시스템

React는 도시(앱)의 건축 행정 시스템이다. 시청은 건물을 직접 짓지 않고, 도면을 관리하고 감독관을 파견하여 변경 사항을 반영한다.

| 비유 요소 | 실제 개념 | 대응 이유 |
|-----------|-----------|-----------|
| 건축 도면 (plain paper) | ReactElement (JSX → plain object) | 건물 자체가 아닌 건물의 서술. 어떤 시공사(렌더러)에게든 전달 가능 |
| 시청 민원 접수대 | `scheduleUpdateOnFiber` | 모든 변경 요청의 유일한 입구. 접수(예약)만 하고 즉시 공사하지 않음 |
| 다음 아침 일괄 처리 | 자동 배칭 (microtask) | 같은 날 접수된 민원은 다음 아침에 한 건으로 통합 처리 |
| 건축 감독관의 현장 순회 | work loop + beginWork | 위에서 아래로 각 건물(fiber)을 돌며 도면(props) 비교 |
| 도면 일련번호 비교 | `oldProps !== newProps` (참조 비교) | 내용이 같아도 새 도면(새 참조)이면 재검사 대상 |
| "내용 동일" 포스트잇 | React.memo (shallowEqual) | 일련번호 대신 항목별 비교. 내용이 같으면 재검사 건너뜀 |
| 상위 관리자 → 하위 사물함 배달 | props 전파 (`createWorkInProgress`) | 부모가 능동적으로 자식에게 새 도면을 넣어줌. 자식이 감지하는 게 아님 |
| 건축 자재 공급업체 | 데이터 페칭 레이어 (React Query 등) | 시청은 허가/감독만 담당. 자재 조달(fetch)은 외부 업체의 몫 |
| 납품서 확인 창구 | `use()` (Thenable 프로토콜) | 시청은 납품서(Promise)의 상태만 확인. 자재를 직접 주문하지 않음 |
| 자동 도면 관리 서랍장 | React Compiler (useMemoCache) | 변경 없는 도면을 번호표 서랍에 보관. 번호($[i])로 직접 접근 |
| 도시의 2층 행정 구조 | 2계층 모델 | 시청이 순회를 시작(레벨1)하지만, 각 건물의 리모델링 여부는 감독관이 현장에서 판단(레벨2) |

비유 한계:
- Suspense의 "무한 대기 시 CPU 비용 0"은 건축 비유로 직관적이지 않다. 감독관이 퇴근하고 전화(ping)가 올 때까지 아무것도 안 하는 것에 가깝다.
- RSC `cache()`의 "서버 request-scoped 캐싱"은 "임시 현장 사무소의 도면 캐시"로 매핑 가능하나, 서버/클라이언트 경계의 미묘함을 충분히 표현하지 못한다.
- Lane 시스템(우선순위 비트마스크)은 "민원 등급"으로 매핑 가능하지만, 비트 연산의 정밀함은 행정 비유로 한계가 있다.

---

## 핵심 원칙

### 1. 서술-실행 분리 (Description ≠ Execution)
> React의 모든 계층에서 "무엇을"과 "어떻게"는 분리되어 있다.

**근거**: JSX는 DOM을 직접 만들지 않고 plain object를 반환(`ReactJSXElement.js:170-237`). `scheduleUpdateOnFiber`는 렌더를 예약하지 실행하지 않음(`ReactFiberWorkLoop.js:967`). `use()`는 Promise를 소비하는 프로토콜이지 데이터를 가져오지 않음(`ReactFiberHooks.js:1150`).
**기억법**: "시청은 도면(서술)을 접수하고, 감독관(실행)을 파견한다. 시청이 직접 벽돌을 쌓는 일은 없다."

### 2. 참조가 운명을 결정한다 (Identity Determines Fate)
> 값이 같아도 참조가 다르면 React는 "변경됨"으로 판단한다. 모든 최적화는 참조 유지에 수렴한다.

**근거**: `oldProps !== newProps` → 리렌더링(`ReactFiberBeginWork.js:4173`). shallowEqual의 각 값 `===` → memo bailout(`shallowEqual.js:32-48`). Compiler의 `$[i] !== dep` → 재계산(`CodegenReactiveFunction.ts`). 불변 업데이트 필수: mutation → 참조 안 바뀜 → 변경 감지 실패.
**기억법**: "도면의 일련번호(참조)가 다르면 재검사. 내용이 같아도 새 종이면 새 도면이다."

### 3. 시스템 ≠ 개체 (System ≠ Individual)
> 같은 문장이라도 "시스템 레벨"과 "개체 레벨"에서 참/거짓이 갈린다.

**근거**: `scheduleUpdateOnFiber`는 시스템 레벨에서 필요조건(참), fiber 레벨에서는 필요조건이 아님(거짓) — props 전파, context 마킹 등. 개별 리렌더 비용 ~0.01ms(미미), cascade(시스템 레벨) 16~100ms+(문제).
**기억법**: 도미노 — "첫 도미노를 손으로 밀어야(시스템) 전체가 쓰러지지만, 중간 도미노가 쓰러진 이유는 앞 도미노에 맞았기 때문(개체)이다."

### 4. 경계선은 의도적이다 (Boundaries Are Deliberate)
> React가 "하지 않는 것"은 실패가 아니라 설계 결정이다.

**근거**: 데이터 페칭 불관여 — 관심사 분리/데이터 소스 다양성/캐싱 전략 다양성. memo 디폴트 아님 — 비용/정확성 트레이드오프. Suspense에 빌트인 타임아웃 없음 — 앱 레벨 결정 위임. 렌더 vs 커밋 분리 — 함수 호출(저렴) vs DOM 변경(비쌈). Compiler bailout — "확신 없으면 건드리지 않는다"(`CompilerError.ts`).
**기억법**: "시청이 자재를 직접 조달하지 않는 건 무능이 아니라 분업이다."

---

## 판단 프레임워크

### 상황: 리렌더링은 일어나는데 DOM이 안 바뀜 — 성능 문제인가?
**떠올려**: 경계선은 의도적 (렌더 vs 커밋 분리) + 참조가 운명을 결정
**근거**: 렌더(함수 호출 ~0.01ms) ≠ 커밋(DOM 변경). diff가 없으면 커밋 미발생. 단일 컴포넌트의 불필요한 리렌더링은 대부분 성능 문제가 아니다.
**안티패턴**: "리렌더링 = 느림"으로 단정하고 모든 컴포넌트에 React.memo 무분별 적용.

### 상황: React.memo를 감쌌는데 자식이 여전히 리렌더링됨
**떠올려**: 참조가 운명을 결정
**근거**: 인라인 함수/객체 리터럴은 매 렌더마다 새 참조 → shallowEqual 실패 → memo 무효화. useCallback/useMemo로 참조 유지하거나, 구조적 해결(state 내리기, children 올리기)이 더 근본적.
**안티패턴**: "memo만 걸면 최적화 끝" — props의 참조 타입 미관리.

### 상황: 부모 setState 1번에 하위 50개 컴포넌트 전부 리렌더링
**떠올려**: 시스템 ≠ 개체
**근거**: `scheduleUpdateOnFiber`는 부모에 대해 1번만 호출. 나머지 49개는 work loop 순회 중 `oldProps !== newProps`로 리렌더링. 시스템 입구 1개, fiber별 판단은 beginWork에서.

### 상황: use() + Suspense만으로 데이터 페칭 구현
**떠올려**: 경계선은 의도적 + 서술-실행 분리
**근거**: `use()`는 Promise 소비 프로토콜이지 캐싱/재시도/무효화 미제공. 리렌더링마다 fetch() 재호출 위험. 캐싱은 React 밖(React Query, Next.js 등)의 몫.
**안티패턴**: "use()가 있으니 React가 데이터 페칭 지원" 오해 → 캐싱 없이 컴포넌트 안에서 Promise 직접 생성.

### 상황: React Compiler 도입 후 특정 컴포넌트에서 메모이제이션 안 됨
**떠올려**: 참조가 운명을 결정 + 경계선은 의도적
**근거**: scope 밖 매번 새 객체 → `alwaysInvalidatingValues` → 하위 scope 연쇄 prune(`PruneAlwaysInvalidatingScopes.ts`). Compiler bailout 시 원본 코드 반환(`Program.ts:740-746`). 대부분 체감 문제 없으나, 성능 크리티컬 컴포넌트는 Compiler 로그 확인 후 수동 메모 제거.

### 상황: scheduleUpdateOnFiber 호출 후 컴포넌트 함수 미실행
**떠올려**: 서술-실행 분리 + 시스템 ≠ 개체
**근거**: 자동 배칭으로 두 setState가 하나의 렌더 패스로 합쳐질 때, 한쪽이 컴포넌트를 트리에서 제거하면 해당 fiber의 함수는 호출되지 않음. "예약됨 ≠ 실행됨".

---

## 약점 보강

> React-리렌더링-트리거-meta 기준, streak 0~1 개념들

### scheduleUpdateOnFiber 호출 경로
**핵심**: 8개 호출자(dispatchSetState, dispatchReducerAction, enqueueSetState, enqueueForceUpdate, forceStoreRerender, updateContainerImpl, useOptimistic dispatch, refreshCache)가 이 함수를 호출한다. 이것이 렌더 패스의 "유일한 입구".
**왜 헷갈리나**: "유일한 입구"를 "유일한 리렌더링 이유"와 혼동. 입구는 시스템 레벨, 리렌더링 이유는 fiber 레벨.
**기억법**: 시청 접수대에 민원을 넣는 8가지 방법이 있지만, 접수대는 하나.

### 2계층 모델
**핵심**: 레벨1 — scheduleUpdateOnFiber가 렌더 패스 시작(work loop 진입). 레벨2 — beginWork가 각 fiber의 리렌더 여부 결정(scheduled update/props 변경/context 변경).
**왜 헷갈리나**: "scheduleUpdateOnFiber가 리렌더링 트리거"라는 문장이 두 레벨에서 다르게 해석됨.
**기억법**: 도미노 — 시스템(첫 도미노) vs 개체(중간 도미노).

### 컴포넌트 함수 호출 보장
**핵심**: scheduleUpdateOnFiber 호출 → fiber가 트리에 남아있는 한 컴포넌트 함수 호출됨. 단, 배칭으로 트리에서 제거되면 호출 안 됨.
**왜 헷갈리나**: "무조건 호출된다"고 단순화하면 배칭+언마운트 시나리오에서 틀림.
**기억법**: 예약(schedule) ≠ 실행(perform). 예약 후 건물(fiber)이 철거되면 감독관이 방문하지 않음.

### 렌더 vs 커밋 용어 구분
**핵심**: 렌더 = 컴포넌트 함수 호출(~0.01ms). 커밋 = DOM 변경. "컴포넌트 함수가 호출됐지만 리렌더링은 아니다"는 React 용어에서 모순 — 함수 호출이 곧 리렌더링.
**왜 헷갈리나**: 일상 언어로 "렌더링"은 "화면에 그리기"인데, React에서는 "함수 호출"을 의미.
**기억법**: 경계선은 의도적 — 렌더(레시피 읽기, 저렴)와 커밋(요리 서빙, 비쌈)은 의도적으로 분리된 단계.

---

## Q&A 기록

### Q1 (L1). 통합 비유에서 "도면 일련번호 비교"에 해당하는 실제 코드 메커니즘은 무엇이고, "내용 동일 포스트잇"과는 어떻게 다른가?
**A**: 도면 일련번호 비교는 react compiler의 $[index] 캐싱이고, 내용 동일 포스트잇은 React.memo의 메모제이션이다
**Score**: 오답
**보충**: 도면 일련번호 비교 = `oldProps !== newProps`(beginWork의 기본 참조 비교). Compiler의 `$[i]`는 비유표에서 "자동 도면 관리 서랍장". 기본 참조 비교(①) → React.memo shallowEqual(②) → Compiler useMemoCache(③) 순으로 최적화 레벨이 다름.

### Q2 (L1). "시스템 ≠ 개체" 원칙 적용: "scheduleUpdateOnFiber가 호출되면 해당 fiber가 리렌더링된다" — 왜 부정확한가?
**A**: 도미노 전체 관점에서는 맨앞 도미노가 넘어지면 이후 도미노는 다 넘어지는건 참 / 하지만 중간 도미노가 넘어진 유일한 이유가 맨앞 도미노가 넘어짐은 아님 / 즉 scheduleUpdateOnFiber가 호출되면 리렌더링이 일어나는 건 참 / 하지만 특정 Fiber의 리렌더링의 원인이 scheduleUpdateOnFiber라고 확정하지 못함
**Score**: 정답

### Q3 (L2). MemoChild가 리렌더링을 피하지 못하는 이유와 해결 원칙
**A**: props가 원시타입이 아니라 참조타입이므로 렌더링마다 참조값이 변경 → memo의 shallowEqual 실패 / useMemo와 useCallback 활용 또는 items를 MemoChild 컴포넌트로 내리고 onReset에 들어갈 함수에만 useCallback
**Score**: 정답

### Q4 (L3). React Compiler 도입 후 수동 useMemo/useCallback/React.memo 200개 — 전부 제거? 유지?
**A**: 제거하는게 유지보수면에서 권장되나, 제거하지 않아도 react compiler 자체적으로 제거한 후 재판단하므로 실질적 영향은 없음
**Score**: 정답 (bailout 리스크 보충 — Compiler bailout 시 원본 반환이므로 소스에서 제거 + bailout = 메모이제이션 없는 상태. 단, 대부분 체감 문제 없으므로 Compiler를 신뢰하고 제거하되 성능 크리티컬 소수만 확인이 현실적)

---

## 원페이저

| 원칙 | 한 줄 | 상황 | 기억법 |
|------|-------|------|--------|
| 서술-실행 분리 | "무엇을"과 "어떻게"는 항상 분리 | use()로 직접 fetch 호출, scheduleUpdateOnFiber가 즉시 렌더 실행한다는 오해 | 시청은 도면을 접수하지 벽돌을 쌓지 않는다 |
| 참조가 운명을 결정 | 값이 같아도 참조가 다르면 "변경됨" | memo 감쌌는데 리렌더링, 중첩 객체 mutation 감지 실패 | 새 종이면 새 도면 |
| 시스템 ≠ 개체 | 같은 문장도 레벨에 따라 참/거짓 | "scheduleUpdateOnFiber가 트리거" 해석, cascade 비용 판단 | 첫 도미노 vs 중간 도미노 |
| 경계선은 의도적 | 안 하는 것은 설계 결정 | 렌더 vs 커밋 혼동, 데이터 페칭 직접 구현, Compiler bailout | 시청의 분업 |


---

## 2026-02-26 (/forge)

## 2026-02-26 (via /forge learn)

learn 스킬 전체 5개 토픽(React-리렌더링-트리거, scheduleUpdateOnFiber, JSX-객체-반환-원리, React-데이터-페칭-불관여, React-리렌더링-비용과-메모이제이션)을 통합 forge.

**통합 비유**: React City — 도시 행정 시스템. 도면(ReactElement), 시청 접수대(scheduleUpdateOnFiber), 감독관 순회(work loop), 도면 일련번호 비교(참조 비교), 자재 공급업체(데이터 페칭 레이어), 자동 서랍장(React Compiler).

**핵심 원칙 4개**: (1) 서술-실행 분리 — JSX/schedule/use() 모두 실행이 아닌 서술/예약/소비. (2) 참조가 운명을 결정 — oldProps!==newProps, shallowEqual, $[i]!==dep, 불변 업데이트. (3) 시스템≠개체 — scheduleUpdateOnFiber는 시스템 필요조건이나 fiber 필요조건 아님, cascade vs 개별 비용. (4) 경계선은 의도적 — 데이터 페칭 불관여, memo 디폴트 아님, Compiler bailout.

**Q&A 4문제**: L1 연결 2문제(1오답/1정답), L2 판단 1문제(정답), L3 설계 1문제(정답+보충). 약점: "도면 일련번호 비교"를 Compiler $[i]로 오인 → 기본 참조 비교(beginWork:4173)와 혼동.
