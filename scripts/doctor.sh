#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
command -v swift >/dev/null || { echo "swift required"; exit 1; }
command -v bun >/dev/null || echo "warn: bun not found"
echo "latr-packages doctor OK"
