# Skills Rules

## 기본 인터페이스
- `/study <주제>` — 소스코드 기반 딥 학습
- `/learn <질문>` — 자유 Q&A 기반 학습 (ref/웹/추론 → 문서화)
- `/forge <스킬> [범위]` — 산발적 학습을 통합 멘탈모델 + 판단 프레임워크로 결정화
- `/review <스킬> [토픽]` — 복습 세션
- `/dashboard` — 학습 대시보드
- `/project <경로> [영역]` — 프로젝트 소스 분석 → 개선점 도출 → 논의 → 문서화
- `/project-learn <경로> <질문>` — 프로젝트 코드베이스 자유 Q&A (소스/문서/git/웹/추론 → 문서화)
- `/project-routine <경로> [주제]` — 프로젝트 대상 learn → study → checkpoint → forge 오케스트레이션
- `/routine [주제]` — learn → study → checkpoint → forge 파이프라인 오케스트레이션
- `/test [skill] [level]` — 학습 기반 코딩 테스트 → 4축 평가 → 레벨 프로파일 갱신

## 실행 규칙
- 각 skill의 `allowed-tools` 범위를 넘어서는 도구 호출을 추가하지 않는다.
- 쓰기형 skill(`study`, `learn`, `forge`, `review`, `project`, `project-learn`, `project-routine`, `routine`, `test`)은 `disable-model-invocation: true`를 유지한다.
- 읽기형 skill(`dashboard`)은 집계/추천을 MCP 결과로만 출력한다.
- `/project`는 `/dashboard`와 통합하지 않는다.
