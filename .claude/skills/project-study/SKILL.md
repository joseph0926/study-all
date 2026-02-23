---
name: project-study
description: 프로젝트 학습 플랜을 project mode MCP로 생성/운영한다.
argument-hint: "<project-path>"
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, WebSearch, WebFetch, mcp__study__context_resolve, mcp__study__progress_getModuleMap, mcp__study__progress_getCoverageMap, mcp__study__progress_getNextTopic, mcp__study__progress_updateCheckbox
---

입력: `$ARGUMENTS` (`<project-path>`)

실행 순서:
1. `context.resolve(mode=project)`
2. `progress.getModuleMap`
3. `progress.getCoverageMap`
4. plan 존재 시 `progress.getNextTopic`
5. 완료 체크는 `progress.updateCheckbox`

분석 규칙:
- 모듈/커버리지 분석 후 개선 우선순위도 함께 제시한다.
- 안티패턴, 구조적 문제, 성능/보안 이슈가 보이면 근거와 함께 제안한다.
- 근거가 필요하면 WebSearch로 공식 문서/업계 관례를 확인한다.

금지:
- 프로젝트 소스는 읽기 전용, `.study/*`만 생성/수정한다.
- 모듈/커버리지 계산은 MCP 결과를 사용한다.
