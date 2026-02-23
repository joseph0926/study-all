---
name: project-study
description: 프로젝트 학습 플랜을 project mode MCP로 생성/운영한다.
argument-hint: "<project-path>"
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, mcp__study__context.resolve, mcp__study__progress.getModuleMap, mcp__study__progress.getCoverageMap, mcp__study__progress.getNextTopic, mcp__study__progress.updateCheckbox
---

입력: `$ARGUMENTS` (`<project-path>`)

실행 순서:
1. `context.resolve(mode=project)`
2. `progress.getModuleMap`
3. `progress.getCoverageMap`
4. plan 존재 시 `progress.getNextTopic`
5. 완료 체크는 `progress.updateCheckbox`

규칙:
- 프로젝트 소스는 읽기 전용, `.study/*`만 생성/수정한다.
- 모듈/커버리지 계산은 MCP 결과를 사용한다.
