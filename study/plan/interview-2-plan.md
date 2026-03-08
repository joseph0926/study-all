# Interview 2 Study Plan

> Source: `some/interview/2/feedback.md`, `some/interview/2/transcript.md`
> Date: 2026-03-08

## Summary

이번 회차는 `learn` 4개, `routine` 3개가 적합합니다.

- `learn`: 단일 개념을 근거와 함께 정리해야 하는 주제
- `routine`: 구현, 드릴, 체크포인트까지 포함해 반복 훈련해야 하는 주제

## Learn

### 1. 사용자 체감 성능 지표 매핑

- 범위: `LCP/INP/CLS`, long task, waterfall, React commit time, bundle diff
- 이유: Q1에서 대응 절차는 있었지만 "어떤 지표를 왜 먼저 보는가"가 비어 있었음
- 근거: `feedback.md:21`, `feedback.md:33`

### 2. 병목 확정용 측정/검증 프레임

- 범위: Chrome Performance panel, React Profiler, Network waterfall, 배포 diff, rollback 기준
- 이유: 지표 이름은 나왔지만 도구, 임계값, 검증 기준까지 연결되지 않았음
- 근거: `feedback.md:22`, `feedback.md:34`

### 3. 비동기 request lifecycle 상태 모델

- 범위: `debounce`, `abort`, `requestId/latest-wins`, `loading/error/empty/success`, retry
- 이유: `autocomplete` 질문에서 답변이 중단되었고, race condition을 상태 전이로 묶지 못했음
- 근거: `feedback.md:23`, `feedback.md:35`, `transcript.md:41-45`

### 4. WAI-ARIA combobox/listbox 패턴

- 범위: `aria-expanded`, `aria-controls`, `aria-activedescendant`, focus 관리, `ArrowUp/ArrowDown/Enter/Escape`
- 이유: 접근성 인터랙션 설계와 키보드 동작 설명이 막힘
- 근거: `feedback.md:23`, `feedback.md:36`

## Routine

### 1. 배포 후 느려진 페이지 진단 실전

- 목표: `증상 분류 -> 지표 선택 -> 도구 확인 -> 원인 확정 -> 최적화 후보 -> 재검증`을 3분 답변과 DevTools 실습으로 반복
- 이유: 이 축은 개념 암기보다 적용 훈련이 중요함
- 근거: `feedback.md:40`, `feedback.md:47`

### 2. autocomplete 설계/구현/테스트

- 목표: mocked fetch로 `debounce`, `abort`, `stale response`, loading/error/empty state, keyboard navigation, 접근성 테스트까지 한 세션으로 연습
- 이유: Q2 전체 축이 실전 적용 단계에서 불안정함
- 근거: `feedback.md:41`, `feedback.md:46`, `feedback.md:48`

### 3. combobox 접근성 재구현 드릴

- 목표: APG 기준으로 직접 구현하고 `aria-activedescendant`, focus 이동, 키보드 테스트까지 검증
- 이유: 단순 role 암기보다 반복 구현이 필요한 상태임
- 근거: `feedback.md:42`, `feedback.md:48`

## Priority

1. `learn`: 사용자 체감 성능 지표 매핑
2. `learn`: 비동기 request lifecycle 상태 모델
3. `routine`: autocomplete 설계/구현/테스트

## Note

React 리렌더링 내부 구현 자체는 이미 학습 기록이 있으므로 이번 우선순위는 브라우저 성능 지표, 비동기 UI 안정성, 접근성 설계 쪽에 둡니다.
