---
name: study
description: 소스코드 기반 딥 학습 — plan.md 기반 로드맵 → 설명+Q&A → 대화 기록. Codex에서는 `$study <주제>`로 호출한다.
---

# study

입력: `$study <주제>` (예: `react`, `nextjs`)

실행 순서:

0. `mcp__study__context_resolve(mode=skill, skill=$ARGUMENTS)`로 컨텍스트 확인
1. `study/<주제>/plan.md` 존재 여부 확인 → 분기

   **[첫 세션] plan.md 없음:**
   1-A. `mcp__study__session_getSourceDigest(context, skill)`로 소스 트리 요약 + 기존 토픽 목록 조회
   1-B. **소스코드를 봐야 차이가 나는 토픽 5~8개** 제안
   1-C. 사용자 확인 후 `study/<주제>/plan.md` 생성 (제안 토픽 목록 + 학습 로드맵 체크리스트)
   1-D. → Step 2로 진행

   **[복귀 세션] plan.md 있음:**
   1-A. `mcp__study__session_getResumePoint(context, topic)`로 마지막 진행 위치 조회
   1-B. `mcp__study__progress_getPlan(context)`으로 plan.md 로드 → 진행률 요약 (완료/미완료 토픽 수)
   1-C. 사용자에게 보고: "Topic X > 서브토픽 Y까지 진행했습니다. 이어서 할까요?"
   1-D. plan.md에 없는 추가 토픽 후보가 있으면 간략히 제안 (기존 plan.md의 소스 다이제스트 대비 새로 발견된 것만)
   1-E. → Step 2로 진행

2. plan.md의 다음 미완료 토픽부터 서브토픽 → 마이크로서브토픽 단위로 아래 3개 프로토콜을 적용한다.

   **2-A. EXPLAIN 프로토콜** — 하나의 마이크로서브토픽에 대해 5관점을 순서대로 충족 후 다음으로 넘어간다.

   | 관점 | 내용 | 생략 가능 조건 |
   |------|------|--------------|
   | WHAT | 소스코드 인용(`file:line`) + 필드별 존재 이유 | 불가 |
   | WHY | 설계 동기 (PR/주석/git blame 근거) | 불가 (근거 미발견 시 "추정:" 명시) |
   | ALTERNATIVE | 자연스러운 대안 1개+ 및 미채택 이유 | 단순 상수/명백한 선택지 없음 시 |
   | VISUALIZE | ASCII 다이어그램/테이블/상태 전이도 | 단순 값/흐름 없을 시 |
   | CONNECT | 상위/하위 호출 1~2개 + 토픽 경계 명시 | 불가 |

   넘어가기 기준: 5관점 충족 + Q&A 1회 이상 + 사용자 `>>다음` 신호. AI가 자체 판단으로 넘어가지 않는다.

   **2-B. QUESTION 프로토콜** — Scope Fence 원칙에 따라 Q&A를 출제한다.

   - **Scope Fence**: 질문 정답이 "현재까지 EXPLAIN 완료된 범위" 내 정보만으로 도출 가능해야 한다.
   - **자기 검증**: 질문 생성 후 "답에 아직 미설명 개념이 필요한가?" 확인 → 필요하면 폐기.
   - **용어 제한**: 미설명 서브토픽의 용어/메커니즘을 질문에 사용하지 않는다.
   - **난이도 3단계**:
     - L1 (회상): "X는 무엇인가?" — WHAT 확인
     - L2 (이해): "왜 X인가?" / "X 대신 Y면?" — WHY/ALTERNATIVE 확인
     - L3 (적용): "이 지식으로 상황 Z를 설명하면?" — CONNECT 확인
   - 1~2문제 출제. L1 정답 → L2, L2 정답 → L3 에스컬레이션. 오답 시 보충 설명 후 재질문.

   **2-C. DISCOVERY 프로토콜** — 설명 중 발견된 연관 개념을 추적한다.

   - **즉시 경계 선언**: 미래 토픽 개념 등장 시 "X는 별도 토픽에서 다룸" 명시.
   - **발견 목록 축적**: `[발견] <개념> → <제안 토픽> (출처: file:line)` 형식으로 세션 내 추적.
   - **종료 시 일괄 반영**: Step 3에서 축적된 발견 목록을 사용자에게 제시 → 승인 시 plan.md에 토픽 추가.

3. 종료(`>>정리` 또는 `>>끝`) 시:
   - `mcp__study__session_appendLog` → `study/<주제>/<토픽명>.md`에 대화 원문 기록 (오타 수정만)
   - `mcp__study__review_saveMeta` → `study/<주제>/<토픽명>-meta.md` 생성/갱신
   - `mcp__study__progress_updateCheckbox` → plan.md 내 완료 토픽 체크
   - 발견된 연관 주제가 있으면 사용자에게 제시 → 승인 시 plan.md에 토픽 추가

사용자 신호 규칙:
- `>>다음` — 다음 마이크로서브토픽으로 전환
- `>>정리` 또는 `>>끝` — 세션 종료 + Step 3 실행
- 일반 대화 속 "다음", "정리", "끝"은 신호로 인식하지 않는다 (`>>` 접두사 필수).

토픽 제안 기준:

판단 체크리스트 (하나라도 YES면 탈락):
- [ ] 소스코드 없이 공식 문서만으로 동일하게 설명 가능한가?
- [ ] API 사용법 나열 수준인가? (how-to-use vs. how-it-works)
- [ ] 해당 주제의 입문 튜토리얼에서 이미 다루는 수준인가?

좋은 예:
- react: "왜 useState는 큐 기반인가?", "Suspense는 Promise를 어떻게 잡는가?", "reconciler가 child를 linked list로 관리하는 이유"
- nextjs: "RSC payload 직렬화 경계에서 함수가 제외되는 메커니즘", "ISR revalidate 시 stale 캐시 서빙 경로"
- 일반: 소스를 읽어야만 알 수 있는 내부 동작, 설계 트레이드오프, 비자명한 최적화

나쁜 예:
- react: "useState 사용법", "useEffect 의존성 배열"
- nextjs: "App Router 폴더 구조", "metadata 설정법"
- 일반: 공식 문서 복사 수준, API 시그니처 나열, 단순 사용 패턴

legacy나 기존 학습 내용(`study/<주제>/legacy/` 등)이 있어도 완벽히 동일하지 않으면 배제하지 않는다. 부분 겹침은 허용하되, 새로운 관점/깊이를 추가한다.

규칙:
- 상태 계산은 MCP 결과를 단일 진실 원천으로 사용한다.
- 설명에는 가능한 한 코드 경로(`file:line`)를 포함한다.
- Q&A 원문은 오타 수정만 하고 그대로 기록한다.
