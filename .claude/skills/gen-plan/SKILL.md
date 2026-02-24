---
name: gen-plan
description: 스킬 소스 분석 후 docs/{skill}/plan.md를 생성/갱신한다.
argument-hint: "<skill-name>"
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Write, Edit, mcp__study__context_resolve, mcp__study__progress_getModuleMap, mcp__study__progress_getCoverageMap, mcp__study__progress_getPlan
---

입력: `$ARGUMENTS` (`<skill>`)

실행 순서:
1. `context.resolve(mode=skill)` → docsDir, sourceDir 확인
2. `progress.getModuleMap` → 모듈 목록, 파일 수, 진입점
3. `progress.getCoverageMap` → covered/uncovered/orphan
4. 기존 `docs/{skill}/plan.md` 유무 확인:
   - **없으면**: 신규 생성
   - **있으면**: `progress.getPlan`으로 읽고 사용자에게 갱신/재생성 확인
5. plan.md 작성 → `docs/{skill}/plan.md`

생성 포맷 (plan-parser.ts 호환 필수):
- `# {Skill} Study Plan` — 제목
- `## Coverage Analysis` — Status(`✅`/`⬜`/`🔗`) | Module | Skill Target 테이블
- `## Phase N: {Phase Name}` — 모듈 그룹핑 (사용자 입력으로 조정 가능)
- `### Topic N: {Module Name}` — Source Files 테이블 + `- [ ] Step` 체크박스
- `## Topic-Docs Mapping` — 기존 학습 기록 매핑
- `## Verification` — 검증 방법

규칙:
- MODULE_MAP/COVERAGE_MAP 계산은 MCP 결과만 사용한다.
- 기존 plan.md가 있을 때 사용자 확인 없이 덮어쓰기 금지.
- 기존 학습 기록(`docs/{skill}/*.md`)이 있으면 Topic-Docs Mapping에 반영한다.
