# Topic 1: next/src/api

> `/learn nextjs` 세션 기록. 소스 코드 기반 Q&A 히스토리.

---

## 2026-02-20

### 학습 로드맵
- Step 1: API Facade 패턴
  - [x] 1.1: src/api/ 디렉토리의 역할 — 16개 파일 전체 지도와 re-export 패턴
  - [x] 1.2: 빌드 & 패키지 매핑 — src/api/ → dist/api/ → root CJS shim → `next/X` import
- Step 2: Client API Re-exports
  - [ ] 2.1: navigation.ts — useRouter, usePathname, useSearchParams의 실제 구현 위치
  - [ ] 2.2: link, form, script, image — 컴포넌트 re-export 패턴
- Step 3: Server API Re-exports
  - [ ] 3.1: headers.ts — cookies(), headers(), draftMode()의 구현 위치
  - [ ] 3.2: server.ts + og.ts — NextRequest/NextResponse와 ImageResponse
- Step 4: Dual-environment 패턴
  - [ ] 4.1: navigation.react-server.ts — 서버 전용 redirect, notFound
  - [ ] 4.2: create-compiler-aliases.ts — 번들러의 레이어별 alias 스위칭 메커니즘
- Step 5: Pages Router Legacy Re-exports
  - [ ] 5.1: dynamic.ts vs app-dynamic.ts — Pages vs App Router dynamic()
  - [ ] 5.2: router.ts, head.ts, app.tsx, document.tsx — Pages Router 전용 API

### 학습 요약
- `src/api/`는 16개 파일로 구성된 re-export facade. 직접 로직 없이 `client/`, `server/`, `shared/`의 실제 구현을 re-export한다.
- 번들러는 `create-compiler-aliases.ts`의 alias 시스템으로 `next/X` → `next/dist/api/X`로 리디렉트. 빌드 컨텍스트(Server/Client, App/Pages, Node/Edge)에 따라 다른 파일로 라우팅한다.
- `src/api/`는 barrel export 문제가 없다 — 16개 파일이 별도 진입점으로 분리되어 있어 번들러가 사용된 것만 방문. 서드파티의 barrel 문제는 `next-barrel-loader` + `optimizePackageImports`로 해결.
- `dist/api/`와 `dist/esm/api/`에 동일 ESM을 이중 출력 — Edge 서버 alias(`dist/*` → `dist/esm/*`)를 위한 구조. Pages Router CJS 호환 때문에 `dist/` vs `dist/esm/` 분기가 존재.

### 소스 코드 경로
- `packages/next/src/api/*.ts` — 16개 공개 API re-export 진입점
- `packages/next/src/build/create-compiler-aliases.ts:203-242` — `next/X` → `next/dist/api/X` alias + App Router/Server Layer 오버라이드
- `packages/next/src/build/webpack/loaders/next-barrel-loader.ts` — 서드파티 barrel export 최적화 로더
- `packages/next/src/build/swc/options.ts:471-474` — `optimizePackageImports` → SWC `autoModularizeImports` 설정
- `packages/next/src/build/swc/options.ts:33-36` — `shouldOutputCommonJs` — Next.js 내부 파일 CJS 강제
- `packages/next/src/build/swc/options.ts:237-239` — App Router ESM / Pages Router CJS 분기 주석
- `packages/next/taskfile.js:2452-2460` — `api_esm` 빌드 태스크 (ESM → dist/api + dist/esm/api)
- `packages/next/taskfile.js:2438-2449` — `server` (CJS) vs `server_esm` (ESM) 비교
- `packages/next/navigation.js` — 루트 CJS shim
- `packages/next/navigation.d.ts` — 루트 ESM 타입 선언
- `packages/next/headers.js` — 개별 named export 선택형 CJS shim
- `packages/next/server.js` — CJS + named export 양립 패턴
- `packages/next/package.json:11-76` — `files` 배열 (루트 shim 파일 목록)
- `packages/next/src/server/config-shared.ts:450` — `optimizePackageImports` 타입 정의
- `packages/next/src/build/webpack-config.ts:1937-1952` — `__barrel_optimize__` 로더 규칙
- `packages/next/src/build/webpack-config.ts:2330-2341` — dev 모드 `usedExports: false`
- `ref/react-fork/packages/react/npm/index.js` — React CJS 배포 패턴 (비교용)

### Q&A 전체 기록

#### Step 1.1: src/api/ 디렉토리의 역할

**Q: 이러한 barrel export 패턴으로 발생할수있는 트리쉐이킹 안되는 위험성은 없나요 ?**

A: `src/api/` 자체는 트리쉐이킹 위험이 낮다. 일반적인 barrel 문제는 "하나의 index.js에 수백 개를 re-export"하는 경우인데, `src/api/`는 16개 파일이 각각 별도 패키지 서브패스에 매핑된다.

- `next/navigation` → `src/api/navigation.ts` (별도 파일)
- `next/headers` → `src/api/headers.ts` (별도 파일)

사용자가 `import { useRouter } from 'next/navigation'`을 하면, 번들러는 `navigation.ts` 하나만 진입하고 나머지 15개는 방문하지 않는다. 파일 간에 import 관계가 없기 때문.

각 파일 내의 `export *`는 해당 모듈의 모든 export를 통과시키지만, webpack의 `usedExports` 최적화가 사용하지 않는 export를 제거한다.

서드파티 패키지의 barrel 문제를 위해 `next-barrel-loader`(`src/build/webpack/loaders/next-barrel-loader.ts`)가 존재한다. SWC의 `optimizeBarrelExports` 변환으로 barrel 파일을 분석하여 export map을 생성하고, 사용자가 실제로 import한 이름만 남기고 나머지를 제거한다. `next.config.js`의 `experimental.optimizePackageImports`에 지정된 패키지에만 적용.

---

**Q: 사용자가 import { useRouter } from 'next/navigation'을 하면, 번들러는 navigation.ts 하나만 진입하고 나머지 15개 파일은 아예 처리하지 않습니다. << 이게 되는 이유가 뭔가요? 제가 인식하고있는 barrel export 위험성은 export * from "./a", export * from "./b" ... 이렇게 작성되고, 사용자가 import {someA} from "next/a" << 이렇게 가져와도 b,c...들이 같이 번들링되지 않나? 였습니다**

**+ usedExports 최적화가 뭔가요? 이름만 보면 사용되는것만 export한다 같은데 위에 사용되고 안되고는 동적으로 결정되는거 아닌가요?**

**+ SWC의 optimizeBarrelExports 변환으로 barrel 파일을 분석 < 무슨 분석을 합니까?**

**+ 사용자가 실제로 import한 이름만 남기고 나머지 re-export를 제거 < 사용자 import 결정 시점이 더 미래 아닌지?**

A: 4개 질문 모두 하나의 핵심 오해에서 출발 — **Next.js는 "이미 번들링된 패키지"가 아니라 사용자의 앱과 함께 빌드 시점에 번들링된다.**

비유: Next.js = 이미 구운 빵이 아니라, 밀가루/재료. 사용자의 앱과 함께 빵을 구움(번들링).

`next build` 실행 시 webpack/turbopack이 사용자의 코드와 Next.js 소스를 하나의 빌드 그래프에서 함께 처리한다. 번들러가 사용자의 import를 따라가면서 필요한 모듈만 끌어온다.

**Q1 답변**: `src/api/`에는 16개를 한곳에 모은 단일 barrel(`src/api/index.ts`)이 존재하지 않는다. 16개가 물리적으로 분리된 별개 파일이고, 사용자가 `next/navigation`을 import하면 `navigation.ts`만 진입점이 된다.

**Q2 답변**: `usedExports`는 빌드 시점에 동작한다. 번들러가 사용자의 모든 import를 먼저 파악하고, 각 모듈에서 실제로 사용된 export만 표시한 뒤, minifier가 unused export를 제거한다. Next.js는 dev 모드에서는 빌드 속도를 위해 이걸 끈다 (`webpack-config.ts:2340: webpack5Config.optimization.usedExports = false`).

**Q3 답변**: SWC는 barrel 파일의 정적 구조(AST)를 분석해서 export map을 생성한다:
```
입력: export { a } from './a'; export { b } from './b'
출력: __next_private_export_map__ = '[["a","./a","a"],["b","./b","b"]]'
```
코드를 실행하지 않고, 어떤 이름이 어느 파일에서 오는지만 매핑한다.

**Q4 답변**: barrel-loader 실행 시점에는 이미 사용자의 import를 알고 있다. 파이프라인 순서:
1. 사용자 코드 파싱 → `import { Button } from '@mui/material'` 발견
2. SWC 변환 → `import { Button } from '__barrel_optimize__?names=Button!=!@mui/material'` (이름이 URL에 인코딩됨)
3. webpack의 `__barrel_optimize__` 매칭 → barrel-loader가 URL에서 `names=['Button']`을 추출
4. export map에서 Button만 찾아 re-export → 나머지 수백 개 제거

SWC의 `autoModularizeImports` 설정 (`swc/options.ts:471-474`):
```typescript
if (optimizePackageImports) {
    baseOptions.autoModularizeImports = { packages: optimizePackageImports }
}
```
webpack loader에서 names 추출 (`webpack-config.ts:1938-1941`):
```typescript
test: /__barrel_optimize__/,
use: ({ resourceQuery }) => {
    const names = (resourceQuery.match(/\?names=([^&]+)/)?.[1] || '').split(',')
```

---

**Q: 이러한 패턴(사용자 앱을 빌드시 같이 빌드되는 패턴)이 일반적인가요? (react, react-router, ...이런 패키지들도 동일한지?)**

A: "번들러가 import를 따라가며 의존 그래프를 만든다"는 것은 모든 패키지에 해당한다. 하지만 패키지가 어떤 형태로 코드를 제공하느냐에 따라 트리쉐이킹 효과가 크게 달라진다.

**React** (`ref/react-fork/packages/react/npm/index.js`):
```js
if (process.env.NODE_ENV === 'production') {
  module.exports = require('./cjs/react.production.js');
}
```
- CJS 전용, ESM 없음, `sideEffects` 선언 없음
- `cjs/react.production.js` = 모든 API가 들어있는 플랫한 단일 파일
- 트리쉐이킹 사실상 불가. 하지만 React 자체가 작고(~6KB gzip), 전체가 거의 다 사용되므로 문제 없음

**모던 라이브러리** (react-router 등):
- ESM + `sideEffects: false` 조합으로 배포
- 번들러가 export 단위로 트리쉐이킹 가능

**Next.js src/api/**:
- 다중 ESM 진입점 (16개 별도 파일)
- 파일 단위로 분리되어 가장 효과적

스펙트럼:
```
트리쉐이킹 어려움 ◀──────────────────▶ 트리쉐이킹 쉬움
React (CJS 단일)   일반 모던 패키지    Next.js src/api/
                   (ESM+sideEffects)   (다중 ESM 진입점)
```

---

#### Step 1.2: 빌드 & 패키지 매핑

**Q: SWC가 src/api/ TypeScript를 ESM JavaScript로 컴파일하여 두 곳에 출력합니다. << 왜 2곳에 출력하나요?**

**+ 왜 굳이 /api -> /dist/api로 리다이렉트하나요?**

A:

**왜 2곳 출력**: 대부분의 모듈은 CJS(`dist/`) + ESM(`dist/esm/`) 두 가지 포맷으로 출력한다:

| 위치 | 포맷 | 용도 |
|------|------|------|
| `dist/server/` | CJS | Node.js 서버 |
| `dist/esm/server/` | ESM | Edge 서버 |

Edge 서버는 alias로 모든 `next/dist/*`를 `next/dist/esm/*`로 교체한다 (`create-compiler-aliases.ts:98-106`). `src/api/`는 `export *` 문법 때문에 CJS 불가능하므로 양쪽 모두 ESM이지만, Edge alias가 `dist/esm/api/`를 찾으므로 존재해야 한다.

```
                  dist/        dist/esm/
server/         CJS            ESM
client/         CJS            ESM
api/            ESM ←동일→     ESM    ← 예외
```

**왜 alias 리디렉트**: alias 없으면 `next/navigation` → 루트 `navigation.js` (CJS shim) → 항상 클라이언트 버전. 이러면 3가지가 불가능:

1. **서버/클라이언트 스위칭 불가**: 서버 컴포넌트에서도 클라이언트 navigation을 가져옴. `redirect()`, `notFound()` 서버 전용 API로 교체 불가.
2. **App/Pages Router 분기 불가**: 같은 `next/dynamic`이지만 App Router는 `app-dynamic`, Pages Router는 `dynamic`이 필요.
3. **Edge ESM 전환 불가**: Edge 런타임은 CJS 미지원, 루트 CJS shim이 동작 안 함.

alias 시스템은 모듈 해석의 "라우터":
```
                        ┌─ Client Layer ──→ dist/api/navigation.js
next/navigation ─alias─┤
                        ├─ Server Layer ──→ dist/api/navigation.react-server.js
                        └─ Edge Server ───→ dist/esm/api/navigation.js
```

---

**Q: node도 esm으로 처리하면 최소한 esm 분기는 없어지지 않나요?**

A: 맞다. 원칙적으로 ESM 통일하면 분기가 없어진다. 하지만 소스에 아직 CJS를 유지하는 이유가 명시되어 있다.

`swc/options.ts:237-239`:
```typescript
// For app router we prefer to bundle ESM,
// On server side of pages router we prefer CJS.
```

`swc/options.ts:33-36`:
```typescript
// Ensure Next.js internals and .cjs files are output as CJS modules
function shouldOutputCommonJs(filename) {
  return isCommonJSFile(filename) || nextDistPath.test(filename)
}
```

Pages Router가 `require()` 기반 동기적 모듈 로딩에 의존하므로, Next.js가 App Router + Pages Router를 한 패키지에서 동시 지원하는 한 CJS/ESM 양쪽이 필요하다. Pages Router 지원을 완전히 드롭하면 `dist/` ESM 통일 가능 → Edge alias 제거, api 이중 출력 제거 가능. 현재는 Pages Router 호환을 위한 레거시 비용.

---

### 연결 토픽
- **client/components/navigation.ts**: Step 2.1에서 다룰 useRouter, usePathname 등의 실제 구현
- **create-compiler-aliases.ts 전체**: Step 4.2에서 다룰 번들러 레이어 스위칭 메커니즘
- **next-barrel-loader + optimizePackageImports**: 서드파티 barrel 최적화 심화 (Topic 14: build — webpack & turbopack)
- **Pages Router vs App Router 모듈 분기**: Step 5에서 다룰 레거시 re-export 패턴
- **Edge Runtime**: Topic 5 (proxy & middleware) — Edge 서버의 ESM 전용 환경

---
