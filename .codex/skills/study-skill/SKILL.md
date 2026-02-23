---
name: study-skill
description: 스킬 레퍼런스 커버리지를 MODULE_MAP/COVERAGE_MAP 기반으로 검증한다. Codex에서는 `$study-skill <skill-name>`으로 호출한다.
---

# study-skill

입력: `$study-skill <skill>`

실행 순서:
1. `mcp__study__context.resolve(mode=skill)`
2. `mcp__study__progress.getModuleMap`
3. `mcp__study__progress.getCoverageMap`
4. `mcp__study__progress.getPlan`
5. 누락 모듈/과잉 레퍼런스/우선순위 3건 제시
6. 완료 체크는 `mcp__study__progress.updateCheckbox`

규칙:
- MODULE_MAP/COVERAGE_MAP 계산은 MCP 결과를 그대로 사용
- `plan.md` 직접 편집으로 체크 상태를 바꾸지 않음
