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
