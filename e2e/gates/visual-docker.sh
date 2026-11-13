#!/usr/bin/env bash
# The visual gate in the Playwright Linux image (the one CI runs), against a
# dev server on this machine (E2E_BASE_URL, default http://localhost:3100,
# started with `VIZ_GALLERY=1 yarn dev -p 3100` or any `next dev`).
#
#   yarn test:viz:visual                       compare with the baselines
#   yarn test:viz:visual --update-snapshots    rewrite them after an intended change
set -euo pipefail
cd "$(dirname "$0")/../.."
version=$(node -p "require('@playwright/test/package.json').version")
base=${E2E_BASE_URL:-http://localhost:3100}
# The host, as the container sees it.
base=${base/localhost/host.docker.internal}
base=${base/127.0.0.1/host.docker.internal}
exec docker run --rm --ipc=host \
  -v "$PWD:$PWD" -w "$PWD" \
  -v "$PWD/e2e/gates/fonts.conf:/etc/fonts/local.conf:ro" \
  -e E2E_BASE_URL="$base" -e VIZ_VISUAL=1 \
  "mcr.microsoft.com/playwright:v$version-noble" \
  npx playwright test --project=visual "$@"
