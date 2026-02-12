# Next.js App Router Source Code & Documentation Study Plan

> Next.js 소스 코드(ref/next.js/)와 공식 문서(ref/next.js/docs/)를 주제별로 학습하면서,
> 학습 결과를 바탕으로 `skills/nextjs-aio/`의 기존 참조 문서를 검증·보강한다.

## Current State

- **Skill**: nextjs-aio — 14개 참조 문서 + 22개 best-practices (v16.1.6 기준)
- **Source**: `ref/next.js/` — 18 packages, core `packages/next/src/` (v16.2.0-canary.37)
- **Docs**: `ref/next.js/docs/01-app/` — 221개 파일 (Getting Started 19, Guides 54, API Reference 146)

## Core Principles

- 사용자가 직접 소스를 읽고 학습하며 진행 (AI가 일방적으로 작성하지 않음)
- 주제(토픽) 단위로 소스 + 문서를 묶어서 학습
- 각 토픽 완료 시 해당 스킬 레퍼런스 문서를 검증/개선

## Session Flow (각 토픽마다 반복)

1. 소스 파일 읽기 (사용자 주도, 질의/토론)
2. 공식 문서 교차 확인
3. 스킬 reference 검증 (소스 코드 대조)
4. 최소 개선 (사용자 결정)
5. plan.md 체크리스트 업데이트

---

## Part 1: Source Code Study (11 Topics)

### Topic 1: Architecture — App Router 구조와 파일 컨벤션

**Source Files**:

| File | Role |
|------|------|
| `packages/next/src/server/route-modules/` | 4가지 route module 타입 (app-page, app-route, pages, pages-api) |
| `packages/next/src/server/route-definitions/` | Route definition 스키마 |
| `packages/next/src/server/route-matchers/` | Route 패턴 매칭 |
| `packages/next/src/lib/` | 공유 유틸리티 |
| `packages/next/src/server/next-server.ts` | Production 서버 엔트리 |

**Docs**:
- `01-getting-started/01-installation.mdx`
- `01-getting-started/02-project-structure.mdx`
- `03-api-reference/03-file-conventions/index.mdx`
- `03-api-reference/03-file-conventions/src-folder.mdx`

**Study Points**:
- App Router의 파일 시스템 기반 라우트 해석 과정
- route-modules 4가지 타입의 차이와 역할
- next.config.js/ts 처리 흐름
- 서버 부팅 시퀀스 (next-server.ts → route resolution)

**Skill Target**: `references/architecture.md`

**Checklist**:
- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선

---

### Topic 2: Routing — 라우팅 시스템

**Source Files**:

| File | Role |
|------|------|
| `packages/next/src/server/route-matcher-managers/` | Route 매칭 오케스트레이션 |
| `packages/next/src/server/route-matcher-providers/` | Route 매칭 전략 |
| `packages/next/src/client/components/` | 클라이언트 네비게이션 컴포넌트 |
| `packages/next/src/shared/lib/router/` | 공유 라우터 로직 |
| `packages/next/src/server/app-render/create-flight-router-state-from-loader-tree.ts` | Flight router state 생성 |

**Docs**:
- `01-getting-started/03-layouts-and-pages.mdx`
- `01-getting-started/04-linking-and-navigating.mdx`
- `03-api-reference/03-file-conventions/dynamic-routes.mdx`
- `03-api-reference/03-file-conventions/layout.mdx`
- `03-api-reference/03-file-conventions/parallel-routes.mdx`
- `03-api-reference/03-file-conventions/intercepting-routes.mdx`
- `02-guides/redirecting.mdx`
- `02-guides/prefetching.mdx`

**Study Points**:
- Layout/Page/Template 파일 컨벤션과 렌더 트리 구성
- Dynamic Routes (`[slug]`, `[...slug]`, `[[...slug]]`) 매칭 알고리즘
- Parallel Routes (`@slot`) 동작 원리와 default.tsx 역할
- Intercepting Routes (`(.)`, `(..)`) 패턴 매칭
- 클라이언트 내비게이션 (prefetch, soft/hard navigation)

**Skill Target**: `references/routing.md`

**Checklist**:
- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선

---

### Topic 3: Server Components — RSC 경계와 디렉티브

**Source Files**:

| File | Role |
|------|------|
| `packages/next/src/server/app-render/app-render.tsx` | RSC 렌더링 오케스트레이터 |
| `packages/next/src/server/app-render/create-component-tree.tsx` | 컴포넌트 트리 생성 |
| `packages/next/src/server/app-render/rsc/` | RSC 전용 로직 |
| `packages/next/src/build/swc/` | SWC 디렉티브 파싱 |

**Docs**:
- `01-getting-started/05-server-and-client-components.mdx`
- `03-api-reference/01-directives/use-server.mdx`
- `03-api-reference/01-directives/use-client.mdx`
- `02-guides/data-security.mdx`

**Study Points**:
- 'use client' / 'use server' 디렉티브 처리 과정 (빌드 타임)
- RSC payload (Flight) 직렬화/역직렬화
- Server/Client 컴포넌트 경계에서의 props 전달
- 컴포넌트 트리에서 Server → Client 경계 결정 로직

**Skill Target**: `references/server-components.md`

**Checklist**:
- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선

---

### Topic 4: Rendering — 렌더링 전략

**Source Files**:

| File | Role |
|------|------|
| `packages/next/src/server/app-render/app-render.tsx` | 메인 렌더링 오케스트레이터 |
| `packages/next/src/server/app-render/dynamic-rendering.ts` | Dynamic 렌더링 판단 |
| `packages/next/src/server/app-render/app-render-prerender-utils.ts` | Prerender 유틸리티 |
| `packages/next/src/server/app-render/app-render-render-utils.ts` | Render 유틸리티 |
| `packages/next/src/server/stream-utils/` | Streaming 유틸리티 |

**Docs**:
- `02-guides/static-exports.mdx`
- `02-guides/public-static-pages.mdx`
- `03-api-reference/04-functions/generate-static-params.mdx`
- `03-api-reference/03-file-conventions/loading.mdx`
- `02-guides/incremental-static-regeneration.mdx`

**Study Points**:
- Static vs Dynamic 렌더링 결정 로직 (빌드 타임 분석)
- Streaming SSR 구현 (React Suspense + flush)
- PPR (Partial Prerendering) 동작 원리
- generateStaticParams 처리 흐름
- ISR (Incremental Static Regeneration) 메커니즘

**Skill Target**: `references/rendering.md`

**Checklist**:
- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선

---

### Topic 5: Data Fetching — 데이터 페칭 전략

**Source Files**:

| File | Role |
|------|------|
| `packages/next/src/server/app-render/` | fetch 확장, Server Actions 처리 |
| `packages/next/src/server/after/` | after() hook 구현 |
| `packages/next/src/server/app-render/action-async-storage*` | Server Action async 스토리지 |

**Docs**:
- `01-getting-started/07-fetching-data.mdx`
- `01-getting-started/08-updating-data.mdx`
- `03-api-reference/04-functions/fetch.mdx`
- `03-api-reference/04-functions/cookies.mdx`
- `03-api-reference/04-functions/headers.mdx`
- `02-guides/forms.mdx`

**Study Points**:
- Next.js의 fetch 확장 (cache, revalidate 옵션)
- Server Actions 실행 흐름 (클라이언트 → 서버)
- cookies(), headers() 동적 함수의 async storage 메커니즘
- after() hook으로 응답 후 작업 처리

**Skill Target**: `references/data-fetching.md`

**Checklist**:
- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선

---

### Topic 6: Caching — 캐싱 시스템

**Source Files**:

| File | Role |
|------|------|
| `packages/next/src/server/lib/incremental-cache/` | Incremental cache 구현 (6 파일) |
| `packages/next/src/server/response-cache/` | Response 캐싱 레이어 |
| `packages/next/src/server/resume-data-cache/` | Resume data 영속화 |
| `packages/next/src/server/use-cache/` | 'use cache' 디렉티브 구현 |

**Docs**:
- `01-getting-started/06-cache-components.mdx`
- `01-getting-started/09-caching-and-revalidating.mdx`
- `03-api-reference/01-directives/use-cache.mdx`
- `03-api-reference/04-functions/cacheLife.mdx`
- `03-api-reference/04-functions/cacheTag.mdx`
- `03-api-reference/04-functions/revalidatePath.mdx`
- `03-api-reference/04-functions/revalidateTag.mdx`
- `02-guides/caching.mdx`
- `02-guides/incremental-static-regeneration.mdx`
- `03-api-reference/05-config/01-next-config-js/cacheHandlers.mdx`

**Study Points**:
- 4-layer 캐시 모델 (Request Memoization, Data Cache, Full Route Cache, Router Cache)
- incremental-cache 구현 (file-system-cache, memory-cache)
- 'use cache' 디렉티브와 cacheLife/cacheTag 동작
- revalidatePath/revalidateTag의 캐시 무효화 흐름
- cacheHandlers 커스텀 캐시 백엔드

**Skill Target**: `references/caching.md`

**Checklist**:
- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선

---

### Topic 7: Error Handling — 에러 처리

**Source Files**:

| File | Role |
|------|------|
| `packages/next/src/client/components/` | error.tsx, not-found 클라이언트 컴포넌트 |
| `packages/next/src/server/app-render/create-component-tree.tsx` | 에러 바운더리 삽입 |

**Docs**:
- `01-getting-started/10-error-handling.mdx`
- `03-api-reference/03-file-conventions/error.mdx`
- `03-api-reference/03-file-conventions/not-found.mdx`
- `03-api-reference/03-file-conventions/forbidden.mdx`
- `03-api-reference/03-file-conventions/unauthorized.mdx`
- `03-api-reference/04-functions/not-found.mdx`

**Study Points**:
- error.tsx / global-error.tsx 에러 바운더리 동작
- not-found.tsx / forbidden.tsx / unauthorized.tsx 처리
- 컴포넌트 트리에서 에러 바운더리 삽입 위치
- Server vs Client 에러 처리 차이

**Skill Target**: `references/error-handling.md`

**Checklist**:
- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선

---

### Topic 8: Proxy / Middleware — 요청 가로채기

**Source Files**:

| File | Role |
|------|------|
| `packages/next/src/server/web/` | Edge Runtime / Web API (14 파일) |
| `packages/next/src/server/web/adapter.ts` | Web adapter |
| `packages/next/src/server/web/spec-extension/` | NextRequest/NextResponse 확장 |

**Docs**:
- `01-getting-started/16-proxy.mdx`
- `03-api-reference/03-file-conventions/proxy.mdx`
- `02-guides/custom-server.mdx`

**Study Points**:
- v16+ proxy.ts (Node.js 런타임) vs legacy middleware.ts (Edge 런타임)
- NextRequest / NextResponse API
- 요청 가로채기 → rewrite / redirect / response 수정 흐름
- Edge Runtime vs Node.js Runtime 차이

**Skill Target**: `references/proxy.md`

**Checklist**:
- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선

---

### Topic 9: API Routes — Route Handlers

**Source Files**:

| File | Role |
|------|------|
| `packages/next/src/server/route-modules/app-route/` | App Route module 구현 |
| `packages/next/src/server/web/spec-extension/` | Request/Response 확장 |

**Docs**:
- `01-getting-started/15-route-handlers.mdx`
- `03-api-reference/03-file-conventions/route.mdx`
- `03-api-reference/04-functions/next-request.mdx`
- `03-api-reference/04-functions/next-response.mdx`

**Study Points**:
- route.ts 파일 → app-route module 변환 과정
- GET/POST/PUT/DELETE 등 HTTP 메서드 핸들링
- Static vs Dynamic Route Handler 판단
- Request/Response Web API 활용

**Skill Target**: `references/api-routes.md`

**Checklist**:
- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선

---

### Topic 10: Optimization — 최적화 기능

**Source Files**:

| File | Role |
|------|------|
| `packages/next/src/client/components/` | Image, Script 등 클라이언트 컴포넌트 |
| `packages/font/` | next/font 패키지 |
| `packages/next/src/server/app-render/metadata-insertion/` | SEO 메타데이터 처리 |
| `packages/next/src/server/og/` | OG 이미지 생성 |

**Docs**:
- `01-getting-started/12-images.mdx`
- `01-getting-started/13-fonts.mdx`
- `01-getting-started/14-metadata-and-og-images.mdx`
- `03-api-reference/02-components/image.mdx`
- `03-api-reference/02-components/font.mdx`
- `03-api-reference/02-components/script.mdx`
- `03-api-reference/04-functions/generate-metadata.mdx`
- `02-guides/lazy-loading.mdx`

**Study Points**:
- next/image 최적화 파이프라인 (srcSet, loader, blur placeholder)
- next/font 서브셋 + self-hosting 메커니즘
- Metadata API (generateMetadata, generateViewport) 처리 흐름
- next/script 로딩 전략 (beforeInteractive, afterInteractive, lazyOnload)

**Skill Target**: `references/optimization.md`

**Checklist**:
- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선

---

### Topic 11: Build & Compilation — 빌드 시스템

**Source Files**:

| File | Role |
|------|------|
| `packages/next/src/build/` | 빌드 시스템 전체 (19개 하위 디렉토리) |
| `packages/next/src/build/webpack-build/` | Webpack 빌드 오케스트레이션 |
| `packages/next/src/build/turbopack-build/` | Turbopack 빌드 |
| `packages/next/src/build/manifests/` | 빌드 매니페스트 생성 |
| `packages/next/src/build/segment-config/` | Route segment 설정 분석 |
| `packages/next/src/build/static-paths/` | Static path 생성 |

**Docs**:
- `01-getting-started/17-deploying.mdx`
- `03-api-reference/08-turbopack.mdx`
- `03-api-reference/05-config/01-next-config-js/turbopack.mdx`
- `03-api-reference/05-config/01-next-config-js/output.mdx`
- `02-guides/ci-build-caching.mdx`
- `02-guides/self-hosting.mdx`
- `02-guides/production-checklist.mdx`

**Study Points**:
- 빌드 파이프라인 전체 흐름 (분석 → 번들링 → 매니페스트 → 출력)
- Turbopack vs Webpack 빌드 비교
- RSC 번들링 (서버/클라이언트 번들 분리)
- segment-config에서 static/dynamic 판단
- output: 'standalone' / 'export' 모드 차이

**Skill Target**: `references/build-compilation.md`

**Checklist**:
- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선

---

## Part 2: Docs Supplementary Study

소스 코드 토픽에서 다루지 않은 실용적 가이드:

- `02-guides/authentication.mdx` — 인증 패턴
- `02-guides/internationalization.mdx` — i18n
- `02-guides/environment-variables.mdx` — 환경 변수
- `02-guides/debugging.mdx` — 디버깅
- `02-guides/testing.mdx` — 테스트 전략
- `03-api-reference/02-components/link.mdx` — Link 컴포넌트
- `03-api-reference/02-components/form.mdx` — Form 컴포넌트
- `03-api-reference/04-functions/after.mdx` — after() 함수

---

## Files To Modify

| Action | File |
|--------|------|
| Verify/Improve | `skills/nextjs-aio/references/architecture.md` |
| Verify/Improve | `skills/nextjs-aio/references/routing.md` |
| Verify/Improve | `skills/nextjs-aio/references/server-components.md` |
| Verify/Improve | `skills/nextjs-aio/references/rendering.md` |
| Verify/Improve | `skills/nextjs-aio/references/data-fetching.md` |
| Verify/Improve | `skills/nextjs-aio/references/caching.md` |
| Verify/Improve | `skills/nextjs-aio/references/error-handling.md` |
| Verify/Improve | `skills/nextjs-aio/references/proxy.md` |
| Verify/Improve | `skills/nextjs-aio/references/api-routes.md` |
| Verify/Improve | `skills/nextjs-aio/references/optimization.md` |
| Verify/Improve | `skills/nextjs-aio/references/build-compilation.md` |

## Verification

- 각 토픽 완료 후: 수정된 레퍼런스 문서의 내용이 소스 코드와 일치하는지 교차 확인
- 전체 완료 후: `python scripts/skills_audit.py` 실행하여 메타데이터/링크 정합성 검증
