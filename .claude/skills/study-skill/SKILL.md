---
name: study-skill
description: 스킬 레퍼런스 커버리지를 MODULE_MAP/COVERAGE_MAP 기반으로 검증한다.
argument-hint: "<skill-name>"
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, mcp__study__context.resolve, mcp__study__progress.getModuleMap, mcp__study__progress.getCoverageMap, mcp__study__progress.getPlan, mcp__study__progress.updateCheckbox
---

입력: `$ARGUMENTS` (`<skill>`)

실행 순서:
1. `context.resolve(mode=skill)`
2. `progress.getModuleMap`
3. `progress.getCoverageMap`
4. `progress.getPlan`
5. 누락 모듈/과잉 레퍼런스/우선순위 3건 제시
6. 완료 체크는 `progress.updateCheckbox`

규칙:
- MODULE_MAP/COVERAGE_MAP 계산은 MCP 결과를 그대로 사용한다.
- `plan.md` 직접 편집으로 체크 상태를 바꾸지 않는다.
