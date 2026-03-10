# Skills Rules

## 기본 인터페이스
- `/routine [project-path] [주제]` — 메인 학습 파이프라인 (learn→study→coding→checkpoint→review)
- `/learn [project-path] <질문>` — 즉석 Q&A 학습
- `/review <스킬> [토픽]` — 복습 세션
- `/project <경로> [영역]` — 프로젝트 소스 분석 → 개선
- `/test [skill] [level]` — 코딩 테스트 → 4축 평가
- `/loop-code [project-path] <목표>` — 자연어 목표 → 피드백 루프 계획 → 섹션별 코딩+검증

## 실행 규칙
- 각 skill의 `allowed-tools` 범위를 넘지 않는다.
- active skill(`routine`, `learn`, `review`, `project`, `test`, `loop-code`)은 `disable-model-invocation: true`를 유지한다.
