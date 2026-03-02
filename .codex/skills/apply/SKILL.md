---
name: apply
description: 학습한 내용을 실제 프로젝트에 적용 — 학습 기록 기반 진단 → 코칭 → 선택적 수정 Codex에서는 `$apply <project-path> <topic>`으로 호출한다.
---

# apply

입력: `$apply <project-path> <topic>`

## Phase 0: 초기화

1. `$ARGUMENTS`에서 `<project-path>` + `<topic>` 파싱
2. `context.resolve(mode=project, projectPath=<project-path>)` 호출
3. 학습 기록 탐색 — `study/` 디렉토리에서 topic 관련 파일을 Glob/Grep으로 검색
   - 탐색 범위: `study/**/*{topic}*`, `study/.routine/**/*{topic}*`
   - 발견된 파일 목록 확인
4. 세션 상태 초기화

   상태 파일: `{project}/.study/apply/session-state.md`

   4-A. Read 시도:
     - 파일 없음 또는 `# COMPLETED` → 새 세션 → Step 4-C
     - 활성 내용 + 당일 → "이전 세션 복원." → 상태 복원 → 해당 Phase
     - 활성 내용 + 이전 날짜 → "이전 세션 발견 ({날짜}). 이어서/새로?" → 사용자 선택

   4-B. 복원 정보:
     - topic, studyFiles, findings, currentItem, completedItems, decisions

   4-C. 새 세션 → 상태 파일 초기화 Write:
     ```
     # SESSION-STATE
     updated: {YYYY-MM-DD HH:MM}
     topic: {topic}
     project: {project-path}
     phase: 1
     currentItem: 0
     completedItems: 0
     ---
     ## Study Files
     (탐색 중)
     ---
     ## Findings
     (미결정)
     ---
     ## Decisions
     (없음)
     ```

5. 첫 실행이면 `.gitignore`에 `.study/` 추가 안내

## Phase 1: 학습 회고

1. 발견된 학습 기록 파일들을 Read로 읽는다
2. 핵심 내용을 구조화하여 제시:
   - **핵심 개념**: 학습한 주요 개념/원리
   - **모범 패턴**: 학습에서 확인한 올바른 사용법
   - **주의 사항**: 학습에서 확인한 안티패턴/흔한 실수
   - **출처**: 각 항목의 학습 기록 경로 (`study/...`)
3. 사용자 확인 후 Phase 2 진입

학습 기록이 없으면:
- "'{topic}' 관련 학습 기록이 없습니다. /routine 또는 /learn으로 먼저 학습을 권장합니다. 그래도 진행할까요?"
- 사용자가 진행을 선택하면 → WebSearch로 best practice 조사 후 Phase 2

## Phase 2: 프로젝트 스캔

1. 프로젝트에서 topic 관련 코드를 Grep/Glob으로 탐색
   - 키워드 기반: import, 함수 호출, 타입 사용 등
   - 파일 패턴 기반: 확장자, 디렉토리 구조
2. 발견된 사용처를 목록으로 제시:

   | # | 파일 | 위치 | 사용 형태 | 첫인상 |
   |---|------|------|----------|--------|
   | 1 | src/components/Timer.tsx | :15 | useRef<number>() | 적절 |
   | 2 | src/hooks/usePrevious.ts | :8 | useRef(value) | 검토 필요 |

   첫인상 기준:
   - **적절**: 학습한 모범 패턴과 일치
   - **검토 필요**: 개선 가능성 있음
   - **문제**: 학습한 안티패턴에 해당

3. 사용처 없으면: "프로젝트에서 '{topic}' 관련 코드를 찾지 못했습니다." → 종료
4. 사용자 확인 후 Phase 3 진입

## Phase 3: 진단 리포트

"검토 필요" 또는 "문제" 항목에 대해:

1. **현재 코드** — 해당 코드 스니펫 표시 (`file:line`, 5~15줄)
2. **진단** — 학습 내용 기반 평가:
   - 어떤 학습 내용과 관련되는지 (학습 기록 참조)
   - 현재 구현의 한계 또는 위험
   - 개선 시 기대 효과
3. **우선순위** — P1(개선 필요) / P2(개선 권장) / P3(참고)
4. **근거** — `file:line` + 학습 기록 경로 + 필요 시 WebSearch 출처

진단 요약:

| # | 위치 | 진단 | 우선순위 | 근거 |
|---|------|------|---------|------|
| 1 | Form.tsx:42 | ref callback 미사용 | P2 | study/react/useRef-실무-패턴-meta.md |

"적절" 항목도 간략히 왜 적절한지 설명한다 (학습 확인 효과).

사용자 확인 후 Phase 4 진입.

## Phase 4: 코칭 루프

진단 항목을 우선순위(P1→P2→P3) 순으로 하나씩 코칭한다.

각 항목에 대해:

**Step 1. 코드 제시 + 질문**
- 현재 코드 스니펫 표시 (`file:line`)
- "이 코드에서 어떤 점을 개선할 수 있을까요?" — 사용자가 먼저 생각

**Step 2. 사용자 답변 처리**
- **잘 파악함**: 인정 + 보충 → Step 3
- **부분적**: 맞는 부분 인정 + 학습 회고에서 힌트 → 재시도 → Step 3
- **모르겠음**: 관련 학습 내용 리마인드 → 힌트 → 재시도 → 그래도 모르면 AI 설명 → Step 3

**Step 3. 개선 방향 논의**
- **왜 개선하는가**: 현재 문제/한계 (`file:line` 인용)
- **어떻게 개선하는가**: before/after 코드 제안
- **왜 이 방법인가**: 대안 비교 + 학습 내용 근거
- **근거**: 학습 기록 경로 + 외부 출처

**Step 4. 결정**
사용자 결정:
- **수용** → Step 5
- **거부** → 사유 기록 → 다음 항목
- **보류** → 다음 항목

**Step 5. 수정 (선택)**

사용자가 AI 수정을 원하면:
- 변경 전 코드 확인 → 사용자 승인 → `Edit`으로 적용
- 최소 diff: 해당 개선 범위만 변경
- 기존 컨벤션 준수
- 한 항목 적용 후 다음으로

사용자가 직접 수정하겠다고 하면:
- 개선 코드만 제안하고 다음 항목

항목 완료 후 session-state.md 갱신 (completedItems++, decisions 추가).

## Phase 5: 정리 (`>>정리`)

1. 수정된 파일이 있으면 검증 실행:
   - `package.json` scripts: `test`, `typecheck`, `lint`
   - 검증 실패 시 수정 제안
2. 요약 문서 Write → `{project}/.study/apply/{Topic-Name}.md`
3. `session.appendLog(context, topic=<topic>, content=<요약>, via="via /apply")`
4. session-state.md → `# COMPLETED\n`

문서 템플릿:

```markdown
# {topic} 적용 리포트

> 주제: {topic}
> 프로젝트: {project-path}
> 일시: YYYY-MM-DD
> 학습 기록: {study files list}


## 학습 회고
{핵심 개념, 모범 패턴, 주의 사항 요약}

## 스캔 결과

| # | 파일 | 사용 형태 | 평가 |
|---|------|----------|------|

## 진단 및 코칭

### 항목 1: {위치} — {진단 요약}
- **현재 코드**: `file:line`
- **개선 방향**: ...
- **근거**: 학습 기록 + 외부 출처
- **결정**: 수용/거부/보류
- **수정**: 완료/미수정/사용자 직접

### 항목 2: ...


## 액션 아이템
- [ ] {사용자가 직접 수정할 항목}
- [x] {이미 수정 완료된 항목}

## 연결

| 대상 토픽 | 관계 | 근거 |
|-----------|------|------|
```

## 배너

매 응답 첫 줄:
```
> [APPLY] {topic} | {project-name} | 진단: {N}건 | 코칭: {완료}/{전체}
```

## 신호 규칙

- `>>다음` — 현재 항목 건너뛰고 다음으로
- `>>건너뛰기` — 현재 항목 보류
- `>>정리` / `>>끝` — 세션 종료 + Phase 5 실행
- 일반 대화 속 "다음", "정리", "끝"은 신호로 인식하지 않는다 (`>>` 접두사 필수).

## 규칙

- 학습 기록 우선: 진단/코칭 근거는 학습 기록을 먼저 참조한다
- 근거 없는 주장 금지: 모든 개선 제안에 `file:line` + 학습 기록 경로 또는 외부 출처 필수
- 코칭 우선: AI가 먼저 답을 말하지 않는다 — 코드 + 질문 → 사용자 사고 → AI 피드백
- 선택적 수정: 코드 수정은 사용자 확인 후에만 실행한다 (자동 수정 금지)
- 최소 diff: 수용된 범위만 변경, 주변 코드 정리/리팩터링 금지
- 기존 컨벤션 준수: 프로젝트의 코딩 스타일/패턴 유지
- `.gitignore`에 `.study/` 추가 안내 (첫 실행)
- session-state.md만 매 항목 완료 후 갱신, 나머지 쓰기는 `>>정리` 이후
