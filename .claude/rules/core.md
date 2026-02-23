# Core Rules (study-all)

## 목적
- 이 저장소의 기본 실행 인터페이스는 `.claude/skills/*/SKILL.md`다.
- 모든 학습/복습/계획 상태 계산은 study MCP 결과를 단일 진실 원천으로 사용한다.

## 필수 원칙
- Source-first: 설명에는 가능한 한 코드 경로(`file:line`)를 포함한다.
- MCP-first: `docs/` 수동 파싱으로 상태를 재구현하지 않는다.
- Minimal-change: 필요한 파일만 최소 diff로 수정한다.
- Safety: 쓰기 동작은 명시적 사용자 요청 또는 명시적 종료 신호("정리"/"끝") 이후 수행한다.

## 충돌 방지
- skill과 command 동명이인 충돌을 피하기 위해 command는 `legacy-*` 이름만 유지한다.
- 기본 실행은 skill 이름(`/learn`, `/review` 등) 기준으로 안내한다.
