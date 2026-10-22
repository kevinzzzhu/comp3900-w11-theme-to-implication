#!/usr/bin/env bash
# Fails if any tutor-only marker leaked into the student build.
set -euo pipefail
cd "$(dirname "$0")/.."
if grep -rIl "TUTOR_ONLY" dist >/dev/null 2>&1; then
  echo "LEAK: tutor-only content found in dist/:" >&2
  grep -rIl "TUTOR_ONLY" dist >&2
  exit 1
fi
echo "ok: no tutor-only content in dist/"
