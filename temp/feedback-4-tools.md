# Scope 4: Tool 구현 품질 피드백

> 검토일: 2026-02-23

## 요약

Clock 인터페이스가 `clock.ts`에 잘 설계되었으나, 실제 시간 의존 도구 4개(`session.ts`, `review.ts`, `daily.ts`, `stats.ts`)에서 총 11곳의 `new Date()` 직접 호출이 존재하여 테스트 가능성이 심각하게 저해된다. `config.ts`의 모듈 레벨 mutable Map은 설계 문서의 "전역 mutable 경로 상태 금지" 원칙을 정면으로 위반하며, `stats.getDashboard`의 N+1 쿼리 패턴은 컷오버 게이트의 p95 성능 요건을 위협한다.

## 발견 사항

### [S4-001] Clock 미주입: session.appendLog — 심각도: HIGH

- **현재 코드**: `mcp/src/tools/session.ts:114`
  ```typescript
  const today = new Date().toISOString().slice(0, 10);
  ```
- **설계 문서**: `plan/mcp.md` Section 7 Layer 3.5 (line 775-793)
  > "날짜 기반 로직(`review.getQueue`, `daily.getStatus`, `stats.getDashboard`)은 시스템 시간을 직접 읽지 않고 주입 가능한 Clock을 사용합니다."
- **문제**: `sessionAppendLog`가 세션 기록의 날짜 헤더 `## ${today}`에 하드코딩된 `new Date()`를 사용한다. 테스트에서 골든 출력과 비교할 때 실행 시점에 따라 결과가 달라져 플래키 테스트의 원인이 된다.
- **근거**: `clock.ts`에 `FixedClock`이 준비되어 있으며, `envelope.ts`의 `makeEnvelope`는 이미 `Clock`을 파라미터로 받는다. 인프라는 존재하지만 연결이 누락된 상태.
- **수정 방향**: `sessionAppendLog` 함수 시그니처에 `clock?: Clock` 파라미터를 추가하고, `const today = clock.now().toISOString().slice(0, 10)`으로 대체한다.

### [S4-002] Clock 미주입: review.reviewRecordResult — 심각도: HIGH

- **현재 코드**: `mcp/src/tools/review.ts:195`
  ```typescript
  const now = new Date();
  ```
- **설계 문서**: `plan/mcp.md` Section 7 Layer 3.5
- **문제**: `reviewRecordResult`는 복습 결과를 기록하면서 `calculateNextReview`에 `now`를 전달한다. `calculateNextReview` 자체는 `now?: Date` 파라미터를 이미 수용하지만(`review.ts:86`), 호출자인 `reviewRecordResult`에서 `new Date()`를 고정 전달하므로 테스트에서 날짜를 제어할 수 없다.
- **근거**: Spaced Repetition 계산은 핵심 비즈니스 로직이다. `nextReviewDate`가 테스트 시점에 종속되면 Layer 3 테스트(line 729-772)의 전제가 무너진다.
- **수정 방향**: `reviewRecordResult`에 `clock?: Clock` 파라미터를 추가하고, `const now = clock.now()`로 대체한다.

### [S4-003] Clock 미주입: review.reviewGetQueue — 심각도: HIGH

- **현재 코드**: `mcp/src/tools/review.ts:240`
  ```typescript
  const today = toDateOnly(new Date());
  ```
- **설계 문서**: `plan/mcp.md` Section 7 Layer 3.5 (line 787-793)
  ```typescript
  it("review.getQueue는 고정 날짜 기준으로 계산", async () => {
    const clock = fixedClock("2026-02-23T09:00:00Z");
    const result = await reviewGetQueue({ context, clock });
    expect(result.today).toBe("2026-02-23");
  });
  ```
- **문제**: 설계 문서가 `reviewGetQueue({ context, clock })` 형태의 테스트 코드를 제시하고 있으나, 실제 함수 시그니처에 `clock` 파라미터가 없다. 복습 대기열의 `today` 필드와 `overdueDays` 계산이 모두 시스템 시간에 종속된다. 이 함수는 `stats.getDashboard`에서도 호출되므로 영향이 전파된다.
- **근거**: 설계 문서의 테스트 예제와 구현이 직접 모순.
- **수정 방향**: 함수 시그니처에 `clock?: Clock` 파라미터를 추가한다. 설계 문서의 테스트 코드와 일치시킨다.

### [S4-004] Clock 미주입: daily.ts 전체 (7곳) — 심각도: HIGH

- **현재 코드**: `mcp/src/tools/daily.ts` (line 41, 91, 116, 166, 181, 200, 221)
  ```typescript
  // line 41 — todayFile()
  return path.join(logDir, `${dateOnly(new Date())}.md`);

  // line 116 — computeStreak()
  const now = new Date(`${dateOnly(new Date())}T00:00:00.000Z`);

  // line 166 — dailyGetStatus
  lastSession: (await exists(filePath)) ? dateOnly(new Date()) : undefined,

  // line 181, 200, 221 — dailyLogPlan, dailyLogDone, dailyFinalize
  text = `# ${dateOnly(new Date())}\n\n> 상태: ...`;
  ```
- **설계 문서**: `plan/mcp.md` Section 7 Layer 3.5
  > "날짜 기반 로직(`review.getQueue`, `daily.getStatus`, `stats.getDashboard`)은 시스템 시간을 직접 읽지 않고 주입 가능한 Clock을 사용합니다."
- **문제**: `daily.ts`에 `new Date()` 호출이 7곳 존재하며, `clock.ts`를 import조차 하지 않는다. `todayFile()` 함수는 모듈 내 4개 exported 함수 모두에서 호출되어 영향 범위가 넓다. `computeStreak()`의 streak 계산과 `computeAchievementRate7d()`의 7일 달성률 계산도 모두 "오늘"에 의존한다. 설계 문서가 `daily.getStatus`를 Clock 주입 대상으로 명시적으로 언급하고 있다.
- **근거**: `daily.ts`는 `new Date()` 호출 밀도가 가장 높은 파일이다. clock 미사용으로 인해 streak, todayFile, 달성률 계산 모두 테스트 불가.
- **수정 방향**: `todayFile`, `computeStreak`, `computeAchievementRate7d`, `replaceStatus` 등 내부 함수에 `clock: Clock` 파라미터를 전달하는 구조로 리팩터링한다. `dailyGetStatus` 등 외부 함수는 `clock: Clock = systemClock` 기본값을 사용.

### [S4-005] MemoryCache가 `Date.now()` 직접 사용 — 심각도: MEDIUM

- **현재 코드**: `mcp/src/lib/cache.ts:24, 35`
  ```typescript
  // line 24 — get()
  if (Date.now() > entry.expiresAt) {

  // line 35 — set()
  expiresAt: Date.now() + ttlMs,
  ```
- **설계 문서**: `plan/mcp.md` Section 7 Layer 3.5 — Clock 주입으로 시간 의존성 제거
- **문제**: `MemoryCache`가 `Date.now()`를 직접 호출하므로, TTL 만료 테스트를 작성할 때 Vitest의 `vi.useFakeTimers()`나 별도의 시간 mocking이 필요하다. `Clock` 인터페이스와의 일관성이 없다. 캐시 TTL이 24시간(`CACHE_TTL_MS = 24 * 60 * 60 * 1000`)이므로 단위 테스트에서 자연 만료를 기다릴 수 없다.
- **근거**: `MemoryCache`는 `progress.ts`와 `session.ts`에서 캐시 관리에 사용되며, 캐시 키 무효화 테스트는 중요한 검증 항목이다.
- **수정 방향**: `MemoryCache` 생성자에 `Clock`을 주입받도록 수정하고, `Date.now()` 대신 `clock.now().getTime()`을 사용한다.

### [S4-006] config.ts의 모듈 레벨 mutable Map — 설계 원칙 위반 — 심각도: HIGH

- **현재 코드**: `mcp/src/tools/config.ts:6`
  ```typescript
  const overrides = new Map<string, string>();
  ```
  `configGet`(`config.ts:28-31`):
  ```typescript
  docsDir: overrides.get("docsDir") ?? cfg.docsDir,
  refDir: overrides.get("refDir") ?? cfg.refDir,
  skillsDir: overrides.get("skillsDir") ?? cfg.skillsDir,
  studyLogsDir: overrides.get("studyLogsDir") ?? cfg.studyLogsDir,
  ```
- **설계 문서**: `plan/mcp.md` Section 5.3 context.resolve 설명 (line 213)
  > "전역 mutable 경로 상태를 두지 않고, 각 호출의 `context`를 기준으로 처리"

  Section 11 리스크 테이블 (line 927):
  > "다중 프로젝트 병행 세션 → 경로 오염/데이터 혼선 → `context.resolve`로 호출 단위 경로 격리, 전역 경로 상태 금지"
- **문제**:
  1. **설계 원칙 정면 위반**: `overrides` Map이 모듈 스코프에서 프로세스 수명 동안 영속하는 전역 mutable 경로 상태이다.
  2. **경로 오염**: 프로젝트 A에서 `configSet({ key: "docsDir", value: "/a/docs" })` 호출 후, 프로젝트 B에서 `configGet()` 호출 시 프로젝트 A의 override가 반환된다.
  3. **context.resolve와 불일치**: `resolveContextData`(`context.ts:60`)는 `loadConfig()`를 직접 호출하며 `overrides` Map을 참조하지 않는다. 따라서 `configGet`과 `context.resolve`가 같은 설정에 대해 다른 값을 반환할 수 있다.
  4. **리셋 메커니즘 부재**: `overrides.clear()` 또는 키 삭제 기능이 없어, 한번 설정하면 서버 재시작 전까지 되돌릴 수 없다.
  5. **테스트 격리 불가**: 테스트 간 상태가 공유되어 테스트 순서에 따라 결과가 달라진다.
- **근거**: 설계 문서가 2곳에서 전역 경로 상태를 금지하고 있으며, `context.resolve` 기반의 호출 단위 경로 격리를 대안으로 제시하고 있다.
- **수정 방향**: `config.set`을 제거하거나, override를 `context` 단위로 전달하는 방식으로 변경한다. `context` 입력에 이미 `docsDir`, `studyDir` 필드가 있으므로 호출 단위 경로 커스터마이징은 지원된다.

### [S4-007] stats.getDashboard의 N+1 쿼리 패턴 — 심각도: MEDIUM

- **현재 코드**: `mcp/src/tools/stats.ts:69-103`
  ```typescript
  for (const skillDir of skillDirs) {
    const skill = path.basename(skillDir);
    const planText = await readText(path.join(skillDir, "plan.md"));   // 읽기 1
    const plan = parsePlan(planText, skill);

    const queue = await reviewGetQueue({                               // N+1
      context: { mode: "skill", skill },
      skill,
    });

    const lastActivity = await getLastActivityDate(skillDir);          // M+1
    // ...
  }
  ```
- **설계 문서**: `plan/mcp.md` Section 3.1 컷오버 게이트 (line 102):
  > "핵심 읽기 도구(`progress.getPlan`, `review.getQueue`, `stats.getDashboard`)의 p95 응답 시간이 기존 대비 20% 이내"
- **문제**:
  1. **reviewGetQueue per skill**: 각 스킬마다 `reviewGetQueue`를 호출하는데, 이 함수 내부에서 `resolveContextData` → `loadConfig` → `detectSourceDir`(fs.access 다수)를 매번 반복한다.
  2. **직렬 실행**: `for...of` 루프 안에서 `await`하므로 스킬이 많으면 응답이 선형으로 느려진다.
  3. **파일 I/O 총량**: `S × (N + M + 3)` (S: 스킬 수, N: 스킬당 meta 파일 수, M: 스킬당 토픽 파일 수). 현재 데이터로 최악 시나리오 약 190회 파일 읽기.
- **근거**: 컷오버 게이트의 p95 성능 요건을 충족하기 어려울 수 있다.
- **수정 방향**:
  1. 스킬별 루프를 `Promise.all`로 병렬화한다.
  2. 복습 대기열 데이터를 한 번에 수집하는 내부 함수를 만들어 `reviewGetQueue`를 스킬별로 호출하지 않도록 한다.

### [S4-008] getLastActivityDate의 비효율적 전체 파일 파싱 — 심각도: MEDIUM

- **현재 코드**: `mcp/src/tools/stats.ts:41-57`
  ```typescript
  async function getLastActivityDate(skillDir: string): Promise<string | undefined> {
    const files = (await listFiles(skillDir, { extension: ".md", maxDepth: 1 })).filter(
      (file) => !file.endsWith("plan.md") && !file.endsWith("-quiz.md") && !file.endsWith("-meta.md"),
    );
    let latest: string | undefined;
    for (const file of files) {
      const text = await readText(file);        // 토픽 파일 전체 읽기
      const resume = getResumePoint(text);       // 전체 세션 파싱
      if (!resume.lastDate) continue;
      if (!latest || resume.lastDate > latest) {
        latest = resume.lastDate;
      }
    }
    return latest;
  }
  ```
- **설계 문서**: 별도 언급 없음. 하지만 `stats.getDashboard`의 성능 조건에 포함.
- **문제**: 마지막 활동 날짜만 필요한데, 모든 토픽 파일의 전체 내용을 읽고 `getResumePoint`(세션 경계 분리 + 체크박스 상태 추출 + 요약 추출)를 수행한다.
- **근거**: `getResumePoint`는 완전한 세션 파싱을 수행하므로 오버헤드가 크다. 실제로는 `## YYYY-MM-DD` 패턴의 마지막 발생만 정규식으로 추출하면 충분하다.
- **수정 방향**: session-parser에 `getLastSessionDate(text: string): string | undefined` 경량 함수를 추가하여, 정규식 매칭만으로 마지막 세션 날짜를 추출한다.

### [S4-009] stats.getRecommendation이 getDashboard를 재호출 — 중복 계산 — 심각도: MEDIUM

- **현재 코드**: `mcp/src/tools/stats.ts:122-126`
  ```typescript
  export async function statsGetRecommendation(input) {
    const parsed = recommendationInputSchema.parse(input);
    const dashboard = await statsGetDashboard({ context: parsed.context });
    // ...
  }
  ```
- **설계 문서**: `plan/mcp.md` 부록 B — `/next`는 `stats.getRecommendation`과 `review.getQueue`를 모두 사용
- **문제**: `statsGetRecommendation`이 `statsGetDashboard`를 호출하고, `statsGetDashboard`는 내부에서 스킬별 `reviewGetQueue`를 호출한다. `/next` 커맨드가 `stats.getRecommendation`과 `review.getQueue`를 모두 호출하면, 복습 대기열이 2회 이상 계산된다. 캐싱이 없으므로 동일한 파일 읽기/파싱이 반복된다.
- **근거**: 함수형 호출이므로 중간 결과를 공유할 방법이 없다.
- **수정 방향**: dashboard 결과를 짧은 TTL(요청 단위)로 캐싱하거나, 공유 가능한 중간 데이터 구조를 도입한다.

### [S4-010] 에러가 Envelope로 래핑되지 않고 raw throw — 심각도: MEDIUM

- **현재 코드**: 모든 도구 파일의 `throw new Error(...)` 구문:
  - `mcp/src/tools/context.ts:63` `throw new Error("mode=skill requires skill")`
  - `mcp/src/tools/context.ts:66` `throw new Error("mode=project requires projectPath")`
  - `mcp/src/tools/session.ts:63` `throw new Error("skill is required for skill mode")`
  - `mcp/src/tools/session.ts:134` `throw new Error("sourceDir not found")`
  - `mcp/src/tools/review.ts:129` `throw new Error("skill is required in skill mode")`
  - `mcp/src/tools/progress.ts:216` `throw new Error("sourceDir not found")`
  - `mcp/src/tools/progress.ts:230` `throw new Error("sourceDir not found")`

  `index.ts`의 tool handler에도 try/catch가 없다 (`mcp/src/index.ts:175-177`):
  ```typescript
  server.tool(tool.name, tool.description, tool.schema, async (args) => {
    const parsed = tool.schema.parse(args);
    const payload = await tool.run(parsed);  // 에러 시 unhandled
  ```
- **설계 문서**: `plan/mcp.md` Section 5.3 (line 215-227):
  > "모든 도구 응답은 아래 envelope를 사용합니다"
- **문제**: 유효성 검증 실패, 누락된 필수 입력, 파일 시스템 에러 시 raw Error가 throw된다. MCP SDK가 내부적으로 catch하여 에러 응답을 보낼 수 있지만, Envelope 구조가 아닌 SDK 기본 에러 포맷이 된다. 또한 Zod의 `schema.parse(args)` 실패 시에도 `ZodError`가 raw로 전파된다.
- **근거**: 클라이언트(LLM)가 일관된 응답 구조를 기대하나, 에러 시 다른 형태의 응답을 받게 된다.
- **수정 방향**: `index.ts`의 tool handler에 try/catch를 추가하여, 에러를 `{ isError: true, content: [{ type: "text", text: JSON.stringify(errorEnvelope) }] }` 형태로 반환한다.

### [S4-011] review.getQueue의 lastReview 필드에 nextReview 값 할당 — 의미론적 오류 — 심각도: MEDIUM

- **현재 코드**: `mcp/src/tools/review.ts:300-302`
  ```typescript
  items.push({
    // ...
    lastReview: concept.nextReview,  // nextReview를 lastReview로 할당
    overdueDays,
  });
  ```
- **설계 문서**: `plan/mcp.md` Section 5.3 review.getQueue 출력 스키마 (line 325-344):
  ```json
  {
    "lastReview": "2026-02-16",
  }
  ```
- **문제**: `lastReview` 필드에 `concept.nextReview` 값을 할당한다. `nextReview`는 "다음 복습 예정일"이고 `lastReview`는 "마지막 복습일"이다. `ReviewConcept` 타입(`domain.ts:77-83`)에는 `lastReview` 필드가 없고 `nextReview`만 있으므로, 실제 마지막 복습일 정보가 유실된다. LLM이 이 데이터를 기반으로 "마지막으로 복습한 날이 ..."라고 설명하면 잘못된 정보를 제공하게 된다.
- **근거**: 설계 문서의 예시에서 `lastReview: "2026-02-16"`은 과거 날짜이므로 마지막 복습일을 의미하나, `nextReview`는 미래 또는 현재 날짜일 수 있다.
- **수정 방향**: `ReviewConcept`에 `lastReviewDate` 필드를 추가하여 `reviewRecordResult` 호출 시 기록하거나, 필드명을 `nextReview`로 변경하여 실제 의미와 일치시킨다.

### [S4-012] reviewGetQueue와 discoverSkillDirs의 스킬 탐색 로직 불일치 — 심각도: MEDIUM

- **현재 코드**: `mcp/src/tools/review.ts:249-256`
  ```typescript
  } else {
    const skillDirs = await listFiles(context.docsDir, { maxDepth: 1 });
    const names = [...new Set(skillDirs.map((file) => path.basename(path.dirname(file))))];
    for (const name of names) {
      if (name && name !== "docs") {
        dirs.push({ skill: name, dir: path.join(context.docsDir, name) });
      }
    }
  }
  ```
  vs `mcp/src/tools/stats.ts:30-39`
  ```typescript
  async function discoverSkillDirs(docsDir: string): Promise<string[]> {
    const files = await listFiles(docsDir, { extension: "plan.md", maxDepth: 2 });
    const dirs = new Set<string>();
    for (const file of files) {
      if (path.basename(file) === "plan.md" && path.dirname(file) !== docsDir) {
        dirs.add(path.dirname(file));
      }
    }
    return [...dirs].sort();
  }
  ```
- **설계 문서**: 별도 언급 없으나, 두 도구 모두 "전체 스킬" 탐색이 필요.
- **문제**:
  1. `review.ts`는 파일 부모 디렉토리의 basename으로 스킬을 추론하고 `name !== "docs"` 하드코딩 필터를 사용. `docsDir`이 커스텀 경로일 때 basename이 `"docs"`가 아니면 `master-plan.md` 등 루트 파일이 잘못된 스킬로 인식될 수 있다.
  2. `stats.ts`는 `plan.md` 존재를 기준으로 스킬 디렉토리를 탐색하여 더 견고하다.
  3. 두 도구가 같은 "전체 스킬 목록"을 다른 로직으로 산출하므로, 결과가 불일치할 수 있다.
- **근거**: `reviewGetQueue`는 `stats.getDashboard`에서 호출되므로, 두 탐색 로직이 다른 스킬 집합을 반환하면 대시보드와 복습 대기열의 스킬 목록이 일치하지 않는다.
- **수정 방향**: `discoverSkillDirs`를 공통 유틸로 추출하여 `review.ts`와 `stats.ts`에서 공유한다.

### [S4-013] progressGetModuleMap/getCoverageMap의 makeEnvelope에 clock 미전달 (undefined) — 심각도: LOW

- **현재 코드**: `mcp/src/tools/progress.ts:220`
  ```typescript
  return makeEnvelope(value, undefined, cacheMeta);
  ```
  그리고 `mcp/src/tools/progress.ts:274`:
  ```typescript
  return makeEnvelope(
    { covered: [...covered].sort(), ... },
    undefined,
    cacheMeta,
  );
  ```
- **설계 문서**: `plan/mcp.md` Section 5.3 — Envelope의 `generatedAt` 필드
- **문제**: `makeEnvelope`의 두 번째 인자가 `clock`인데 `undefined`를 전달하여 `systemClock`이 기본값으로 사용된다. 동작에는 문제가 없지만, Clock 주입 리팩터링 시 이 호출들도 함께 수정해야 한다.
- **근거**: 코드 일관성 이슈. `context.ts:106`의 `makeEnvelope({ context })`와 같이 clock을 생략하는 경우(기본값 사용)와, 명시적으로 `undefined`를 전달하는 경우가 혼재.
- **수정 방향**: Clock 주입 리팩터링 시 모든 `makeEnvelope` 호출에 clock을 일관되게 전달한다.

### [S4-014] context.resolve 출력 스키마에 추가 필드 — 설계 문서 미반영 — 심각도: LOW

- **현재 코드**: `mcp/src/types/contracts.ts:31-44` — `ResolvedContext` 타입
  ```typescript
  export interface ResolvedContext {
    mode: ContextMode;
    studyRoot: string;        // 설계 문서에 없음
    docsDir: string;
    refDir: string;
    skillsDir: string;
    studyLogsDir: string;     // 설계 문서에 없음
    skill?: string;
    topic?: string;
    projectPath?: string;
    skillDocsDir?: string;    // 설계 문서에 없음
    studyDir?: string;
    sourceDir?: string;
  }
  ```
- **설계 문서**: `plan/mcp.md` Section 5.3 context.resolve 출력 (line 208):
  ```
  { context: { mode, skill?, topic?, projectPath?, docsDir, studyDir?, sourceDir?, refDir, skillsDir } }
  ```
- **문제**: `studyRoot`, `studyLogsDir`, `skillDocsDir`가 설계 문서에 없지만 구현에 존재한다. 역방향 갭(구현에서 빠진 것)은 아니고 확장이므로 호환성 문제는 없지만, 문서와 코드의 일관성이 떨어진다.
- **근거**: `studyLogsDir`은 `daily.ts`에서 필수이고, `studyRoot`는 `config.ts`에서 사용. 실제로 필요한 필드이므로 설계 문서가 누락된 것.
- **수정 방향**: 설계 문서를 구현에 맞게 업데이트한다.

### [S4-015] review.getQueue: meta 파일 없는 스킬의 토픽을 무조건 대기열에 추가 — 심각도: LOW

- **현재 코드**: `mcp/src/tools/review.ts:265-280`
  ```typescript
  if (metaFiles.length === 0) {
    const topicFiles = (await listFiles(dir, { extension: ".md", maxDepth: 1 })).filter(
      (file) => !file.endsWith("plan.md") && !file.endsWith("-quiz.md") && !file.endsWith("-meta.md"),
    );
    for (const topicFile of topicFiles) {
      items.push({
        skill,
        topic: path.basename(topicFile, ".md"),
        concept: "핵심 개념",
        level: "L1",
        streak: 0,
        overdueDays: 0,
      });
      totalActive += 1;
    }
    continue;
  }
  ```
- **설계 문서**: `plan/mcp.md` Section 5.3 review.getQueue — "오늘 복습 대기 항목 (spaced repetition 계산 완료)"
- **문제**: meta 파일이 없는 스킬의 모든 토픽을 `overdueDays: 0`으로 무조건 대기열에 넣는다. 이는 학습은 했으나 아직 한 번도 복습을 시작하지 않은 토픽이다. 대시보드에 "복습 대기"로 표시되어, 실제 overdue인 항목과 첫 복습 대상이 구분되지 않는다.
- **근거**: `/review` 설계에서는 "정리" 시에만 meta를 저장하므로, 이 경우는 아직 복습을 시작하지 않은 토픽에 해당한다.
- **수정 방향**: `ReviewQueueItem`에 `firstReview?: boolean` 플래그를 추가하여 첫 복습 대상을 구분하거나, 별도 배열로 분리한다.

### [S4-016] config.get과 context.resolve의 경로 해석 이중화 — 심각도: LOW

- **현재 코드**:
  - `mcp/src/tools/config.ts:24-33` — `configGet`이 `loadConfig()` + `overrides` Map으로 경로 반환
  - `mcp/src/tools/context.ts:58-97` — `resolveContextData`가 `loadConfig()` + 입력 context로 경로 반환
- **설계 문서**: `plan/mcp.md` Section 5.3:
  - `config.get`: "모든 커맨드의 경로 해결"
  - `context.resolve`: "경로 정규화/검증"
- **문제**: 경로 해석 경로가 두 가지 존재한다. `config.get`은 overrides를 적용하지만 `context.resolve`는 참조하지 않는다. 실제로 모든 도구가 `context.resolve`를 사용하므로 `config.get`의 overrides는 사실상 사용되지 않는다.
- **근거**: S4-006과 연관. `config.set`/`config.get`의 override 메커니즘이 `context.resolve`와 분리되어 있다.
- **수정 방향**: S4-006의 overrides 제거와 함께, 경로 해석을 `context.resolve`로 단일화한다. `config.get`은 현재 환경 변수 기반 설정을 읽기 전용으로 반환.

### [S4-017] progressGetCoverageMap의 refs 디렉토리 변경 미감지 — 심각도: LOW

- **현재 코드**: `mcp/src/tools/progress.ts:239-241`
  ```typescript
  const { value: moduleMap, cacheMeta } = await getCachedModuleMap(sourceDir);
  const refFiles = await listFiles(refsDir, { extension: ".md", maxDepth: 5 });
  const refTexts = await Promise.all(refFiles.map((file) => readText(file)));
  ```
- **설계 문서**: `plan/mcp.md` Section 5.3 캐시 키/무효화 규칙 (line 396-406)
  > "캐시 키: `hash(realpath(sourceDir), gitHead, fileCount, maxMtime, parserVersion)`"
- **문제**: `getCachedModuleMap`은 `sourceDir` 기반 캐시를 사용하지만, `progressGetCoverageMap`은 추가로 `refsDir`의 파일을 읽어 매칭한다. coverage 결과 자체는 캐시되지 않으며, refs 디렉토리의 변경을 감지하는 캐시 키도 없다. refs 파일이 변경되어도 moduleMap 캐시가 유효하면 새 coverage를 매번 재계산한다.
- **근거**: 현재 규모에서는 refs 파일 수가 적어 성능 영향은 미미하지만, 캐시 설계의 일관성 문제.
- **수정 방향**: `progressGetCoverageMap`에도 별도 캐시를 추가하고, 캐시 키에 refs 디렉토리의 snapshot도 포함한다.

### [S4-018] progressUpdateCheckbox의 부분 문자열 매칭 — 오매칭 가능성 — 심각도: LOW

- **현재 코드**: `mcp/src/tools/progress.ts:105`
  ```typescript
  if (!match[3].toLowerCase().includes(step.trim().toLowerCase())) {
    continue;
  }
  ```
- **설계 문서**: 별도 언급 없음
- **문제**: step 매칭이 `includes()`를 사용한다. step이 "소스 파일"이면 "소스 파일 읽기"와 "소스 파일 분석" 모두 매칭된다. 첫 번째 매칭에서 return하므로, 의도하지 않은 step의 체크박스가 변경될 수 있다.
- **근거**: 현재 plan.md의 step 이름들이 충분히 구별적이면 실질적 문제가 없지만, 향후 유사한 이름의 step이 추가되면 버그가 된다.
- **수정 방향**: `includes()` 대신 step 텍스트의 전체 비교 또는 `startsWith()` + 경계 체크를 사용한다.

## Tool별 설계-구현 갭 매트릭스

| Tool | 설계 스키마 | 구현 상태 | 갭 |
|------|-----------|----------|-----|
| `context.resolve` | `{ mode, skill?, ... }` → `{ context: {...} }` | 구현됨. `studyRoot`, `studyLogsDir`, `skillDocsDir` 추가 | LOW: 출력 확장, 설계 문서 미반영 (S4-014) |
| `config.get` | `—` → `{ studyRoot, docsDir, refDir, skillsDir }` | 구현됨. `studyLogsDir` 추가, mutable overrides 적용 | **HIGH**: 전역 상태 위반 (S4-006) |
| `config.set` | `{ context, key, value }` → `{ ok }` | 구현됨. module-level Map에 저장 | **HIGH**: 설계 금지된 전역 상태 (S4-006) |
| `progress.getPlan` | `{ context, skill? }` → PlanData | 구현됨 | NONE |
| `progress.getNextTopic` | `{ context, skill? }` → `{ topic, step, phase, ... }` | 구현됨 | NONE |
| `progress.updateCheckbox` | `{ context, skill?, topic, step, done }` → `{ ok }` | 구현됨. `updated`, `filePath` 추가 | NONE: 유용한 확장 |
| `progress.getModuleMap` | `{ context, skill?, sourceDir? }` → ModuleMapResult + cache | 구현됨, 캐시 적용 | LOW: Envelope clock 미전달 (S4-013) |
| `progress.getCoverageMap` | `{ context, skill?, sourceDir?, refsDir? }` → CoverageMapResult + cache | 구현됨, moduleMap만 캐싱 | LOW: refs 변경 미감지 (S4-017) |
| `session.getResumePoint` | `{ context, skill?, topic }` → SessionResumePoint | 구현됨 | NONE |
| `session.appendLog` | `{ context, skill?, topic, content }` → `{ ok, filePath }` | 구현됨 | **HIGH**: Clock 미주입 (S4-001) |
| `session.getSourcePaths` | `{ context, skill? }` → `{ sourceDir, docsDir, files[] }` + cache | 구현됨, 캐시 적용 | NONE |
| `review.getQueue` | `{ context, skill? }` → `{ today, items[], graduated, totalActive }` | 구현됨 | **HIGH**: Clock 미주입 (S4-003), lastReview=nextReview (S4-011) |
| `review.recordResult` | `{ context, ..., score, attempt }` → `{ nextReviewDate, streak, level }` | 구현됨. `graduated` 추가 | **HIGH**: Clock 미주입 (S4-002) |
| `review.getMeta` | `{ context, skill?, topic }` → ReviewMeta | 구현됨 | NONE |
| `review.saveMeta` | `{ context, skill?, topic, meta }` → `{ ok }` | 구현됨. `filePath` 추가 | NONE: 유용한 확장 |
| `daily.getStatus` | `{ context }` → DailyStatus | 구현됨 | **HIGH**: Clock 7곳 미주입 (S4-004) |
| `daily.logPlan` | `{ context, plan }` → `{ ok, logPath }` | 구현됨 | **HIGH**: Clock 미주입 (S4-004) |
| `daily.logDone` | `{ context, report }` → `{ ok, achievementRate }` | 구현됨 | **HIGH**: Clock 미주입 (S4-004) |
| `daily.finalize` | `{ context }` → `{ ok }` | 구현됨 | **HIGH**: Clock 미주입 (S4-004) |
| `stats.getDashboard` | `{ context }` → DashboardData | 구현됨 | **MEDIUM**: N+1 패턴 (S4-007, S4-008) |
| `stats.getRecommendation` | `{ context }` → `{ items[] }` | 구현됨 | **MEDIUM**: dashboard 전체 재호출 (S4-009) |

## 수정 우선순위

1. **[S4-001~004] Clock 주입 일관 적용** (HIGH, 4건): `session.ts`, `review.ts`, `daily.ts`의 11곳 `new Date()` 호출을 Clock 주입으로 교체. 테스트 인프라의 전제 조건이며, Layer 3/3.5/4 테스트 작성이 이 수정에 의존한다.
2. **[S4-006] config.ts mutable overrides 제거** (HIGH): 설계 원칙 "전역 mutable 경로 상태 금지"에 정면 위배. `config.set` 제거 또는 context 기반 격리로 전환.
3. **[S4-010] index.ts에 에러 Envelope 래핑 추가** (MEDIUM): try/catch로 에러를 일관된 응답 구조로 변환.
4. **[S4-011] review.getQueue lastReview 필드 수정** (MEDIUM): 의미론적 오류. LLM이 잘못된 날짜를 기반으로 판단할 위험.
5. **[S4-012] 스킬 탐색 로직 공통화** (MEDIUM): `discoverSkillDirs`를 공유 유틸로 추출하여 `review.ts`와 `stats.ts`의 불일치 제거.
6. **[S4-007~009] N+1 쿼리 및 중복 계산 최적화** (MEDIUM): `Promise.all` 병렬화 + 일괄 조회 도입.
7. **[S4-005] MemoryCache에 Clock 주입** (MEDIUM): Clock 리팩터링과 함께 처리.
8. **[S4-013~018] 기타 개선** (LOW): 문서 동기화, 캐시 완성도, 부분 매칭 정확성 개선.
