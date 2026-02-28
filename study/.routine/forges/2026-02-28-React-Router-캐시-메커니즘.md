# Mini-Forge: React Router 캐시 메커니즘
> 날짜: 2026-02-28
> 세션: #4
> 체크포인트: PASS

## 원칙
> `dataStrategy`는 `Record<routeId, DataStrategyResult>` 계약만 지키면 데이터 소스에 제한이 없는 확장 포인트이며, React Router가 캐시를 기본 제공하지 않는 것은 구조적 한계가 아니라 "서버가 진실"이라는 철학적 선택이다.

**근거**: `router.ts:3112-3128` — router는 결과의 출처를 검사하지 않음. `router.ts:5710-5719` — 기본 구현은 5줄. `state-management.md:16` — "서버가 source of truth".
**나라면**: staleTime 기반 캐시를 라우트 설정에 도입 (TanStack Router 방식). 트레이드오프 — 편의성은 올라가지만, stale 판단 책임이 프레임워크로 넘어와 동기화 버그 위험 증가.

## 판단 시나리오

### 상황 1: 대시보드 앱에서 네비게이션마다 같은 사이드바 데이터를 다시 로딩
**떠올려**: `dataStrategy`의 계약 — `resolve()` 없이도 캐시에서 직접 반환 가능. 하지만 먼저 `shouldRevalidate`로 충분한지 확인.
**안티패턴**: 처음부터 React Query를 도입하는 것. 라우트에 1:1 묶인 데이터라면 `shouldRevalidate(() => false)`로 해결 가능.

### 상황 2: 목록 → 상세 → 뒤로가기 시 목록을 다시 로딩하지 않으려 할 때
**떠올려**: `dataStrategy`에서 캐시 히트 시 `resolve()`를 호출하지 않으면 loader를 스킵할 수 있다. SWR 패턴이라면 `.then()`으로 백그라운드 갱신.
**안티패턴**: `handlerOverride`에서 `handler()`를 영원히 안 부르는 것. 서버와의 연결이 끊겨 데이터가 영원히 stale.

## 기억법
"라우터는 영수증만 본다" — 음식이 주방(loader)에서 왔든, 냉장고(캐시)에서 왔든, 배달(GQL)에서 왔든, 라우터는 영수증(`Record<routeId, DataStrategyResult>`) 형식만 맞으면 받아들인다.
