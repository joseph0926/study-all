# Next.js Source Code & Documentation Study Plan

> Next.js의 소스 코드(ref/next.js)와 공식 문서(ref/next.js/docs)를 주제별로 학습하면서,
> 학습 결과를 바탕으로 `skills/nextjs-aio/`의 기존 참조 문서를 검증·보강한다.

## Current State

- **Skill**: nextjs-aio — 36개 참조 문서 (main 13 + best-practices 23), 패턴/안티패턴 (v16.1.6 기준)
- **Source**: ref/next.js (canary, 16.2.0-canary.44) — 34개 모듈 (src/ 17 + packages/ 17), ~2,500+ files
- **Docs**: ref/next.js/docs — 387개 문서 (01-app 230, 02-pages 149, 03-architecture 5, 04-community 3)

## Coverage Analysis

| Status | Module | Files | Skill Target |
|--------|--------|-------|--------------|
| ✅ 커버 | api | 16 | `references/api-routes.md` |
| ✅ 커버 | server (app-render) | 73 | `references/server-components.md`, `rendering.md` |
| ✅ 커버 | server (route-modules) | 58 | `references/routing.md`, `api-routes.md` |
| ✅ 커버 | server (caching: response-cache, resume-data-cache, use-cache, lib/incremental-cache) | 19 | `references/caching.md` |
| ✅ 커버 | server (web) | 36 | `references/proxy.md` |
| ✅ 커버 | server (root + base-http + config) | ~65 | `references/architecture.md` |
| ✅ 커버 | server (normalizers + matchers) | ~79 | `references/routing.md` |
| ✅ 커버 | client | 182 | `references/routing.md`, `error-handling.md`, `optimization.md` |
| ✅ 커버 | build | 263 | `references/build-compilation.md` |
| ✅ 커버 | shared | 160 | `references/architecture.md` |
| ✅ 커버 | lib | 136 | `references/architecture.md` |
| ✅ 커버 | export | 11 | `references/rendering.md` (부분) |
| ✅ 커버 | experimental | 24 | `references/caching.md` (use cache) |
| ✅ 커버 | font (package) | ~31 | `references/optimization.md` |
| ✅ 커버 | third-parties (package) | ~7 | `references/optimization.md` |
| ⬜ 미커버 | server/mcp | 13 | 신규 생성 필요 (NEW — MCP 지원) |
| ⬜ 미커버 | next-devtools | 186 | 신규 생성 필요 |
| ⬜ 미커버 | server/dev | 29 | 신규 생성 필요 |
| ⬜ 미커버 | cli + bin | 12 | 신규 생성 필요 |
| ⬜ 미커버 | telemetry + diagnostics + trace | 31 | 신규 생성 필요 |
| ⬜ 미커버 | bundles + compiled | 767 | 신규 생성 필요 |
| ⬜ 미커버 | pages | 3 | 신규 생성 필요 |
| ⬜ 미커버 | next-routing (package) | ~18 | 신규 생성 필요 |
| ⬜ 미커버 | create-next-app (package) | ~81 | 신규 생성 필요 |
| ⬜ 미커버 | next-codemod (package) | ~502 | 신규 생성 필요 |
| ⬜ 미커버 | next-swc (package) | Rust | 신규 생성 필요 |
| ⬜ 미커버 | eslint-plugin-next + eslint-config-next + eslint-plugin-internal | ~34 | 신규 생성 필요 |
| ⬜ 미커버 | react-refresh-utils (package) | ~8 | 신규 생성 필요 |
| ⬜ 미커버 | next-env + polyfills + rspack + analyzer + storybook + mdx | ~14 | 신규 생성 필요 |
| ⬜ 미커버 | server infrastructure (after, api-utils, async-storage 등) | ~62 | 신규 생성 필요 |
| 🔗 고아 ref | — | — | `references/patterns.md` (교차 관심사) |
| 🔗 고아 ref | — | — | `references/anti-patterns.md` (교차 관심사) |
| 🔗 고아 ref | — | — | `references/examples.md` (교차 관심사) |

- **커버율**: 10/34 모듈 (29%) — 코드 볼륨 기준 ~56%

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

순서는 요청 라이프사이클 기반: 사용자 코드(API 표면) → 브라우저 런타임 → 서버 라우팅 → RSC 렌더링 → 캐싱 → 엣지.

Phase 분류 근거: DOCS_DIR 매칭 (우선순위 1) — 01-app/03-api-reference/의 functions, components, directives, file-conventions 문서와 모듈명이 Grep 매칭.

---

### Topic 1: next/src/api ✅ 커버

> Next.js 공개 API 재export 모듈 — `next/navigation`, `next/headers`, `next/image` 등 사용자가 import하는 진입점

**Source Files** (MODULE_MAP에서 추출 — 16 files):

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
| `src/api/head.ts` | Head component |
| `src/api/document.tsx` | Document component |
| `src/api/app.tsx` | App component |
| `src/api/constants.ts` | API constants |

**Study Points** (소스 구조에서 도출):
- 각 API의 re-export 대상 파악 (실제 구현이 server/, client/, shared/ 중 어디에 있는지)
- `navigation.ts` vs `navigation.react-server.ts` — React Server/Client 조건부 export
- `dynamic.ts` vs `app-dynamic.ts` — Pages vs App Router 분기
- `app.tsx`, `document.tsx`, `head.ts` — Pages Router 전용 API

**Docs**: `01-app/03-api-reference/04-functions/`, `01-app/03-api-reference/02-components/`

**Skill Target**: `references/api-routes.md`

---

### Topic 2: next/src/client ✅ 커버

> 클라이언트 런타임 — Hydration, Router, 에러 경계, Image/Link/Form 컴포넌트

**Source Files** (MODULE_MAP에서 추출 — 182 files):

| File | Role |
|------|------|
| `client/index.tsx` | Pages Router 초기화/하이드레이션 |
| `client/app-index.tsx` | App Router 초기화 |
| `client/app-next.ts` | App Router 런타임 |
| `client/router.ts` | Pages Router 라우터 |
| `client/link.tsx` | Link 컴포넌트 구현 |
| `client/image-component.tsx` | Image 컴포넌트 구현 |
| `client/form.tsx` | Form 컴포넌트 구현 |
| `client/head-manager.ts` | HEAD 태그 관리 |
| `client/flight-data-helpers.ts` | Flight 데이터 헬퍼 |
| `client/app-bootstrap.ts` | App 부트스트랩 |
| `client/components/app-router.tsx` | App Router 메인 컴포넌트 |
| `client/components/layout-router.tsx` | Layout Router 컴포넌트 |
| `client/components/error-boundary.tsx` | 에러 경계 |
| `client/components/redirect-boundary.tsx` | 리다이렉트 경계 |
| `client/components/navigation.ts` | Navigation hooks (useRouter, usePathname 등) |
| `client/components/navigation.react-server.ts` | Server-side navigation |
| `client/components/not-found.ts` | Not Found 처리 |
| `client/components/forbidden.ts` | Forbidden 처리 |
| `client/components/unauthorized.ts` | Unauthorized 처리 |
| `client/components/redirect.ts` | Redirect 처리 |
| `client/components/client-page.tsx` | Client Page 래퍼 |
| `client/components/client-segment.tsx` | Client Segment 래퍼 |
| `client/components/static-generation-bailout.ts` | 정적 생성 탈출 |

> client/ (182 files): root 52 + components 95 + dev 15 + request 6 + app-dir 3 + react-client-callbacks 3 + lib 3 + tracing 2 + compat 1 + legacy 1 + portal 1

**Study Points** (소스 구조에서 도출):
- index.tsx vs app-index.tsx — Pages vs App Router 하이드레이션 차이
- components/app-router.tsx의 App Router 핵심 로직
- components/layout-router.tsx의 레이아웃 중첩 구현
- components/navigation.ts의 useRouter, usePathname, useSearchParams 구현
- components/error-boundary.tsx의 에러 처리 전략
- link.tsx, image-component.tsx, form.tsx의 컴포넌트 구현
- flight-data-helpers.ts의 RSC Flight 데이터 처리
- dev/ (15 files) — 개발 모드 전용 클라이언트 코드

**Docs**: `01-app/03-api-reference/02-components/`, `01-app/01-getting-started/`

**Skill Target**: `references/routing.md`, `references/error-handling.md`, `references/optimization.md`

---

### Topic 3: next/src/server — route-modules ✅ 커버

> Route Module 시스템 — app-page, app-route, pages 모듈의 요청 처리 분기

**Source Files** (MODULE_MAP에서 추출 — server/route-modules/ 58 files):

| File | Role |
|------|------|
| `server/route-modules/route-module.ts` | 기본 Route Module 추상 클래스 |
| `server/route-modules/checks.ts` | 모듈 타입 체크 |
| `server/route-modules/app-page/module.ts` | App Page 모듈 |
| `server/route-modules/app-page/module.render.ts` | App Page 렌더링 |
| `server/route-modules/app-page/helpers/` | App Page 헬퍼 |
| `server/route-modules/app-route/module.ts` | App Route Handler 모듈 |
| `server/route-modules/app-route/helpers/` | Route Handler 헬퍼 (auto-implement-methods, clean-url 등) |
| `server/route-modules/app-route/shared-modules.ts` | 공유 모듈 |
| `server/route-modules/pages/module.ts` | Pages 라우터 모듈 |
| `server/route-modules/pages/module.render.ts` | Pages 렌더링 |
| `server/route-modules/pages/pages-handler.ts` | Pages 핸들러 |
| `server/route-modules/pages-api/module.ts` | Pages API 라우터 모듈 |

**Study Points** (소스 구조에서 도출):
- route-module.ts 추상 클래스의 handle() 인터페이스
- app-page vs app-route 모듈의 차이 (페이지 렌더링 vs Route Handler)
- app-route/helpers/auto-implement-methods.ts — HEAD/OPTIONS 자동 구현
- Pages 라우터와의 공존 구조 (pages/, pages-api/)
- module.compiled.d.ts 파일의 역할 (컴파일 타임 타입)

**Docs**: `01-app/03-api-reference/03-file-conventions/`

**Skill Target**: `references/routing.md`, `references/api-routes.md`

---

### Topic 4: next/src/server — app-render ✅ 커버

> App Router RSC 렌더링 핵심 — Server Component → HTML 변환 파이프라인 (route-module이 호출)

**Source Files** (MODULE_MAP에서 추출 — server/app-render/ 73 files):

| File | Role |
|------|------|
| `server/app-render/app-render.tsx` | RSC 렌더링 메인 엔트리 |
| `server/app-render/create-component-tree.tsx` | 컴포넌트 트리 생성 |
| `server/app-render/create-server-components-renderer.tsx` | RSC 렌더러 생성 |
| `server/app-render/action-handler.ts` | Server Actions 핸들러 |
| `server/app-render/dynamic-rendering.ts` | 동적 렌더링 판단 |
| `server/app-render/collect-segment-data.tsx` | 세그먼트 데이터 수집 |
| `server/app-render/staged-rendering.ts` | 단계적 렌더링 |
| `server/app-render/use-flight-response.tsx` | Flight 응답 처리 |
| `server/app-render/flight-render-result.ts` | Flight 렌더 결과 |
| `server/app-render/encryption.ts` | Server Actions 암호화 |
| `server/app-render/encryption-utils.ts` | 암호화 유틸리티 |
| `server/app-render/postponed-state.ts` | PPR 지연 상태 |
| `server/app-render/work-async-storage.external.ts` | Work async storage |
| `server/app-render/work-unit-async-storage.external.ts` | Work unit async storage |
| `server/app-render/action-async-storage.external.ts` | Action async storage |
| `server/app-render/types.ts` | 타입 정의 |

> 사유: server/ (512 files)를 하위 디렉토리 기준으로 분할 — app-render/는 RSC 렌더링의 핵심 (73 files)

**Study Points** (소스 구조에서 도출):
- app-render.tsx의 렌더링 파이프라인 흐름
- create-component-tree → create-server-components-renderer 관계
- dynamic-rendering.ts의 동적/정적 판단 로직
- action-handler.ts의 Server Actions 처리 (CSRF, 암호화)
- work-async-storage / work-unit-async-storage: Request scope 데이터 관리
- staged-rendering.ts의 단계적 렌더링 (PPR 관련)
- Flight protocol 관련 파일들 (use-flight-response, flight-render-result)

**Docs**: `01-app/03-api-reference/01-directives/`, `01-app/01-getting-started/`

**Skill Target**: `references/server-components.md`, `references/rendering.md`

---

### Topic 5: next/src/server — caching ✅ 커버

> 캐싱 레이어 — Response Cache, Incremental Cache, Resume Data Cache, use-cache

**Source Files** (MODULE_MAP에서 추출):

| File | Role |
|------|------|
| `server/response-cache/index.ts` | 응답 캐시 엔트리 |
| `server/response-cache/types.ts` | 캐시 타입 정의 |
| `server/response-cache/utils.ts` | 캐시 유틸리티 |
| `server/response-cache/web.ts` | Web 캐시 구현 |
| `server/resume-data-cache/resume-data-cache.ts` | Resume 데이터 캐시 |
| `server/resume-data-cache/cache-store.ts` | 캐시 스토어 |
| `server/use-cache/use-cache-wrapper.ts` | use cache 래퍼 |
| `server/use-cache/cache-life.ts` | 캐시 수명 설정 |
| `server/use-cache/cache-tag.ts` | 캐시 태그 |
| `server/use-cache/handlers.ts` | 캐시 핸들러 |
| `server/use-cache/constants.ts` | 캐시 상수 |
| `server/use-cache/use-cache-errors.ts` | 에러 처리 |
| `server/lib/incremental-cache/` (6 files) | ISR 캐시 구현 |
| `server/lib/cache-handlers/` (3 files) | 캐시 핸들러 구현 |

> 사유: server/ 분할 — 캐싱은 독립된 레이어 (response-cache 4 + resume-data-cache 3 + use-cache 6 + lib/incremental-cache 6 + lib/cache-handlers 3 = 22 files)

**Study Points** (소스 구조에서 도출):
- response-cache/의 캐시 키 생성 및 조회 로직
- incremental-cache/의 ISR 갱신 메커니즘
- use-cache/의 `use cache` 디렉티브 구현
- cache-life.ts의 캐시 수명 프로필 (default, minutes, hours, days, weeks, max)
- resume-data-cache/의 역할 (PPR 관련)
- cache-handlers/의 캐시 백엔드 추상화

**Docs**: `01-app/01-getting-started/05-caching-and-revalidating.mdx`, `01-app/02-guides/caching.mdx`, `01-app/03-api-reference/01-directives/use-cache.mdx`

**Skill Target**: `references/caching.md`

---

### Topic 6: next/src/server/web — proxy & edge ✅ 커버

> v16+ Proxy 시스템 및 Edge Runtime — 요청 가로채기/리디렉션, NextRequest/NextResponse

**Source Files** (MODULE_MAP에서 추출 — server/web/ 36 files):

| File | Role |
|------|------|
| `server/web/adapter.ts` | Edge 어댑터 |
| `server/web/edge-route-module-wrapper.ts` | Edge 라우트 모듈 래퍼 |
| `server/web/http.ts` | HTTP 유틸리티 |
| `server/web/next-url.ts` | NextURL 구현 |
| `server/web/globals.ts` | 글로벌 변수 |
| `server/web/error.ts` | 에러 처리 |
| `server/web/internal-edge-wait-until.ts` | waitUntil API |
| `server/web/web-on-close.ts` | onClose 처리 |
| `server/web/types.ts` | 타입 정의 |
| `server/web/utils.ts` | 유틸리티 |
| `server/web/spec-extension/` (16 files) | NextRequest/NextResponse/cookies 확장 |
| `server/web/sandbox/` (6 files) | Edge Runtime 샌드박스 |
| `server/web/exports/` (1 file) | Edge exports |

**Study Points** (소스 구조에서 도출):
- adapter.ts의 Edge Runtime 요청 처리 흐름
- spec-extension/의 NextRequest, NextResponse 확장 API
- sandbox/의 Edge Runtime 격리 실행 환경
- next-url.ts의 URL 파싱/조작
- v16 proxy.ts vs 레거시 middleware.ts 실행 경로 차이
- web-on-close.ts의 응답 종료 후 작업

**Docs**: `01-app/03-api-reference/03-file-conventions/proxy.mdx`, `01-app/03-api-reference/03-file-conventions/middleware.mdx`, `01-app/03-api-reference/07-edge-runtime.mdx`

**Skill Target**: `references/proxy.md`

---

### Topic 7: packages/font ✅ 커버

> next/font — Google Fonts 및 Local Font 로더

**Source Files** (MODULE_MAP에서 추출 — ~31 files):

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

### Topic 8: packages/third-parties + next/src/experimental ✅ 커버

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
- experimental/ 내 실험적 기능 목록

**Docs**: `01-app/03-api-reference/02-components/script.mdx`, `01-app/03-api-reference/01-directives/use-cache.mdx`

**Skill Target**: `references/optimization.md`, `references/caching.md`

---

## Phase 2: Core Runtime — 동작 메커니즘 (8 Topics)

순서는 Phase 내 import 의존 관계 기반. Phase 1 모듈이 직접 import하는 모듈.

Phase 분류 근거: Phase 1 모듈의 import 문에서 1-hop 의존하는 모듈.

---

### Topic 9: next/src/shared ✅ 커버 (부분)

> Server/Client 공유 유틸리티 — Context, Router, Dynamic, Constants

**Source Files** (MODULE_MAP에서 추출 — 160 files, 전부 shared/lib/ 하위):

| File | Role |
|------|------|
| `shared/lib/app-router-context.shared-runtime.ts` | AppRouterContext |
| `shared/lib/router-context.shared-runtime.ts` | RouterContext |
| `shared/lib/hooks-client-context.shared-runtime.ts` | Client hooks context |
| `shared/lib/html-context.shared-runtime.ts` | HTML context |
| `shared/lib/head-manager-context.shared-runtime.ts` | HeadManager context |
| `shared/lib/server-inserted-html.shared-runtime.ts` | Server inserted HTML |
| `shared/lib/app-dynamic.tsx` | App Router dynamic() 구현 |
| `shared/lib/dynamic.tsx` | Pages Router dynamic() 구현 |
| `shared/lib/head.tsx` | Head 컴포넌트 |
| `shared/lib/constants.ts` | 공유 상수 |
| `shared/lib/router/` | 라우터 유틸리티 |
| `shared/lib/errors/` | 에러 타입 정의 |
| `shared/lib/segment-cache/` | 세그먼트 캐시 |

**Study Points** (소스 구조에서 도출):
- `*.shared-runtime.ts` 패턴의 의미 (서버/클라이언트 공유 런타임)
- Context 객체들이 server → client로 전달되는 흐름
- app-dynamic.tsx의 React.lazy + Suspense 래핑
- router/ 하위의 라우터 유틸리티 구조
- segment-cache/의 세그먼트 캐싱
- errors/의 에러 타입 계층 구조

**Docs**: `01-app/03-api-reference/04-functions/`

**Skill Target**: `references/architecture.md`

---

### Topic 10: next/src/lib ✅ 커버 (부분)

> 코어 유틸리티 — 메타데이터, TypeScript, 터보팩 연동, 파일 시스템

**Source Files** (MODULE_MAP에서 추출 — 136 files):

| File | Role |
|------|------|
| `lib/metadata/` (33 files) | 메타데이터 생성/관리 |
| `lib/typescript/` (9 files) | TypeScript 지원 유틸리티 |
| `lib/helpers/` (7 files) | 일반 헬퍼 함수 |
| `lib/memory/` (4 files) | 메모리/성능 유틸리티 |
| `lib/framework/` (2 files) | 프레임워크 초기화 |
| `lib/fs/` (2 files) | 파일 시스템 유틸리티 |
| `lib/` 루트 파일들 (~79 files) | 코어 유틸리티 |

**Study Points** (소스 구조에서 도출):
- metadata/ 하위의 메타데이터 생성 로직 (SEO, OG images, icons)
- typescript/의 TypeScript 지원 (next-typescript 통합)
- helpers/의 일반 유틸리티 함수 목록
- memory/의 메모리 관리 유틸리티
- 주요 export 유틸리티 함수들 (루트 파일)

**Docs**: `01-app/03-api-reference/04-functions/generate-metadata.mdx`, `01-app/03-api-reference/08-turbopack.mdx`

**Skill Target**: `references/architecture.md`

---

### Topic 11: next/src/server — base-server & config ✅ 커버

> 서버 코어 — Base Server, HTTP 추상화, 서버 설정

**Source Files** (MODULE_MAP에서 추출 — root ~55 files + base-http 5 files):

| File | Role |
|------|------|
| `server/next.ts` | 서버 진입점 (getServerImpl) |
| `server/next-server.ts` | 프로덕션 서버 |
| `server/base-server.ts` | 기본 서버 클래스 |
| `server/base-http/` (5 files) | HTTP 요청/응답 추상화 |
| `server/config.ts` | 서버 설정 로딩 |
| `server/config-shared.ts` | 공유 설정 |
| `server/config-schema.ts` | 설정 스키마 검증 |
| `server/config-utils.ts` | 설정 유틸리티 |
| `server/load-components.ts` | 컴포넌트 로딩 |
| `server/load-manifest.external.ts` | 매니페스트 로딩 |
| `server/render.tsx` | Pages Router 렌더링 |
| `server/render-result.ts` | 렌더 결과 |
| `server/image-optimizer.ts` | 이미지 최적화 |
| `server/route-kind.ts` | 라우트 종류 정의 |
| `server/request-meta.ts` | 요청 메타데이터 |
| `server/send-payload.ts` | 응답 전송 |
| `server/send-response.ts` | 응답 전송 |
| `server/serve-static.ts` | 정적 파일 서빙 |
| `server/server-route-utils.ts` | 라우트 유틸리티 |
| `server/server-utils.ts` | 서버 유틸리티 |
| `server/require-hook.ts` | require 훅 |

**Study Points** (소스 구조에서 도출):
- next.ts → base-server.ts 초기화 흐름
- next-server.ts (프로덕션) vs dev 서버 차이
- base-http/의 Node.js HTTP 추상화 레이어
- config.ts의 next.config.js 로딩/검증 로직
- config-schema.ts의 스키마 검증
- load-components.ts의 컴포넌트 해결 과정
- image-optimizer.ts의 이미지 최적화 파이프라인

**Docs**: `01-app/03-api-reference/05-config/`

**Skill Target**: `references/architecture.md`

---

### Topic 12: next/src/server — routing internals ✅ 커버 (부분)

> 라우팅 내부 — Route Matcher, Normalizer, 경로 해석

**Source Files** (MODULE_MAP에서 추출 — ~79 files):

| File | Role |
|------|------|
| `server/normalizers/` (30 files) | 경로 정규화 |
| `server/route-matcher-providers/` (27 files) | 라우트 매칭 전략 |
| `server/route-matchers/` (6 files) | 패턴 매칭 구현 |
| `server/route-matches/` (6 files) | 매칭 결과 타입 |
| `server/route-definitions/` (6 files) | 라우트 정의 구조 |
| `server/route-matcher-managers/` (4 files) | 매칭 관리 |

**Study Points** (소스 구조에서 도출):
- normalizers/의 경로 정규화 규칙 (trailing slash, locale, basePath 등)
- route-matcher-providers/의 다양한 매칭 전략 (app-page, app-route, pages 등)
- route-matchers/의 패턴 매칭 구현
- route-definitions/의 라우트 정의 타입 구조
- route-matcher-managers/의 매칭 오케스트레이션
- server/lib/router-utils/ (20 files)의 라우트 해석 흐름

**Docs**: `01-app/03-api-reference/03-file-conventions/`

**Skill Target**: `references/routing.md`

---

### Topic 13: next/src/build — core ✅ 커버

> 빌드 시스템 코어 — 빌드 오케스트레이션, 엔트리포인트, 매니페스트

**Source Files** (MODULE_MAP에서 추출 — root 38 files + 주요 하위 디렉토리):

| File | Role |
|------|------|
| `build/index.ts` | 빌드 메인 엔트리 |
| `build/entries.ts` | 엔트리포인트 생성 |
| `build/compiler.ts` | 컴파일러 래퍼 |
| `build/webpack-config.ts` | Webpack 설정 생성 (root) |
| `build/handle-entrypoints.ts` | 엔트리포인트 처리 |
| `build/handle-externals.ts` | 외부 모듈 처리 |
| `build/file-classifier.ts` | 파일 타입 감지 |
| `build/type-check.ts` | TypeScript 체크 |
| `build/rendering-mode.ts` | 렌더링 모드 결정 |
| `build/route-discovery.ts` | 라우트 탐색 |
| `build/output/` (4 files) | 빌드 출력 관리 |
| `build/manifests/` (1 file) | 매니페스트 생성 |
| `build/segment-config/` (5 files) | 세그먼트 설정 |
| `build/static-paths/` (8 files) | 정적 경로 생성 |
| `build/templates/` (10 files) | 코드 템플릿 |

> 사유: build/ (263 files) 분할 — core는 빌드 오케스트레이션

**Study Points** (소스 구조에서 도출):
- index.ts의 빌드 파이프라인 흐름
- entries.ts의 엔트리포인트 결정 로직
- webpack-config.ts의 설정 생성 (core 관점)
- manifests/의 빌드 매니페스트 종류와 용도
- segment-config/의 세그먼트별 설정 추출
- static-paths/의 SSG 정적 경로 생성
- rendering-mode.ts의 정적/동적/스트리밍 판단

**Docs**: `01-app/03-api-reference/06-cli/`

**Skill Target**: `references/build-compilation.md`

---

### Topic 14: next/src/build — webpack & turbopack ✅ 커버

> 번들러 통합 — Webpack 설정/플러그인/로더, Turbopack 빌드, SWC 컴파일

**Source Files** (MODULE_MAP에서 추출):

| File | Role |
|------|------|
| `build/webpack/` (135 files) | Webpack 플러그인/로더 |
| `build/webpack-build/` (2 files) | Webpack 빌드 실행 |
| `build/webpack-config-rules/` (1 file) | Webpack 로더 규칙 |
| `build/turbopack-build/` (2 files) | Turbopack 빌드 |
| `build/turbopack-analyze/` (1 file) | Turbopack 분석 |
| `build/turborepo-access-trace/` (6 files) | Turborepo 통합 |
| `build/swc/` (8 files) | SWC 컴파일 설정 |
| `build/babel/` (14 files) | Babel 설정 (레거시) |
| `build/polyfills/` (9 files) | 폴리필 번들 |
| `build/jest/` (6 files) | Jest 설정 |
| `build/analysis/` (4 files) | 빌드 분석 |
| `build/adapter/` (2 files) | 배포 어댑터 |
| `build/next-config-ts/` (2 files) | next.config.ts 지원 |

**Study Points** (소스 구조에서 도출):
- webpack/의 커스텀 플러그인/로더 목록 (135 files)
- webpack-build/의 Webpack 빌드 실행 흐름
- turbopack-build/의 Turbopack 빌드 통합
- swc/의 SWC 옵션 구성
- babel/의 레거시 Babel 호환
- Webpack vs Turbopack 실행 경로 분기점
- polyfills/의 폴리필 빌더

**Docs**: `01-app/03-api-reference/08-turbopack.mdx`, `03-architecture/nextjs-compiler.mdx`

**Skill Target**: `references/build-compilation.md`

---

### Topic 15: next/src/export + packages/next-routing ⬜ 미커버 (부분)

> 정적 Export 엔진 및 라우팅 유틸리티 패키지

**Source Files** (MODULE_MAP에서 추출):

| File | Role |
|------|------|
| `src/export/index.ts` | Export 메인 엔트리 (createStaticWorker 등) |
| `src/export/worker.ts` | Export 워커 구현 |
| `src/export/types.ts` | 타입 정의 |
| `src/export/utils.ts` | Export 유틸리티 |
| `src/export/helpers/` | Export 헬퍼 |
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

### Topic 16: next/src/server/mcp ⬜ 미커버 — NEW

> Model Context Protocol 지원 — IDE/도구 통합을 위한 MCP 서버

**Source Files** (MODULE_MAP에서 추출 — 13 files):

| File | Role |
|------|------|
| `server/mcp/get-mcp-middleware.ts` | MCP 미들웨어 진입점 |
| `server/mcp/get-or-create-mcp-server.ts` | MCP 서버 생성/관리 |
| `server/mcp/mcp-telemetry-tracker.ts` | MCP 텔레메트리 |
| `server/mcp/tools/get-routes.ts` | 라우트 조회 도구 |
| `server/mcp/tools/get-errors.ts` | 에러 조회 도구 |
| `server/mcp/tools/get-logs.ts` | 로그 조회 도구 |
| `server/mcp/tools/get-page-metadata.ts` | 페이지 메타데이터 조회 |
| `server/mcp/tools/get-project-metadata.ts` | 프로젝트 메타데이터 조회 |
| `server/mcp/tools/get-server-action-by-id.ts` | Server Action 조회 |
| `server/mcp/tools/next-instance-error-state.ts` | 인스턴스 에러 상태 |
| `server/mcp/tools/utils/format-errors.ts` | 에러 포맷 유틸 |
| `server/mcp/tools/utils/browser-communication.ts` | 브라우저 통신 유틸 |

**Study Points** (소스 구조에서 도출):
- get-mcp-middleware.ts의 MCP 미들웨어 구현
- get-or-create-mcp-server.ts의 MCP 서버 라이프사이클
- tools/ 디렉토리의 6개 MCP 도구 (routes, errors, logs, metadata, actions)
- mcp-telemetry-tracker.ts의 텔레메트리 수집
- tools/utils/의 브라우저 통신, 에러 포맷 유틸리티

**Docs**: `01-app/02-guides/mcp.mdx`

**Skill Target**: 신규 생성 필요

---

## Phase 3: Infrastructure — 기반 유틸리티 (11 Topics)

순서는 Phase 내 import 의존 관계 기반.
Phase 1, 2에서 이미 간단히 다룬 개념들을 심화 학습.

---

### Topic 17: next/src/next-devtools ⬜ 미커버

> Next.js 개발 도구 — Dev Overlay, Inspector, 에러 표시

**Source Files** (MODULE_MAP에서 추출 — 186 files):

| File | Role |
|------|------|
| `next-devtools/entrypoint.ts` | DevTools 진입점 |
| `next-devtools/dev-overlay/` | 브라우저 Dev Overlay |
| `next-devtools/server/` | 서버 사이드 DevTools |
| `next-devtools/shared/` | 공유 로직 |
| `next-devtools/userspace/` | 사용자 API |

**Study Points** (소스 구조에서 도출):
- dev-overlay/의 에러 UI 컴포넌트 구조
- server/의 에러 감지/전송 로직
- entrypoint.ts의 초기화 흐름
- shared/의 서버-클라이언트 공유 프로토콜

**Docs**: `01-app/02-guides/debugging.mdx`

**Skill Target**: 신규 생성 필요

---

### Topic 18: next/src/server/dev + packages/react-refresh-utils ⬜ 미커버

> 개발 서버 — HMR, Fast Refresh, 개발 모드 서버

**Source Files** (MODULE_MAP에서 추출):

| File | Role |
|------|------|
| `server/dev/` (29 files) | 개발 서버 구현 |
| `packages/react-refresh-utils/runtime.ts` | React Refresh 런타임 |
| `packages/react-refresh-utils/loader.ts` | React Refresh 로더 |
| `packages/react-refresh-utils/ReactRefreshWebpackPlugin.ts` | Webpack 플러그인 |
| `packages/react-refresh-utils/ReactRefreshRspackPlugin.ts` | Rspack 플러그인 |

**Study Points** (소스 구조에서 도출):
- dev/ 하위의 개발 서버 특화 로직
- react-refresh-utils의 HMR 메커니즘
- 파일 변경 감지 → 리빌드 → HMR 전파 흐름
- Webpack vs Rspack 플러그인 구현 차이

**Docs**: `03-architecture/fast-refresh.mdx`, `01-app/02-guides/local-development.mdx`

**Skill Target**: 신규 생성 필요

---

### Topic 19: next/src/cli + bin ⬜ 미커버

> CLI 시스템 — next dev, next build, next start 명령 라우팅

**Source Files** (MODULE_MAP에서 추출):

| File | Role |
|------|------|
| `bin/next.ts` | CLI 진입점 |
| `cli/` (11 files) | 명령별 핸들러 |

> 사유: bin (1 file) → cli와 그룹핑 (총 12 files)

**Study Points** (소스 구조에서 도출):
- bin/next.ts의 명령 라우팅 구조
- cli/ 하위의 각 서브커맨드 (dev, build, start, info 등)

**Docs**: `01-app/03-api-reference/06-cli/`

**Skill Target**: 신규 생성 필요

---

### Topic 20: next/src/telemetry + diagnostics + trace ⬜ 미커버

> 관측성 — 텔레메트리, 진단, 트레이싱

**Source Files** (MODULE_MAP에서 추출):

| File | Role |
|------|------|
| `telemetry/` (16 files) | 텔레메트리 수집 |
| `diagnostics/` (2 files) | 에러/경고 진단 |
| `trace/` (13 files) | 트레이싱/디버깅 |

> 사유: diagnostics (2 files, ≤3) → telemetry/trace와 관련 주제로 그룹핑 (총 31 files)

**Study Points** (소스 구조에서 도출):
- telemetry/의 이벤트 수집/전송 구조
- trace/의 빌드/요청 트레이싱
- diagnostics/의 에러 진단 도우미

**Docs**: `01-app/02-guides/open-telemetry.mdx`, `01-app/02-guides/instrumentation.mdx`

**Skill Target**: 신규 생성 필요

---

### Topic 21: next/src/bundles + compiled ⬜ 미커버

> 번들/프리컴파일 — 외부 의존성 벤더링

**Source Files** (MODULE_MAP에서 추출):

| File | Role |
|------|------|
| `bundles/` (62 files) | 번들된 외부 의존성 |
| `compiled/` (705 files) | 프리컴파일된 라이브러리 |

**Study Points** (소스 구조에서 도출):
- bundles/의 벤더링 대상과 이유
- compiled/의 주요 프리컴파일 라이브러리 목록
- 벤더링 전략 (왜 외부 dep를 직접 번들하는가)

**Docs**: 해당 없음

**Skill Target**: 신규 생성 필요 (또는 build-compilation.md에 추가)

---

### Topic 22: next/src/pages + ESLint 패키지들 ⬜ 미커버

> 레거시 Pages Router 지원 및 ESLint 통합

**Source Files** (MODULE_MAP에서 추출):

| File | Role |
|------|------|
| `pages/` (3 files) | Pages Router 지원 |
| `packages/eslint-plugin-next/src/` (~26 files) | ESLint 규칙 |
| `packages/eslint-config-next/src/` (~4 files) | ESLint 설정 |
| `packages/eslint-plugin-internal/src/` (~4 files) | 내부 ESLint 규칙 |

> 사유: pages (3 files, ≤3) → ESLint 패키지와 관련 주제로 그룹핑 (총 ~37 files)

**Study Points** (소스 구조에서 도출):
- pages/의 Pages Router 레거시 지원 범위
- eslint-plugin-next의 규칙 목록과 각 규칙의 검사 대상
- eslint-config-next의 기본 설정 구성
- eslint-plugin-internal의 내부 전용 규칙

**Docs**: `02-pages/`, `01-app/02-guides/eslint.mdx`

**Skill Target**: 신규 생성 필요

---

### Topic 23: packages/create-next-app ⬜ 미커버

> 프로젝트 스캐폴딩 CLI

**Source Files** (MODULE_MAP에서 추출 — ~81 files):

| File | Role |
|------|------|
| `packages/create-next-app/index.ts` | CLI 진입점 |
| `packages/create-next-app/create-app.ts` | 앱 생성 로직 |
| `packages/create-next-app/helpers/` | 템플릿/설치 헬퍼 |
| `packages/create-next-app/templates/` | 프로젝트 템플릿 |

**Study Points** (소스 구조에서 도출):
- index.ts → create-app.ts 흐름
- helpers/의 템플릿 다운로드/설치 로직
- templates/의 프로젝트 템플릿 종류
- 사용자 입력 처리 (prompts)

**Docs**: `01-app/01-getting-started/01-installation.mdx`

**Skill Target**: 신규 생성 필요

---

### Topic 24: packages/next-codemod ⬜ 미커버

> 자동 코드 마이그레이션 도구

**Source Files** (MODULE_MAP에서 추출 — ~502 files):

| File | Role |
|------|------|
| `packages/next-codemod/bin/` (~15 files) | CLI |
| `packages/next-codemod/lib/` (~10 files) | 유틸리티 |
| `packages/next-codemod/transforms/` (~23 디렉토리) | 코드모드 변환 |

**Study Points** (소스 구조에서 도출):
- transforms/ 디렉토리별 변환 대상과 로직
- jscodeshift 기반 AST 변환 패턴
- 버전별 마이그레이션 경로

**Docs**: `01-app/02-guides/upgrading.mdx`

**Skill Target**: 신규 생성 필요

---

### Topic 25: packages/next-swc ⬜ 미커버

> SWC 네이티브 바인딩 (Rust 바이너리)

**Source Files** (MODULE_MAP에서 추출):

| File | Role |
|------|------|
| `packages/next-swc/` | Rust 네이티브 바인딩 (TS/JS 소스 없음) |

**Study Points** (소스 구조에서 도출):
- native/ 디렉토리의 Rust 바인딩 구조
- N-API를 통한 Node.js ↔ Rust 인터페이스
- build/swc/와의 연동 관계
- crates/ 디렉토리의 Rust 크레이트 구조

**Docs**: `03-architecture/nextjs-compiler.mdx`

**Skill Target**: 신규 생성 필요

---

### Topic 26: runtime-utils + build-plugins + next-mdx ⬜ 미커버

> 런타임 유틸리티, 빌드 플러그인, MDX 통합

**Source Files** (MODULE_MAP에서 추출):

| File | Role |
|------|------|
| `packages/next-env/index.ts` | dotenv 타입 생성 |
| `packages/next-polyfill-module/src/` (1 file) | ES 모듈 폴리필 |
| `packages/next-polyfill-nomodule/src/` (1 file) | 레거시 폴리필 |
| `packages/next-rspack/` (3 files) | Rspack 통합 |
| `packages/next-bundle-analyzer/` (2 files) | 번들 분석 |
| `packages/next-plugin-storybook/` (1 file) | Storybook 통합 |
| `packages/next-mdx/` (5 files) | MDX 지원 |

> 사유: next-env(1), polyfill-module(1), polyfill-nomodule(1), next-rspack(3), next-bundle-analyzer(2), next-plugin-storybook(1) — 모두 ≤3 files, 관련 주제로 그룹핑 (총 ~14 files)

**Study Points** (소스 구조에서 도출):
- next-env의 dotenv 타입 주입
- 폴리필 모듈의 지원 범위
- next-rspack의 Rspack 번들러 통합 (실험적)
- next-bundle-analyzer의 분석 설정
- next-mdx의 MDX 처리 파이프라인

**Docs**: `04-community/02-rspack.mdx`, `01-app/02-guides/mdx.mdx`

**Skill Target**: 신규 생성 필요

---

### Topic 27: next/src/server — infrastructure ⬜ 미커버

> 서버 인프라 — after, api-utils, async-storage, request, node-environment 등

**Source Files** (MODULE_MAP에서 추출):

| File | Role |
|------|------|
| `server/after/` (8 files) | After middleware 기능 |
| `server/api-utils/` (6 files) | API 라우트 유틸리티 |
| `server/async-storage/` (4 files) | Async Context Storage |
| `server/request/` (11 files) | 요청 유틸리티 |
| `server/node-environment-extensions/` (17 files) | Node.js 폴리필/글로벌 |
| `server/typescript/` (10 files) | TypeScript 지원 |
| `server/stream-utils/` (3 files) | 스트림 유틸리티 |
| `server/instrumentation/` (2 files) | Instrumentation hooks |
| `server/og/` (1 file) | OG 이미지 생성 |

> 사유: 개별 디렉토리가 ≤17 files로 작음 — 서버 인프라로 그룹핑 (총 ~62 files)

**Study Points** (소스 구조에서 도출):
- after/의 After middleware 구현 (응답 후 실행)
- async-storage/의 AsyncLocalStorage 래퍼
- node-environment-extensions/의 Node.js 환경 확장
- request/의 요청 처리 유틸리티
- instrumentation/의 계측 훅 구현
- server/lib/server-ipc/ (1 file), module-loader/ (3 files), trace/ (3 files)

**Docs**: `01-app/03-api-reference/04-functions/after.mdx`, `01-app/02-guides/instrumentation.mdx`

**Skill Target**: 신규 생성 필요

---

## Docs Supplementary Study

소스에서 직접 다루지 않은 실용적 가이드/API 레퍼런스:

- `01-app/02-guides/authentication.mdx` — 인증 패턴
- `01-app/02-guides/forms.mdx` — 폼 처리 패턴
- `01-app/02-guides/testing/` — 테스트 프레임워크별 가이드 (Cypress, Jest, Playwright, Vitest)
- `01-app/02-guides/self-hosting.mdx` — 셀프 호스팅
- `01-app/02-guides/caching.mdx` — 캐싱 전략 가이드
- `01-app/02-guides/pwa.mdx` — Progressive Web Apps
- `01-app/03-api-reference/05-config/01-next-config-js/` — next.config.js 전체 옵션 (61개 문서)

---

## Files To Modify

| Action | File | Source |
|--------|------|--------|
| Verify/Improve | `skills/nextjs-aio/references/api-routes.md` | Topic 1 (api), Topic 3 (route-modules) |
| Verify/Improve | `skills/nextjs-aio/references/server-components.md` | Topic 4 (app-render) |
| Verify/Improve | `skills/nextjs-aio/references/rendering.md` | Topic 4 (app-render), Topic 15 (export) |
| Verify/Improve | `skills/nextjs-aio/references/routing.md` | Topic 2 (client), Topic 3 (route-modules), Topic 12 (routing internals) |
| Verify/Improve | `skills/nextjs-aio/references/caching.md` | Topic 5 (caching) |
| Verify/Improve | `skills/nextjs-aio/references/proxy.md` | Topic 6 (proxy & edge) |
| Verify/Improve | `skills/nextjs-aio/references/error-handling.md` | Topic 2 (client) |
| Verify/Improve | `skills/nextjs-aio/references/optimization.md` | Topic 2 (client), Topic 7 (font), Topic 8 (third-parties) |
| Verify/Improve | `skills/nextjs-aio/references/architecture.md` | Topic 9 (shared), Topic 10 (lib), Topic 11 (server-core) |
| Verify/Improve | `skills/nextjs-aio/references/build-compilation.md` | Topic 13, 14 (build) |
| Verify/Improve | `skills/nextjs-aio/references/data-fetching.md` | Topic 4 (server actions), Topic 5 (caching) |
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
