#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE_DIR="$ROOT/.claude/skills"
TARGET_DIR="$ROOT/.codex/skills"
MODE="dry-run"

usage() {
  cat <<'USAGE'
Usage: bash scripts/generate-codex-skills.sh [options]

Options:
  --dry-run          Preview changes only (default)
  --apply            Write generated files to .codex/skills
  --check            Exit non-zero when generated result differs from target
  --source PATH      Source skills root (default: .claude/skills)
  --target PATH      Target skills root (default: .codex/skills)
  -h, --help         Show help

Notes:
  - Source of truth is .claude/skills/*/SKILL.md
  - This script rewrites only .codex/skills/*/SKILL.md
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      MODE="dry-run"
      ;;
    --apply)
      MODE="apply"
      ;;
    --check)
      MODE="check"
      ;;
    --source)
      if [[ $# -lt 2 ]]; then
        echo "Missing value for --source" >&2
        exit 1
      fi
      shift
      SOURCE_DIR="${1:-}"
      ;;
    --target)
      if [[ $# -lt 2 ]]; then
        echo "Missing value for --target" >&2
        exit 1
      fi
      shift
      TARGET_DIR="${1:-}"
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "[generate-codex-skills] source directory not found: $SOURCE_DIR" >&2
  exit 1
fi

extract_frontmatter_value() {
  local file="$1"
  local key="$2"
  awk -v key="$key" '
    BEGIN { in_fm = 0 }
    NR == 1 && $0 == "---" { in_fm = 1; next }
    in_fm && $0 == "---" { exit }
    in_fm {
      if ($0 ~ ("^" key ":[[:space:]]*")) {
        sub("^" key ":[[:space:]]*", "", $0)
        print $0
        exit
      }
    }
  ' "$file"
}

strip_wrapping_quotes() {
  local value="$1"
  local len=${#value}

  if [[ $len -ge 2 ]]; then
    if [[ "$value" == \"*\" && "$value" == *\" ]]; then
      value="${value:1:$((len - 2))}"
    elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
      value="${value:1:$((len - 2))}"
    fi
  fi

  printf '%s' "$value"
}

render_body() {
  local src_file="$1"
  local skill_name="$2"

  local body_file
  body_file="$(mktemp)"
  local trimmed_file
  trimmed_file="$(mktemp)"

  if [[ "$(head -n 1 "$src_file")" == "---" ]]; then
    awk 'BEGIN{c=0} /^---$/{c++; next} c>=2{print}' "$src_file" > "$body_file"
  else
    cat "$src_file" > "$body_file"
  fi

  awk -v skill="$skill_name" '
    BEGIN {
      removed_heading = 0
      removed_input = 0
      started = 0
    }
    {
      line = $0
      if (!removed_heading && line ~ ("^# " skill "$")) {
        removed_heading = 1
        next
      }
      if (!removed_input && line ~ "^입력:[[:space:]]") {
        removed_input = 1
        next
      }
      if (!started && line ~ /^[[:space:]]*$/) {
        next
      }
      started = 1
      print line
    }
  ' "$body_file" > "$trimmed_file"

  perl -pe '
    s{`/([a-z][a-z0-9-]*)(?=[ `])([^`]*)`}{`\$$1$2`}g;
    s/Claude가/AI가/g;
    s/Claude는/AI는/g;
    s/Claude를/AI를/g;
    s/Claude의/AI의/g;
  ' "$trimmed_file"

  rm -f "$body_file" "$trimmed_file"
}

validate_generated_file() {
  local file="$1"
  local skill_name="$2"
  local cmd_pattern="\\\$${skill_name}"

  if [[ "$(head -n 1 "$file")" != "---" ]]; then
    echo "[generate-codex-skills] invalid output($skill_name): missing frontmatter start" >&2
    return 1
  fi

  if ! grep -q "^name: $skill_name\$" "$file"; then
    echo "[generate-codex-skills] invalid output($skill_name): name mismatch" >&2
    return 1
  fi

  if ! grep -q "^description: " "$file"; then
    echo "[generate-codex-skills] invalid output($skill_name): missing description" >&2
    return 1
  fi

  if ! grep -q "^# $skill_name\$" "$file"; then
    echo "[generate-codex-skills] invalid output($skill_name): missing heading" >&2
    return 1
  fi

  if ! grep -E -q "^입력: .*${cmd_pattern}" "$file"; then
    echo "[generate-codex-skills] invalid output($skill_name): missing invocation line" >&2
    return 1
  fi
}

render_codex_skill() {
  local src_file="$1"
  local skill_name="$2"

  local description
  description="$(extract_frontmatter_value "$src_file" "description")"
  local argument_hint
  argument_hint="$(extract_frontmatter_value "$src_file" "argument-hint")"

  description="$(strip_wrapping_quotes "$description")"
  argument_hint="$(strip_wrapping_quotes "$argument_hint")"

  local invocation="\$${skill_name}"
  if [[ -n "$argument_hint" ]]; then
    invocation="$invocation $argument_hint"
  fi

  local codex_description="$description"
  if [[ "$codex_description" != *"Codex에서는"* ]]; then
    codex_description="$codex_description Codex에서는 \`$invocation\`으로 호출한다."
  fi

  local input_line
  if [[ -n "$argument_hint" ]]; then
    input_line="입력: \`$invocation\`"
  else
    input_line="입력: 없음 (\`$invocation\`)"
  fi

  printf -- "---\n"
  printf "name: %s\n" "$skill_name"
  printf "description: %s\n" "$codex_description"
  printf -- "---\n\n"
  printf "# %s\n\n" "$skill_name"
  printf "%s\n\n" "$input_line"
  render_body "$src_file" "$skill_name"
}

if [[ "$MODE" == "apply" ]]; then
  mkdir -p "$TARGET_DIR"
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

changes=0
creates=0
updates=0
same=0
invalid=0

while IFS= read -r src_file; do
  skill_name="$(basename "$(dirname "$src_file")")"
  target_file="$TARGET_DIR/$skill_name/SKILL.md"

  generated_file="$TMP_DIR/${skill_name}.generated.md"
  render_codex_skill "$src_file" "$skill_name" > "$generated_file"

  if ! validate_generated_file "$generated_file" "$skill_name"; then
    invalid=$((invalid + 1))
    continue
  fi

  if [[ -f "$target_file" ]] && cmp -s "$generated_file" "$target_file"; then
    same=$((same + 1))
    continue
  fi

  changes=$((changes + 1))

  if [[ -f "$target_file" ]]; then
    updates=$((updates + 1))
    echo "[generate-codex-skills] update: $skill_name/SKILL.md"
  else
    creates=$((creates + 1))
    echo "[generate-codex-skills] create: $skill_name/SKILL.md"
  fi

  if [[ "$MODE" == "apply" ]]; then
    mkdir -p "$(dirname "$target_file")"
    cp "$generated_file" "$target_file"
  fi
done < <(find "$SOURCE_DIR" -mindepth 2 -maxdepth 2 -name 'SKILL.md' -type f | sort)

echo "[generate-codex-skills] mode=$MODE source=$SOURCE_DIR target=$TARGET_DIR"
echo "[generate-codex-skills] same=$same create=$creates update=$updates invalid=$invalid"

if [[ "$MODE" == "dry-run" ]]; then
  echo "[generate-codex-skills] dry-run complete (no file changes)."
fi

if [[ "$MODE" == "check" ]]; then
  if [[ $invalid -gt 0 ]]; then
    echo "[generate-codex-skills] check failed: invalid generated output detected" >&2
    exit 1
  fi
  if [[ $changes -gt 0 ]]; then
    echo "[generate-codex-skills] check failed: codex skills drift detected. Run: bash scripts/generate-codex-skills.sh --apply" >&2
    exit 1
  fi
  echo "[generate-codex-skills] check passed."
fi

if [[ "$MODE" == "apply" ]]; then
  if [[ $invalid -gt 0 ]]; then
    echo "[generate-codex-skills] apply failed: invalid generated output detected" >&2
    exit 1
  fi
  echo "[generate-codex-skills] apply complete."
fi
