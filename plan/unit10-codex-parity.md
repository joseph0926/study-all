# Unit 10 계획: Codex 기능 동등화 (호출 문법 예외: `/` → `$`)

> 검증 기준일: 2026-02-23
> 상태: 구현 완료 (2026-02-23)

---

## 1) 목적과 범위

### 목적
- 현재 Claude(skills-first, MCP-only)에서 동작하는 학습 워크플로우를 **Codex에서도 기능 동등하게** 제공한다.
- 호출 문법 예외: Codex는 `/` 대신 `$`를 사용한다.
- Unit 9에서 적용한 사용성/동기화 자동화를 Codex 경로에도 동일 수준으로 확장한다.

### 범위 (In Scope)
- Codex 스킬 10종 동등화 (`dashboard`, `next`, `plan`, `learn`, `gen-plan`, `review`, `study`, `project-gen-plan`, `project-learn`, `project-review`)
- Codex 스킬 경로는 **`.codex/skills`만 사용** (정책 고정)
- Codex용 가이드 문서/트러블슈팅/운영 자동화(Unit 9 parity)
- Codex MCP 연결/도구 호출 정책을 Claude와 동일하게 정렬

### 범위 제외 (Out of Scope)
- MCP 서버 비즈니스 로직 변경
- 학습 데이터(`docs/`) 포맷 변경
- Claude 전용 워크플로우 삭제

---

## 2) 공식 근거 (웹 검증)

| 근거 | 핵심 내용 | Unit 10 반영 포인트 |
|------|-----------|---------------------|
| https://developers.openai.com/codex/skills | Skills는 `SKILL.md` 파일로 구성되고 실행 시 **`$<skill-name>`** 형태로 호출 가능 | `/`→`$` 예외를 공식 호출 방식으로 확정 |
| https://developers.openai.com/codex/skills | 스킬 디렉토리/전역-프로젝트 배치 원칙과 symlink 지원 제공 | 레포 정책상 `.codex/skills` 단일 경로로 운영하되, 동기화는 `~/.codex/skills` 대상으로 설계 |
| https://developers.openai.com/codex/config | `project_doc_fallback_filenames` 기본값에 `AGENTS.md`, `CLAUDE.md` 포함 | 기존 문서 자산을 Codex에서도 재사용 가능 |
| https://developers.openai.com/codex/agents | AGENTS 규칙 파일은 가까운 경로가 우선 | Codex 전용 규칙/문서 분리 시 우선순위 충돌 관리 필요 |
| https://developers.openai.com/codex/mcp | MCP 서버는 config에 정의, `codex mcp add/list` 지원 | Codex에서도 `study` MCP 연결/검증 경로 고정 |
| https://git-scm.com/docs/githooks | `post-checkout`/`post-merge` 훅 동작 정의 | Unit 9와 동일하게 Codex 동기화 자동 트리거 가능 |
| https://git-scm.com/docs/git-config | `core.hooksPath` 중앙 관리 가능 | 기존 `.githooks` 체계에 Codex sync를 병행 연결 |

> 정책 메모: 최신 문서의 다중 경로 옵션이 있어도, 본 레포 Unit 10은 사용자 요구에 따라 `.agents/skills`를 사용하지 않고 `.codex/skills`만 사용한다.

---

## 3) 현재 갭 (As-Is)

1. `.codex/skills`는 6개만 있고, 10개 동등 집합이 아니다.
2. 기존 6개는 `~/.claude/commands/*.md` 브리지 기반이라 최신 MCP-only skill 구조와 불일치한다.
3. Unit 9 자동화는 `~/.claude` 대상만 있고, `~/.codex` 대상 동기화/manifest/운영 문서가 없다.
4. README/가이드에 Codex `$` 명령 10개 전체와 운영 루틴이 충분히 정리되지 않았다.

---

## 4) Unit 10 설계

### Phase A — 경로 정책 고정
1. Codex 스킬 canonical 경로를 `.codex/skills`로 고정
2. 전역 동기화 대상은 `~/.codex/skills`로 고정
3. `.agents/skills` 관련 언급/의존은 문서와 구현에서 제외

### Phase B — 스킬 기능 동등화 (10종)
1. `.claude/skills/*/SKILL.md`의 MCP-only 실행 규칙을 Codex 스킬로 이식
2. 호출 문법만 `/name` → `$name`으로 변환
3. 누락 4개(`dashboard`, `next`, `plan`, `study`) 신규 추가
4. 기존 6개 브리지 스킬은 최신 규칙으로 교체

### Phase C — Unit 9 parity (Codex)
1. `scripts/sync-codex-home.sh` 신설
   - 기본 `--dry-run`, `--apply`, `--prune-managed`
   - manifest: `~/.codex/.study-all-sync-manifest`
2. `.githooks/post-checkout`, `.githooks/post-merge`에 Codex sync 병행
3. 충돌 정책
   - unmanaged 파일은 skip(기본)
   - 강제 덮어쓰기 없음(명시 플래그 없는 한 금지)

### Phase D — 문서/가이드 반영
1. README에 Codex 10개 `$` 명령 표를 독립 섹션으로 정리
2. `docs/guide/Quickstart.md`에 Codex quickstart/동기화 절차 추가
3. `docs/guide/Troubleshooting.md`에 `~/.codex` sync/MCP 점검 항목 추가
4. `docs/guide/Daily-Workflow.md`에 Codex `$` 예시 병기

### Phase E — MCP/권한 정합화
1. Codex MCP 설정 확인(`codex mcp list`) 및 `study` 서버 연결 검증
2. 읽기형/쓰기형 스킬 도구 범위 최소화
3. 실패 시 fallback 정책 통일(에러 보고, 수동 파싱 금지)

---

## 5) 명령 매핑 (예외 적용)

| Claude | Codex |
|--------|-------|
| `/dashboard` | `$dashboard` |
| `/next` | `$next` |
| `/plan [goal]` | `$plan [goal]` |
| `/learn <skill> <topic>` | `$learn <skill> <topic>` |
| `/gen-plan <skill>` | `$gen-plan <skill>` |
| `/review <skill> [topic]` | `$review <skill> [topic]` |
| `/study [args]` | `$study [args]` |
| `/project-gen-plan <path>` | `$project-gen-plan <path>` |
| `/project-learn <path> <topic>` | `$project-learn <path> <topic>` |
| `/project-review <path> [topic]` | `$project-review <path> [topic]` |

---

## 6) 리스크 및 대응

| 리스크 | 영향 | 대응 |
|-------|------|------|
| `.codex/skills`와 전역 `~/.codex/skills` 드리프트 | 로컬/전역 동작 불일치 | Unit 9 parity sync + manifest 관리 |
| 기존 브리지 스킬 잔존 | MCP-only 보장 약화 | 6개 교체 + 4개 추가 후 일괄 검증 |
| 스킬 10종 권한 과다 | 비의도 동작 가능성 | 도구 범위 최소화 + 실패 시 안전 종료 |
| MCP 연결 불일치 | `$learn` 실행 중단 | `codex mcp list` 사전 검증 고정 |
| 훅 과도 실행 | checkout/merge 체감 지연 | `.codex` 변경 감지 후 no-op 최적화 |

---

## 7) 완료 조건 (Acceptance Criteria)

1. Codex에서 `$` 기반 10개 스킬이 모두 호출 가능
2. 각 스킬이 Claude와 동일한 MCP-only 흐름으로 동작
3. Codex 경로는 `.codex/skills`만 사용하고 `~/.codex/skills` 동기화가 재현 가능
4. Unit 9 수준의 문서/가이드/트러블슈팅이 Codex에도 적용됨
5. 검증 명령 통과

---

## 8) 검증 계획 (예정 명령)

```bash
# 문서/정합성
bash scripts/check-docs.sh

# Codex MCP 연결
codex mcp list

# Codex sync (Unit 9 parity)
bash scripts/sync-codex-home.sh --dry-run
bash scripts/sync-codex-home.sh --apply

# Codex skill 호출 샘플(수동)
# $dashboard
# $next
# $learn react fiber
# $review react fiber

# MCP 서버 품질
/Users/younghoonkim/Library/pnpm/pnpm -C mcp typecheck
/Users/younghoonkim/Library/pnpm/pnpm -C mcp test
```

---

## 9) 롤백 계획

1. 신규 추가된 Codex 스킬 4개 비활성화
2. Codex sync 스크립트/훅 연동 비활성화
3. README/guide를 Unit 9 기준으로 복원
4. 브리지 스킬 재사용 여부를 명시하고 Phase B부터 재설계
