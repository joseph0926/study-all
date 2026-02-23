# study-all MCP 마이그레이션 설계 문서

> 2026-02-23 | 결정 완료 → 설계 단계

---

## 1. 현재 시스템 요약

### 구조

```
study-all/
├── .claude/commands/          # 9개 커맨드 (프롬프트 템플릿)
├── docs/                      # 학습 기록 (마크다운)
│   ├── master-plan.md
│   ├── react/                 # plan.md + {Topic}.md + -meta.md + -quiz.md
│   └── nextjs/
├── ref/                       # 소스 코드 & 공식 문서 (gitignored)
└── scripts/check-docs.sh      # 정합성 검증 (pre-commit)
```

### 커맨드 (9개)

| 커맨드 | 프롬프트 크기 | 역할 | I/O |
|--------|-------------|------|-----|
| `/dashboard` | — | 전체 학습 현황 스냅샷 | 읽기 전용 |
| `/next` | — | 다음 학습 추천 + 주간 스케줄 | 읽기 전용 |
| `/plan` | — | 크로스-스킬 마스터 로드맵 | `docs/master-plan.md` 쓰기 |
| `/learn` | 633줄 | 소스 기반 Q&A 튜터링 | `docs/{skill}/{Topic}.md` 쓰기 |
| `/study-skill` | 540줄 | 스킬 레퍼런스 검증/개선 | `docs/{skill}/plan.md` 쓰기, references/ 수정 |
| `/review` | 608줄 | 적응형 복습 | `-quiz.md`, `-meta.md` 쓰기 ("정리" 시) |
| `/project-study` | 475줄 | 프로젝트 소스 분석 → 학습 플랜 | `.study/plan.md` 쓰기 |
| `/project-learn` | 491줄 | 프로젝트 소스 Q&A 튜터링 | `.study/{Topic}.md` 쓰기 |
| `/project-review` | 626줄 | 프로젝트 학습 복습 | `.study/-quiz.md`, `-meta.md` 쓰기 |

별도: `/study` (356줄) — 일일 공부 관리 (`~/.claude/commands/`)

### 기존 데이터

| 스킬 | 모듈 수 | 커버율 | 토픽 파일 |
|------|---------|--------|----------|
| react | 46 | 17.4% (8/46) | 4개 (`React-Core-API.md`, `Fiber-Structure.md`, `Shared.md`, `Work-Loop.md`) |
| nextjs | 34 | 29% (10/34) | 1개 (`Next-Src-Api.md`) |

---

## 2. 문제 진단

### 2.1 LLM이 기계적 작업 수행

| 작업 | 발생 커맨드 | 본질 |
|------|-----------|------|
| plan.md 체크박스 카운팅 | `/dashboard`, `/next` | 정규식 매칭 + 산술 |
| MODULE_MAP 생성 | `/study-skill` | 디렉토리 스캔 |
| COVERAGE_MAP 생성 | `/study-skill` | 문자열 매칭 |
| 복습 주기 계산 | `/review`, `/next` | 날짜 산술 |
| 세션 재개점 파악 | `/learn` | 마크다운 파싱 |
| streak 계산 | `/dashboard` | 날짜 연산 |

**문제**: 결정적(deterministic)이어야 할 결과가 LLM 해석에 따라 비결정적.

### 2.2 매 세션 컨텍스트 재구축

| 작업 | 소요 | 빈도 |
|------|------|------|
| plan.md 전문 파싱 | 수백~1000줄+ 읽기 | 매 `/learn` 세션 |
| ref/ 소스 경로 탐색 | Glob/Read 반복 | 매 `/learn` 세션 (같은 스킬이라도) |
| -meta.md 전체 스캔 | 스킬당 N개 파일 | 매 `/review`, `/next` |

**문제**: 동일 정보를 매번 처음부터 수집. 토큰 낭비 + 느린 시작.

### 2.3 커맨드 간 수동 연결

```
현재 흐름 (사용자가 직접 연결):
  /study plan → /study confirm → (별도 /learn 실행) → /study done → /study log
```

**문제**: `/study`가 `/learn`의 결과를 모름. 사용자가 수동 오케스트레이션.

### 2.4 컨텍스트 압박

프롬프트 600줄+ + 파싱 대상 파일 수백 줄 → 실제 대화/판단에 쓸 컨텍스트 부족.

---

## 3. 결정 사항

| 항목 | 결정 | 근거 |
|------|------|------|
| 전환 여부 | MCP 전환 진행 | 문제의 본질이 "구조화된 상태 관리"이지 LLM 판단이 아님 |
| 전환 범위 | 단계적 전환 + 하드 컷오버 | 구현/검증은 단계적으로 진행하되, 기본 동작 전환은 컷오버 게이트 통과 후 일괄 적용 |
| 저장 형식 | 마크다운 유지 | git diff 가능, 사람이 읽기 좋음. MCP가 파싱/쓰기 담당 |
| 해결 대상 | 4개 전부 | 세션 재구축, 오케스트레이션, 컨텍스트 압박, 비결정적 계산 |

### 3.1 컷오버 게이트 (하드 컷오버 조건)

아래 조건을 모두 만족해야 기존 프롬프트 기반 경로에서 MCP 경로로 기본 전환합니다.

1. **동등성 통과**: Layer 4 시나리오 전부 통과 (커맨드별 수치/재개점/대기열 일치)
2. **회귀 통과**: parser/tool 테스트 100% 통과 + `scripts/check-docs.sh` 통과
3. **성능 조건**: 핵심 읽기 도구(`progress.getPlan`, `review.getQueue`, `stats.getDashboard`)의 p95 응답 시간이 기존 대비 20% 이내
4. **운영 검증**: 실제 학습 데이터(`docs/react`, `docs/nextjs`)로 E2E 1회 이상 성공

### 3.2 롤백 절차

컷오버 이후 이상 징후(오독, 데이터 손상 가능성, 주요 커맨드 장애) 발생 시:

1. `.claude/settings.json`에서 `mcpServers.study` 비활성화
2. 커맨드를 프롬프트 기반 fallback 버전으로 즉시 전환
3. 장애 원인/재현 케이스를 fixture로 추가 후 재배포
4. 컷오버 게이트를 다시 충족할 때까지 MCP 기본 전환 중지

---

## 4. 목표 아키텍처

```
AS-IS:
  [프롬프트 600줄+] ──Read/Glob/Grep──→ [마크다운 파일들]
       LLM이 파싱 + 계산 + 상태 관리 + 대화 전부 담당

TO-BE:
  [프롬프트 ~80줄]  ──tool call──→  [MCP Server]  ──→  [마크다운 파일들]
       대화/판단/튜터링만                파싱/계산/상태 관리
                                       구조화된 JSON 반환
```

### 책임 분리

| 계층 | 담당 | 예시 |
|------|------|------|
| **프롬프트** (스킬) | 대화, 판단, 튜터링, 코칭 | "이 개념을 비유로 설명", "다음 토픽 추천 이유" |
| **MCP 서버** | 파싱, 계산, 상태 관리, 파일 I/O | plan.md 파싱, 복습 주기 계산, 세션 append |
| **마크다운 파일** | 영속 저장소 | docs/, .study/, -meta.md |

---

## 5. MCP 서버 설계

### 5.1 기술 스택

- **런타임**: Node.js (TypeScript)
- **MCP SDK**: `@modelcontextprotocol/sdk`
- **테스트**: Vitest
- **빌드**: `tsc`로 `dist/` 생성 후 `node dist/index.js` 실행 (개발용 `tsx` 직실행은 사용하지 않음)

### 5.2 디렉토리 구조

```
study-all/
├── mcp/                           # MCP 서버
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts               # MCP 서버 진입점
│   │   ├── config.ts              # 경로 설정 관리
│   │   ├── tools/
│   │   │   ├── progress.ts        # plan.md 파싱, MODULE_MAP, COVERAGE_MAP
│   │   │   ├── session.ts         # 세션 재개점, 기록 append, 소스 경로
│   │   │   ├── review.ts          # 복습 대기열, spaced repetition
│   │   │   ├── daily.ts           # 일일 학습 상태, 로깅
│   │   │   └── stats.ts           # 대시보드 집계, 추천
│   │   └── parsers/
│   │       ├── plan-parser.ts     # plan.md 마크다운 → 구조화 데이터
│   │       ├── session-parser.ts  # {Topic}.md → 세션 데이터
│   │       ├── meta-parser.ts     # -meta.md → 복습 메타데이터
│   │       └── module-map.ts      # ref/ 디렉토리 → MODULE_MAP
│   └── test/
│       ├── fixtures/              # 기존 docs/ 스냅샷 (골든 테스트용)
│       │   ├── react/
│       │   │   ├── plan.md
│       │   │   ├── React-Core-API.md
│       │   │   ├── Fiber-Structure.md
│       │   │   ├── Shared.md
│       │   │   └── Work-Loop.md
│       │   └── nextjs/
│       │       ├── plan.md
│       │       └── Next-Src-Api.md
│       ├── expected/              # 기대 출력 JSON
│       │   ├── react-plan.json
│       │   ├── react-session-resume.json
│       │   └── nextjs-plan.json
│       ├── parsers/
│       │   ├── plan-parser.test.ts
│       │   ├── session-parser.test.ts
│       │   ├── meta-parser.test.ts
│       │   └── module-map.test.ts
│       └── tools/
│           ├── progress.test.ts
│           ├── session.test.ts
│           ├── review.test.ts
│           ├── daily.test.ts
│           └── stats.test.ts
├── .claude/commands/              # 리팩터링된 커맨드 (MCP 도구 활용)
├── docs/                          # 변경 없음
└── ref/                           # 변경 없음
```

### 5.3 MCP 도구 목록

#### 공통 컨텍스트 (`context.*`)

모든 도구는 입력에 `context`를 포함합니다. `context`는 스킬 모드(`docs/`)와 프로젝트 모드(`.study/`)를 모두 지원합니다.

| 도구 | 입력 | 출력 | 용도 |
|------|------|------|------|
| `context.resolve` | `{ mode: "skill" \| "project", skill?, projectPath?, topic?, docsDir?, studyDir? }` | `{ context: { mode, skill?, topic?, projectPath?, docsDir, studyDir?, sourceDir?, refDir, skillsDir } }` | 경로 정규화/검증, 프로젝트별 격리 |

**공통 규칙:**
- `mode="skill"`: `skill` 기반으로 `docs/{skill}` 경로를 해석
- `mode="project"`: `projectPath` 기반으로 `{projectPath}/.study` 경로를 해석
- 전역 mutable 경로 상태를 두지 않고, 각 호출의 `context`를 기준으로 처리

#### 공통 응답 Envelope (모든 도구)

모든 도구 응답은 아래 envelope를 사용합니다:

```json
{
  "schemaVersion": "1.0.0",
  "generatedAt": "2026-02-23T12:00:00Z",
  "data": {}
}
```

아래의 도구별 출력 스키마 예시는 `data` 필드 내부를 설명합니다.

#### 설정/경로

| 도구 | 입력 | 출력 | 용도 |
|------|------|------|------|
| `config.get` | — | `{ studyRoot, docsDir, refDir, skillsDir }` | 모든 커맨드의 경로 해결 |
| `config.set` | `{ context, key, value }` | `{ ok }` | 워크스페이스별 경로 설정 |

#### 진행 상태 (`progress.*`)

| 도구 | 입력 | 출력 | 용도 |
|------|------|------|------|
| `progress.getPlan` | `{ context, skill? }` | plan.md 구조화 파싱 결과 (아래 스키마) | `/learn`, `/study-skill`, `/dashboard`, `/next`, `/plan` |
| `progress.getNextTopic` | `{ context, skill? }` | `{ topic, step, phase, estimatedTime, sourceFiles }` | `/study`, `/next`, `/project-study` |
| `progress.updateCheckbox` | `{ context, skill?, topic, step, done }` | `{ ok }` | `/learn`, `/study-skill`, `/project-*` |
| `progress.getModuleMap` | `{ context, skill?, sourceDir? }` | MODULE_MAP JSON (캐시) | `/study-skill`, `/project-study` |
| `progress.getCoverageMap` | `{ context, skill?, sourceDir?, refsDir? }` | COVERAGE_MAP JSON (캐시) | `/study-skill`, `/project-study` |

**`progress.getPlan` 출력 스키마:**

```json
{
  "skill": "react",
  "description": "React Source Code & Documentation Study Plan",
  "coverage": {
    "total": 46,
    "covered": 8,
    "uncovered": 38,
    "rate": 0.174
  },
  "phases": [
    {
      "name": "Phase 1: Familiar",
      "description": "사용자가 직접 쓰는 API",
      "topics": [
        {
          "id": "topic-1",
          "name": "next/src/api",
          "module": "api",
          "status": "covered",
          "sourceFiles": 16,
          "docsFile": "Next-Src-Api.md",
          "steps": [
            { "name": "소스 파일 읽기", "done": true },
            { "name": "패턴/아키텍처 분석", "done": true },
            { "name": "학습 기록 작성", "done": true }
          ],
          "completionRate": 1.0
        }
      ]
    }
  ],
  "topicDocsMapping": {
    "api": "Next-Src-Api.md"
  }
}
```

#### 세션 관리 (`session.*`)

| 도구 | 입력 | 출력 | 용도 |
|------|------|------|------|
| `session.getResumePoint` | `{ context, skill?, topic }` | `{ exists, lastStep, lastDate, completedSteps, totalSteps, summary }` | `/learn`, `/project-learn` |
| `session.appendLog` | `{ context, skill?, topic, content }` | `{ ok, filePath }` | `/learn`, `/project-learn` |
| `session.getSourcePaths` | `{ context, skill? }` | `{ sourceDir, docsDir, files[] }` (캐시) | `/learn`, `/study-skill`, `/project-learn` |

**`session.getResumePoint` 출력 스키마:**

```json
{
  "exists": true,
  "lastStep": "Step 4: Client vs Server API 분리",
  "lastDate": "2026-02-11",
  "completedSteps": [
    "Step 1: ReactElement & $$typeof",
    "Step 2: SharedInternals & Dispatcher 패턴",
    "Step 3: Hooks API 선언부",
    "Step 4: Client vs Server API 분리"
  ],
  "totalSteps": 6,
  "pendingSteps": [
    "Step 5: HOC 유틸리티",
    "Step 6: cache & Transitions"
  ],
  "summary": "React 패키지의 Core API Surface 중 ReactElement, $$typeof 패턴..."
}
```

#### 복습 (`review.*`)

| 도구 | 입력 | 출력 | 용도 |
|------|------|------|------|
| `review.getQueue` | `{ context, skill? }` | 오늘 복습 대기 항목 (spaced repetition 계산 완료) | `/review`, `/next`, `/project-review` |
| `review.recordResult` | `{ context, skill?, topic, concept, score, attempt }` | `{ nextReviewDate, streak, level }` | `/review`, `/project-review` |
| `review.getMeta` | `{ context, skill?, topic }` | -meta.md 구조화 파싱 결과 | `/review`, `/project-review` |
| `review.saveMeta` | `{ context, skill?, topic, meta }` | `{ ok }` | `/review`, `/project-review` ("정리" 시) |

**`review.getQueue` 출력 스키마:**

```json
{
  "today": "2026-02-23",
  "items": [
    {
      "skill": "react",
      "topic": "React-Core-API",
      "concept": "$$typeof XSS 방어 원리",
      "level": "L2",
      "lastReview": "2026-02-16",
      "streak": 1,
      "overdueDays": 0
    }
  ],
  "graduated": 3,
  "totalActive": 12
}
```

**Spaced Repetition 계산 규칙 (코드로 확정):**

```
오답/패스      → 다음 복습: +1일,  streak = 0, level 하향
재시도/힌트    → 다음 복습: +3일,  streak = 0, level 유지
첫 시도 통과   → 다음 복습: +7일 × 2^(streak-1) (최대 30일), streak += 1, level 상향
졸업           → streak >= 3 (3회 연속 첫 시도 통과) → 출제 제외
```

#### 일일 학습 (`daily.*`)

| 도구 | 입력 | 출력 | 용도 |
|------|------|------|------|
| `daily.getStatus` | `{ context }` | `{ streak, todayState, achievementRate7d, lastSession }` | `/study` |
| `daily.logPlan` | `{ context, plan }` | `{ ok, logPath }` | `/study` |
| `daily.logDone` | `{ context, report }` | `{ ok, achievementRate }` | `/study` |
| `daily.finalize` | `{ context }` | `{ ok }` | `/study` |

#### 집계/대시보드 (`stats.*`)

| 도구 | 입력 | 출력 | 용도 |
|------|------|------|------|
| `stats.getDashboard` | `{ context }` | 전체 스킬별 진행률, 최근 활동, 복습 대기 | `/dashboard` |
| `stats.getRecommendation` | `{ context }` | 우선순위 기반 추천 3건 + 근거 | `/next` |

**`stats.getDashboard` 출력 스키마:**

```json
{
  "skills": [
    {
      "name": "react",
      "totalTopics": 46,
      "completedTopics": 4,
      "progressRate": 0.087,
      "coverageRate": 0.174,
      "lastActivity": "2026-02-11",
      "reviewPending": 2,
      "graduated": 0
    }
  ],
  "recentSessions": [
    { "date": "2026-02-11", "skill": "react", "topic": "React-Core-API" }
  ],
  "streak": 0,
  "totalReviewPending": 2
}
```

#### 캐시 키/무효화 규칙

대상 도구: `progress.getModuleMap`, `progress.getCoverageMap`, `session.getSourcePaths`

- **캐시 키**: `hash(realpath(sourceDir), gitHead, fileCount, maxMtime, parserVersion)`
- **무효화 조건**:
  - `gitHead` 변경
  - `fileCount` 또는 `maxMtime` 변경
  - `parserVersion` 변경
  - 캐시 TTL(24시간) 만료
- **응답 메타**: `cache.hit`, `cache.key`, `cache.invalidatedReason` 포함

### 5.4 파서 설계

#### plan-parser.ts

**입력**: plan.md 마크다운 텍스트

**파싱 대상**:

```markdown
## Coverage Analysis
| Status | Module | Skill Target |
|--------|--------|--------------|
| ✅ 커버 | react | hooks.md, ... |        ← status, module, target 추출
| ⬜ 미커버 | react-client | 신규 생성 필요 |

## Phase 1: Familiar — ... (8 Topics)
### Topic 1: next/src/api ✅ 커버    ← topic name, status
**Source Files** (...)               ← source file count
- [x] Step 1: ...                    ← step name, done 여부
- [ ] Step 2: ...
```

**파싱 전략**:
- Coverage Analysis: 테이블 행을 정규식 `/^\| (✅|⬜|🔗) .+\|/` 로 매칭
- Phase/Topic: `## Phase N:` → `### Topic N:` 계층 구조
- Steps: `- [x]` / `- [ ]` 체크박스 정규식
- Topic-Docs Mapping: Topic 섹션 내 docsFile 참조 또는 별도 섹션

#### session-parser.ts

**입력**: {Topic}.md 마크다운 텍스트

**파싱 대상**:

```markdown
## 2026-02-11                              ← 세션 날짜
### 학습 로드맵
- [x] Step 1: ReactElement & $$typeof      ← step name, done
- [ ] Step 5: HOC 유틸리티                  ← 미완료
### 학습 요약
React 패키지의 Core API Surface...         ← 요약 텍스트
### 소스 코드 경로
- `packages/react/src/...`                 ← 소스 경로 목록
### Q&A 전체 기록
#### Step 1.1: ...                         ← Q&A 섹션 (파싱 대상 아님, 보존만)
```

**파싱 전략**:
- `## YYYY-MM-DD` 로 세션 경계 분리
- 마지막 세션의 학습 로드맵에서 체크박스 상태 추출
- 요약은 `### 학습 요약` ~ 다음 `###` 사이 텍스트

#### meta-parser.ts

**입력**: {Topic}-meta.md 마크다운 텍스트

**파싱 대상**: 개념별 복습 메타데이터 (난이도, streak, 다음 복습일, 졸업 여부)

**파싱 전략**: 테이블 행 또는 YAML-like 구조 정규식 매칭

#### module-map.ts

**입력**: ref/ 디렉토리 경로

**파싱 전략**:
- `packages/*/`, `src/*/`, `lib/*/`, `app/*/` 패턴으로 모듈 식별
- 각 모듈의 파일 목록, 엔트리포인트 (`index.ts`, `package.json#main`) 추출
- AI 주관 필터링 없이 발견된 모듈 전부 포함 (기존 원칙 유지)

---

## 6. 커맨드 리팩터링 방향

### Before/After 비교

#### `/learn` (633줄 → ~100줄)

**제거되는 것 (MCP로 이동):**
- Phase 1.5 세션 재개 파싱 → `session.getResumePoint`
- Phase 2 ref/ 소스 탐색 → `session.getSourcePaths`
- plan.md 교차 참조 → `progress.getPlan`
- 세션 기록 append → `session.appendLog`
- 체크박스 업데이트 → `progress.updateCheckbox`

**남는 것 (프롬프트):**
- 토픽 분해 (서브토픽 → 마이크로 스텝) — LLM 판단 필요
- Step별 소스 설명 + Q&A — 대화형
- 스킬 레퍼런스 보강 제안 — LLM 판단 필요
- 소스 코드 Read — 실제 코드 읽기는 여전히 LLM이 수행

#### `/study-skill` (540줄 → ~80줄)

**제거되는 것:**
- MODULE_MAP 생성 → `progress.getModuleMap`
- COVERAGE_MAP 생성 → `progress.getCoverageMap`
- plan.md 생성/관리 → `progress.getPlan` + `progress.updateCheckbox`

**남는 것:**
- 토픽별 소스 검증 — LLM이 소스를 읽고 레퍼런스와 대조
- 최소 개선 제안 — LLM 판단
- 사용자와의 리뷰 대화 — 대화형

#### `/review` (608줄 → ~80줄)

**제거되는 것:**
- -meta.md 파싱 → `review.getMeta`
- 복습 대기열 계산 → `review.getQueue`
- 난이도/간격 계산 → `review.recordResult`
- 메타 저장 → `review.saveMeta`

**남는 것:**
- 질문 생성 — LLM이 학습 기록 기반으로 출제
- 답변 판정 (통과/아쉬움/오답) — LLM 판단
- 피드백 — 대화형

#### `/dashboard` (→ ~30줄)

**제거되는 것:**
- 전체 docs/ 스캔 + 집계 → `stats.getDashboard`

**남는 것:**
- 대시보드 포맷팅 — MCP가 반환한 JSON을 마크다운 테이블로 렌더링

#### `/next` (→ ~40줄)

**제거되는 것:**
- 상태 수집 + 우선순위 계산 → `stats.getRecommendation`

**남는 것:**
- 추천 이유 설명 — LLM이 근거를 자연어로 서술
- 주간 스케줄 포맷팅

#### `/study` (356줄 → ~50줄)

**제거되는 것:**
- plan.md 읽기, 로그 파일 관리, streak 계산 → `daily.*`, `progress.getNextTopic`

**남는 것:**
- 학습 계획 코칭 — LLM이 제안하고 사용자가 결정
- 오케스트레이션 — MCP 데이터 기반으로 `/learn` 또는 `/review` 자동 연결

---

## 7. 테스트 전략

### 원칙

- **설계와 함께** — 각 MCP 도구의 테스트 케이스를 도구 스키마와 동시에 정의
- **기존 데이터 활용** — `docs/react/`, `docs/nextjs/`의 실제 파일로 회귀 테스트
- **TDD** — 테스트 먼저 작성, 파서 구현은 테스트를 통과시키면서

### Layer 1: 파서 단위 테스트

각 파서 함수의 입출력을 검증. 기존 docs/ 파일을 fixtures로 복사하여 골든 테스트.

#### plan-parser.test.ts

```typescript
// fixture: test/fixtures/react/plan.md (기존 docs/react/plan.md 스냅샷)

describe("parsePlan", () => {
  it("Coverage Analysis 테이블 파싱", () => {
    const result = parsePlan(fixture);
    expect(result.coverage.total).toBe(46);
    expect(result.coverage.covered).toBe(8);
    expect(result.coverage.rate).toBeCloseTo(0.174);
  });

  it("Phase/Topic 계층 구조 파싱", () => {
    const result = parsePlan(fixture);
    expect(result.phases.length).toBeGreaterThanOrEqual(1);
    expect(result.phases[0].name).toMatch(/Phase 1/);
    expect(result.phases[0].topics.length).toBeGreaterThan(0);
  });

  it("체크박스 상태 파싱", () => {
    const result = parsePlan(fixture);
    const topic = result.phases[0].topics[0];
    topic.steps.forEach(step => {
      expect(typeof step.done).toBe("boolean");
    });
  });

  it("빈 plan.md 처리", () => {
    const result = parsePlan("");
    expect(result.phases).toEqual([]);
    expect(result.coverage.total).toBe(0);
  });
});
```

#### session-parser.test.ts

```typescript
// fixture: test/fixtures/react/React-Core-API.md (기존 파일 스냅샷)

describe("parseSession", () => {
  it("마지막 세션의 재개점 추출", () => {
    const result = getResumePoint(fixture);
    expect(result.exists).toBe(true);
    expect(result.lastDate).toBe("2026-02-11");
    expect(result.completedSteps).toContain("Step 1: ReactElement & $$typeof");
  });

  it("완료/미완료 스텝 분리", () => {
    const result = getResumePoint(fixture);
    expect(result.completedSteps.length).toBe(6); // 전부 완료
    expect(result.pendingSteps.length).toBe(0);
  });

  it("학습 요약 추출", () => {
    const result = getResumePoint(fixture);
    expect(result.summary).toContain("React 패키지의 Core API Surface");
  });

  it("세션 기록이 없는 경우", () => {
    const result = getResumePoint("");
    expect(result.exists).toBe(false);
  });

  it("여러 세션이 있는 경우 마지막 세션 기준", () => {
    const multiSession = fixture + "\n---\n\n## 2026-02-20\n### 학습 로드맵\n- [ ] Step 1: 새 토픽";
    const result = getResumePoint(multiSession);
    expect(result.lastDate).toBe("2026-02-20");
    expect(result.pendingSteps).toContain("Step 1: 새 토픽");
  });
});
```

#### meta-parser.test.ts

```typescript
describe("parseMeta", () => {
  it("복습 메타 파싱", () => {
    const meta = parseMeta(metaFixture);
    expect(meta.concepts.length).toBeGreaterThan(0);
    meta.concepts.forEach(c => {
      expect(c).toHaveProperty("name");
      expect(c).toHaveProperty("level");
      expect(c).toHaveProperty("streak");
      expect(c).toHaveProperty("nextReview");
      expect(c).toHaveProperty("graduated");
    });
  });

  it("졸업 판정", () => {
    const meta = parseMeta(graduatedFixture);
    const graduated = meta.concepts.filter(c => c.graduated);
    expect(graduated.length).toBeGreaterThan(0);
    graduated.forEach(c => expect(c.streak).toBeGreaterThanOrEqual(3));
  });

  it("메타 파일 없는 경우 (첫 복습)", () => {
    const meta = parseMeta("");
    expect(meta.concepts).toEqual([]);
    expect(meta.sessionCount).toBe(0);
  });
});
```

#### module-map.test.ts

```typescript
describe("buildModuleMap", () => {
  it("packages/* 패턴 모듈 추출", () => {
    // ref/react-fork/packages/ 구조 기반
    const map = buildModuleMap("/path/to/ref/react-fork");
    expect(map.modules.length).toBe(46); // 기존 plan.md와 일치
    expect(map.modules.map(m => m.name)).toContain("react");
    expect(map.modules.map(m => m.name)).toContain("react-reconciler");
    expect(map.modules.map(m => m.name)).toContain("scheduler");
  });

  it("AI 필터링 없이 전체 모듈 포함", () => {
    const map = buildModuleMap("/path/to/ref/react-fork");
    // 테스트용, devtools 등도 포함되어야 함
    expect(map.modules.map(m => m.name)).toContain("react-devtools");
    expect(map.modules.map(m => m.name)).toContain("jest-react");
  });
});
```

### Layer 2: 도구 통합 테스트

MCP 도구 함수가 파서를 올바르게 조합하고, 파일 시스템과 상호작용하는지 검증.

```typescript
describe("progress.getPlan", () => {
  it("실제 fixture 파일에서 구조화 데이터 반환", async () => {
    const result = await progressGetPlan({ skill: "react" });
    expect(result.skill).toBe("react");
    expect(result.coverage.total).toBe(46);
    expect(result.phases.length).toBeGreaterThanOrEqual(1);
  });
});

describe("session.getResumePoint", () => {
  it("기존 학습 기록에서 재개점 반환", async () => {
    const result = await sessionGetResumePoint({ skill: "react", topic: "React-Core-API" });
    expect(result.exists).toBe(true);
    expect(result.lastDate).toBe("2026-02-11");
  });
});

describe("review.getQueue", () => {
  it("오늘 복습 대기 항목 반환 (spaced repetition 적용)", async () => {
    const result = await reviewGetQueue({ skill: "react" });
    expect(result.today).toBe("2026-02-23");
    expect(Array.isArray(result.items)).toBe(true);
  });
});

describe("stats.getDashboard", () => {
  it("전체 스킬 집계", async () => {
    const result = await statsGetDashboard();
    expect(result.skills.length).toBe(2); // react, nextjs
    expect(result.skills[0].name).toBe("react");
    expect(result.skills[0].totalTopics).toBe(46);
  });
});
```

### Layer 3: Spaced Repetition 계산 테스트

복습 주기 계산은 핵심 비즈니스 로직이므로 별도 집중 테스트.

```typescript
describe("calculateNextReview", () => {
  it("오답 → +1일, streak 리셋", () => {
    const result = calculateNextReview({ score: "wrong", streak: 2, level: "L2" });
    expect(result.nextInterval).toBe(1);
    expect(result.streak).toBe(0);
    expect(result.level).toBe("L1");
  });

  it("재시도 통과 → +3일, streak 리셋", () => {
    const result = calculateNextReview({ score: "retry_pass", streak: 1, level: "L2" });
    expect(result.nextInterval).toBe(3);
    expect(result.streak).toBe(0);
    expect(result.level).toBe("L2");
  });

  it("첫 시도 통과 → +7일, streak 증가", () => {
    const result = calculateNextReview({ score: "first_pass", streak: 0, level: "L1" });
    expect(result.nextInterval).toBe(7);
    expect(result.streak).toBe(1);
    expect(result.level).toBe("L2");
  });

  it("연속 통과 시 간격 2배 증가 (최대 30일)", () => {
    const r1 = calculateNextReview({ score: "first_pass", streak: 1, level: "L2" });
    expect(r1.nextInterval).toBe(14); // 7 * 2^1

    const r2 = calculateNextReview({ score: "first_pass", streak: 2, level: "L3" });
    expect(r2.nextInterval).toBe(28); // 7 * 2^2

    const r3 = calculateNextReview({ score: "first_pass", streak: 3, level: "L3" });
    expect(r3.nextInterval).toBe(30); // cap at 30
  });

  it("졸업 판정: streak >= 3", () => {
    const result = calculateNextReview({ score: "first_pass", streak: 2, level: "L3" });
    expect(result.streak).toBe(3);
    expect(result.graduated).toBe(true);
  });
});
```

### Layer 3.5: 시간 의존성(Clock) 테스트

날짜 기반 로직(`review.getQueue`, `daily.getStatus`, `stats.getDashboard`)은 시스템 시간을 직접 읽지 않고 주입 가능한 Clock을 사용합니다.

```typescript
interface Clock {
  now(): Date;
}
```

테스트에서는 fake timer 또는 고정 Clock fixture를 사용합니다.

```typescript
it("review.getQueue는 고정 날짜 기준으로 계산", async () => {
  const clock = fixedClock("2026-02-23T09:00:00Z");
  const result = await reviewGetQueue({ context, clock });
  expect(result.today).toBe("2026-02-23");
});
```

### Layer 4: 커맨드 동등성 시나리오

리팩터링 후 각 커맨드가 기존과 동일하게 동작하는지 수동 + 자동 검증.

| 시나리오 | 검증 방법 | 기대 결과 |
|----------|----------|----------|
| `/dashboard` 실행 | MCP `stats.getDashboard` 결과 vs 기존 LLM 파싱 결과 비교 | 동일한 수치 (스킬 수, 토픽 수, 진행률) |
| `/learn react "Fiber"` 세션 재개 | `session.getResumePoint` vs 기존 파일 직접 읽기 | 동일한 재개점, 완료/미완료 스텝 |
| `/review react` 복습 대기열 | `review.getQueue` vs 수동 -meta.md 확인 | 동일한 대기 항목, 난이도 |
| `/next` 추천 | `stats.getRecommendation` 근거 데이터 vs 수동 확인 | 동일한 데이터 기반 (판단은 LLM이므로 완전 동일 불필요) |
| `/study-skill react` MODULE_MAP | `progress.getModuleMap` vs 기존 plan.md의 모듈 목록 | 46개 모듈 동일 |
| 세션 기록 append | `session.appendLog` 후 파일 구조 | 기존 섹션 손상 없음, `---` 구분선 후 새 세션 |

---

## 8. 마이그레이션 호환성

### 기존 데이터 보존

| 파일 | 마이그레이션 | 비고 |
|------|------------|------|
| `docs/react/plan.md` | 변경 없음 | MCP가 기존 형식 그대로 파싱 |
| `docs/react/*.md` | 변경 없음 | 세션 기록 구조 유지 |
| `docs/react/*-meta.md` | 변경 없음 | 복습 메타 구조 유지 |
| `docs/nextjs/*` | 변경 없음 | 동일 |
| `docs/master-plan.md` | 변경 없음 | 동일 |

**원칙**: MCP 서버가 기존 마크다운 형식에 맞추는 것이지, 기존 파일을 MCP에 맞추는 것이 아님.

### 파서 호환성 체크리스트

- [ ] plan.md의 Coverage Analysis 테이블 (✅/⬜/🔗 이모지 + 파이프 구분)
- [ ] plan.md의 Phase/Topic/Step 계층 (`##` → `###` → `- [x]`)
- [ ] {Topic}.md의 세션 경계 (`## YYYY-MM-DD`)
- [ ] {Topic}.md의 학습 로드맵 체크박스 (`- [x] Step N:`)
- [ ] {Topic}.md의 다중 세션 (첫 세션 / 중간 / 마지막)
- [ ] -meta.md의 개념별 메타데이터
- [ ] -quiz.md 구조 (파싱 불필요, 보존만)
- [ ] 파일명 컨벤션 (Title-Case-Hyphen.md)

---

## 9. MCP 서버 설정

### Claude Code 설정

```json
// ~/.claude/settings.json 또는 프로젝트 .claude/settings.json
{
  "mcpServers": {
    "study": {
      "command": "node",
      "args": ["/Users/younghoonkim/dev/personal/@skills/study-all/mcp/dist/index.js"],
      "env": {
        "STUDY_ROOT": "/Users/younghoonkim/dev/personal/@skills/study-all"
      }
    }
  }
}
```

### 빌드/실행 규약

- 빌드: `pnpm -C mcp exec tsc -p tsconfig.json`
- 실행: `node mcp/dist/index.js`
- 개발 중 타입체크: `pnpm -C mcp exec tsc --noEmit`

### 환경 변수

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `STUDY_ROOT` | (필수) | study-all 루트 경로 |
| `DOCS_DIR` | `docs` | 학습 기록 디렉토리 (STUDY_ROOT 상대) |
| `REF_DIR` | `ref` | 소스/문서 디렉토리 (STUDY_ROOT 상대) |
| `SKILLS_DIR` | `~/.claude/skills` | 스킬 레퍼런스 디렉토리 |

---

## 10. 구현 순서

```
Phase 1: 기반
  1. mcp/ 프로젝트 초기화 (package.json, tsconfig.json, vitest)
  2. test/fixtures/ 에 기존 docs/ 파일 스냅샷 복사
  3. test/expected/ 에 기대 출력 JSON 수동 작성

Phase 2: 파서 (TDD)
  4. plan-parser — 테스트 작성 → 구현 → 통과
  5. session-parser — 테스트 작성 → 구현 → 통과
  6. meta-parser — 테스트 작성 → 구현 → 통과
  7. module-map — 테스트 작성 → 구현 → 통과

Phase 3: MCP 도구 (TDD)
  8. config — 테스트 작성 → 구현 → 통과
  9. progress — 테스트 작성 → 구현 → 통과
  10. session — 테스트 작성 → 구현 → 통과
  11. review — 테스트 작성 → 구현 → 통과
  12. daily — 테스트 작성 → 구현 → 통과
  13. stats — 테스트 작성 → 구현 → 통과

Phase 4: MCP 서버 통합
  14. index.ts — 도구 등록, MCP SDK 연결
  15. Claude Code 설정 등록
  16. 수동 연결 테스트 (각 도구 호출 → JSON 응답 확인)

Phase 5: 커맨드 리팩터링
  17. /dashboard — MCP 도구 활용으로 축소
  18. /next — MCP 도구 활용으로 축소
  19. /learn — MCP 도구 활용으로 축소
  20. /study-skill — MCP 도구 활용으로 축소
  21. /review — MCP 도구 활용으로 축소
  22. /study — MCP 도구 활용으로 축소
  23. /project-* — MCP 도구 활용으로 축소
  24. /plan — MCP 도구 활용으로 축소

Phase 6: 검증
  25. 커맨드 동등성 시나리오 테스트 (Layer 4)
  26. 기존 학습 기록으로 전체 흐름 E2E 확인
  27. scripts/check-docs.sh 호환성 확인
```

---

## 11. 리스크 & 완화

| 리스크 | 영향 | 완화 |
|--------|------|------|
| 마크다운 파싱 엣지케이스 | 기존 데이터 오독 | 골든 테스트로 실제 파일 검증, 엣지케이스 발견 시 fixture 추가 |
| MCP 서버 장애 | 학습 시스템 전체 중단 | 마크다운 원본 보존으로 수동 확인 가능. 폴백 프롬프트 준비 |
| 프롬프트 리팩터링 시 기존 행동 누락 | 학습 품질 저하 | 커맨드별 체크리스트로 기존 Phase/규칙 매핑 확인 |
| MCP 도구 스키마 변경 | 커맨드 호환성 파손 | `schemaVersion` 고정 + 계약 테스트(JSON Schema/Zod)로 호환성 검증 |
| ref/ 디렉토리 구조 변경 (소스 업데이트) | MODULE_MAP 불일치 | 캐시 키(`gitHead`,`fileCount`,`maxMtime`,`parserVersion`) 기반 자동 무효화 |
| 다중 프로젝트 병행 세션 | 경로 오염/데이터 혼선 | `context.resolve`로 호출 단위 경로 격리, 전역 경로 상태 금지 |
| 날짜 기반 테스트 | 플래키 테스트 | Clock 주입 + fake timer로 고정 시각 테스트 |

---

## 부록 A: 근거 문서 원본

경로: `~/.claude/study-logs/2026-02-23-mcp-migration-rationale.md`

이 설계 문서는 위 근거 문서의 분석을 기반으로 작성됨.

## 부록 B: 커맨드-MCP 도구 매핑 요약

| 커맨드 | MCP 도구 |
|--------|---------|
| `/dashboard` | `stats.getDashboard` |
| `/next` | `stats.getRecommendation`, `review.getQueue` |
| `/plan` | `context.resolve`, `progress.getPlan` (여러 스킬), `config.get` |
| `/learn` | `context.resolve`, `session.getResumePoint`, `session.getSourcePaths`, `session.appendLog`, `progress.getPlan`, `progress.updateCheckbox` |
| `/study-skill` | `context.resolve`, `progress.getModuleMap`, `progress.getCoverageMap`, `progress.getPlan`, `progress.updateCheckbox` |
| `/review` | `context.resolve`, `review.getQueue`, `review.getMeta`, `review.recordResult`, `review.saveMeta` |
| `/study` | `context.resolve`, `daily.*`, `progress.getNextTopic`, `config.get` |
| `/project-*` | `context.resolve(mode=project)` + `session.*`/`review.*`/`progress.*` 공통 도구 |
