# Unit 8 계획: Skills 전환 + README/CLAUDE 문서 개선

> 검증 기준일: 2026-02-23
> 상태: 계획 수립 (구현 전)

---

## 1) 목적과 범위

### 목적
- 기존 `.claude/commands/*.md` 중심 운영을 **skills 우선 구조**로 전환한다.
- Unit 7에서 축소한 MCP-only 흐름을 유지한 채, README/CLAUDE 문서를 최신 구조에 맞게 정리한다.

### 범위 (In Scope)
- skills 파일 구조 설계 및 command→skill 매핑
- 동명이인 충돌 회피 전략(command/skill shadowing) 적용
- README를 skills-first 사용 흐름으로 개편
- CLAUDE.md를 rules/import 중심 구조로 재정리

### 범위 제외 (Out of Scope)
- MCP 도구 스키마/비즈니스 로직 변경
- 학습 데이터(`docs/`) 포맷 변경
- 신규 도구/의존성 도입

---

## 2) 공식 근거 (웹 검증)

| 근거 | 핵심 내용 | Unit 8 반영 포인트 |
|------|-----------|--------------------|
| https://docs.claude.com/en/docs/claude-code/slash-commands | 커스텀 slash command는 skills로 통합되었고, 기존 command 파일은 호환 경로로 유지 | 전환은 단계적으로 진행하되 최종 목표를 skills-first로 설정 |
| https://docs.claude.com/en/docs/claude-code/skills | 동일 이름 skill/command 공존 시 skill 우선, `disable-model-invocation`/`allowed-tools` frontmatter 제공 | 동명이인 충돌 방지 + 쓰기형 skill hardening 정책 적용 |
| https://docs.claude.com/en/docs/claude-code/permissions | allow 규칙은 승인 없이 실행 가능, Skill 단위 권한 규칙 지원 | `allowed-tools` 최소화 + Skill access rule 명시 |
| https://docs.claude.com/en/docs/claude-code/memory | `CLAUDE.md` import, `.claude/rules/` 모듈화, path-specific rules 지원 | CLAUDE 문서 분할/모듈화 설계 |
| https://docs.claude.com/en/docs/claude-code/settings | 설정 스코프(local/project/user) 및 프로젝트 파일 위치 정리 | README에 설정 위치(`.mcp.json`, `.claude/settings*.json`) 명시 |
| https://www.claudemcp.com/docs/resources/skills-best-practices | 긴 지침은 분리, `SKILL.md`는 얇게 유지(권장 500줄 이하) | skill 본문은 요약, 상세 절차는 별도 파일로 분리 |

---

## 3) 전환 시 사이드이펙트와 대응

| 리스크 | 영향 | 대응 |
|-------|------|------|
| command/skill 동명이인 | 의도한 command 대신 skill 실행 | 전환 커밋에서 `skill 추가 + command rename/remove` 동시 처리 |
| skill 자동 호출 | 쓰기형 워크플로우에서 비의도 write | 쓰기형 skill 기본값: `disable-model-invocation: true` |
| `allowed-tools` 과대 허용 | 승인 흐름 우회 가능 | 읽기형 최소 허용, 쓰기형은 기본 비우기/최소화 |
| 문서 불일치 | README/CLAUDE와 실제 동작 괴리 | Unit 8에서 README/CLAUDE 동시 갱신 + 정합성 체크 |
| 과도한 스킬 본문 | 컨텍스트 예산 압박 | `SKILL.md` 요약 + 상세 파일 분리 |

---

## 4) 실행 계획 (Phase)

### Phase A: Skills 구조 도입
1. `.claude/skills/`에 10개 커맨드 대응 skill 골격 생성
2. 각 skill에 MCP-only 실행 규칙 이관
3. 쓰기형 skill frontmatter hardening:
   - `disable-model-invocation: true`
   - `allowed-tools` 최소화

### Phase B: 충돌/호환 정리
1. 동명이인 충돌 점검(command vs skill)
2. 충돌 파일 rename/remove 전략 적용
3. 우선순위 회귀 점검(skill shadowing 의도 확인)

### Phase C: README 개선
1. 실행 흐름을 skills-first로 변경
2. command 경로는 “호환/레거시”로 격하 표기
3. 설정 위치와 검증 명령(`check-docs`, `mcp test`) 명시

### Phase D: CLAUDE 개선
1. 장문 정책을 `.claude/rules/*.md`로 분리
2. CLAUDE.md에서 import/reference 구조로 요약
3. path-specific rules 필요 구간 정의

### Phase E: 검증
1. `scripts/check-docs.sh`
2. `/Users/younghoonkim/Library/pnpm/pnpm -C mcp typecheck`
3. `/Users/younghoonkim/Library/pnpm/pnpm -C mcp test`
4. 샘플 시나리오: `dashboard/next/learn/review/study` 동작 검수

---

## 5) 산출물(예정 변경 파일)

- `.claude/skills/*/SKILL.md` (신규/갱신)
- `.claude/skills/*/references/*.md` (필요 시)
- `.claude/commands/*.md` (충돌 정리 대상)
- `README.md` (skills-first 가이드)
- `CLAUDE.md` + `.claude/rules/*.md` (구조화)
- `temp/progress-status.md` (Unit 8 진행 기록)

---

## 6) 완료 조건 (Acceptance Criteria)

1. 동일 이름 command/skill 충돌 0건
2. 쓰기형 skill의 `disable-model-invocation` 누락 0건
3. README에 skills-first 흐름 + 설정 위치 + 검증 명령 반영
4. CLAUDE.md가 모듈화 규칙 구조로 정리
5. `check-docs.sh` 에러 0, `mcp typecheck/test` 통과

---

## 7) 롤백 계획

1. 신규 skill 비활성화(파일 rename/remove)
2. 기존 `.claude/commands/*.md` 경로를 다시 기본 경로로 복구
3. README/CLAUDE를 Unit 7 기준으로 되돌림
4. 원인 분석 후 Phase A부터 재진행

