# MCP 구현 & 커맨드 리뷰 — 범위 분할

> 2026-02-23 | 검토 대상: plan/mcp.md 설계 vs mcp/ 구현 vs .claude/commands/

## 검토 범위 (6개)

### Scope 1: MCP SDK 통합 (index.ts)
- **근거**: SDK v1.26.0에서 `server.tool()` → deprecated, `registerTool()`이 새 API
- **방향**: API 마이그레이션 필요성, 타입 캐스팅 제거, import 방식 검증
- **결과**: `temp/feedback-1-sdk-integration.md`

### Scope 2: 타입 안전성 & 빌드
- **근거**: `pnpm typecheck`에서 13개 에러 발생 (exactOptionalPropertyTypes, undefined narrowing)
- **방향**: strictness 레벨 적절성, 에러 원인 분류, 수정 방향
- **결과**: `temp/feedback-2-type-safety.md`

### Scope 3: 파서 정확성 & 테스트
- **근거**: vitest 4/34 테스트 실패 (session-parser 3개, session tool 1개)
- **방향**: fixture와 파서 간 불일치 원인, expected JSON 정합성, 엣지케이스
- **결과**: `temp/feedback-3-parsers.md`

### Scope 4: Tool 구현 품질
- **근거**: plan/mcp.md 설계 스키마 vs 실제 구현 비교, Clock 주입 일관성
- **방향**: 설계-구현 갭, 에러 핸들링, 캐시 전략, 시간 의존성
- **결과**: `temp/feedback-4-tools.md`

### Scope 5: .claude/commands MCP 통합
- **근거**: 각 커맨드의 "MCP Execution Mode" 섹션과 실제 도구 스키마 매칭
- **방향**: 커맨드-도구 매핑 정확성, 프롬프트 축소 효과, 누락된 연결
- **결과**: `temp/feedback-5-commands.md`

### Scope 6: 아키텍처 & 설계 정합성
- **근거**: plan/mcp.md의 전체 아키텍처 vs 구현 상태 비교
- **방향**: 구현 순서 대비 현재 진행도, 누락된 기능, 컷오버 게이트 충족 여부
- **결과**: `temp/feedback-6-architecture.md`
