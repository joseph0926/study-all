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
    head: "next/dist/client/components/noop-head",
    dynamic: "next/dist/api/app-dynamic",
    link: "next/dist/client/app-dir/link",
    form: "next/dist/client/app-dir/form",
  };
  if (isServerOnlyLayer) {
    mapping["navigation"] = "next/dist/api/navigation.react-server";
    mapping["link"] = "next/dist/client/app-dir/link.react-server";
  }
  // ...
}
```

`isServerOnlyLayer`가 `true`이면 `navigation`이 `.react-server` 버전으로 교체됨. 사용자는 동일하게 `'next/navigation'`으로 import하지만, Server Component에서는 `redirect`/`notFound` 등만, Client Component에서는 `useRouter`/`usePathname` 등도 사용 가능.

장단점 정리:

| 관점        | 장점                                             | 단점                                                           |
| ----------- | ------------------------------------------------ | -------------------------------------------------------------- |
| 사용자 경험 | 환경을 신경 쓸 필요 없이 동일한 import 경로 사용 | 빌드 타임에 실제로 어떤 코드가 연결되는지 보이지 않음          |
| 디버깅      | —                                                | Server Component에서 useRouter import 시 에러 원인 이해 어려움 |
| 유지보수    | 내부 구조 변경 시 public API 안정성 유지         | alias 시스템 자체가 복잡성 추가                                |

Next.js는 이 단점을 에러 메시지로 보완 — Server Component에서 `useRouter`를 쓰면 "It only works in a Client Component" 같은 메시지가 나옴.

---

#### Step 1.2: 구현 위치 매핑

**Q: navigation.ts만 .react-server.ts 쌍을 가짐 — 16개 파일 중 유일하게 Server/Client 분기가 필요한 API << 왜 이렇게 설계되었는지 근거를 웹검색이나 주석등에서 찾을수있을까요? 저것만 저런 패턴이라면, 반대로 말하면 저것만 아니라면 분기가 필요 없을수도있던거 아닌가요?**

A: 두 파일의 실제 구현을 읽어서 확인.

`navigation.react-server.ts` (Server 전용, 1-19줄):

```ts
export { redirect, permanentRedirect } from "./redirect";
export { notFound } from "./not-found";
export { forbidden } from "./forbidden";
export { unauthorized } from "./unauthorized";
export { unstable_rethrow } from "./unstable-rethrow";
export { ReadonlyURLSearchParams };
export const RedirectType = { push: "push", replace: "replace" } as const;
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

| Hook            | `react.production.js` (Client) | `react.react-server.production.js` (Server) |
| --------------- | :----------------------------: | :-----------------------------------------: |
| `useContext`    |          있음 (511줄)          |                    없음                     |
| `useState`      |              있음              |                    없음                     |
| `useEffect`     |          있음 (518줄)          |                    없음                     |
| `useRef`        |              있음              |                    없음                     |
| `useMemo`       |          있음 (536줄)          |                있음 (433줄)                 |
| `useCallback`   |          있음 (508줄)          |                있음 (426줄)                 |
| `use`           |          있음 (502줄)          |                있음 (423줄)                 |
| `createContext` |          있음 (437줄)          |                    없음                     |

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

| 날짜       | PR     | 작성자                  | 내용                                                                      |
| ---------- | ------ | ----------------------- | ------------------------------------------------------------------------- |
| 2024-02-05 | #61522 | Josh Story (React 팀)   | React 업데이트 + `shared-subset` → `react-server` 전환, `useContext` 제거 |
| 2024-02-26 | #62456 | Jiachi Liu (Next.js 팀) | `navigation.react-server.ts` 생성으로 번들링 에러 수정                    |

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
export const AppRouterContext = React.createContext<AppRouterInstance | null>(
  null,
);
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
  type = actionAsyncStorage?.getStore()?.isAction ? "push" : "replace";
}
```

`type`이 `null` 또는 `undefined`일 때만 우변을 평가하여 할당. `redirect()`에서 `type`은 optional 파라미터이므로:

- `redirect('/dashboard', 'push')` → type이 이미 'push' → `??=` 건너뜀
- `redirect('/dashboard')` → type이 undefined → `??=`로 자동 결정

비슷한 할당 연산자 3종:

| 연산자  | 조건                           |
| ------- | ------------------------------ |
| `??=`   | null 또는 undefined일 때만     |
| `\|\|=` | falsy일 때 (0, '', false 포함) |
| `&&=`   | truthy일 때만                  |

### 연결 토픽

- `.react-server.ts 조건부 export 메커니즘`: 빌드 시스템이 Server/Client 분기를 어떻게 처리하는지 (Step 2.3에서 다룰 예정)
- `error.digest 처리 파이프라인`: React 렌더링 파이프라인에서 throw된 에러가 어떻게 HTTP 응답으로 변환되는지
- `unstable_rethrow`: navigation 에러를 사용자 에러 핸들러에서 재throw하는 패턴
- `Server Actions async storage`: `actionAsyncStorage`가 Server Action 컨텍스트를 어떻게 추적하는지
- `Pages/App 어댑터 패턴 상세`: `adaptForSearchParams`, `PathnameContextProviderAdapter`의 fallback/autoExport 처리

---

## 2026-02-21 (재개 — Step 2.3부터)

### 학습 로드맵

- Step 1: API 엔트리 레이어 패턴
  - [x] 1.1: src/api/의 역할 — re-export 진입점 패턴 이해
  - [x] 1.2: 구현 위치 매핑 — 16개 파일이 가리키는 실제 구현 계층 (client/server/shared/pages)
- Step 2: Navigation API (Client/Server 분기)
  - [x] 2.1: navigation.ts — Client-side hooks (useRouter, usePathname 등)
  - [x] 2.2: navigation.react-server.ts — Server-side functions (redirect, notFound 등)
  - [x] 2.3: .react-server.ts 조건부 export 메커니즘 — 빌드 시 Client/Server 분기 방법
- Step 3: Server Request API
  - [x] 3.1: headers.ts — cookies(), headers(), draftMode() re-export 구조
  - [x] 3.2: server.ts — NextRequest/NextResponse/after/connection 진입점
- Step 4: Client Components API
  - [ ] 4.1: image.ts & link.ts — Image/Link 컴포넌트 진입점
  - [ ] 4.2: form.ts & script.ts — Form/Script 컴포넌트 진입점
  - [ ] 4.3: og.ts — OG Image Response 진입점
- Step 5: Dynamic Import & Pages Router Legacy
  - [ ] 5.1: dynamic.ts vs app-dynamic.ts — Pages vs App Router dynamic() 분기
  - [ ] 5.2: Pages Router 전용 API — router.ts, head.ts, document.tsx, app.tsx, constants.ts

### 학습 요약

- webpack의 레이어(layer) 시스템과 resolve alias 조합으로 `.react-server.ts` 조건부 분기가 이루어진다. `issuerLayer`는 "import를 하는 파일이 속한 레이어"를 체크하는 함수이며, `shouldUseReactServerCondition()`이 `serverOnly` 그룹 포함 여부를 boolean으로 반환한다.
- `noop-head`는 App Router에서 `next/head`를 에러 대신 빈 컴포넌트로 교체하는 패턴. Pages→App 마이그레이션 중 공유 컴포넌트가 양쪽에서 렌더링될 수 있어 에러 차단 대신 noop + 빌드 경고(`next-flight-loader`)로 점진적 마이그레이션을 허용한다.
- `cookies()`, `headers()`, `draftMode()`는 Node.js `AsyncLocalStorage`(비동기 실행 컨텍스트에 바인딩되는 저장소) + `workUnitStore.type` switch 분기 패턴을 공유한다. `getStore()`는 동기 함수이며, `.run(store, callback)` 안의 모든 비동기 체인에서 동일한 store에 접근 가능하다.
- `next/server` API들(`NextRequest`, `NextResponse`, `after`, `connection`)은 Web Standard 클래스 확장 + 유틸리티 모음으로, AsyncLocalStorage 기반인 `headers.ts` API들과 성격이 다르다. `NextResponse.rewrite()`는 내부 헤더(`x-middleware-rewrite`)로 URL 변경 없이 다른 곳의 콘텐츠를 반환하는 메커니즘이다.

### 소스 코드 경로

- `ref/next.js/packages/next/src/build/webpack-config.ts:1514-1525` — issuerLayer별 alias 분기 (createAppRouterApiAliases 호출)
- `ref/next.js/packages/next/src/build/utils.ts:1603-1609` — shouldUseReactServerCondition (serverOnly 그룹 포함 여부 체크)
- `ref/next.js/packages/next/src/lib/constants.ts:115-169` — WEBPACK_LAYERS_NAMES 정의 (rsc, ssr, app-pages-browser 등)
- `ref/next.js/packages/next/src/lib/constants.ts:181-195` — serverOnly/clientOnly 그룹 정의
- `ref/next.js/packages/next/src/build/create-compiler-aliases.ts:231-250` — createAppRouterApiAliases (navigation, link의 .react-server 분기)
- `ref/next.js/packages/next/src/client/components/noop-head.tsx:1-3` — NoopHead (return null)
- `ref/next.js/packages/next/src/build/webpack/loaders/next-flight-loader/index.ts:210-216` — noop-head 사용 시 빌드 경고 출력
- `ref/next.js/packages/next/src/shared/lib/head.tsx:1-165` — 진짜 next/head 구현 ('use client', useContext(HeadManagerContext))
- `ref/next.js/packages/next/src/api/headers.ts:1-3` — cookies/headers/draftMode re-export 진입점
- `ref/next.js/packages/next/src/server/request/cookies.ts:33-142` — cookies() 구현 (AsyncLocalStorage + switch)
- `ref/next.js/packages/next/src/server/request/headers.ts:40-158` — headers() 구현 (AsyncLocalStorage + switch)
- `ref/next.js/packages/next/src/server/request/draft-mode.ts:25-71` — draftMode() 구현
- `ref/next.js/packages/next/src/server/app-render/async-local-storage.ts:1-68` — createAsyncLocalStorage (Node.js AsyncLocalStorage 래퍼)
- `ref/next.js/packages/next/src/server/app-render/work-async-storage-instance.ts:1-5` — workAsyncStorageInstance 싱글톤
- `ref/next.js/packages/next/src/server/app-render/work-unit-async-storage.external.ts:344` — WorkUnitStore 타입 정의 (Discriminated Union)
- `ref/next.js/packages/next/src/server/app-render/app-render.tsx:712-717` — workUnitAsyncStorage.run() 호출 (렌더링 진입점)
- `ref/next.js/packages/next/src/server/web/adapter.ts:320-327` — workAsyncStorage.run() 호출 (middleware 진입점)
- `ref/next.js/packages/next/src/api/server.ts:1` — next/server re-export 진입점
- `ref/next.js/packages/next/src/server/web/exports/index.ts:1-10` — NextRequest/NextResponse/after/connection export 목록
- `ref/next.js/packages/next/src/server/web/spec-extension/request.ts:14-52` — NextRequest (Request 상속, cookies/nextUrl/url 추가)
- `ref/next.js/packages/next/src/server/web/spec-extension/response.ts:36-153` — NextResponse (Response 상속, json/redirect/rewrite/next 정적 팩토리)
- `ref/next.js/packages/next/src/server/web/next-url.ts:34-45` — NextURL (basePath/i18n/trailingSlash 파싱)

### Q&A 전체 기록

#### Step 2.3: .react-server.ts 조건부 export 메커니즘

**Q: issuerLayer(= import를 하는 파일이 속한 레이어) << 이 말은 즉 import가 존재하는 모듈로 이해해도됩니까? 아니면 레이어는 모듈이나 번들과 다릅니까? / head: 'next/dist/client/components/noop-head' << noop-head인 이유는 클라이언트에서는 접근이 안되어서 일까요?**

A: "import가 존재하는 모듈"이라는 이해는 반쪽만 맞다. **모듈(module)**은 개별 파일 하나, **레이어(layer)**는 webpack이 그 모듈에 태그처럼 붙이는 분류 라벨이다. `constants.ts:115-169`에서 `reactServerComponents: 'rsc'`, `serverSideRendering: 'ssr'`, `appPagesBrowser: 'app-pages-browser'` 등으로 정의됨. 비유하면 모듈이 "사람"이라면 레이어는 "부서". `issuerLayer`는 함수이며, webpack이 각 rule 평가 시 현재 모듈의 레이어를 인자로 넘겨 boolean을 받는다.

noop-head는 클라이언트 접근 불가 때문이 아니라, **App Router에서 `next/head`가 의미 없기 때문**이다. App Router에서는 `metadata` export나 `generateMetadata()`로 `<head>`를 관리. `noop-head.tsx:1-3`은 `return null`만 하는 빈 컴포넌트.

---

**Q: App Router 코드에서 실수로 import Head from 'next/head'를 하면, 에러 대신 아무것도 렌더링하지 않는 빈 컴포넌트로 조용히 교체 << 이 접근이 좀 위험해보입니다, 사실 저는 "조용한 실패"를 좋은 패턴인가?라고 생각하면 상황에 따라 다르지만, 개발환경으로 한정하면 별로 좋지 못하다고 생각합니다.**

A: 완전히 조용하지는 않다. `next-flight-loader/index.ts:210-216`에서 빌드 타임에 `warnOnce()`로 경고를 출력한다:

```
Warning: You're using `next/head` inside the `app` directory, please migrate to the Metadata API.
```

2단계 대응: ① 빌드 타임 경고, ② 런타임 graceful degradation (null 렌더링). 다른 API들과 비교하면 `useRouter()` Provider 밖 호출은 에러 throw, Server Component에서 `useRouter()`는 빌드 에러인 반면, `next/head`만 관대한 이유는 마이그레이션 과정이 고려된 것으로 보임.

---

**Q: 근데 궁금한게 app router에서 사용이 안된다면, 레이어 단계나 alias 단계에서 처리 가능하지 않을까요? 왜 noop으로 처리한걸까요? 예를들어 react의 cache는 shared에서 import 될수있고, 그러므로 server나 client에서 새로운 함수로 래핑되는 패턴을 유지해야하므로 noop 패턴이 이해가 가는데, 여긴 잘 이해가 안갑니다**

A: 진짜 `next/head` 구현(`shared/lib/head.tsx:1-3`)은 `'use client'` + `useContext(HeadManagerContext)`. Pages→App 마이그레이션 중 `pages/`와 `app/`이 한 프로젝트에 공존하며, 같은 공유 컴포넌트가 양쪽에서 렌더링될 수 있다.

| 전략                       | Pages Router |                   App Router                   |             마이그레이션 중              |
| -------------------------- | :----------: | :--------------------------------------------: | :--------------------------------------: |
| alias 없음 (진짜 head.tsx) |     정상     | HeadManagerContext Provider 없음 → 런타임 에러 |         공유 컴포넌트 사용 불가          |
| 에러 throw                 |     정상     |                   빌드 에러                    |         공유 컴포넌트 사용 불가          |
| noop (현재)                |     정상     |               null 렌더링 + 경고               | 양쪽에서 동작 — 점진적 마이그레이션 가능 |

`navigation.ts`의 `.react-server.ts` 분기는 Server/Client 분기(사용자가 한쪽에서만 쓰는 API)이지만, `head`는 Pages/App Router 분기 — 마이그레이션 중 같은 컴포넌트가 양쪽에서 렌더링될 수 있어 에러 차단이 점진적 마이그레이션을 깨뜨린다.

---

#### Step 3.1: headers.ts — cookies(), headers(), draftMode() re-export 구조

**Q: AsyncLocalStorage 라는 말은 기본 window.localStorage는 비동기입니까? indexedDB만 비동기인줄 알았습니다 / `const workStore = workAsyncStorage.getStore()` < async 함수인데 왜 await나 then처리등이 없나요? / switch (workUnitStore.type) << 이 분기는 앞으로 새로운 지시어가 생길때마다 늘어나겠군요, 맞나요?**

A:

1. `AsyncLocalStorage`는 브라우저의 `window.localStorage`와 **전혀 다른 API**. Node.js의 `async_hooks` 모듈 소속(`async-local-storage.ts:1`에서 `import type { AsyncLocalStorage } from 'async_hooks'`). "Async"는 "비동기 저장소"가 아니라 "비동기 실행 컨텍스트에 바인딩되는 저장소"라는 뜻. 비유하면 각 HTTP 요청이 보이지 않는 배낭을 메고 다니는 것.

2. `getStore()`는 **동기 함수**(`async-local-storage.ts:14-16`에서 `getStore(): Store | undefined { return undefined }`). Promise를 반환하지 않는다. `.run(store, callback)` 안의 모든 코드에서 `.getStore()`를 호출하면 그 store가 동기적으로 반환된다.

3. 맞다. 이미 9개 case가 있으며, 코드 끝의 `workUnitStore satisfies never`가 TypeScript exhaustiveness check로 새 type 추가 시 컴파일 에러를 강제한다.

---

**Q: 처리할 때 프레임워크가 .run(store, callback)으로 감싸줍니다 << 여기서 말하는 프레임워크는 어떤 프레임워크 말하는겁니까? / async/await 체인을 따라가도 컨텍스트가 유지되기 때문에 "AsyncLocal"이라는 이름이 붙었습니다 << 무슨말입니까? / 당신이 생각할때 마지막 switch 처리는 베스트 패턴이라 생각하시나요?**

A:

1. **Next.js 자체**가 `.run()`을 호출한다. `adapter.ts:320`에서 middleware 진입 시 `workAsyncStorage.run(workStore, () => workUnitAsyncStorage.run(requestStore, params.handler, ...))`, `app-render.tsx:712`에서 렌더링 시 `workUnitAsyncStorage.run(requestStore, generateDynamicRSCPayload, ...)`. 사용자 코드는 이 `.run()` 안에서 실행되므로 `cookies()`로 getStore()하면 이미 씌워진 store가 나온다.

2. Node.js가 모든 비동기 작업(Promise, setTimeout, I/O)에 ID를 부여하고 `triggerAsyncId`로 "누가 나를 만들었는가"를 추적한다. `.run()` 안에서 시작된 비동기 체인은 아무리 깊어져도 동일한 store에 접근 가능. 동시에 1000개 요청이 처리되어도 각자의 비동기 체인이 독립적으로 추적되어 섞이지 않는다. 글로벌 변수로는 불가능한 것 — 동시 요청 시 서로 덮어쓰지만, AsyncLocalStorage는 실행 흐름별로 격리된다.

3. Discriminated Union + switch는 "최선"이라기보다 **확장성과 안전성의 현실적 절충**. 장점: `satisfies never`로 빠짐 방지, case별로 완전히 다른 동작이라 공통 추상화 어려움. 비용: `cookies()`, `headers()`, `draftMode()` 세 함수가 거의 동일한 switch를 중복하여 새 렌더링 모드 추가 시 3곳 이상 수정 필요. 대안으로 Strategy 패턴(각 Store에 `resolveCookies()` 메서드)도 가능하지만, Store의 책임이 커지고 각 함수의 분기 로직이 미묘하게 다르므로(예: draftMode는 cache 안에서도 read-only 허용) 무리한 추상화가 오히려 복잡성을 높일 수 있다.

---

**Q: 보이지 않는 배낭을 메고 다닌다 << 모든 http 요청에 해당되는 내용입니까? 다 메고 다니지만 위처럼 직접 호출 안하면 볼일 없음 vs 명시적으로 호출해야 생김..?**

A: **전자가 맞다.** 모든 HTTP 요청을 처리할 때 Next.js가 `.run(store, callback)`으로 감싸준다. `cookies()`는 이미 메고 있는 배낭을 열어보는 것이지, 배낭을 새로 만드는 게 아니다. `adapter.ts:320-327`과 `app-render.tsx:712-717`에서 진입점마다 `.run()`이 호출됨을 확인.

---

#### Step 3.2: server.ts — NextRequest/NextResponse/after/connection 진입점

**Q: 여기서 뭔가 질문할건 크게 없고, 여길 전체적으로 실생활 비유해주시겠어요?**

A: 호텔 비유로 정리:

- **`NextRequest`** = 투숙객 등록 카드. Web Standard `Request`가 기본 양식이라면, NextRequest는 호텔 전용 항목(`.cookies` 멤버십 카드, `.nextUrl` 예약 상세)이 추가된 양식.
- **`NextResponse`** = 프론트 직원의 응대 메뉴얼. `.json()` 정보 안내, `.redirect()` 다른 층 안내, `.rewrite()` 손님 모르게 B동 안내(URL 변경 없이 다른 콘텐츠), `.next()` 다음 담당자에게 인수인계.
- **`after()`** = 체크아웃 후 처리 (방 청소, 리뷰 이메일). 손님 기다리게 하지 않음.
- **`connection()`** = "예약인가요, 워크인인가요?" 확인. 정적/동적 렌더링 분기 신호.
- `headers.ts` API들과의 차이: headers.ts는 객실 내 비품 요청 전화(함수만 호출하면 시스템이 알아서 찾아줌 — AsyncLocalStorage), server.ts는 프론트 데스크 장비/양식(등록 카드에 적혀있는 데이터를 읽음).

---

**Q: .nextUrl → 예약 상세 (어떤 방, 어떤 층, 특별 요청사항까지 파싱) << 비유대로라면 이건 호텔(NextJs)에 특화된 서비스인데, 일반적으로는 없다면 default값으로 대체되나요? / "손님 모르게 B동으로 안내" < 이 말은 HTTP 요청(응답)과 다르게 행동한다는건가요?**

A:

1. default 대체가 아니다. `NextRequest`는 `Request`를 **상속(extends)**하므로 원래 `Request.url`(단순 문자열)은 그대로 있고, `NextURL`은 이를 Next.js 설정(basePath, i18n, trailingSlash)을 감안해 **파싱한 추가 객체**(`next-url.ts:34-45`). 비유 정정: `Request.url`이 손님이 쓴 "서울 OO호텔"이라면, `NextURL`은 직원이 "서울지점, A동, 12층, 한국어 서비스"로 분해 정리한 투숙 카드. Next.js가 아닌 일반 서버에는 이 기능 자체가 없다.

2. HTTP 응답 자체와 다르게 행동하는 것이 아니라, **Next.js 내부에서 요청을 다른 곳으로 전달한 뒤 그 응답을 원래 URL의 응답인 것처럼 돌려주는 것**. `response.ts:135-143`에서 `headers.set('x-middleware-rewrite', validateURL(destination))`. 브라우저 주소창은 `example.com/api/data`로 유지되지만 실제 콘텐츠는 `backend.internal/v2/data`에서 가져옴. redirect는 브라우저가 새 URL로 재요청하여 주소창이 바뀌지만, rewrite는 바뀌지 않음.

### 연결 토픽

- `webpack 레이어 시스템 상세`: reactServerComponents, serverSideRendering, appPagesBrowser 등 레이어별 동작 차이
- `AsyncLocalStorage 심층`: Node.js async_hooks의 asyncId/triggerAsyncId 추적 메커니즘
- `workStore vs workUnitStore`: 두 AsyncLocalStorage의 역할 차이와 생명주기
- `NextResponse.rewrite 내부 처리`: x-middleware-rewrite 헤더를 라우터가 어떻게 소비하는지
- `after() 구현 상세`: 응답 전송 후 비동기 작업 실행의 메커니즘 (waitUntil)
- `Image/Link 컴포넌트 진입점`: Step 4에서 다룰 Client Components API

---

## 2026-02-21 (재개 — Step 4.1부터)

### 학습 로드맵

- Step 1: API 엔트리 레이어 패턴
  - [x] 1.1: src/api/의 역할 — re-export 진입점 패턴 이해
  - [x] 1.2: 구현 위치 매핑 — 16개 파일이 가리키는 실제 구현 계층 (client/server/shared/pages)
- Step 2: Navigation API (Client/Server 분기)
  - [x] 2.1: navigation.ts — Client-side hooks (useRouter, usePathname 등)
  - [x] 2.2: navigation.react-server.ts — Server-side functions (redirect, notFound 등)
  - [x] 2.3: .react-server.ts 조건부 export 메커니즘 — 빌드 시 Client/Server 분기 방법
- Step 3: Server Request API
  - [x] 3.1: headers.ts — cookies(), headers(), draftMode() re-export 구조
  - [x] 3.2: server.ts — NextRequest/NextResponse/after/connection 진입점
- Step 4: Client Components API
  - [x] 4.1: image.ts & link.ts — Image/Link 컴포넌트 진입점
  - [x] 4.2: form.ts & script.ts — Form/Script 컴포넌트 진입점
  - [ ] 4.3: og.ts — OG Image Response 진입점
- Step 5: Dynamic Import & Pages Router Legacy
  - [ ] 5.1: dynamic.ts vs app-dynamic.ts — Pages vs App Router dynamic() 분기
  - [ ] 5.2: Pages Router 전용 API — router.ts, head.ts, document.tsx, app.tsx, constants.ts

### 학습 요약

- `src/api/image.ts`는 분기 없이 `shared/lib/image-external.tsx` → `client/image-component.tsx`로 단일 경로 연결. `defaultLoader`와 `__NEXT_IMAGE_OPTS`는 webpack의 alias/DefinePlugin이 빌드 타임에 `next.config.js`의 images 설정으로 교체/주입한다.
- `src/api/link.ts`는 빌드 alias에 의해 3개 구현으로 분기: Pages(`client/link.tsx` — `RouterContext`, `useIntersection` prefetch), App Client(`client/app-dir/link.tsx` — `AppRouterContext`, `useOptimistic`, segment cache), App Server(`client/app-dir/link.react-server.tsx` — legacyBehavior + SC 검증 후 Client 위임).
- `export *`는 ES Module 스펙상 default export를 포함하지 않으므로, `export { default }`와 `export *`가 항상 2줄로 함께 사용된다.
- Form은 Link와 동일한 Pages/App 포크 패턴(두 별도 파일), Script는 단일 파일 내 `appDir` 분기. 차이 이유: Link/Form은 라우터와 직접 상호작용(navigation, prefetch 메커니즘이 다름)하지만, Script는 DOM에 `<script>` 삽입이 본질이라 분기 몇 개로 충분.
- Script의 4가지 로딩 전략(`beforeInteractive`/`afterInteractive`/`lazyOnload`/`worker`)과 `ScriptCache`(Map)/`LoadCache`(Set) 중복 방지 메커니즘.
- Pages/App Router 공존 구조의 복잡성이 과도하다는 관찰: 실제로 공유되는 코드가 거의 없으면서 "공유하는 척 하느라 드는 비용"(alias, 어댑터, noop, Context 이중화)이 더 크다. TODO 주석이 3년 넘게 남아있는 것은 우선순위에서 밀리고 있다는 의미.

### 소스 코드 경로

- `ref/next.js/packages/next/src/api/image.ts:1-2` — Image re-export 진입점
- `ref/next.js/packages/next/src/shared/lib/image-external.tsx:1-37` — Image default + getImageProps() + 타입 export
- `ref/next.js/packages/next/src/client/image-component.tsx:1-80` — Image 컴포넌트 실제 구현 ('use client')
- `ref/next.js/packages/next/src/api/link.ts:1-2` — Link re-export 진입점
- `ref/next.js/packages/next/src/client/link.tsx:1-713` — Pages Router Link (RouterContext, useIntersection, prefetched Set)
- `ref/next.js/packages/next/src/client/app-dir/link.tsx:1-776` — App Router Link (AppRouterContext, useOptimistic, mountLinkInstance, FetchStrategy)
- `ref/next.js/packages/next/src/client/app-dir/link.react-server.tsx:1-31` — Server Link (legacyBehavior + SC 검증, ClientLinkComponent 위임)
- `ref/next.js/packages/next/src/build/create-compiler-aliases.ts:235-236` — App Router에서 link/form alias 교체
- `ref/next.js/packages/next/src/build/define-env.ts:78-98` — getImageConfig() (\_\_NEXT_IMAGE_OPTS 매핑)
- `ref/next.js/packages/next/src/build/webpack-config.ts:2029-2030` — DefinePlugin으로 define env 주입
- `ref/next.js/packages/next/src/api/form.ts:1-2` — Form re-export 진입점
- `ref/next.js/packages/next/src/client/form.tsx:1-169` — Pages Router Form (RouterContext, prefetch 미지원, startTransition TODO)
- `ref/next.js/packages/next/src/client/app-dir/form.tsx:1-233` — App Router Form (AppRouterContext, mountFormInstance, FetchStrategy.PPR)
- `ref/next.js/packages/next/src/client/form-shared.ts` — Pages/App 공유 유틸 (checkFormActionUrl, createFormSubmitDestinationUrl 등)
- `ref/next.js/packages/next/src/api/script.ts:1-2` — Script re-export 진입점
- `ref/next.js/packages/next/src/client/script.tsx:1-385` — Script 컴포넌트 (Pages/App 단일 파일, HeadManagerContext, 4 strategies)

### Q&A 전체 기록

#### Step 4.1: image.ts & link.ts — Image/Link 컴포넌트 진입점

**Q: `export { default } from '../shared/lib/image-external'` / `export * from '../shared/lib/image-external'` << 왜 두개로 export하는건가요? default export는 export \*에 포함안되나요?**

A: ES Module 스펙에 의해 `export *`는 default export를 포함하지 않는다. 이건 ECMAScript 명세의 의도적 설계로, 여러 모듈에서 `export *`를 할 때 default가 충돌하는 것을 방지하기 위한 것이다.

```ts
export { default } from "../shared/lib/image-external"; // Image 컴포넌트 (default)
export * from "../shared/lib/image-external"; // getImageProps, ImageProps 등 (named)
```

첫 줄이 없으면 `import Image from 'next/image'`가 undefined가 된다.

---

**Q: next.config.js의 images 설정이 빌드 시 여기로 주입된다 << 어떤 단계로 주입된다는건가요?**

A: 3단계 파이프라인으로 주입된다:

**Step 1**: `next.config.js`에서 사용자 설정을 읽음

**Step 2**: `define-env.ts:78-98`의 `getImageConfig()` 함수가 config에서 이미지 설정을 추출하여 `'process.env.__NEXT_IMAGE_OPTS'` 키로 매핑:

```ts
function getImageConfig(config: NextConfigComplete, dev: boolean) {
  return {
    "process.env.__NEXT_IMAGE_OPTS": {
      deviceSizes: config.images.deviceSizes,
      imageSizes: config.images.imageSizes,
      qualities: config.images.qualities,
      path: config.images.path,
      loader: config.images.loader,
      // dev일 때만 추가로 domains, remotePatterns 등 포함
    },
  };
}
```

**Step 3**: `webpack-config.ts:2029-2030`에서 webpack `DefinePlugin`이 이 매핑을 받아, 소스 코드의 `process.env.__NEXT_IMAGE_OPTS` 문자열을 빌드 타임에 실제 JSON 값으로 치환:

```ts
new (getWebpackBundler().DefinePlugin)(
  getDefineEnv({ ... })  // ← getImageConfig()의 결과가 여기 포함
)
```

비유: 소스 코드에 "빈칸 \_\_\_\_"을 남겨두고, 빌드 시 webpack이 `next.config.js`의 실제 값으로 채워 넣는 것. 런타임에 config를 읽는 게 아니라, 번들된 JS 파일에 이미 값이 박혀있다.

---

**Q: Router Context가 다르다 << 왜 다른가요? 근거/이유는?**

A: Pages Router와 App Router는 완전히 다른 라우터 구현이기 때문이다.

`RouterContext` (`router-context.shared-runtime.ts:4`):

```ts
export const RouterContext = React.createContext<NextRouter | null>(null);
```

— `NextRouter` 타입. `pathname`, `query`, `locale`, `events`, `beforePopState` 등 Pages Router 전용 API.

`AppRouterContext` (`app-router-context.shared-runtime.ts:65`):

```ts
export const AppRouterContext = React.createContext<AppRouterInstance | null>(
  null,
);
```

— `AppRouterInstance` 타입. `push`, `replace`, `refresh`, `prefetch` 등 App Router 전용 API. `query`, `locale`, `events` 같은 Pages 개념이 없다.

두 Context가 분리된 근본 이유: 인터페이스가 다르다. Pages Router의 `router.push(href, as, { shallow, locale })`와 App Router의 `router.push(href, { scroll })`는 시그니처부터 다르다. Link 컴포넌트가 `linkClicked()`에서 navigation을 호출할 때 이 차이가 그대로 반영된다:

```ts
// client/link.tsx:258-268 (Pages)
if ("beforePopState" in router) {
  router[replace ? "replace" : "push"](href, as, { shallow, locale, scroll });
} else {
  router[replace ? "replace" : "push"](as || href, { scroll });
}
```

---

**Q: `router[replace ? 'replace' : 'push'](href, as, { shallow, locale, scroll })` << 이건 직접 호출이 아닌가요?**

A: 맞다, Pages Link의 `router[method](...)` 자체는 직접 호출이다. 대비시키려 했던 포인트:

|                | Pages Link                                                                | App Link                                                                               |
| -------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 호출 대상      | `router.push()` — Context에서 가져온 router 인스턴스의 메서드를 직접 호출 | `dispatchNavigateAction()` — `app-router-instance` 모듈에서 require로 가져온 함수 호출 |
| 래핑           | 없음                                                                      | `React.startTransition()`으로 래핑                                                     |
| Link 상태 추적 | 없음                                                                      | `linkInstanceRef`를 넘겨서 navigation 중 pending 상태 추적                             |

양쪽 다 "직접 호출"이지만, App Link는 `startTransition`으로 감싸서 navigation을 React의 transition 시스템에 통합시키고, `linkInstanceRef`를 통해 "어떤 Link가 이 navigation을 트리거했는지" 추적한다는 차이.

---

**Q: 항상 false << 이게 항상 false라면 그냥 뚫기만 하고 내부 로직은 없는 상황이였던건가요?**

A: 그렇다. Pages Link에는 실제 link status 추적 로직이 없다.

`client/link.tsx:700-711`:

```ts
const LinkStatusContext = createContext<{ pending: boolean }>({
  // We do not support link status in the Pages Router, so we always return false
  pending: false,
});
export const useLinkStatus = () => {
  return useContext(LinkStatusContext);
};
```

주석에 `We do not support link status in the Pages Router`라고 명시. Pages Link 컴포넌트 본체에 `<LinkStatusContext.Provider>`로 감싸는 코드가 없다 — `<a>` 태그를 직접 반환.

반면 App Link (`client/app-dir/link.tsx:738-742`):

```ts
return (
  <LinkStatusContext.Provider value={linkStatus}>
    {link}
  </LinkStatusContext.Provider>
)
```

— `useOptimistic(IDLE_LINK_STATUS)`으로 생성한 `linkStatus`를 Provider로 감싸서 실제 pending 상태 추적.

Pages의 `useLinkStatus`가 존재하는 이유는 API 호환성 — `useLinkStatus`를 사용하는 코드가 Pages Router 환경에서도 에러 없이 동작하도록, 항상 `{ pending: false }`를 반환하는 noop 구현을 제공. Step 2.3의 `noop-head` 패턴과 같은 맥락.

---

#### Step 4.2: form.ts & script.ts — Form/Script 컴포넌트 진입점

**Q: 제가 지금까지 학습하면서 느낀건 "이정도면 pages와 app router 하나의 패키지에 공존 + 둘이 같이 사용 가능하게 대처" << 이것때문에 과하게 복잡한거같습니다**

A: 사용자의 판단이 정확하다. 소스에서 확인된 사실만 놓고 보면:

지금까지 본 패턴 정리:

| 파일            | 공존 비용                                                          |
| --------------- | ------------------------------------------------------------------ |
| `navigation.ts` | `.react-server.ts` 분리 + `create-compiler-aliases` 분기           |
| `link.tsx`      | Pages/App 완전 별도 구현 2개 + `.react-server` 서버 래퍼 = 3파일   |
| `form.tsx`      | 같은 구조 — Pages/App 2파일 + `form-shared.ts` 공유 모듈           |
| `useRouter()`   | `AppRouterContext` + `RouterContext` 2개 Context + 어댑터 함수 4개 |
| `next/head`     | `noop-head` 교체 + 빌드 경고                                       |
| `useLinkStatus` | Pages에서 항상 `{ pending: false }` 반환하는 noop                  |
| `script.tsx`    | 단일 파일이지만 `appDir` 분기가 곳곳에 산재                        |

실제로는 이미 사실상 분리되어 있다. 공유되는 코드가 거의 없으면서 "공유하는 척 하느라 드는 비용"(alias, 어댑터, noop, Context 이중화)이 더 크다.

Step 2.1에서 발견한 TODO 주석(`app-router.tsx:536-540`)에서 팀 스스로 "Pages와 공유하기 때문에 필요한 복잡성"이라 인정했지만, 3년 넘게 TODO로 남아있다는 건 우선순위에서 밀리고 있다는 뜻.

---

**Q: "기존 사용자 마이그레이션 경로를 끊는 대가가 있어서 현실적으로 쉽지 않은 선택이다" << 이 판단이 현실적인지 잘 모르겠습니다. / 지금 코드는 솔직히 과합니다, 조금더 말하면 "이렇게 했는데도 돌아간다고?" 정도입니다**

A: 이전 표현이 너무 관대했음을 인정. 소스에서 확인된 사실만 놓고 보면 사용자의 판단이 더 정확하다.

"링크를 클릭하면 다른 페이지로 이동한다"라는 기능 하나에 `api/link.ts`, `client/link.tsx`(714줄), `client/app-dir/link.tsx`(776줄), `client/app-dir/link.react-server.tsx`(32줄), `create-compiler-aliases.ts`, `webpack-config.ts`, `use-intersection.ts`, `components/links.ts`, `adapters.tsx` 등이 필요하다는 것 자체가 구조적 문제의 증거.

실제 공유 vs 별도 구현:

| 영역       | 실제 공유                | 별도 구현                           |
| ---------- | ------------------------ | ----------------------------------- |
| Link       | `isModifiedEvent()` 정도 | 나머지 전부                         |
| Form       | `form-shared.ts`         | 나머지 전부                         |
| Navigation | 없음                     | 완전 별도                           |
| Router     | 없음                     | `NextRouter` vs `AppRouterInstance` |

공유하는 것보다 "두 개를 하나인 것처럼 보이게 하는 접착제"(alias 시스템, 어댑터, noop 패턴, Context 이중화) 비용이 더 크다. "돌아가는 것과 잘 설계된 것은 다르다"는 것이 이 코드베이스에 대한 정확한 평가.

### 연결 토픽

- `og.ts — OG Image Response 진입점`: Step 4.3에서 다룰 예정
- `dynamic.ts vs app-dynamic.ts`: Step 5.1에서 다룰 Pages vs App dynamic() 분기 — 또 다른 포크 패턴
- `segment cache 시스템`: App Router Link의 `mountLinkInstance`/`FetchStrategy` 동작 상세
- `React Float API`: Script가 App Router에서 사용하는 `ReactDOM.preinit()`/`ReactDOM.preload()` 메커니즘
- `self.__next_s 부트스트랩`: beforeInteractive 스크립트의 서버-클라이언트 전달 메커니즘

---

## 2026-02-21 (재개 — Step 4.3부터)

### 학습 로드맵

- Step 1: API 엔트리 레이어 패턴
  - [x] 1.1: src/api/의 역할 — re-export 진입점 패턴 이해
  - [x] 1.2: 구현 위치 매핑 — 16개 파일이 가리키는 실제 구현 계층 (client/server/shared/pages)
- Step 2: Navigation API (Client/Server 분기)
  - [x] 2.1: navigation.ts — Client-side hooks (useRouter, usePathname 등)
  - [x] 2.2: navigation.react-server.ts — Server-side functions (redirect, notFound 등)
  - [x] 2.3: .react-server.ts 조건부 export 메커니즘 — 빌드 시 Client/Server 분기 방법
- Step 3: Server Request API
  - [x] 3.1: headers.ts — cookies(), headers(), draftMode() re-export 구조
  - [x] 3.2: server.ts — NextRequest/NextResponse/after/connection 진입점
- Step 4: Client Components API
  - [x] 4.1: image.ts & link.ts — Image/Link 컴포넌트 진입점
  - [x] 4.2: form.ts & script.ts — Form/Script 컴포넌트 진입점
  - [x] 4.3: og.ts — OG Image Response 진입점
- Step 5: Dynamic Import & Pages Router Legacy
  - [ ] 5.1: dynamic.ts vs app-dynamic.ts — Pages vs App Router dynamic() 분기
  - [ ] 5.2: Pages Router 전용 API — router.ts, head.ts, document.tsx, app.tsx, constants.ts

### 학습 요약

- `src/api/og.ts`는 `server/og/image-response.ts`로 re-export하며, `ImageResponse`는 `Response`를 상속하여 JSX → PNG 변환을 수행한다. constructor 안에서 `ReadableStream`을 생성하고, 그 `start()` 콜백에서 `@vercel/og`를 dynamic import하여 실제 변환을 지연 실행하는 Lazy Proxy 패턴이다.
- Edge/Node 런타임 분기는 `process.env.NEXT_RUNTIME === 'edge'` 체크로 수동 처리. `@vercel/og/package.json`에 `"edge-light"` 조건부 export가 있지만 dynamic import에서 auto resolve가 안 되어 수동 우회한 것으로, 최초 PR #47715(2023-03-31)부터 2년 넘게 유지된 우회책이다.
- 내부 도구 체인: Satori(JSX → SVG) + Yoga(CSS Flexbox 레이아웃, WASM) + Resvg(SVG → PNG, WASM). Edge에서는 WASM 기반, Node에서는 native 모듈 기반.
- `as Response`는 원래 `ImageResponse`가 `Response`를 상속하지 않던 시절(PR #47715)의 유물. PR #55187에서 `extends Response`로 변경되었으나 `as Response`는 제거되지 않았다.
- `body!` non-null assertion은 바로 윗줄에 `if (!body) return` 가드가 있어 불필요하지만, 최초 커밋에서 가드와 `!`가 동시에 작성되었고 이후 4번의 리팩터링에서 아무도 제거하지 않은 것이다.
- Pages/App Router 분기가 없는 유일한 API — OG 이미지 생성은 라우터와 무관한 서버 전용 기능이므로.

### 소스 코드 경로

- `ref/next.js/packages/next/src/api/og.ts:1` — OG Image re-export 진입점
- `ref/next.js/packages/next/og.js:1` — 패키지 루트 진입점 (dist/server/og/image-response require)
- `ref/next.js/packages/next/src/server/og/image-response.ts:1-64` — ImageResponse 클래스 (Response 상속, ReadableStream + Lazy Proxy)
- `ref/next.js/packages/next/src/server/og/image-response.ts:6-10` — Edge/Node 런타임 분기 (process.env.NEXT_RUNTIME 체크)
- `ref/next.js/packages/next/src/server/og/image-response.ts:24-27` — "auto resolving is not working" 주석 + 수동 import
- `ref/next.js/packages/next/src/compiled/@vercel/og/package.json:7-15` — edge-light 조건부 export 정의
- `ref/next.js/packages/next/src/compiled/@vercel/og/types.d.ts:8-50` — ImageOptions/ImageResponseOptions 타입 정의
- `ref/next.js/packages/next/src/compiled/@vercel/og/types.d.ts:102-117` — declare module 'react'로 tw prop 추가
- `ref/next.js/packages/next/src/compiled/@vercel/og/index.edge.d.ts:3-5` — Edge 빌드 ImageResponse (WASM 기반)
- `ref/next.js/packages/next/src/compiled/@vercel/og/index.node.d.ts:5-7,25` — Node 빌드 ImageResponse + unstable_createNodejsStream
- `ref/next.js/packages/next/src/build/webpack-config-rules/resolve.ts:6,20-21` — edgeConditionName 정의 + Edge compiler mainField
- `ref/next.js/packages/next/src/build/webpack-config.ts:696-700` — conditionNames 설정 (isEdgeServer 시 edge-light 포함)
- `ref/next.js/packages/next/src/build/define-env.ts:161-165` — process.env.NEXT_RUNTIME DefinePlugin 치환 (edge/nodejs/빈문자열)

### Q&A 전체 기록

#### Step 4.3: og.ts — OG Image Response 진입점

**Q: edge 분기처리가 제 기억이 맞다면 이전에는 esm/으로 나눴던거 같은데, 여기는 파일명에 명시해놓은 이유가 있을까요? (제 기억이 잘못되었을수있습니다)**

A: 기억이 맞을 수 있지만, 이 경우는 성격이 다르다. ESM/CJS 분기는 모듈 시스템(import vs require) 차이이고, 여기의 Edge/Node 분기는 런타임 환경 차이. Node 빌드에만 `unstable_createNodejsStream`(Node.js `Readable` 스트림)과 `import { Readable } from 'stream'`이 존재하여 Edge Runtime에서는 포함 자체가 불가능.

파일명으로 나눈 이유는 주석 `image-response.ts:25-26`에서 힌트: "So far we have to manually determine which build to use, as the auto resolving is not working". `@vercel/og/package.json`의 `exports` 조건부 분기가 이 컨텍스트에서 동작하지 않아 수동으로 파일명을 지정하여 우회.

---

**Q: OgModule['ImageResponse'] — 이러한 패턴을 많이 사용하나요? string 하드코딩은 언제봐도 위험해보입니다**

A: TypeScript의 Indexed Access Type. string 하드코딩처럼 보이지만 실제로는 타입 안전. `'ImageResponse'`는 타입 레벨에서만 존재하고 컴파일 시 완전히 제거됨. `@vercel/og`에서 `ImageResponse`를 제거하거나 이름을 바꾸면 컴파일 에러 발생. `ConstructorParameters<OgModule['ImageResponse']>`로 constructor 파라미터 타입을 추출하는 것은 Next.js 코드베이스에서 자주 보이는 패턴.

---

**Q: `const OGImageResponse = (await importModule()).ImageResponse`보다 중간 변수를 쓰는 게 더 깔끔할까요?**

A: 코드 스타일 선호의 영역. 이 경우 모듈에서 `ImageResponse` 하나만 꺼내 쓰므로 한 줄로 충분. 여러 export를 사용한다면 중간 변수가 정당화됨.

---

**Q: `new OGImageResponse(...args) as Response` — OGImageResponse 클래스가 Response 타입이 아니라는 겁니까?**

A: 아님. `OGImageResponse`는 `Response`를 상속(`index.edge.d.ts:3`에서 `class ImageResponse extends Response`). `as Response`가 필요한 이유는 dynamic import 때문 — `importModule()`의 반환 타입 추론에서 TypeScript가 `@vercel/og`의 내부 타입을 완전히 추론하기 어려워 `as`로 우회한 것. 실제로는 타입 어노테이션 `const imageResponse: Response = ...`가 더 안전한 접근.

---

**Q: controller — 갑자기 어디서 나온 변수인가요?**

A: `ReadableStream` 생성자의 콜백 파라미터. `new ReadableStream({ async start(controller) { ... } })` 형태에서 브라우저/Node.js가 `ReadableStreamDefaultController` 인스턴스를 인자로 넣어줌. 이 controller로 스트림에 데이터를 밀어넣거나(`enqueue`) 종료(`close`)할 수 있음. 비유: 택배 컨베이어 벨트를 설치할 때 시스템이 리모컨을 하나 주는 것.

---

**Q: `imageResponse.body!.getReader()` — "!" 위험은 없나요?**

A: 바로 윗줄에 가드가 있으므로 안전. `if (!imageResponse.body) { return controller.close() }`에서 body가 null이면 종료되므로, 그 아래에서 body는 반드시 non-null. TypeScript의 control flow analysis가 이를 추론할 수 있어 `!`는 실제로 불필요하지만, 해가 되지는 않음.

---

**Q: `while (true)` — done에 값이 채워지는 조건이 뭔가요?**

A: `reader.read()`는 Web Streams API의 메서드. `{ done: false, value }` = 데이터 청크 있음, `{ done: true }` = 소스 스트림 종료. `@vercel/og`의 PNG 생성이 끝나면 done이 true가 됨. `while (true) + if (done) return`은 스트리밍 데이터를 소비하는 표준 패턴. 에러 시에는 `reader.read()`가 throw하여 루프를 예외로 탈출.

---

**Q: enqueue — 이건 무슨 메서드인가요?**

A: `ReadableStreamDefaultController.enqueue(chunk)` — 스트림에 데이터 청크를 밀어넣는 메서드. `reader.read()`로 소스 스트림에서 청크를 받아 `controller.enqueue()`로 새 ReadableStream에 전달 → `super(readable, ...)`로 Response의 body가 됨 → 클라이언트가 이 Response를 읽음.

---

**Q: constructor 자체는 동기지만 start 메서드는 비동기라는 말이 맞을까요?**

A: 정확함. `new ReadableStream({ async start(controller) { ... } })` 호출 시 `start`가 즉시 호출되지만 `async` 함수이므로 `await importModule()`에서 일시 중지. 그 사이 constructor는 `super(readable, ...)`까지 완료되어 Response 객체 반환. 실제 `@vercel/og` 로딩과 PNG 생성은 비동기로 진행.

---

**Q: `=== 'edge'` — 따로 상수화를 안한 이유가 있을까요?**

A: 코드베이스 전체에서 `process.env.NEXT_RUNTIME === 'edge'`를 문자열 리터럴 그대로 사용하는 것이 컨벤션. `process.env.NEXT_RUNTIME`은 webpack DefinePlugin으로 빌드 타임에 치환(`define-env.ts:161-165`)되어 미니파이어가 dead code를 제거. 상수화해도 현대 미니파이어가 인라인하므로 최적화는 깨지지 않으며, 한 파일에서 1회만 쓰이므로 상수화 동기가 없었을 뿐.

---

**Q: WASM이 뭔가요?**

A: WebAssembly(줄여서 Wasm). 브라우저와 서버에서 실행할 수 있는 저수준 바이너리 포맷. `@vercel/og`에서 `resvg.wasm`(SVG → PNG, Rust 기반)과 `yoga.wasm`(CSS Flexbox 레이아웃, Meta 제작)을 사용. JavaScript보다 CPU 집약적 작업에 훨씬 빠르고, Edge Runtime에서 Node.js native 모듈 대신 사용할 수 있는 유일한 고성능 대안.

---

**Q: edge-light condition이 왜 동작 안할까요? / 옛날 한계라면 지금은 어떨까요?**

A: git 히스토리 추적 결과: 최초 PR #47715 (2023-03-31, Jiachi Liu)에서 작성. `@vercel/og/package.json`에 `"edge-light": "./index.edge.js"` 조건부 export가 있고, webpack 설정에서도 Edge 빌드 시 `conditionNames: ['edge-light', '...']`를 지원(`webpack-config.ts:696-700`). 그러나 dynamic `import()` 안에서 `edge-light` resolve가 동작하지 않아 수동 분기로 우회.

최초 버전에서는 `.js` 확장자 없이 `index.edge`/`index.node`로 import하고 있었고, PR #59541에서 `.js`가 추가됨. v16.1.6 현재에도 이 주석과 수동 분기가 그대로 남아있어, 한계가 해결되지 않았거나 해결 우선순위가 낮아 방치된 상태.

---

**Q: `as Response` 대신 `const imageResponse: Response = ...`도 가능한가요? 왜 as를 이용했을까요?**

A: git 히스토리에서 결정적 사실 발견. 최초 PR #47715에서 `ImageResponse`는 `Response`를 **상속하지 않았다**:

```ts
// PR #47715 — 최초 버전
export class ImageResponse {          // ← extends Response 없음!
  constructor(...args) {
    // ...
    const imageResponse = new OGImageResponse(...args) as Response
    return new Response(readable, { ... })  // ← constructor에서 직접 return
  }
}
```

이 시점에서 `as Response`는 필수였다 — `OGImageResponse`가 Response 서브클래스인지 TypeScript가 확인할 수 없었으므로. 5개월 뒤 PR #55187에서 `extends Response` + `super()` 패턴으로 변경되었으나, `as Response` 라인은 수정 범위 밖이라 제거되지 않음. 현재는 불필요한 유물.

---

**Q: TypeScript가 오판한 건지, `body!`가 남은 이유를 추적해주세요**

A: git blame 확인 결과, `if (!body) return` 가드와 `body!`는 **최초 커밋 PR #47715에서 동시에 작성**되었다. "가드를 나중에 추가하면서 `!`를 제거하지 않은 것"이라는 추측은 틀렸음. Jiachi Liu가 처음부터 양쪽 모두 작성. 이후 4번의 리팩터링(#53917, #55187, #56662, #59541)에서 각 PR의 관심사가 달라 아무도 이 `!`를 건드리지 않음. TypeScript의 오판이 아니라 습관적 방어 코딩 + 리뷰에서 미세 이슈가 걸러지지 않은 것.

---

**Q: 상수화 안 한 것이 과제 코드였으면 감점 사유였겠네요**

A: 맞다. 이 파일에서 "과제라면 감점"될 항목 정리:

| 항목                   | 현재 상태                                            | 이유                                                    |
| ---------------------- | ---------------------------------------------------- | ------------------------------------------------------- |
| `as Response`          | 불필요한 타입 단언                                   | `extends Response` 이후 제거했어야 함                   |
| `body!`                | 불필요한 non-null assertion                          | 바로 윗줄에 가드 존재                                   |
| `'edge'` 문자열 리터럴 | 상수화 미비                                          | 코드베이스 컨벤션이고 DefinePlugin 치환이라 실해는 없음 |
| "auto resolving" 주석  | 2년간 방치된 TODO성 주석                             | 해결 계획 없이 우회만 유지                              |
| 에러 핸들링 없음       | `reader.read()` throw 시 `controller.error()` 미호출 | ReadableStream이 대신 잡아주긴 하지만 명시적이지 않음   |

다만 과제와 실무의 차이: Next.js는 수백 명 기여 오픈소스로, 각 PR은 자기 관심사만 수정하고, "옆에 있는 사소한 이슈"까지 고치면 리뷰 범위가 넓어져 머지가 어려워짐. "완벽한 코드"보다 "안전하게 머지 가능한 최소 변경"이 우선되는 환경.

### 연결 토픽

- `dynamic.ts vs app-dynamic.ts`: Step 5.1에서 다룰 Pages vs App Router dynamic() 분기 — 또 다른 포크 패턴
- `@vercel/og 내부 동작`: Satori(JSX → SVG) + Yoga(Flexbox) + Resvg(SVG → PNG) 파이프라인 상세
- `webpack conditionNames와 dynamic import`: 정적 import에서는 동작하는 조건부 export가 dynamic import에서 왜 실패하는지
- `ReadableStream 패턴`: Web Streams API의 ReadableStream/WritableStream/TransformStream 활용 패턴
- `DefinePlugin dead code elimination`: 빌드 타임 상수 치환과 미니파이어의 dead code 제거 메커니즘

---
