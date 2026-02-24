---
name: project
description: 프로젝트 소스 분석 → 개선점 도출 → 논의 → 수정 → 검증 → 문서화
argument-hint: "<project-path> [area]"
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Bash, Write, Edit, WebSearch, WebFetch, mcp__study__context_resolve, mcp__study__config_get, mcp__study__session_getResumePoint, mcp__study__session_getSourcePaths, mcp__study__session_appendLog, mcp__study__progress_getPlan, mcp__study__progress_updateCheckbox, mcp__study__progress_getModuleMap
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
- [ ] Step 4: 구현 완료
- [ ] Step 5: 검증 통과
- [ ] Step 6: 문서화

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
- 수용된 항목이 있으면 Phase 4로 진행

## Phase 4: 구현 (수용된 개선 항목)

수용된 개선 항목을 **하나씩** 적용한다.

1. 수용 항목 목록을 우선순위(P1→P2→P3) 순으로 정렬
2. 각 항목에 대해:
   - 변경 전 코드 상태를 사용자에게 보여줌 (`file:line` 인용)
   - 변경 내용을 설명하고 사용자 확인 후 `Edit`/`Write`로 적용
   - **한 항목 적용 후 다음으로 넘어감** — 여러 항목을 한번에 수정하지 않는다
3. 사용자가 "건너뛰기"를 말하면 해당 항목을 보류로 전환

수정 원칙:
- 최소 diff: 수용된 범위만 변경, 주변 코드 정리/리팩터링 금지
- 기존 컨벤션 준수: 프로젝트의 코딩 스타일/패턴 유지
- 파괴적 변경 시 사전 경고: 외부 인터페이스/API 시그니처 변경 시 영향 범위 고지

## Phase 5: 검증

모든 수정 적용 후 변경이 정상인지 확인한다.

1. 프로젝트 검증 명령 탐색 (우선순위):
   - `package.json` scripts: `test`, `typecheck`, `lint`
   - 프레임워크별: `tsc --noEmit`, `eslint .`, `pytest` 등
   - 검증 명령이 없으면 사용자에게 확인
2. 발견된 검증 명령 실행 (Bash)
3. 결과 보고:
   - 통과 → Phase 6 진행
   - 실패 → 실패 원인 분석 + 수정 제안 → 사용자 확인 후 재수정 또는 롤백
4. 롤백: 검증 실패 시 사용자 요청에 따라 `git checkout -- <file>` 등으로 복원 가능 (사용자 확인 필수)

## Phase 6: 문서화 (종료 시)

종료(`>>정리` 또는 `>>끝`) 시:
1. `session.appendLog(via="via /project")` → `{project}/.study/{Area-Name}.md`에 기록
2. `progress.updateCheckbox` → `plan.md` 갱신

기록 포맷:
```markdown
### 분석 요약
[영역 전체 분석]

### 현재 구현
[코드 경로 포함 설명]

### 개선 제안
| 우선순위 | 제안 | 근거 | 결정 | 구현 |
|---------|------|------|------|------|
| P1 | ... | `src/...:42` + [참조] | 수용 | 완료 |
| P2 | ... | `src/...:10` + [참조] | 거부 | — |
| P3 | ... | `src/...:55` + [참조] | 보류 | — |

### 논의 기록
[핵심 논의 내용]

### 변경 내역
| 파일 | 변경 | 검증 |
|------|------|------|
| `src/...:42` | [변경 설명] (+N, -M) | pass |

### 최종 결정
- [수용/완료] ...
- [수용/보류] ... (사유)
- [거부] ...
- [보류] ...
```

사용자 신호 규칙:
- `>>다음` — 다음 개선 항목 또는 다음 Phase로 전환
- `>>정리` 또는 `>>끝` — 세션 종료 + Phase 6 실행
- `>>건너뛰기` — 현재 개선 항목을 보류로 전환
- 일반 대화 속 "다음", "정리", "끝"은 신호로 인식하지 않는다 (`>>` 접두사 필수).

## 규칙

- 근거 없는 주장 금지 — 모든 개선 제안에 `file:line` 또는 WebSearch 출처 필수
- 상태 계산은 MCP 결과를 단일 진실 원천으로 사용한다
- `/dashboard`와 통합하지 않음
- `.gitignore`에 `.study/` 추가 안내 (첫 실행)
- 코드 수정은 사용자 확인 후에만 실행한다 (자동 수정 금지)
