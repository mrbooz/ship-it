#!/usr/bin/env bash
# Opens the arcade (SHIP IT + MERGE CONFLICT MINI GOLF) in the user's
# default browser. Falls back to printing the link when there's no GUI to
# open it in (headless/remote sessions).
set -euo pipefail

URL="https://ship-it-prod-2026.web.app/arcade/"

if command -v open >/dev/null 2>&1; then
  open "$URL"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$URL"
elif command -v start >/dev/null 2>&1; then
  start "$URL"
else
  echo "Open this link to play: $URL"
fi
