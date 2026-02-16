# Next.js Source Code & Documentation Study Plan

> Next.js(v16.1.6, canary branch) 소스 코드와 공식 문서를 주제별로 학습하면서,
> 학습 결과를 바탕으로 `skills/nextjs-aio/`의 기존 참조 문서를 검증·보강한다.

## Current State

- **Skill**: nextjs-aio — 14개 주요 참조 문서 + 22개 best-practices 문서 (v16.1.6 기준)
- **Source**: `ref/next.js/` (branch: canary) — 18개 패키지, packages/next/src/ 17개 서브모듈
- **Docs**: `ref/next.js/docs/` — 01-app(224), 02-pages(149), 03-architecture(5), 04-community(3) = 381 mdx files

## Coverage Analysis

| Status | Module (Topic) | Skill Target |
|--------|---------------|--------------|
| ✅ 커버 | shared + lib + api (Foundation) | `references/architecture.md` |
| ✅ 커버 | server — Core Infrastructure | `references/architecture.md` |
| ✅ 커버 | server — Route System | `references/routing.md` |
| ✅ 커버 | server — App Render (RSC Pipeline) | `references/server-components.md`, `references/rendering.md` |
| ✅ 커버 | server — Caching System | `references/caching.md` |
| ✅ 커버 | server — Request & Data Fetching | `references/data-fetching.md`, `references/api-routes.md` |
| ✅ 커버 | server — Proxy & Web Runtime | `references/proxy.md` |
| ✅ 커버 | server — Error Handling & Dev | `references/error-handling.md` |
| ⬜ 미커버 | server — Misc (after, og, mcp, instrumentation, stream-utils, normalizers) | 신규 생성 필요 |
| ✅ 커버 | client — App Router Runtime | `references/routing.md` (client-side) |
| ✅ 커버 | client — Components (Image, Link, Script, Form) | `references/optimization.md` |
| ⬜ 미커버 | client — Dev Overlay | 신규 생성 필요 |
| ⬜ 미커버 | client — Legacy & Pages Router Compat | 스킬 범위 외 (App Router 전용) |
| ✅ 커버 | build — Core Pipeline | `references/build-compilation.md` |
| ✅ 커버 | build — Bundlers (Webpack, Turbopack, SWC) | `references/build-compilation.md` |
| ✅ 커버 | build — Analysis, Manifests & Templates | `references/build-compilation.md` |
| ✅ 커버 | export (Static Export) | `references/rendering.md` |
| ⬜ 미커버 | experimental | 신규 생성 필요 |
| ⬜ 미커버 | cli + bin | 신규 생성 필요 |
| ⬜ 미커버 | diagnostics + telemetry + trace | 신규 생성 필요 |
| ⬜ 미커버 | compiled + bundles (Vendored Deps) | `references/build-compilation.md` (부분) |
| ⬜ 미커버 | next-devtools | 신규 생성 필요 |
| ✅ 커버 | font (next/font) | `references/optimization.md` |
| ✅ 커버 | next-routing | `references/routing.md` |
| ⬜ 미커버 | eslint-config-next + eslint-plugin-next | 신규 생성 필요 |
| ⬜ 미커버 | create-next-app | 신규 생성 필요 |
| ⬜ 미커버 | next-codemod | 신규 생성 필요 |
| ⬜ 미커버 | Small Utilities (next-env, next-mdx, next-rspack 등) | 신규 생성 필요 |

- **커버율**: 16/28 토픽 (57%)
- **고아 refs**: 없음 (patterns.md, anti-patterns.md, examples.md, best-practices/*는 크로스커팅 참조로 특정 모듈에 종속되지 않음)

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

## Part 1: Source Code Study (28 Topics)

### Topic 1: shared + lib + api (Foundation) ✅ 커버

**Source Files** (packages/next/src/):
| Dir | Files | Role |
|-----|-------|------|
| `shared/` | 160 | 공유 타입, 유틸리티 (서버/클라이언트 공통) |
| `lib/` | 136 | 설정 로딩, 유틸리티, 내부 공유 로직 |
| `api/` | 16 | 공개 API surface (next/image, next/link 등 re-export) |

**Study Points** (소스 구조에서 도출):
- shared/lib/: 공유 타입 정의, 상수, 유틸리티 함수
- lib/: next.config 로딩, turbopack/webpack 선택, metadata 유틸
- api/: 각 public API 모듈의 re-export 구조

**Docs**: `docs/01-app/03-api-reference/` 전반

**Skill Target**: `references/architecture.md`

**Checklist**:
- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선

---

### Topic 2: server — Core Infrastructure ✅ 커버

**Source Files** (packages/next/src/server/):
| File | Role |
|------|------|
| `base-server.ts` | 서버 기본 클래스 |
| `next-server.ts` | Node.js 서버 구현 |
| `next.ts` | 서버 팩토리 |
| `config.ts`, `config-shared.ts`, `config-schema.ts`, `config-utils.ts` | 설정 시스템 |
| `load-components.ts` | 컴포넌트 로딩 |
| `render.tsx` | 페이지 렌더링 |
| `render-result.ts` | 렌더링 결과 래퍼 |
| `send-payload.ts`, `send-response.ts` | 응답 전송 |

**Study Points**:
- BaseServer → NextServer 상속 구조
- 요청 처리 파이프라인 (receive → route → render → respond)
- config 스키마 정의 및 검증 흐름
- 컴포넌트 로딩 메커니즘

**Docs**: `docs/01-app/03-api-reference/05-config/`

**Skill Target**: `references/architecture.md`

**Checklist**:
- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선

---

### Topic 3: server — Route System ✅ 커버

**Source Files** (packages/next/src/server/):
| Dir/File | Files | Role |
|----------|-------|------|
| `route-definitions/` | — | 라우트 정의 타입 |
| `route-matchers/` | — | 라우트 매칭 로직 |
| `route-matcher-managers/` | — | 매처 관리자 |
| `route-matcher-providers/` | — | 매처 제공자 |
| `route-modules/` | — | 라우트 모듈 (App Route, Pages Route 등) |
| `route-matches/` | — | 매칭 결과 |
| `route-kind.ts` | 1 | 라우트 종류 enum |
| `server-route-utils.ts` | 1 | 라우트 유틸리티 |

**Study Points**:
- RouteKind enum (APP_PAGE, APP_ROUTE, PAGES 등)
- RouteDefinition → RouteMatcher → RouteMatcherProvider 체인
- RouteModule 시스템 (App Page Module, App Route Module 등)
- 동적 라우트 매칭 알고리즘

**Docs**: `docs/01-app/01-getting-started/02-routing.mdx`, `docs/01-app/02-guides/routing/`

**Skill Target**: `references/routing.md`

**Checklist**:
- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선

---

### Topic 4: server — App Render (RSC Pipeline) ✅ 커버

**Source Files** (packages/next/src/server/app-render/):
| Pattern | Role |
|---------|------|
| `app-render.tsx` | App Router 렌더링 진입점 |
| `create-component-tree.tsx` | 컴포넌트 트리 생성 |
| `create-server-components-renderer.tsx` | RSC 렌더러 |
| `action-handler.ts` | Server Actions 처리 |
| `static-renderer.ts` | 정적 렌더링 |
| `dynamic-rendering.ts` | 동적 렌더링 판별 |
| `work-*.ts` | 작업 단위 관리 |

**Study Points**:
- RSC 렌더링 파이프라인 (서버 → 클라이언트 전달)
- Server Actions 핸들링 메커니즘
- Static vs Dynamic 렌더링 결정 로직
- Streaming SSR 구현
- PPR (Partial Prerendering) 관련 로직

**Docs**: `docs/01-app/01-getting-started/03-server-and-client-components.mdx`, `docs/01-app/02-guides/rendering/`

**Skill Target**: `references/server-components.md`, `references/rendering.md`

**Checklist**:
- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선

---

### Topic 5: server — Caching System ✅ 커버

**Source Files** (packages/next/src/server/):
| Dir/File | Role |
|----------|------|
| `use-cache/` | `use cache` directive 구현 |
| `response-cache/` | HTTP 응답 캐싱 |
| `resume-data-cache/` | 재개 데이터 캐시 |
| `cache-dir.ts` | 캐시 디렉토리 관리 |
| `revalidation-utils.ts` | revalidate 유틸리티 |

**Study Points**:
- use-cache directive 동작 원리
- Response Cache 계층 구조
- Resume Data Cache (PPR 관련)
- Revalidation 메커니즘 (time-based, on-demand)

**Docs**: `docs/01-app/02-guides/caching-and-revalidating.mdx`

**Skill Target**: `references/caching.md`

**Checklist**:
- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선

---

### Topic 6: server — Request & Data Fetching ✅ 커버

**Source Files** (packages/next/src/server/):
| Dir/File | Role |
|----------|------|
| `request/` | NextRequest/NextResponse 구현 |
| `request-meta.ts` | 요청 메타데이터 |
| `api-utils/` | API 라우트 유틸리티 |
| `async-storage/` | AsyncLocalStorage 래퍼 |
| `internal-utils.ts` | 내부 유틸리티 |

**Study Points**:
- NextRequest/NextResponse API
- AsyncLocalStorage를 통한 요청 컨텍스트 전달
- API Route 핸들러 실행 흐름
- fetch 확장 및 캐시 제어

**Docs**: `docs/01-app/01-getting-started/04-fetching-data.mdx`, `docs/01-app/02-guides/data-fetching/`

**Skill Target**: `references/data-fetching.md`, `references/api-routes.md`

**Checklist**:
- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선

---

### Topic 7: server — Proxy & Web Runtime ✅ 커버

**Source Files** (packages/next/src/server/):
| Dir/File | Role |
|----------|------|
| `web/` | Edge/Web 런타임 서버 구현 |
| `web/adapter.ts` | Web API 어댑터 |
| `web/sandbox/` | Edge 런타임 샌드박스 |

**Study Points**:
- Proxy (v16+) vs Middleware (legacy) 아키텍처
- Edge Runtime 구현 (Web API 기반)
- NextRequest/NextResponse 흐름 in proxy
- Node.js vs Edge 런타임 차이

**Docs**: `docs/01-app/03-api-reference/02-file-conventions/proxy.mdx`

**Skill Target**: `references/proxy.md`

**Checklist**:
- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선

---

### Topic 8: server — Error Handling & Dev ✅ 커버

**Source Files** (packages/next/src/server/):
| Dir/File | Role |
|----------|------|
| `dev/` | 개발 서버 (HMR, 에러 오버레이 등) |
| `patch-error-inspect.ts` | 에러 스택 트레이스 개선 |
| `create-deduped-by-callsite-server-error-logger.ts` | 서버 에러 로깅 |
| `typescript/` | TypeScript 플러그인 |

**Study Points**:
- error.tsx, not-found.tsx 에러 바운더리 동작
- 개발 서버 HMR 파이프라인
- 에러 오버레이 소스맵 처리
- TypeScript 플러그인 (자동 타입 체크)

**Docs**: `docs/01-app/01-getting-started/05-error-handling.mdx`

**Skill Target**: `references/error-handling.md`

**Checklist**:
- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선

---

### Topic 9: server — Misc (after, og, mcp, instrumentation) ⬜ 미커버

**Source Files** (packages/next/src/server/):
| Dir/File | Role |
|----------|------|
| `after/` | after() API (응답 후 실행) |
| `og/` | Open Graph 이미지 생성 |
| `mcp/` | Model Context Protocol |
| `instrumentation/` | Instrumentation hook |
| `stream-utils/` | 스트리밍 유틸리티 |
| `normalizers/` | URL/경로 정규화 |
| `node-environment-extensions/` | Node.js 환경 확장 |

**Study Points**:
- after() API: 응답 전송 후 비동기 작업 실행
- OG Image generation 파이프라인
- MCP endpoint (/_next/mcp)
- Instrumentation hook (register, onRequestError)
- 스트리밍 유틸리티 구현

**Docs**: `docs/01-app/03-api-reference/03-functions/after.mdx`, `docs/01-app/03-api-reference/02-file-conventions/instrumentation.mdx`

**Skill Target**: 신규 생성 필요

**Checklist**:
- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선

---

### Topic 10: client — App Router Runtime ✅ 커버

**Source Files** (packages/next/src/client/):
| Dir/File | Role |
|----------|------|
| `app-dir/` | App Router 클라이언트 구현 |
| `app-index.tsx` | App Router 엔트리 |
| `app-bootstrap.ts` | App 부트스트랩 |
| `app-call-server.ts` | Server Actions 클라이언트 호출 |
| `app-next.ts` | App Router next 객체 |
| `flight-data-helpers.ts` | RSC Flight 데이터 헬퍼 |

**Study Points**:
- App Router 클라이언트 부트스트랩 과정
- RSC Flight 프로토콜 클라이언트 처리
- Server Actions 클라이언트 → 서버 호출
- 클라이언트 사이드 네비게이션

**Docs**: `docs/01-app/02-guides/routing/linking-and-navigating.mdx`

**Skill Target**: `references/routing.md` (client-side sections)

**Checklist**:
- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선

---

### Topic 11: client — Components (Image, Link, Script, Form) ✅ 커버

**Source Files** (packages/next/src/client/):
| File | Role |
|------|------|
| `image-component.tsx` | next/image 컴포넌트 |
| `link.tsx` | next/link 컴포넌트 |
| `script.tsx` | next/script 컴포넌트 |
| `form.tsx` | next/form 컴포넌트 |
| `components/` | 내부 컴포넌트 (에러 바운더리, 레이아웃 라우터 등) |
| `head-manager.ts` | Head 메타데이터 관리 |

**Study Points**:
- Image 컴포넌트: srcSet 생성, lazy loading, blur placeholder
- Link 컴포넌트: prefetch 전략, soft/hard navigation
- Script 컴포넌트: beforeInteractive/afterInteractive/lazyOnload
- Form 컴포넌트: 프로그레시브 향상

**Docs**: `docs/01-app/03-api-reference/01-components/`

**Skill Target**: `references/optimization.md`

**Checklist**:
- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선

---

### Topic 12: client — Dev Overlay ⬜ 미커버

**Source Files** (packages/next/src/client/dev/):
| Pattern | Role |
|---------|------|
| `error-overlay/` | 에러 오버레이 UI |
| `hot-middleware-client.ts` | HMR 클라이언트 |
| `dev-build-watcher.ts` | 빌드 감시기 |

**Study Points**:
- 에러 오버레이 렌더링 및 소스맵 매핑
- HMR WebSocket 프로토콜
- 컴파일 상태 표시

**Docs**: 해당 없음 (내부 구현)

**Skill Target**: 신규 생성 필요 (선택적 — 프레임워크 사용자 관점에서 낮은 우선순위)

**Checklist**:
- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선

---

### Topic 13: client — Legacy & Pages Router Compat + pages ⬜ 미커버

**Source Files**:
| Dir/File | Files | Role |
|----------|-------|------|
| `client/legacy/` | — | Pages Router 클라이언트 |
| `client/router.ts` | 1 | Pages Router 라우터 |
| `client/page-loader.ts` | 1 | 페이지 로더 |
| `client/page-bootstrap.ts` | 1 | Pages 부트스트랩 |
| `pages/` | 3 | Pages Router 서버 엔트리 |

**Study Points**:
- Pages Router 클라이언트 동작 (legacy 모드)
- getServerSideProps/getStaticProps 클라이언트 데이터 로딩
- Pages Router → App Router 마이그레이션 포인트

**Docs**: `docs/02-pages/`

**Skill Target**: 스킬 범위 외 (App Router 전용 스킬). 마이그레이션 맥락에서만 참조.

**Checklist**:
- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선

---

### Topic 14: build — Core Pipeline ✅ 커버

**Source Files** (packages/next/src/build/):
| File | Role |
|------|------|
| `index.ts` | 빌드 메인 진입점 |
| `compiler.ts` | 컴파일러 생성 |
| `entries.ts` | 엔트리포인트 수집 |
| `webpack-config.ts` | Webpack 설정 생성 |
| `build-context.ts` | 빌드 컨텍스트 |
| `handle-entrypoints.ts` | 엔트리포인트 처리 |
| `handle-externals.ts` | 외부 패키지 처리 |
| `worker.ts` | 빌드 워커 |

**Study Points**:
- 빌드 파이프라인: 설정 → 엔트리 수집 → 컴파일 → 최적화 → 출력
- Webpack/Turbopack 설정 생성 로직
- Externals 처리 (서버 번들 최적화)
- 빌드 워커 (병렬 처리)

**Docs**: `docs/03-architecture/nextjs-compiler.mdx`

**Skill Target**: `references/build-compilation.md`

**Checklist**:
- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선

---

### Topic 15: build — Bundlers (Webpack, Turbopack, SWC) ✅ 커버

**Source Files** (packages/next/src/build/):
| Dir | Role |
|-----|------|
| `webpack/` | Webpack 플러그인/로더 |
| `webpack-build/` | Webpack 빌드 실행 |
| `webpack-config-rules/` | Webpack 규칙 정의 |
| `turbopack-analyze/` | Turbopack 분석 |
| `turbopack-build/` | Turbopack 빌드 |
| `swc/` | SWC 트랜스파일러 설정 |

**Study Points**:
- Webpack vs Turbopack 선택 로직
- Next.js 전용 Webpack 플러그인 목록 및 역할
- SWC 트랜스폼 옵션 (RSC 변환, 서버 액션 등)
- Turbopack 빌드 파이프라인

**Docs**: `docs/03-architecture/nextjs-compiler.mdx`

**Skill Target**: `references/build-compilation.md`

**Checklist**:
- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선

---

### Topic 16: build — Analysis, Manifests & Templates ✅ 커버

**Source Files** (packages/next/src/build/):
| Dir | Role |
|-----|------|
| `analysis/` | 코드 분석 |
| `analyze/` | 번들 분석 |
| `manifests/` | 빌드 매니페스트 생성 |
| `templates/` | 엔트리 템플릿 |
| `static-paths/` | 정적 경로 수집 |
| `segment-config/` | 세그먼트 설정 파싱 |
| `output/` | 출력 파일 관리 |

**Study Points**:
- 빌드 매니페스트 구조 (build-manifest, routes-manifest 등)
- 엔트리 템플릿 (app-page, app-route 등)
- 정적 경로 수집 (generateStaticParams)
- 세그먼트 설정 추출 (dynamic, revalidate 등)

**Docs**: `docs/01-app/03-api-reference/02-file-conventions/`

**Skill Target**: `references/build-compilation.md`

**Checklist**:
- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선

---

### Topic 17: export (Static Export) ✅ 커버

**Source Files** (packages/next/src/export/):
| File | Role |
|------|------|
| `index.ts` | 정적 내보내기 진입점 |
| `helpers/` | 내보내기 헬퍼 |
| `routes/` | 라우트별 내보내기 |
| `worker.ts` | 내보내기 워커 |

**Study Points**:
- output: 'export' 설정 시 동작 흐름
- 정적 HTML 생성 파이프라인
- 동적 라우트의 정적 내보내기 처리

**Docs**: `docs/01-app/02-guides/static-exports.mdx`

**Skill Target**: `references/rendering.md`

**Checklist**:
- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선

---

### Topic 18: experimental ⬜ 미커버

**Source Files** (packages/next/src/experimental/):
| Pattern | Role |
|---------|------|
| `*.ts`, `*.tsx` | 실험적 API |

**Study Points**:
- 실험적 기능 목록 (디렉토리 구조에서 추출)
- 각 기능의 안정화 상태
- next.config experimental 플래그와의 연결

**Docs**: `docs/01-app/03-api-reference/05-config/01-next-config-js/` (experimental 섹션)

**Skill Target**: 신규 생성 필요 (또는 기존 references에 실험적 기능 섹션 추가)

**Checklist**:
- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선

---

### Topic 19: cli + bin (CLI) ⬜ 미커버

> 그룹핑 사유: bin 1파일 + cli 11파일 = 12파일, 관련 기능 통합

**Source Files** (packages/next/src/):
| Dir | Files | Role |
|-----|-------|------|
| `bin/` | 1 | `next` CLI 바이너리 진입점 |
| `cli/` | 11 | CLI 명령어 (dev, build, start, lint 등) |

**Study Points**:
- CLI 명령어 라우팅 구조
- next dev / next build / next start 진입점
- CLI 옵션 파싱

**Docs**: `docs/01-app/03-api-reference/04-cli/`

**Skill Target**: 신규 생성 필요

**Checklist**:
- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선

---

### Topic 20: diagnostics + telemetry + trace (Observability) ⬜ 미커버

> 그룹핑 사유: diagnostics 2파일, telemetry 16파일, trace 13파일 — 관련 기능 통합 (31파일)

**Source Files** (packages/next/src/):
| Dir | Files | Role |
|-----|-------|------|
| `diagnostics/` | 2 | 진단 정보 |
| `telemetry/` | 16 | 사용 통계 수집 |
| `trace/` | 13 | 빌드/런타임 트레이싱 |

**Study Points**:
- 텔레메트리 수집 항목 및 옵트아웃
- 빌드 트레이싱 구현
- 진단 정보 수집

**Docs**: 해당 없음 (내부 구현)

**Skill Target**: 신규 생성 필요

**Checklist**:
- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선

---

### Topic 21: compiled + bundles (Vendored Dependencies) ⬜ 미커버

> 참고: compiled 704파일, bundles 62파일 — 대부분 사전 컴파일된 의존성. 딥스터디 보다는 목록/역할 파악 수준.

**Source Files** (packages/next/src/):
| Dir | Files | Role |
|-----|-------|------|
| `compiled/` | 704 | 사전 컴파일된 의존성 (react, react-dom, webpack 등) |
| `bundles/` | 62 | 번들된 의존성 |

**Study Points**:
- 번들된 패키지 목록 및 버전
- 왜 사전 컴파일하는지 (설치 속도, 버전 고정)
- 주요 번들 패키지: react, react-dom, webpack, postcss 등

**Docs**: 해당 없음 (내부 인프라)

**Skill Target**: `references/build-compilation.md` (부분적)

**Checklist**:
- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선

---

### Topic 22: next-devtools ⬜ 미커버

**Source Files** (packages/next/src/next-devtools/):
| Pattern | Files | Role |
|---------|-------|------|
| `*.ts`, `*.tsx` | 186 | Next.js DevTools 구현 |

**Study Points**:
- DevTools UI 구조
- MCP 연동 (dev 환경)
- 빌드/렌더링 정보 표시

**Docs**: 해당 없음 (내부 도구)

**Skill Target**: 신규 생성 필요

**Checklist**:
- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선

---

### Topic 23: font (next/font) ✅ 커버

**Source Files** (packages/font/):
| Pattern | Files | Role |
|---------|-------|------|
| `src/google/` | — | Google Fonts 지원 |
| `src/local/` | — | 로컬 폰트 지원 |
| `src/utils/` | — | 폰트 유틸리티 |

**Study Points**:
- Google Fonts 자동 다운로드 및 셀프호스팅
- 로컬 폰트 처리
- CSS 변수 기반 폰트 적용
- font-display swap / size-adjust

**Docs**: `docs/01-app/03-api-reference/01-components/font.mdx`

**Skill Target**: `references/optimization.md`

**Checklist**:
- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선

---

### Topic 24: next-routing ✅ 커버

**Source Files** (packages/next-routing/src/):
| File | Role |
|------|------|
| `index.ts` | 진입점 |
| `destination.ts` | 목적지 URL 처리 |
| `i18n.ts` | i18n 라우팅 |
| `matchers.ts` | 라우트 매칭 |
| `middleware.ts` | 미들웨어 라우팅 |
| `resolve-routes.ts` | 라우트 해석 |
| `next-data.ts` | _next/data 처리 |
| `types.ts` | 타입 정의 |

**Study Points**:
- 라우트 해석 알고리즘 (rewrites, redirects, headers)
- i18n 라우팅 처리
- 미들웨어 실행 순서
- _next/data 요청 정규화

**Docs**: `docs/01-app/02-guides/routing/`

**Skill Target**: `references/routing.md`

**Checklist**:
- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선

---

### Topic 25: eslint-config-next + eslint-plugin-next ⬜ 미커버

> 그룹핑 사유: eslint-config-next 4파일, eslint-plugin-internal 4파일, eslint-plugin-next 26파일 — 관련 ESLint 도구 통합 (34파일)

**Source Files** (packages/):
| Package | Files | Role |
|---------|-------|------|
| `eslint-config-next/` | 4 | Next.js ESLint 설정 |
| `eslint-plugin-internal/` | 4 | 내부 ESLint 플러그인 |
| `eslint-plugin-next/` | 26 | Next.js ESLint 규칙 |

**Study Points**:
- Next.js 전용 ESLint 규칙 목록 (no-html-link-for-pages 등)
- 권장 설정 구성
- next lint 통합

**Docs**: `docs/01-app/02-guides/configuring/eslint.mdx`

**Skill Target**: 신규 생성 필요

**Checklist**:
- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선

---

### Topic 26: create-next-app ⬜ 미커버

**Source Files** (packages/create-next-app/):
| Pattern | Files | Role |
|---------|-------|------|
| `*.ts`, `*.mjs` | 81 | 프로젝트 스캐폴딩 도구 |

**Study Points**:
- 템플릿 선택 흐름 (App Router, TypeScript 등)
- 프로젝트 구조 생성 로직
- CLI 인터랙션

**Docs**: `docs/01-app/01-getting-started/01-installation.mdx`

**Skill Target**: 신규 생성 필요

**Checklist**:
- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선

---

### Topic 27: next-codemod ⬜ 미커버

**Source Files** (packages/next-codemod/):
| Pattern | Files | Role |
|---------|-------|------|
| `transforms/` | ~500 | 버전 마이그레이션 코드모드 |

**Study Points**:
- 주요 코드모드 목록 (middleware-to-proxy 등)
- AST 변환 패턴 (jscodeshift)
- 버전별 마이그레이션 전략

**Docs**: `docs/01-app/02-guides/upgrading/`

**Skill Target**: 신규 생성 필요

**Checklist**:
- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선

---

### Topic 28: Small Utilities ⬜ 미커버

> 그룹핑 사유: 각각 1~8파일의 소형 패키지 통합 (~30파일)

**Source Files** (packages/):
| Package | Files | Role |
|---------|-------|------|
| `next-env/` | 1 | TypeScript 환경 선언 |
| `next-mdx/` | 5 | MDX 지원 |
| `next-plugin-storybook/` | 1 | Storybook 플러그인 |
| `next-polyfill-module/` | 1 | Module polyfill |
| `next-polyfill-nomodule/` | 1 | Nomodule polyfill |
| `next-bundle-analyzer/` | 2 | 번들 분석기 |
| `next-rspack/` | 3 | Rspack 지원 |
| `next-swc/` | 0 | SWC 래퍼 (Rust 코드 별도) |
| `react-refresh-utils/` | 8 | React Fast Refresh 유틸 |
| `third-parties/` | 8 | 서드파티 스크립트 (GA, GTM 등) |

**Study Points**:
- 각 유틸리티 패키지의 역할 파악
- next-mdx: MDX 로더 구현
- third-parties: Google Analytics, GTM, YouTube 임베드
- react-refresh-utils: Fast Refresh 통합

**Docs**: `docs/01-app/03-api-reference/01-components/third-party-libraries.mdx`

**Skill Target**: 신규 생성 필요

**Checklist**:
- [ ] 소스 학습 완료
- [ ] docs 교차 확인
- [ ] skill 검증/개선

---

## Part 2: Docs Supplementary Study

소스에서 다루지 않은 실용적 가이드/API 레퍼런스 학습.

### Docs Section: 01-app (App Router) — 224 files

| Category | Path | Files |
|----------|------|-------|
| Getting Started | `01-app/01-getting-started/` | ~10 |
| Guides | `01-app/02-guides/` | ~100 |
| API Reference | `01-app/03-api-reference/` | ~114 |

### Docs Section: 03-architecture — 5 files

| File | Topic |
|------|-------|
| `accessibility.mdx` | 접근성 |
| `fast-refresh.mdx` | Fast Refresh |
| `nextjs-compiler.mdx` | Next.js 컴파일러 |
| `supported-browsers.mdx` | 브라우저 지원 |

---

## Files To Modify

| Action | File | Source |
|--------|------|--------|
| Verify/Improve | `references/architecture.md` | Topics 1, 2 |
| Verify/Improve | `references/routing.md` | Topics 3, 10, 24 |
| Verify/Improve | `references/server-components.md` | Topic 4 |
| Verify/Improve | `references/rendering.md` | Topics 4, 17 |
| Verify/Improve | `references/caching.md` | Topic 5 |
| Verify/Improve | `references/data-fetching.md` | Topic 6 |
| Verify/Improve | `references/api-routes.md` | Topic 6 |
| Verify/Improve | `references/proxy.md` | Topic 7 |
| Verify/Improve | `references/error-handling.md` | Topic 8 |
| Verify/Improve | `references/optimization.md` | Topics 11, 23 |
| Verify/Improve | `references/build-compilation.md` | Topics 14, 15, 16 |
| Review (고아) | `references/patterns.md` | 크로스커팅 — 소스 학습 후 전체 검증 |
| Review (고아) | `references/anti-patterns.md` | 크로스커팅 — 소스 학습 후 전체 검증 |
| Review (고아) | `references/examples.md` | 크로스커팅 — 소스 학습 후 전체 검증 |
| Review (고아) | `references/best-practices/*.md` (22개) | 크로스커팅 — 관련 토픽 학습 시 함께 검증 |

## Verification

- 각 토픽 완료 후: 수정된 레퍼런스 문서의 내용이 소스 코드와 일치하는지 교차 확인
- 전체 완료 후: `bash scripts/check-docs.sh` 실행하여 문서 정합성 검증
