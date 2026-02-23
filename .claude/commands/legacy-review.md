---
description: "LEGACY shim - 학습 기록 기반 복습 — MCP 간격반복 연동"
argument-hint: "<skill-name> [topic]"
---

# /legacy-review — 적응형 복습 세션

## 목적
- 복습 대기열 기반으로 한 문제씩 출제하고 결과를 기록한다.

## 입력
- `$ARGUMENTS`: `<skill> [topic]`

## MCP Execution Mode (필수)
1. `context.resolve` (mode=skill)
2. `review.getQueue`
3. topic 지정 시 `review.getMeta` (없으면 초기 메타 생성)
4. 문제별 판정 후 `review.recordResult`
5. 세션 종료 시 필요하면 `review.saveMeta`

## 점수 매핑 규칙
- 오답: `wrong`
- 힌트 후 정답/재시도 통과: `retry_pass`
- 첫 시도 정답: `first_pass`

## 진행 규칙
- 매 턴: 질문 1개 → 답변 평가 → 즉시 피드백
- 사용자가 "정리"라고 하면 세션 요약 후 종료
- 간격/레벨 계산은 MCP 결과를 그대로 사용

## 금지
- `-meta.md` 직접 파싱으로 간격 계산 금지
- 난이도/streak 계산을 프롬프트에서 재구현 금지
