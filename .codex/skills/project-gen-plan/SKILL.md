---
name: project-gen-plan
description: 프로젝트 소스 분석 후 {project}/.study/plan.md를 생성/갱신한다. Codex에서는 `$project-gen-plan <project-path>`로 호출한다.
---

# project-gen-plan

입력: `$project-gen-plan <project-path>`

실행 순서:
1. `mcp__study__context_resolve(mode=project)` → studyDir, sourceDir 확인
2. `mcp__study__progress_getModuleMap` → 프로젝트 모듈 분석
3. `mcp__study__progress_getCoverageMap` → 커버리지 분석
4. 기존 `.study/plan.md` 유무 확인:
   - **없으면**: 신규 생성
   - **있으면**: `mcp__study__progress_getPlan`으로 읽고 사용자에게 갱신/재생성 확인
5. plan.md 작성 → `{project}/.study/plan.md`

생성 포맷 (plan-parser.ts 호환 필수):
- `# {Project} Study Plan` — 제목
- `## Coverage Analysis` — Status(`✅`/`⬜`/`🔗`) | Module | Skill Target 테이블
- `## Phase N: {Phase Name}` — 모듈 그룹핑
- `### Topic N: {Module Name}` — Source Files 테이블 + `- [ ] Step` 체크박스
- `## Verification` — 검증 방법

금지:
- 프로젝트 소스는 읽기 전용, `.study/*`만 생성/수정한다.
- MCP 결과 없이 모듈/커버리지 계산 금지.
- 기존 plan.md가 있을 때 사용자 확인 없이 덮어쓰기 금지.
