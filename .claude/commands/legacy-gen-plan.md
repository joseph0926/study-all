---
description: "LEGACY shim - 스킬 plan.md 생성/갱신 — MCP 인벤토리 기반"
argument-hint: "<skill-name>"
---

# /legacy-gen-plan — 스킬 plan.md 생성

## 목적
- 스킬 소스를 분석하여 `docs/{skill}/plan.md`를 생성/갱신한다.

## 입력
- `$ARGUMENTS`: `<skill>`

## MCP Execution Mode (필수)
1. `context.resolve` (mode=skill)
2. `progress.getModuleMap`
3. `progress.getCoverageMap`
4. `progress.getPlan` (기존 plan 존재 시)

## 운영 규칙
- MODULE_MAP/COVERAGE_MAP은 MCP 결과를 그대로 사용한다.
- 기존 plan.md가 있으면 사용자 확인 후 갱신/재생성한다.
- plan-parser.ts 호환 포맷으로 생성한다.

## 출력
- `docs/{skill}/plan.md` 생성 또는 갱신

## 금지
- ref 디렉토리 수동 스캔으로 MODULE_MAP 재계산 금지
- 기존 plan.md 무단 덮어쓰기 금지
