---
name: learn
description: 자유 Q&A 기반 학습 — 질문 → 근거 탐색(ref/웹/추론) → 답변 → 반복 → 문서화
argument-hint: "<질문>"
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, WebSearch, WebFetch, Write, mcp__study__context_resolve, mcp__study__session_appendLog
---

입력: `$ARGUMENTS` (예: `Suspense는 어떠한 원리로 동작하나요?`)

실행 순서:

1. `context.resolve(mode=skill, skill=learn)`로 컨텍스트 확인
2. 사용자 질문(`$ARGUMENTS`)에서 주제명 추출 (간결한 kebab-case, 예: `Suspense-동작원리`)
3. 근거 탐색 — 아래 우선순위를 순서대로 시도한다.

   | 우선순위 | 소스 | 도구 | 조건 |
   |---------|------|------|------|
   | 1 | `ref/` 하위 소스코드 | Glob, Grep, Read | 관련 코드 존재 시 `file:line` 인용 |
   | 2 | 웹 검색 | WebSearch, WebFetch | ref/에서 충분한 근거를 못 찾은 경우 |
   | 3 | 추론 | — | 1+2 결과를 바탕으로 AI가 추론. 반드시 "추론:" 접두사 명시 |

4. 근거와 함께 답변한다.
   - ref/ 코드 근거: `file:line` 경로 포함
   - 웹 근거: 출처 URL 포함
   - 추론: "추론:" 접두사로 명확히 구분
5. 사용자의 추가 질문을 대기한다. → Step 3~4 반복.

종료(`>>정리`) 시:

1. 전체 Q&A를 `study/learn/<주제명>.md`에 Write한다.
   - 포맷: 아래 템플릿을 따른다.
   - 원문 그대로 기록한다. 오탈자만 수정.
2. `session.appendLog(context, topic=<주제명>, content=<요약>)`로 세션 기록.

문서 템플릿:

```markdown
# <주제명>

> 최초 질문: <사용자의 원본 질문>
> 일시: <YYYY-MM-DD>

---

## Q1. <사용자 질문>

<답변 원문>

## Q2. <사용자 후속 질문>

<답변 원문>

...
```

사용자 신호 규칙:
- `>>정리` — 세션 종료 + 문서화 실행
- 일반 대화 속 "정리"는 신호로 인식하지 않는다 (`>>` 접두사 필수).

규칙:
- ref/ 코드가 있으면 반드시 먼저 탐색한다. 웹 검색만으로 대체하지 않는다.
- 근거의 출처(ref 코드/웹/추론)를 항상 명시한다.
- 쓰기 동작은 `>>정리` 이후에만 수행한다.
