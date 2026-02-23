---
description: "스킬 딥스터디/레퍼런스 검증 — MCP 인벤토리 기반"
argument-hint: "<skill-name>"
---

# /study-skill — 스킬 검증/개선

## 목적
- 스킬 소스 대비 레퍼런스 커버리지를 점검하고 개선 우선순위를 제시한다.

## 입력
- `$ARGUMENTS`: `<skill>`

## MCP Execution Mode (필수)
1. `context.resolve` (mode=skill)
2. `progress.getModuleMap`
3. `progress.getCoverageMap`
4. `progress.getPlan`

## 운영 규칙
- MODULE_MAP/COVERAGE_MAP은 MCP 결과를 그대로 사용한다.
- 누락 모듈, 과잉 레퍼런스, 우선순위 3개를 제시한다.
- 체크 완료 시 `progress.updateCheckbox`로만 상태 반영한다.

## 출력 형식
- Coverage 요약
- 즉시 개선 3건
- 다음 세션 action items

## 금지
- ref 디렉토리 수동 스캔으로 MODULE_MAP 재계산 금지
- plan.md 체크박스 직접 편집 금지
