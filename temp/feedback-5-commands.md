# Scope 5: .claude/commands MCP 통합 피드백

> 검토일: 2026-02-23

## 요약

10개 커맨드 파일 모두 "MCP Execution Mode" 섹션을 상단에 선언하고 있으며, 참조된 MCP 도구 이름은 `mcp/src/index.ts`에 등록된 20개 도구와 전부 일치한다. 그러나 프롬프트 본문은 **전혀 축소되지 않았다** (합계 4,438줄, 목표 ~690줄). MCP Execution Mode 선언과 프롬프트 본문의 수동 파싱/계산 로직이 공존하는 "선언만 된 상태"이며, Phase 5(커맨드 리팩터링)는 0% 실행 상태다.

---

## 커맨드별 분석

### dashboard.md
- **MCP Execution Mode 섹션**: 있음 (7-11줄)
- **참조 MCP 도구**: `stats.getDashboard`, `context.resolve`
- **도구 존재 여부**: ✅ 전부 존재 (`stats.getDashboard` = index.ts 140줄, `context.resolve` = index.ts 26줄)
- **스키마 매칭**: ✅ `stats.getDashboard`는 `statsSchemas.getDashboard`, `context.resolve`는 `contextResolveInputSchema` — 커맨드가 스킬 단위 입력을 요구하는데, `stats.getDashboard`가 전체 집계를 반환하므로 의미적으로 적합
- **프롬프트 축소 상태**: 현재 157줄 → 목표 ~30줄 — **미달** (5.2배 초과)
- **잔존 수동 로직**: Phase 1-1 `Glob: docs/*/` 직접 스캔 (27줄), Phase 1-2 plan.md/meta.md 수동 파싱 (39-71줄), Phase 1-3 master-plan.md 수동 파싱 (73-75줄)
- **누락된 연결**: 없음 — plan/mcp.md 부록 B 매핑과 일치

### next.md
- **MCP Execution Mode 섹션**: 있음 (7-11줄)
- **참조 MCP 도구**: `stats.getRecommendation`, `review.getQueue`, `progress.getNextTopic`, `context.resolve`
- **도구 존재 여부**: ✅ 전부 존재
- **스키마 매칭**: ✅ 모두 index.ts에 등록된 스키마와 대응
- **프롬프트 축소 상태**: 현재 255줄 → 목표 ~40줄 — **미달** (6.4배 초과)
- **잔존 수동 로직**: Phase 1 전체(25-67줄) plan.md/meta.md/학습기록 수동 파싱, Phase 2(71-130줄) 우선순위 P1-P6 상세 계산 로직
- **누락된 연결**: 없음

### plan.md
- **MCP Execution Mode 섹션**: 있음 (7-11줄)
- **참조 MCP 도구**: `context.resolve`, `progress.getPlan`, `config.get`
- **도구 존재 여부**: ✅ 전부 존재
- **스키마 매칭**: ✅ `progress.getPlan`은 `progressSchemas.getPlan`으로 skill 입력을 받아 구조화된 plan 반환 — 여러 스킬 순회 호출 필요하지만 개별 호출은 가능
- **프롬프트 축소 상태**: 현재 254줄 → 목표 미명시(추정 ~50줄) — **미달** (5.1배 초과)
- **잔존 수동 로직**: Phase 1-1(24-34줄) 스킬별 plan.md 수동 파싱, Phase 1-2(36-40줄) 학습 기록 수동 파싱, Phase 1-3(42-49줄) 스킬 메타데이터 수동 읽기
- **누락된 연결**: master-plan.md 생성/갱신 전용 쓰기 도구 없음 (LLM이 Write 도구로 직접 저장해야 함)

### learn.md
- **MCP Execution Mode 섹션**: 있음 (8-12줄)
- **참조 MCP 도구**: `session.getResumePoint`, `session.getSourcePaths`, `progress.getPlan`, `session.appendLog`, `progress.updateCheckbox`
- **도구 존재 여부**: ✅ 전부 존재
- **스키마 매칭**: ✅ 모두 index.ts에 등록된 스키마와 대응. `session.getResumePoint`는 `sessionSchemas.getResumePoint`, `session.appendLog`는 `sessionSchemas.appendLog` 등
- **프롬프트 축소 상태**: 현재 639줄 → 목표 ~100줄 — **미달** (6.4배 초과)
- **잔존 수동 로직**: Phase 1.5(170-232줄) 세션 재개점 수동 파싱, Phase 2(235-273줄) ref/ 소스 탐색 수동 Grep, Phase 5-A(562-570줄) Topic-Docs Mapping 수동 등록, Phase 5-B(572-581줄) meta.md stub 수동 생성
- **누락된 연결**:
  - `context.resolve` — plan/mcp.md 부록 B에는 포함되었으나 커맨드 MCP 섹션에는 미명시
  - Topic-Docs Mapping 등록 전용 도구 (`progress.registerTopicMapping`) 없음
  - meta.md stub 초기 생성 — `review.saveMeta`가 빈 파일 생성을 지원하면 커버 가능하지만 현재 미확인

### study-skill.md
- **MCP Execution Mode 섹션**: 있음 (8-12줄)
- **참조 MCP 도구**: `progress.getModuleMap`, `progress.getCoverageMap`, `progress.getPlan`, `progress.updateCheckbox`
- **도구 존재 여부**: ✅ 전부 존재
- **스키마 매칭**: ✅ `progress.getModuleMap`은 `progressSchemas.getModuleMap`, `progress.getCoverageMap`은 `progressSchemas.getCoverageMap` 등
- **프롬프트 축소 상태**: 현재 546줄 → 목표 ~80줄 — **미달** (6.8배 초과)
- **잔존 수동 로직**: Phase 3-2(164-182줄) MODULE_MAP 수동 생성, Phase 3-4(189-203줄) COVERAGE_MAP 수동 교차 대조, Phase 4(222-420줄) plan.md 생성 전체 수동 로직 (약 200줄)
- **누락된 연결**:
  - `context.resolve` — plan/mcp.md 부록 B에는 포함되었으나 커맨드 MCP 섹션에는 미명시
  - plan.md 생성(쓰기) 전용 도구 없음

### review.md
- **MCP Execution Mode 섹션**: 있음 (8-12줄)
- **참조 MCP 도구**: `review.getQueue`, `review.getMeta`, `review.recordResult`, `review.saveMeta`
- **도구 존재 여부**: ✅ 전부 존재
- **스키마 매칭**: ✅ 모두 index.ts `reviewSchemas`의 대응 스키마와 매칭
- **프롬프트 축소 상태**: 현재 614줄 → 목표 ~80줄 — **미달** (7.7배 초과)
- **잔존 수동 로직**: Phase 2(46-67줄) 학습 기록 수동 스캔, Phase 3(71-146줄) meta 로딩/졸업 필터링/출제 순서/난이도 결정 전체 수동, Phase 6(437-546줄) quiz.md/meta.md 수동 쓰기
- **누락된 연결**:
  - `context.resolve` — plan/mcp.md 부록 B에는 포함되었으나 커맨드 MCP 섹션에는 미명시
  - quiz 파일 저장 전용 도구 (`review.saveQuiz`) 없음

### study.md
- **MCP Execution Mode 섹션**: 있음 (7-12줄)
- **참조 MCP 도구**: `daily.getStatus`, `progress.getNextTopic`, `daily.logPlan`, `daily.logDone`, `daily.finalize`, `context.resolve`, `review.getQueue`
- **도구 존재 여부**: ✅ 전부 존재
- **스키마 매칭**: ✅ `daily.getStatus`는 `dailySchemas.getStatus`, `daily.logPlan`은 `dailySchemas.logPlan` 등 — 모두 대응
- **프롬프트 축소 상태**: 현재 363줄 → 목표 ~50줄 — **미달** (7.3배 초과)
- **잔존 수동 로직**: 1단계(25-31줄) study-logs 수동 스캔/streak 계산, plan 서브커맨드(62-111줄) 로그 파일 수동 생성, done 서브커맨드(167-215줄) 달성률 수동 계산, log 서브커맨드(219-275줄) 최종 로그 수동 정리
- **누락된 연결**: `/learn`과 `/review` 세션 결과를 `/study done`으로 자동 연결하는 브리지 도구 없음 (오케스트레이션 미구현)

### project-study.md
- **MCP Execution Mode 섹션**: 있음 (8-12줄)
- **참조 MCP 도구**: `context.resolve(mode=project)`, `progress.getModuleMap`, `progress.getCoverageMap`, `progress.getNextTopic`, `progress.updateCheckbox`
- **도구 존재 여부**: ✅ 전부 존재
- **스키마 매칭**: ✅ `context.resolve`의 `contextResolveInputSchema`가 `mode` 필드를 포함하므로 `mode=project` 호출 가능
- **프롬프트 축소 상태**: 현재 481줄 → 목표 미명시(추정 ~80줄) — **미달** (6.0배 초과)
- **잔존 수동 로직**: Phase 2-4(92-109줄) MODULE_MAP 수동 생성, Phase 2-5(112-122줄) COVERAGE_MAP 수동 교차 대조, Phase 3(172-287줄) plan.md 생성 전체 수동 로직
- **누락된 연결**: plan.md 생성(쓰기) 전용 도구 없음 (`/study-skill`과 동일 이슈)

### project-learn.md
- **MCP Execution Mode 섹션**: 있음 (8-12줄)
- **참조 MCP 도구**: `context.resolve(mode=project)`, `session.getResumePoint`, `session.getSourcePaths`, `session.appendLog`, `progress.updateCheckbox`
- **도구 존재 여부**: ✅ 전부 존재
- **스키마 매칭**: ✅ 모두 대응
- **프롬프트 축소 상태**: 현재 497줄 → 목표 미명시(추정 ~100줄) — **미달** (5.0배 초과)
- **잔존 수동 로직**: Phase 1.5(66-126줄) 세션 재개점 수동 파싱, Phase 2(130-161줄) 소스 탐색 수동 Grep
- **누락된 연결**: 없음 — `/learn`과 달리 스킬 레퍼런스 보강이 없으므로 도구 셋이 적절

### project-review.md
- **MCP Execution Mode 섹션**: 있음 (8-12줄)
- **참조 MCP 도구**: `context.resolve(mode=project)`, `review.getQueue`, `review.getMeta`, `review.recordResult`, `review.saveMeta`
- **도구 존재 여부**: ✅ 전부 존재
- **스키마 매칭**: ✅ 모두 대응
- **프롬프트 축소 상태**: 현재 632줄 → 목표 미명시(추정 ~80줄) — **미달** (7.9배 초과)
- **잔존 수동 로직**: Phase 2(59-80줄) 학습 기록 수동 스캔, Phase 3(84-160줄) meta 로딩/졸업 필터링/출제 순서/난이도 결정 전체 수동, Phase 6(454-565줄) quiz.md/meta.md 수동 쓰기
- **누락된 연결**: quiz 파일 저장 전용 도구 (`review.saveQuiz`) 없음 (`/review`와 동일 이슈)

---

## 전체 마이그레이션 진행도

| 커맨드 | 줄수 | MCP 섹션 | 도구 매핑 | 프롬프트 축소 | 종합 |
|--------|------|---------|----------|-------------|------|
| dashboard.md | 157줄 (목표 ~30) | ✅ | ✅ 2/2 도구 일치 | ❌ 5.2x 초과 | 선언만 완료 |
| next.md | 255줄 (목표 ~40) | ✅ | ✅ 4/4 도구 일치 | ❌ 6.4x 초과 | 선언만 완료 |
| plan.md | 254줄 (목표 ~50) | ✅ | ✅ 3/3 도구 일치 | ❌ 5.1x 초과 | 선언만 완료 |
| learn.md | 639줄 (목표 ~100) | ✅ | ⚠️ 5/5 일치, context.resolve 미명시 | ❌ 6.4x 초과 | 선언만 완료 |
| study-skill.md | 546줄 (목표 ~80) | ✅ | ⚠️ 4/4 일치, context.resolve 미명시 | ❌ 6.8x 초과 | 선언만 완료 |
| review.md | 614줄 (목표 ~80) | ✅ | ⚠️ 4/4 일치, context.resolve 미명시 | ❌ 7.7x 초과 | 선언만 완료 |
| study.md | 363줄 (목표 ~50) | ✅ | ✅ 7/7 도구 일치 | ❌ 7.3x 초과 | 선언만 완료 |
| project-study.md | 481줄 (목표 ~80) | ✅ | ✅ 5/5 도구 일치 | ❌ 6.0x 초과 | 선언만 완료 |
| project-learn.md | 497줄 (목표 ~100) | ✅ | ✅ 5/5 도구 일치 | ❌ 5.0x 초과 | 선언만 완료 |
| project-review.md | 632줄 (목표 ~80) | ✅ | ✅ 5/5 도구 일치 | ❌ 7.9x 초과 | 선언만 완료 |
| **합계** | **4,438줄 (목표 ~690)** | **10/10** | **10/10 일치** | **0/10 축소** | **~15% (선언만)** |

**마이그레이션 단계별 진행률**:

| 단계 | 설명 | 완료율 |
|------|------|--------|
| MCP Execution Mode 섹션 추가 | 10/10 커맨드에 선언 완료 | 100% |
| 도구 이름 매핑 검증 | 모든 참조 도구가 index.ts에 존재 | 100% |
| 부록 B 동기화 | 3개 커맨드에서 context.resolve 불일치 | 70% |
| 프롬프트 수동 로직 제거 | 0/10 커맨드에서 수동 로직 잔존 | 0% |
| 프롬프트 줄 수 축소 | 0/10 커맨드가 목표 도달 | 0% |
| **종합** | | **~15%** |

---

## 발견 사항

### [S5-001] 프롬프트 본문에 MCP와 중복되는 수동 파싱/계산 로직 잔존 — 심각도: HIGH
- **문제**: 모든 10개 커맨드에서 MCP Execution Mode "규칙"이 "MCP를 단일 진실 원천으로 사용한다"고 선언하지만, 프롬프트 본문에 Glob/Read/Grep을 사용한 수동 파싱, 체크박스 카운팅, 날짜 산술, streak 계산 등의 로직이 그대로 남아있다.
- **근거**: 예) `dashboard.md` 27줄 `Glob: docs/*/` 직접 스캔 vs MCP `stats.getDashboard`가 동일 기능 제공. `review.md` 84-89줄 meta.md 수동 로딩 vs `review.getMeta`. `study.md` 25-31줄 streak 수동 계산 vs `daily.getStatus`.
- **수정 방향**: Phase 5(커맨드 리팩터링) 실행 시 각 커맨드의 데이터 수집/계산 Phase를 MCP 도구 호출 1-3줄로 대체. 리팩터링 전까지는 MCP Execution Mode 섹션에 `> NOTE: Phase 5 리팩터링 미적용. 아래 수동 로직은 MCP 전환 후 제거 예정` 마커 추가 권장.

### [S5-002] MCP 선언과 프롬프트 본문 간 LLM 혼란 위험 — 심각도: HIGH
- **문제**: MCP Execution Mode가 "MCP 응답을 사용하라"고 지시하면서, 프롬프트 본문은 "Glob으로 스캔하라", "Read로 파싱하라" 등 상충하는 지시를 포함. LLM이 둘 중 어느 경로를 따를지 비결정적.
- **근거**: 10개 커맨드 전부 해당. 특히 `/dashboard`가 가장 명확한 예시 — MCP 섹션은 `stats.getDashboard`를 단일 진실로 지정하면서 Phase 1에서 30줄+ 수동 데이터 수집을 지시.
- **수정 방향**: 두 가지 중 하나 선택 필수 — (A) 즉시 축소하여 수동 로직 제거, (B) MCP Execution Mode를 "계획(planned)" 표기로 변경하여 현재는 수동 경로가 정상임을 명시.

### [S5-003] context.resolve 참조 불일치 (learn, study-skill, review) — 심각도: LOW
- **문제**: plan/mcp.md 부록 B에서는 `/learn`, `/study-skill`, `/review`에 `context.resolve`를 포함하지만, 커맨드 파일의 MCP Execution Mode 섹션에는 미명시.
- **근거**: learn.md 8-12줄에 `session.getResumePoint` 등은 있으나 `context.resolve` 없음. plan/mcp.md 945줄에서는 `/learn`에 `context.resolve` 포함.
- **수정 방향**: (A) 3개 커맨드의 MCP 섹션 보조 호출에 `context.resolve` 추가, 또는 (B) 각 도구 호출 시 context를 인라인 전달하여 선행 resolve가 불필요하다면 부록 B에서 제거. 어느 쪽이든 동기화 필요.

### [S5-004] quiz 파일 저장 전용 MCP 도구 누락 — 심각도: MEDIUM
- **문제**: `/review`와 `/project-review`가 Phase 6에서 `-quiz.md` 파일을 생성/append하지만, index.ts에 quiz 파일 전용 저장 도구가 없다.
- **근거**: review.md Phase 6-1(441-486줄)에서 quiz.md 수동 생성. index.ts의 review 도구는 `getQueue`, `recordResult`, `getMeta`, `saveMeta` 4개만 — quiz 관련 없음.
- **수정 방향**: `review.saveQuiz` 도구를 추가하거나, `session.appendLog`를 범용화하여 quiz 파일에도 사용 가능하게 한다.

### [S5-005] Topic-Docs Mapping 등록 전용 도구 누락 — 심각도: MEDIUM
- **문제**: `/learn` Phase 5-A에서 plan.md의 Topic-Docs Mapping 테이블에 행을 추가하는 로직이 있으나, 이를 담당하는 MCP 도구가 없다.
- **근거**: learn.md 562-570줄에서 수동으로 plan.md 읽기/쓰기. `progress.updateCheckbox`는 체크박스만 담당.
- **수정 방향**: `progress.updateCheckbox`의 기능을 확장하여 Mapping 등록도 포함하거나, `progress.registerTopicMapping` 별도 도구 추가.

### [S5-006] plan.md 생성(쓰기) 도구 부재 — 심각도: MEDIUM
- **문제**: `/study-skill`과 `/project-study`에서 MODULE_MAP + COVERAGE_MAP 기반으로 plan.md 전체를 생성하는 로직(각 약 200줄)이 프롬프트에 있으나, MCP에는 plan 파싱(읽기)만 있고 생성(쓰기) 도구가 없다.
- **근거**: study-skill.md Phase 4(222-420줄), project-study.md Phase 3(172-287줄). index.ts의 `progress.getPlan`은 읽기 전용.
- **수정 방향**: plan.md 생성에는 LLM의 토픽 설명/순서 판단이 개입하므로 완전 자동화는 어렵다. (1) MCP가 MODULE_MAP/COVERAGE_MAP JSON 제공, (2) LLM이 토픽 구성 판단, (3) 범용 파일 쓰기 도구(또는 `session.appendLog` 확장)로 저장하는 방안이 현실적.

### [S5-007] /study 오케스트레이션 미구현 — 심각도: MEDIUM
- **문제**: plan/mcp.md 문제 2.3에서 "커맨드 간 수동 연결"을 MCP로 해결하겠다고 했으나, `/study` 프롬프트에 `/learn`-`/review` 세션 결과 자동 연결 메커니즘이 없다.
- **근거**: study.md의 워크플로우가 여전히 `plan -> qa -> confirm -> (사용자가 별도 /learn) -> done -> log`. MCP 도구 세트에 커맨드 간 브리지 도구 없음.
- **수정 방향**: 리팩터링 시 `/study plan`에서 `progress.getNextTopic` 결과를 계획에 포함, `/study done`에서 `session.getResumePoint`를 호출하여 학습 결과 자동 수집. 완전 자동화가 필요하면 `daily.syncFromSession` 도구 추가 검토.

### [S5-008] 프롬프트 줄 수 미축소 (4,438줄 vs 목표 ~690줄) — 심각도: INFO
- **문제**: 10개 커맨드 합계 4,438줄로, plan/mcp.md 섹션 6의 목표(~690줄, 84% 절감)에 전혀 도달하지 못했다.
- **근거**: 아래 커맨드별 현재/목표 비교 참조.
- **수정 방향**: Phase 5(커맨드 리팩터링) 실행 시 자연 해소. 축소 우선순위는 줄 수가 많고 MCP 대체율이 높은 커맨드부터 — review.md(614줄), project-review.md(632줄), learn.md(639줄) 순.

| 커맨드 | 현재 줄 수 | 목표 줄 수 | 절감 필요량 | 절감율 |
|--------|-----------|-----------|-----------|--------|
| learn.md | 639 | ~100 | 539 | 84% |
| project-review.md | 632 | ~80 | 552 | 87% |
| review.md | 614 | ~80 | 534 | 87% |
| study-skill.md | 546 | ~80 | 466 | 85% |
| project-learn.md | 497 | ~100 | 397 | 80% |
| project-study.md | 481 | ~80 | 401 | 83% |
| study.md | 363 | ~50 | 313 | 86% |
| next.md | 255 | ~40 | 215 | 84% |
| plan.md | 254 | ~50 | 204 | 80% |
| dashboard.md | 157 | ~30 | 127 | 81% |
| **합계** | **4,438** | **~690** | **3,748** | **84%** |

---

## 수정 우선순위

1. **[S5-002] 즉시 — LLM 혼란 방지**: MCP Execution Mode 섹션에 `> NOTE: Phase 5 리팩터링 미적용. 아래 수동 로직은 MCP 전환 후 제거 예정` 마커를 10개 커맨드에 추가하거나, "MCP Execution Mode (필수)" 대신 "MCP Execution Mode (계획)" 등으로 표기 변경. 이것만으로도 LLM이 현재는 수동 경로를 따라야 함을 인지할 수 있다.
2. **[S5-004, S5-005] MCP 도구 설계 보완**: `review.saveQuiz`와 `progress.registerTopicMapping` 도구를 추가 설계. Phase 5 리팩터링 전에 도구가 준비되어야 커맨드 축소 시 누락 없이 전환 가능.
3. **[S5-003] context.resolve 동기화**: learn.md, study-skill.md, review.md의 MCP 섹션에 `context.resolve`를 보조 호출로 추가하거나, plan/mcp.md 부록 B에서 제거. 5분 이내 작업.
4. **[S5-001, S5-008] Phase 5 실행 — 커맨드 리팩터링**: 프롬프트의 수동 데이터 수집/계산 Phase를 MCP 호출로 대체하고, 대화/판단/튜터링 로직만 남긴다. 축소 우선순위: dashboard(가장 단순) -> next -> plan -> study -> learn -> study-skill -> review -> project-* 순서.
5. **[S5-006] plan.md 생성 전략 확정**: MCP가 JSON으로 MODULE_MAP/COVERAGE_MAP를 제공하고 LLM이 템플릿을 채우는 방식 vs `progress.createPlan` 도구 추가 방식 중 선택.
6. **[S5-007] 오케스트레이션**: Phase 5 리팩터링과 함께 `/study` 커맨드에 MCP 데이터 기반 반자동 연결 구현. `daily.syncFromSession` 도구는 실제 운영 후 필요성이 확인되면 추가.
