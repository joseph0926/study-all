---
title: "jd-daangn-mid-mock-interview"
status: active
---
# jd-daangn-mid-mock-interview

> Latest score: 60/100
> Threshold: 75
> Result: below bar
> Rating: borderline
> Date: 2026-03-11

## Weak Concepts

- `이벤트 스키마 dedupe key와 PII guardrail 설계`: 계약 framing은 있었지만 dedupe key, 금지 payload, retry cutoff를 구체화하지 못함 / evidence: Q3
- `위험한 mutation의 idempotency와 optimistic update 금지 기준`: 아이템 지급 같은 위험한 mutation에서 optimistic update 금지 조건과 idempotency 설계가 약함 / evidence: Q5
- `configuration-driven 구조에서 타입 고정 영역과 설정 오픈 영역의 경계`: 공통 모델과 설정 기반 구조는 설명했지만 override limit와 고정 영역 기준이 더 필요함 / evidence: Q1
- `성능 개선 후 cross-route 회귀 검증과 청크 전략 비교`: 병목 측정은 했지만 manual chunk 선택 이유와 회귀 검증을 끝까지 설명하지 못함 / evidence: Q6

## Retested Concepts

- 없음

## Current Session

- interview artifact: `interview/5/feedback.md`
- transcript artifact: `interview/5/transcript.md`
- prep brief: `interview/5/prep-brief.md`

## Session History

| Date | Score | Threshold | Result | Rating |
|---|---:|---:|---|---|
| 2026-03-10 | 25 | 75 | below bar | no hire yet |
| 2026-03-11 | 60 | 75 | below bar | borderline |

> Prior comparison: 2026-03-10 세션 대비 구조화와 사례 설명은 좋아졌지만, reliability/instrumentation 정책 수준 답변은 아직 더 보완이 필요함.
