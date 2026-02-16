#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ERRORS=0
WARNS=0

red()    { printf '\033[0;31m%s\033[0m\n' "$1"; }
yellow() { printf '\033[0;33m%s\033[0m\n' "$1"; }
green()  { printf '\033[0;32m%s\033[0m\n' "$1"; }
dim()    { printf '\033[0;90m%s\033[0m\n' "$1"; }

err()  { red    "  ERROR: $1"; ERRORS=$((ERRORS + 1)); }
warn() { yellow "  WARN:  $1"; WARNS=$((WARNS + 1)); }
ok()   { dim    "  OK:    $1"; }

header() { printf '\n\033[1m[%s]\033[0m\n' "$1"; }

COMMANDS_DIR="$ROOT/.claude/commands"
README="$ROOT/README.md"
CLAUDE_MD="$ROOT/CLAUDE.md"

header "1. Command table sync — README.md vs .claude/commands/"

if [[ -d "$COMMANDS_DIR" && -f "$README" ]]; then
  for cmd_file in "$COMMANDS_DIR"/*.md; do
    cmd_name="$(basename "$cmd_file" .md)"
    if grep -q "/$cmd_name" "$README"; then
      ok "/$cmd_name — README에 존재"
    else
      err "/$cmd_name — README Commands 테이블에 누락"
    fi
  done
fi

header "2. docs/ filename conventions"

if [[ -d "$ROOT/docs" ]]; then
  while IFS= read -r f; do
    fname="$(basename "$f")"

    [[ "$fname" == "plan.md" ]] && continue

    if ! echo "$fname" | grep -qE '^[A-Za-z0-9][A-Za-z0-9._-]*\.md$'; then
      err "$fname — 허용 문자(A-Z a-z 0-9 . _ -)외 문자 포함"
    fi

    base="${fname%.md}"
    base="${base%-quiz}"
    IFS='-' read -ra PARTS <<< "$base"
    for part in "${PARTS[@]}"; do
      [[ -z "$part" ]] && continue
      first_char="${part:0:1}"
      if [[ "$first_char" =~ [a-z] ]]; then
        warn "$fname — '$part' 소문자 시작 (Title-Case 권장)"
        break
      fi
    done
  done < <(find "$ROOT/docs" -name '*.md' -type f)
fi

header "3. Phantom references — commands에서 참조하는 스크립트/커맨드 존재 여부"

for cmd_file in "$COMMANDS_DIR"/*.md; do
  cmd_name="$(basename "$cmd_file" .md)"

  while IFS= read -r script_path; do
    [[ -z "$script_path" ]] && continue
    [[ "$script_path" == *"{"* ]] && continue
    if [[ ! -f "$ROOT/$script_path" ]]; then
      err "/$cmd_name — 참조 스크립트 '$script_path' 없음"
    else
      ok "/$cmd_name — $script_path 존재"
    fi
  done < <(grep -oE '(python |bash |sh )[^ `]+' "$cmd_file" 2>/dev/null \
    | sed 's/^python //;s/^bash //;s/^sh //' || true)

  while IFS= read -r ref_cmd; do
    [[ -z "$ref_cmd" ]] && continue
    if [[ ! -f "$COMMANDS_DIR/$ref_cmd.md" ]]; then
      warn "/$cmd_name — 참조 커맨드 '$ref_cmd' 없음 (.claude/commands/에 없음)"
    fi
  done < <(grep -oE '`study-aio`' "$cmd_file" 2>/dev/null | sed 's/`//g' | sort -u || true)
done

header "4. CLAUDE.md structure tree vs reality"

if [[ -f "$CLAUDE_MD" ]]; then
  for d in ".claude/commands" "docs" "ref"; do
    if [[ -d "$ROOT/$d" ]]; then
      ok "$d/ — 존재"
    else
      err "CLAUDE.md 구조 트리의 $d/ — 실제로 없음"
    fi
  done

  for cmd_file in "$COMMANDS_DIR"/*.md; do
    cmd_name="$(basename "$cmd_file")"
    if grep -q "$cmd_name" "$CLAUDE_MD"; then
      ok "CLAUDE.md에 $cmd_name 언급됨"
    else
      err "CLAUDE.md 구조 트리에 $cmd_name 누락"
    fi
  done
fi

header "5. plan.md checklist vs session files"

for plan_file in "$ROOT"/docs/*/plan.md; do
  [[ ! -f "$plan_file" ]] && continue
  skill_dir="$(dirname "$plan_file")"
  skill_name="$(basename "$skill_dir")"

  while IFS= read -r f; do
    fname="$(basename "$f" .md)"
    [[ "$fname" == "plan" ]] && continue
    [[ "$fname" =~ -quiz$ ]] && continue
    [[ "$fname" =~ -meta$ ]] && continue

    search_term="${fname//-/ }"

    if grep -qi "$search_term" "$plan_file" 2>/dev/null; then
      checklist_line=$(grep -i "$search_term" "$plan_file" | head -1)
      if echo "$checklist_line" | grep -q '\[x\]'; then
        ok "$skill_name/$fname — plan.md 완료 표시"
      else
        line_count=$(wc -l < "$f" | tr -d ' ')
        if [[ "$line_count" -gt 20 ]]; then
          warn "$skill_name/$fname — 세션 파일(${line_count}줄) 존재하지만 plan.md 체크리스트 미완료"
        fi
      fi
    fi
  done < <(find "$skill_dir" -maxdepth 1 -name '*.md' -type f)
done

header "Summary"

echo ""
if [[ $ERRORS -eq 0 && $WARNS -eq 0 ]]; then
  green "All checks passed!"
elif [[ $ERRORS -eq 0 ]]; then
  yellow "$WARNS warning(s), 0 errors"
else
  red "$ERRORS error(s), $WARNS warning(s)"
fi

exit "$ERRORS"
