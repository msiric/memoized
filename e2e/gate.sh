#!/usr/bin/env bash
# The visualization gates, exactly as CI runs them (VIZ-H G).
#
#   e2e/gate.sh pr     the PR gate (CI on every pull request)
#   e2e/gate.sh full   the full matrix (nightly and on demand)
#
# Needs a dev server with the gallery at E2E_BASE_URL (default
# http://localhost:3100). The visual project runs only inside the Playwright
# Linux image (VIZ_VISUAL=1, as in CI); locally use `yarn test:viz:visual`.
#
# Tiers:
#   pr    unit gates run in the test job; here: functional e2e, the contrast
#         crawl, visual baselines, the strict motion gate at 375, 1024 and
#         1440, and the stress PR tier (core widths, CSS zoom, very large
#         text, a full-motion pass, hover, print, hydration).
#   full  the same suites with the stress matrix's every width, zoom and text
#         size and the R1 extra configurations, and motion at 320 to 1920.
set -euo pipefail
cd "$(dirname "$0")/.."
tier=${1:-pr}
case "$tier" in
  pr) widths=375,1024,1440 ;;
  full) widths=320,375,768,1024,1440,1920 ;;
  *) echo "usage: e2e/gate.sh pr|full" >&2; exit 2 ;;
esac
export E2E_BASE_URL=${E2E_BASE_URL:-http://localhost:3100}
export MOTION_WIDTHS=${MOTION_WIDTHS:-$widths}
export STRESS_TIER=$tier
projects=(--project=functional --project=gates --project=motion)
if [ "${VIZ_VISUAL:-}" = 1 ]; then projects+=(--project=visual); fi
status=0
start=$(date +%s)
npx playwright test "${projects[@]}" || status=$?
mid=$(date +%s)
npx playwright test -c e2e/stress/playwright.stress.config.ts || status=$?
end=$(date +%s)
echo "gate $tier: e2e $((mid - start)) s, stress $((end - mid)) s, total $((end - start)) s"
exit $status
