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
    },
    {
      'bfs-levels': ['binary-matrix-8dir'],
      'binary-matrix-8dir': ['binary-matrix-8dir'],
      'dijkstra-lazy-heap': ['min-effort-grid'],
      'min-effort-grid': ['min-effort-grid'],
      'bst-iterator-stack': ['bst-iterator-stack'],
    },
  ],
  'heap-graph': [
    () => import('./engines/heap-graph'),
    1013,
    874,
    { 'identity-alias-rebind-spread': [1013, 874, 874], 'spread-vs-nested-vs-deep': [1533, 1088, 1088] },
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
    },
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
}
