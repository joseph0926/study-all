#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if ! git -C "$ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Not a git repository: $ROOT" >&2
  exit 1
fi

git -C "$ROOT" config core.hooksPath .githooks

echo "[hooks] core.hooksPath=.githooks"
echo "[hooks] enabled: post-checkout, post-merge"
echo "[hooks] managed sync targets: ~/.claude, ~/.codex"
echo "[hooks] disable temporarily: export STUDY_ALL_SYNC_DISABLE=1"
