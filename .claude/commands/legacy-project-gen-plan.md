---
description: "LEGACY shim - 프로젝트 plan.md 생성/갱신 — MCP project mode 기반"
argument-hint: "<project-path>"
---

# /legacy-project-gen-plan — 프로젝트 plan.md 생성

## 목적
- 프로젝트 소스를 분석하여 `{project}/.study/plan.md`를 생성/갱신한다.

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
4. `progress.getPlan` (plan 존재 시)

## 운영 규칙
- 인벤토리/커버리지 계산은 MCP 결과만 사용
- 프로젝트 소스는 읽기 전용, `.study/*`만 생성/수정
- 기존 plan.md가 있으면 사용자 확인 후 갱신/재생성

## 금지
- 프로젝트 파일을 임의 수정하지 않는다.
- 모듈 추출/커버리지 계산을 프롬프트에서 재구현하지 않는다.
