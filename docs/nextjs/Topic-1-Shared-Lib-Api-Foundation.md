# Topic 1: shared + lib + api (Foundation)

> `/learn nextjs` 세션 기록. 소스 코드 기반 Q&A 히스토리.

---

## 2026-02-17

### 학습 로드맵
- Step 1: 전역 상수 체계 (Constants)
  - [x] 1.1: `shared/lib/constants.ts` — 빌드 페이즈, 매니페스트, 컴파일러 상수
  - [ ] 1.2: `lib/constants.ts` — Webpack 레이어, 헤더, 캐시 태그 상수
- Step 2: App Router 타입과 Context
  - [ ] 2.1: `app-router-types.ts` — CacheNode, FlightData 타입 구조
  - [ ] 2.2: `app-router-context.shared-runtime.ts` — 5개 핵심 React Context
- Step 3: api/ — Public API 진입점
  - [ ] 3.1: api/ 디렉토리 re-export 패턴 — next/dynamic, next/image 등
  - [ ] 3.2: 환경별 API 분리 — navigation.ts vs navigation.react-server.ts
- Step 4: lib/ — 프로젝트 탐색과 번들러 선택
  - [ ] 4.1: find-config, find-root, find-pages-dir — 설정/디렉토리 탐색
  - [ ] 4.2: bundler.ts — Turbopack/Webpack/Rspack 선택 로직
- Step 5: shared/lib/ 핵심 유틸리티
  - [ ] 5.1: dynamic.tsx + loadable — 동적 로딩 구현
  - [ ] 5.2: image-config.ts, magic-identifier.ts — 이미지 설정과 Turbopack 식별자

### 학습 요약
- `shared/lib/constants.ts`는 Next.js 전체에서 사용되는 전역 상수 "어휘 사전" 역할
- 4가지 카테고리: 컴파일러(3개 번들 타겟), 빌드 페이즈(7단계), 매니페스트 파일명, AdapterOutputType(라우트 출력 유형)
- COMPILER_NAMES(문자열 비교/라벨)와 COMPILER_INDEXES(배열 인덱스 접근 + `keyof typeof` 타입 정의)는 용도가 다르기 때문에 분리
- Edge Runtime은 Web API 기반 경량 실행 환경으로, CDN 엣지 노드에서 빠른 콜드 스타트를 제공 (Topic 7에서 상세 학습 예정)

### 소스 코드 경로
- `ref/next.js/packages/next/src/shared/lib/constants.ts:7-11` — COMPILER_NAMES 정의 (client, server, edge-server)
- `ref/next.js/packages/next/src/shared/lib/constants.ts:15-21` — COMPILER_INDEXES 정의 (숫자 인덱스 매핑)
- `ref/next.js/packages/next/src/shared/lib/constants.ts:31-68` — AdapterOutputType enum (PAGES, APP_PAGE, APP_ROUTE 등)
- `ref/next.js/packages/next/src/shared/lib/constants.ts:70-76` — PHASE_* 빌드 페이즈 상수
- `ref/next.js/packages/next/src/shared/lib/constants.ts:87-138` — 매니페스트 파일명 상수
- `ref/next.js/packages/next/src/shared/lib/constants.ts:109-116` — CONFIG_FILES (next.config.js/mjs/ts)
- `ref/next.js/packages/next/src/shared/lib/constants.ts:184-201` — EDGE_UNSUPPORTED_NODE_APIS
- `ref/next.js/packages/next/src/server/dev/on-demand-entry-handler.ts:299` — COMPILER_INDEXES 실사용 (multiCompiler.compilers 배열 접근)
- `ref/next.js/packages/next/src/build/webpack-build/impl.ts:73` — `keyof typeof COMPILER_INDEXES`를 타입으로 사용

### Q&A 전체 기록

#### Step 1.1: `shared/lib/constants.ts` — 빌드 페이즈, 매니페스트, 컴파일러 상수

**Q: COMPILER_NAMES, COMPILER_INDEXES 따로 둔 이유가 뭘까요? Map등을 이용하면 한번에 해결되지 않았을까 해서 질문드립니다**

A: 핵심 사용처를 보면 이유가 명확합니다.

**COMPILER_INDEXES의 실제 사용** — `on-demand-entry-handler.ts:299`:

```ts
this.multiCompiler.compilers[COMPILER_INDEXES[key]].watching?.invalidate()
```

Webpack의 `MultiCompiler`는 내부적으로 **compilers 배열**을 가집니다. 특정 컴파일러를 접근하려면 **숫자 인덱스**가 필요합니다. `COMPILER_INDEXES`는 이 배열 접근을 위한 매핑입니다.

**COMPILER_NAMES의 실제 사용** — 문자열 비교와 라벨링:

```ts
// on-demand-entry-handler.ts:789
if (compilerType === COMPILER_NAMES.client) { ... }

// sandbox/context.ts:133
decorateServerError(error, COMPILER_NAMES.edgeServer)
```

**왜 Map이 아닌가?** — TypeScript 타입 추론 때문입니다.

`COMPILER_INDEXES`는 `keyof typeof` 패턴으로 **타입**으로도 쓰입니다:

```ts
// webpack-build/impl.ts:73
export async function webpackBuildImpl(
  compilerName: keyof typeof COMPILER_INDEXES | null  // → 'client' | 'server' | 'edge-server'
)
```

`as const` 객체는 `keyof typeof`로 정확한 리터럴 유니온 타입을 얻을 수 있지만, `Map`은 `Map<string, number>`로 추론되어 타입 안전성을 잃습니다.

정리:

| 객체 | 용도 | 값 타입 |
|------|------|--------|
| `COMPILER_NAMES` | 문자열 비교, 로깅, 에러 데코레이션 | `string` |
| `COMPILER_INDEXES` | 배열 인덱스 접근 + **타입 정의**(`keyof typeof`) | `number` |

두 객체가 다른 **값 타입**(string vs number)을 가지고, 다른 **문맥**(비교/라벨 vs 배열접근/타입)에서 쓰이기 때문에 분리가 합리적입니다.

---

**Q: edge 런타임이 정확히 뭔가요? (plan.md 기준 이후 배울 내용이면 간단히 소개만)**

A: Topic 7(server — Proxy & Web Runtime)에서 깊이 다루지만, 간단히 소개하면:

**Edge Runtime**은 Node.js가 아닌 **Web API 기반의 경량 실행 환경**입니다.

- Node.js의 `fs`, `net` 같은 API 없이 `fetch`, `Request`, `Response` 같은 **Web 표준 API**만 사용 가능
- CDN 엣지 노드(Vercel Edge Functions, Cloudflare Workers 등)에서 사용자에게 가까운 위치에서 실행 → 낮은 레이턴시
- 제한된 API 대신 **빠른 콜드 스타트**가 장점

`constants.ts:184-201`의 `EDGE_UNSUPPORTED_NODE_APIS` 목록이 바로 Edge에서 쓸 수 없는 Node.js API를 정의한 것입니다. 이 목록을 기반으로 빌드 시 Edge 번들에서 지원되지 않는 API 사용을 감지합니다.

```
[Node.js Runtime]  ←→  [Edge Runtime]
  - 모든 Node API        - Web API만
  - 느린 콜드 스타트       - 빠른 콜드 스타트
  - 서버 1곳에서 실행      - CDN 엣지에서 실행
```

### 연결 토픽
- Topic 7 (server — Proxy & Web Runtime): Edge Runtime 심층 학습, `EDGE_UNSUPPORTED_NODE_APIS` 활용 맥락
- Topic 14-16 (build): 매니페스트 상수들이 빌드 파이프라인에서 실제로 생성/소비되는 흐름
- Step 1.2 (lib/constants.ts): Webpack 레이어 상수 — 번들 분리 기준과 COMPILER_NAMES의 연결

---

## 2026-02-17 (재개 — Step 1.2부터)

### 학습 로드맵
- Step 1: 전역 상수 체계 (Constants)
  - [x] 1.1: `shared/lib/constants.ts` — 빌드 페이즈, 매니페스트, 컴파일러 상수
  - [x] 1.2: `lib/constants.ts` — Webpack 레이어, 헤더, 캐시 태그 상수
- Step 2: App Router 타입과 Context
  - [ ] 2.1: `app-router-types.ts` — CacheNode, FlightData 타입 구조
  - [ ] 2.2: `app-router-context.shared-runtime.ts` — 5개 핵심 React Context
- Step 3: api/ — Public API 진입점
  - [ ] 3.1: api/ 디렉토리 re-export 패턴 — next/dynamic, next/image 등
  - [ ] 3.2: 환경별 API 분리 — navigation.ts vs navigation.react-server.ts
- Step 4: lib/ — 프로젝트 탐색과 번들러 선택
  - [ ] 4.1: find-config, find-root, find-pages-dir — 설정/디렉토리 탐색
  - [ ] 4.2: bundler.ts — Turbopack/Webpack/Rspack 선택 로직
- Step 5: shared/lib/ 핵심 유틸리티
  - [ ] 5.1: dynamic.tsx + loadable — 동적 로딩 구현
  - [ ] 5.2: image-config.ts, magic-identifier.ts — 이미지 설정과 Turbopack 식별자

### 학습 요약
- `lib/constants.ts`는 Webpack 레이어 시스템(번들 환경 분류)과 HTTP 헤더/캐시 태그 상수를 정의
- `WEBPACK_LAYERS_NAMES`는 13개 레이어(rsc, ssr, app-pages-browser 등)로 하나의 앱을 세밀하게 분류
- `WEBPACK_LAYERS.GROUP`은 레이어들을 serverOnly, clientOnly, bundled 등 그룹으로 묶어 Webpack 규칙 적용 단위로 사용
- Step 1.1의 COMPILER_NAMES가 큰 컴파일러 단위(client/server/edge)라면, 레이어는 그 안의 세부 코드 분류 단위
- `proxy`는 사용자 진입점 파일명(middleware → proxy 전환 중)이지만, 내부 Webpack 레이어명은 여전히 `'middleware'`

### 소스 코드 경로
- `ref/next.js/packages/next/src/lib/constants.ts:115-169` — WEBPACK_LAYERS_NAMES 정의 (13개 레이어)
- `ref/next.js/packages/next/src/lib/constants.ts:171-172` — WebpackLayerName 타입 (값 유니온 추출)
- `ref/next.js/packages/next/src/lib/constants.ts:174-213` — WEBPACK_LAYERS (개별 레이어 + GROUP 정의)
- `ref/next.js/packages/next/src/lib/constants.ts:9-10` — PRERENDER_REVALIDATE_HEADER
- `ref/next.js/packages/next/src/lib/constants.ts:24-27` — NEXT_CACHE_TAGS_HEADER 등 캐시 태그 헤더
- `ref/next.js/packages/next/src/lib/constants.ts:34-37` — NEXT_CACHE_TAG_MAX_ITEMS/LENGTH 제한값
- `ref/next.js/packages/next/src/lib/constants.ts:47-53` — MIDDLEWARE_FILENAME / PROXY_FILENAME
- `ref/next.js/packages/next/src/build/webpack-config.ts:1410-1432` — WEBPACK_LAYERS.GROUP.serverOnly 실사용 (issuerLayer 기반 server-only/client-only 분리)

### Q&A 전체 기록

#### Step 1.2: `lib/constants.ts` — Webpack 레이어, 헤더, 캐시 태그 상수

**Q: Webpack 레이어(Layer) 시스템으로 하나의 앱을 여러 번들 환경(RSC, SSR, 브라우저, API 등)으로 분리합니다. << 이건 리액트에서 react는 인터페이스 역할만 하고 실제 구현은 react-dom 같은곳에 되어있는거랑 비슷한 느낌입니까?**

A: **다른 개념입니다.** React의 패턴은 "인터페이스(`react`)와 구현(`react-dom`)의 분리"입니다. 하나의 API를 여러 플랫폼이 각자 구현하는 것입니다.

Webpack 레이어는 **"같은 소스 코드를 다른 환경용으로 다르게 빌드한다"**에 가깝습니다. 실제 사용(`webpack-config.ts:1410-1432`):

```ts
// issuerLayer가 serverOnly 그룹이면 → server-only 패키지 허용, client-only 에러
{
  issuerLayer: { or: [...WEBPACK_LAYERS.GROUP.serverOnly, ...WEBPACK_LAYERS.GROUP.neutralTarget] },
  resolve: { alias: createServerOnlyClientOnlyAliases(true) },
},
// issuerLayer가 serverOnly가 아니면 → client-only 허용, server-only 에러
{
  issuerLayer: { not: [...WEBPACK_LAYERS.GROUP.serverOnly, ...WEBPACK_LAYERS.GROUP.neutralTarget] },
  resolve: { alias: createServerOnlyClientOnlyAliases(false) },
},
```

같은 `import 'server-only'` 코드라도 어떤 레이어에서 import했느냐에 따라 허용되거나 에러가 납니다. 비유:

- React: **다른 건물(react-dom, react-native)**이 같은 설계도(react)를 각자 구현
- Webpack 레이어: **같은 건물 안에서 층별(rsc, ssr, browser)로 출입 권한이 다름** — "서버 전용 층에서는 DB 접근 OK, 브라우저 층에서는 금지"

---

**Q: middleware << 16.x부터 proxy로 바뀌었는데, 내부 코드는 여전히 middleware를 사용중인가요? / 아니면 그거랑 다른건가요?**

A: 주석이 직접 답을 말하고 있습니다:

```ts
// lib/constants.ts:47-53
// Patterns to detect middleware files
export const MIDDLEWARE_FILENAME = 'middleware'

// Patterns to detect proxy files (replacement for middleware)
export const PROXY_FILENAME = 'proxy'
```

`proxy`는 사용자가 만드는 **파일명**(프로젝트 루트의 `proxy.ts`)이고, Webpack **레이어 이름**은 여전히 `'middleware'`입니다. 내부 빌드 시스템의 레이어 분류는 바뀌지 않았고, 사용자 진입점 파일명만 `middleware` → `proxy`로 전환 중인 상태입니다.

---

**Q: WEBPACK_LAYERS.GROUP.[key] << 의 배열들의 요소는 문자열인가요? (serverOnly: [rsc, actionBrowser, instrument, middleware],)**

A: **네, 문자열입니다.** 설명에서 축약 표기해서 혼동을 드렸습니다. 실제 코드:

```ts
// lib/constants.ts:181-186
serverOnly: [
  WEBPACK_LAYERS_NAMES.reactServerComponents,  // → 'rsc'
  WEBPACK_LAYERS_NAMES.actionBrowser,           // → 'action-browser'
  WEBPACK_LAYERS_NAMES.instrument,              // → 'instrument'
  WEBPACK_LAYERS_NAMES.middleware,              // → 'middleware'
],
```

`WEBPACK_LAYERS_NAMES`가 `as const` 객체이므로, 각 값은 **리터럴 문자열 타입**(`'rsc'`, `'action-browser'` 등)입니다. Webpack의 `issuerLayer` 설정이 문자열 배열을 받기 때문에 이런 구조입니다.

---

**Q: 사소한 질문이지만 왜 따로 타입,인터페이스로 분리안하고 인라인에서 "keyof typeof"로 할까요? 근거나 주석등이있낭요?**

A: 소스에 이유를 설명하는 주석은 없습니다. 하지만 소스에서 확인할 수 있는 **구조적 이유**가 있습니다:

타입을 별도로 선언하면 **값과 타입을 수동으로 동기화**해야 합니다:

```ts
// 이렇게 하면 레이어를 추가할 때 두 곳을 수정해야 함
type WebpackLayerName = 'shared' | 'rsc' | 'ssr' | ...
const WEBPACK_LAYERS_NAMES = { shared: 'shared', ... }
```

`keyof typeof`로 하면 **객체가 Single Source of Truth**가 되어, 레이어를 추가/삭제할 때 객체만 수정하면 타입이 자동으로 따라옵니다. Step 1.1의 `keyof typeof COMPILER_INDEXES`도 같은 이유입니다 — Next.js 코드베이스 전반의 일관된 패턴입니다.

---

**Q: revalidateTag('blog') 호출 시 이 헤더들을 통해 캐시 무효화 요청이 전달됩니다. << 이 말이 잘 이해가 안갑니다 (이후 자세히 다룰거면 스킵해도됩니다)**

A: 이후 토픽(서버/캐싱)에서 깊이 다루므로 간단히만 설명하면:

`revalidateTag('blog')` 호출 시 내부적으로 Next.js 서버에 HTTP 요청이 갑니다. 이때 "어떤 태그를 무효화할지"를 **HTTP 헤더**로 전달합니다:

```
요청 헤더:
x-next-revalidated-tags: blog
x-next-revalidate-tag-token: {secret}  ← 인증 토큰
```

서버는 이 헤더를 읽고 `'blog'` 태그가 붙은 캐시 엔트리를 무효화합니다. 상수들은 이 **헤더 이름의 오타 방지 + 일관성**을 위한 것이고, 상세 흐름은 캐싱 토픽에서 다루겠습니다.

---

**Q: 사용자 진입점 파일명만 middleware → proxy로 전환 중인 상태입니다. << 이유가 뭔가요? (이후 자세히 다룰거면 스킵)**

A: 이 토픽(shared/lib/api Foundation)의 범위를 벗어나는 내용이고, plan.md 기준으로 **Topic 7 (server — Proxy & Web Runtime)**에서 다룰 예정입니다.

지금은 `lib/constants.ts:51`의 주석 한 줄이 전부입니다:

```ts
// Patterns to detect proxy files (replacement for middleware)
```

"왜 교체하는지"의 설계 의도는 이 상수 파일에는 없고, 실제 proxy 구현 코드와 서버 런타임 쪽에서 확인해야 합니다. Topic 7에서 깊이 다루겠습니다.

### 연결 토픽
- Topic 7 (server — Proxy & Web Runtime): middleware → proxy 전환 이유, Edge Runtime 심층 학습
- Topic 14-16 (build): Webpack 레이어가 빌드 파이프라인에서 실제로 번들을 분리하는 흐름
- 캐싱 토픽: revalidateTag와 캐시 태그 헤더의 전체 흐름
- Step 2.1 (app-router-types.ts): 레이어별로 다르게 빌드된 코드가 사용하는 타입 구조

---

## 2026-02-17 (재개 — Step 2.1부터)

### 학습 로드맵
- Step 1: 전역 상수 체계 (Constants)
  - [x] 1.1: `shared/lib/constants.ts` — 빌드 페이즈, 매니페스트, 컴파일러 상수
  - [x] 1.2: `lib/constants.ts` — Webpack 레이어, 헤더, 캐시 태그 상수
- Step 2: App Router 타입과 Context
  - [x] 2.1: `app-router-types.ts` — CacheNode, FlightData 타입 구조
  - [ ] 2.2: `app-router-context.shared-runtime.ts` — 5개 핵심 React Context
- Step 3: api/ — Public API 진입점
  - [ ] 3.1: api/ 디렉토리 re-export 패턴 — next/dynamic, next/image 등
  - [ ] 3.2: 환경별 API 분리 — navigation.ts vs navigation.react-server.ts
- Step 4: lib/ — 프로젝트 탐색과 번들러 선택
  - [ ] 4.1: find-config, find-root, find-pages-dir — 설정/디렉토리 탐색
  - [ ] 4.2: bundler.ts — Turbopack/Webpack/Rspack 선택 로직
- Step 5: shared/lib/ 핵심 유틸리티
  - [ ] 5.1: dynamic.tsx + loadable — 동적 로딩 구현
  - [ ] 5.2: image-config.ts, magic-identifier.ts — 이미지 설정과 Turbopack 식별자

### 학습 요약
- `app-router-types.ts`는 App Router의 클라이언트 측 데이터 모델을 정의 — CacheNode(캐시 트리 노드)와 Flight 타입들(서버→클라이언트 전송 형식)
- CacheNode는 `rsc`(실제 데이터)와 `prefetchRsc`(정적 프리페치 데이터)의 이중 구조. `useDeferredValue`로 prefetch → 실제 데이터로 전환
- 둘 다 null이면 `unresolvedThenable`로 무한 suspend → 라우터가 별도로 서버 요청 → CacheNode 업데이트 → suspend 해제 (무한루프 아님)
- Flight 타입들이 객체가 아닌 튜플(배열)인 이유: 와이어 포맷 크기 최적화 (키 이름 생략). InitialRSCPayload도 단일 문자 키(`b`, `c`, `q` 등) 사용
- DynamicParamTypesShort(`'d'`, `'c'`, `'oc'`)는 URL에서 몇 개 세그먼트를 소비할지 결정. paramName만으로는 불충분
- staticSiblings는 production에서 optimistic routing(prefetch 최적화)을 위해 사용. dev 모드에서는 null → 서버 폴백 (결과는 동일, 속도만 차이)

### 소스 코드 경로
- `ref/next.js/packages/next/src/shared/lib/app-router-types.ts:23-52` — CacheNode 타입 정의 (rsc, prefetchRsc, slots)
- `ref/next.js/packages/next/src/shared/lib/app-router-types.ts:54-100` — DynamicParamTypes, DynamicSegmentTuple 정의
- `ref/next.js/packages/next/src/shared/lib/app-router-types.ts:107-141` — FlightRouterState 튜플 타입 (라우터 상태 트리)
- `ref/next.js/packages/next/src/shared/lib/app-router-types.ts:188-213` — CacheNodeSeedData (서버→클라이언트 seed 데이터)
- `ref/next.js/packages/next/src/shared/lib/app-router-types.ts:215-236` — FlightDataSegment, FlightDataPath, FlightData
- `ref/next.js/packages/next/src/shared/lib/app-router-types.ts:240-261` — InitialRSCPayload (단일 문자 키 최적화)
- `ref/next.js/packages/next/src/client/components/layout-router.tsx:311-347` — useDeferredValue로 rsc/prefetchRsc 전환, null 시 unresolvedThenable suspend
- `ref/next.js/packages/next/src/client/components/router-reducer/ppr-navigations.ts:1180-1193` — createCacheNode 함수
- `ref/next.js/packages/next/src/client/components/router-reducer/ppr-navigations.ts:860-944` — 초기 hydration 시 CacheNode 생성
- `ref/next.js/packages/next/src/client/components/router-reducer/ppr-navigations.ts:1042-1074` — 네비게이션 시 rsc/prefetchRsc 할당 (createDeferredRsc)
- `ref/next.js/packages/next/src/client/route-params.ts:52-128` — DynamicParamTypesShort별 URL 파싱 분기 (d=1개, c=전부, oc=0+개)
- `ref/next.js/packages/next/src/client/components/segment-cache/optimistic-routes.ts:582-596` — staticChildren null 시 optimistic match 포기 주석
- `ref/next.js/packages/next/src/client/components/segment-cache/optimistic-routes.ts:599-627` — 정적 자식 우선 매칭 로직
- `ref/next.js/packages/next/src/build/webpack/loaders/next-app-loader/index.ts:550-559` — dev 모드 staticSiblings null, production에서만 계산
- `ref/next.js/packages/next/src/server/app-render/get-short-dynamic-param-type.tsx:6-21` — DynamicParamTypes → Short 매핑
- `ref/next.js/packages/next/src/server/dev/on-demand-entry-handler.ts:84-106` — Short 타입으로 파일시스템 세그먼트명 복원
- `ref/next.js/packages/next/src/client/flight-data-helpers.ts:270` — `null slightly more compact than undefined` 주석
- `ref/next.js/packages/next/src/shared/lib/segment-cache/segment-value-encoding.ts:70-75` — `by default for compactness` 설계 철학

### Q&A 전체 기록

#### Step 2.1: `app-router-types.ts` — CacheNode, FlightData 타입 구조

**Q: 책장 비유 관련 질문: 그러면 서버에서 보낸 RSC payload가 클라이언트 인메모리 캐시로 저장된다는건가요?**

A: **네, 맞습니다.** 서버가 보낸 RSC payload는 클라이언트 메모리의 CacheNode 트리에 저장됩니다.

실제 생성 코드 — `ppr-navigations.ts:1180-1193`:

```ts
function createCacheNode(
  rsc: React.ReactNode | null,
  prefetchRsc: React.ReactNode | null,
  head: React.ReactNode | null,
  prefetchHead: HeadData | null
): CacheNode {
  return { rsc, prefetchRsc, head, prefetchHead, slots: null }
}
```

**흐름**: 서버 응답 → `createCacheNodeForSegment()` → `createCacheNode()` → CacheNode 트리에 삽입

초기 수화(hydration) 시 (`ppr-navigations.ts:860-944`):

```ts
case FreshnessPolicy.Hydration: {
  const rsc = seedRsc          // SSR 페이로드에서 온 데이터
  const prefetchRsc = null
  return {
    cacheNode: createCacheNode(rsc, prefetchRsc, head, prefetchHead),
    needsDynamicRequest: false,
  }
}
```

네비게이션 시에는 prefetch 데이터가 있으면 `prefetchRsc`에, 동적 데이터가 아직 안 왔으면 `rsc`에 미해결 Promise를 넣습니다:

```ts
// ppr-navigations.ts:1042-1074
if (isCachedRscPartial) {
  prefetchRsc = cachedRsc        // 부분 캐시 → prefetch로
  rsc = createDeferredRsc()      // 미해결 Promise (서버 응답 대기)
}
```

CacheNode는 순수 JS 객체 트리로 브라우저 메모리에 존재합니다. localStorage나 IndexedDB가 아닌 React 상태 안의 인메모리 캐시입니다.

---

**Q: "렌더링 시 useDeferredValue로 둘 중 하나를 선택합니다 — prefetch 데이터를 먼저 보여주다가 실제 데이터가 오면 교체." < 이건 default or 고정인가요? 예를들어 이게 강제되면 레이아웃 시프트가 심할수있지 않을까요? (물론 그걸 잡는것도 개발자 목표지만 일반적인 관점에서 질문드립니다)**

A: 소스를 보면 **App Router 내부 동작으로 고정**되어 있고, 개발자가 끄거나 변경할 수 있는 옵션이 아닙니다.

`layout-router.tsx:311-327`:

```ts
// If this segment has a `prefetchRsc`, it's the statically prefetched data.
// We should use that on initial render instead of `rsc`. Then we'll switch
// to `rsc` when the dynamic response streams in.
const resolvedPrefetchRsc =
  cacheNode.prefetchRsc !== null ? cacheNode.prefetchRsc : cacheNode.rsc

// useDeferredValue의 두 번째 인자는 초기 렌더 시 반환값
const rsc = useDeferredValue(cacheNode.rsc, resolvedPrefetchRsc)
```

**레이아웃 시프트 우려에 대해**: 이 설계가 오히려 레이아웃 시프트를 **줄이는** 방향입니다:

1. `prefetchRsc`는 **같은 라우트의 정적 버전**. 완전히 다른 콘텐츠가 아니라, 동적 부분만 "구멍"인 상태 (예: 사용자 이름 자리가 비어있지만 레이아웃 구조는 동일).
2. `useDeferredValue`는 **이전 UI를 유지하면서** 새 데이터가 준비되면 교체. 갑자기 빈 화면이 뜨는 게 아니라, prefetch 버전을 보여주다가 매끄럽게 전환.
3. prefetchRsc도 없으면 → `cacheNode.rsc`로 바로 가고, 그것도 없으면 Suspense fallback(loading.tsx) 표시. 빈 화면이 아니라 loading 상태.

정리: **prefetch 있으면 → 정적 껍데기를 먼저 보여주고 동적 부분만 채움**, **prefetch 없으면 → loading.tsx fallback** → 어느 쪽이든 레이아웃 구조는 유지.

---

**Q: "둘 다 null이면 "데이터 없음" → Suspense가 트리거되어 서버에 lazy fetch 요청." < null -> lazy fetch 요청 -> null 응답 -> ... 무한루프 위험성은 없나요?**

A: **무한루프가 발생하지 않습니다.** 이유는 `null`일 때 fetch를 다시 보내는 게 아니라, **영원히 suspend**하기 때문입니다.

`layout-router.tsx:331-347`:

```ts
if (rsc === null) {
  // 절대 resolve되지 않는 thenable → 무한 suspend
  use(unresolvedThenable) as never
}
```

이 `unresolvedThenable`의 정의 (`unresolved-thenable.ts`):

```ts
export const unresolvedThenable = {
  then: () => {},    // resolve 콜백을 호출하지 않음 → 영원히 pending
} as PromiseLike<void>
```

**핵심**: `null` → "fetch를 다시 보낸다"가 아니라 → "이 컴포넌트를 무한정 suspend 상태로 두고, **라우터가 별도로** 서버에 동적 요청을 보내서 데이터가 오면 CacheNode를 업데이트하고 새 상태를 dispatch한다".

흐름:
```
1. rsc === null → use(unresolvedThenable) → 컴포넌트 suspend
2. 부모의 Suspense boundary가 loading.tsx를 표시
3. 라우터가 SERVER_PATCH 액션으로 서버에 동적 요청
4. 응답이 오면 CacheNode.rsc에 실제 데이터를 채움
5. React 상태 업데이트 → suspend 해제 → 실제 콘텐츠 렌더링
```

만약 서버가 정말로 데이터를 안 보내면? → 컴포넌트는 계속 suspend 상태(loading 표시)로 남아있을 뿐, **fetch를 반복하지는 않습니다.**

---

**Q: "네트워크 전송 크기를 줄이기 위함" < 그러면 그냥 string으로 보내고 역직렬화하는게 제일 크기가 줄지 않나요?**

**Q: "네트워크 전송 크기를 줄이기 위함" < 튜플이 객체보다 의미있게 크기가 준다는 근거가 소스코드, 주석, PR등에 있나요?**

A: **명시적으로 "튜플 vs 객체" 비교를 설명하는 주석은 없습니다.** 하지만 소스 곳곳에서 **와이어 포맷 크기 최적화가 설계 우선순위**라는 증거가 있습니다:

**증거 1** — `CompressedRefreshState` 타입명 자체가 "압축"을 명시 (`app-router-types.ts:153`):

```ts
export type CompressedRefreshState = [url: string, renderedSearch: string]
```

**증거 2** — `InitialRSCPayload`의 단일 문자 키 (`app-router-types.ts:240-261`):

```ts
export type InitialRSCPayload = {
  b?: string    // buildId
  c: string[]   // initialCanonicalUrlParts
  q: string     // initialRenderedSearch
  i: boolean    // couldBeIntercepted
  f: FlightDataPath[]  // initialFlightData
}
```

객체 키마저도 `buildId` 대신 `b`로 줄이고 있습니다. 튜플과 같은 맥락의 최적화.

**증거 3** — `flight-data-helpers.ts:270`의 명시적 주석:

```ts
result[2] = null // null slightly more compact than undefined
```

`null`이 `undefined`보다 JSON에서 더 작다는 이유로 선택할 정도로 바이트 단위 최적화.

**증거 4** — `segment-value-encoding.ts:70-75`의 설계 철학:

> "by default for compactness, and for easier debugging"

**"string으로 보내고 역직렬화하면 더 작지 않냐"는 질문에 대해**: 이 데이터는 이미 React의 **Flight 프로토콜** 위에서 전송됩니다. React의 `react-server-dom-webpack`이 자체 직렬화를 수행하므로, Next.js가 추가로 JSON.stringify를 하는 게 아닙니다. Flight 프로토콜 안에서의 JS 값 표현 크기를 줄이는 것이 목표이고, 그 맥락에서 `["dashboard", {}]`가 `{"segment": "dashboard", "parallelRoutes": {}}`보다 작습니다.

---

**Q: dynamicParamType, staticSiblings < 이 두개는 왜 보내는지 모르겠습니다, 이미 동적이라 튜플로 보내는거면 paramName으로 dynamicParamType이 대체되는거 아닌가요? 아니면 "d" < 이 값이 특수한 값인가요? 또한 staticSiblings < 이건 왜 보내는건가요?**

A: **dynamicParamType이 필요한 이유** — `paramName`만으로는 **URL에서 몇 개의 세그먼트를 소비해야 하는지** 알 수 없습니다.

`route-params.ts:52-128`에서 타입별 파싱 로직이 완전히 다릅니다:

```ts
switch (paramType) {
  case 'c':   // catchall [...slug] → 나머지 URL 전부 소비
    return pathnameParts.slice(partIndex)
  case 'oc':  // optional catchall [[...slug]] → 0개도 OK → null 반환
    return partIndex < pathnameParts.length
      ? pathnameParts.slice(partIndex) : null
  case 'd':   // dynamic [id] → 정확히 1개만 소비
    return encodeURIComponent(pathnameParts[partIndex])
}
```

예를 들어 `/products/a/b/c` URL에서:
- `[slug]` (`'d'`) → slug = `"a"`, 나머지 `/b/c`는 자식 라우트
- `[...slug]` (`'c'`) → slug = `["a", "b", "c"]`, 전부 소비
- `[[...slug]]` (`'oc'`) → slug = `["a", "b", "c"]` 또는 비어있으면 `null`

**paramName은 `"slug"`로 동일**하지만, 타입이 `'d'`냐 `'c'`냐에 따라 결과가 완전히 다릅니다.

**staticSiblings가 필요한 이유** — 클라이언트의 **prefetch 최적화**(optimistic routing)를 위해서입니다.

예시 — 파일 시스템:
```
/products/[id]/page.tsx      ← 동적 라우트
/products/sale/page.tsx      ← 정적 라우트
```

사용자가 `/products/sale`로 네비게이션할 때, 클라이언트는 이 URL이 `/products/[id]`에 매칭되는지 `/products/sale`에 매칭되는지 판단해야 합니다. `staticSiblings: ["sale"]`이 있으면 → "sale은 정적 라우트가 있으니 [id]로 매칭하지 마"라고 판단 가능.

`optimistic-routes.ts:582-597`:

```ts
if (part.staticChildren === null) {
  return null  // 보수적으로 포기
}

const staticChild = part.staticChildren.get(urlPart)
if (staticChild !== undefined) {
  // 정적 라우트로 매칭 시도
}
// 없으면 → 동적 라우트([id])로 매칭
```

dev 모드에서는 `staticSiblings`가 항상 `null` (`next-app-loader/index.ts:550`):

```ts
const staticSiblingsCode = isDev ? 'null' : `${JSON.stringify(getStaticSiblingSegments(...))}`
```

dev 모드에서는 라우트가 on-demand로 컴파일되므로 전체 형제 목록을 알 수 없어, 보수적으로 서버에 위임.

---

**Q: "dev 모드에서는 라우트가 on-demand로 컴파일되므로 전체 형제 목록을 알 수 없어, 보수적으로 서버에 위임합니다" < 그러면 Dev 모드에서는 의도한대로 라우트 안될수도있겠네요?**

A: **"라우트가 안 된다"는 아닙니다.** `return null`이 의미하는 것은 **optimistic prefetch(사전 예측)를 포기**하는 것이지, 네비게이션 자체가 실패하는 게 아닙니다.

소스의 주석이 정확히 이 시나리오를 설명합니다 (`optimistic-routes.ts:582-596`):

```ts
// If staticChildren is null, we don't know what static routes exist at this
// level. This happens in webpack dev mode where routes are compiled
// on-demand. We can't safely match a dynamicChild because the URL part might
// be a static sibling we haven't discovered yet. Example: We know
// /blog/[slug] exists, but haven't compiled /blog/featured. A request for
// /blog/featured would incorrectly match /blog/[slug].
if (part.staticChildren === null) {
  return null  // ← 매칭 포기, 서버에 위임
}
```

차이는 "속도"입니다:

```
[Production — staticSiblings 있음]
Link hover → prefetch → 캐시에 미리 저장 → 클릭 시 즉시 전환

[Dev — staticSiblings null]
Link hover → prefetch 시도 → optimistic match 실패 → prefetch 포기
클릭 → 서버에 직접 요청 → 응답 대기 → 전환 (약간 느림)
```

라우팅 **결과**는 동일하고, **경험 속도**만 차이. dev 모드에서는 어차피 로컬이라 네트워크 지연이 거의 없으므로 실질적으로 체감하기 어렵습니다.

### 연결 토픽
- Topic 10 (client — App Router Runtime): CacheNode가 실제로 관리되는 라우터 리듀서, SERVER_PATCH 액션 흐름
- Topic 4 (server — App Render): 서버 측에서 FlightData를 생성하는 RSC 렌더링 파이프라인
- Topic 5 (server — Caching System): prefetchRsc와 서버 캐시 레이어의 관계
- Step 2.2 (app-router-context): CacheNode 트리를 공유하는 React Context 구조

---

## 2026-02-17 (재개 — Step 2.2부터)

### 학습 로드맵
- Step 1: 전역 상수 체계 (Constants)
  - [x] 1.1: `shared/lib/constants.ts` — 빌드 페이즈, 매니페스트, 컴파일러 상수
  - [x] 1.2: `lib/constants.ts` — Webpack 레이어, 헤더, 캐시 태그 상수
- Step 2: App Router 타입과 Context
  - [x] 2.1: `app-router-types.ts` — CacheNode, FlightData 타입 구조
  - [x] 2.2: `app-router-context.shared-runtime.ts` — 5개 핵심 React Context
- Step 3: api/ — Public API 진입점
  - [ ] 3.1: api/ 디렉토리 re-export 패턴 — next/dynamic, next/image 등
  - [ ] 3.2: 환경별 API 분리 — navigation.ts vs navigation.react-server.ts
- Step 4: lib/ — 프로젝트 탐색과 번들러 선택
  - [ ] 4.1: find-config, find-root, find-pages-dir — 설정/디렉토리 탐색
  - [ ] 4.2: bundler.ts — Turbopack/Webpack/Rspack 선택 로직
- Step 5: shared/lib/ 핵심 유틸리티
  - [ ] 5.1: dynamic.tsx + loadable — 동적 로딩 구현
  - [ ] 5.2: image-config.ts, magic-identifier.ts — 이미지 설정과 Turbopack 식별자

### 학습 요약
- `app-router-context.shared-runtime.ts`는 5개 React Context를 정의: AppRouterContext, GlobalLayoutRouterContext, LayoutRouterContext, TemplateContext, MissingSlotContext
- AppRouterContext는 네비게이션 API(useRouter() 반환값)만 담당. usePathname/useSearchParams는 별도 파일(`hooks-client-context.shared-runtime.ts`)의 별도 Context — Context 분리 + useMemo로 리렌더링 범위 최소화
- GlobalLayoutRouterContext의 `nextUrl`은 인터셉팅 라우트 구분을 위한 캐시 키 구성요소. 같은 href라도 출발 페이지에 따라 별도 캐시
- LayoutRouterContext는 레이아웃이 중첩될 때마다 **좁아지며(narrows down)** 교체. 자식은 부모의 CacheNode.slots에서 자기 키로 자신의 CacheNode를 조회
- 두 Context 파일의 분리 이유는 설계 원칙이 아닌 **코드 성장 순서**: app-router-context(PR#37238, 2022-05)가 먼저 생성되고, hooks-client-context(PR#37551, 2022-07)가 나중에 추가됨

### 소스 코드 경로
- `ref/next.js/packages/next/src/shared/lib/app-router-context.shared-runtime.ts:65-67` — AppRouterContext 정의
- `ref/next.js/packages/next/src/shared/lib/app-router-context.shared-runtime.ts:68-77` — LayoutRouterContext 정의 (parentCacheNode, parentTree 등)
- `ref/next.js/packages/next/src/shared/lib/app-router-context.shared-runtime.ts:79-84` — GlobalLayoutRouterContext 정의 (tree, nextUrl 등)
- `ref/next.js/packages/next/src/shared/lib/app-router-context.shared-runtime.ts:86` — TemplateContext 정의
- `ref/next.js/packages/next/src/shared/lib/app-router-context.shared-runtime.ts:95` — MissingSlotContext 정의
- `ref/next.js/packages/next/src/shared/lib/hooks-client-context.shared-runtime.ts:7-9` — SearchParamsContext, PathnameContext, PathParamsContext 정의
- `ref/next.js/packages/next/src/client/components/navigation.ts:146-149` — useRouter()가 AppRouterContext를 useContext로 소비
- `ref/next.js/packages/next/src/client/components/navigation.ts:56-59` — useSearchParams()가 SearchParamsContext를 소비
- `ref/next.js/packages/next/src/client/components/app-router.tsx:162-172` — useMemo로 searchParams/pathname 계산
- `ref/next.js/packages/next/src/client/components/app-router.tsx:421-437` — useMemo로 layoutRouterContext value 생성
- `ref/next.js/packages/next/src/client/components/app-router.tsx:439-446` — useMemo로 globalLayoutRouterContext value 생성
- `ref/next.js/packages/next/src/client/components/app-router.tsx:97-103` — useEffect로 nextUrl/tree 변경 시 prefetch 재실행
- `ref/next.js/packages/next/src/client/components/segment-cache/cache-key.ts:9-18` — RouteCacheKey에 nextUrl 포함 (인터셉팅 라우트 캐시 키)
- `ref/next.js/packages/next/src/client/components/layout-router.tsx:373-393` — LayoutRouterContext.Provider (narrows down)
- `ref/next.js/packages/next/src/client/components/layout-router.tsx:551-562` — parentCacheNode.slots에서 자식 CacheNode 조회

### Q&A 전체 기록

#### Step 2.2: `app-router-context.shared-runtime.ts` — 5개 핵심 React Context

**Q: AppRouterInstance인터페이스가 useRouter() 훅의 반환 타입인 이유가 뭘까요? > AppRouterContext라는 이름만 보면 AppRouter에서 사용 가능한 모든 클라이언트 기능들의 컨텍스트처럼 보이는데요,**

A: Next.js는 클라이언트 기능을 **여러 Context로 분리**하고 있습니다. `AppRouterContext`는 "App Router의 **모든 것**"이 아니라 "App Router의 **라우터 인스턴스**"입니다.

`navigation.ts`에서 확인:

```ts
// navigation.ts:146-149
export function useRouter(): AppRouterInstance {
  const router = useContext(AppRouterContext)   // ← AppRouterContext
}

// navigation.ts:56-59
export function useSearchParams(): ReadonlyURLSearchParams {
  const searchParams = useContext(SearchParamsContext)  // ← 별도 Context
}
```

분리한 이유는 **리렌더링 범위 최소화**. URL 경로가 바뀌면 `PathnameContext` 구독 컴포넌트만 리렌더링되고, `useRouter()`만 쓰는 컴포넌트는 영향 없음.

이름은 "AppRouter**Context**"가 아니라 "App**Router**Context" — **라우터 인스턴스**(네비게이션 액션 객체)를 담는 Context로 읽는 게 정확.

---

**Q: nextUrl < 이것의 역할은 뭔가요?**

A: `nextUrl`은 **prefetch 캐시 키 생성**에 쓰이는 "현재 페이지 URL". 핵심 용도는 **인터셉팅 라우트** 구분.

`cache-key.ts:9-18`:

```ts
export type RouteCacheKey = Opaque<'RouteCacheKey', {
  pathname: NormalizedPathname
  search: NormalizedSearch
  nextUrl: NormalizedNextUrl | null   // ← 캐시 키의 일부
}>
```

같은 `/photo/123` 경로라도:
- `/feed`에서 `<Link>`로 네비게이션 → 모달로 인터셉트
- 직접 URL 입력 → 전체 페이지로 렌더링

서버는 "어디서 왔는지"에 따라 다른 결과를 줄 수 있으므로, `nextUrl`이 캐시 키에 포함되어야 같은 href라도 **출발 페이지에 따라 별도 캐시**.

`nextUrl`이 바뀌면 화면에 보이는 `<Link>`들의 prefetch를 다시 실행 (`app-router.tsx:102-103`):

```ts
useEffect(() => {
  pingVisibleLinks(appRouterState.nextUrl, appRouterState.tree)
}, [appRouterState.nextUrl, appRouterState.tree])
```

---

**Q: 부모의 CacheNode와 라우터 상태를 전달 << 그러면 이건 중첩될때마다 CacheNode, 라우터 상태가 계속 쌓이는건가요?**

A: **쌓이는 게 아니라 좁아집니다(narrows down).** `layout-router.tsx:374` 주석:

```ts
// The layout router context narrows down tree and childNodes at each level.
<LayoutRouterContext.Provider
  value={{
    parentTree: tree,           // ← 이 레이아웃의 서브트리
    parentCacheNode: cacheNode, // ← 이 레이아웃의 캐시 노드
  }}
>
```

각 레이아웃은 부모의 Context를 자기 레벨의 데이터로 **교체(replace)**. 비유: 파일 탐색기에서 폴더를 열어 들어가는 것:

```
/app              → CacheNode { slots: {dashboard: ..., settings: ...} }
  /dashboard      → CacheNode { slots: {analytics: ..., profile: ...} }  ← 좁아짐
    /analytics    → CacheNode { slots: ... }                              ← 더 좁아짐
```

전체 트리가 필요한 경우는 `GlobalLayoutRouterContext.tree`(앱 전체에서 1개)로 접근.

---

**Q: SearchParamsContext가 위에서 말한 "5개 Context"에 포함안된건 SearchParamsContext 같은건 use client 전용이 아니라 공용이라 그런가요?**

A: **아닙니다.** `hooks-client-context.shared-runtime.ts`도 `'use client'` 선언이 있습니다. 다른 **파일**에 있는 것이 이유입니다:

```
app-router-context.shared-runtime.ts  ← 5개 (라우터 구조: 트리, 캐시, 슬롯)
hooks-client-context.shared-runtime.ts ← SearchParamsContext, PathnameContext, PathParamsContext
```

```ts
// hooks-client-context.shared-runtime.ts:1-9
'use client'                          // ← 역시 클라이언트 전용
export const SearchParamsContext = createContext<URLSearchParams | null>(null)
export const PathnameContext = createContext<string | null>(null)
export const PathParamsContext = createContext<Params | null>(null)
```

---

**Q: 리렌더링 최적화를 위함이라면 슬라이스한건 이해가되는데, 혹시 각 컨텍스트 내부에도 useMemo등을 이용한 추가 최적화가있나요?**

A: **네, 모든 Context value에 `useMemo`가 적용되어 있습니다.** `app-router.tsx`:

```ts
// :421
const layoutRouterContext = useMemo(() => {
  return { parentTree: tree, parentCacheNode: cache, ... }
}, [tree, cache, canonicalUrl])

// :439
const globalLayoutRouterContext = useMemo(() => {
  return { tree, focusAndScrollRef, nextUrl, previousNextUrl }
}, [tree, focusAndScrollRef, nextUrl, previousNextUrl])
```

2중 최적화 구조: (1) Context **분리** → 구독 범위 제한, (2) Context value에 **`useMemo`** → 불필요한 참조 변경 방지.

---

**Q: <Link>들의 prefetch를 다시 실행 << prefetch인데 useLayoutEffect가 아니라 useEffect인 이유가 뭔가요? 아니면 제가 약간 prefetch는 페인트전이어함 이라는 편견을 가지고있는걸수도있습니다**

A: 주석이 직접 답함 — `app-router.tsx:98-101`:

```ts
useEffect(() => {
  // In most cases, this will not result in any new network requests, only if
  // the prefetch result actually varies on one of these inputs.
  pingVisibleLinks(appRouterState.nextUrl, appRouterState.tree)
}, [appRouterState.nextUrl, appRouterState.tree])
```

prefetch는 **미래 네비게이션을 위한 사전 로딩**이므로 현재 화면 페인트를 막을 이유가 없음. `useLayoutEffect`로 하면 오히려 현재 네비게이션의 페인트가 늦어져 사용자 경험이 나빠짐. 비유: `useLayoutEffect` = "벽을 칠하기 전에 못을 박아야 한다"(블로킹), `useEffect` = "벽을 칠한 후에 다음에 걸 그림을 미리 준비"(백그라운드).

---

**Q: 자기 부모(/dashboard)의 CacheNode << 가 왜필요한가요?**

A: **자기 자신의 CacheNode를 부모의 `slots`에서 꺼내기 위해서.** `layout-router.tsx:551-562`:

```ts
const activeTree = parentTree[1][parallelRouterKey]
const maybeParentSlots = parentCacheNode.slots       // ← 부모의 slots Map
const activeCacheNode = maybeParentSlots![parallelRouterKey] ?? null  // ← 자기 CacheNode 추출
```

CacheNode는 자기 자신을 직접 알지 못하고, 부모의 `slots: Map<string, CacheNode>`에 자식으로 저장되어 있으므로, 부모의 slots를 열어서 자기 키(`parallelRouterKey`)로 조회. parallel routes(`@modal`과 `children`)가 같은 부모 아래 공존하므로 이 구조가 필요.

---

**Q: hooks-client-context.shared-runtime.ts < 이름만 보면 이게 훅인 useRouter()에 대한 Context가 포함되어야할거같네요**

A: 맞는 지적. `useRouter()`도 훅이고 `usePathname()`도 훅인데 Context가 다른 파일에 있는 것은 **역사적 이유(코드 성장 순서)**.

git 이력 확인 결과:
- **PR #37238** (2022-05-29) — `app-router-context.ts` 먼저 생성, `AppRouterContext` 하나만 존재. App Router가 아직 없던 시점의 리팩토링.
- **PR #37551** (2022-07-06) — 새 클라이언트 라우터 구현 시 `hooks-client-context.ts` 신규 생성. `usePathname`, `useSearchParams` 등 새 훅 API의 Context를 여기에 배치.

`AppRouterContext`가 **이미 별도 파일에 존재**하는 상태에서 새 훅들이 추가되었기 때문에, 새 Context는 새 파일에 들어가고 기존 것은 옮기지 않은 것. 설계 원칙이 아닌 코드 성장 순서의 결과.

---

**Q: 확인 한번 해주시겠요? 없으면 없다 말해줘도됩니다**

A: git 이력을 확인한 결과 위와 같이 **설계 문서나 주석은 없고**, 코드 성장 순서가 이유였음.

---

**Q: 솔직히 당신이 예쁘게 포장한거지 별 규칙없이 추가된게 이유군요**

A: 네, 맞습니다. 처음에 "라우터 구조 vs URL 파생값으로 역할 분리"라고 설명한 건 현재 코드 상태를 보고 **사후적으로 패턴을 끼워맞춘 것**이었음. git 이력을 보면 "먼저 있던 파일에 안 옮기고 새 파일에 추가했다"가 전부. 문서나 설명만 보면 모든 구조에 의도가 있는 것처럼 보이지만, 실제로는 시간순으로 쌓인 경우가 많음.

### 연결 토픽
- Topic 10 (client — App Router Runtime): AppRouterContext의 Provider 측 — app-router.tsx에서 라우터 인스턴스 생성/주입 흐름
- Topic 5 (server — Caching System): nextUrl과 인터셉팅 라우트의 서버 측 캐시 분리 메커니즘
- Step 3.1 (api/ re-export): navigation.ts의 useRouter/usePathname이 next/navigation으로 re-export되는 경로

---

## 2026-02-18 (재개 — Step 3.1부터)

### 학습 로드맵
- Step 1: 전역 상수 체계 (Constants)
  - [x] 1.1: `shared/lib/constants.ts` — 빌드 페이즈, 매니페스트, 컴파일러 상수
  - [x] 1.2: `lib/constants.ts` — Webpack 레이어, 헤더, 캐시 태그 상수
- Step 2: App Router 타입과 Context
  - [x] 2.1: `app-router-types.ts` — CacheNode, FlightData 타입 구조
  - [x] 2.2: `app-router-context.shared-runtime.ts` — 5개 핵심 React Context
- Step 3: api/ — Public API 진입점
  - [x] 3.1: api/ 디렉토리 re-export 패턴 — next/dynamic, next/image 등
  - [x] 3.2: 환경별 API 분리 — navigation.ts vs navigation.react-server.ts
- Step 4: lib/ — 프로젝트 탐색과 번들러 선택
  - [ ] 4.1: find-config, find-root, find-pages-dir — 설정/디렉토리 탐색
  - [ ] 4.2: bundler.ts — Turbopack/Webpack/Rspack 선택 로직
- Step 5: shared/lib/ 핵심 유틸리티
  - [ ] 5.1: dynamic.tsx + loadable — 동적 로딩 구현
  - [ ] 5.2: image-config.ts, magic-identifier.ts — 이미지 설정과 Turbopack 식별자

### 학습 요약
- `api/` 디렉토리는 re-export 전용 계층. 모든 파일이 2~3줄의 re-export만 포함하며, `next/dynamic`, `next/image` 등 공개 API의 소스 레벨 진입점 역할
- 3가지 re-export 패턴: default+named(컴포넌트), named만(훅/함수), 여러 소스 합침(`next/headers`가 3개 서버 모듈을 하나로)
- 2단계 alias 시스템: `createNextApiEsmAliases()`가 base 매핑, `createAppRouterApiAliases()`가 App Router 전용 override. Webpack의 `resolve.alias`가 import 경로 문자열을 치환하여 환경별 다른 파일을 제공
- `navigation.react-server.ts`는 Subset 패턴(공용 함수만), `link.react-server.tsx`는 Wrapper 패턴(클라이언트 컴포넌트를 감싸서 서버 전용 검증 추가)
- `next` 패키지는 `exports` 필드 없이 루트 `.js` 파일 + Webpack alias로 환경별 분기 처리. `exports` 미사용 이유에 대한 명시적 설계 문서는 없음

### 소스 코드 경로
- `ref/next.js/packages/next/src/api/navigation.ts:1` — `export * from '../client/components/navigation'` (클라이언트 버전 re-export)
- `ref/next.js/packages/next/src/api/navigation.react-server.ts:1` — `export * from '../client/components/navigation.react-server'` (서버 버전 re-export)
- `ref/next.js/packages/next/src/api/headers.ts:1-3` — 3개 서버 모듈 합침 (cookies, headers, draft-mode)
- `ref/next.js/packages/next/src/api/image.ts:1-2` — default+named export 패턴
- `ref/next.js/packages/next/navigation.js:1` — 루트 shim (`module.exports = require('./dist/client/components/navigation')`)
- `ref/next.js/packages/next/src/build/create-compiler-aliases.ts:203-229` — `createNextApiEsmAliases()` (모든 번들 레이어 공통 base 매핑)
- `ref/next.js/packages/next/src/build/create-compiler-aliases.ts:231-250` — `createAppRouterApiAliases()` (App Router 전용 override, isServerOnlyLayer 분기)
- `ref/next.js/packages/next/src/build/webpack-config.ts:1508-1525` — alias 규칙 적용 순서 (ESM → 서버 override → 클라이언트 override)
- `ref/next.js/packages/next/src/build/webpack-config.ts:699-705` — `react-server` conditionNames 설정
- `ref/next.js/packages/next/src/client/components/navigation.ts:287-301` — 서버 파일의 공용 함수를 re-export (`// Shared components APIs`)
- `ref/next.js/packages/next/src/client/components/navigation.react-server.ts:1-19` — 서버 버전: redirect, notFound 등 환경 무관 함수만 export
- `ref/next.js/packages/next/src/client/app-dir/link.react-server.tsx:1-31` — Wrapper 패턴: 서버 전용 검증 후 클라이언트 Link에 위임
- `ref/next.js/packages/next/src/client/link.tsx:689` — `React.cloneElement(child, childProps)` (legacyBehavior의 핵심 동작)
- `ref/next.js/packages/next/src/client/link.tsx:683` — legacyBehavior deprecated 경고
- `ref/next.js/packages/next/taskfile-ncc.js:78` — exports 필드 패키지의 package.json 해석 문제 주석

### Q&A 전체 기록

#### Step 3.1: api/ 디렉토리 re-export 패턴 — next/dynamic, next/image 등

**Q: import from 'next/navigation' → navigation.js → dist/... ← api/navigation.ts → client/components/navigation.ts << 이 관계도가 이해가 안갑니다**

**Q: 저렇게 베럴 export 하면 트리쉐이킹 문제는 없나요? image쪽은 그렇다쳐도,,**

**Q: mapping['navigation'] < 이게 isServerOnly 조건문 안에서만 할당되는데, server only가 아니면 빈값입니까?**

A: 3개 질문을 함께 답변.

**관계도 수정**: 실제로 2단계 alias 시스템이 있음. `webpack-config.ts:1508-1525`:

```ts
// 1단계: 모든 번들 레이어 공통 (ESM alias)
{ issuerLayer: isWebpackBundledLayer,
  resolve: { alias: createNextApiEsmAliases() }    // navigation → dist/api/navigation
},
// 2단계: 서버 레이어 override
{ issuerLayer: shouldUseReactServerCondition,
  resolve: { alias: createAppRouterApiAliases(true) }  // navigation → dist/api/navigation.react-server
},
// 2단계: 클라이언트 레이어 (navigation override 없음)
{ issuerLayer: isWebpackClientOnlyLayer,
  resolve: { alias: createAppRouterApiAliases(false) }  // navigation 키 없음 → 1단계 유지
},
```

수정된 관계도:

```
import { useRouter } from 'next/navigation'
         │
    Webpack alias가 가로챔
         │
         ├─ 클라이언트 레이어 ─→ dist/api/navigation.js
         │                        └─→ dist/client/components/navigation
         │
         └─ 서버 레이어 ──────→ dist/api/navigation.react-server.js
                                  └─→ dist/client/components/navigation.react-server
```

루트의 `navigation.js`는 번들러 밖에서의 폴백. 번들러 안에서는 alias가 먼저 가로챔.

**트리쉐이킹**: 이 경우 거의 문제 없음. (1) api/ 파일은 자체 코드 0줄의 pass-through, (2) 실제 구현 파일의 export 수가 적음(10여 개), (3) alias가 이미 레이어별로 범위를 좁혀줌. `package.json`에 `sideEffects` 필드는 없지만, Webpack의 `usedExports` 최적화로 충분히 처리.

**mapping['navigation'] 빈값 아님**: 함수가 2개. `createNextApiEsmAliases()`가 모든 레이어에서 `navigation → dist/api/navigation`을 base로 설정. `createAppRouterApiAliases(false)`에서 navigation 키가 없는 건 base를 그대로 쓰겠다는 의미.

---

**Q: Webpack alias가 가로챔 < 어떻게 가로채나요? 또한 여기서 말하는 "가로채다"라는게 정확히 뭘 의미합니까?**

A: Webpack이 `import` 문을 처리할 때, 실제 파일을 디스크에서 찾기 **전에** `resolve.alias` 테이블을 먼저 확인. 매칭되는 키가 있으면 **경로 문자열을 치환**한 후 치환된 경로로 파일을 찾음. "가로채다"는 **경로 문자열 치환**을 의미. `issuerLayer` 조건이 붙으면 "이 레이어에서 import할 때만 치환"하는 조건부 치환.

```
[alias 적용 전]  import from 'next/navigation'
                        │
                   alias 테이블 조회 → 매칭 발견
                        │
[alias 적용 후]  import from 'next/dist/api/navigation'
                        │
                   이 경로로 실제 파일을 찾음
```

---

**Q: 지금 당신 설명을 보면 `createAppRouterApiAliases(false)`에서 navigation 키가 없는 건, 1단계 alias를 그대로 쓰겠다는 의미 < 이 로직이 필요한지 모르겠습니다 그냥 1단계 유지면 별 처리 안하는게 더 깔끔한거 아닌가요?**

A: 설명이 navigation 키에만 초점을 맞춰 오해를 줌. 두 함수의 매핑을 비교하면:

| 키 | 1단계: createNextApiEsmAliases() | 2단계: createAppRouterApiAliases(false) |
|---|---|---|
| **head** | `dist/api/head` | `dist/client/components/noop-head` |
| **dynamic** | `dist/api/dynamic` | `dist/api/app-dynamic` |
| **link** | `dist/api/link` | `dist/client/app-dir/link` |
| **form** | `dist/api/form` | `dist/client/app-dir/form` |
| navigation | `dist/api/navigation` | (없음 → 1단계 유지) |

`createAppRouterApiAliases(false)`는 **navigation 때문이 아니라 head, dynamic, link, form을 App Router 전용 구현으로 override**하기 위해 존재. 예: App Router에서 `next/head`는 noop(Metadata API 사용), `next/dynamic`은 App Router 전용 버전. navigation에 대해서만 override가 불필요.

---

**Q: 왜 오버라이드를 굳이 하는지 궁금하네요, 그냥 depth을 한단계 더 뚫으면 되는거 아닌가요? next/navigation/server or client**

A: `navigation.ts:287-301`이 핵심:

```ts
// Shared components APIs
export {
  notFound, forbidden, unauthorized,
  redirect, permanentRedirect, RedirectType,
  unstable_rethrow,
} from './navigation.react-server'
```

클라이언트 버전이 서버 버전의 공용 함수를 re-export. `redirect()`는 Server Component에서도 Client Component에서도 쓸 수 있는 환경 무관 함수. 경로를 나누면 `redirect()`를 어디서 import할지(`/server`? `/client`? `/shared`?) 3번째 경로까지 필요해지고 개발자가 함수마다 경로를 외워야 함. 현재 방식은 항상 `next/navigation` 하나만 기억하면 됨. React도 같은 패턴 — `import { use } from 'react'`가 서버/클라이언트에서 다른 구현을 제공하지, `react/server`와 `react/client`로 나누지 않음.

---

**Q: shared 로직을 서버 파일에 놓고, client 파일에서 서버 파일에서 가져온다음 re-export한다 << 이렇게 이해하면되나요?**

A: 네, 맞음. 클라이언트 파일이 서버 파일의 상위 집합(superset). 처음에 "서버 환경이 더 제한적이라 거기에 공용 로직을 둔다"고 한 건 이 파일 쌍의 구조적 특징이지 일반 원칙은 아님 — `cookies()`, `headers()` 같은 서버 전용 API는 존재함.

---

**Q: 그러면 이 파일(next/navigation) 한정에서는 "서버에서 사용가능하면 클라이언트에서도 사용가능" << 맞는 말이네요**

A: 네, `next/navigation` 한정으로 맞음. 서버 파일의 모든 export가 클라이언트 파일에서 re-export되므로 서버에서 쓸 수 있는 건 클라이언트에서도 전부 쓸 수 있음.

---

#### Step 3.2: 환경별 API 분리 — navigation.ts vs navigation.react-server.ts

**Q: Next.js의 .react-server.ts 파일은 이 조건을 직접 쓰는 게 아니라 alias 시스템으로 교체 < 왜 안쓸까요?**

**Q: 서버 전용 검증해서 서버 전용이면 어떤 로직있나요?**

A: **왜 `react-server` condition 안 쓰는가**: `next` 패키지의 `package.json`에 `exports` 필드가 아예 없음. `exports`가 있어야 조건부 분기 가능. alias 시스템은 `exports` 조건보다 세밀한 제어 가능 — `react-server`는 이진(서버/클라이언트)이지만 alias는 Webpack 레이어별 다른 매핑 가능. 다만 명시적 설계 문서 없음, 코드 구조에서 추론.

**서버 전용 검증 로직** (`link.react-server.tsx:16-28`): `legacyBehavior && !childIsHostComponent && !childIsClientComponent` 조건에서 `console.error` 경고만 출력하고 정상 렌더링. 에러 throw나 렌더링 차단 아님. 서버 렌더링 시점에서만 `$$typeof === Symbol.for('react.client.reference')` 확인이 가능하므로 서버 파일에 배치.

---

**Q: Q1에 대한 근거를 찾아봐주세요**

A: 소스에서 "왜 exports를 안 쓰는지" 직접 설명하는 주석/문서는 없음. 관련 증거:

- `taskfile-ncc.js:78` — `exports` 필드 패키지에서 `package.json` 해석 문제 겪은 기록: `"some newer packages fail to include package.json in the exports so we can't reliably use require.resolve here"`
- `cache.js` 같은 루트 shim 파일에 deprecation 경고 등 커스텀 로직 포함 — `exports` 필드는 단순 경로 매핑만 가능
- 현재 구조(`files` 배열 + 루트 `.js` + alias)가 이미 동작하므로 전환할 강한 이유 없음

---

**Q: Server Component를 <Link legacyBehavior>의 직접 자식으로 넘기는 경우 < 이게 왜 warn 대상인가요?**

A: 핵심은 `link.tsx:689`:

```tsx
if (legacyBehavior) {
  return React.cloneElement(child, childProps)
}
```

`legacyBehavior` 모드는 `React.cloneElement`로 자식에 href, onClick 등 props를 주입. Server Component는 서버에서 렌더링 후 `$$typeof: Symbol.for('react.client.reference')`라는 불투명한 참조로 전달되므로 `cloneElement`로 props 주입 불가. `legacyBehavior` 자체도 deprecated (`link.tsx:683`).

---

**Q: 그러면 디프리케이트까지 고려하면 최신 app router에서는 저 경고를 볼일이 없을 확률이 높고, 굳이 저 조건문도 필요없겠네요?**

A: 맞음. `legacyBehavior`가 제거되면 `link.react-server.tsx`의 검증 로직 전체가 필요 없어지고, 파일 자체도 불필요해질 수 있음. 현재 코드는 Pages Router → App Router 전환 기간의 호환성 코드.

### 연결 토픽
- Topic 10 (client — App Router Runtime): alias로 선택된 navigation.ts의 useRouter가 실제로 동작하는 라우터 런타임
- Topic 14-16 (build): Webpack alias 시스템이 빌드 파이프라인에서 resolve.alias로 적용되는 전체 흐름
- Step 4.1 (find-config, find-root): api/ 계층이 의존하는 프로젝트 구조 탐색 유틸리티
- Step 4.2 (bundler.ts): alias 시스템이 Turbopack/Webpack/Rspack 중 어떤 번들러에서 동작하는지

---
