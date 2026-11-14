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
#   pr    functional e2e, the contrast crawl (at rest, and in full motion
#         at 375), the consistency gate, visual baselines, the strict motion
#         gate at 1024 (G ruling 7: 375 and 1440 run nightly) with every
#         list-keys ride, and the stress PR tier (core widths, CSS zoom, very
#         large text, a full-motion pass, hover, print, hydration).
#   full  the same suites with every stress configuration and the R1 extras,
#         motion and the rides at 320 to 1920, the full-motion crawl at 375,
#         768 and 1440, and hydration under very large text.
#
# PR shards (seconds of test time, measured natively on macOS against a warm
# dev server, H3 round 2 integration; the CI image adds job setup):
#   functional-a  viz-list-keys, viz-static                          ~230
#   functional-b  viz-step-through, viz-shell, viz-fallbacks          ~235
#   design-a      contrast crawl at rest (375, 768, 1440)             ~130
#   design-b      full-motion contrast (375), consistency; visual
#                 baselines inside the image (~200 more)              ~290
#   motion-a      event-loop steps, reveals, instant, interaction     ~230
#   motion-b      list-keys reveals, interruption                     ~305
#   motion-c      every list-keys ride (1024)                          ~75
#   stress-a      stress flagships                                    ~225
#   stress-b      stress adversarial and hydration                    ~100
# Without a shard, `pr` runs them all in sequence.
#
# Motion timing (tween length, cuts, the 560 ms beat budget, mirrored
# durations) is enforced locally and advisory on CI (CI=true), where free
# runners cannot measure it: run this script locally before every merge.
# MOTION_REQUIRE_TIMING=1|0 overrides (e2e/motion/helpers.ts).
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
    design-a) pw --project=gates e2e/gates/contrast.spec.ts --grep-invert "full motion" ;;
    design-b)
      local a=0 b=0
      pw --project=gates e2e/gates/contrast.spec.ts --grep "full motion" || a=$?
      pw --project=gates ${visual[@]+"${visual[@]}"} e2e/gates/consistency.spec.ts e2e/gates/visual.spec.ts || b=$?
      return $((a || b)) ;;
    motion-a) pw --project=motion e2e/motion/event-loop-steps.spec.ts e2e/motion/reveal.spec.ts e2e/motion/instant-paths.spec.ts e2e/motion/interaction.spec.ts ;;
    motion-b) pw --project=motion e2e/motion/list-keys-reveals.spec.ts e2e/motion/interruption.spec.ts ;;
    motion-c) pw --project=motion e2e/motion/list-keys-rides.spec.ts ;;
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
    for s in functional-a functional-b design-a design-b motion-a motion-b motion-c stress-a stress-b; do
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
