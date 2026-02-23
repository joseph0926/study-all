---
description: "스킬 소스 코드/문서 딥스터디 → 레퍼런스 검증/개선 위자드"
argument-hint: "<skill-name>"
---

# /study-skill — 스킬 소스 딥스터디 & 레퍼런스 검증/개선 위자드

## MCP Execution Mode (필수)

- 우선 호출: `progress.getModuleMap`, `progress.getCoverageMap`, `progress.getPlan`
- 쓰기 호출: `progress.updateCheckbox`
- 규칙: MODULE_MAP/COVERAGE_MAP 생성은 MCP를 사용하고 프롬프트는 검증/개선 제안에 집중한다.

당신은 스킬 레퍼런스 문서를 소스 코드/공식 문서와 대조하여 검증·개선하는 코치입니다.
아래 6단계를 **순서대로** 진행하세요.

> **다른 커맨드와의 차이**: `/study-skill`은 소스 코드 딥스터디 → 스킬 레퍼런스 검증/개선이 목적입니다.
> `/learn`은 소스 기반 Q&A 튜터링, `/review`는 학습 기록 기반 복습입니다.

---

## Phase 1: Skill Discovery (자동)

`$ARGUMENTS`에서 스킬명을 파싱합니다. 접미사 `-aio`는 자동 보정합니다.

1. `~/.claude/skills/{name}-aio/SKILL.md`를 읽습니다.
   - 파일이 없으면: **Phase 1.1 (Skill Scaffold Creation)**으로 진행합니다.

2. SKILL.md frontmatter에서 metadata를 추출합니다:
   - `version`, `source_repo`, `source_branch`
   - `depends_on`, `keywords`, `layer`
   - `patterns_path`, `anti_patterns_path`

3. `~/.claude/skills/{name}-aio/references/` 디렉토리의 모든 `.md` 파일 목록을 스캔합니다.

4. 추출 결과를 변수로 저장합니다:
   - `SKILL_NAME`: 스킬 이름 (예: `react`)
   - `SKILL_DIR`: `~/.claude/skills/{name}-aio`
   - `METADATA`: 추출된 metadata 객체
   - `REF_FILES`: references/ 내 .md 파일 리스트

5. 아래 형식으로 출력합니다:

```
## Skill: {SKILL_NAME}-aio

| Field | Value |
|-------|-------|
| Version | {version} |
| Layer | {layer} |
| Source Repo | {source_repo} |
| Source Branch | {source_branch} |
| Depends On | {depends_on} |
| Reference Docs | {REF_FILES 개수}개 |
```

---

## Phase 1.1: Skill Scaffold Creation (스킬이 없을 때만)

스킬 디렉토리(`~/.claude/skills/{SKILL_NAME}-aio/`)가 존재하지 않을 때 실행됩니다.
`/learn`의 Phase 1.1과 **동일한 로직**으로 스킬 뼈대를 생성합니다.

### 1. 소스 레포 정보 자동 추출

`ref/` 디렉토리에서 SKILL_NAME과 매칭되는 소스 레포를 탐색합니다:
- `ref/{name}-fork/`, `ref/{name}/`, `ref/{repo-name}/` 순서로 탐색
- 발견하면 `git -C {path} remote get-url origin`으로 source_repo 추출
- `git -C {path} describe --tags --abbrev=0 2>/dev/null`로 version 추출
- `git -C {path} rev-parse --abbrev-ref HEAD`로 source_branch 추출

### 2. 사용자 확인

AskUserQuestion으로 스킬 자동 생성을 확인합니다:

질문: "`{SKILL_NAME}-aio` 스킬이 없습니다. 기본 뼈대를 생성하고 학습하면서 채워나갈까요?"
- header: "Skill"
- 옵션:
  - "자동 생성 후 진행" — 뼈대를 생성하고 Phase 2로 계속
  - "중단" — 세션 종료

### 3. 스킬 뼈대 생성

아래 구조로 최소 파일을 생성합니다:

```
~/.claude/skills/{SKILL_NAME}-aio/
├── SKILL.md
└── references/
    ├── architecture.md
    ├── patterns.md
    └── anti-patterns.md
```

SKILL.md 템플릿과 references/ 초기 파일은 `/learn`의 Phase 1.1과 동일합니다.

### 4. Phase 1로 복귀

생성 완료 후 Phase 1의 2단계(metadata 추출)부터 재실행하여 정상 흐름으로 합류합니다.

---

## Phase 2: Source Material Setup (대화형)

### 2-1. 소스 자료 자동 탐색

프로젝트 루트의 `ref/` 디렉토리에서 아래 패턴으로 소스 코드/문서 디렉토리를 탐색합니다:

**소스 코드 탐색 패턴** (순서대로 시도):
1. `ref/{name}-fork/`
2. `ref/{name}/`
3. `ref/{repo-name}/` (source_repo에서 추출, 예: `facebook/react` → `react`)
4. `ref/{repo-name}-main/` 또는 `ref/{repo-name}-{branch}/`

**공식 문서 탐색 패턴** (순서대로 시도):
1. `ref/{name}.dev/`
2. `ref/{name}-docs/`
3. `ref/{name}-doc/`
4. `ref/{repo-name}.dev/`

### 2-2. 기존 plan.md 확인

`docs/{name}/plan.md`가 이미 존재하는지 확인합니다.
- 존재하면: 체크리스트 진행 상태를 파악하여 **세션 재개** 여부를 확인합니다.

### 2-3. 사용자 확인

AskUserQuestion으로 소스 자료를 확인합니다:

**질문 1**: "소스 코드 디렉토리를 확인해주세요."
- header: "Source Dir"
- 옵션:
  - 자동 감지된 경로 (있을 때) — "자동 감지: {path}"
  - "없음 (소스 코드 학습 건너뜀)"
  - (사용자가 Other로 직접 입력 가능)

**질문 2**: "공식 문서 디렉토리를 확인해주세요."
- header: "Docs Dir"
- 옵션:
  - 자동 감지된 경로 (있을 때) — "자동 감지: {path}"
  - "없음 (문서 교차 확인 건너뜀)"
  - (사용자가 Other로 직접 입력 가능)

**질문 3** (plan.md가 이미 있을 때만): "기존 학습 플랜이 있습니다. 이어서 진행할까요?"
- header: "Resume"
- 옵션:
  - "이어서 진행" — 미완료 토픽부터 계속
  - "새로 시작" — plan.md 재생성

→ 결과를 저장합니다:
- `SOURCE_DIR`: 소스 코드 경로 또는 null
- `DOCS_DIR`: 공식 문서 경로 또는 null
- `STUDY_MODE`: `full` (소스+문서) / `docs-only` / `refs-only`
- `RESUME`: true/false

---

## Phase 3: Inventory (자동)

### 3-1. Reference Files 스캔

각 reference 파일의 **첫 10줄** (제목, 구조)을 빠르게 스캔합니다.

### 3-2. Source Directory 모듈 맵 생성 (SOURCE_DIR 있을 때만)

SOURCE_DIR의 디렉토리 구조에서 **기계적으로** 모듈을 추출합니다. AI의 주관적 "핵심" 판단을 하지 않습니다.

1. **모듈 식별 규칙** (순서대로 시도, 첫 매칭 사용):
   - `packages/*/` 또는 `packages/*/src/` — 모노레포 패키지
   - `src/*/` — 모듈/피처 디렉토리
   - `lib/*/` — 라이브러리 모듈
   - 위 패턴 해당 없으면: SOURCE_DIR depth 1 디렉토리를 모듈로 사용

2. **각 모듈에서 추출** (Glob/Grep으로 기계적 추출):
   - 모듈명 (디렉토리명 그대로)
   - 엔트리포인트: `index.{ts,js,tsx}`, `{module-name}.{ts,js}`, `package.json`의 `main`/`exports`
   - 파일 목록 (depth 2까지, 파일 수 포함)
   - export 파일: `export` 키워드가 있는 파일 (Grep 추출)

3. **결과 저장**: `MODULE_MAP` — 모듈명 → {엔트리포인트, 파일 목록, export 파일}

> **금지**: "주요", "핵심", "중요" 등의 주관적 필터링을 하지 않습니다. 발견된 모듈을 **전부** MODULE_MAP에 포함합니다.

### 3-3. Docs Directory 분석 (DOCS_DIR 있을 때만)

- 가이드/레퍼런스 구조 파악
- 섹션별 문서 수 집계

### 3-4. Coverage Analysis (SOURCE_DIR 있을 때만)

MODULE_MAP의 각 모듈과 REF_FILES(references/ 파일)를 교차 대조합니다.

1. **매칭 규칙** (순서대로 시도):
   - 모듈명과 references/ 파일명 일치 (예: `fiber` → `references/fiber.md`)
   - 모듈명이 references/ 파일 내용에 포함 (Grep으로 확인)

2. **결과 저장**: `COVERAGE_MAP` — 모듈명 → {매칭된 references/ 파일 또는 `null`}

3. **분류**:
   - `COVERED_MODULES`: references/ 파일이 매칭된 모듈
   - `UNCOVERED_MODULES`: references/ 파일이 없는 모듈
   - `ORPHAN_REFS`: MODULE_MAP의 어떤 모듈과도 매칭되지 않는 references/ 파일

### 3-5. 현재 상태 요약 출력

```
## Inventory Summary

- **Skill**: {N}개 reference docs, {M}개 patterns/rules
- **Source**: {N}개 모듈 (MODULE_MAP) — {총 파일 수}개 files
- **Docs**: {N}개 guides, {M}개 references (해당 시)
- **Study Mode**: {STUDY_MODE}

### Coverage
- **커버됨**: {COVERED_MODULES 수}개 모듈 — {모듈명 목록}
- **미커버**: {UNCOVERED_MODULES 수}개 모듈 — {모듈명 목록}
- **고아 refs**: {ORPHAN_REFS 수}개 — {파일명 목록}
```

---

## Phase 4: Topic Plan Generation (자동 + 리뷰)

### RESUME=true인 경우

기존 `docs/{name}/plan.md`를 읽어서:
1. Topic-Docs Mapping과 Study-Skill Verification 테이블을 파싱합니다.
2. Verification에 기록되지 않은 첫 번째 토픽을 다음 학습 대상으로 표시합니다.
3. Phase 5로 바로 진행합니다.

### RESUME=false인 경우 (새로 생성)

**MODULE_MAP과 COVERAGE_MAP**을 기반으로 토픽 플랜을 생성합니다. AI의 일반 지식이 아닌 ref/ 소스 구조가 토픽의 근거입니다.

#### 토픽 생성 규칙:

1. **기본 단위**: MODULE_MAP의 각 모듈 = 1 토픽. 모든 모듈이 토픽에 포함되어야 합니다.
   - 파일 수가 많은 모듈(20+)은 하위 디렉토리 기준으로 분할 가능 (사유 명시)
   - 파일 수가 적은 모듈(3개 이하)은 관련 모듈과 그룹핑 가능 (사유 명시)
   - SOURCE_DIR이 없으면: references/ 파일을 기본 토픽 단위로 사용 (기존 동작)

2. **각 토픽에 포함할 내용**:
   - **Source Files**: MODULE_MAP에서 해당 모듈의 파일 목록을 **그대로** 사용 (AI가 "관련" 판단하지 않음)
   - **Docs**: DOCS_DIR에서 모듈명으로 Grep 매칭된 문서 목록 (있을 때만)
   - **Study Points**: 모듈의 엔트리포인트/export에서 **기계적으로 도출** (아래 규칙 참조)
   - **Skill Target**: COVERAGE_MAP에서 매칭된 `references/{file}.md` 또는 `"신규 생성 필요"`
   - *(Checklist 없음 — 진행 상태는 학습 파일에서 동적 계산)*

3. **Study Points 도출 규칙** (AI 일반 지식 사용 금지):
   - 모듈 엔트리포인트에서 export되는 API/함수/클래스 목록
   - 모듈 내부의 하위 디렉토리 구조 (역할 추정은 디렉토리명 기반)
   - 다른 모듈과의 의존 관계 (import 문 Grep으로 추출)
   - 테스트 파일이 있으면: 테스트 파일명에서 테스트 대상 추출

4. **토픽 순서**: **Top-down (익숙한 것 먼저)** 전략으로 3개 Phase로 분류합니다.

   #### Phase 분류 (기계적 — AI 주관 판단 금지)

   아래 우선순위 순서로 첫 번째 적용 가능한 방법을 사용합니다:

   **우선순위 1: DOCS_DIR 매칭 기반** (DOCS_DIR 있을 때)
   - Phase 1 (Familiar): DOCS_DIR의 문서와 모듈명이 Grep 매칭되는 모듈
   - Phase 2 (Core Runtime): Phase 1 모듈이 직접 import하는 모듈 (1-hop)
   - Phase 3 (Infrastructure): 나머지

   **우선순위 2: npm 패키지 기반** (모노레포, DOCS_DIR 없을 때)
   - Phase 1: `package.json`에 `"main"` 또는 `"exports"`가 있는 모듈
   - Phase 2: Phase 1 모듈이 직접 import하는 모듈
   - Phase 3: 나머지

   **우선순위 3: 엔트리포인트 기반** (단일 패키지)
   - Phase 1: `src/index.{ts,js}`에서 직접 export하는 모듈
   - Phase 2: Phase 1 모듈이 import하는 모듈
   - Phase 3: 나머지

   **우선순위 4: import 그래프 비율** (위 모두 안 될 때)
   - 각 모듈의 score = (import하는 모듈 수) / (import당하는 모듈 수 + 1)
   - Phase 1: score 상위 1/3
   - Phase 2: score 중간 1/3
   - Phase 3: score 하위 1/3

   #### 각 Phase 내부 순서
   - Phase 내에서는 모듈 간 import 의존 관계 순서 유지 (의존되는 모듈부터)
   - 의존 관계 추출 불가 시 알파벳 순

   #### Phase 분류 이유
   - 익숙한 API(Phase 1)를 먼저 학습하면 맥락이 생기고, 이후 내부 구현(Phase 2)과 기반 인프라(Phase 3)를 deep dive할 때 "이게 어디에 쓰이는지" 이해한 상태에서 학습할 수 있음
   - Phase 1 학습 중 하위 Phase 개념을 만나면 Just-in-time 간단 설명 후 넘어감 (Phase 5 참조)

#### plan.md 생성

`docs/{name}/` 디렉토리를 생성하고 `plan.md`를 아래 템플릿으로 작성합니다:

```markdown
# {Skill Display Name} Source Code & Documentation Study Plan

> {스킬의 소스 코드와 공식 문서를 주제별로 학습하면서,
> 학습 결과를 바탕으로 `skills/{name}-aio/`의 기존 참조 문서를 검증·보강한다.}

## Current State

- **Skill**: {name}-aio — {N}개 참조 문서, {M}개 패턴 (v{version} 기준)
- **Source**: {SOURCE_DIR 요약} — {MODULE_MAP 모듈 수}개 모듈 (해당 시)
- **Docs**: {DOCS_DIR 요약} (해당 시)

## Coverage Analysis

| Status | Module | Skill Target |
|--------|--------|--------------|
| ✅ 커버 | {모듈명} | `references/{file}.md` |
| ⬜ 미커버 | {모듈명} | 신규 생성 필요 |
| 🔗 고아 ref | — | `references/{orphan}.md` (매칭 모듈 없음) |

- **커버율**: {COVERED}/{TOTAL} 모듈 ({퍼센트}%)

## Core Principles

- 사용자가 직접 소스를 읽고 학습하며 진행 (AI가 일방적으로 작성하지 않음)
- 주제(토픽) 단위로 소스 + 문서를 묶어서 학습
- 각 토픽 완료 시 해당 스킬 레퍼런스 문서를 검증/개선

## Session Flow (각 토픽마다 반복)

1. 소스 파일 읽기 (사용자 주도, 질의/토론)
2. 공식 문서 교차 확인
3. 스킬 reference 검증 (소스 코드 대조)
4. 최소 개선 (사용자 결정)
5. Study-Skill Verification 테이블 업데이트

---

## Phase 1: Familiar — 사용자가 직접 쓰는 API ({N} Topics)

순서는 Phase 내 import 의존 관계 기반.

---

### Topic 1: {모듈명} {✅|⬜ 커버 상태}

> {모듈 1줄 설명}

**Source Files** (MODULE_MAP에서 추출):
| File | Role |
|------|------|
| {엔트리포인트} | 모듈 진입점 |
| {export 파일} | {Grep으로 추출한 export 내용 요약} |

**Study Points** (소스 구조에서 도출):
- 엔트리포인트 export: {export 목록}
- 내부 구조: {하위 디렉토리명 기반}
- 의존 모듈: {import Grep 결과}

**Docs**: {DOCS_DIR에서 모듈명 Grep 매칭 결과} (해당 시)

**Skill Target**: `references/{file}.md` 또는 "신규 생성 필요"

{이하 Phase 1의 모든 모듈에 대해 반복}

---

## Phase 2: Core Runtime — 동작 메커니즘 ({N} Topics)

순서는 Phase 내 import 의존 관계 기반.

{Phase 2 모듈에 대해 Topic 반복 — 형식 동일}

---

## Phase 3: Infrastructure — 기반 유틸리티 ({N} Topics)

순서는 Phase 내 import 의존 관계 기반.
Phase 1, 2에서 이미 간단히 다룬 개념들을 심화 학습.

{Phase 3 모듈에 대해 Topic 반복 — 형식 동일}

---

## Docs Supplementary Study

{소스에서 다루지 않은 실용적 가이드/API 레퍼런스 학습 — DOCS_DIR 있을 때만}

---

## Files To Modify

| Action | File | Source |
|--------|------|--------|
| Verify/Improve | `skills/{name}-aio/references/{file}.md` | 기존 커버된 모듈 |
| Create (신규) | `skills/{name}-aio/references/{uncovered-module}.md` | 미커버 모듈 |
| Review (고아) | `skills/{name}-aio/references/{orphan}.md` | 매칭 모듈 없음 — 삭제/병합 검토 |

## Topic-Docs Mapping

> 학습 파일 ↔ 토픽 연결. `/learn` 첫 세션 시 자동 등록, `/study-skill` 생성 시 기존 파일 스캔.

| Topic | docs_file |
|-------|-----------|

## Study-Skill Verification

> `/study-skill` 검증 완료 기록. 토픽별 소스 대조/스킬 개선 완료 시 기록.

| Topic | verified | 변경 파일 |
|-------|----------|----------|

## Verification

- 각 토픽 완료 후: 수정된 레퍼런스 문서의 내용이 소스 코드와 일치하는지 교차 확인
- 전체 완료 후: `bash scripts/check-docs.sh` 실행하여 문서 정합성 검증
```

#### 사용자 리뷰

plan.md를 생성한 후 AskUserQuestion으로 확인합니다:

질문: "학습 플랜을 생성했습니다. 토픽 순서/구성을 확인해주세요."
- header: "Plan Review"
- 옵션:
  - "좋습니다, 시작합니다" — Phase 5로 진행
  - "순서 조정 필요" — 사용자 피드백 반영 후 재생성
  - "토픽 추가/제거 필요" — 사용자 피드백 반영

---

## Phase 5: Per-Topic Study Loop (대화형 — 핵심)

각 토픽마다 아래 5단계를 반복합니다. **사용자가 학습을 주도합니다.**

### Step 0: Just-in-time 설명 규칙 (상위 Phase 토픽 학습 시)

상위 Phase(Phase 1, 2) 토픽 학습 중 하위 Phase의 개념을 만나면:
- **1-2줄 간단 설명** + 소스 경로만 제공 (deep dive하지 않음)
- "이 개념은 Phase 3의 {토픽명}에서 심화 학습합니다" 표시
- 사용자가 "지금 더 알고 싶다"고 하면 그 자리에서 확장 설명 가능
- 해당 하위 Phase 토픽의 Study Points에 "Phase N에서 이미 간단히 다룸: {맥락}" 메모를 추가하여, 나중에 심화 학습 시 기존 맥락과 연결

### Step 1: 소스 파일 읽기 (SOURCE_DIR 있을 때)

- 현재 토픽의 Source Files 테이블에 있는 파일들을 사용자와 함께 읽습니다.
- 사용자의 질문에 답하고, 핵심 로직을 함께 파악합니다.
- AI는 **설명 요청 시에만 설명**하고, 일방적으로 요약하지 않습니다.

### Step 2: 공식 문서 교차 확인 (DOCS_DIR 있을 때)

- 해당 토픽의 Docs 목록에 있는 문서를 읽고 소스 코드와 비교합니다.
- 사용자 관점 vs 내부 구현 관점 차이를 이해합니다.

### Step 3: 스킬 Reference 검증

- 해당 토픽의 Skill Target 파일(`references/{file}.md`)을 읽습니다.
- 소스 코드와 대조하여 다음을 식별합니다:
  - 부정확한 설명
  - 누락된 내용
  - 오래된 정보 (버전 드리프트)

### Step 4: 최소 개선 (사용자 결정)

- 검증 결과를 사용자에게 보고합니다.
- **사용자가 개선 여부와 범위를 결정**합니다.
- 최소 변경 원칙: 틀린 것만 고치고, 없는 것만 추가합니다.

### Step 5: Verification 기록

- `docs/{name}/plan.md`의 `Study-Skill Verification` 테이블에 행을 추가합니다:
  - `| {Topic명} | {오늘 날짜} | {변경한 references/ 파일 목록} |`
- Topic-Docs Mapping에 해당 토픽의 학습 파일이 없으면, 기존 `docs/{name}/*.md`를 Glob으로 스캔하여 매칭되는 파일을 등록합니다.

### 토픽 전환

각 토픽 완료 후 AskUserQuestion으로 확인합니다:

질문: "토픽 '{현재 토픽명}'을 완료했습니다. 다음으로 어떻게 할까요?"
- header: "Next"
- 옵션:
  - "다음 토픽 진행 ({다음 토픽명})" — 다음 토픽으로 계속
  - "세션 종료 (진행 상태 저장)" — 체크리스트 저장 후 종료
  - "특정 토픽으로 이동" — 사용자가 토픽 번호 지정

---

## Phase 6: Final Verification (자동)

모든 토픽 완료 시 (또는 사용자가 요청 시), 세션 변경 사항을 요약합니다:

```
## Session Summary

### 완료된 토픽
- Topic 1: {title} — {변경 요약}
- ...

### 수정된 파일
| File | Changes |
|------|---------|
| references/{file}.md | {변경 내용 요약} |
| ... | ... |
```

---

## Phase 7: Post-Session Consistency Check (자동)

Phase 6 완료 직후, 이 세션에서 수정한 파일들과 CLAUDE.md 규칙을 대조하여 정합성을 검증합니다.
정적 스크립트(`scripts/check-docs.sh`)가 잡지 못하는 **시맨틱 레벨 이슈**를 AI가 검증합니다.

### 검증 절차

1. 이 세션에서 Write/Edit한 파일 목록을 정리합니다 (`docs/`, `references/` 모두).
2. `CLAUDE.md`의 "docs/ 파일 규칙"과 "세션 기록 구조"를 Read합니다.
3. 아래 체크리스트를 순서대로 검증합니다.

### 체크리스트

#### plan.md 정합성
- [ ] 완료한 토픽이 `Study-Skill Verification` 테이블에 기록되었는가
- [ ] Topic-Docs Mapping에 기존 학습 파일이 등록되어 있는가 (docs/{skill}/*.md 스캔)

#### 스킬 레퍼런스 변경 검증
- [ ] 수정한 `references/*.md`의 변경 내용이 소스 코드와 일치하는가 (변경한 섹션 2-3개 샘플링)
- [ ] 수정하지 않기로 한 파일(`patterns.md`, `anti-patterns.md`)을 실수로 수정하지 않았는가

#### 문서 간 정합성
- [ ] `README.md`의 docs/ 예시 트리가 현재 파일 구조와 일치하는가 (불일치 시 알림만)
- [ ] CLAUDE.md의 레포 구조 트리가 새로 생성된 디렉토리/파일을 반영하는가 (불일치 시 알림만)

### 결과 출력

```
## 정합성 검증 결과

✅ plan.md: Topic 2 체크리스트 3/3 완료, 상태 동기화 확인
✅ references/fiber.md: 변경 내용 소스 코드와 일치 확인
⚠️ 문서 정합성: README.md 예시 트리 업데이트 필요 (신규 파일 반영)
```

- **이슈가 있으면**: 사용자에게 보고하고 수정 여부를 물어봅니다.
- **전부 통과**: 한 줄로 "정합성 검증 통과"를 알리고 종료합니다.

---

## 주의사항

- **사용자 주도**: AI가 일방적으로 레퍼런스를 작성/수정하지 않습니다. 소스 읽기/개선 결정은 항상 사용자가 합니다.
- **Graceful Degradation**: 소스 fork가 없으면 docs-only, docs도 없으면 refs-only 모드로 동작합니다.
- **세션 재개**: `plan.md`의 `Study-Skill Verification` 테이블이 검증 완료 상태를 추적합니다. 다음 세션에서 `/study-skill {name}`을 실행하면 미검증 토픽부터 계속합니다.
- **최소 변경**: `references/` 내용은 소스 코드와 대조하여 틀린 것만 고치고, 없는 것만 추가합니다. `patterns.md`, `anti-patterns.md`는 사용자가 명시 요청한 경우에만 수정합니다.
