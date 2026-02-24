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

SKILLS_DIR="$ROOT/.claude/skills"
CODEX_SKILLS_DIR="$ROOT/.codex/skills"
README="$ROOT/README.md"
CLAUDE_MD="$ROOT/CLAUDE.md"

header "1. Skills table sync — README.md vs .claude/skills/"

if [[ -d "$SKILLS_DIR" && -f "$README" ]]; then
  skill_count=0
  while IFS= read -r skill_file; do
    skill_count=$((skill_count + 1))
    skill_name="$(basename "$(dirname "$skill_file")")"

    if grep -Fq "\$$skill_name" "$README" || grep -Fq "/$skill_name" "$README"; then
      ok "$skill_name — README에 존재"
    else
      err "$skill_name — README skills 섹션에 누락"
    fi
  done < <(find "$SKILLS_DIR" -mindepth 2 -maxdepth 2 -name 'SKILL.md' -type f | sort)

  if [[ $skill_count -eq 0 ]]; then
    err ".claude/skills/ 아래 SKILL.md가 없음"
  fi
else
  err "README 또는 .claude/skills/ 디렉토리가 없음"
fi

header "1-B. Codex skills sync — README.md vs .codex/skills/"

if [[ -d "$CODEX_SKILLS_DIR" && -f "$README" ]]; then
  codex_skill_count=0
  while IFS= read -r skill_file; do
    codex_skill_count=$((codex_skill_count + 1))
    skill_name="$(basename "$(dirname "$skill_file")")"

    if grep -Fq "\$$skill_name" "$README"; then
      ok "\$$skill_name — README에 존재"
    else
      err "\$$skill_name — README Codex 섹션에 누락"
    fi
  done < <(find "$CODEX_SKILLS_DIR" -mindepth 2 -maxdepth 2 -name 'SKILL.md' -type f | sort)

  if [[ $codex_skill_count -eq 0 ]]; then
    err ".codex/skills/ 아래 SKILL.md가 없음"
  fi
else
  err "README 또는 .codex/skills/ 디렉토리가 없음"
fi

header "1-C. Skill parity — .claude/skills vs .codex/skills"

if [[ -d "$SKILLS_DIR" && -d "$CODEX_SKILLS_DIR" ]]; then
  while IFS= read -r claude_skill_file; do
    skill_name="$(basename "$(dirname "$claude_skill_file")")"
    if [[ -f "$CODEX_SKILLS_DIR/$skill_name/SKILL.md" ]]; then
      ok "parity: $skill_name"
    else
      err "parity 누락: .codex/skills/$skill_name/SKILL.md 없음"
    fi
  done < <(find "$SKILLS_DIR" -mindepth 2 -maxdepth 2 -name 'SKILL.md' -type f | sort)

  while IFS= read -r codex_skill_file; do
    skill_name="$(basename "$(dirname "$codex_skill_file")")"
    if [[ ! -f "$SKILLS_DIR/$skill_name/SKILL.md" ]]; then
      warn "codex 전용 스킬 감지: $skill_name (.claude/skills에는 없음)"
    fi
  done < <(find "$CODEX_SKILLS_DIR" -mindepth 2 -maxdepth 2 -name 'SKILL.md' -type f | sort)
fi

header "2. study/ filename conventions"

if [[ -d "$ROOT/study" ]]; then
  while IFS= read -r f; do
    fname="$(basename "$f")"

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
  done < <(find "$ROOT/study" -name '*.md' -type f)
fi

header "3. Phantom references — scripts referenced by skills"

check_shell_refs() {
  local md_file="$1"
  local label="$2"

  while IFS= read -r script_path; do
    [[ -z "$script_path" ]] && continue
    [[ "$script_path" == *"{"* ]] && continue
    if [[ ! -f "$ROOT/$script_path" ]]; then
      err "$label — 참조 스크립트 '$script_path' 없음"
    else
      ok "$label — $script_path 존재"
    fi
  done < <(grep -oE '(python |bash |sh )[^ `]+' "$md_file" 2>/dev/null \
    | sed 's/^python //;s/^bash //;s/^sh //' || true)
}

if [[ -d "$SKILLS_DIR" ]]; then
  while IFS= read -r skill_file; do
    skill_name="$(basename "$(dirname "$skill_file")")"
    check_shell_refs "$skill_file" "skill:$skill_name"
  done < <(find "$SKILLS_DIR" -mindepth 2 -maxdepth 2 -name 'SKILL.md' -type f | sort)
fi

if [[ -d "$CODEX_SKILLS_DIR" ]]; then
  while IFS= read -r skill_file; do
    skill_name="$(basename "$(dirname "$skill_file")")"
    check_shell_refs "$skill_file" "codex-skill:$skill_name"
  done < <(find "$CODEX_SKILLS_DIR" -mindepth 2 -maxdepth 2 -name 'SKILL.md' -type f | sort)
fi

header "4. CLAUDE.md structure tree vs reality"

if [[ -f "$CLAUDE_MD" ]]; then
  for d in ".claude/skills" "study" "ref"; do
    if [[ -d "$ROOT/$d" ]]; then
      ok "$d/ — 존재"
    else
      err "CLAUDE.md 구조 트리의 $d/ — 실제로 없음"
    fi
  done

  while IFS= read -r skill_file; do
    skill_name="$(basename "$(dirname "$skill_file")")"
    if grep -Fq "/$skill_name" "$CLAUDE_MD" || grep -Fq "$skill_name/SKILL.md" "$CLAUDE_MD"; then
      ok "CLAUDE.md에 $skill_name 언급됨"
    else
      err "CLAUDE.md에 skill '$skill_name' 누락"
    fi
  done < <(find "$SKILLS_DIR" -mindepth 2 -maxdepth 2 -name 'SKILL.md' -type f | sort)
fi

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
