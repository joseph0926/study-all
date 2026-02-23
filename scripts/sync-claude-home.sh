#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC_CLAUDE="$ROOT/.claude"
TARGET_CLAUDE="${CLAUDE_HOME:-$HOME/.claude}"
MANIFEST_FILE="$TARGET_CLAUDE/.study-all-sync-manifest"

MODE="dry-run"
PRUNE_MANAGED=0
RULES_MODE="copy"
RULES_COPY_BLOCKED=0

usage() {
  cat <<USAGE
Usage: bash scripts/sync-claude-home.sh [options]

Options:
  --dry-run            Print planned changes only (default)
  --apply              Apply changes to target CLAUDE dir
  --prune-managed      Delete previously managed files that no longer exist in source
  --rules-mode MODE    copy|symlink (default: copy)
  --target PATH        Override target path (default: \$CLAUDE_HOME or \$HOME/.claude)
  -h, --help           Show help

Safety defaults:
  - Existing unmanaged files are never overwritten.
  - settings/secret-like files are not synced.
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
    --prune-managed)
      PRUNE_MANAGED=1
      ;;
    --rules-mode)
      if [[ $# -lt 2 ]]; then
        echo "Missing value for --rules-mode" >&2
        exit 1
      fi
      shift
      RULES_MODE="${1:-}"
      ;;
    --target)
      if [[ $# -lt 2 ]]; then
        echo "Missing value for --target" >&2
        exit 1
      fi
      shift
      TARGET_CLAUDE="${1:-}"
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

if [[ "$RULES_MODE" != "copy" && "$RULES_MODE" != "symlink" ]]; then
  echo "Invalid --rules-mode: $RULES_MODE (expected: copy|symlink)" >&2
  exit 1
fi

if [[ ! -d "$SRC_CLAUDE/skills" ]]; then
  echo "Source skills dir not found: $SRC_CLAUDE/skills" >&2
  exit 1
fi

if [[ ! -d "$SRC_CLAUDE/commands" ]]; then
  echo "Source commands dir not found: $SRC_CLAUDE/commands" >&2
  exit 1
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

CURRENT_MANAGED="$TMP_DIR/current-managed.txt"
PREV_MANAGED="$TMP_DIR/prev-managed.txt"
NEXT_MANAGED="$TMP_DIR/next-managed.txt"
ACT_CREATE="$TMP_DIR/action-create.txt"
ACT_UPDATE="$TMP_DIR/action-update.txt"
ACT_ADOPT="$TMP_DIR/action-adopt.txt"
ACT_SKIP="$TMP_DIR/action-skip.txt"
ACT_PRUNE="$TMP_DIR/action-prune.txt"

: > "$CURRENT_MANAGED"
: > "$PREV_MANAGED"
: > "$NEXT_MANAGED"
: > "$ACT_CREATE"
: > "$ACT_UPDATE"
: > "$ACT_ADOPT"
: > "$ACT_SKIP"
: > "$ACT_PRUNE"

contains_line() {
  local needle="$1"
  local file="$2"
  grep -Fqx "$needle" "$file" 2>/dev/null
}

append_unique() {
  local line="$1"
  local file="$2"
  if ! contains_line "$line" "$file"; then
    printf '%s\n' "$line" >> "$file"
  fi
}

if [[ -f "$MANIFEST_FILE" ]]; then
  grep -vE '^\s*($|#)' "$MANIFEST_FILE" > "$PREV_MANAGED" || true
fi

while IFS= read -r f; do
  rel="${f#"$SRC_CLAUDE"/}"
  append_unique "$rel" "$CURRENT_MANAGED"
done < <(find "$SRC_CLAUDE/skills" -type f | sort)

while IFS= read -r f; do
  rel="${f#"$SRC_CLAUDE"/}"
  append_unique "$rel" "$CURRENT_MANAGED"
done < <(find "$SRC_CLAUDE/commands" -maxdepth 1 -type f -name 'legacy-*.md' | sort)

if [[ "$RULES_MODE" == "copy" ]]; then
  if [[ -d "$SRC_CLAUDE/rules" ]]; then
    while IFS= read -r f; do
      rel="${f#"$SRC_CLAUDE"/}"
      append_unique "$rel" "$CURRENT_MANAGED"
    done < <(find "$SRC_CLAUDE/rules" -type f | sort)
  fi
else
  append_unique "@rules-symlink" "$CURRENT_MANAGED"
fi

if [[ "$MODE" == "apply" ]]; then
  mkdir -p "$TARGET_CLAUDE"
fi

RULES_TARGET="$TARGET_CLAUDE/rules"
RULES_SOURCE="$SRC_CLAUDE/rules"

if [[ "$RULES_MODE" == "copy" ]]; then
  if [[ -L "$RULES_TARGET" ]]; then
    if contains_line "@rules-symlink" "$PREV_MANAGED"; then
      if [[ "$MODE" == "apply" ]]; then
        rm -f "$RULES_TARGET"
      fi
    else
      echo "rules/ is symlink but unmanaged. skip rules copy." >> "$ACT_SKIP"
      RULES_COPY_BLOCKED=1
    fi
  fi
else
  if [[ -e "$RULES_TARGET" && ! -L "$RULES_TARGET" ]]; then
    if contains_line "@rules-symlink" "$PREV_MANAGED"; then
      if [[ "$MODE" == "apply" ]]; then
        rm -rf "$RULES_TARGET"
      fi
    else
      echo "rules/ exists as directory and is unmanaged. skip rules symlink." >> "$ACT_SKIP"
    fi
  fi

  if [[ -L "$RULES_TARGET" ]]; then
    current_link="$(readlink "$RULES_TARGET" || true)"
    if [[ "$current_link" == "$RULES_SOURCE" ]]; then
      append_unique "@rules-symlink" "$NEXT_MANAGED"
    elif contains_line "@rules-symlink" "$PREV_MANAGED"; then
      if [[ "$MODE" == "apply" ]]; then
        rm -f "$RULES_TARGET"
        ln -s "$RULES_SOURCE" "$RULES_TARGET"
      fi
      append_unique "@rules-symlink" "$NEXT_MANAGED"
      echo "rules symlink retargeted" >> "$ACT_UPDATE"
    else
      echo "rules symlink points elsewhere and is unmanaged. skip." >> "$ACT_SKIP"
    fi
  elif [[ ! -e "$RULES_TARGET" ]]; then
    if [[ "$MODE" == "apply" ]]; then
      ln -s "$RULES_SOURCE" "$RULES_TARGET"
    fi
    append_unique "@rules-symlink" "$NEXT_MANAGED"
    echo "rules symlink created" >> "$ACT_CREATE"
  fi
fi

while IFS= read -r rel; do
  [[ -z "$rel" ]] && continue
  [[ "$rel" == "@rules-symlink" ]] && continue

  if [[ "$RULES_MODE" == "symlink" && "$rel" == rules/* ]]; then
    continue
  fi
  if [[ "$RULES_MODE" == "copy" && "$RULES_COPY_BLOCKED" -eq 1 && "$rel" == rules/* ]]; then
    continue
  fi

  src_file="$SRC_CLAUDE/$rel"
  dst_file="$TARGET_CLAUDE/$rel"

  prev_managed=0
  if contains_line "$rel" "$PREV_MANAGED"; then
    prev_managed=1
  fi

  if [[ -e "$dst_file" || -L "$dst_file" ]]; then
    if [[ "$prev_managed" -eq 1 ]]; then
      if cmp -s "$src_file" "$dst_file" 2>/dev/null; then
        append_unique "$rel" "$NEXT_MANAGED"
      else
        if [[ "$MODE" == "apply" ]]; then
          mkdir -p "$(dirname "$dst_file")"
          cp "$src_file" "$dst_file"
        fi
        append_unique "$rel" "$NEXT_MANAGED"
        echo "$rel" >> "$ACT_UPDATE"
      fi
    else
      if cmp -s "$src_file" "$dst_file" 2>/dev/null; then
        append_unique "$rel" "$NEXT_MANAGED"
        echo "$rel" >> "$ACT_ADOPT"
      else
        echo "$rel" >> "$ACT_SKIP"
      fi
    fi
  else
    if [[ "$MODE" == "apply" ]]; then
      mkdir -p "$(dirname "$dst_file")"
      cp "$src_file" "$dst_file"
    fi
    append_unique "$rel" "$NEXT_MANAGED"
    echo "$rel" >> "$ACT_CREATE"
  fi
done < "$CURRENT_MANAGED"

if [[ "$PRUNE_MANAGED" -eq 1 ]]; then
  while IFS= read -r rel; do
    [[ -z "$rel" ]] && continue
    [[ "$rel" == "@rules-symlink" ]] && continue

    if ! contains_line "$rel" "$CURRENT_MANAGED"; then
      dst_file="$TARGET_CLAUDE/$rel"
      if [[ -e "$dst_file" || -L "$dst_file" ]]; then
        if [[ "$MODE" == "apply" ]]; then
          rm -f "$dst_file"
        fi
        echo "$rel" >> "$ACT_PRUNE"
      fi
    fi
  done < "$PREV_MANAGED"
else
  while IFS= read -r rel; do
    [[ -z "$rel" ]] && continue
    [[ "$rel" == "@rules-symlink" ]] && continue
    if ! contains_line "$rel" "$CURRENT_MANAGED"; then
      dst_file="$TARGET_CLAUDE/$rel"
      if [[ -e "$dst_file" || -L "$dst_file" ]]; then
        append_unique "$rel" "$NEXT_MANAGED"
      fi
    fi
  done < "$PREV_MANAGED"
fi

if contains_line "@rules-symlink" "$PREV_MANAGED" && [[ "$RULES_MODE" == "copy" ]]; then
  :
fi

create_count=$(wc -l < "$ACT_CREATE" | tr -d ' ')
update_count=$(wc -l < "$ACT_UPDATE" | tr -d ' ')
adopt_count=$(wc -l < "$ACT_ADOPT" | tr -d ' ')
skip_count=$(wc -l < "$ACT_SKIP" | tr -d ' ')
prune_count=$(wc -l < "$ACT_PRUNE" | tr -d ' ')

printf '[sync] mode=%s target=%s rules-mode=%s prune=%s\n' "$MODE" "$TARGET_CLAUDE" "$RULES_MODE" "$PRUNE_MANAGED"
printf '[sync] create=%s update=%s adopt=%s skip=%s prune=%s\n' "$create_count" "$update_count" "$adopt_count" "$skip_count" "$prune_count"

if [[ "$skip_count" -gt 0 ]]; then
  echo "[sync] skipped (unmanaged conflict):"
  sed 's/^/  - /' "$ACT_SKIP"
fi

if [[ "$create_count" -gt 0 ]]; then
  echo "[sync] create list:"
  sed 's/^/  + /' "$ACT_CREATE"
fi

if [[ "$update_count" -gt 0 ]]; then
  echo "[sync] update list:"
  sed 's/^/  ~ /' "$ACT_UPDATE"
fi

if [[ "$adopt_count" -gt 0 ]]; then
  echo "[sync] adopt list (already same content):"
  sed 's/^/  = /' "$ACT_ADOPT"
fi

if [[ "$prune_count" -gt 0 ]]; then
  echo "[sync] prune list:"
  sed 's/^/  - /' "$ACT_PRUNE"
fi

if [[ "$MODE" == "apply" ]]; then
  {
    echo "# study-all managed manifest"
    echo "# generated: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
    sort -u "$NEXT_MANAGED"
  } > "$MANIFEST_FILE"
  echo "[sync] manifest updated: $MANIFEST_FILE"
else
  echo "[sync] dry-run complete (no file changes)."
fi
