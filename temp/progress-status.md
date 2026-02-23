# MCP 수정 작업 진행 상황

> 최종 갱신: 2026-02-23 (Unit 10 완료)

## 전체 진행도

| Unit | 설명 | 상태 | 비고 |
|------|------|------|------|
| 1 | 빌드 녹색 (타입 에러 + 테스트) | ✅ 완료 | typecheck 0 에러, test 34/34 통과 |
| 2 | SDK 마이그레이션 | ✅ 완료 | `registerTool()` 전환, 정적 import |
| 3 | Clock 주입 | ✅ 완료 | daily/review/session/cache 11곳 주입 |
| 4 | config.ts 전역 상태 제거 | ✅ 완료 | overrides Map 제거, STUDY_ROOT 필수화 |
| 5 | Tool 버그 수정 | ✅ 완료 | review/plan-parser/stats/error-wrapper 반영, test 36/36 |
| 6 | 서버 등록 + E2E | ✅ 완료 | `.mcp.json` 등록 + SDK stdio E2E(listTools 20개) |
| 7 | 커맨드 프롬프트 축소 | ✅ 완료 | 10개 command MCP-only 축소, 4,438→363줄 |
| 8 | skills 전환 + README/CLAUDE 개선 | ✅ 완료 | skills-first 전환 + legacy 충돌 해소 + 문서/검증 갱신 |
| 9 | 사용성 개선 + `~/.claude` 동기화 자동화 | ✅ 완료 | guide 문서 + sync/hook 자동화 반영 |
| 10 | Codex 기능 동등화 (`$` 호출) | ✅ 완료 | `.codex/skills` 10종 + Codex sync/hook/docs 반영 |

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

## Unit 7: 커맨드 프롬프트 축소 — ✅ 완료

### 사전 검증 (근거 기반, 2026-02-23)
- [x] `.claude/commands/*.md`는 계속 지원되지만, 최신 구조는 skills 중심으로 통합됨
- [x] 동일 이름 skill/command 공존 시 skill 우선 적용됨 (전환 시 충돌 관리 필요)
- [x] 장문 프롬프트는 분할 권장: `SKILL.md` 500줄 이하 + 보조 파일 분리
- [x] 현 상태는 MCP 모드 선언과 레거시 수동 파싱 지시가 혼재 (`dashboard`,`next`,`plan`,`study`)하여 Unit 7 우선 정리가 필요

### 완료 항목
- [x] 10개 command를 MCP-only 템플릿으로 재작성 (`.claude/commands/*.md`)
- [x] 레거시 수동 파싱 지시 제거, 도구 호출/저장 규칙을 MCP 기반으로 통일
- [x] 길이 축소: 4,438줄 → 363줄 (약 91.8% 절감)
- [x] skills 전환 사이드이펙트 반영: 동명이인 충돌/자동 호출/권한 범위 리스크를 Unit 7 게이트로 문서화

### 검증
- [x] `bash scripts/check-docs.sh` 통과 (0 errors, 기존 warning 4건 유지)
- [x] `/Users/younghoonkim/Library/pnpm/pnpm -C mcp typecheck` 통과
- [x] `/Users/younghoonkim/Library/pnpm/pnpm -C mcp test` 통과 (36/36)

---

## Unit 8: skills 전환 + README/CLAUDE 개선 — ✅ 완료

### 계획 문서
- `plan/unit8-skills-readme-claude.md`

### 완료 항목
- [x] `.claude/skills/*/SKILL.md` 10개 스킬 운영 구조 도입
- [x] command/skill 동명이인 충돌 제거: `.claude/commands/*.md` → `legacy-*.md`로 리네임
- [x] `README.md`를 skills-first 구조로 개편, legacy command를 호환 계층으로 분리 문서화
- [x] `CLAUDE.md`를 import 엔트리포인트로 축소하고 `.claude/rules/{core,skills,docs}.md` 분리
- [x] `scripts/check-docs.sh`를 command 중심에서 skills-first 정합성 검사로 전환

### 검증
- [x] `bash scripts/check-docs.sh` 통과 (warning 5건, error 0건)
- [x] `/Users/younghoonkim/Library/pnpm/pnpm -C mcp typecheck` 통과
- [x] `/Users/younghoonkim/Library/pnpm/pnpm -C mcp test` 통과 (36/36)

---

## Unit 9: 사용성 개선 + `~/.claude` 동기화 자동화 — ✅ 완료

### 계획 문서
- `plan/unit9-usability-sync-automation.md`

### 완료 항목
- [x] 사용 가이드 3종 신설
  - `docs/guide/Quickstart.md`
  - `docs/guide/Daily-Workflow.md`
  - `docs/guide/Troubleshooting.md`
- [x] `scripts/sync-claude-home.sh` 구현
  - 기본 dry-run, `--apply`, `--prune-managed`
  - `--rules-mode copy|symlink`, `--target` 지원
  - unmanaged 충돌 skip + manifest(`~/.claude/.study-all-sync-manifest`) 관리
- [x] Git hook 자동 동기화 추가
  - `.githooks/post-checkout`
  - `.githooks/post-merge`
  - `scripts/setup-githooks.sh`로 `core.hooksPath=.githooks` 설정
- [x] README를 가이드+자동화 중심으로 개편

### 검증
- [x] `bash scripts/check-docs.sh` 통과 (warning 5건, error 0건)
- [x] `bash scripts/sync-claude-home.sh --dry-run` 통과 (create 23, skip 0)
- [x] `/Users/younghoonkim/Library/pnpm/pnpm -C mcp typecheck` 통과
- [x] `/Users/younghoonkim/Library/pnpm/pnpm -C mcp test` 통과 (36/36)

---

## Unit 10: Codex 기능 동등화 (`$` 호출) — ✅ 완료

### 계획 문서
- `plan/unit10-codex-parity.md`

### 완료 항목
- [x] `.codex/skills`를 canonical 경로로 고정 (`.agents/skills` 미사용)
- [x] Codex 스킬 10종 동등화
  - 신규 추가: `dashboard`, `next`, `plan`, `study`
  - 기존 6개(`learn`, `study-skill`, `review`, `project-study`, `project-learn`, `project-review`)를 MCP-only 규칙으로 교체
- [x] Unit 9 parity를 Codex에도 확장
  - `scripts/sync-codex-home.sh` 추가 (`--dry-run`, `--apply`, `--prune-managed`, manifest)
  - `.githooks/post-checkout`, `.githooks/post-merge`에 Codex sync 병행
  - `scripts/setup-githooks.sh` 안내에 `~/.codex` 포함
- [x] 문서 반영
  - `README.md` 명령 매핑/동기화/검증 절차에 Codex 섹션 추가
  - `docs/guide/Quickstart.md`, `docs/guide/Daily-Workflow.md`, `docs/guide/Troubleshooting.md`에 Codex 흐름 반영
- [x] 문서 정합성 검사 강화
  - `scripts/check-docs.sh`에 `.codex/skills` 검사 및 `.claude`/`.codex` parity 체크 추가

### 검증
- [x] `bash scripts/check-docs.sh` 통과 (warning 5건, error 0건)
- [x] `bash scripts/sync-codex-home.sh --dry-run` 통과 (create 4, skip 6)
- [x] `bash scripts/sync-codex-home.sh --apply` 실행 (create 4, skip 6, manifest 갱신)
- [x] `bash scripts/setup-githooks.sh` 실행 후 `git config --get core.hooksPath`=`.githooks` 확인
- [x] `codex mcp list` 실행: 현재 서버 미등록 (`No MCP servers configured yet`)
- [x] `/Users/younghoonkim/Library/pnpm/pnpm -C mcp typecheck` 통과
- [x] `/Users/younghoonkim/Library/pnpm/pnpm -C mcp test` 통과 (36/36)

### 근거 (웹 검증)
- OpenAI Codex Skills/Agents/Config/MCP 공식 문서(2026-02-23 확인)
