# Next.js Source Code & Documentation Study Plan

> Next.js의 소스 코드(ref/next.js)와 공식 문서(ref/next.js/docs)를 주제별로 학습하면서,
> 학습 결과를 바탕으로 `skills/nextjs-aio/`의 기존 참조 문서를 검증·보강한다.

## Current State

- **Skill**: nextjs-aio — 36개 참조 문서 (main 13 + best-practices 23), 패턴/안티패턴 (v16.1.6 기준)
- **Source**: ref/next.js (canary, 16.2.0-canary.37) — 18개 패키지, packages/next/src/ 17개 서브디렉토리
- **Docs**: ref/next.js/docs — 378개 문서 (01-app 221, 02-pages 148, 03-architecture 5, 04-community 3)

## Coverage Analysis

| Status | Module | Skill Target |
|--------|--------|--------------|
| ✅ 커버 | server | `references/server-components.md`, `rendering.md`, `data-fetching.md`, `caching.md`, `proxy.md` |
| ✅ 커버 | client | `references/routing.md`, `server-components.md` |
| ✅ 커버 | build | `references/build-compilation.md` |
| ✅ 커버 | shared | `references/architecture.md` (부분) |
| ✅ 커버 | lib | `references/architecture.md` (부분) |
| ✅ 커버 | api | `references/api-routes.md` |
| ✅ 커버 | export | `references/rendering.md` (부분) |
| ✅ 커버 | experimental | `references/caching.md` (use cache) |
| ✅ 커버 | font | `references/optimization.md` |
| ✅ 커버 | third-parties | `references/optimization.md` (scripts) |
| ⬜ 미커버 | next-devtools (186 files) | 신규 생성 필요 |
| ⬜ 미커버 | cli + bin (12 files) | 신규 생성 필요 |
| ⬜ 미커버 | bundles (62 files) | 신규 생성 필요 |
| ⬜ 미커버 | compiled (704 files) | 신규 생성 필요 (pre-compiled deps) |
| ⬜ 미커버 | telemetry+diagnostics+trace (31 files) | 신규 생성 필요 |
| ⬜ 미커버 | pages (3 files) | 신규 생성 필요 |
| ⬜ 미커버 | next-routing (19 files) | 신규 생성 필요 |
| ⬜ 미커버 | create-next-app (81 files) | 신규 생성 필요 |
| ⬜ 미커버 | next-codemod (502 files) | 신규 생성 필요 |
| ⬜ 미커버 | eslint-plugin-next (26 files) | 신규 생성 필요 |
| ⬜ 미커버 | react-refresh-utils (8 files) | 신규 생성 필요 |
| ⬜ 미커버 | next-mdx (5 files) | 신규 생성 필요 |
| ⬜ 미커버 | eslint-config-next (4 files) | 신규 생성 필요 |
| ⬜ 미커버 | eslint-plugin-internal (4 files) | 신규 생성 필요 |
| ⬜ 미커버 | runtime-utils (3 files) | next-env + polyfill-module + polyfill-nomodule |
| ⬜ 미커버 | build-plugins (6 files) | next-rspack + next-bundle-analyzer + next-plugin-storybook |
| ⬜ 미커버 | next-swc (Rust binary) | 신규 생성 필요 |
| 🔗 고아 ref | — | `references/patterns.md` (교차 관심사) |
| 🔗 고아 ref | — | `references/anti-patterns.md` (교차 관심사) |
| 🔗 고아 ref | — | `references/examples.md` (교차 관심사) |

- **커버율**: 10/27 모듈 (37%)

## Core Principles

- 사용자가 직접 소스를 읽고 학습하며 진행 (AI가 일방적으로 작성하지 않음)
- 주제(토픽) 단위로 소스 + 문서를 묶어서 학습
- 각 토픽 완료 시 해당 스킬 레퍼런스 문서를 검증/개선

## Session Flow (각 토픽마다 반복)

1. 소스 파일 읽기 (사용자 주도, 질의/토론)
2. 공식 문서 교차 확인
3. 스킬 reference 검증 (소스 코드 대조)
4. 최소 개선 (사용자 결정)
5. Study-Skill Verification 테이블 업데이트

---

## Phase 1: Familiar — 사용자가 직접 쓰는 API (8 Topics)

순서는 Phase 내 import 의존 관계 기반. 공식 문서에 직접 대응하는 모듈 우선.

---

### Topic 1: next/src/api ✅ 커버

> Next.js 공개 API 재export 모듈 — `next/navigation`, `next/headers`, `next/image` 등 사용자가 import하는 진입점

**Source Files** (MODULE_MAP에서 추출):

| File | Role |
|------|------|
| `src/api/navigation.ts` | useRouter, usePathname, useSearchParams (client) |
| `src/api/navigation.react-server.ts` | redirect, notFound (server) |
| `src/api/headers.ts` | Headers API |
| `src/api/server.ts` | Server utilities re-export |
| `src/api/image.ts` | Image component |
| `src/api/link.ts` | Link component |
| `src/api/script.ts` | Script component |
| `src/api/form.ts` | Form actions |
| `src/api/og.ts` | Open Graph generation |
| `src/api/dynamic.ts` | Pages router dynamic() |
| `src/api/app-dynamic.ts` | App router dynamic() |
| `src/api/router.ts` | Pages router |
| `src/api/constants.ts` | API constants |

**Study Points** (소스 구조에서 도출):
- 각 API의 re-export 대상 파악 (실제 구현이 server/, client/, shared/ 중 어디에 있는지)
- `navigation.ts` vs `navigation.react-server.ts` — React Server/Client 조건부 export
- `dynamic.ts` vs `app-dynamic.ts` — Pages vs App Router 분기

**Docs**: `01-app/03-api-reference/04-functions/`, `01-app/03-api-reference/02-components/`

**Skill Target**: `references/api-routes.md`

---

### Topic 2: next/src/server — app-render ✅ 커버

> App Router RSC 렌더링 핵심 — Server Component → HTML 변환 파이프라인

**Source Files** (MODULE_MAP에서 추출 — server/app-render/ 하위):

| File | Role |
|------|------|
| `src/server/app-render/app-render.tsx` | RSC 렌더링 메인 엔트리 |
| `src/server/app-render/create-component-tree.tsx` | 컴포넌트 트리 생성 |
| `src/server/app-render/create-server-components-renderer.tsx` | RSC 렌더러 |
| `src/server/app-render/action-handler.ts` | Server Actions 핸들러 |
| `src/server/app-render/dynamic-rendering.ts` | 동적 렌더링 판단 |
| `src/server/app-render/collect-segment-data.tsx` | 세그먼트 데이터 수집 |
| `src/server/app-render/work-unit-async-storage.external.ts` | Async storage |

> 사유: server/ (512 files)를 하위 디렉토리 기준으로 분할 — app-render/는 RSC 렌더링의 핵심

**Study Points** (소스 구조에서 도출):
- app-render.tsx의 렌더링 파이프라인 흐름
- create-component-tree → create-server-components-renderer 관계
- dynamic-rendering.ts의 동적/정적 판단 로직
- action-handler.ts의 Server Actions 처리
- work-unit-async-storage: Request scope 데이터 관리

**Docs**: `01-app/03-api-reference/01-directives/`, `01-app/01-getting-started/`

**Skill Target**: `references/server-components.md`, `references/rendering.md`

---

### Topic 3: next/src/server — route-modules ✅ 커버

> Route Module 시스템 — app-page, app-route, pages 모듈의 요청 처리 분기

**Source Files** (MODULE_MAP에서 추출 — server/route-modules/ 하위):

| File | Role |
|------|------|
| `src/server/route-modules/app-page/module.ts` | App Page 모듈 |
| `src/server/route-modules/app-route/module.ts` | App Route Handler 모듈 |
| `src/server/route-modules/pages/module.ts` | Pages 라우터 모듈 |
| `src/server/route-modules/pages-api/module.ts` | Pages API 라우터 모듈 |
| `src/server/route-modules/helpers/` | 공유 유틸리티 |

> 사유: route-modules/는 라우팅 요청 → 렌더링 분기의 핵심 연결점

**Study Points** (소스 구조에서 도출):
- app-page vs app-route 모듈의 차이 (페이지 렌더링 vs Route Handler)
- 각 모듈의 handle() 메서드 구조
- Pages 라우터와의 공존 구조

**Docs**: `01-app/03-api-reference/03-file-conventions/`

**Skill Target**: `references/routing.md`, `references/api-routes.md`

---

### Topic 4: next/src/server — response-cache & caching ✅ 커버

> 캐싱 레이어 — Response Cache, Incremental Cache, Resume Data Cache

**Source Files** (MODULE_MAP에서 추출 — server/ 캐시 관련):

| File | Role |
|------|------|
| `src/server/response-cache/` | 응답 캐시 레이어 |
| `src/server/resume-data-cache/` | 재개 데이터 캐시 |
| `src/server/lib/incremental-cache/` | Incremental Static Regeneration 캐시 |
| `src/server/lib/incremental-cache/file-system-cache.ts` | 파일 시스템 캐시 백엔드 |

> 사유: server/ 분할 — 캐싱은 독립된 레이어로 별도 학습 가치 있음

**Study Points** (소스 구조에서 도출):
- response-cache/의 캐시 키 생성 및 조회 로직
- incremental-cache/의 ISR 갱신 메커니즘
- file-system-cache.ts의 저장/조회 구현
- resume-data-cache/의 역할 (PPR 관련?)

**Docs**: `01-app/01-getting-started/05-caching-and-revalidating.mdx`, `01-app/02-guides/caching.mdx`

**Skill Target**: `references/caching.md`

---

### Topic 5: next/src/server — proxy & middleware ✅ 커버

> v16+ Proxy 시스템 및 레거시 Middleware — 요청 가로채기/리디렉션

**Source Files** (MODULE_MAP에서 추출):

| File | Role |
|------|------|
| `src/server/web/` | Edge runtime exports, proxy/middleware 실행 |
| `src/server/lib/router-utils/` | 라우터 유틸리티 |
| `src/server/config.ts` | 서버 설정 (proxy 관련 옵션) |

**Study Points** (소스 구조에서 도출):
- v16 proxy.ts vs 레거시 middleware.ts 실행 경로 차이
- web/ 디렉토리의 Edge Runtime 구현
- NextRequest/NextResponse API 구현

**Docs**: `01-app/03-api-reference/03-file-conventions/proxy.mdx`, `middleware.mdx`

**Skill Target**: `references/proxy.md`

---

### Topic 6: next/src/client ✅ 커버

> 클라이언트 런타임 — Hydration, Router, 에러 경계, 페이지 로딩

**Source Files** (MODULE_MAP에서 추출):

| File | Role |
|------|------|
| `src/client/index.tsx` | Pages Router 초기화/하이드레이션 |
| `src/client/app-index.tsx` | App Router 초기화 |
| `src/client/app-next.ts` | App Router 런타임 |
| `src/client/router.ts` | 라우터 생성 |
| `src/client/page-loader.ts` | 동적 페이지 로딩 |
| `src/client/head-manager.ts` | HEAD 태그 관리 |
| `src/client/components/` | 클라이언트 컴포넌트 |
| `src/client/lib/` | 클라이언트 유틸리티 |
| `src/client/form.tsx` | Form 컴포넌트 |
| `src/client/image-component.tsx` | Image 컴포넌트 |

**Study Points** (소스 구조에서 도출):
- index.tsx vs app-index.tsx — Pages vs App Router 하이드레이션 차이
- RouterContext, AppRouterContext, HeadManagerContext 등 Context 구조
- page-loader.ts의 동적 로딩 메커니즘
- components/의 에러 경계, Suspense 경계 구현

**Docs**: `01-app/03-api-reference/02-components/`, `01-app/01-getting-started/`

**Skill Target**: `references/routing.md`, `references/error-handling.md`

---

### Topic 7: font 패키지 ✅ 커버

> next/font — Google Fonts 및 Local Font 로더

**Source Files** (MODULE_MAP에서 추출):

| File | Role |
|------|------|
| `packages/font/src/google/index.ts` | Google Fonts export (자동생성) |
| `packages/font/src/google/loader.ts` | Google Fonts 로더 |
| `packages/font/src/google/fetch-css-from-google-fonts.ts` | CSS 가져오기 |
| `packages/font/src/google/fetch-font-file.ts` | 폰트 파일 다운로드 |
| `packages/font/src/local/index.ts` | Local Font export |
| `packages/font/src/local/loader.ts` | Local Font 로더 |
| `packages/font/src/constants.ts` | 공유 상수 |
| `packages/font/src/types.ts` | 타입 정의 |

**Study Points** (소스 구조에서 도출):
- Google Fonts: CSS fetch → 폰트 파일 다운로드 → 인라인 파이프라인
- Local Fonts: 로컬 파일 → fallback metrics 계산
- 두 로더의 공통 인터페이스
- validation 함수들의 역할

**Docs**: `01-app/03-api-reference/02-components/font.mdx`

**Skill Target**: `references/optimization.md`

---

### Topic 8: third-parties 패키지 + next/src/experimental ✅ 커버

> Third-party 통합 (GA, GTM, YouTube, Maps) 및 실험적 기능 (use cache, testing)

**Source Files** (MODULE_MAP에서 추출):

| File | Role |
|------|------|
| `packages/third-parties/src/google/ga.tsx` | Google Analytics |
| `packages/third-parties/src/google/gtm.tsx` | Google Tag Manager |
| `packages/third-parties/src/google/youtube-embed.tsx` | YouTube 임베드 |
| `packages/third-parties/src/google/google-maps-embed.tsx` | Maps 임베드 |
| `packages/third-parties/src/ThirdPartyScriptEmbed.tsx` | 베이스 스크립트 임베드 |
| `src/experimental/testing/` | 테스트 유틸리티 |
| `src/experimental/testmode/` | 테스트 모드 런타임 |

**Study Points** (소스 구조에서 도출):
- GA/GTM 컴포넌트의 Script 컴포넌트 활용 패턴
- ThirdPartyScriptEmbed의 기반 추상화
- experimental/testing의 테스트 유틸 구조
- use cache 관련 실험적 기능 (caching.md와 연결)

**Docs**: `01-app/03-api-reference/02-components/script.mdx`, `01-app/03-api-reference/01-directives/use-cache.mdx`

**Skill Target**: `references/optimization.md`, `references/caching.md`

---

## Phase 2: Core Runtime — 동작 메커니즘 (7 Topics)

순서는 Phase 내 import 의존 관계 기반. Phase 1 모듈이 직접 import하는 모듈.

---

### Topic 9: next/src/shared ✅ 커버 (부분)

> Server/Client 공유 유틸리티 — Context, Router, Dynamic, Constants

**Source Files** (MODULE_MAP에서 추출):

| File | Role |
|------|------|
| `src/shared/lib/app-router-context.shared-runtime.ts` | AppRouterContext |
| `src/shared/lib/router-context.shared-runtime.ts` | RouterContext |
| `src/shared/lib/hooks-client-context.shared-runtime.ts` | Client hooks context |
| `src/shared/lib/html-context.shared-runtime.ts` | HTML context |
| `src/shared/lib/head-manager-context.shared-runtime.ts` | HeadManager context |
| `src/shared/lib/app-dynamic.tsx` | App Router dynamic() 구현 |
| `src/shared/lib/dynamic.tsx` | Pages Router dynamic() 구현 |
| `src/shared/lib/head.tsx` | Head 컴포넌트 |
| `src/shared/lib/constants.ts` | 공유 상수 |
| `src/shared/lib/router/` | 라우터 유틸리티 |
| `src/shared/lib/errors/` | 에러 타입 정의 |
| `src/shared/lib/segment-cache/` | 세그먼트 캐시 |

**Study Points** (소스 구조에서 도출):
- `*.shared-runtime.ts` 패턴의 의미 (서버/클라이언트 공유 런타임)
- Context 객체들이 server → client로 전달되는 흐름
- app-dynamic.tsx의 React.lazy + Suspense 래핑
- router/ 하위의 라우터 유틸리티 구조
- segment-cache/의 세그먼트 캐싱

**Docs**: `01-app/03-api-reference/04-functions/`

**Skill Target**: `references/architecture.md`

---

### Topic 10: next/src/lib ✅ 커버 (부분)

> 코어 유틸리티 — 파일 시스템, 라우터, 메타데이터, 터보팩 연동

**Source Files** (MODULE_MAP에서 추출 — 136 files):

| File | Role |
|------|------|
| `src/lib/` 루트 파일들 | 코어 유틸리티 |
| `src/lib/metadata/` | 메타데이터 생성/관리 |
| `src/lib/turbopack/` | 터보팩 연동 |

**Study Points** (소스 구조에서 도출):
- metadata/ 하위의 메타데이터 생성 로직
- turbopack/ 하위의 터보팩 런타임 연동
- 주요 export 유틸리티 함수들

**Docs**: `01-app/03-api-reference/04-functions/generate-metadata.mdx`, `01-app/03-api-reference/08-turbopack.mdx`

**Skill Target**: `references/architecture.md`

---

### Topic 11: next/src/server — base-server & config ✅ 커버

> 서버 코어 — Base Server, HTTP 추상화, 서버 설정

**Source Files** (MODULE_MAP에서 추출):

| File | Role |
|------|------|
| `src/server/next.ts` | 서버 진입점 (getServerImpl) |
| `src/server/base-server.ts` | 기본 서버 클래스 |
| `src/server/base-http/` | HTTP 요청/응답 추상화 |
| `src/server/config.ts` | 서버 설정 로딩 |
| `src/server/config-shared.ts` | 공유 설정 |
| `src/server/config-utils.ts` | 설정 유틸리티 |
| `src/server/load-components.ts` | 컴포넌트 로딩 |

> 사유: server/ 분할 — base-server는 모든 서버 모드의 기반

**Study Points** (소스 구조에서 도출):
- next.ts → base-server.ts 초기화 흐름
- base-http/의 Node.js HTTP 추상화 레이어
- config.ts의 next.config.js 로딩/검증 로직
- load-components.ts의 컴포넌트 해결 과정

**Docs**: `01-app/03-api-reference/05-config/`

**Skill Target**: `references/architecture.md`

---

### Topic 12: next/src/server — routing internals ✅ 커버 (부분)

> 라우팅 내부 — Route Matcher, Normalizer, 경로 해석

**Source Files** (MODULE_MAP에서 추출):

| File | Role |
|------|------|
| `src/server/normalizers/` | 경로 정규화 |
| `src/server/route-matchers/` | 라우트 매칭 로직 |
| `src/server/route-matches/` | 매칭 결과 타입 |
| `src/server/lib/router-utils/` | 라우터 유틸리티 |

**Study Points** (소스 구조에서 도출):
- normalizers/의 경로 정규화 규칙 (trailing slash, locale 등)
- route-matchers/의 패턴 매칭 구현
- router-utils/의 라우트 해석 흐름

**Docs**: `01-app/03-api-reference/03-file-conventions/`

**Skill Target**: `references/routing.md`

---

### Topic 13: next/src/build — core ✅ 커버

> 빌드 시스템 코어 — 빌드 오케스트레이션, 엔트리포인트, 매니페스트

**Source Files** (MODULE_MAP에서 추출):

| File | Role |
|------|------|
| `src/build/index.ts` | 빌드 메인 엔트리 |
| `src/build/entries.ts` | 엔트리포인트 생성 |
| `src/build/output/` | 빌드 출력 관리 |
| `src/build/manifests/` | 매니페스트 생성 |
| `src/build/segment-config/` | 세그먼트 설정 |
| `src/build/static-paths/` | 정적 경로 생성 |
| `src/build/file-classifier.ts` | 파일 타입 감지 |
| `src/build/handle-entrypoints.ts` | 엔트리포인트 처리 |
| `src/build/type-check.ts` | TypeScript 체크 |

> 사유: build/ (263 files) 분할 — core는 빌드 오케스트레이션

**Study Points** (소스 구조에서 도출):
- index.ts의 빌드 파이프라인 흐름
- entries.ts의 엔트리포인트 결정 로직
- manifests/의 빌드 매니페스트 종류와 용도
- segment-config/의 세그먼트별 설정 추출

**Docs**: `01-app/03-api-reference/06-cli/`

**Skill Target**: `references/build-compilation.md`

---

### Topic 14: next/src/build — webpack & turbopack ✅ 커버

> 번들러 통합 — Webpack 설정, Turbopack 빌드, SWC 컴파일

**Source Files** (MODULE_MAP에서 추출):

| File | Role |
|------|------|
| `src/build/webpack/` | Webpack 플러그인/로더 |
| `src/build/webpack-build/` | Webpack 빌드 실행 |
| `src/build/webpack-config.ts` | Webpack 설정 생성 |
| `src/build/turbopack-build/` | Turbopack 빌드 |
| `src/build/turbopack-analyze/` | Turbopack 분석 |
| `src/build/swc/` | SWC 컴파일 설정 |
| `src/build/babel/` | Babel 설정 (레거시) |
| `src/build/analyzer/` | 번들 분석 |

> 사유: build/ 분할 — 번들러 통합은 별도 학습 가치

**Study Points** (소스 구조에서 도출):
- webpack-config.ts의 Webpack 설정 생성 로직
- webpack/의 커스텀 플러그인/로더 목록
- turbopack-build/의 Turbopack 빌드 통합
- swc/의 SWC 옵션 구성
- Webpack vs Turbopack 실행 경로 분기점

**Docs**: `01-app/03-api-reference/08-turbopack.mdx`, `03-architecture/nextjs-compiler.mdx`

**Skill Target**: `references/build-compilation.md`

---

### Topic 15: next/src/export + next-routing ⬜ 미커버 (부분)

> 정적 Export 엔진 및 라우팅 유틸리티

**Source Files** (MODULE_MAP에서 추출):

| File | Role |
|------|------|
| `src/export/index.ts` | Export 메인 엔트리 (createStaticWorker 등) |
| `src/export/worker.ts` | Export 워커 구현 |
| `src/export/types.ts` | 타입 정의 |
| `src/export/utils.ts` | Export 유틸리티 |
| `packages/next-routing/src/index.ts` | resolveRoutes, i18n, middleware |
| `packages/next-routing/src/resolve-routes.ts` | 라우트 매칭 엔진 |
| `packages/next-routing/src/i18n.ts` | 국제화 |
| `packages/next-routing/src/middleware.ts` | 미들웨어 유틸리티 |

**Study Points** (소스 구조에서 도출):
- export/: createStaticWorker → worker.ts 정적 페이지 생성 흐름
- next-routing/: resolveRoutes의 라우트 해석 알고리즘
- i18n.ts의 locale 감지/도메인 라우팅
- export와 build의 연동 (static-paths → export)

**Docs**: `01-app/02-guides/static-exports.mdx`, `01-app/02-guides/internationalization.mdx`

**Skill Target**: `references/rendering.md` (static export 부분), 신규 생성 필요 (next-routing)

---

## Phase 3: Infrastructure — 기반 유틸리티 (10 Topics)

순서는 Phase 내 import 의존 관계 기반. Phase 1, 2에서 이미 간단히 다룬 개념들을 심화 학습.

---

### Topic 16: next/src/next-devtools ⬜ 미커버

> Next.js 개발 도구 — Dev Overlay, Inspector, 에러 표시

**Source Files** (MODULE_MAP에서 추출 — 186 files):

| File | Role |
|------|------|
| `src/next-devtools/entrypoint.ts` | DevTools 진입점 |
| `src/next-devtools/dev-overlay/` | 브라우저 Dev Overlay |
| `src/next-devtools/server/` | 서버 사이드 DevTools |
| `src/next-devtools/shared/` | 공유 로직 |
| `src/next-devtools/userspace/` | 사용자 API |

**Study Points** (소스 구조에서 도출):
- dev-overlay/의 에러 UI 컴포넌트 구조
- server/의 에러 감지/전송 로직
- entrypoint.ts의 초기화 흐름

**Docs**: `01-app/02-guides/debugging.mdx`

**Skill Target**: 신규 생성 필요

---

### Topic 17: next/src/server — dev server ⬜ 미커버

> 개발 서버 — HMR, Fast Refresh, 개발 모드 서버

**Source Files** (MODULE_MAP에서 추출):

| File | Role |
|------|------|
| `src/server/dev/` | 개발 서버 구현 |
| `packages/react-refresh-utils/` (8 files) | React Fast Refresh |

**Study Points** (소스 구조에서 도출):
- dev/ 하위의 개발 서버 특화 로직
- react-refresh-utils의 HMR 메커니즘
- 파일 변경 감지 → 리빌드 → HMR 전파 흐름

**Docs**: `03-architecture/fast-refresh.mdx`, `01-app/02-guides/local-development.mdx`

**Skill Target**: 신규 생성 필요

---

### Topic 18: next/src/cli + bin ⬜ 미커버

> CLI 시스템 — next dev, next build, next start 명령 라우팅

**Source Files** (MODULE_MAP에서 추출):

| File | Role |
|------|------|
| `src/bin/next.ts` | CLI 진입점 (1 file, ≤3 그룹핑) |
| `src/cli/` (11 files) | 명령별 핸들러 |

> 사유: bin (1 file) → cli와 그룹핑

**Study Points** (소스 구조에서 도출):
- bin/next.ts의 명령 라우팅 구조
- cli/ 하위의 각 서브커맨드 (dev, build, start, info 등)

**Docs**: `01-app/03-api-reference/06-cli/`

**Skill Target**: 신규 생성 필요

---

### Topic 19: next/src/telemetry + diagnostics + trace ⬜ 미커버

> 관측성 — 텔레메트리, 진단, 트레이싱

**Source Files** (MODULE_MAP에서 추출):

| File | Role |
|------|------|
| `src/telemetry/` (16 files) | 텔레메트리 수집 |
| `src/diagnostics/` (2 files, ≤3 그룹핑) | 에러/경고 진단 |
| `src/trace/` (13 files) | 트레이싱/디버깅 |

> 사유: diagnostics (2 files) → telemetry/trace와 관련 주제로 그룹핑

**Study Points** (소스 구조에서 도출):
- telemetry/의 이벤트 수집/전송 구조
- trace/의 빌드/요청 트레이싱
- diagnostics/의 에러 진단 도우미

**Docs**: `01-app/02-guides/open-telemetry.mdx`, `01-app/02-guides/instrumentation.mdx`

**Skill Target**: 신규 생성 필요

---

### Topic 20: next/src/bundles + compiled ⬜ 미커버

> 번들/프리컴파일 — 외부 의존성 벤더링

**Source Files** (MODULE_MAP에서 추출):

| File | Role |
|------|------|
| `src/bundles/` (62 files) | 번들된 외부 의존성 |
| `src/compiled/` (704 files) | 프리컴파일된 라이브러리 |

**Study Points** (소스 구조에서 도출):
- bundles/의 벤더링 대상과 이유
- compiled/의 주요 프리컴파일 라이브러리 목록
- 벤더링 전략 (왜 외부 dep를 직접 번들하는가)

**Docs**: 해당 없음

**Skill Target**: 신규 생성 필요 (또는 build-compilation.md에 추가)

---

### Topic 21: next/src/pages + eslint 패키지들 ⬜ 미커버

> 레거시 Pages Router 지원 및 ESLint 통합

**Source Files** (MODULE_MAP에서 추출):

| File | Role |
|------|------|
| `src/pages/` (3 files) | Pages Router 지원 |
| `packages/eslint-plugin-next/src/` (26 files) | ESLint 규칙 |
| `packages/eslint-config-next/src/` (4 files) | ESLint 설정 |
| `packages/eslint-plugin-internal/src/` (4 files) | 내부 ESLint 규칙 |

**Study Points** (소스 구조에서 도출):
- pages/의 Pages Router 레거시 지원 범위
- eslint-plugin-next의 규칙 목록과 각 규칙의 검사 대상
- eslint-config-next의 기본 설정 구성

**Docs**: `02-pages/`, `01-app/02-guides/eslint.mdx` (있을 경우)

**Skill Target**: 신규 생성 필요

---

### Topic 22: create-next-app ⬜ 미커버

> 프로젝트 스캐폴딩 CLI

**Source Files** (MODULE_MAP에서 추출 — 81 files):

| File | Role |
|------|------|
| `packages/create-next-app/index.ts` | CLI 진입점 |
| `packages/create-next-app/create-app.ts` | 앱 생성 로직 |
| `packages/create-next-app/helpers/` | 템플릿/설치 헬퍼 |

**Study Points** (소스 구조에서 도출):
- index.ts → create-app.ts 흐름
- helpers/의 템플릿 다운로드/설치 로직
- 사용자 입력 처리 (prompts)

**Docs**: `01-app/01-getting-started/01-installation.mdx`

**Skill Target**: 신규 생성 필요

---

### Topic 23: next-codemod ⬜ 미커버

> 자동 코드 마이그레이션 도구

**Source Files** (MODULE_MAP에서 추출 — 502 files):

| File | Role |
|------|------|
| `packages/next-codemod/bin/` (15 files) | CLI |
| `packages/next-codemod/lib/` (10 files) | 유틸리티 |
| `packages/next-codemod/transforms/` (23 디렉토리) | 코드모드 변환 |

**Study Points** (소스 구조에서 도출):
- transforms/ 디렉토리별 변환 대상과 로직
- jscodeshift 기반 AST 변환 패턴
- 버전별 마이그레이션 경로

**Docs**: `01-app/02-guides/upgrading.mdx`

**Skill Target**: 신규 생성 필요

---

### Topic 24: next-swc ⬜ 미커버

> SWC 네이티브 바인딩 (Rust 바이너리)

**Source Files** (MODULE_MAP에서 추출):

| File | Role |
|------|------|
| `packages/next-swc/` | Rust 네이티브 바인딩 (TS/JS 소스 0) |

**Study Points** (소스 구조에서 도출):
- native/ 디렉토리의 Rust 바인딩 구조
- N-API를 통한 Node.js ↔ Rust 인터페이스
- build/swc/와의 연동 관계

**Docs**: `03-architecture/nextjs-compiler.mdx`

**Skill Target**: 신규 생성 필요

**Checklist**:
- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선

---

### Topic 25: runtime-utils + build-plugins + next-mdx ⬜ 미커버

> 런타임 유틸리티, 빌드 플러그인, MDX 통합

**Source Files** (MODULE_MAP에서 추출):

| File | Role |
|------|------|
| `packages/next-env/` (1 file, 그룹핑) | dotenv 타입 생성 |
| `packages/next-polyfill-module/` (1 file, 그룹핑) | ES 모듈 폴리필 |
| `packages/next-polyfill-nomodule/` (1 file, 그룹핑) | 레거시 폴리필 |
| `packages/next-rspack/` (3 files, 그룹핑) | Rspack 통합 |
| `packages/next-bundle-analyzer/` (2 files, 그룹핑) | 번들 분석 |
| `packages/next-plugin-storybook/` (1 file, 그룹핑) | Storybook 통합 |
| `packages/next-mdx/` (5 files) | MDX 지원 |

> 사유: next-env(1), polyfill-module(1), polyfill-nomodule(1), next-rspack(3), next-bundle-analyzer(2), next-plugin-storybook(1) — 모두 ≤3 files, 관련 주제로 그룹핑

**Study Points** (소스 구조에서 도출):
- next-env의 dotenv 타입 주입
- 폴리필 모듈의 지원 범위
- next-rspack의 Rspack 번들러 통합 (실험적)
- next-bundle-analyzer의 분석 설정
- next-mdx의 MDX 처리 파이프라인

**Docs**: `04-community/02-rspack.mdx`, `01-app/02-guides/mdx.mdx`

**Skill Target**: 신규 생성 필요

---

## Docs Supplementary Study

소스에서 직접 다루지 않은 실용적 가이드/API 레퍼런스:

- `01-app/02-guides/authentication.mdx` — 인증 패턴
- `01-app/02-guides/forms.mdx` — 폼 처리 패턴
- `01-app/02-guides/testing/` — 테스트 프레임워크별 가이드
- `01-app/02-guides/self-hosting.mdx` — 셀프 호스팅
- `01-app/02-guides/caching.mdx` — 캐싱 전략 가이드
- `01-app/02-guides/pwa.mdx` — Progressive Web Apps
- `01-app/03-api-reference/05-config/` — next.config.js 전체 옵션 (80+ 문서)

---

## Files To Modify

| Action | File | Source |
|--------|------|--------|
| Verify/Improve | `skills/nextjs-aio/references/server-components.md` | Topic 2 (app-render) |
| Verify/Improve | `skills/nextjs-aio/references/rendering.md` | Topic 2 (app-render), Topic 15 (export) |
| Verify/Improve | `skills/nextjs-aio/references/routing.md` | Topic 3 (route-modules), Topic 12 (routing internals) |
| Verify/Improve | `skills/nextjs-aio/references/api-routes.md` | Topic 1 (api), Topic 3 (route-modules) |
| Verify/Improve | `skills/nextjs-aio/references/caching.md` | Topic 4 (caching) |
| Verify/Improve | `skills/nextjs-aio/references/proxy.md` | Topic 5 (proxy) |
| Verify/Improve | `skills/nextjs-aio/references/error-handling.md` | Topic 6 (client) |
| Verify/Improve | `skills/nextjs-aio/references/optimization.md` | Topic 7 (font), Topic 8 (third-parties) |
| Verify/Improve | `skills/nextjs-aio/references/architecture.md` | Topic 9 (shared), Topic 10 (lib), Topic 11 (server-core) |
| Verify/Improve | `skills/nextjs-aio/references/build-compilation.md` | Topic 13, 14 (build) |
| Verify/Improve | `skills/nextjs-aio/references/data-fetching.md` | Topic 2 (server actions) |
| Create (신규) | (필요 시 결정) | 미커버 모듈 학습 후 |
| Review (고아) | `skills/nextjs-aio/references/patterns.md` | 교차 관심사 — 삭제/병합 검토 불필요 (의도적 교차 참조) |
| Review (고아) | `skills/nextjs-aio/references/anti-patterns.md` | 교차 관심사 — 삭제/병합 검토 불필요 |
| Review (고아) | `skills/nextjs-aio/references/examples.md` | 교차 관심사 — 삭제/병합 검토 불필요 |

## Topic-Docs Mapping

> 학습 파일 ↔ 토픽 연결. `/learn` 첫 세션 시 자동 등록, `/study-skill` 생성 시 기존 파일 스캔.

| Topic | docs_file |
|-------|-----------|
| Topic 1: next/src/api | Next-Src-Api.md |

## Study-Skill Verification

> `/study-skill` 검증 완료 기록. 토픽별 소스 대조/스킬 개선 완료 시 기록.

| Topic | verified | 변경 파일 |
|-------|----------|----------|

## Verification

- 각 토픽 완료 후: 수정된 레퍼런스 문서의 내용이 소스 코드와 일치하는지 교차 확인
- 전체 완료 후: `bash scripts/check-docs.sh` 실행하여 문서 정합성 검증
