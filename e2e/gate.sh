#!/usr/bin/env bash
# The visualization gates, exactly as CI runs them (VIZ-H G).
#
#   e2e/gate.sh pr [shard]     the PR gate (CI runs each shard as its own job)
#   e2e/gate.sh full [shard]   the full matrix (nightly and on demand; the
#                              nightly runs each shard as its own job)
#   e2e/gate.sh coverage       proves the full shards together list exactly
#                              the tests one unsharded `full` run lists
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
#   functional-a  viz-list-keys, viz-static, viz-heap-graph, frontier,
#                 viz-linked-list, viz-annotated-tree,
#                 viz-js-statics, viz-dsa-statics, viz-js-core,
#                 viz-fe-statics                                    ~650
#   functional-b  viz-step-through, viz-shell, viz-fallbacks,
#                 viz-sliding-window, viz-dp-table, viz-frames,
#                 viz-turn-stack, viz-ssr-stream,
#                 viz-sw-lifecycle                                  ~540
#   design-a      contrast crawl at rest (375, 768, 1440)             ~130
#   design-b      full-motion contrast (375), consistency; visual
#                 baselines inside the image (~1150 more)             ~1440
#   motion-a      event-loop, frontier and linked-list steps, reveals,
#                 instant, interaction                              ~370
#   motion-b      list-keys reveals, interruption, sliding-window
#                 and js-core steps                                 ~420
#   motion-c      every list-keys ride (1024), dp-table, frames,
#                 turn-stack, ssr-stream and sw-lifecycle steps     ~400
#   stress-a      stress flagships, frontier, dp table, frames,
#                 turn stack, ssr stream and sw lifecycle           ~420
#   stress-b      stress adversarial, hydration, linked list,
#                 sliding window, annotated tree, js and dsa statics,
#                 js core, frontend statics                         ~375
# Without a shard, `pr` runs them all in sequence.
#
# Full shards (viz-nightly.yml runs each as its own job; one job for the
# whole matrix outgrew its 180 minutes after wave 4). The functional and
# design shards are the PR ones (the design shards' full-motion contrast runs
# at 375, 768 and 1440 in this tier). Motion is cut by width: motion-<w> runs
# every width-bound motion test (its title carries @<w>) at that width only,
# motion-once the width-free ones once. Stress is cut by file, the full
# configurations (STRESS_TIER=full). Seconds of test time on CI:
#   functional-a, functional-b, design-a, design-b     as in the PR tier
#   motion-320 ... motion-1920   every width-bound motion spec      ~1050 each
#   motion-once  instant, interaction, interruption, list-keys
#                reveals, the reduced and interrupted reveals         ~460
#   stress-1     flagships                                          ~1200
#   stress-2     adversarial, annotated tree, dp table, frames,
#                turn stack                                         ~1150
#   stress-3     sliding window, hydration, frontend statics        ~1200
#   stress-4     frontier, sw lifecycle                             ~1250
#   stress-5     ssr stream, js core, linked list, js and dsa
#                statics                                            ~1300
# Without a shard, `full` runs the whole matrix in two commands (the
# definition `coverage` checks the shards against).
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
  coverage) widths=320,375,768,1024,1440,1920 ;;
  *) echo "usage: e2e/gate.sh pr [shard] | full [shard] | coverage" >&2; exit 2 ;;
esac
export E2E_BASE_URL=${E2E_BASE_URL:-http://localhost:3100}
export MOTION_WIDTHS=${MOTION_WIDTHS:-$widths}
export STRESS_TIER=$tier
visual=()
if [ "${VIZ_VISUAL:-}" = 1 ]; then visual=(--project=visual); fi
# LIST=1 only lists the tests a command would run (the coverage check).
list=()
if [ "${LIST:-}" = 1 ]; then list=(--list); fi
pw() { npx playwright test ${list[@]+"${list[@]}"} "$@"; }
stress() { npx playwright test -c e2e/stress/playwright.stress.config.ts ${list[@]+"${list[@]}"} "$@"; }
FULL_SHARDS="functional-a functional-b design-a design-b motion-once motion-320 motion-375 motion-768 motion-1024 motion-1440 motion-1920 stress-1 stress-2 stress-3 stress-4 stress-5"

run() {
  case "$1" in
    functional-a) pw --project=functional e2e/viz-list-keys.spec.ts e2e/viz-static.spec.ts e2e/viz-heap-graph.spec.ts e2e/viz-frontier.spec.ts e2e/viz-linked-list.spec.ts e2e/viz-annotated-tree.spec.ts e2e/viz-js-statics.spec.ts e2e/viz-dsa-statics.spec.ts e2e/viz-js-core.spec.ts e2e/viz-fe-statics.spec.ts ;;
    functional-b) pw --project=functional e2e/viz-step-through.spec.ts e2e/viz-shell.spec.ts e2e/viz-fallbacks.spec.ts e2e/viz-sliding-window.spec.ts e2e/viz-dp-table.spec.ts e2e/viz-frames.spec.ts e2e/viz-turn-stack.spec.ts e2e/viz-ssr-stream.spec.ts e2e/viz-sw-lifecycle.spec.ts ;;
    design-a) pw --project=gates e2e/gates/contrast.spec.ts --grep-invert "full motion" ;;
    design-b)
      local a=0 b=0
      pw --project=gates e2e/gates/contrast.spec.ts --grep "full motion" || a=$?
      pw --project=gates ${visual[@]+"${visual[@]}"} e2e/gates/consistency.spec.ts e2e/gates/visual.spec.ts || b=$?
      return $((a || b)) ;;
    motion-a) pw --project=motion e2e/motion/event-loop-steps.spec.ts e2e/motion/linked-list-steps.spec.ts e2e/motion/reveal.spec.ts e2e/motion/instant-paths.spec.ts e2e/motion/interaction.spec.ts e2e/motion/frontier-steps.spec.ts ;;
    motion-b) pw --project=motion e2e/motion/list-keys-reveals.spec.ts e2e/motion/interruption.spec.ts e2e/motion/sliding-window-steps.spec.ts e2e/motion/js-core-steps.spec.ts ;;
    motion-c) pw --project=motion e2e/motion/list-keys-rides.spec.ts e2e/motion/dp-table-steps.spec.ts e2e/motion/frames-steps.spec.ts e2e/motion/turn-stack-steps.spec.ts e2e/motion/ssr-stream-steps.spec.ts e2e/motion/sw-lifecycle-steps.spec.ts ;;
    # Full tier only: motion by width, then the width-free motion tests.
    motion-once) pw --project=motion --grep-invert '@[0-9]+\b' ;;
    motion-[0-9]*) MOTION_WIDTHS=${1#motion-} pw --project=motion --grep "@${1#motion-}\\b" ;;
    stress-1) stress flagships ;;
    stress-2) stress adversarial annotated-tree dp-table frames turn-stack ;;
    stress-3) stress sliding-window hydration fe-statics ;;
    stress-4) stress frontier sw-lifecycle ;;
    stress-5) stress ssr-stream js-core linked-list js-statics dsa-statics ;;
    stress-a) stress flagships frontier dp-table frames turn-stack ssr-stream sw-lifecycle ;;
    stress-b) stress adversarial hydration linked-list sliding-window annotated-tree js-statics dsa-statics js-core fe-statics ;;
    *) echo "unknown shard $1" >&2; return 2 ;;
  esac
}

# The coverage check: the tests the full shards list, together, against the
# tests one unsharded full run lists (same widths, same tier). Lines are
# reduced to project, file and title.
if [ "$tier" = coverage ]; then
  norm() { grep -E '^ *\[[a-z]+\] › ' | sed -E 's/^ *//; s/:[0-9]+:[0-9]+ › / › /' | sort; }
  export STRESS_TIER=full MOTION_WIDTHS=$widths
  list=(--list) visual=(--project=visual)
  whole=$( { pw --project=functional --project=gates --project=motion --project=visual; stress; } | norm)
  parts=$(for s in $FULL_SHARDS; do run "$s"; done | norm)
  if [ "$whole" = "$parts" ]; then
    echo "coverage: the full shards list the same $(printf '%s\n' "$whole" | wc -l | tr -d ' ') tests as one full run"
    exit 0
  fi
  echo "coverage: the full shards differ from one full run (< whole, > shards):" >&2
  diff <(printf '%s\n' "$whole") <(printf '%s\n' "$parts") >&2 || true
  exit 1
fi

status=0
start=$(date +%s)
if [ "$shard" = all ]; then
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
  case "$tier:$shard" in
    full:motion-*|full:stress-[0-9]|full:functional-*|full:design-*|pr:functional-*|pr:design-*|pr:motion-[abc]|pr:stress-[ab]) ;;
    *) echo "no shard $shard in the $tier tier" >&2; exit 2 ;;
  esac
  run "$shard" || status=$?
fi
echo "gate $tier $shard: $(($(date +%s) - start)) s"
exit $status
