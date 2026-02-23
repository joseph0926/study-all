# MCP 수정 작업 진행 상황

> 최종 갱신: 2026-02-23 (Unit 6 완료)

## 전체 진행도

| Unit | 설명 | 상태 | 비고 |
|------|------|------|------|
| 1 | 빌드 녹색 (타입 에러 + 테스트) | ✅ 완료 | typecheck 0 에러, test 34/34 통과 |
| 2 | SDK 마이그레이션 | ✅ 완료 | `registerTool()` 전환, 정적 import |
| 3 | Clock 주입 | ✅ 완료 | daily/review/session/cache 11곳 주입 |
| 4 | config.ts 전역 상태 제거 | ✅ 완료 | overrides Map 제거, STUDY_ROOT 필수화 |
| 5 | Tool 버그 수정 | ✅ 완료 | review/plan-parser/stats/error-wrapper 반영, test 36/36 |
| 6 | 서버 등록 + E2E | ✅ 완료 | `.mcp.json` 등록 + SDK stdio E2E(listTools 20개) |
| 7 | 커맨드 프롬프트 축소 | ⬜ 대기 | Unit 6 의존 |

---

## Unit 1: 빌드 녹색 ✅

### 1-A. 타입 에러 수정
- [x] `types/contracts.ts` ResolvedContext, CacheMeta, Envelope optional 프로퍼티 `| undefined` 추가
- [x] `types/domain.ts` DailyStatus, DashboardSkill, ReviewQueueItem, PlanPhase, PlanTopic, SessionResumePoint optional 프로퍼티 `| undefined` 추가
- [x] `index.ts` RegisteredTool.run 파라미터 `unknown` → `any` (contravariance 해소)
- [x] `parsers/plan-parser.ts` regex match group + 배열 인덱스 non-null assertion
- [x] `parsers/meta-parser.ts` 테이블 파싱 인덱스 non-null assertion
- [x] `parsers/session-parser.ts` 인덱스/match group non-null assertion
- [x] `tools/progress.ts` replaceCheckboxInRange guard + 루프 내 변수 추출
- [x] `tools/daily.ts` replaceSection 루프 인덱스 non-null assertion
- [x] `test/tools/daily.test.ts` `mode: "skill" as const`

### 1-B. 테스트 실패 수정
- [x] `session-parser.ts:80` 정규식 `^-\s+` → `^\s*-\s+` (인덴트 허용)
- [x] `session-parser.test.ts` 기대값 갱신 (2026-02-22 세션 기준)
- [x] `session.test.ts` lastDate 기대값 갱신 (`2026-02-11` → `2026-02-22`)

### 검증
- [x] `pnpm typecheck` 통과 (에러 0개)
- [x] `pnpm test` 통과 (34/34)

---

## Unit 2: SDK 마이그레이션 ✅

### 변경 내용
- [x] dynamic import → 정적 `import { McpServer }` / `import { StdioServerTransport }`
- [x] `RegisteredTool` → `ToolDef` rename (SDK `RegisteredTool`과 충돌 방지)
- [x] `server.tool(name, desc, schema, handler)` → `server.registerTool(name, config, handler)`
- [x] `tool.schema.parse(args)` 제거 — SDK가 자동 검증 후 parsed args를 콜백에 전달
- [x] `config.set` 도구 등록 제거 (Unit 4와 함께 진행)
- [x] `as { McpServer: ... }` / `as { StdioServerTransport: ... }` 타입 캐스팅 제거

### 검증
- [x] `pnpm typecheck` 통과 (에러 0개)
- [x] `pnpm test` 통과 (34/34)

### 수정 파일 목록
| 파일 | 변경 내용 |
|------|----------|
| `src/index.ts` | 정적 import, `ToolDef` rename, `registerTool()` 전환, `config.set` 도구 제거 |

---

## Unit 3: Clock 주입 ✅

### 변경 내용
- [x] `src/tools/daily.ts`: `dailyGetStatus`, `dailyLogPlan`, `dailyLogDone`, `dailyFinalize` + 내부 `todayFile`, `replaceStatus`, `computeStreak`에 `clock: Clock = systemClock` 파라미터 추가 (7곳 `new Date()` 제거)
- [x] `src/tools/review.ts`: `reviewRecordResult`, `reviewGetQueue`에 `clock: Clock = systemClock` 파라미터 추가 (2곳 `new Date()` 제거)
- [x] `src/tools/session.ts`: `sessionAppendLog`에 `clock: Clock = systemClock` 파라미터 추가 (1곳 `new Date()` 제거)
- [x] `src/lib/cache.ts`: `MemoryCache` constructor에 `clock: Clock = systemClock`, `Date.now()` → `clock.now().getTime()` (2곳)

### 패턴
- `clock: Clock = systemClock` optional 파라미터로 하위 호환 유지
- `makeEnvelope(data, clock)` 형태로 envelope의 `generatedAt`도 clock 기반
- 기존 호출 코드는 clock 인자 없이 동일하게 동작 (default = systemClock)

### 검증
- [x] `pnpm typecheck` 통과 (에러 0개)
- [x] `pnpm test` 통과 (34/34)

### 수정 파일 목록
| 파일 | 변경 내용 |
|------|----------|
| `src/tools/daily.ts` | import Clock, 7개 함수에 clock 파라미터 추가 |
| `src/tools/review.ts` | import Clock, `reviewRecordResult`/`reviewGetQueue`에 clock 추가 |
| `src/tools/session.ts` | import Clock, `sessionAppendLog`에 clock 추가 |
| `src/lib/cache.ts` | import Clock, `MemoryCache` constructor에 clock, `Date.now()` → `clock.now().getTime()` |

---

## Unit 4: config.ts 전역 상태 제거 ✅

### 변경 내용
- [x] `src/tools/config.ts`: 모듈 레벨 `overrides` Map 제거
- [x] `src/tools/config.ts`: `configSet` 함수 및 `configSetInputSchema` 제거
- [x] `src/tools/config.ts`: `configSchemas`에서 `set` 제거
- [x] `src/index.ts`: `config.set` 도구 등록 제거 + `configSet` import 제거
- [x] `src/config.ts`: `STUDY_ROOT` 환경변수 필수화 — 없으면 에러 throw
- [x] `test/tools/config.test.ts`: `configSet` 테스트 → `STUDY_ROOT` 필수 테스트로 교체
- [x] `test/tools/daily.test.ts`: `process.env.STUDY_ROOT` 설정 추가
- [x] `test/tools/review.test.ts`: 3개 테스트에 `process.env.STUDY_ROOT` 설정 추가

### 검증
- [x] `pnpm typecheck` 통과 (에러 0개)
- [x] `pnpm test` 통과 (34/34)

### 수정 파일 목록
| 파일 | 변경 내용 |
|------|----------|
| `src/tools/config.ts` | overrides Map 삭제, configSet 삭제 |
| `src/config.ts` | STUDY_ROOT 필수화 |
| `test/tools/config.test.ts` | configSet 테스트 → STUDY_ROOT 필수 테스트 |
| `test/tools/daily.test.ts` | STUDY_ROOT env 추가 |
| `test/tools/review.test.ts` | STUDY_ROOT env 추가 (3곳) |

---

## Unit 5: Tool 버그 수정 ✅

### 변경 내용
- [x] 5-A. `review.getQueue`: `lastReview` 오용 제거, `nextReview` 필드로 의미 명확화
  - `ReviewQueueItem`에 `nextReview?: string` 추가
  - meta 기반 대기열 항목에 `nextReview` 반환
  - meta 없는 첫 복습 항목도 `nextReview=today`로 일관성 유지
- [x] 5-B. `plan-parser.ts`: Coverage 테이블 헤더 행 필터링 + topic module 추출 시 하이픈 보존
  - `| Status | Module | ... |` 헤더가 `coverageRows`에 들어가지 않도록 필터 추가
  - `react-reconciler` 같은 모듈명이 `react`로 잘리지 않도록 split regex 수정
- [x] 5-C. `stats.ts`: 스킬 집계 루프 병렬화 + 내부 중복 계산 경로 정리
  - 스킬별 집계를 `Promise.all`로 전환
  - `statsGetRecommendation`이 `statsGetDashboard`를 재호출하지 않고 공통 `buildDashboardData` 사용
- [x] 5-D. `index.ts`: 도구 핸들러 에러를 envelope + `isError: true`로 통일
  - `registerTool` 콜백에 `try/catch` 추가
  - 실패 시 `{ isError: true, content: [...] }` 규약으로 반환

### 테스트 보강
- [x] `test/parsers/plan-parser.test.ts`: 헤더 행 필터링, 하이픈 모듈명 보존 케이스 추가
- [x] `test/tools/review.test.ts`: `nextReview` 회귀 케이스 추가

### 검증
- [x] `/Users/younghoonkim/Library/pnpm/pnpm -C mcp typecheck` 통과
- [x] `/Users/younghoonkim/Library/pnpm/pnpm -C mcp test` 통과 (36/36)

---

## Unit 6: 서버 등록 + E2E — ✅ 완료

### 완료 항목
- [x] `/Users/younghoonkim/Library/pnpm/pnpm -C /Users/younghoonkim/dev/personal/@skills/study-all/mcp build` 실행 (`dist/src/index.js` 생성 확인)
- [x] 프로젝트 루트 `.mcp.json` 생성 후 `mcpServers.study` 등록 (`STUDY_ROOT` env 포함)
- [x] SDK stdio 클라이언트 스모크 E2E 성공: 서버 연결 + `listTools` 호출(20개 도구 확인)

### 검증 메모
- 이 셸 환경에서는 `claude` CLI가 PATH에 없어(`/mcp`/`claude mcp list` 미실행), SDK 기반 stdio E2E로 동등 검증 수행

---

## Unit 7: 커맨드 프롬프트 축소 — ⬜ 대기 (별도 세션 권장)

### 예정 항목
- 10개 커맨드의 수동 파싱/계산 → MCP 호출로 대체
- 목표: 4,438줄 → ~690줄 (84% 절감)
