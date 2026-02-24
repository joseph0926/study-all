# Scope 6: 아키텍처 & 설계 정합성 피드백

> 검토일: 2026-02-23
> 대상: `plan/mcp.md` (설계 문서, 935줄) vs `mcp/src/` (실제 구현, 19파일)

## 요약

설계 문서 27개 Step 중 Phase 1~3(기반+파서+도구)은 완전 완료, Phase 4(서버 통합)는 1/3 완료, Phase 5(커맨드 리팩터링)는 전체 완료, Phase 6(검증)은 전체 미착수. 구현 완성도 약 82%. 컷오버 게이트 4개 중 완전 충족 0개(부분 충족 1개). 가장 큰 리스크는 (1) MCP 서버 빌드/등록 미수행으로 리팩터링된 커맨드가 실제 동작하지 않는 상태, (2) Layer 4 동등성 테스트 전무로 기존 시스템과의 수치 동등성 미검증, (3) Clock 미주입으로 날짜 의존 코드 11곳에서 테스트 플래키 리스크 잔존.

---

## Phase별 구현 진행도

### Phase 1: 기반 (Step 1~3)

| Step | 설계 내용 | 구현 상태 | 비고 |
|------|----------|----------|------|
| 1 | mcp/ 프로젝트 초기화 (package.json, tsconfig.json, vitest) | **완료** | `package.json`(Node>=24, pnpm, Vitest 4, TS 5.9, MCP SDK 1.26, Zod 4.3), `tsconfig.json`(strict+noUncheckedIndexedAccess+exactOptionalPropertyTypes), `vitest.config.ts` 존재 |
| 2 | test/fixtures/ 에 기존 docs/ 파일 스냅샷 복사 | **완료** | `test/fixtures/react/` 5파일(plan.md, React-Core-API.md, Fiber-Structure.md, Shared.md, Work-Loop.md) + `test/fixtures/nextjs/` 2파일(plan.md, Next-Src-Api.md) - 설계 목록과 정확히 일치 |
| 3 | test/expected/ 에 기대 출력 JSON 수동 작성 | **이전 버전 피드백에 "존재"로 기재되었으나 재확인 결과 디렉토리 없음** | Glob 결과 `test/expected/**/*` 매치 0건. 설계에서 요구한 `react-plan.json`, `react-session-resume.json`, `nextjs-plan.json` 모두 부재. **골든 테스트 불가** |

### Phase 2: 파서 TDD (Step 4~7)

| Step | 설계 내용 | 구현 상태 | 비고 |
|------|----------|----------|------|
| 4 | plan-parser: 테스트 -> 구현 -> 통과 | **완료** | `src/parsers/plan-parser.ts`(185줄) + `test/parsers/plan-parser.test.ts`(4 케이스: Coverage Analysis, Phase/Topic 계층, 체크박스, 빈 plan) |
| 5 | session-parser: 테스트 -> 구현 -> 통과 | **완료** | `src/parsers/session-parser.ts`(102줄) + `test/parsers/session-parser.test.ts`(5 케이스: 재개점, 완료/미완료 분리, 요약, 빈 파일, 다중 세션) |
| 6 | meta-parser: 테스트 -> 구현 -> 통과 | **완료** | `src/parsers/meta-parser.ts`(76줄) + `test/parsers/meta-parser.test.ts`(3 케이스: 파싱, 졸업 판정, 빈 파일). 테이블+YAML-like 이중 폴백 파싱 |
| 7 | module-map: 테스트 -> 구현 -> 통과 | **완료** | `src/parsers/module-map.ts`(136줄) + `test/parsers/module-map.test.ts`(2 케이스: packages/* 패턴, AI 필터링 없이 전체 포함). 임시 디렉토리 기반 실 파일시스템 테스트 |

### Phase 3: MCP 도구 TDD (Step 8~13)

| Step | 설계 내용 | 구현 상태 | 비고 |
|------|----------|----------|------|
| 8 | config: 테스트 -> 구현 -> 통과 | **완료** | `src/tools/config.ts`(44줄) + `test/tools/config.test.ts`(2 케이스). 설계 대비 `studyLogsDir` 추가 (daily.* 지원용) |
| 9 | progress: 테스트 -> 구현 -> 통과 | **완료** | `src/tools/progress.ts`(291줄) + `test/tools/progress.test.ts`(5 케이스: getPlan, getNextTopic, updateCheckbox, getModuleMap, getCoverageMap) |
| 10 | session: 테스트 -> 구현 -> 통과 | **완료** | `src/tools/session.ts`(154줄) + `test/tools/session.test.ts`(3 케이스: getResumePoint, appendLog, getSourcePaths) |
| 11 | review: 테스트 -> 구현 -> 통과 | **완료** | `src/tools/review.ts`(324줄) + `test/tools/review.test.ts`(3 케이스) + `test/review/clock.test.ts`(3 케이스: 오답, 재시도, 첫통과+연속) |
| 12 | daily: 테스트 -> 구현 -> 통과 | **완료** | `src/tools/daily.ts`(234줄) + `test/tools/daily.test.ts`(1 통합 케이스: status->plan->done->finalize 4단계 흐름) |
| 13 | stats: 테스트 -> 구현 -> 통과 | **완료** | `src/tools/stats.ts`(167줄) + `test/tools/stats.test.ts`(2 케이스: getDashboard 집계, getRecommendation 상위 3건) |

### Phase 4: MCP 서버 통합 (Step 14~16)

| Step | 설계 내용 | 구현 상태 | 비고 |
|------|----------|----------|------|
| 14 | index.ts: 도구 등록, MCP SDK 연결 | **완료** | `src/index.ts`(199줄). 20개 도구 등록. `McpServer` + `StdioServerTransport` 동적 import. 도구별 Zod parse + JSON stringify 응답 |
| 15 | Claude Code 설정 등록 | **미완료** | `.claude/settings.local.json`에 `mcpServers` 항목 없음. `dist/` 빌드 결과물도 없음 |
| 16 | 수동 연결 테스트 | **미완료** | 빌드/설정 미등록으로 실행 자체 불가 |

### Phase 5: 커맨드 리팩터링 (Step 17~24)

| Step | 설계 내용 | 구현 상태 | 비고 |
|------|----------|----------|------|
| 17 | /dashboard: MCP 활용 축소 | **완료** | `## MCP Execution Mode (필수)` 섹션 추가. `stats.getDashboard` 우선 호출 |
| 18 | /next: MCP 활용 축소 | **완료** | `stats.getRecommendation` + `review.getQueue` + `progress.getNextTopic` |
| 19 | /learn: MCP 활용 축소 | **완료** | `session.getResumePoint` + `session.getSourcePaths` + `progress.getPlan` + 쓰기 |
| 20 | /gen-plan: MCP 활용 축소 | **완료** | `progress.getModuleMap` + `progress.getCoverageMap` + `progress.getPlan` |
| 21 | /review: MCP 활용 축소 | **완료** | `review.getQueue` + `review.getMeta` + 쓰기 |
| 22 | /study: MCP 활용 축소 | **완료** | `daily.getStatus` + `progress.getNextTopic` + 쓰기 |
| 23 | /project-*: MCP 활용 축소 | **완료** | 3개 커맨드 모두 `context.resolve(mode=project)` + 대응 도구 |
| 24 | /plan: MCP 활용 축소 | **완료** | `context.resolve` + `progress.getPlan` + `config.get` |

### Phase 6: 검증 (Step 25~27)

| Step | 설계 내용 | 구현 상태 | 비고 |
|------|----------|----------|------|
| 25 | 커맨드 동등성 시나리오 테스트 (Layer 4) | **미착수** | 설계의 6개 시나리오 중 0개 자동화 |
| 26 | 기존 학습 기록으로 전체 흐름 E2E 확인 | **미착수** | MCP 서버 미연결 |
| 27 | scripts/check-docs.sh 호환성 확인 | **미착수** | session.appendLog 출력 형식과 pre-commit 규칙 간 호환성 미검증 |

### Phase 진행 요약

| Phase | Step 수 | 완료 | 부분/미완료 | 진행률 |
|-------|---------|------|-----------|--------|
| Phase 1: 기반 | 3 | 2 | 1 (expected/ 미작성) | 67% |
| Phase 2: 파서 TDD | 4 | 4 | 0 | 100% |
| Phase 3: MCP 도구 TDD | 6 | 6 | 0 | 100% |
| Phase 4: 서버 통합 | 3 | 1 | 2 | 33% |
| Phase 5: 커맨드 리팩터링 | 8 | 8 | 0 | 100% |
| Phase 6: 검증 | 3 | 0 | 3 | 0% |
| **전체** | **27** | **21** | **6** | **78%** |

---

## 컷오버 게이트 충족 현황

| 게이트 조건 | 충족 여부 | 근거 |
|------------|----------|------|
| **1. 동등성 통과**: Layer 4 시나리오 전부 통과 (커맨드별 수치/재개점/대기열 일치) | **미충족** | Layer 4 시나리오 테스트 자체가 없음. test/expected/ 골든 데이터도 미작성. 6개 시나리오(dashboard 수치, learn 재개점, review 대기열, next 추천, gen-plan MODULE_MAP, session append) 중 0개 자동화 |
| **2. 회귀 통과**: parser/tool 테스트 100% 통과 + scripts/check-docs.sh 통과 | **부분 충족** | parser 테스트 14개 + tool 테스트 16개 + 계약/clock 테스트 4개 = 34개 케이스 존재. Bash 실행 불가로 실제 통과율 미확인. check-docs.sh 호환성 미검증 |
| **3. 성능 조건**: 핵심 읽기 도구의 p95 응답 시간이 기존 대비 20% 이내 | **미충족** | 벤치마크 테스트/측정 인프라 전무 |
| **4. 운영 검증**: 실제 학습 데이터(docs/react, docs/nextjs)로 E2E 1회 이상 성공 | **미충족** | MCP 서버 빌드/등록 미수행으로 E2E 불가 |

**결론: 컷오버 불가. 4개 게이트 중 완전 충족 0개.**

---

## 누락된 기능

### [S6-001] test/expected/ 골든 테스트 데이터

- **설계**: plan/mcp.md:180-183 (`react-plan.json`, `react-session-resume.json`, `nextjs-plan.json`)
- **현재 상태**: 미구현 (디렉토리 자체 없음)
- **영향**: 파서 출력의 전체 구조를 스냅샷으로 비교할 수 없음. 현재 테스트는 개별 필드만 체크하므로 미묘한 회귀(필드 누락, 정렬 변경, 타입 변경) 감지 불가
- **우선순위**: P1 - 컷오버 게이트 1번 전제조건

### [S6-002] 빌드 산출물 + Claude Code 설정 등록

- **설계**: plan/mcp.md:841-860 (mcpServers.study + 빌드 규약)
- **현재 상태**: `dist/` 없음. `.claude/settings.local.json`에 mcpServers 없음
- **영향**: 리팩터링된 10개 커맨드가 "MCP Execution Mode (필수)"를 지시하지만, MCP 서버가 실행되지 않아 도구 호출 불가. 현재 커맨드 실행 시 LLM이 MCP 도구를 찾지 못하고 기존 방식으로 폴백하거나 오류 발생
- **우선순위**: P0 - 전체 시스템의 핵심 연결점

### [S6-003] Layer 4: 커맨드 동등성 시나리오 테스트

- **설계**: plan/mcp.md:795-806 (6개 시나리오 테이블)
- **현재 상태**: 전무. 시나리오별 상세:
  - `/dashboard` 실행: MCP `stats.getDashboard` vs 기존 LLM 파싱 수치 비교 -- 미구현
  - `/learn react "Fiber"` 세션 재개: `session.getResumePoint` vs 기존 파일 직접 읽기 -- 미구현
  - `/review react` 복습 대기열: `review.getQueue` vs 수동 -meta.md 확인 -- 미구현
  - `/next` 추천 근거: `stats.getRecommendation` 데이터 검증 -- 미구현
  - `/gen-plan react` MODULE_MAP: `progress.getModuleMap` vs plan.md 46개 모듈 -- 미구현
  - 세션 기록 append: `session.appendLog` 후 파일 구조 보존 -- 미구현
- **영향**: 컷오버 게이트 1번 불충족
- **우선순위**: P1

### [S6-004] 성능 벤치마크

- **설계**: plan/mcp.md:102 ("p95 응답 시간이 기존 대비 20% 이내")
- **현재 상태**: 벤치마크 테스트 파일/설정 없음
- **영향**: 컷오버 게이트 3번 불충족. 다만 MCP 도구는 파일 I/O + 정규식 파싱이므로 LLM 파싱보다 빠를 가능성 높음
- **우선순위**: P2 (기능 완성 후)

### [S6-005] Clock 주입 일관성

- **설계**: plan/mcp.md:777-793 ("시스템 시간을 직접 읽지 않고 주입 가능한 Clock 사용")
- **현재 상태**: `lib/clock.ts`에 Clock/SystemClock/FixedClock 존재. `calculateNextReview`만 `now` 파라미터로 주입 가능. 나머지 11곳에서 `new Date()` 직접 사용:
  - `review.ts:195` (reviewRecordResult)
  - `review.ts:240` (reviewGetQueue)
  - `session.ts:114` (sessionAppendLog)
  - `daily.ts:41,91,116,166,181,200,221` (7곳)
- **영향**: 날짜 경계 테스트 불안정. 설계에서 명시한 리스크(plan/mcp.md:928 "날짜 기반 테스트 -> 플래키")가 해소되지 않음
- **우선순위**: P2

### [S6-006] scripts/check-docs.sh 호환성

- **설계**: plan/mcp.md:913 (Step 27)
- **현재 상태**: 미검증
- **영향**: `session.appendLog`가 생성하는 마크다운(`---\n\n## YYYY-MM-DD (via /learn)\n\n{content}`)이 pre-commit 훅의 파일명 컨벤션, 팬텀 참조, 구조 체크와 호환되는지 확인 필요
- **우선순위**: P1 - git commit 차단 가능

### [S6-007] 롤백용 프롬프트 기반 fallback 버전

- **설계**: plan/mcp.md:108-113 ("커맨드를 프롬프트 기반 fallback 버전으로 즉시 전환")
- **현재 상태**: 현재 커맨드 파일이 이미 "MCP Execution Mode" 삽입 상태. 기존 프롬프트 전용 버전의 별도 백업 없음. git history에서 복원 가능하지만 즉시 전환은 어려움
- **영향**: MCP 장애 시 롤백 절차가 "git revert" 수준으로 축소. 설계의 "즉시 전환" 의도와 불일치
- **우선순위**: P1 (컷오버 전 git tag 또는 fallback 디렉토리 준비 필요)

### [S6-008] config overrides 전역 상태

- **설계**: plan/mcp.md:213 ("전역 mutable 경로 상태를 두지 않고, 각 호출의 context를 기준으로 처리")
- **현재 상태**: `tools/config.ts`의 `const overrides = new Map<string, string>()` (line 6)이 모듈 수준 전역 mutable 상태. `config.set` 호출 시 이후 모든 `config.get` 호출에 영향
- **영향**: 다중 프로젝트/스킬 병행 세션에서 한 세션의 `config.set`이 다른 세션에 경로 오염. 설계 원칙 위배
- **우선순위**: P2

### [S6-009] STUDY_ROOT 필수성

- **설계**: plan/mcp.md:866 ("`STUDY_ROOT` | (필수)")
- **현재 상태**: `config.ts:21`에서 `env.STUDY_ROOT ?? process.cwd()`로 폴백. 필수가 아님
- **영향**: MCP 서버가 잘못된 디렉토리에서 실행되면 묵묵히 틀린 경로 사용
- **우선순위**: P2

---

## 구현 순서 이탈 분석

### 이탈 1: Phase 5가 Phase 4 미완료 상태에서 수행됨

커맨드 리팩터링(Step 17~24)이 완료되었으나, MCP 서버 빌드/설정 등록(Step 15~16)이 선행되지 않음. 결과적으로:
- 10개 커맨드가 MCP 도구 호출을 지시하지만 서버가 없어 실행 불가
- 커맨드와 서버 간 실제 연결이 검증되지 않은 "종이 위의 연결" 상태
- **위험**: 커맨드의 MCP 도구명이나 입력 형식이 서버 등록과 불일치해도 발견 불가

### 이탈 2: Phase 1 Step 3 (expected/ JSON) 건너뜀

TDD 원칙에 따르면 기대 출력을 먼저 정의해야 하나, 골든 JSON 없이 파서를 구현. 테스트가 인라인 하드코딩 값 비교에 그쳐 전체 출력 구조 검증 부재.

### 이탈 3: 설계에 없는 모듈 추가

설계의 디렉토리 구조(plan/mcp.md:148-198)에 없지만 구현에 추가된 것:
- `src/lib/` 디렉토리: clock.ts, cache.ts, envelope.ts, fs.ts
- `src/types/` 디렉토리: contracts.ts, domain.ts
- `test/contracts/`: envelope.test.ts
- `test/review/`: clock.test.ts

이들은 모두 합리적인 코드 구조화이나, 설계 문서의 디렉토리 구조가 실제 구현을 반영하지 못함.

---

## 테스트 전략 이행도

| 레이어 | 설계 목표 | 현재 상태 | 갭 |
|--------|---------|----------|-----|
| **Layer 1: 파서 단위 테스트** | 4개 파서 TDD + 골든 테스트(expected/ JSON 비교) | 4개 파서 테스트 존재(14케이스). **골든 테스트 미구현** | test/expected/ 미작성. 전체 출력 구조 스냅샷 비교 없음 |
| **Layer 2: 도구 통합 테스트** | 6개 도구 그룹 통합 테스트 | 6개 도구 모두 테스트(16케이스) + config(2케이스) + envelope(1케이스) = 19케이스 | `context.resolve` 단독 테스트 없음. fixtures 기반 통합은 `process.env.STUDY_ROOT` 설정에 의존하여 CI 환경 취약 |
| **Layer 3: Spaced Repetition** | 5개 시나리오 (오답, 재시도, 첫통과, 연속통과, 졸업) | 3개 테스트(오답, 재시도, 첫통과+연속). 졸업 전용 케이스 없음 | 설계의 졸업 판정 시나리오 전용 테스트 미구현. 간접적으로 streak=3 시 최대 30일 cap에서 검증되긴 함 |
| **Layer 3.5: Clock 테스트** | 모든 날짜 의존 도구에 Clock 주입 | `FixedClock` 존재. `calculateNextReview`만 주입 가능 | review.getQueue, daily.*, session.appendLog에서 `new Date()` 직접 호출(11곳). Clock 미주입 |
| **Layer 4: 커맨드 동등성** | 6개 시나리오 자동/수동 검증 | **전무** | 전체 미구현. 컷오버의 핵심 조건 |

### 테스트 파일 전체 목록

| 파일 | 케이스 수 | 레이어 |
|------|----------|--------|
| `test/parsers/plan-parser.test.ts` | 4 | Layer 1 |
| `test/parsers/session-parser.test.ts` | 5 | Layer 1 |
| `test/parsers/meta-parser.test.ts` | 3 | Layer 1 |
| `test/parsers/module-map.test.ts` | 2 | Layer 1 |
| `test/tools/config.test.ts` | 2 | Layer 2 |
| `test/tools/progress.test.ts` | 5 | Layer 2 |
| `test/tools/session.test.ts` | 3 | Layer 2 |
| `test/tools/review.test.ts` | 3 | Layer 2 |
| `test/tools/daily.test.ts` | 1 | Layer 2 |
| `test/tools/stats.test.ts` | 2 | Layer 2 |
| `test/review/clock.test.ts` | 3 | Layer 3 |
| `test/contracts/envelope.test.ts` | 1 | 계약 |
| **합계** | **34** | |

---

## 설계 대비 구현 정합성 상세

### 일치하는 부분

1. **MCP 도구 20개 전수 등록**: 설계의 도구 목록(context.resolve, config.get/set, progress 5개, session 3개, review 4개, daily 4개, stats 2개)이 `index.ts`에 모두 등록
2. **Envelope 응답 구조**: `schemaVersion: "1.0.0"`, `generatedAt`, `data`, `cache?` 필드 - 설계 5.3절과 일치
3. **캐시 키**: `hash(sourceDir, gitHead, fileCount, maxMtime, parserVersion)` - 설계 5.3절과 거의 일치 (realpath 미적용은 차이점)
4. **Spaced Repetition 공식**: 오답+1일/재시도+3일/첫통과 7*2^(streak-1)/최대30일/졸업3연속 - 설계 5.3절과 정확히 일치
5. **파서 전략**: Coverage Analysis 이모지+파이프 파싱, Phase/Topic `##`/`###` 계층, `## YYYY-MM-DD` 세션 경계, `### 학습 로드맵/학습 요약` 섹션 추출
6. **커맨드-MCP 매핑**: 설계 부록 B의 매핑이 리팩터링된 커맨드의 MCP Execution Mode와 일치

### 불일치/확장된 부분

1. **config.get 출력에 `studyLogsDir` 추가**: 설계에 없으나 daily.* 지원에 필요한 합리적 확장
2. **context.resolve 출력에 `studyRoot`, `studyLogsDir`, `skillDocsDir` 추가**: 설계보다 풍부한 출력. 하위 호환
3. **`detectSourceDir`의 하드코딩**: `nextjs -> next.js`, `react -> react-fork` 매핑. 설계는 패턴만 정의. 2개 스킬이므로 실용적이나 확장성 제한
4. **review.getQueue의 meta 없는 토픽 폴백**: 설계에 없는 로직. meta 파일 없는 토픽을 "핵심 개념" L1으로 대기열에 포함
5. **stats.getDashboard의 `completedTopics`**: `topic.status === "covered"`로 산출. Coverage Analysis의 "커버" 여부(references 존재)이지 "학습 완료"(Steps 전부 [x])가 아님. 의미 혼동 가능
6. **캐시 무효화 사유**: 설계는 5가지 개별 사유 추적을 명시하나, 구현은 cold-start 문자열만 사용
7. **STUDY_ROOT 필수성**: 설계 필수 -> 구현 process.cwd() 폴백

---

## 마크다운 형식 호환성 (설계 섹션 8 체크리스트)

| # | 항목 | 테스트 여부 | 비고 |
|---|------|-----------|------|
| 1 | plan.md Coverage Analysis 테이블 (이모지+파이프) | **검증** | plan-parser.test.ts "Coverage Analysis 파싱" |
| 2 | plan.md Phase/Topic/Step 계층 | **검증** | plan-parser.test.ts "Phase/Topic 계층 구조", "체크박스 상태" |
| 3 | {Topic}.md 세션 경계 (`## YYYY-MM-DD`) | **검증** | session-parser.test.ts "마지막 세션 재개점" |
| 4 | {Topic}.md 학습 로드맵 체크박스 | **검증** | session-parser.test.ts "완료/미완료 스텝 분리" |
| 5 | {Topic}.md 다중 세션 (첫/중간/마지막) | **부분** | "여러 세션이면 마지막 세션 우선" 테스트 존재. 중간 세션 추출 미검증 |
| 6 | -meta.md 개념별 메타데이터 | **검증** | 인라인 fixture로 테스트. 실제 -meta.md 파일 fixture 없음 |
| 7 | -quiz.md 구조 (파싱 불필요, 보존만) | **미검증** | quiz 관련 테스트 전무 |
| 8 | 파일명 컨벤션 (Title-Case-Hyphen.md) | **부분** | `toTitleCaseTopic` 함수 존재하나 단위 테스트 없음 |

---

## 리스크 완화 상태 (설계 섹션 11)

| 리스크 | 설계 완화책 | 구현 상태 | 잔존 위험 |
|--------|-----------|----------|----------|
| R1 마크다운 파싱 엣지케이스 | 골든 테스트 + 엣지케이스 fixture | **부분**: fixtures 있으나 expected JSON 미활용 | 엣지케이스(깨진 MD, 누락 섹션, 이모지 변형) fixture 없음 |
| R2 MCP 서버 장애 | MD 보존 + 폴백 프롬프트 | **부분**: MD 보존됨. 폴백 프롬프트 미준비 | 롤백 절차 실행 불가 |
| R3 프롬프트 리팩터링 시 누락 | 커맨드별 체크리스트 | **부분**: 리팩터링 완료. Layer 4 검증 없음 | 기존 행동 보존 미확인 |
| R4 MCP 스키마 변경 | schemaVersion + 계약 테스트 | **구현**: SCHEMA_VERSION 상수 + envelope 테스트 | breaking change 자동 감지 없음 |
| R5 ref/ 구조 변경 | 캐시 키 자동 무효화 | **구현**: 캐시 키 구현됨 | realpath 미적용 (심볼릭 링크 주의) |
| R6 다중 프로젝트 병행 | context.resolve 격리 | **대부분**: 호출 단위 경로 계산 | config overrides 전역 상태 위배 |
| R7 날짜 기반 테스트 | Clock 주입 + fake timer | **부분**: Clock 인터페이스 존재. 11곳 미주입 | 테스트 플래키 리스크 잔존 |

---

## 전체 평가

- **구현 완성도**: ~82% (27 Step 중 21 완료 + 6 미완료/미착수)
- **코드 품질**: 양호. TypeScript strict 모드(noUncheckedIndexedAccess, exactOptionalPropertyTypes), Zod 스키마 입력 검증, 관심사 분리(parsers/tools/lib/types) 적절. 파서는 순수 함수로 테스트 용이.
- **가장 큰 리스크**:
  1. **서버 미연결 (P0)**: 빌드/설정 등록이 안 되어 리팩터링된 커맨드가 MCP를 실제 사용하지 못함. "종이 위의 마이그레이션" 상태
  2. **동등성 미검증 (P1)**: Layer 4 테스트 + 골든 테스트 부재로 기존 시스템과의 동등성 보장 불가. 컷오버 게이트 0/4 충족
  3. **롤백 준비 부족 (P1)**: 커맨드가 이미 MCP 참조로 변경되었으나 fallback 백업 없음. 장애 시 즉시 전환 불가

- **권장 다음 단계** (우선순위 순):
  1. **P0: `pnpm build` + dist/ 생성 + `.claude/settings.local.json`에 mcpServers.study 등록**
  2. **P0: 수동 연결 테스트 1회 (각 도구 호출 -> JSON 응답 확인)**
  3. **P1: test/expected/ 골든 JSON 작성 + 스냅샷 비교 테스트 추가**
  4. **P1: Layer 4 동등성 시나리오 6개 자동화 테스트 구현**
  5. **P1: scripts/check-docs.sh와 session.appendLog 출력 호환성 확인**
  6. **P1: 기존 커맨드 fallback 백업 (git tag 또는 별도 디렉토리)**
  7. **P2: Clock 주입 패턴을 review.getQueue, daily.*, session.appendLog로 확장**
  8. **P2: config overrides 전역 상태 제거 또는 context 스코프로 변경**
  9. **P2: STUDY_ROOT 환경 변수 필수화 (없으면 에러 throw)**
  10. **P2: 성능 벤치마크 설정 (vitest bench 또는 별도 스크립트)**
  11. **P3: 설계 문서 업데이트 (src/lib/, src/types/, STUDY_LOGS_DIR, context 출력 스키마 반영)**
