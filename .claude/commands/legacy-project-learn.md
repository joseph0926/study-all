---
description: "LEGACY shim - 프로젝트 소스 기반 튜터링 — MCP 재개점/기록 연동"
argument-hint: "<project-path> <topic>"
---

# /legacy-project-learn — 프로젝트 소스 튜터링

## 목적
- 프로젝트 코드를 학습 대상으로 설명하고 Q&A를 진행한다.
- 재개점/기록/진행 상태는 MCP로 처리한다.

## 입력
- `$ARGUMENTS`: `<project-path> <topic>`

## MCP Execution Mode (필수)
1. `context.resolve(mode=project)`
2. `session.getResumePoint`
3. `session.getSourcePaths`
4. `progress.getPlan`
5. 저장 시 `session.appendLog`
6. 완료 step 반영 시 `progress.updateCheckbox`

## 운영 규칙
- 설명은 프로젝트 실제 코드 근거를 포함한다.
- 개선 포인트는 "현재 구현"과 "일반 관례"를 분리해서 설명한다.
- 사용자가 "정리" 또는 "끝"을 말하면 저장 단계를 수행한다.

## 금지
- 프로젝트 소스 파일 직접 수정 금지
- 세션 상태를 `.study/*.md` 직접 파싱/직접 체크박스 수정으로 갱신 금지
