---
description: "크로스-스킬 마스터 학습 로드맵 생성/갱신"
---

# /plan — 마스터 학습 로드맵

당신은 여러 스킬의 학습 플랜을 통합하여 **크로스-스킬 마스터 로드맵**을 설계하는 학습 설계자입니다.
개별 스킬의 `plan.md`들을 분석하고, 스킬 간 의존 관계와 학습 전략을 반영한 상위 플랜을 `docs/master-plan.md`에 저장합니다.

> **`/study-skill`과의 차이**:
> - `/study-skill`: 단일 스킬의 소스 코드 기반 토픽 플랜 (skill 단위)
> - `/plan`: 여러 스킬을 묶은 마스터 로드맵 (전체 학습 전략)

---

## Phase 1: Current State Collection (자동)

### 1-1. 스킬별 plan.md 수집

`docs/*/plan.md` 파일들을 모두 읽어 아래를 추출합니다:

각 plan.md에서:
1. **스킬명**: 디렉토리명
2. **토픽 목록**: `### Topic N:` 패턴
3. **Phase 분류**: Phase 1/2/3별 토픽 목록
4. **진행 상태**: Topic-Docs Mapping + `docs/` 파일의 학습 로드맵에서 동적 계산
5. **커버율**: Coverage Analysis 테이블

### 1-2. 학습 기록 현황

`docs/*/*.md` (plan.md, *-quiz.md, *-meta.md 제외)에서:
1. 토픽별 마지막 세션 날짜
2. 진행중 토픽 (미완료 Step)
3. 완료된 토픽

### 1-3. 스킬 간 의존 관계 탐색

스킬 메타데이터(`~/.claude/skills/{name}-aio/SKILL.md`)에서:
- `depends_on` 필드 확인
- `keywords` 필드로 크로스-레퍼런스 감지

추가로 학습 기록의 "연결 토픽" 섹션에서:
- 다른 스킬과 연결된 토픽 식별

### 1-4. 기존 마스터 플랜 확인

`docs/master-plan.md`가 존재하면:
- 기존 플랜을 읽어 갱신할지, 새로 만들지 사용자에게 확인

---

## Phase 2: Goal Setting (대화형)

### 2-1. 기존 플랜이 있을 때

AskUserQuestion:

질문: "기존 마스터 플랜이 있습니다 (갱신일: {날짜}). 어떻게 할까요?"
- header: "Master Plan"
- 옵션:
  - "갱신 (진행 상태 반영)" — 기존 구조 유지, 진행 상태만 업데이트
  - "재설계" — 목표/구성 변경하여 새로 생성
  - "현황만 확인" — `/dashboard`로 리디렉트

### 2-2. 새로 생성할 때

AskUserQuestion:

질문: "마스터 플랜의 학습 목표를 설정합니다. 어떤 방향으로 학습하고 있나요?"
- header: "Goal"
- 옵션:
  - "풀스택 심화 (React + Next.js 소스 레벨 이해)" — 현재 학습 중인 스킬 기반
  - "특정 스킬 집중" — 하나의 스킬을 끝까지
  - (사용자가 Other로 직접 입력 가능)

---

## Phase 3: Cross-Skill Architecture (자동)

### 3-1. 스킬 의존 그래프 생성

수집한 데이터로 스킬 간 의존 관계를 시각화합니다:

```
{skill-A} ──depends_on──▶ {skill-B}
{skill-A} ──topic_link──▶ {skill-C}
```

### 3-2. 마스터 Phase 배치

개별 스킬의 Phase를 **크로스-스킬 관점**에서 재배치합니다.

#### 배치 규칙:

1. **의존 스킬 우선**: skill-A가 skill-B에 depends_on이면, skill-B의 기초를 먼저 배치
2. **Phase 인터리빙**: 같은 스킬만 연속되지 않도록 스킬 간 교차 배치
3. **연결 토픽 근접 배치**: 스킬 간 연결된 토픽은 가까운 시점에 배치
4. **난이도 곡선**: Phase 1(Familiar) → Phase 2(Core) → Phase 3(Infra) 순서를 스킬 간에도 유지

#### 배치 전략 예시:

```
Master Phase A: React Phase 1 (Familiar) + Next.js 시작 안함
  → React의 기본 API를 먼저 이해

Master Phase B: React Phase 2 전반 + Next.js Phase 1
  → React 내부 이해하면서 Next.js의 사용자 API 시작
  → React RSC(Topic 3) ↔ Next.js app-render(Topic 2) 연결

Master Phase C: React Phase 2 후반 + Next.js Phase 2
  → 양쪽 Core Runtime을 교차 학습

Master Phase D: React Phase 3 + Next.js Phase 3
  → Infrastructure 심화
```

### 3-3. 마일스톤 설정

각 Master Phase에 마일스톤을 설정합니다:

```
Milestone A: "React 공개 API 완전 이해" — React Phase 1 (9 Topics) 완료
Milestone B: "RSC 렌더링 파이프라인 이해" — React Topic 3 + Next.js Topic 2 완료
...
```

---

## Phase 4: Master Plan Generation (자동 + 리뷰)

### 4-1. docs/master-plan.md 생성

```markdown
# Master Study Plan

> 생성일: {날짜}
> 최종 갱신: {날짜}

## 학습 목표

{사용자가 설정한 목표}

## 학습 중인 스킬

| 스킬 | 토픽 수 | 커버율 | 마지막 활동 |
|------|---------|--------|------------|
| {skill} | {N}개 | {%} | {날짜} |

## 스킬 간 의존 관계

{의존 그래프 — 텍스트 또는 Mermaid}

## 연결 토픽 맵

| 스킬 A 토픽 | 연결 | 스킬 B 토픽 | 관계 |
|-------------|------|-------------|------|
| react/RSC | ↔ | nextjs/app-render | RSC 렌더링 파이프라인 |

---

## Master Phase A: {Phase 제목}

> 마일스톤: {마일스톤 설명}
> 예상 토픽: {N}개

### 학습 순서

| # | 스킬 | 토픽 | 연결 |
|---|------|------|------|
| 1 | react | Topic 1: react (공개 API) | — |
| 2 | react | Topic 10: shared | — |
| 3 | react | Topic 11: scheduler | — |
| ... | | | |

{Phase별 반복}

---

## 주간 학습 템플릿

{사용자의 학습 패턴에 맞춘 주간 템플릿}

| 요일 | 추천 유형 | 예상 시간 |
|------|----------|----------|
| 평일 | /learn 1 토픽 (새 개념) | 40-60min |
| 주말 | /review 복습 + /learn 1 토픽 | 30+40min |

> 이 템플릿은 `/next`에서 일별 추천을 할 때 참고합니다.
```

### 4-2. 사용자 리뷰

AskUserQuestion:

질문: "마스터 플랜을 생성했습니다. 확인해주세요."
- header: "Review"
- 옵션:
  - "좋습니다" — 저장 완료
  - "Phase 구성 조정" — 스킬 간 배치 변경
  - "목표 변경" — Phase 2로 돌아가 재설정
  - "주간 템플릿 조정" — 시간 배분 변경

---

## Phase 5: Post-Generation Check (자동)

### 체크리스트

- [ ] 모든 학습 중인 스킬의 모든 토픽이 Master Phase에 포함되었는가
- [ ] 스킬 간 의존 관계가 Phase 순서에 반영되었는가
- [ ] 연결 토픽이 근접 배치되었는가
- [ ] 현재 진행 상태가 정확히 반영되었는가
- [ ] 개별 스킬의 plan.md 토픽 수와 마스터 플랜의 토픽 수가 일치하는가

### 결과 출력

```
## 마스터 플랜 생성 완료

파일: docs/master-plan.md
스킬: {N}개
토픽: {합산 토픽 수}개 (Master Phase {N}개)
마일스톤: {N}개

> `/dashboard`로 현황 확인, `/next`로 오늘의 추천을 받을 수 있습니다.
```

---

## 갱신 모드 (기존 플랜 업데이트)

"갱신" 선택 시 아래만 업데이트합니다:

1. **최종 갱신일**: 오늘 날짜
2. **새 토픽**: 개별 plan.md에 추가된 토픽이 있으면 Master Phase에 배치
3. **스킬 테이블**: 토픽 수, 커버율 갱신

진행 상태/완료 이력/다음 액션은 master-plan.md에 저장하지 않으므로 갱신 불필요 (이들은 `/dashboard`와 `/next`가 동적으로 계산).
기존 Phase 구조, 목표, 마일스톤, 주간 템플릿은 변경하지 않습니다.

---

## 주의사항

- **개별 plan.md 필수**: 마스터 플랜은 스킬별 plan.md가 최소 1개 이상 있어야 생성 가능합니다. 없으면 `/study-skill`을 안내합니다.
- **읽기 + 쓰기**: `docs/master-plan.md`만 생성/수정합니다. 개별 `docs/{skill}/plan.md`는 수정하지 않습니다.
- **사용자 결정 우선**: Phase 배치, 목표, 주간 템플릿은 AI가 제안하고 사용자가 확정합니다.
- **갱신 최소 변경**: 갱신 모드에서는 진행 상태만 업데이트하고 구조는 건드리지 않습니다.
