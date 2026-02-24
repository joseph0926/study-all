---
name: study
description: 소스코드 기반 딥 학습 — 토픽 제안 → 선택 → 설명+Q&A → 대화 기록. Codex에서는 `$study <주제>`로 호출한다.
---

# study

입력: `$study <주제>` (예: `react`, `nextjs`)

실행 순서:

1. `mcp__study__context_resolve(mode=skill, skill=$ARGUMENTS)`로 컨텍스트 확인
2. `ref/` 소스코드 탐색 + `study/<주제>/` 기존 파일 확인 (이미 학습한 토픽 파악)
3. **소스코드를 봐야 차이가 나는 토픽 5~8개** 제안
4. 사용자가 선택
5. 서브토픽 → 마이크로서브토픽 단위로 소스코드 기반 설명 + Q&A
6. 종료("정리"/"끝") 시:
   - `mcp__study__session_appendLog` → `study/<주제>/<토픽명>.md`에 대화 원문 기록 (오타 수정만)
   - `mcp__study__review_saveMeta` → `study/<주제>/<토픽명>-meta.md` 생성/갱신

토픽 제안 기준:
- 좋은 예: "왜 useState는 큐 기반인가?", "Suspense는 Promise를 어떻게 잡는가?"
- 나쁜 예: "useState 사용법", "공식 문서에 다 나오는 내용"
- 이미 학습한 토픽(`study/<주제>/` 내 기존 .md)은 제외

규칙:
- 상태 계산은 MCP 결과를 단일 진실 원천으로 사용한다.
- 설명에는 가능한 한 코드 경로(`file:line`)를 포함한다.
- Q&A 원문은 오타 수정만 하고 그대로 기록한다.
