---
name: study
description: 소스코드 기반 딥 학습 — plan.md 기반 로드맵 → 설명+Q&A → 대화 기록. Codex에서는 `$study <주제>`로 호출한다.
---

# study

입력: `$study <주제>` (예: `react`, `nextjs`)

실행 순서:

0. `study/<주제>/plan.md` 존재 여부 확인
1. `mcp__study__context_resolve(mode=skill, skill=$ARGUMENTS)`로 컨텍스트 확인
2. `mcp__study__session_getSourceDigest(context, skill)`로 소스 트리 요약 + 기존 토픽 목록을 캐시에서 조회 (캐시 미스 시 자동 빌드)
3. **소스코드를 봐야 차이가 나는 토픽 5~8개** 제안
4. [plan.md 분기]
   - **plan.md 없음** → `study/<주제>/plan.md` 생성 (제안 토픽 목록 + 학습 로드맵 체크리스트)
   - **plan.md 있음** → plan.md 업데이트 및 개선 검토 (새 토픽 추가, 완료 체크, 순서 조정 등을 사용자와 논의)
5. plan.md의 다음 미완료 토픽부터 서브토픽 → 마이크로서브토픽 단위로 소스코드 기반 설명 + Q&A
6. 종료("정리"/"끝") 시:
   - `mcp__study__session_appendLog` → `study/<주제>/<토픽명>.md`에 대화 원문 기록 (오타 수정만)
   - `mcp__study__review_saveMeta` → `study/<주제>/<토픽명>-meta.md` 생성/갱신
   - `mcp__study__progress_updateCheckbox` → plan.md 내 완료 토픽 체크

토픽 제안 기준:
- 좋은 예: "왜 useState는 큐 기반인가?", "Suspense는 Promise를 어떻게 잡는가?"
- 나쁜 예: "useState 사용법", "공식 문서에 다 나오는 내용"
- legacy나 기존 학습 내용(`study/<주제>/legacy/` 등)이 있어도 완벽히 동일하지 않으면 배제하지 않는다. 부분 겹침은 허용하되, 새로운 관점/깊이를 추가한다.

규칙:
- 상태 계산은 MCP 결과를 단일 진실 원천으로 사용한다.
- 설명에는 가능한 한 코드 경로(`file:line`)를 포함한다.
- Q&A 원문은 오타 수정만 하고 그대로 기록한다.
