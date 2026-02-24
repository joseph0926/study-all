---
name: project
description: 프로젝트 소스 분석 → 개선점 도출 → 논의 → 문서화
argument-hint: "<project-path> [area]"
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Bash, WebSearch, WebFetch, mcp__study__context_resolve, mcp__study__config_get, mcp__study__session_getResumePoint, mcp__study__session_getSourcePaths, mcp__study__session_appendLog, mcp__study__progress_getPlan, mcp__study__progress_updateCheckbox, mcp__study__progress_getModuleMap
---

입력: `$ARGUMENTS` (예: `/path/to/project`, `/path/to/project error-handling`)

## Phase 0: 초기화

1. `$ARGUMENTS`에서 `<project-path>` + 선택적 `[area]` 파싱
2. `context.resolve(mode=project, projectPath=<project-path>)` 호출
3. `{project}/.study/plan.md` 존재 여부 확인
4. 첫 실행이면 `.gitignore`에 `.study/` 추가 안내

분기:
- area 없고 plan.md 없음 → Phase 1
- area 없고 plan.md 있음 → Phase 1-B
- area 있음 → Phase 2

## Phase 1: 구조 분석 (area 없고 plan.md 없을 때)

1. `progress.getModuleMap` + 핵심 파일 탐색
2. 분석 영역 5~8개 도출하여 제안
3. 사용자 확인 후 `{project}/.study/plan.md` 생성

plan.md 포맷 (plan-parser.ts 호환):
```markdown
## Phase 1: <project-name> 분석

### Topic 1: <area-name>
- [ ] Step 1: 구조 분석
- [ ] Step 2: 개선점 도출
- [ ] Step 3: 논의 완료
- [ ] Step 4: 문서화

### Topic 2: ...
```

## Phase 1-B: 영역 선택 (area 없고 plan.md 있을 때)

1. `progress.getPlan`으로 기존 계획 로드
2. 미완료 영역 목록 표시 → 사용자 선택 → Phase 2

## Phase 2: 심층 분석 (area 지정)

1. 해당 영역 소스코드 집중 탐색
2. 개선점 도출 — **모든 주장에 근거 필수** (`file:line` 또는 WebSearch 출처)
3. 구조화된 결과 제시:
   - 현재 구현: 코드 경로 포함 설명
   - 개선 제안: P1(높음)/P2(중간)/P3(낮음) 우선순위
   - 근거: 소스코드 참조 또는 외부 출처

## Phase 3: 논의

- 사용자와 개선점별 토론
- 각 제안에 대해 수용/거부/보류 결정

## Phase 4: 문서화 (종료 시)

종료("정리"/"끝") 시:
1. `session.appendLog(via="via /project")` → `{project}/.study/{Area-Name}.md`에 기록
2. `progress.updateCheckbox` → `plan.md` 갱신

기록 포맷:
```markdown
### 분석 요약
[영역 전체 분석]

### 현재 구현
[코드 경로 포함 설명]

### 개선 제안
| 우선순위 | 제안 | 근거 | 상태 |
|---------|------|------|------|
| P1 | ... | `src/...:42` + [참조] | 수용/거부/보류 |

### 논의 기록
[핵심 논의 내용]

### 최종 결정
- [수용] ...
- [거부] ...
- [보류] ...
```

## 규칙

- 근거 없는 주장 금지 — 모든 개선 제안에 `file:line` 또는 WebSearch 출처 필수
- 상태 계산은 MCP 결과를 단일 진실 원천으로 사용한다
- `/dashboard`와 통합하지 않음
- `.gitignore`에 `.study/` 추가 안내 (첫 실행)
