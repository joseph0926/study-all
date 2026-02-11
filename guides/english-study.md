# English Study Guide

업무에서 쓰는 영어(듣기/말하기/읽기/쓰기)를 매일 산출하는 구조.

---

## 핵심 원칙

### 1. 연속성 > 강도

- **"2일 연속 0분 금지"** — 이것만 지키면 나머지는 따라온다.
- 컨디션 좋은 날: 확장 루틴 (45-70분)
- 바쁜 날/지친 날: 최소 루틴 (15분)
- **60% 품질로 매일 > 100% 품질로 가끔**

### 2. 입력 70% + 출력 30%

- 초보자는 읽기만 늘고 말하기/쓰기가 부족해서 인터뷰에서 막힌다.
- 매일 반드시 출력(말하기 또는 쓰기)을 포함한다.

### 3. 표현 단위 학습

- 단어 1개보다 **표현/문장 1개**가 실전 효율이 높다.
- 업무에서 바로 쓰는 표현 위주: meeting, slack, pr-review, interview

### 4. 지루함을 설계로 제거

- 매일 같은 틀 + 요일마다 내용 교체 (주간 로테이션)
- 목표는 "시간"이 아니라 **횟수**로 잡기 (쉐도잉 5회, 문장 3개 등)
- 난이도는 70-80% 이해되는 수준 유지

---

## 커맨드

### `/eg-d [min|ext|check]` — Daily Routine

매일 실행하는 영어 루틴. streak 관리 + 요일별 루틴 진행 + 자동 기록.

**모드**:

- `min` — 최소 루틴 (15분): 표현 복습 → 쉐도잉 → 한 문장 출력
- `ext` — 확장 루틴 (45-70분): 표현 복습 → 듣기+쉐도잉 → 읽기 → 출력(말하기/쓰기)
- `check` — streak/진행 현황만 확인

**출력**: `docs/english/daily/{YYYY-MM-DD}.md`

---

## 주간 로테이션

| 요일 | 주인공 스킬             | 초점                            |
| ---- | ----------------------- | ------------------------------- |
| 월   | Listening/Pronunciation | 쉐도잉 비중 높임                |
| 화   | Reading                 | 기술 문서/블로그 읽기           |
| 수   | Writing                 | Slack/이메일/PR 설명 작성       |
| 목   | Speaking                | 프로젝트 설명, 의견 말하기      |
| 금   | Interview               | Behavioral 1문항 STAR 답변      |
| 토   | Mini Project            | 영어 산출물 만들기              |
| 일   | Light                   | 영상 시청 + 따라 말할 문장 10개 |

---

## docs/english/ 파일 규칙

### expressions.md (표현 DB)

- 경로: `docs/english/expressions.md`
- `/eg-d` 세션에서 자동 누적
- 카테고리: meeting / slack / pr-review / interview / general
- SRS 복습 시 이 파일에서 표현을 뽑아 사용

### daily/{YYYY-MM-DD}.md (일일 기록)

- streak, 모드, 배운 표현, 교정 내용, 마무리 문장 포함
- AI가 자동으로 정리 (사용자에게 기록 부담 주지 않음)

### 일일 기록 구조

```
# {YYYY-MM-DD} ({요일}) — {min/ext}

**Streak**: {N}일
**Focus**: {주인공 스킬}

## Today's Best Sentence
## Expressions Learned
## Practice Log
## Corrections
## Notes
```

---

## 빅테크 취업 연결: 영어 산출물 4종

학습이 취업 준비 자체가 되도록 아래 산출물을 누적한다:

1. **60초 Self-intro 스크립트 + 녹음**
2. **프로젝트 설명 템플릿**: Problem → Constraints → Approach → Trade-offs → Result → Learnings
3. **Behavioral Story Bank 8개**: 갈등/실패/리더십/협업/임팩트/압박/학습/고객 중심
4. **영어 이력서 bullet 20개**: 동사 + 무엇을 + 어떻게 + 결과(수치)

---

## AI 행동 규칙

### DO

- 코치 톤 유지: 격려 + 실용 피드백
- 교정은 "틀렸다"가 아니라 "이렇게 하면 더 자연스럽다"로
- 매 세션 streak을 계산하고 표시
- 새 표현을 expressions.md에 자동 추가
- 사용자 출력물에 2버전 교정 제공 (friendly / formal)

### DO NOT

- 최소 루틴에서 무리하게 확장 유도 (내일 확장 루틴을 권유)
- 한 번에 표현 10개 이상 쏟아붓기 (최소 5-7개, 확장 7-10개)
- 난이도 70-80% 범위를 벗어나는 소재 제시
- `docs/english/` 외 디렉토리 수정
