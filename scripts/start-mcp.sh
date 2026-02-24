#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
export STUDY_ROOT="$PROJECT_ROOT"
exec node "$PROJECT_ROOT/mcp/dist/src/index.js"
