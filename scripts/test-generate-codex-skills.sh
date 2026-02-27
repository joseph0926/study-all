#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GEN="$ROOT/scripts/generate-codex-skills.sh"

if [[ ! -x "$GEN" ]]; then
  echo "generator script not executable: $GEN" >&2
  exit 1
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

SRC="$TMP_DIR/.claude/skills"
DST="$TMP_DIR/.codex/skills"

mkdir -p "$SRC/sample-skill" "$SRC/dashboard-lite"

cat > "$SRC/sample-skill/SKILL.md" <<'EOF'
---
name: sample-skill
description: 샘플 설명
argument-hint: "<path> [topic]"
allowed-tools: Read, mcp__study__stats_getDashboard
---

입력: `$ARGUMENTS`

# sample-skill

`/sample-skill /tmp demo`
Claude가 체크합니다.
EOF

cat > "$SRC/dashboard-lite/SKILL.md" <<'EOF'
---
name: dashboard-lite
description: 대시보드 조회
allowed-tools: mcp__study__stats_getDashboard
---

`/dashboard-lite` 실행.
EOF

bash "$GEN" --apply --source "$SRC" --target "$DST" >/dev/null

cat > "$TMP_DIR/expected-sample.md" <<'EOF'
---
name: sample-skill
description: 샘플 설명 Codex에서는 `$sample-skill <path> [topic]`으로 호출한다.
---

# sample-skill

입력: `$sample-skill <path> [topic]`

`$sample-skill /tmp demo`
AI가 체크합니다.
EOF

cat > "$TMP_DIR/expected-dashboard-lite.md" <<'EOF'
---
name: dashboard-lite
description: 대시보드 조회 Codex에서는 `$dashboard-lite`으로 호출한다.
---

# dashboard-lite

입력: 없음 (`$dashboard-lite`)

`$dashboard-lite` 실행.
EOF

diff -u "$TMP_DIR/expected-sample.md" "$DST/sample-skill/SKILL.md"
diff -u "$TMP_DIR/expected-dashboard-lite.md" "$DST/dashboard-lite/SKILL.md"

bash "$GEN" --check --source "$SRC" --target "$DST" >/dev/null

echo "# drift" >> "$DST/dashboard-lite/SKILL.md"
if bash "$GEN" --check --source "$SRC" --target "$DST" >/dev/null 2>&1; then
  echo "expected --check to fail when target is drifted" >&2
  exit 1
fi

bash "$GEN" --check --source "$ROOT/.claude/skills" --target "$ROOT/.codex/skills" >/dev/null

echo "OK: generate-codex-skills tests passed"
