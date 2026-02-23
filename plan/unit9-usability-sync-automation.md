# Unit 9 계획: 사용성 개선 + study-all → ~/.claude 동기화 자동화

> 검증 기준일: 2026-02-23  
> 상태: 계획 수립 (구현 전)

---

## 1) 목적과 범위

### 목적
- 실사용 시 반복되는 불편(초기 진입, 명령 선택, 트러블슈팅, 일일 루틴)을 줄이는 **사용 가이드 체계**를 만든다.
- 이 레포의 `.claude`를 **Source of Truth**로 두고, `~/.claude`로 안전하게 배포/동기화하는 자동화를 도입한다.

### 범위 (In Scope)
- README 보강 + `docs/guide/*` 사용 문서 신설
- `scripts/sync-claude-home.sh`(가칭) 기반 동기화 파이프라인 설계
- Git hook 기반 자동 동기화(`post-checkout`, `post-merge`) 설계
- 충돌/권한/삭제 리스크를 줄이기 위한 안전장치 설계(`--dry-run`, managed-only prune)

### 범위 제외 (Out of Scope)
- MCP 도구 비즈니스 로직 변경
- 학습 데이터(`docs/`) 포맷 변경
- OS별 시스템 스케줄러(launchd/systemd) 기본 의존 도입

---

## 2) 공식 근거 (웹 검증)

| 근거 | 핵심 내용 | Unit 9 반영 포인트 |
|------|-----------|--------------------|
| https://code.claude.com/docs/en/slash-commands | custom slash command가 skills로 통합, `.claude/commands/*` 호환 유지, skill/command 동명이면 skill 우선 | 동기화 시 command/skill 충돌 정책 명시 필요 |
| https://code.claude.com/docs/en/slash-commands | Personal skill 경로 `~/.claude/skills/...`, Project skill 경로 `.claude/skills/...`, 우선순위 `enterprise > personal > project` | `~/.claude` 배포 시 다른 프로젝트에 전역 영향 발생 가능성 관리 |
| https://code.claude.com/docs/en/slash-commands | `disable-model-invocation`, `allowed-tools` frontmatter 제공 | 동기화된 쓰기형 skill의 안전 정책 유지 검증 필요 |
| https://code.claude.com/docs/en/settings | Settings/MCP/CLAUDE 파일의 user/project/local 스코프 위치와 precedence 제공 | 동기화 대상에서 `settings.local.json`, `~/.claude.json` 직접 덮어쓰기 금지 |
| https://code.claude.com/docs/en/memory | `CLAUDE.md` import(`@path/to/import`), `.claude/rules/*.md` 자동 로드, `~/.claude/rules` 지원 | 문서 모듈화 + 규칙 재사용 설계에 반영 |
| https://code.claude.com/docs/en/memory | `.claude/rules/`는 symlink 지원, 순환 링크 graceful 처리 | rules 공유는 symlink 전략을 공식 근거로 채택 가능 |
| https://git-scm.com/docs/githooks | `post-checkout`/`post-merge` 훅 동작 정의 | pull/checkout 시 자동 동기화 트리거로 사용 |
| https://git-scm.com/docs/git-config | `core.hooksPath`로 hooks 디렉토리 중앙 관리 가능 | 레포 내 `.githooks/`를 공식 훅 경로로 사용 |
| https://man7.org/linux/man-pages/man1/rsync.1.html | `--delete`는 위험할 수 있고 `--dry-run` 선검증 권장 | 동기화 스크립트 기본 모드를 dry-run으로 설계 |

---

## 3) 현재 불편 지점 (진단)

1. README가 개요 위주라 실제 시작 루틴(오늘 뭐부터?)이 빠르게 보이지 않는다.
2. 에러 상황별 해결 가이드가 부족하다(예: MCP 연결/경로/권한).
3. `.claude`를 `~/.claude`로 배포하는 표준 경로가 없어 수동 복사/누락 위험이 있다.
4. 동기화가 수동이라 `git pull` 이후 환경 drift가 생길 수 있다.
5. 전역(`~/.claude`) 반영 시 기존 개인 설정/스킬 충돌에 대한 안전장치 문서가 없다.

---

## 4) Unit 9 설계

### Phase A — 사용성 문서 개선
1. `docs/guide/quickstart.md` 신설
   - 5분 시작(준비 → 실행 → 첫 학습 → 첫 복습)
2. `docs/guide/daily-workflow.md` 신설
   - `/next` → `/learn` → `/review` → `/study log` 일일 루틴
3. `docs/guide/troubleshooting.md` 신설
   - 자주 겪는 실패 케이스와 즉시 확인 명령
4. README를 “개요 + 진입 링크” 형태로 간결화
   - 상세 절차는 `docs/guide/*`로 위임

### Phase B — 동기화 자동화
1. `scripts/sync-claude-home.sh` 신설 (가칭)
   - 기본: `--dry-run`
   - 적용: `--apply`
   - 삭제: managed 경로만 `--prune-managed`
2. 동기화 대상(초안)
   - 포함: `.claude/skills`, `.claude/commands/legacy-*`, `.claude/rules`
   - 제외: `.claude/settings.local.json`, `~/.claude.json`, 토큰/세션성 파일
3. 충돌 정책
   - 기존 `~/.claude` 사용자 파일과 충돌 시 기본은 skip + 경고
   - 강제 모드는 명시 플래그에서만 허용
4. 규칙 공유 최적화
   - `.claude/rules`는 symlink 모드(공식 지원) 옵션 제공
   - skills/commands는 우선 copy/rsync 모드로 안정성 확보

### Phase C — 자동 트리거
1. `.githooks/post-checkout`, `.githooks/post-merge`에서 sync 호출
2. `git config core.hooksPath .githooks` 설정 가이드 제공
3. 훅 실패 시 작업 방해 최소화
   - 실패를 경고로 출력하고, 수동 재실행 명령 안내

### Phase D — 검증
1. `bash scripts/check-docs.sh`
2. `bash scripts/sync-claude-home.sh --dry-run`
3. `bash scripts/sync-claude-home.sh --apply` 후 샘플 확인
4. `/Users/younghoonkim/Library/pnpm/pnpm -C mcp typecheck`
5. `/Users/younghoonkim/Library/pnpm/pnpm -C mcp test`

---

## 5) 리스크 및 대응

| 리스크 | 영향 | 대응 |
|-------|------|------|
| personal skill precedence (personal > project) | 다른 프로젝트에서 예상치 못한 skill 동작 | 충돌 감지/경고 + 네임스페이스 또는 skip 기본 정책 |
| settings 파일 오염 | 개인 권한/환경 설정 손상 | settings 계열은 동기화 제외 |
| `rsync --delete` 오사용 | 사용자 파일 삭제 | 기본 dry-run + managed-only prune |
| 훅 과도 실행 | checkout/merge 체감 지연 | 변경분 감지 후 no-op 최적화 |
| 문서 분산 과다 | 유지보수 부담 | README는 엔트리, 상세는 guide 문서로 역할 분리 |

---

## 6) 완료 조건 (Acceptance Criteria)

1. 신규 사용자가 `docs/guide/quickstart.md`만 보고 10분 내 첫 세션 실행 가능
2. `sync-claude-home.sh --dry-run`으로 변경 예정 목록이 명확히 출력됨
3. `--apply` 후 `~/.claude` 반영 결과를 검증 명령으로 확인 가능
4. hook 자동화 후 `git checkout`/`git pull` 시 동기화가 재현 가능
5. settings/secret 성격 파일은 동기화 대상에서 제외됨
6. `check-docs`, `mcp typecheck`, `mcp test` 통과

---

## 7) 롤백 계획

1. `core.hooksPath`를 기본값으로 되돌림(또는 `.githooks/` 비활성화)
2. sync 스크립트로 생성한 managed 대상만 정리
3. README/guide 변경을 Unit 8 기준으로 복원
4. 충돌 원인 분석 후 Phase B부터 재설계

