# MCP 수정 작업 진행 상황

> 최종 갱신: 2026-02-23

## 전체 진행도

| Unit | 설명 | 상태 | 비고 |
|------|------|------|------|
| 1 | 빌드 녹색 (타입 에러 + 테스트) | ✅ 완료 | typecheck 0 에러, test 34/34 통과 |
| 2 | SDK 마이그레이션 | ⬜ 대기 | Unit 1 의존 |
| 3 | Clock 주입 | ⬜ 대기 | Unit 1 의존 |
| 4 | config.ts 전역 상태 제거 | ⬜ 대기 | Unit 1 의존 |
| 5 | Tool 버그 수정 | ⬜ 대기 | Unit 1 의존 |
| 6 | 서버 등록 + E2E | ⬜ 대기 | Unit 2 의존 |
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

### 수정 파일 목록
| 파일 | 변경 내용 |
|------|----------|
| `src/types/contracts.ts` | optional 프로퍼티에 `\| undefined` 추가 (ResolvedContext 6개, CacheMeta 1개, Envelope 1개) |
| `src/types/domain.ts` | optional 프로퍼티에 `\| undefined` 추가 (7개 인터페이스) |
| `src/index.ts` | RegisteredTool.run 파라미터 타입 `unknown` → `any` |
| `src/parsers/plan-parser.ts` | regex match group + cols 인덱스에 non-null assertion |
| `src/parsers/meta-parser.ts` | cols/match 인덱스에 non-null assertion |
| `src/parsers/session-parser.ts` | 체크박스 정규식 인덴트 허용 + match/indices non-null assertion |
| `src/tools/progress.ts` | replaceCheckboxInRange에 null guard, 루프 변수 추출 |
| `src/tools/daily.ts` | replaceSection 루프 인덱스 non-null assertion |
| `test/tools/daily.test.ts` | `mode: "skill" as const` |
| `test/parsers/session-parser.test.ts` | 기대값 갱신 (lastDate, completedSteps, summary) |
| `test/tools/session.test.ts` | lastDate 기대값 갱신 |
