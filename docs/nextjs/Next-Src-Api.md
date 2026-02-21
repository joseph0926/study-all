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
