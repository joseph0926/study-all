# Mini-Forge: React Router Loader
> 날짜: 2026-02-28
> 세션: #3
> 체크포인트: PASS

## 원칙
> 렌더 전 매칭이 병렬을 만든다 — 라우트 트리를 렌더 전에 파악하면 모든 데이터 fetch를 병렬로 시작할 수 있고, 렌더에 종속되면 워터폴이 된다.

**근거**: `matchRoutes()` → `callLoadersAndMaybeResolveData()` (`router.ts:3134-3146`)에서 모든 매칭 라우트의 loader를 한번에 실행. React 렌더 사이클(Fiber 순차 처리)에 진입하기 전에 동작.
**나라면**: loader 위에 URL 구조 기반 캐시 레이어를 추가. 트레이드오프 — router 범위를 넘어서게 되고, react-query 등 조합 대비 결정적 차별점은 부족.

## 판단 시나리오

### 상황 1: 중첩 라우트에서 각 컴포넌트가 useEffect로 데이터를 가져오고 있다
**떠올려**: "렌더 전 매칭이 병렬을 만든다" — 부모가 렌더되어야 자식 fetch가 시작되는 구조는 워터폴이다
**안티패턴**: 중첩 깊이 3단계에서 각 useEffect fetch가 1초씩이면 3초 직렬. loader면 1초 병렬.

### 상황 2: shouldRevalidate에서 return false로 성능 최적화를 시도하고 있다
**떠올려**: 반드시 `defaultShouldRevalidate`를 폴백으로 반환해야 한다. 무조건 false는 action 후에도 loader가 안 돌아서 stale UI를 만든다.
**안티패턴**: `shouldRevalidate: () => false` — mutation 후 UI가 서버와 불일치.

## 기억법
웨이터가 전체 테이블 지도를 들고 동시에 세팅한다 — 손님(컴포넌트)이 자리에 앉기 전에.
