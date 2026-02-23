---
name: project-study
description: 프로젝트 학습 플랜을 project mode MCP로 생성/운영한다. Codex에서는 `$project-study <project-path>`로 호출한다.
---

# project-study

입력: `$project-study <project-path>`

실행 순서:
1. `mcp__study__context.resolve(mode=project)`
2. `mcp__study__progress.getModuleMap`
3. `mcp__study__progress.getCoverageMap`
4. plan 존재 시 `mcp__study__progress.getNextTopic`
5. 완료 체크는 `mcp__study__progress.updateCheckbox`

규칙:
- 프로젝트 소스는 읽기 전용, `.study/*`만 생성/수정
- 모듈/커버리지 계산은 MCP 결과를 사용
