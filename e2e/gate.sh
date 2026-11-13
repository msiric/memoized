#!/usr/bin/env bash
# The visualization gates, exactly as CI runs them (VIZ-H G).
#
#   e2e/gate.sh pr [shard]   the PR gate (CI runs each shard as its own job)
#   e2e/gate.sh full         the full matrix (nightly and on demand)
#
# Needs a dev server with the gallery at E2E_BASE_URL (default
# http://localhost:3100). The visual project runs only inside the Playwright
# Linux image (VIZ_VISUAL=1, as in CI); locally use `yarn test:viz:visual`.
#
# Tiers:
#   pr    functional e2e, the contrast crawl, visual baselines, the strict
#         motion gate at 1024 (G ruling 7: 375 and 1440 run nightly) and the
#         stress PR tier (core widths, CSS zoom, very large text, a
#         full-motion pass, hover, print, hydration).
#   full  the same suites with every stress configuration and the R1 extras,
#         and motion at 320 to 1920.
#
# PR shards (seconds of test time measured in the CI image, before job setup):
#   functional-a  viz-list-keys, viz-static                      ~230
#   functional-b  viz-step-through, viz-shell                    ~220
#   design        contrast crawl and visual baselines            ~115
#   motion-a      event-loop steps, reveals, instant, interaction ~210
#   motion-b      list-keys reveals, interruption                ~285
#   stress-a      stress flagships                               ~225
#   stress-b      stress adversarial and hydration               ~110
# Without a shard, `pr` runs them all in sequence.
set -euo pipefail
cd "$(dirname "$0")/.."
tier=${1:-pr}
shard=${2:-all}
case "$tier" in
  pr) widths=1024 ;;
  full) widths=320,375,768,1024,1440,1920 ;;
  *) echo "usage: e2e/gate.sh pr [shard] | full" >&2; exit 2 ;;
esac
export E2E_BASE_URL=${E2E_BASE_URL:-http://localhost:3100}
export MOTION_WIDTHS=${MOTION_WIDTHS:-$widths}
export STRESS_TIER=$tier
visual=()
if [ "${VIZ_VISUAL:-}" = 1 ]; then visual=(--project=visual); fi
pw() { npx playwright test "$@"; }
stress() { npx playwright test -c e2e/stress/playwright.stress.config.ts "$@"; }

run() {
  case "$1" in
    functional-a) pw --project=functional e2e/viz-list-keys.spec.ts e2e/viz-static.spec.ts ;;
    functional-b) pw --project=functional e2e/viz-step-through.spec.ts e2e/viz-shell.spec.ts ;;
    design) pw --project=gates ${visual[@]+"${visual[@]}"} ;;
    motion-a) pw --project=motion e2e/motion/event-loop-steps.spec.ts e2e/motion/reveal.spec.ts e2e/motion/instant-paths.spec.ts e2e/motion/interaction.spec.ts ;;
    motion-b) pw --project=motion e2e/motion/list-keys-reveals.spec.ts e2e/motion/interruption.spec.ts ;;
    stress-a) stress flagships ;;
    stress-b) stress adversarial hydration ;;
    *) echo "unknown shard $1" >&2; return 2 ;;
  esac
}

status=0
start=$(date +%s)
if [ "$tier" = full ] || [ "$shard" = all ]; then
  if [ "$tier" = full ]; then
    pw --project=functional --project=gates --project=motion ${visual[@]+"${visual[@]}"} || status=$?
    stress || status=$?
  else
    for s in functional-a functional-b design motion-a motion-b stress-a stress-b; do
      t=$(date +%s)
      run "$s" || status=$?
      echo "shard $s: $(($(date +%s) - t)) s"
    done
  fi
else
  run "$shard" || status=$?
fi
echo "gate $tier $shard: $(($(date +%s) - start)) s"
exit $status
