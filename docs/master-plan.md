# Master Study Plan

> 생성일: 2026-02-21
> 최종 갱신: 2026-02-21

## 학습 목표

**풀스택 심화** — React와 Next.js의 소스 코드 레벨에서 동작 원리를 이해한다.
React 내부 렌더링 엔진을 먼저 이해하고, 그 위에 구축된 Next.js의 서버 렌더링/라우팅/캐싱 파이프라인을 연결하여 풀스택 아키텍처를 소스 근거로 설명할 수 있는 수준을 목표로 한다.

## 학습 중인 스킬

| 스킬 | 토픽 수 | 커버율 | 마지막 활동 |
|------|---------|--------|------------|
| react | 28개 + 3 Docs Sections | 17.4% (8/46 모듈) | 2026-02-19 |
| nextjs | 27개 + Docs Supplementary | 29% (10/34 모듈) | 2026-02-20 |

## 스킬 간 의존 관계

```
nextjs-aio ──depends_on──▶ react-aio (layer: library)

연결 토픽:
  React Topic 17 (RSC)         ↔  Next.js Topic 4 (app-render)     — RSC 렌더링 파이프라인
  React Topic 11 (Suspense)    ↔  Next.js Topic 5 (caching)        — Suspense 기반 캐싱/스트리밍
  React Topic 8-9 (DOM/Events) ↔  Next.js Topic 2 (client)         — 클라이언트 하이드레이션
  React Topic 12 (Transitions) ↔  Next.js Topic 4 (app-render)     — Server Actions
  React Topic 14 (Scheduler)   ↔  Next.js Topic 13 (build core)    — 빌드 시 렌더링 모드 결정
```

## 연결 토픽 맵

| React 토픽 | 연결 | Next.js 토픽 | 관계 |
|------------|------|-------------|------|
| Topic 17: react-server + react-client | ↔ | Topic 4: app-render | RSC Flight 프로토콜 — 서버 직렬화 ↔ Next.js RSC 렌더러 |
| Topic 11: Suspense & Activity | ↔ | Topic 5: caching | Suspense boundary → 스트리밍 SSR, PPR |
| Topic 8: react-dom | ↔ | Topic 2: client | createRoot/hydrateRoot → Next.js 하이드레이션 |
| Topic 9: react-dom-bindings | ↔ | Topic 2: client | 이벤트 위임 → 클라이언트 인터랙션 |
| Topic 12: Transitions & Actions | ↔ | Topic 4: app-render | useActionState, Server Actions RPC |
| Topic 7: Effects & Commit | ↔ | Topic 2: client | Commit Phase → DOM 반영, 하이드레이션 마무리 |

---

## Master Phase A: React 렌더링 핵심 경로

> 마일스톤: **"React 렌더링 파이프라인(setState → DOM 반영) 완전 이해"**
> 예상 토픽: 7개 (React Phase 1)

React의 핵심 렌더링 경로를 수직으로 탐색한다. Next.js는 아직 시작하지 않거나 최소한만 진행.
이 Phase가 이후 모든 학습의 기초가 된다.

### 학습 순서

| # | 스킬 | 토픽 | 진행 상태 | 연결 |
|---|------|------|----------|------|
| 1 | react | Topic 1: react (Core API) | ✅ 완료 | — |
| 2 | react | Topic 2: shared | ⏳ Step 1/5 | Topic 1의 ReactSymbols, shallowEqual |
| 3 | react | Topic 3: Fiber Structure | ✅ 완료 | Topic 1 → Fiber로 드릴다운 |
| 4 | react | Topic 4: Work Loop | ⏳ Step 3/5 | Topic 3의 Fiber 트리 순회 |
| 5 | react | Topic 5: Hooks | 미시작 | Topic 4의 Render Phase에서 실행 |
| 6 | react | Topic 6: Reconciliation | 미시작 | Topic 4의 beginWork 내부 |
| 7 | react | Topic 7: Effects & Commit | 미시작 | Topic 4의 Commit Phase ↔ **Next.js Topic 2** |

---

## Master Phase B: Next.js 사용자 API + React DOM 연동

> 마일스톤: **"Next.js App Router 요청 라이프사이클 + React DOM/이벤트/Suspense 이해"**
> 예상 토픽: 12개 (Next.js Phase 1 + React Phase 2 前半)

React DOM 연동과 Next.js의 사용자 대면 API를 교차 학습한다.
React의 DOM 렌더링을 이해한 상태에서 Next.js의 서버 렌더링을 보면 연결이 자연스럽다.

### 학습 순서

| # | 스킬 | 토픽 | 진행 상태 | 연결 |
|---|------|------|----------|------|
| 1 | nextjs | Topic 1: api | ⏳ Step 1/5 | Next.js 공개 API Surface |
| 2 | nextjs | Topic 2: client | 미시작 | ← **React Topic 7** (Effects & Commit) |
| 3 | react | Topic 8: react-dom | 미시작 | ↔ **Next.js Topic 2** (하이드레이션) |
| 4 | react | Topic 9: react-dom-bindings | 미시작 | ↔ **Next.js Topic 2** (이벤트) |
| 5 | nextjs | Topic 3: route-modules | 미시작 | 요청 → 모듈 분기 |
| 6 | nextjs | Topic 4: app-render | 미시작 | ← **React Topic 17** (RSC 연결점) |
| 7 | react | Topic 10: Context | 미시작 | Reconciliation bailout 무시 |
| 8 | react | Topic 11: Suspense & Activity | 미시작 | ↔ **Next.js Topic 5** (캐싱/스트리밍) |
| 9 | nextjs | Topic 5: caching | 미시작 | ← **React Topic 11** (Suspense) |
| 10 | nextjs | Topic 6: proxy & edge | 미시작 | 요청 가로채기/리디렉션 |
| 11 | nextjs | Topic 7: font | 미시작 | 폰트 최적화 |
| 12 | nextjs | Topic 8: third-parties & experimental | 미시작 | 서드파티 통합 |

---

## Master Phase C: 양쪽 Core Runtime 심화

> 마일스톤: **"React 스케줄링/우선순위 + Next.js 서버/빌드 내부 구조 이해"**
> 예상 토픽: 13개 (React Phase 2 後半 + Next.js Phase 2)

React의 스케줄링/우선순위 시스템과 Next.js의 서버 코어/빌드 시스템을 교차 학습한다.

### 학습 순서

| # | 스킬 | 토픽 | 연결 |
|---|------|------|------|
| 1 | react | Topic 12: Transitions & Actions | ↔ **Next.js Topic 4** (Server Actions) |
| 2 | react | Topic 13: Lanes & Priority | Topic 4 Work Loop의 스케줄링 |
| 3 | react | Topic 14: Scheduler | Topic 13의 Lane → 실제 스케줄링 |
| 4 | nextjs | Topic 9: shared | 서버/클라이언트 공유 유틸리티 |
| 5 | nextjs | Topic 10: lib | 메타데이터, TypeScript 지원 |
| 6 | nextjs | Topic 11: base-server & config | 서버 코어 아키텍처 |
| 7 | nextjs | Topic 12: routing internals | 라우트 매칭/정규화 |
| 8 | react | Topic 15: Error Handling | Error Boundary 내부 |
| 9 | react | Topic 16: Remaining Files | Hydration, ClassComponent 등 |
| 10 | nextjs | Topic 13: build core | ← **React Topic 14** (렌더링 모드) |
| 11 | nextjs | Topic 14: webpack & turbopack | 번들러 통합 |
| 12 | nextjs | Topic 15: export + next-routing | 정적 Export, i18n |
| 13 | nextjs | Topic 16: MCP | MCP 서버 지원 |

---

## Master Phase D: RSC 브릿지

> 마일스톤: **"RSC 프로토콜(직렬화/소비) 완전 이해 + React Compiler 개요"**
> 예상 토픽: 6개 (React Phase 3)

React의 Server Components 구현을 집중 학습한다.
Master Phase B에서 Next.js의 app-render를 학습했으므로, 여기서 React 측 RSC 구현을 보면 양쪽이 완전히 연결된다.

### 학습 순서

| # | 스킬 | 토픽 | 연결 |
|---|------|------|------|
| 1 | react | Topic 17: react-server + react-client | ↔ **Next.js Topic 4** (app-render 복습 연결) |
| 2 | react | Topic 18: react-server-dom-* | 번들러별 Flight 어댑터 |
| 3 | react | Topic 19: useSyncExternalStore | 외부 상태 동기화 |
| 4 | react | Topic 20: eslint-plugin-react-hooks | Hooks 규칙 ESLint 구현 |
| 5 | react | Topic 21: babel-plugin-react-compiler | React Compiler 파이프라인 |
| 6 | react | Topic 22: Compiler Sub-packages + Utils | 보조 패키지 |

---

## Master Phase E: Infrastructure & Tooling

> 마일스톤: **"개발 도구, 테스트 인프라, CLI 등 전체 생태계 이해"**
> 예상 토픽: 17개 (React Phase 4 + Next.js Phase 3)

양쪽의 개발 도구, 테스트 인프라, CLI, 배포 도구 등을 교차 학습한다.

### 학습 순서

| # | 스킬 | 토픽 | 연결 |
|---|------|------|------|
| 1 | nextjs | Topic 17: next-devtools | Next.js Dev Overlay |
| 2 | nextjs | Topic 18: server/dev + react-refresh-utils | ↔ **React Topic 23** (HMR) |
| 3 | react | Topic 23: react-refresh + react-markup | HMR 메커니즘 |
| 4 | react | Topic 24: Alternative Renderers | HostConfig 인터페이스 |
| 5 | react | Topic 25: Testing Infrastructure | 테스트 렌더러 |
| 6 | nextjs | Topic 19: cli + bin | CLI 시스템 |
| 7 | nextjs | Topic 20: telemetry + diagnostics + trace | 관측성 |
| 8 | nextjs | Topic 21: bundles + compiled | 벤더링 전략 |
| 9 | nextjs | Topic 22: pages + ESLint packages | 레거시 + ESLint |
| 10 | nextjs | Topic 23: create-next-app | 스캐폴딩 CLI |
| 11 | nextjs | Topic 24: next-codemod | 코드 마이그레이션 |
| 12 | nextjs | Topic 25: next-swc | SWC 네이티브 바인딩 |
| 13 | react | Topic 26: react-devtools-shared | DevTools 핵심 |
| 14 | react | Topic 27: react-devtools Variants | DevTools UI/확장 |
| 15 | react | Topic 28: react-debug-tools | Hook 디버깅 |
| 16 | nextjs | Topic 26: runtime-utils + build-plugins + mdx | 유틸리티 패키지 |
| 17 | nextjs | Topic 27: server infrastructure | 서버 인프라 |

---

## Docs Supplementary Study

Master Phase A~E에서 소스 코드로 내부 동작을 이해한 후, 공식 문서로 "사용자 관점" 보충.

### React Docs

| Section | 내용 | 연결 Phase |
|---------|------|-----------|
| Section A: Learn Guides | 실용적 가이드 13개 | Phase A~B 이후 |
| Section B: API Reference | 전체 API 레퍼런스 교차 검증 | Phase D 이후 |
| Section C: Best Practices | 59개 규칙 교차 검증 | 전체 완료 후 |

### Next.js Docs

| 내용 | 연결 Phase |
|------|-----------|
| authentication, forms, testing 가이드 | Phase B 이후 |
| next.config.js 전체 옵션 (61개) | Phase C 이후 |
| caching, self-hosting, PWA 가이드 | Phase B~C 이후 |

---

## 주간 학습 템플릿

| 요일 | 추천 유형 | 예상 시간 |
|------|----------|----------|
| 평일 | `/learn` 1 토픽 (새 개념) | 40-60min |
| 주말 | `/review` 복습 + `/learn` 1 토픽 | 30+40min |

### 스킬 교차 규칙

- 같은 스킬 연속 **3세션** 이상이면 다른 스킬로 전환 추천
- 연결 토픽(↔ 표시)은 가능하면 **연속 세션**에서 학습하여 크로스 레퍼런스 강화
- Phase 경계에서는 `/review`로 이전 Phase 복습 후 다음 Phase 진입

> 이 템플릿은 `/next`에서 일별 추천을 할 때 참고합니다.
