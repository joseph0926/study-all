---
description: "스킬 소스 코드/문서 딥스터디 → 레퍼런스 검증/개선 위자드"
argument-hint: "<skill-name>"
---

# /study-skill — 스킬 소스 딥스터디 & 레퍼런스 검증/개선 위자드

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

### 3-2. Source Directory 분석 (SOURCE_DIR 있을 때만)

- 핵심 디렉토리 구조 파악 (depth 2)
- 패키지/모듈별 파일 수 집계
- 주요 엔트리포인트 파일 식별

### 3-3. Docs Directory 분석 (DOCS_DIR 있을 때만)

- 가이드/레퍼런스 구조 파악
- 섹션별 문서 수 집계

### 3-4. 현재 상태 요약 출력

```
## Inventory Summary

- **Skill**: {N}개 reference docs, {M}개 patterns/rules
- **Source**: {N}개 packages, {M}개 files (해당 시)
- **Docs**: {N}개 guides, {M}개 references (해당 시)
- **Study Mode**: {STUDY_MODE}
```

---

## Phase 4: Topic Plan Generation (자동 + 리뷰)

### RESUME=true인 경우

기존 `docs/{name}/plan.md`를 읽어서:
1. 완료된 토픽(`[x]`)과 미완료 토픽(`[ ]`)을 분류합니다.
2. 첫 번째 미완료 토픽을 다음 학습 대상으로 표시합니다.
3. Phase 5로 바로 진행합니다.

### RESUME=false인 경우 (새로 생성)

references/ 파일 구조와 소스/문서 디렉토리를 분석하여 토픽 플랜을 생성합니다.

#### 토픽 생성 규칙:
1. 각 reference 파일을 기본 토픽 단위로 합니다 (큰 파일은 분할, 관련 파일은 그룹핑 가능).
2. 각 토픽에 포함할 내용:
   - **Source Files**: SOURCE_DIR에서 해당 토픽과 관련된 파일 테이블 (있을 때만)
   - **Docs**: DOCS_DIR에서 해당 토픽과 관련된 문서 목록 (있을 때만)
   - **Study Points**: 학습 포인트 (3-5개 bullet)
   - **Skill Target**: 검증 대상 reference 파일
   - **Checklist**: `[ ] 소스 학습 완료` / `[ ] docs 교차 확인` / `[ ] skill 검증/개선`

3. 토픽 순서는 **bottom-up** 제안:
   - 기초 자료구조/설정 → 내부 메커니즘 → 사용자 기능 → 고급 기능/최적화

#### plan.md 생성

`docs/{name}/` 디렉토리를 생성하고 `plan.md`를 아래 템플릿으로 작성합니다:

```markdown
# {Skill Display Name} Source Code & Documentation Study Plan

> {스킬의 소스 코드와 공식 문서를 주제별로 학습하면서,
> 학습 결과를 바탕으로 `skills/{name}-aio/`의 기존 참조 문서를 검증·보강한다.}

## Current State

- **Skill**: {name}-aio — {N}개 참조 문서, {M}개 패턴 (v{version} 기준)
- **Source**: {SOURCE_DIR 요약} (해당 시)
- **Docs**: {DOCS_DIR 요약} (해당 시)

## Core Principles

- 사용자가 직접 소스를 읽고 학습하며 진행 (AI가 일방적으로 작성하지 않음)
- 주제(토픽) 단위로 소스 + 문서를 묶어서 학습
- 각 토픽 완료 시 해당 스킬 레퍼런스 문서를 검증/개선

## Session Flow (각 토픽마다 반복)

1. 소스 파일 읽기 (사용자 주도, 질의/토론)
2. 공식 문서 교차 확인
3. 스킬 reference 검증 (소스 코드 대조)
4. 최소 개선 (사용자 결정)
5. plan.md 체크리스트 업데이트

---

## Part 1: Source Code Study ({N} Topics)

{토픽별 섹션 — Phase 4 토픽 생성 규칙에 따라 생성}

---

## Part 2: Docs Supplementary Study

{소스에서 다루지 않은 실용적 가이드/API 레퍼런스 학습 — DOCS_DIR 있을 때만}

---

## Files To Modify

| Action | File |
|--------|------|
| Verify/Improve | `skills/{name}-aio/references/{file}.md` |
| ... | ... |

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

### Step 5: 체크리스트 업데이트

- `docs/{name}/plan.md`의 해당 토픽 체크리스트를 업데이트합니다.
  - `[x] 소스 학습 완료`
  - `[x] docs 교차 확인` (해당 시)
  - `[x] skill 검증/개선`

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
- [ ] 완료한 토픽의 체크리스트가 `[x]`로 업데이트되었는가
- [ ] 체크리스트 항목(소스 학습/docs 교차/skill 검증) 각각이 실제 수행 여부와 일치하는가

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
- **세션 재개**: `plan.md` 체크리스트가 진행 상태 역할을 합니다. 다음 세션에서 `/study-skill {name}`을 실행하면 미완료 토픽부터 계속합니다.
- **최소 변경**: `references/` 내용은 소스 코드와 대조하여 틀린 것만 고치고, 없는 것만 추가합니다. `patterns.md`, `anti-patterns.md`는 사용자가 명시 요청한 경우에만 수정합니다.
