# Skills Rules

## 기본 인터페이스
- `/routine [project-path] [주제]` — 메인 학습 파이프라인 (learn→study→coding→checkpoint→review)
- `/learn [project-path] <질문>` — 즉석 Q&A 학습
- `/src [project-path] <주제>` — 소스코드 패턴 리딩 (패턴 발견 → 사고 → 미니 코딩)
- `/review <스킬> [토픽]` — 복습 세션
- `/dashboard` — 학습 대시보드
- `/project <경로> [영역]` — 프로젝트 소스 분석 → 개선
- `/test [skill] [level]` — 코딩 테스트 → 4축 평가

## 실행 규칙
- 각 skill의 `allowed-tools` 범위를 넘지 않는다.
- 쓰기형 skill(`routine`, `learn`, `src`, `review`, `project`, `test`)은 `disable-model-invocation: true`를 유지한다.
- 읽기형 skill(`dashboard`)은 MCP 결과로만 출력한다.
- `/project`는 `/dashboard`와 통합하지 않는다.
