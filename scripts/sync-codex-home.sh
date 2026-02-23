#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC_SKILLS="$ROOT/.codex/skills"
TARGET_CODEX="${CODEX_HOME:-$HOME/.codex}"
TARGET_SKILLS="$TARGET_CODEX/skills"
MANIFEST_FILE="$TARGET_CODEX/.study-all-sync-manifest"

MODE="dry-run"
PRUNE_MANAGED=0

usage() {
  cat <<USAGE
Usage: bash scripts/sync-codex-home.sh [options]

Options:
  --dry-run          Print planned changes only (default)
  --apply            Apply changes to target Codex dir
  --prune-managed    Delete previously managed files that no longer exist in source
  --target PATH      Override target path (default: \$CODEX_HOME or \$HOME/.codex)
  -h, --help         Show help

Safety defaults:
  - Existing unmanaged files are never overwritten.
  - Only .codex/skills is synced.
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
    --target)
      if [[ $# -lt 2 ]]; then
        echo "Missing value for --target" >&2
        exit 1
      fi
      shift
      TARGET_CODEX="${1:-}"
      TARGET_SKILLS="$TARGET_CODEX/skills"
      MANIFEST_FILE="$TARGET_CODEX/.study-all-sync-manifest"
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

if [[ ! -d "$SRC_SKILLS" ]]; then
  echo "Source skills dir not found: $SRC_SKILLS" >&2
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
  rel="${f#"$SRC_SKILLS"/}"
  append_unique "$rel" "$CURRENT_MANAGED"
done < <(find "$SRC_SKILLS" -type f | sort)

if [[ "$MODE" == "apply" ]]; then
  mkdir -p "$TARGET_SKILLS"
fi

while IFS= read -r rel; do
  [[ -z "$rel" ]] && continue
  src_file="$SRC_SKILLS/$rel"
  dst_file="$TARGET_SKILLS/$rel"

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
    if ! contains_line "$rel" "$CURRENT_MANAGED"; then
      dst_file="$TARGET_SKILLS/$rel"
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
    if ! contains_line "$rel" "$CURRENT_MANAGED"; then
      dst_file="$TARGET_SKILLS/$rel"
      if [[ -e "$dst_file" || -L "$dst_file" ]]; then
        append_unique "$rel" "$NEXT_MANAGED"
      fi
    fi
  done < "$PREV_MANAGED"
fi

create_count=$(wc -l < "$ACT_CREATE" | tr -d ' ')
update_count=$(wc -l < "$ACT_UPDATE" | tr -d ' ')
adopt_count=$(wc -l < "$ACT_ADOPT" | tr -d ' ')
skip_count=$(wc -l < "$ACT_SKIP" | tr -d ' ')
prune_count=$(wc -l < "$ACT_PRUNE" | tr -d ' ')

printf '[sync-codex] mode=%s target=%s prune=%s\n' "$MODE" "$TARGET_CODEX" "$PRUNE_MANAGED"
printf '[sync-codex] create=%s update=%s adopt=%s skip=%s prune=%s\n' "$create_count" "$update_count" "$adopt_count" "$skip_count" "$prune_count"

if [[ "$skip_count" -gt 0 ]]; then
  echo "[sync-codex] skipped (unmanaged conflict):"
  sed 's/^/  - /' "$ACT_SKIP"
fi

if [[ "$create_count" -gt 0 ]]; then
  echo "[sync-codex] create list:"
  sed 's/^/  + /' "$ACT_CREATE"
fi

if [[ "$update_count" -gt 0 ]]; then
  echo "[sync-codex] update list:"
  sed 's/^/  ~ /' "$ACT_UPDATE"
fi

if [[ "$adopt_count" -gt 0 ]]; then
  echo "[sync-codex] adopt list (already same content):"
  sed 's/^/  = /' "$ACT_ADOPT"
fi

if [[ "$prune_count" -gt 0 ]]; then
  echo "[sync-codex] prune list:"
  sed 's/^/  - /' "$ACT_PRUNE"
fi

if [[ "$MODE" == "apply" ]]; then
  mkdir -p "$TARGET_CODEX"
  {
    echo "# study-all managed manifest (codex)"
    echo "# generated: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
    sort -u "$NEXT_MANAGED"
  } > "$MANIFEST_FILE"
  echo "[sync-codex] manifest updated: $MANIFEST_FILE"
else
  echo "[sync-codex] dry-run complete (no file changes)."
fi
