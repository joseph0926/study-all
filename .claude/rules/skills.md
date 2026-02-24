# Skills Rules

## 기본 인터페이스
- `/study <주제>` — 소스코드 기반 딥 학습
- `/review <스킬> [토픽]` — 복습 세션
- `/dashboard` — 학습 대시보드

## 실행 규칙
- 각 skill의 `allowed-tools` 범위를 넘어서는 도구 호출을 추가하지 않는다.
- 쓰기형 skill(`study`, `review`)은 `disable-model-invocation: true`를 유지한다.
- 읽기형 skill(`dashboard`)은 집계/추천을 MCP 결과로만 출력한다.
