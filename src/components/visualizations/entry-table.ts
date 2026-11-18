import type { ComponentType } from 'react'
import type { VizComponentProps } from './shell/types'

/**
 * The only registry data in a lesson's first-load JavaScript: per id, a lazy
 * loader and the reserved [narrow, wide] frame heights in px (for a static
 * figure, its default preset's). Keep it tiny.
 * `registry.test.ts` fails if a height drifts from the computed footprint or
 * an id is missing from the registry or the server renderers.
 */
export type VizEntry = readonly [
  load: () => Promise<{ default: ComponentType<VizComponentProps> }>,
  narrow: number,
  wide: number,
  /**
   * Static figures only: [narrow, wide, col] heights per preset, default
   * first (`col`: the full lesson column, from 1280).
   * Its presence marks the visual static: the server HTML is final and the
   * chunk loads only after a client-side navigation.
   */
  statics?: Record<string, readonly [number, number, number]>,
  /**
   * Step-throughs and explorables: heights per preset, default first (R2: every
   * reserved band is sized to the preset on screen): [narrow, wide, small,
   * tight, tighter], the frame laid out at the narrowest content width of
   * each band (H3 R2 Q16: a 375 phone, 768, a 320 phone, and very large
   * text), so the reserve holds at any text size.
   */
  steps?: Record<string, readonly [number, number, number, number, number]>,
  /**
   * Step-throughs with practice-answer presets: per preset, the presets its
   * frame needs resolved code for (`code` on `<Viz>`, from the content when
   * the page is built). Without them the frame renders nothing.
   */
  premium?: Record<string, readonly string[]>,
]

export const VIZ_TABLE: Record<string, VizEntry> = {
  'event-loop': [
    () => import('./engines/event-loop'),
    816,
    576,
    undefined,
    {
      'basic-ordering': [816, 576, 844, 1008, 1072],
      'microtask-queued-during-drain': [844, 716, 872, 964, 1072],
      'microtask-vs-timer-12345': [792, 672, 820, 984, 1048],
      'await-null': [792, 640, 840, 912, 964],
      'exercise-2-async1-async2': [812, 800, 812, 992, 1032],
      'who-called-inner': [876, 688, 876, 1028, 1096],
      'await-async-frames': [888, 716, 888, 1060, 1108],
    },
    {
      'who-called-inner': ['who-called-inner'],
      'await-async-frames': ['who-called-inner'],
    },
  ],
  'environment-records': [
    () => import('./engines/env-records'),
    890,
    572,
    {
      'var-vs-let-loop': [890, 572, 548],
      'factory-calls-vs-aliases': [830, 550, 526],
      'caller-is-not-lexical-parent': [664, 422, 422],
      'tdz-stops-lookup': [752, 526, 526],
    },
  ],
  'bfs-dfs-frontier': [
    () => import('./engines/frontier'),
    854,
    654,
    undefined,
    {
      'bfs-levels': [854, 654, 854, 998, 1054],
      'binary-matrix-8dir': [854, 654, 854, 1034, 1046],
      'dijkstra-lazy-heap': [876, 654, 876, 1028, 1064],
      'min-effort-grid': [854, 654, 854, 1034, 1034],
      'bst-iterator-stack': [826, 638, 826, 978, 1006],
      'dfs-directed-recstack': [866, 658, 890, 994, 1090],
      'dfs-back-edge': [866, 658, 866, 994, 1066],
      'dfs-finish-order': [868, 654, 892, 1016, 1092],
      'kahn-indegree': [820, 654, 844, 948, 1020],
      'course-schedule-ii-edges': [762, 654, 762, 898, 974],
      'kahn-cycle-stall': [808, 654, 808, 944, 1020],
      'mht-leaf-peeling': [862, 682, 862, 1010, 1042],
    },
    {
      'bfs-levels': ['binary-matrix-8dir'],
      'binary-matrix-8dir': ['binary-matrix-8dir'],
      'dijkstra-lazy-heap': ['min-effort-grid'],
      'min-effort-grid': ['min-effort-grid'],
      'bst-iterator-stack': ['bst-iterator-stack'],
      'kahn-indegree': ['course-schedule-ii-edges', 'mht-leaf-peeling'],
      'course-schedule-ii-edges': ['course-schedule-ii-edges', 'mht-leaf-peeling'],
      'kahn-cycle-stall': ['course-schedule-ii-edges', 'mht-leaf-peeling'],
      'mht-leaf-peeling': ['course-schedule-ii-edges', 'mht-leaf-peeling'],
    },
  ],
  'heap-graph': [
    () => import('./engines/heap-graph'),
    1013,
    874,
    {
      'identity-alias-rebind-spread': [1013, 874, 874],
      'spread-vs-nested-vs-deep': [1533, 1088, 1088],
      'gc-reachability-cycle-and-weak-edge': [1348, 1280, 1280],
      'retainer-paths': [1552, 1484, 1484],
    },
  ],
  'linked-list-frames': [
    () => import('./engines/linked-list/frames'),
    704,
    422,
    { 'floyd-rho': [704, 422, 422], 'full-reversal-strip': [914, 528, 528] },
  ],
  'annotated-tree': [
    () => import('./engines/annotated-tree'),
    826,
    472,
    {
      'max-path-gain-vs-through': [826, 472, 472],
      'trie-end-markers': [812, 558, 558],
      'suffix-tree-banana': [610, 542, 542],
      'combination-sum-take-skip': [803, 735, 735],
      'water-wells-virtual-source': [648, 422, 422],
      'k-pairs-lazy-grid': [1052, 734, 734],
      'hidden-class-transitions': [1174, 810, 810],
      'segment-tree-query-cover': [1850, 986, 986],
      'dsu-parent-forest': [1242, 722, 722],
      'insert-4-10-3-5-1-then-extract': [1116, 766, 766],
      'fib5': [988, 580, 580],
      'lps-interval-triangle': [1248, 846, 846],
      'diamond-reverse-edge': [1010, 690, 690],
      'clrs-23-min-cut': [546, 478, 478],
    },
  ],
  'prototype-object-graph': [
    () => import('./engines/heap-graph/prototype'),
    1118,
    618,
    {
      'lookup-and-shadowing': [1118, 618, 618],
      'constructor-fix': [1234, 654, 654],
      'extends-two-chains': [1454, 790, 790],
    },
  ],
  lanes: [
    () => import('./engines/lanes'),
    554,
    454,
    { 'debounce-vs-throttle': [554, 454, 454], 'event-dispatch-path': [962, 616, 616], 'oauth-pkce-channels': [886, 684, 684], 'union-vs-intersection': [880, 598, 598] },
  ],
  'linked-list-pointer-rewiring': [
    () => import('./engines/linked-list'),
    786,
    694,
    undefined,
    {
      'reverse-between-m2-n4': [786, 694, 838, 966, 1006],
      'palindrome-split-reverse-compare': [796, 682, 796, 936, 988],
      'palindrome-1221': [796, 682, 796, 956, 1004],
      'palindrome-1231': [784, 654, 784, 936, 1004],
    },
    {
      'palindrome-split-reverse-compare': ['palindrome-split-reverse-compare', 'palindrome-1221', 'palindrome-1231'],
      'palindrome-1221': ['palindrome-split-reverse-compare', 'palindrome-1221', 'palindrome-1231'],
      'palindrome-1231': ['palindrome-split-reverse-compare', 'palindrome-1221', 'palindrome-1231'],
    },
  ],
  'sliding-window': [
    () => import('./engines/sliding-window'),
    792,
    654,
    undefined,
    {
      'araaci-k2': [792, 654, 792, 968, 992],
      'araaci-k2-if': [768, 654, 768, 948, 960],
      'set-shrink-longest-substring': [792, 654, 792, 916, 992],
      'set-shrink-abcabcbb': [768, 654, 796, 896, 968],
      'set-shrink-abba': [768, 654, 768, 896, 968],
      'set-shrink-abba-if': [768, 654, 768, 896, 948],
    },
    {
      'set-shrink-longest-substring': ['set-shrink-longest-substring', 'set-shrink-abcabcbb', 'set-shrink-abba', 'set-shrink-abba-if'],
      'set-shrink-abcabcbb': ['set-shrink-longest-substring', 'set-shrink-abcabcbb', 'set-shrink-abba', 'set-shrink-abba-if'],
      'set-shrink-abba': ['set-shrink-longest-substring', 'set-shrink-abcabcbb', 'set-shrink-abba', 'set-shrink-abba-if'],
      'set-shrink-abba-if': ['set-shrink-longest-substring', 'set-shrink-abcabcbb', 'set-shrink-abba', 'set-shrink-abba-if'],
    },
  ],
  'dp-table-dependencies': [
    () => import('./engines/dp-table'),
    750,
    606,
    undefined,
    {
      'knapsack-1d-desc-vs-asc': [750, 606, 750, 850, 930],
      'knapsack-1d-asc': [746, 606, 750, 922, 958],
    },
    {
      'knapsack-1d-desc-vs-asc': ['knapsack-1d-desc-vs-asc', 'knapsack-1d-asc'],
      'knapsack-1d-asc': ['knapsack-1d-desc-vs-asc', 'knapsack-1d-asc'],
    },
  ],
  'hull-turn-stack': [
    () => import('./engines/turn-stack'),
    780,
    682,
    undefined,
    {
      'monotone-chain-turn-pops': [780, 682, 784, 956, 1020],
      'fence-collinear-lt': [784, 682, 784, 956, 1020],
      'fence-collinear-le': [784, 682, 784, 956, 1020],
    },
    {
      'monotone-chain-turn-pops': ['monotone-chain-turn-pops', 'fence-collinear-lt', 'fence-collinear-le'],
      'fence-collinear-lt': ['monotone-chain-turn-pops', 'fence-collinear-lt', 'fence-collinear-le'],
      'fence-collinear-le': ['monotone-chain-turn-pops', 'fence-collinear-lt', 'fence-collinear-le'],
    },
  ],
  'ssr-stream': [
    () => import('./engines/ssr-stream'),
    832,
    576,
    undefined,
    {
      'two-boundary-stream': [832, 576, 860, 1012, 1092],
      'renderToString-contrast': [724, 526, 724, 916, 956],
    },
  ],
  'list-keys': [
    () => import('./engines/list-keys'),
    862,
    546,
    undefined,
    {
      'index-insert-top': [862, 546, 890, 1082, 1218],
      'id-insert-top': [862, 546, 890, 1082, 1218],
      'index-delete-first': [714, 502, 782, 962, 1078],
      'index-append': [862, 546, 890, 1082, 1218],
      'random-key': [862, 546, 890, 1082, 1218],
      'parent-type-change': [770, 542, 826, 1006, 1070],
    },
  ],
  'generator-frames': [
    () => import('./engines/frames/generator-frames'),
    824,
    678,
    undefined,
    {
      'twoWay-next-arg': [824, 678, 824, 952, 1024],
      'take-closes-source': [758, 654, 758, 882, 958],
      'lazy-pipeline-pull': [838, 662, 838, 1018, 1050],
      'yield-star-forwarding': [810, 678, 810, 978, 1042],
    },
    {
      'twoWay-next-arg': ['twoWay-next-arg', 'take-closes-source', 'lazy-pipeline-pull', 'yield-star-forwarding'],
      'take-closes-source': ['twoWay-next-arg', 'take-closes-source', 'lazy-pipeline-pull', 'yield-star-forwarding'],
      'lazy-pipeline-pull': ['twoWay-next-arg', 'take-closes-source', 'lazy-pipeline-pull', 'yield-star-forwarding'],
      'yield-star-forwarding': ['twoWay-next-arg', 'take-closes-source', 'lazy-pipeline-pull', 'yield-star-forwarding'],
    },
  ],
  'worker-pool': [
    () => import('./engines/frames/worker-pool'),
    826,
    654,
    undefined,
    {
      'refill-on-settle': [826, 654, 826, 1006, 1058],
      'fixed-batches-contrast': [826, 702, 826, 974, 1026],
      'failure-stops-claims': [826, 654, 826, 954, 1026],
    },
    {
      'refill-on-settle': ['refill-on-settle', 'failure-stops-claims'],
      'fixed-batches-contrast': ['refill-on-settle', 'failure-stops-claims'],
      'failure-stops-claims': ['refill-on-settle', 'failure-stops-claims'],
    },
  ],
  'emit-frames': [
    () => import('./engines/frames/emit-frames'),
    850,
    654,
    undefined,
    {
      'once-consumed-by-nested-emit': [850, 654, 874, 998, 1050],
      'removed-before-turn': [780, 654, 780, 908, 980],
      'added-during-emit': [816, 654, 816, 996, 1028],
    },
    {
      'once-consumed-by-nested-emit': ['once-consumed-by-nested-emit', 'removed-before-turn', 'added-during-emit'],
      'removed-before-turn': ['once-consumed-by-nested-emit', 'removed-before-turn', 'added-during-emit'],
      'added-during-emit': ['once-consumed-by-nested-emit', 'removed-before-turn', 'added-during-emit'],
    },
  ],
}
