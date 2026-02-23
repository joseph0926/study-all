# Scope 2: 타입 안전성 & 빌드 피드백

> 검토일: 2026-02-23
> 검토 대상: `mcp/tsconfig.json` 및 전체 `mcp/src/`, `mcp/test/` 소스 코드
> 방법: `tsc --noEmit` 실행 불가하여 전체 코드 정적 분석 기반 추정

---

## 요약

tsconfig의 `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` 세 옵션 조합은 최고 수준의 타입 안전성을 제공하나, 현재 코드에서 이 세 옵션을 충족시키지 못하는 패턴이 체계적으로 발생한다. 총 **약 30+개의 타입 에러**가 3개 카테고리로 분류되며, 대부분 반복되는 패턴이므로 일관된 수정 전략으로 해결 가능하다.

---

## 에러 분류

### 카테고리 A: `noUncheckedIndexedAccess` — 배열/객체 인덱스 접근 (약 22개 에러)

`noUncheckedIndexedAccess: true`로 인해, `arr[i]`는 `T | undefined`로 추론된다. TypeScript는 `if (arr.length >= 3)` 같은 length guard를 인덱스 접근에 대한 narrowing으로 인식하지 못한다.

---

#### A-1. 정규식 match 결과 인덱스 접근 (12개)

정규식 `match()`의 반환값에서 캡처 그룹 `match[1]`, `match[2]` 등을 접근할 때, `noUncheckedIndexedAccess`에 의해 `string | undefined`가 된다.

**에러 메시지**: `Argument of type 'string | undefined' is not assignable to parameter of type 'string'.`

**해당 파일**:

| # | 파일:라인 | 코드 | 설명 |
|---|----------|------|------|
| 1 | `src/parsers/meta-parser.ts:39` | `cols[0].toLowerCase()` | `parseTableLine` 결과 인덱스 접근 |
| 2 | `src/parsers/meta-parser.ts:44` | `name: cols[0]` | `string \| undefined` -> `string` 할당 |
| 3 | `src/parsers/meta-parser.ts:45` | `normalizeLevel(cols[1])` | 함수에 `string \| undefined` 전달 |
| 4 | `src/parsers/meta-parser.ts:46` | `Number(cols[2])` | 사소 (Number는 undefined 수용하지만 의도 불명확) |
| 5 | `src/parsers/meta-parser.ts:47` | `cols[3]` | `string \| undefined` -> `string` |
| 6 | `src/parsers/meta-parser.ts:48` | `parseBoolean(cols[4])` | `string \| undefined` -> `string` |
| 7 | `src/parsers/meta-parser.ts:49` | `Number(cols[5])` | 동일 |
| 8 | `src/parsers/meta-parser.ts:58` | `match[1].trim()` | regex match 캡처 그룹 |
| 9 | `src/parsers/meta-parser.ts:59` | `normalizeLevel(match[2])` | 동일 |
| 10 | `src/parsers/meta-parser.ts:61` | `match[4].trim()` | 동일 |
| 11 | `src/parsers/meta-parser.ts:62` | `match[5].toLowerCase()` | 동일 |
| 12 | `src/parsers/session-parser.ts:15` | `match[1]` | `date: match[1]` — `string \| undefined` |

**원인 분석**: 정규식이 매칭되었으면 캡처 그룹은 반드시 존재하지만, TypeScript의 `RegExpMatchArray` 타입은 인덱스 접근에 대해 `string | undefined`를 반환한다.

**수정 패턴**:

```typescript
// Before (에러)
const match = line.match(/^-\s*concept\s*:\s*(.+?),\s*level\s*:\s*(L[1-4])/i);
if (!match) continue;
concepts.push({
  name: match[1].trim(),        // ERROR: string | undefined
  level: normalizeLevel(match[2]),  // ERROR
});

// After — 방법 1: non-null assertion (match가 성공했으면 캡처 그룹 존재 보장)
if (!match) continue;
concepts.push({
  name: match[1]!.trim(),
  level: normalizeLevel(match[2]!),
});

// After — 방법 2: 구조 분해 + guard (더 방어적)
const [, rawName, rawLevel] = match;
if (!rawName || !rawLevel) continue;
concepts.push({
  name: rawName.trim(),
  level: normalizeLevel(rawLevel),
});
```

---

#### A-2. 배열 split/filter 결과 인덱스 접근 (4개)

**해당 파일**:

| # | 파일:라인 | 코드 |
|---|----------|------|
| 13 | `src/parsers/plan-parser.ts:49-50` | `mapStatus(cols[0])`, `cols[1]` |
| 14 | `src/parsers/plan-parser.ts:123` | `topicMatch[2].trim()` |
| 15 | `src/parsers/plan-parser.ts:126` | `cleanTopicName.split(...)[0]` |
| 16 | `src/parsers/plan-parser.ts:128` | `topicMatch[1]` |

`plan-parser.ts:49-52`의 경우, `cols.length < 3` 체크 후에도 `cols[0]`는 `string | undefined`로 추론된다.

**수정 패턴**:

```typescript
// Before
if (cols.length < 3) continue;
out.push({
  status: mapStatus(cols[0]),     // ERROR
  module: cols[1],                // ERROR
  target: cols.slice(2).join(" | "),
});

// After: 구조 분해 + guard
const [rawStatus, rawModule, ...rest] = cols;
if (!rawStatus || !rawModule) continue;
out.push({
  status: mapStatus(rawStatus),
  module: rawModule,
  target: rest.join(" | "),
});
```

---

#### A-3. for-index 루프 내 배열 인덱스 접근 (6개)

`for (let i = 0; i < arr.length; i++)` 패턴에서 `arr[i]`가 `T | undefined`로 추론.

**해당 파일**:

| # | 파일:라인 | 코드 |
|---|----------|------|
| 17 | `src/tools/progress.ts:102` | `const line = lines[i]` (루프 내) |
| 18 | `src/tools/progress.ts:105` | `match[3].toLowerCase()` |
| 19 | `src/tools/progress.ts:109` | `match[1]`, `match[3]` |
| 20 | `src/tools/progress.ts:180` | `lines[i].startsWith(...)`, `lines[i].toLowerCase()` |
| 21 | `src/tools/progress.ts:250,255` | `refFiles[i]`, `refTexts[i]` (첫 번째 루프) |
| 22 | `src/tools/progress.ts:267,268` | `refFiles[i]`, `refTexts[i]` (두 번째 루프) |
| 23 | `src/parsers/session-parser.ts:25-28` | `indices[i].idx`, `indices[i].date`, `indices[i+1].idx` |
| 24 | `src/tools/daily.ts:77` | `lines[i].startsWith("## ")` |

**수정 패턴**:

```typescript
// Before
for (let i = 0; i < refFiles.length; i += 1) {
  const fileName = path.basename(refFiles[i]).toLowerCase();  // ERROR
  if (refTexts[i].toLowerCase().includes(moduleName)) { ... } // ERROR
}

// After: 지역 변수 + early guard
for (let i = 0; i < refFiles.length; i += 1) {
  const file = refFiles[i];
  const text = refTexts[i];
  if (!file || !text) continue;
  const fileName = path.basename(file).toLowerCase();
  if (text.toLowerCase().includes(moduleName)) { ... }
}
```

---

### 카테고리 B: `exactOptionalPropertyTypes` 충돌 — optional 프로퍼티에 `undefined` 직접 할당 (약 8-10개 에러)

`exactOptionalPropertyTypes: true`에서 `foo?: string`으로 선언된 프로퍼티에 `undefined`를 명시적으로 할당하면 에러가 발생한다. `foo?: string`은 "프로퍼티 자체가 없을 수 있지만, 있으면 반드시 `string`"이라는 의미이다.

**에러 메시지**: `Type 'undefined' is not assignable to type 'string'. Types of property 'xxx' are incompatible.`

**해당 파일**:

| # | 파일:라인 | 프로퍼티 | 코드 패턴 |
|---|----------|---------|----------|
| 1 | `src/config.ts:39` | `ResolvedContext.skillDocsDir` | `skillDocsDir: context.skillDocsDir ? path.resolve(...) : undefined` |
| 2 | `src/config.ts:40` | `ResolvedContext.studyDir` | `studyDir: context.studyDir ? path.resolve(...) : undefined` |
| 3 | `src/config.ts:41` | `ResolvedContext.sourceDir` | `sourceDir: context.sourceDir ? path.resolve(...) : undefined` |
| 4 | `src/config.ts:42` | `ResolvedContext.projectPath` | `projectPath: context.projectPath ? path.resolve(...) : undefined` |
| 5 | `src/tools/context.ts:69` | `ResolvedContext.skill` | `const skill = parsed.skill ? normalizeSkill(...) : undefined` |
| 6 | `src/tools/context.ts:73` | `ResolvedContext.skillDocsDir` | `const skillDocsDir = skill ? path.join(...) : undefined` |
| 7 | `src/tools/context.ts:74` | `ResolvedContext.projectPath` | `const projectPath = parsed.projectPath ? path.resolve(...) : undefined` |
| 8 | `src/tools/context.ts:75-80` | `ResolvedContext.studyDir` | 조건부 `undefined` |
| 9 | `src/tools/daily.ts:166` | `DailyStatus.lastSession` | `lastSession: (...) ? dateOnly(...) : undefined` |
| 10 | `src/tools/stats.ts:99` | `DashboardSkill.lastActivity` | `lastActivity` 변수가 `string \| undefined` |

**원인 분석**:

`resolveContextData` (context.ts)가 반환하는 `ResolvedContext` 객체에서 여러 optional 프로퍼티를 조건부로 `undefined`에 할당한다. 이 값들이 `withResolvedPaths` (config.ts)에서 다시 삼항 연산자를 통해 `undefined`로 매핑된다. 두 함수 모두 같은 패턴으로 에러를 발생시킨다.

**수정 패턴**:

```typescript
// 수정 방향 A: 타입 선언에 | undefined 추가 (권장)
// types/contracts.ts
export interface ResolvedContext {
  mode: ContextMode;
  studyRoot: string;
  docsDir: string;
  refDir: string;
  skillsDir: string;
  studyLogsDir: string;
  skill?: string | undefined;        // 변경
  topic?: string | undefined;        // 변경
  projectPath?: string | undefined;  // 변경
  skillDocsDir?: string | undefined; // 변경
  studyDir?: string | undefined;     // 변경
  sourceDir?: string | undefined;    // 변경
}

// types/domain.ts
export interface DailyStatus {
  // ...
  lastSession?: string | undefined;  // 변경
}

export interface DashboardSkill {
  // ...
  lastActivity?: string | undefined; // 변경
}

// 수정 방향 B: 할당 코드에서 undefined 프로퍼티 제거 (조건부 스프레드)
return {
  ...baseResult,
  ...(skillDocsDir != null && { skillDocsDir }),
  ...(studyDir != null && { studyDir }),
  ...(sourceDir != null && { sourceDir }),
  ...(projectPath != null && { projectPath }),
};
```

**판단**: 이 프로젝트에서 optional 프로퍼티들은 모두 "값이 없을 수 있다"는 의미이므로, **수정 방향 A** (`?: T | undefined`)가 적합하다. `resolveContextData`와 `withResolvedPaths`가 같은 타입을 조작하므로 타입 선언 한 곳만 수정하면 두 곳 모두 해결된다.

참고로, 다른 optional 프로퍼티도 동일 패턴이 잠재적으로 적용됨:

| 타입 | 프로퍼티 | 현재 위험 여부 |
|------|---------|-------------|
| `PlanTopic.docsFile` | `?: string` | `plan-parser.ts:127`에서 선언 시 프로퍼티 자체를 생략하므로 현재는 안전 |
| `PlanPhase.description` | `?: string` | 현재 할당 코드 없으므로 안전 |
| `SessionResumePoint.lastStep` | `?: string` | `session-parser.ts:91`에서 `completedSteps[...] ?? pendingSteps[0]`가 `string \| undefined` |
| `SessionResumePoint.lastDate` | `?: string` | `session-parser.ts:96`에서 `last.date`는 항상 `string` — 안전 |
| `ReviewQueueItem.lastReview` | `?: string` | `review.ts:301`에서 `concept.nextReview`가 항상 `string` — 안전 |
| `CacheMeta.invalidatedReason` | `?: string` | 할당 시 값을 제공하거나 프로퍼티 자체 생략 — 안전 |
| `Envelope.cache` | `?: CacheMeta` | `envelope.ts:14`에서 `if (cache)` 후에만 할당 — 안전 |

`SessionResumePoint.lastStep`은 `noUncheckedIndexedAccess`로 인해 `string | undefined`가 되므로 `exactOptionalPropertyTypes` 에러도 함께 발생한다. 이 역시 `?: string | undefined`로 변경 필요.

---

### 카테고리 C: 테스트 파일의 string literal 타입 widening (1-5개 에러)

**심각도: Minor**

**에러 메시지**: `Type 'string' is not assignable to type '"skill" | "project"'.`

**해당 파일**:

| # | 파일:라인 | 코드 |
|---|----------|------|
| 1 | `test/tools/daily.test.ts:12` | `const baseCtx = { context: { mode: "skill", skill: "react" as const } }` |

`daily.test.ts`에서 `baseCtx` 객체를 `const`로 선언하고 여러 함수에 전달한다. `mode: "skill"`은 변수에 할당되면서 `string`으로 widened된다. 반면 `skill: "react" as const`는 `as const`로 리터럴 타입을 유지한다.

주목할 점: `mode`에는 `as const`가 빠져 있다. 이것이 에러의 원인이다.

다른 테스트 파일 (`progress.test.ts`, `session.test.ts`, `review.test.ts`, `stats.test.ts`)에서는 인라인 객체 리터럴을 직접 함수 인자로 전달하므로, TypeScript가 contextual typing으로 `mode: "skill"`을 `"skill"` 리터럴로 추론한다. 따라서 에러가 발생하지 않는다.

`daily.test.ts`만 변수에 먼저 할당하고 재사용하는 패턴이어서 widening이 발생한다.

**수정 패턴**:

```typescript
// Before
const baseCtx = { context: { mode: "skill", skill: "react" as const } };

// After — 방법 A: 객체 전체에 as const (간결)
const baseCtx = { context: { mode: "skill", skill: "react" } } as const;

// After — 방법 B: mode에도 as const 추가 (최소 변경)
const baseCtx = { context: { mode: "skill" as const, skill: "react" as const } };

// After — 방법 C: satisfies로 타입 검증 (가장 안전)
const baseCtx = {
  context: { mode: "skill" as const, skill: "react" },
} satisfies { context: { mode: "skill" | "project"; skill?: string } };
```

**권장**: 방법 A (`as const`)가 가장 간결하고 일관적이다.

---

## tsconfig 적절성 평가

### 현재 설정

```jsonc
{
  "strict": true,                       // 업계 표준, 유지 필수
  "noUncheckedIndexedAccess": true,      // 배열 파서 코드에서 실제 버그 방지 효과 높음
  "exactOptionalPropertyTypes": true     // 의도 명확화에 유용하나 적용 비용 높음
}
```

### 옵션별 평가

| 옵션 | 평가 | 이유 |
|------|------|------|
| `strict` | **유지** (필수) | TypeScript 프로젝트의 기본 요구사항 |
| `noUncheckedIndexedAccess` | **유지** (강력 권장) | 이 프로젝트는 마크다운 파서 중심이라 `split()`, `match()`, 인덱스 루프가 빈번함. 런타임 에러를 컴파일 타임에 잡는 실질적 가치가 있음 |
| `exactOptionalPropertyTypes` | **유지** (조건부) | 유지할 경우 `?: T | undefined` 컨벤션을 먼저 확립해야 함. 확립 없이 유지하면 의미 없는 타입 에러만 늘어남 |

### `exactOptionalPropertyTypes` 유지 결정을 위한 체크리스트

이 옵션의 유지가 정당화되려면:

1. **`?: T`와 `?: T | undefined`의 구분이 비즈니스 로직에 의미 있는가?**
   - `ResolvedContext`의 optional 프로퍼티들: 프로퍼티 부재와 `undefined` 값의 구분이 필요한 곳이 없다. 모두 `== null` 체크로 사용됨.
   - `Envelope.cache`: `if (envelope.cache)` 패턴만 사용됨. 구분 불필요.
   - **결론**: 현재 코드에서는 구분 필요성이 낮다.

2. **JSON 직렬화에서 차이가 중요한가?**
   - `JSON.stringify({ foo: undefined })`는 `foo`를 생략한다. `{}` 결과와 동일.
   - MCP 응답은 `JSON.stringify(payload, null, 2)`로 직렬화됨 (index.ts:182). optional 프로퍼티에 `undefined`가 있어도 JSON 출력에는 차이 없다.
   - **결론**: 중요하지 않다.

3. **향후 확장 시 `in` 연산자 narrowing이 필요할 가능성이 있는가?**
   - 현재 `in` 연산자 사용 없음. 모든 optional 프로퍼티는 `?.` 또는 `?? ` 패턴으로 접근.
   - **결론**: 현재는 불필요하나, 타입 정밀도를 위해 유지해도 무방.

**최종 권장**: 유지하되, `types/domain.ts`와 `types/contracts.ts`에서 모든 `?: T` 프로퍼티를 `?: T | undefined`로 일괄 변경한다. 이 프로젝트에서 "프로퍼티 부재"와 "undefined 값"을 구분할 필요가 있는 프로퍼티는 없으므로, 일괄 변경이 안전하다.

---

## 체계적 이슈 식별

### 이슈 1: 마크다운 파서에서의 반복 패턴

`plan-parser.ts`, `meta-parser.ts`, `session-parser.ts` 세 파서 모두 동일한 패턴으로 `noUncheckedIndexedAccess` 에러를 일으킨다:

1. `line.match(regex)` 후 캡처 그룹 인덱스 접근
2. `str.split("|")` 후 결과 배열 인덱스 접근

이것은 "마크다운 테이블/패턴 파싱"이라는 도메인 특성과 TypeScript의 한계가 충돌하는 구조적 문제다. 유틸리티 함수를 도입하여 일관되게 해결할 수 있다:

```typescript
// 유틸: 안전한 regex match 헬퍼
function safeMatch(input: string, regex: RegExp): string[] | null {
  const m = input.match(regex);
  if (!m) return null;
  // 모든 캡처 그룹을 non-undefined로 보장 (빈 문자열로 대체)
  return m.map(v => v ?? "");
}
```

### 이슈 2: `resolveContextData` + `withResolvedPaths` 이중 매핑

`resolveContextData`가 `ResolvedContext`를 생성할 때 optional 프로퍼티를 `undefined`로 설정하고, `withResolvedPaths`가 같은 프로퍼티를 다시 `undefined`로 매핑한다. 두 함수 모두 같은 `exactOptionalPropertyTypes` 에러를 발생시킨다. 타입 선언 수정으로 한 번에 해결된다.

---

## 수정 우선순위

### P0 — 빌드 차단 해제 (필수)

1. **`types/contracts.ts`의 `ResolvedContext`**: 6개 optional 프로퍼티에 `| undefined` 추가
   - `skill`, `topic`, `projectPath`, `skillDocsDir`, `studyDir`, `sourceDir`
   - 이것으로 `config.ts` 4개 + `context.ts` 4개 에러 해결

2. **`types/domain.ts`의 optional 프로퍼티**: 3개에 `| undefined` 추가
   - `DailyStatus.lastSession`, `DashboardSkill.lastActivity`, `SessionResumePoint.lastStep`
   - 이것으로 `daily.ts:166`, `stats.ts:99`, `session-parser.ts:91-95` 에러 해결

3. **`plan-parser.ts:49-51`**: 구조 분해 + guard 패턴 적용
4. **`meta-parser.ts:39-49,58-62`**: 구조 분해 + guard 패턴 적용 (또는 `!` assertion)
5. **`session-parser.ts:15,25-28`**: 지역 변수 + guard 패턴 적용

### P1 — 에러 해결 (높음)

6. **`progress.ts:102,105,109,180`**: `replaceCheckboxInRange`와 `progressUpdateCheckbox` 내 인덱스 접근에 guard 추가
7. **`progress.ts:250,255,267,268`**: 두 개의 for-index 루프에 지역 변수 + guard 적용
8. **`daily.ts:55,77,143`**: `match[1]`, `lines[i]` 인덱스 접근에 guard 추가
9. **`daily.test.ts:12`**: `as const` 추가

### P2 — 일관성 정리 (낮음)

10. 프로젝트 전체 `?: T` 프로퍼티 검토 완료 확인
11. 마크다운 파서용 안전 매치 유틸리티 도입 검토
12. 테스트 헬퍼 `createTestContext()` 함수 도입으로 리터럴 타입/보일러플레이트 문제 근본 해결

### 예상 수정 규모

- **타입 선언 파일**: `types/contracts.ts`, `types/domain.ts` — 약 10줄 변경 (`| undefined` 추가)
- **파서 파일**: `plan-parser.ts`, `meta-parser.ts`, `session-parser.ts` — 약 20줄 변경 (guard 추가)
- **도구 파일**: `progress.ts`, `daily.ts`, `stats.ts` — 약 15줄 변경 (guard 추가)
- **테스트 파일**: `daily.test.ts` — 1줄 변경 (`as const`)
- **합계**: 약 45줄 변경, 0개 파일 신규 생성
