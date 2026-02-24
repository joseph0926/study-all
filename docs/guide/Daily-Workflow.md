# Daily Workflow

학습 세션을 짧고 일관되게 유지하기 위한 권장 루틴.

## 시작 (5분)

1. 추천 확인
- Claude: `/next`
- Codex: `$next`
2. 오늘 목표 1개 선택
3. 계획 기록
- Claude: `/study plan <오늘 목표>`
- Codex: `$study plan <오늘 목표>`

## 집중 세션 (20-40분)

1. 신규 학습
- Claude: `/learn <skill> <topic>`
- Codex: `$learn <skill> <topic>`
2. 복습
- Claude: `/review <skill> [topic]`
- Codex: `$review <skill> [topic]`
3. 종료 직전 "정리"로 기록 반영

## 마감 (5분)

1. 수행 기록
- Claude: `/study done <완료한 내용>`
- Codex: `$study done <완료한 내용>`
2. 마감
- Claude: `/study log`
- Codex: `$study log`
3. 다음 세션 시작점을 1줄로 메모

## 주간 루틴

- 주 1회 플랜 점검
  - Claude: `/plan [goal]`
  - Codex: `$plan [goal]`
- 필요 시 스킬 커버리지 보정
  - Claude: `/gen-plan <skill>`
  - Codex: `$gen-plan <skill>`

## 운영 팁

- 새 토픽 시작 전 추천 근거를 먼저 확인한다.
- 학습 세션과 복습 세션을 섞어 과부하를 줄인다.
- 세션이 길어지면 한 번 종료("정리") 후 재개한다.
