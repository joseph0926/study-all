---
description: "프로젝트 딥스터디 플랜 — MCP project mode 기반"
argument-hint: "<project-path>"
---

# /project-study — 프로젝트 학습 플랜

## 목적
- 프로젝트 구조를 분석하고 `.study/plan.md` 학습 플랜을 운영한다.

## 입력
- `$ARGUMENTS`: `<project-path>`

## MCP Execution Mode (필수)
1. `context.resolve`
```json
{
  "mode": "project",
  "projectPath": "{projectPath}"
}
```
2. `progress.getModuleMap`
3. `progress.getCoverageMap`
4. `progress.getNextTopic` (plan 존재 시)
5. 완료 체크는 `progress.updateCheckbox`

## 운영 규칙
- 인벤토리/커버리지 계산은 MCP 결과만 사용
- 프로젝트 소스는 읽기 전용, `.study/*`만 생성/수정
- 완료 상태는 체크박스가 아닌 MCP 호출로 반영

## 금지
- 프로젝트 파일을 임의 수정하지 않는다.
- 모듈 추출/커버리지 계산을 프롬프트에서 재구현하지 않는다.
