---
name: project
description: 프로젝트 전체 이해(조감도/워크스루) → 설계 의도 대화 → 개선점 진단 → 논의 → 수정 → 문서화. "프로젝트 분석해줘", "이 프로젝트 뭐하는 거야", "코드 구조 설명해줘", "코드 개선", "리팩터링 포인트 찾아줘" 등 프로젝트 이해/개선 요청 시 사용한다. Codex에서는 `$project project-path [area]`으로 호출한다.
---

# project

입력: `$project <project-path> [area]`

## 세션 상태 보존

### session-state.md

상태 파일: `{project}/.study/project-session-state.md`

Phase 전환마다 Write로 갱신한다:

```
# PROJECT-SESSION
updated: {YYYY-MM-DD HH:MM}
project: {project-path}
area: {area|전체}
phase: {N}
overview: {완료|미완료}
findings: {N}건
decisions: {수용 N, 거부 N, 보류 N}
fixes:
  - {file:line}: {설명} ({phase}에서 수정)
```

복원:
- Phase 0 진입 시 Read
- `# COMPLETED` 또는 파일 없음 → 새 세션
- 활성 내용 + 당일 → "이전 세션: {area}, Phase {N}. 이어서 할까요?" 확인
- 활성 내용 + 이전 날짜 → "이전 세션 발견 ({날짜}). 이어서/새로?" → 사용자 선택

### 배너

매 응답 첫 줄:
```
> [PROJECT] Phase {N}/6 | {project-name} | {area} | fix: {N}건
```


## Phase 0: 초기화

1. `호출 인자`에서 `<project-path>` + 선택적 `[area]` 파싱
2. `context.resolve(mode=project, projectPath=<project-path>)` 호출
3. 세션 복원 체크 (위 참조)
4. `{project}/.study/plan.md` 존재 여부 확인
5. 첫 실행이면 `.gitignore`에 `.study/` 추가 안내

분기:
- area 없고 overview.md 없음 → Phase 1-A
- area 없고 overview.md 있음, plan.md 없음 → Phase 1-B (조감도 로드 후 플랜)
- area 없고 plan.md 있음 → Phase 1-C (영역 선택)
- area 있음 → Phase 2


## Phase 1: 프로젝트 이해

### 1-A. 조감도 — "이 프로젝트가 뭘 하는 건가?"

1. `progress.getModuleMap()` → 모듈 구조 파악
2. 핵심 파일 탐색:
   - `README.md`, `package.json` (또는 `pyproject.toml`, `Cargo.toml` 등)
   - 진입점: `index.ts`, `main.ts`, `app.ts`, `src/index.*` 등
3. 의존성 분석: dependencies/devDependencies → 기술 스택 식별
4. 조감도 출력:

```
## 프로젝트 조감도: {project-name}

### 한 줄 요약
{이 프로젝트가 뭘 하는지 — README/코드 기반}

### 기술 스택
{프레임워크, 언어, 주요 라이브러리}

### 구조
{모듈 맵 — ASCII 트리 또는 테이블, `file:line` 포함}

### 데이터/제어 흐름
{진입점 → 핵심 모듈 → 출력 다이어그램}
```

5. 사용자에게 확인 질문: "이 프로젝트는 X를 하는 Y인가요?"
6. 사용자 교정이 있으면 이해 수정
7. 합의되면 `{project}/.study/overview.md`에 Write

### 1-B. 영역 플랜 수립

overview.md가 있으면 로드하여 요약 표시 후:

1. 조감도 기반으로 분석 영역 5~8개 도출
2. 각 영역에 **"왜 이 영역이 중요한지"** 한 줄 근거 포함
3. 사용자 확인 후 `{project}/.study/plan.md` 생성

plan.md 포맷 (plan-parser.ts 호환):
```markdown
## Phase 1: <project-name> 분석

### Topic 1: <area-name>
- [ ] Step 1: 코드 워크스루
- [ ] Step 2: 설계 의도 이해
- [ ] Step 3: 개선점 도출
- [ ] Step 4: 논의 완료
- [ ] Step 5: 구현 완료
- [ ] Step 6: 검증 통과
- [ ] Step 7: 문서화

### Topic 2: ...
```

### 1-C. 영역 선택 (plan.md 있을 때)

1. `progress.getPlan`으로 기존 계획 로드
2. overview.md 있으면 조감도 요약 표시
3. 미완료 영역 목록 표시 → 사용자 선택 → Phase 2


## Phase 2: 영역 심층 이해

### 2-A. 코드 워크스루

해당 영역의 코드를 **읽고 설명한다** (개선점 찾기 전에):

1. 영역 관련 파일 Glob/Grep으로 수집
2. 진입점부터 코드 흐름을 따라감:
   - 호출 그래프 추적 (`file:line` 인용 필수)
   - 핵심 데이터 구조 식별
   - 외부 의존성과의 인터페이스 파악
3. 워크스루 출력:

```
### {area} 코드 워크스루

**진입점**: `src/auth/index.ts:15`

**핵심 흐름**:
1. `authenticateUser()` (src/auth/middleware.ts:23) → JWT 검증
2. `verifyToken()` (src/auth/jwt.ts:45) → 서명 확인 + 만료 체크
3. `attachUser()` (src/auth/middleware.ts:38) → req.user에 주입

**데이터 흐름**:
{ASCII 다이어그램}

**사용 패턴**:
- middleware chain, repository pattern 등
```

### 2-B. 설계 의도 대화

워크스루 후, **사용자에게 "왜" 질문**:

- "이 부분에서 X를 선택한 이유가 있나요? (vs Y)"
- "이 구조가 의도적인가요?"
- "이 처리 전략을 선택한 배경이 있나요?"

사용자 답변 처리:
- **의도 설명** → 기록 (문서에 "설계 의도:" 섹션으로 보존)
- **"원래 있던 거야" / "잘 모르겠어"** → "같이 살펴봅시다" → Phase 3에서 자연스럽게 진단
- **"이건 좀 문제야"** → 사용자가 직접 인식한 문제 → Phase 3에서 P1 자동 배정

`>>다음` 시: `progress.updateCheckbox(topic, step="코드 워크스루", done=true)` + `progress.updateCheckbox(topic, step="설계 의도", done=true)` → Phase 3 진행


## Phase 3: 진단

Phase 2에서 이해한 내용 + 사용자 답변을 기반으로 개선점 도출:

1. **사용자가 Phase 2에서 "이건 문제야"라고 한 것 → P1 자동 배정**
2. AI가 워크스루에서 발견한 패턴/구조 문제 → P2/P3
3. 모든 개선 제안에 근거 필수 (`file:line` 또는 WebSearch 출처)

구조화된 결과 제시:

```
### 진단 결과

| # | 우선순위 | 제안 | 근거 | 출처 |
|---|---------|------|------|------|
| 1 | P1 (사용자) | ... | `src/...:42` | Phase 2 대화 |
| 2 | P2 | ... | `src/...:10` | 워크스루 |
| 3 | P3 | ... | `src/...:55` + [참조] | WebSearch |
```

사용자와 개선점별 토론:
- 각 제안에 대해 수용/거부/보류 결정
- 수용된 항목이 있으면 Phase 4로 진행
- 모두 거부/보류면 Phase 6으로 이동

`>>다음` 시: `progress.updateCheckbox(topic, step="개선점 도출", done=true)` + `progress.updateCheckbox(topic, step="논의 완료", done=true)` → Phase 4 진행


## Phase 4: 일괄 구현 (수용된 개선 항목)

수용된 개선 항목을 **하나씩** 적용한다.

1. 수용 항목 목록을 우선순위(P1→P2→P3) 순으로 정렬
2. 각 항목에 대해:
   - 변경 전 코드 상태를 사용자에게 보여줌 (`file:line` 인용)
   - 변경 내용을 설명하고 사용자 확인 후 `Edit`/`Write`로 적용
   - **한 항목 적용 후 다음으로 넘어감** — 여러 항목을 한번에 수정하지 않는다
3. `>>건너뛰기`로 해당 항목을 보류 전환

수정 원칙:
- 최소 diff: 수용된 범위만 변경, 주변 코드 정리/리팩터링 금지
- 기존 컨벤션 준수: 프로젝트의 코딩 스타일/패턴 유지
- 파괴적 변경 시 사전 경고: 외부 인터페이스/API 시그니처 변경 시 영향 범위 고지

`>>다음` 시: `progress.updateCheckbox(topic, step="구현 완료", done=true)` → Phase 5 진행


## Phase 5: 검증

수정이 1건 이상 있을 때만 실행한다 (수정 없으면 Phase 6으로).

1. 프로젝트 검증 명령 탐색 (우선순위):
   - `package.json` scripts: `test`, `typecheck`, `lint`
   - 프레임워크별: `tsc --noEmit`, `eslint .`, `pytest` 등
   - 검증 명령이 없으면 사용자에게 확인
2. 발견된 검증 명령 실행 (Bash)
3. 결과 보고:
   - 통과 → `progress.updateCheckbox(topic, step="검증 통과", done=true)` → Phase 6
   - 실패 → 실패 원인 분석 + 수정 제안 → 사용자 확인 후 재수정 또는 롤백
4. 롤백: 검증 실패 시 사용자 요청에 따라 `git checkout -- <file>` 등으로 복원 가능 (사용자 확인 필수)


## Phase 6: 문서화 (종료 시)

종료(`>>정리` 또는 `>>끝`) 시:
1. `{project}/.study/{Area-Name}.md`에 기록 Write
2. `session.appendLog(via="via $project")`
3. `progress.updateCheckbox(topic, step="문서화", done=true)`
4. session-state.md → `# COMPLETED\n`

기록 포맷:
```markdown
# {Area-Name}

> 프로젝트: {project-path}
> 일시: YYYY-MM-DD

### 코드 워크스루
{Phase 2-A 결과 — 진입점, 핵심 흐름, 데이터 흐름}

### 설계 의도
{Phase 2-B 사용자 답변 기록}

### 진단 및 개선
| # | 우선순위 | 제안 | 근거 | 결정 | 구현 |
|---|---------|------|------|------|------|
| 1 | P1 | ... | `src/...:42` | 수용 | 완료 |
| 2 | P2 | ... | `src/...:10` | 거부 | — |

### 변경 내역
| 파일 | 변경 | 출처 | 검증 |
|------|------|------|------|
| `src/...:42` | [설명] (+N, -M) | Phase 4 | pass |
| `src/...:15` | [설명] (+N, -M) | fix (Phase 2) | pass |

### 즉석 수정 (Fix) 이력
{>>fix로 수행한 수정들 — 없으면 생략}
```


## `>>fix` — 즉석 수정 모드

Phase 1~3 어디서든 `>>fix`로 진입할 수 있다. Phase 흐름을 깨지 않고 즉석 수정을 수행한다.

### 진입 조건

사용자가 코드를 보면서 "이거 바로 고치자", "이건 지금 수정하자" 등을 말하거나 `>>fix`를 입력하면 진입.

### 흐름

```
>>fix
  1. 현재 Phase 기록 (returnPhase)
  2. 수정 대상 확인: "어떤 부분을 수정할까요?" (이미 언급했으면 확인만)
  3. 변경 전 코드 표시 (`file:line`)
  4. 사용자 승인
  5. Edit 적용 (최소 diff, 기존 컨벤션 준수)
  6. fix 기록: session-state.md fixes 배열에 추가
  7. 배너 갱신
  8. "수정 완료. Phase {returnPhase}로 돌아갑니다." → 원래 Phase 계속
```

### 규칙

- Fix 완료 후 **반드시 원래 Phase로 복귀**한다. Phase를 건너뛰지 않는다.
- Fix는 Phase 4(일괄 구현)와 독립적이다. Phase 4는 Phase 3 진단 결과만 처리한다.
- Fix 이력은 Phase 6 문서에 별도 섹션으로 기록된다.
- 연속 fix 가능: fix 완료 후 바로 다시 `>>fix` 가능.
- Phase 4~6에서는 `>>fix`가 불필요하다 (이미 구현 Phase이므로). 직접 수정 진행.


## 사용자 신호 규칙

- `>>다음` — 다음 Phase로 전환
- `>>fix` — 즉석 수정 모드 진입 (Phase 1~3)
- `>>정리` 또는 `>>끝` — 세션 종료 + Phase 6 실행
- `>>건너뛰기` — 현재 개선 항목을 보류 전환 (Phase 4)
- 일반 대화 속 "다음", "고치자", "정리", "끝"은 신호로 인식하지 않는다 (`>>` 접두사 필수).
- 예외: `>>fix`는 `>>` 없이 "이거 바로 고치자" 등 명시적 수정 의사 표현도 인식한다 (Phase 1~3 한정).

## 규칙

- 근거 없는 주장 금지 — 모든 개선 제안에 `file:line` 또는 WebSearch 출처 필수
- 상태 계산은 MCP 결과를 단일 진실 원천으로 사용한다
- `.gitignore`에 `.study/` 추가 안내 (첫 실행)
- 코드 수정은 사용자 확인 후에만 실행한다 (자동 수정 금지)
- AI가 자체 판단으로 Phase를 건너뛰지 않는다
- Phase 2(이해)를 건너뛰지 않는다 — 개선 전에 먼저 이해한다
- 기존 6-Step plan.md와 하위 호환: Step이 없으면 해당 단계를 건너뛴다
