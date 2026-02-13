# Architecture — App Router 구조와 파일 컨벤션

> `/learn nextjs` 세션 기록. 소스 코드 기반 Q&A 히스토리.

---

## 2026-02-13

### 학습 로드맵
- [x] Step 1: RouteKind와 RouteDefinition — 라우트의 분류 체계
- [ ] Step 2: RouteModule과 RouteMatcher — 라우트 처리 아키텍처
- [ ] Step 3: 파일 컨벤션과 컴포넌트 계층 — 파일 시스템 → 라우트 매핑
- [ ] Step 4: 전체 렌더링 흐름 — Request → Response 파이프라인

### 학습 요약
- RouteKind enum은 5가지 타입(PAGES, PAGES_API, APP_PAGE, APP_ROUTE, IMAGE)으로 라우트를 분류한다.
- RouteDefinition 인터페이스는 라우트의 메타데이터(kind, bundlePath, filename, page, pathname)를 보유한다. `page`는 내부 경로(parallel/intercepting 포함), `pathname`은 URL 매칭 경로.
- AppPageRouteDefinition은 `appPaths[]` 추가(parallel routes로 여러 경로 매핑 가능), AppRouteRouteDefinition은 추가 필드 없음.
- RouteKind 판단은 **런타임이 아닌 빌드 타임**에 파일명(`/page` vs `/route`)으로 결정되며, 빌드 템플릿에서 하드코딩되어 번들에 포함된다.

### 소스 코드 경로
- `packages/next/src/server/route-kind.ts` — RouteKind enum 정의 (PAGES, PAGES_API, APP_PAGE, APP_ROUTE, IMAGE)
- `packages/next/src/server/route-definitions/route-definition.ts` — RouteDefinition 베이스 인터페이스 (kind, bundlePath, filename, page, pathname)
- `packages/next/src/server/route-definitions/app-page-route-definition.ts` — AppPageRouteDefinition (+ appPaths[])
- `packages/next/src/server/route-definitions/app-route-route-definition.ts` — AppRouteRouteDefinition (추가 필드 없음)
- `packages/next/src/server/route-modules/route-module.ts` — RouteModule 추상 베이스 클래스
- `packages/next/src/lib/is-app-page-route.ts` — `isAppPageRoute()` — `route.endsWith('/page')`
- `packages/next/src/lib/is-app-route-route.ts` — `isAppRouteRoute()` — `route.endsWith('/route')`
- `packages/next/src/build/webpack/loaders/next-app-loader/index.ts:1007` — 빌드 시 isAppRouteRoute로 분기
- `packages/next/src/build/templates/app-page.ts:105-114` — APP_PAGE 빌드 템플릿 (RouteKind 하드코딩)
- `packages/next/src/build/templates/app-route.ts:50-63` — APP_ROUTE 빌드 템플릿 (RouteKind 하드코딩)
- `packages/next/src/server/route-modules/checks.ts` — 런타임 타입 가드 (isAppPageRouteModule, isAppRouteRouteModule)

### Q&A 전체 기록

#### Step 1: RouteKind와 RouteDefinition

**설명 내용:**

RouteKind는 Next.js가 라우트를 분류하는 enum으로 5가지 타입이 있다:
- PAGES / PAGES_API (레거시 Pages Router)
- APP_PAGE (app/ 디렉토리의 page.tsx)
- APP_ROUTE (app/ 디렉토리의 route.ts)
- IMAGE (next/image 이미지)

RouteDefinition은 하나의 라우트가 가지는 메타데이터 구조:
- `kind`: RouteKind
- `bundlePath`: 빌드된 번들 파일 경로
- `filename`: 원본 파일명
- `page`: 내부 페이지 경로 (parallel routes, intercepting 등 수식어 포함, 예: `/app/@modal/login/page`)
- `pathname`: URL 매칭 경로 (예: `/login`)

AppPageRouteDefinition은 `appPaths: ReadonlyArray<string>` 추가 — parallel routes로 여러 경로에 매핑 가능.
AppRouteRouteDefinition은 추가 필드 없이 베이스만 상속.

관계도:
```
RouteKind (enum)
  ├── PAGES / PAGES_API (레거시 Pages Router)
  ├── APP_PAGE ← page.tsx
  ├── APP_ROUTE ← route.ts
  └── IMAGE ← next/image

RouteDefinition<K>  (베이스 인터페이스)
  ├── AppPageRouteDefinition  (+ appPaths[])
  ├── AppRouteRouteDefinition (추가 없음)
  ├── PagesRouteDefinition    (레거시)
  └── PagesApiRouteDefinition (레거시)
```

---

**Q: "Next.js도 요청이 들어오면 이 라우트가 어떤 종류인지 판단" -> 실제로 판단하는 로직은 뭔가요?**

A: "요청이 들어오면 판단한다"는 설명은 부정확했다. 실제로는 **빌드 타임에 파일명으로 결정**되고, 런타임에는 이미 결정된 값을 사용한다.

**1단계: 파일명으로 종류 판단 (빌드 시점)**

핵심은 놀랍도록 단순한 두 함수:

```ts
// packages/next/src/lib/is-app-page-route.ts
export function isAppPageRoute(route: string): boolean {
  return route.endsWith('/page')
}

// packages/next/src/lib/is-app-route-route.ts
export function isAppRouteRoute(route: string): boolean {
  return route.endsWith('/route')
}
```

파일명이 `/page`로 끝나면 APP_PAGE, `/route`로 끝나면 APP_ROUTE.

**2단계: Webpack 로더(next-app-loader)에서 분기**

`packages/next/src/build/webpack/loaders/next-app-loader/index.ts:1007`:

```ts
if (isAppRouteRoute(name)) {
  return createAppRouteCode({ ... })  // → route.ts용 번들 생성
}

// 여기 도달하면 page.tsx → createTreeCodeFromPath로 컴포넌트 트리 생성
let treeCodeResult = await createTreeCodeFromPath(pagePath, { ... })
```

**3단계: 빌드 템플릿에서 RouteKind 하드코딩**

page.tsx용 (`build/templates/app-page.ts:105-114`):
```ts
export const routeModule = new AppPageRouteModule({
  definition: {
    kind: RouteKind.APP_PAGE,    // ← 빌드 시점에 결정됨
    page: 'VAR_DEFINITION_PAGE',
    pathname: 'VAR_DEFINITION_PATHNAME',
    bundlePath: '',
    filename: '',
    appPaths: [],
  },
  userland: { loaderTree: tree },
})
```

route.ts용 (`build/templates/app-route.ts:50-63`):
```ts
const routeModule = new AppRouteRouteModule({
  definition: {
    kind: RouteKind.APP_ROUTE,   // ← 빌드 시점에 결정됨
    page: 'VAR_DEFINITION_PAGE',
    pathname: 'VAR_DEFINITION_PATHNAME',
    filename: 'VAR_DEFINITION_FILENAME',
    bundlePath: 'VAR_DEFINITION_BUNDLE_PATH',
  },
  userland,
})
```

`VAR_*`는 빌드 시 실제 값으로 치환되는 플레이스홀더.

**4단계: 런타임에서는 타입 가드로 확인만**

```ts
// packages/next/src/server/route-modules/checks.ts
export function isAppPageRouteModule(
  routeModule: RouteModule
): routeModule is AppPageRouteModule {
  return routeModule.definition.kind === RouteKind.APP_PAGE
}
```

**전체 흐름:**
```
[빌드 타임]
app/blog/page.tsx
       ↓ endsWith('/page') → true
       ↓ isAppPageRoute()
       ↓ next-app-loader → createTreeCodeFromPath()
       ↓ build/templates/app-page.ts 템플릿 적용
       ↓ kind: RouteKind.APP_PAGE 하드코딩된 번들 생성

[런타임]
Request → routeModule.definition.kind === 'APP_PAGE' (이미 결정됨)
```

---

### 연결 토픽
- **Routing**: RouteMatcher가 pathname을 실제 매칭하는 과정 — 동적 라우트(`[slug]`)의 정규식 생성과 매칭 알고리즘
- **Build & Compilation**: next-app-loader의 전체 번들링 파이프라인 — createTreeCodeFromPath가 컴포넌트 트리를 어떻게 구성하는지
- **Server Components**: page.tsx가 APP_PAGE로 결정된 후 AppPageRouteModule이 RSC 렌더링을 오케스트레이션하는 흐름

---
