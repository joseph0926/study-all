# next/src/api

> `/learn nextjs` 세션 기록. 소스 코드 기반 Q&A 히스토리.

---

## 2026-02-21

### 학습 로드맵
- Step 1: API 엔트리 레이어 패턴
  - [x] 1.1: src/api/의 역할 — re-export 진입점 패턴 이해
  - [x] 1.2: 구현 위치 매핑 — 16개 파일이 가리키는 실제 구현 계층 (client/server/shared/pages)
- Step 2: Navigation API (Client/Server 분기)
  - [ ] 2.1: navigation.ts — Client-side hooks (useRouter, usePathname 등)
  - [ ] 2.2: navigation.react-server.ts — Server-side functions (redirect, notFound 등)
  - [ ] 2.3: .react-server.ts 조건부 export 메커니즘 — 빌드 시 Client/Server 분기 방법
- Step 3: Server Request API
  - [ ] 3.1: headers.ts — cookies(), headers(), draftMode() re-export 구조
  - [ ] 3.2: server.ts — NextRequest/NextResponse/NextFetchEvent 진입점
- Step 4: Client Components API
  - [ ] 4.1: image.ts & link.ts — Image/Link 컴포넌트 진입점
  - [ ] 4.2: form.ts & script.ts — Form/Script 컴포넌트 진입점
  - [ ] 4.3: og.ts — OG Image Response 진입점
- Step 5: Dynamic Import & Pages Router Legacy
  - [ ] 5.1: dynamic.ts vs app-dynamic.ts — Pages vs App Router dynamic() 분기
  - [ ] 5.2: Pages Router 전용 API — router.ts, head.ts, document.tsx, app.tsx, constants.ts

### 학습 요약
- `src/api/` 디렉토리는 Next.js의 공개 API 진입점 레이어로, 실제 구현 없이 `client/`, `server/`, `shared/`, `pages/` 계층의 코드를 re-export한다.
- 빌드 시스템(`create-compiler-aliases.ts`)이 `isServerOnlyLayer` 조건에 따라 `navigation`의 resolve 대상을 `.react-server.ts` 버전으로 교체한다.
- `navigation.ts`만 `.react-server.ts` 쌍을 가지는 이유는, React가 `shared-subset` → `react-server` 전환 시 `useContext`를 서버 빌드에서 제거했기 때문. 같은 파일에 hooks(`useContext` 의존)와 순수 함수(`redirect`, `notFound`)가 공존하여 서버 번들링 에러 발생 → PR #62456에서 분리로 해결.
- React 팀(Josh Story)과 Next.js 팀(Jiachi Liu)의 협업 과정에서 3주 간격으로 후속 조치가 이루어졌다.

### 소스 코드 경로
- `ref/next.js/packages/next/src/api/navigation.ts:1` — Client navigation re-export 진입점
- `ref/next.js/packages/next/src/api/navigation.react-server.ts:1` — Server navigation re-export 진입점
- `ref/next.js/packages/next/src/api/headers.ts:1-3` — cookies/headers/draft-mode re-export
- `ref/next.js/packages/next/src/api/server.ts:1` — NextRequest/NextResponse re-export
- `ref/next.js/packages/next/src/build/create-compiler-aliases.ts:231-250` — Server/Client 조건부 alias 분기
- `ref/next.js/packages/next/src/client/components/navigation.ts:1-301` — Client navigation 실제 구현 (hooks + server re-export)
- `ref/next.js/packages/next/src/client/components/navigation.react-server.ts:1-19` — Server navigation 실제 구현 (순수 함수만)
- `ref/next.js/packages/next/src/compiled/react/cjs/react.react-server.production.js:300-436` — React 서버 빌드 (useContext 없음)
- `ref/next.js/packages/next/src/compiled/react/cjs/react.production.js:387-545` — React 클라이언트 빌드 (useContext 있음)
- `ref/next.js/packages/next/navigation.js:1` — 패키지 루트 진입점 (dist/client/components/navigation require)

### Q&A 전체 기록

#### Step 1.1: src/api/의 역할 — re-export 진입점 패턴 이해

**Q: 이 패턴의 장단점은 뭐라 생각하시나요? 장점의 경우 당신이 말한대로 안내 데스크 역할만 수행하므로 사용자 입장에서는 본인의 환경별로 다른 접근 방법을 쓰지 않고, 동일한 방법으로 import 하기만하면 안내 데스크 요원이 내부적으로 사용자에 맞는것을 제공해주는 장점이있을거같습니다. 단점은 제 생각에는 사용자 입장에서는 추상화가 많이된 상황이라 내부 로직을 아예 모른다는점. 즉 장/단점이 하나에서 나오는거같습니다**

A: 정확한 통찰. "추상화의 양면성" — 장단점이 같은 뿌리에서 나온다는 점을 잘 짚었다. 실제로 "안내 데스크 요원이 사용자에 맞는 것을 제공"하는 메커니즘을 소스에서 확인:

`create-compiler-aliases.ts:231-250`:
```ts
export function createAppRouterApiAliases(isServerOnlyLayer: boolean) {
  const mapping: Record<string, string> = {
    head: 'next/dist/client/components/noop-head',
    dynamic: 'next/dist/api/app-dynamic',
    link: 'next/dist/client/app-dir/link',
    form: 'next/dist/client/app-dir/form',
  }
  if (isServerOnlyLayer) {
    mapping['navigation'] = 'next/dist/api/navigation.react-server'
    mapping['link'] = 'next/dist/client/app-dir/link.react-server'
  }
  // ...
}
```

`isServerOnlyLayer`가 `true`이면 `navigation`이 `.react-server` 버전으로 교체됨. 사용자는 동일하게 `'next/navigation'`으로 import하지만, Server Component에서는 `redirect`/`notFound` 등만, Client Component에서는 `useRouter`/`usePathname` 등도 사용 가능.

장단점 정리:

| 관점 | 장점 | 단점 |
|------|------|------|
| 사용자 경험 | 환경을 신경 쓸 필요 없이 동일한 import 경로 사용 | 빌드 타임에 실제로 어떤 코드가 연결되는지 보이지 않음 |
| 디버깅 | — | Server Component에서 useRouter import 시 에러 원인 이해 어려움 |
| 유지보수 | 내부 구조 변경 시 public API 안정성 유지 | alias 시스템 자체가 복잡성 추가 |

Next.js는 이 단점을 에러 메시지로 보완 — Server Component에서 `useRouter`를 쓰면 "It only works in a Client Component" 같은 메시지가 나옴.

---

#### Step 1.2: 구현 위치 매핑

**Q: navigation.ts만 .react-server.ts 쌍을 가짐 — 16개 파일 중 유일하게 Server/Client 분기가 필요한 API << 왜 이렇게 설계되었는지 근거를 웹검색이나 주석등에서 찾을수있을까요? 저것만 저런 패턴이라면, 반대로 말하면 저것만 아니라면 분기가 필요 없을수도있던거 아닌가요?**

A: 두 파일의 실제 구현을 읽어서 확인.

`navigation.react-server.ts` (Server 전용, 1-19줄):
```ts
export { redirect, permanentRedirect } from './redirect'
export { notFound } from './not-found'
export { forbidden } from './forbidden'
export { unauthorized } from './unauthorized'
export { unstable_rethrow } from './unstable-rethrow'
export { ReadonlyURLSearchParams }
export const RedirectType = { push: 'push', replace: 'replace' } as const
```

`navigation.ts` (Client, 56-301줄):
```ts
// Client에서만 가능한 React hooks
export function useSearchParams() { ... useContext(SearchParamsContext) ... }
export function usePathname() { ... useContext(PathnameContext) ... }
export function useRouter() { ... useContext(AppRouterContext) ... }
export function useParams() { ... useContext(PathParamsContext) ... }
// ...
// ★ Server 것들도 전부 re-export
export { notFound, forbidden, unauthorized, redirect, permanentRedirect, RedirectType, unstable_rethrow } from './navigation.react-server'
```

`next/navigation`이라는 하나의 import 경로에 성격이 완전히 다른 두 종류의 API가 공존: React Hooks (`useContext` 사용, Client 전용) + 순수 함수 (`redirect`/`notFound`, Server/Client 양쪽 가능). 다른 API들은 이런 혼합이 없음.

git 히스토리에서 원본 커밋 발견: `c221fc4508 Create react server condition alias for next/navigation api (#62456)`

PR #62456 커밋 메시지:
> We found that if you're using edge runtime with `next/navigation` it will error with bundling that you're attempted to import some client component hooks such as `useContext` from react. So we introduced a `react-server` version of `next/navigation` that doesn't interoplate with any client hooks.

---

**Q: 마지막 3문단은 당신의 역추론인가요? 근거가있는건가요?**

A: 정직하게 인정 — 마지막 3문단("DX를 위해 하나의 import 경로로 합치는 설계 결정을 먼저 하고, 그 대가로 `.react-server.ts`가 필요해졌다")은 소스에서 확인하지 못한 역추론이었음. 실제 근거(PR #62456)에 의하면 순서가 반대:

1. 원래 `navigation.ts` 하나만 있었음
2. Edge Runtime + Server Components에서 `useContext` 번들 에러 발생 (버그)
3. 이 버그를 고치기 위해 `.react-server.ts` 분리

"DX 선택 → 복잡성 감수"가 아니라 "버그 → 분리 필요"가 실제 이유.

---

**Q: useContext import가 터지는 문제 << 정확히 무슨 문제입니까?**

A: React 자체가 서버용 빌드에서 `useContext`를 제거하는 것이 본질.

React의 `package.json` 조건부 export (`compiled/react/package.json:5-7`):
```json
".": {
  "react-server": "./react.react-server.js",
  "default": "./index.js"
}
```

두 빌드의 export 비교:

| Hook | `react.production.js` (Client) | `react.react-server.production.js` (Server) |
|------|:---:|:---:|
| `useContext` | 있음 (511줄) | 없음 |
| `useState` | 있음 | 없음 |
| `useEffect` | 있음 (518줄) | 없음 |
| `useRef` | 있음 | 없음 |
| `useMemo` | 있음 (536줄) | 있음 (433줄) |
| `useCallback` | 있음 (508줄) | 있음 (426줄) |
| `use` | 있음 (502줄) | 있음 (423줄) |
| `createContext` | 있음 (437줄) | 없음 |

에러 발생 흐름:
1. Server Component에서 `import { redirect } from 'next/navigation'`
2. 번들러가 `navigation.ts` resolve (분기 전)
3. `navigation.ts`는 `import { useContext } from 'react'` 포함
4. 번들러가 Server 번들이므로 `react-server` 조건으로 React resolve
5. `react.react-server.js`에 `useContext`가 없음
6. 번들링 에러: "useContext is not exported from react"

사용자가 `redirect`만 쓰려 했는데, 같은 파일에 있는 `useRouter`가 `useContext`를 import하고, 그 `useContext`가 서버 빌드의 React에 존재하지 않아 터진 것.

---

**Q: 그러면 react 변경으로 Nextjs가 후속 조치를 한건가요? / react 같은 많은 의존성을 고려하는 팀이 이렇게 대안없이 바꾸지 않을거같아서 궁금하네요**

A: git 히스토리에서 `shared-subset` → `react-server` 전환 과정을 추적.

**Before (shared-subset)** — `useContext`가 있었음:
```
exports.useContext = useContext;    ← ✅ 포함
```

**After (react-server, 같은 커밋 #61522)** — `useContext`가 제거됨:
```
                                   ← ❌ useContext 없음
```

이름만 바뀐 게 아니라 `useContext`가 서버 빌드에서 제거되었음.

타임라인:

| 날짜 | PR | 작성자 | 내용 |
|------|-----|--------|------|
| 2024-02-05 | #61522 | Josh Story (React 팀) | React 업데이트 + `shared-subset` → `react-server` 전환, `useContext` 제거 |
| 2024-02-26 | #62456 | Jiachi Liu (Next.js 팀) | `navigation.react-server.ts` 생성으로 번들링 에러 수정 |

대안 없이 바꾼 것이 아님:
1. PR #61522의 작성자 Josh Story는 React 팀 멤버. React 업데이트와 Next.js alias 변경을 한 PR에서 같이 처리 — 협업하여 진행.
2. 다만 이 PR에서는 alias 이름만 바꿨고, `navigation.ts`가 `useContext`를 import하는 문제까지는 미처 잡지 못함.
3. 3주 뒤 Edge Runtime + Server Components에서 실제 에러 보고(#62187) → Next.js 팀이 후속 수정.

결론: 의도적인 breaking change가 아니라, React-Next.js 협업 과정에서 발생한 누락. React의 `useContext` 제거는 의도적이었지만(Server Component에서 Context는 의미 없으므로), Next.js의 `navigation.ts`에 미치는 영향까지는 한 번에 처리되지 않았음.

### 연결 토픽
- `navigation 실제 구현`: `client/components/navigation.ts`의 useRouter, usePathname 등 hooks 구현 상세 (Step 2에서 다룰 예정)
- `create-compiler-aliases 전체 구조`: Server/Client 외에도 Edge, Pages 등 다양한 alias 분기가 존재
- `React react-server 조건`: React가 서버 빌드에서 제공하는 API subset의 설계 의도와 범위
- `빌드 시스템 (webpack-config)`: `isServerOnlyLayer` 판단 로직과 번들 레이어 시스템

---

## 2026-02-21 (재개 — Step 2.1부터)

### 학습 로드맵
- Step 1: API 엔트리 레이어 패턴
  - [x] 1.1: src/api/의 역할 — re-export 진입점 패턴 이해
  - [x] 1.2: 구현 위치 매핑 — 16개 파일이 가리키는 실제 구현 계층 (client/server/shared/pages)
- Step 2: Navigation API (Client/Server 분기)
  - [x] 2.1: navigation.ts — Client-side hooks (useRouter, usePathname 등)
  - [x] 2.2: navigation.react-server.ts — Server-side functions (redirect, notFound 등)
  - [ ] 2.3: .react-server.ts 조건부 export 메커니즘 — 빌드 시 Client/Server 분기 방법
- Step 3: Server Request API
  - [ ] 3.1: headers.ts — cookies(), headers(), draftMode() re-export 구조
  - [ ] 3.2: server.ts — NextRequest/NextResponse/NextFetchEvent 진입점
- Step 4: Client Components API
  - [ ] 4.1: image.ts & link.ts — Image/Link 컴포넌트 진입점
  - [ ] 4.2: form.ts & script.ts — Form/Script 컴포넌트 진입점
  - [ ] 4.3: og.ts — OG Image Response 진입점
- Step 5: Dynamic Import & Pages Router Legacy
  - [ ] 5.1: dynamic.ts vs app-dynamic.ts — Pages vs App Router dynamic() 분기
  - [ ] 5.2: Pages Router 전용 API — router.ts, head.ts, document.tsx, app.tsx, constants.ts

### 학습 요약
- Client navigation hooks 6개(`useRouter`, `usePathname`, `useSearchParams`, `useParams`, `useSelectedLayoutSegment(s)`)는 모두 `useContext(SomeContext)` 패턴으로 프레임워크가 주입한 값을 읽는다. Context가 필요한 이유는 Pages Router와 App Router가 같은 hook을 공유하기 때문 (TODO 주석에 명시).
- Pages Router에서는 `adaptForAppRouterInstance()` 어댑터 함수가 `NextRouter`를 `AppRouterInstance` 인터페이스로 변환하여 동일한 Context에 주입한다. Hook이 "호출 주체를 아는" 것이 아니라, 어떤 Provider 트리 안에서 렌더링되느냐에 따라 다른 값이 나온다.
- `null!` 타입 트릭은 App Router 전용 프로젝트에서는 null 체크 불필요, Pages 혼용 시 `navigation-types/compat/navigation.d.ts`가 `declare module`로 `| null` 오버로드를 자동 추가하여 null 체크를 강제 — 프로젝트 설정에 따라 타입 시스템이 자동 조절된다.
- Server-side functions(`redirect`, `notFound`, `forbidden`, `unauthorized`)는 Error를 throw하여 렌더링 흐름을 중단하는 것이 전부. `error.digest` 문자열에 에러 코드 + 타입 + URL + HTTP 상태 코드를 세미콜론 구분으로 인코딩하고, 렌더링 파이프라인이 `isRedirectError()`/`isHTTPAccessFallbackError()`로 판별 후 적절한 HTTP 응답을 생성한다.
- `redirect()`의 `type`은 `??=` (Logical Nullish Assignment)로 자동 결정 — Server Action에서는 `'push'`, 그 외에서는 `'replace'`.

### 소스 코드 경로
- `ref/next.js/packages/next/src/client/components/navigation.ts:1-301` — Client navigation hooks 전체 구현
- `ref/next.js/packages/next/src/client/components/navigation.react-server.ts:1-19` — Server navigation re-export (순수 함수만)
- `ref/next.js/packages/next/src/shared/lib/hooks-client-context.shared-runtime.ts:7-9` — SearchParamsContext, PathnameContext, PathParamsContext 정의
- `ref/next.js/packages/next/src/shared/lib/app-router-context.shared-runtime.ts:65-77` — AppRouterContext, LayoutRouterContext 정의
- `ref/next.js/packages/next/src/client/components/app-router.tsx:525-553` — Provider 중첩 구조 (6개 Context)
- `ref/next.js/packages/next/src/client/index.tsx:296-336` — Pages Router AppContainer (어댑터 주입)
- `ref/next.js/packages/next/src/shared/lib/router/adapters.tsx:12-128` — Pages→App 어댑터 함수 4개
- `ref/next.js/packages/next/navigation-types/compat/navigation.d.ts:1-50` — Pages 혼용 시 null 오버로드 타입
- `ref/next.js/packages/next/src/lib/typescript/writeAppTypeDeclarations.ts:59-63` — hasAppDir && hasPagesDir 조건으로 compat 타입 자동 추가
- `ref/next.js/packages/next/src/client/components/redirect.ts:16-97` — redirect/permanentRedirect 구현 (Error throw + digest 인코딩)
- `ref/next.js/packages/next/src/client/components/not-found.ts:21-28` — notFound 구현 (Error throw + NEXT_HTTP_ERROR_FALLBACK;404)
- `ref/next.js/packages/next/src/client/components/redirect-error.ts:1-42` — isRedirectError (digest 파싱 검증)
- `ref/next.js/packages/next/src/client/components/http-access-fallback/http-access-fallback.ts:1-61` — isHTTPAccessFallbackError + 상태 코드 매핑
- `ref/next.js/packages/next/src/server/app-render/dynamic-rendering.ts:581-632` — useDynamicRouteParams (프리렌더링 시 동적 홀 생성)
- `ref/next.js/packages/next/src/server/app-render/dynamic-rendering.ts:634-660` — useDynamicSearchParams (요청 의존 데이터 트래킹)

### Q&A 전체 기록

#### Step 2.1: navigation.ts — Client-side hooks

**Q: useContext(SomeContext)로 프레임워크가 주입한 값을 읽는다 << 왜 hook 값을 Context로 관리할까요?**

A: 소스에서 직접적인 설계 근거 주석을 발견. `app-router.tsx:536-540`:
```ts
/* TODO: We should be able to remove this context. useRouter
   should import from app-router-instance instead. It's only
   necessary because useRouter is shared between Pages and
   App Router. We should fork that module, then remove this
   context provider. */
```
핵심 이유는 "공유": `useRouter`가 Pages Router와 App Router 양쪽에서 동작해야 하므로, 구현을 직접 import하지 않고 Context로 간접 연결. Provider가 3곳에서 존재:
- `client/components/app-router.tsx:541` — App Router (진짜 인스턴스)
- `client/index.tsx:311` — Pages Router 클라이언트 (adapted 객체)
- `server/render.tsx:736` — Pages Router SSR (adapted 객체)

TODO 주석에서 "fork하면 Context 제거 가능"이라 했으니, Context는 두 라우터 공존을 위한 현실적 선택이지 이상적 설계는 아닌 셈.

---

**Q: if (router === null) << Context 값을 null 체크만 해도 충분해도 된다는 근거가 pr이나 주석등에 있을까요? `invariant expected app router to be mounted` < 메시지를 보니 마운트 되기 전에(또는 ContextProvider 밖) 호출하는것만 가드하는게 맞을까요?**

A: Context의 기본값이 `null`이다 (`app-router-context.shared-runtime.ts:65-67`):
```ts
export const AppRouterContext = React.createContext<AppRouterInstance | null>(null)
```
React Context 동작상 Provider 안에서는 Provider가 주입한 값 반환, Provider 밖에서는 기본값(`null`) 반환. 따라서 `router === null`이면 유일한 가능성은 Provider 밖에서 호출된 것. `createContext(null)` + null 체크 = Provider 존재 검증 패턴은 React 생태계 표준 패턴.

---

**Q: `useDynamicSearchParams` < 이 함수 내부적으로는 string을 매칭하여 분기를 태우는 로직이 있는건가요? 단순 string을 넘기는 패턴은 신선해서 궁금하네요**

A: 문자열 매칭/분기용이 아님. `dynamic-rendering.ts:634-660`에서 `switch`는 `workUnitStore.type`으로 분기하고, `expression` 문자열은:
1. `makeHangingPromise()`에 전달 → 디버깅 시 "어떤 API가 동적 렌더링을 트리거했는지" 추적
2. 에러 메시지에 삽입 → `InvariantError(\`${expression}\` was called during...)`

각 hook이 다른 문자열을 넘기는 이유는 프리렌더링 중 에러 발생 시 "어떤 hook 때문인지" 사용자에게 알려주기 위한 로깅/트레이싱 태그 역할.

---

**Q: `if (!searchParams) return null!` < 왜 null뒤에 "!"를 붙였을까요?**

A: TypeScript의 non-null assertion operator. 함수 반환 타입이 `ReadonlyURLSearchParams`인데, Pages Router에서 실제로 `null`을 반환해야 하는 상황 존재. App Router 전용 프로젝트에서는 null 불가능하므로 타입에 `| null`을 넣지 않고, Pages 혼용 시 `navigation-types/compat/navigation.d.ts`가 `declare module`로 오버로드하여 `| null` 추가. `writeAppTypeDeclarations.ts:59-63`에서 `hasAppDir && hasPagesDir` 조건으로 compat 타입 자동 추가됨. 프로젝트 설정에 따라 타입 시스템이 자동 조절되므로 사용자에게 위험이 노출되지 않음.

---

**Q: useRouter와 useSelectedLayoutSegments은 단순히 context가 null인지만 체크하는데, useSearchParams는 useMemo도 래핑하고, 내부적으로 추가 로직이있는 이유가 뭘까요?**

A: 반환 데이터의 성격 차이.
- `useRouter()`: 싱글톤 메서드 객체 — 변환 불필요
- `usePathname()`: primitive string — 참조 안정성 문제 없음
- `useSearchParams()`: ① `useDynamicSearchParams` (요청 의존 데이터 → 프리렌더 불가 신호), ② `useMemo` + `ReadonlyURLSearchParams` 래핑 (mutable URLSearchParams → readonly 변환 시 참조 안정성 유지), ③ DevTools 지원

`useMemo` 없이 매 렌더마다 `new ReadonlyURLSearchParams()`하면 값이 같아도 참조가 바뀌어 하위 컴포넌트 useEffect 의존성 불안정 발생.

---

**Q: Pages에서 호출하면 이 어댑터 객체가, App에서 호출하면 진짜 App Router 인스턴스가 나옵니다 << 이게 궁금했습니다 어떻게 호출한 주체를 알수있는지?**

A: 호출 주체를 "알지" 않음. 감지 로직이 없음. Pages Router와 App Router는 완전히 다른 컴포넌트 트리를 렌더링:

```
[Pages Router 경로]
client/index.tsx의 AppContainer
  └─ AppRouterContext.Provider value={adaptedForAppRouter}  ← 어댑터 객체
       └─ 사용자의 Pages 컴포넌트
            └─ useRouter() → useContext(AppRouterContext) → 어댑터 객체

[App Router 경로]
client/components/app-router.tsx
  └─ AppRouterContext.Provider value={publicAppRouterInstance}  ← 진짜 App Router
       └─ 사용자의 App 컴포넌트
            └─ useRouter() → useContext(AppRouterContext) → 진짜 App Router
```

수도꼭지(hook)가 "내가 어디 있지?"를 판단하는 게 아니라, 배관(Provider)이 이미 다르게 연결되어 있는 것. `useContext`는 컴포넌트 트리에서 가장 가까운 상위 Provider의 value를 반환하므로, 어떤 트리 안에서 렌더링되느냐에 따라 자동으로 다른 값이 나옴.

---

**Q: 저 TODO를 구현하여 PR로 올릴 가치/가능성이있을지?**

A: 소스에서 확인된 사실: TODO 주석이 현재 코드에 그대로 남아있음, Pages Router는 v16.1.6에서도 여전히 지원 중, 어댑터 코드와 Provider 주입 코드 모두 활성 상태.

변경 범위가 큼: `useRouter()` 1개를 Pages용/App용 2개로 fork → import 경로 변경 → 빌드 alias 변경 → 테스트 전체 영향 → Pages 호환성 검증 필요. 이 TODO는 Pages Router를 완전히 deprecated/제거할 때 자연스럽게 해결되는 문제. 지금 올리면 "방향은 맞지만 시기상조"로 닫힐 가능성이 높다고 판단.

---

#### Step 2.2: navigation.react-server.ts — Server-side functions

**Q: `type ??= actionAsyncStorage?.getStore()?.isAction ? 'push' : 'replace'` << 이건 무슨 문법인가요? (type ??=)**

A: Logical Nullish Assignment (논리적 nullish 할당) 연산자. ES2021 추가.

```ts
// 동일한 코드
if (type === null || type === undefined) {
  type = actionAsyncStorage?.getStore()?.isAction ? 'push' : 'replace'
}
```

`type`이 `null` 또는 `undefined`일 때만 우변을 평가하여 할당. `redirect()`에서 `type`은 optional 파라미터이므로:
- `redirect('/dashboard', 'push')` → type이 이미 'push' → `??=` 건너뜀
- `redirect('/dashboard')` → type이 undefined → `??=`로 자동 결정

비슷한 할당 연산자 3종:

| 연산자 | 조건 |
|---|---|
| `??=` | null 또는 undefined일 때만 |
| `\|\|=` | falsy일 때 (0, '', false 포함) |
| `&&=` | truthy일 때만 |

### 연결 토픽
- `.react-server.ts 조건부 export 메커니즘`: 빌드 시스템이 Server/Client 분기를 어떻게 처리하는지 (Step 2.3에서 다룰 예정)
- `error.digest 처리 파이프라인`: React 렌더링 파이프라인에서 throw된 에러가 어떻게 HTTP 응답으로 변환되는지
- `unstable_rethrow`: navigation 에러를 사용자 에러 핸들러에서 재throw하는 패턴
- `Server Actions async storage`: `actionAsyncStorage`가 Server Action 컨텍스트를 어떻게 추적하는지
- `Pages/App 어댑터 패턴 상세`: `adaptForSearchParams`, `PathnameContextProviderAdapter`의 fallback/autoExport 처리

---
