---
description: "LEGACY shim - 프로젝트 학습 기록 복습 — MCP 간격반복 연동"
argument-hint: "<project-path> [topic]"
---

# /legacy-project-review — 프로젝트 복습 세션

## 목적
- `.study/` 학습 기록 기반으로 복습 질문을 출제하고 결과를 기록한다.

## 입력
- `$ARGUMENTS`: `<project-path> [topic]`

## MCP Execution Mode (필수)
1. `context.resolve(mode=project)`
2. `review.getQueue`
3. topic 지정 시 `review.getMeta` (없으면 초기화)
4. 문제별 판정 후 `review.recordResult`
5. 세션 종료 시 필요하면 `review.saveMeta`

## 점수 매핑 규칙
- 오답: `wrong`
- 힌트 후 통과: `retry_pass`
- 첫 시도 통과: `first_pass`

## 운영 규칙
- 한 번에 한 문제씩 진행
- 사용자가 "정리"를 말하면 세션 요약 후 종료
- 간격/난이도 계산은 MCP 결과를 그대로 사용

## 금지
- `.study/*-meta.md` 수동 파싱으로 간격 계산 금지
- 프로젝트 소스 직접 수정 금지
