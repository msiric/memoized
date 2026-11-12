/**
 * Visualization Design System tokens, v3 (VIZ-H WS1).
 *
 * The only vocabulary the v2 system (shell, substrates, engines, primitives)
 * may use. Every value is traced to its source in a comment:
 *
 * - `P:` a platform file and line (the lesson UI the visual sits in). Paths
 *   are relative to `src/`.
 * - `D<n>:` a numbered decision in `VIZ/2026-11-12-hardening/H1-DECISIONS.md`
 *   (audit repo). Decisions amend the older VIZ-01 spec.
 * - `S:` the VIZ-01 design spec (`VIZ/2026-11-11-plan/D-DESIGN-SPEC.md`), for
 *   values the platform has no opinion on (stage motion, glyph roles).
 *
 * Rules the token lint (`tokens-lint.test.ts`) enforces outside this file:
 * no raw hex or rgb(a), no arbitrary Tailwind sizes (`text-[13px]`,
 * `p-[7px]`, `rounded-[10px]`) and no literal millisecond durations.
 *
 * Every text and graphic pairing is contrast-checked in `tokens-v3.test.ts`
 * (4.5:1 text, 3:1 graphics) against the surface it is drawn on, composited
 * with real alpha blending.
 *
 * Class strings are written out in full on purpose: Tailwind's JIT only emits
 * classes it can find literally in the source. Dark is the product (forced
 * dark theme, P: app/providers.tsx); `print:` variants carry the light roles.
 */

// ---------------------------------------------------------------------------
// Color roles. One meaning per hue (D4).
// ---------------------------------------------------------------------------

/** A Tailwind palette reference such as `zinc.400`. */
export type PaletteRef = `${string}.${number}`

export type RoleName =
  | 'inkStrong'
  | 'ink'
  | 'inkSecondary'
  | 'inkMuted'
  | 'line'
  | 'hairline'
  | 'hatch'
  | 'now'
  | 'accent'
  | 'accentHover'
  | 'onAccent'
  | 'focus'
  | 'result'
  | 'micro'
  | 'queued'
  | 'removed'
  | 'done'

export type Role = {
  meaning: string
  dark: PaletteRef | 'white'
  light: PaletteRef | 'white'
  /** How the role is told apart without color (WCAG 1.4.1, spec A7). */
  channel: string
  /** Where the value comes from. */
  source: string
}

export const roles: Record<RoleName, Role> = {
  inkStrong: {
    meaning: 'Headings and emphasis inside text alternatives',
    dark: 'white',
    light: 'zinc.900',
    channel: 'n/a',
    source: 'P: typography.ts:26,30 (prose headings and bold)',
  },
  ink: {
    meaning: 'Titles, prompts, values, glyph text',
    dark: 'zinc.100',
    light: 'zinc.900',
    channel: 'n/a',
    source: 'P: typography.ts:34; ProblemCard/index.tsx:268',
  },
  inkSecondary: {
    meaning: 'Captions, region labels, step bar, secondary text',
    dark: 'zinc.300',
    light: 'zinc.700',
    channel: 'n/a',
    source: 'P: ProblemCard/index.tsx:224; LessonStatus.tsx:91. D3 (caption zinc-300)',
  },
  inkMuted: {
    meaning: 'Tertiary text: empty states, provenance, line numbers, idle controls',
    dark: 'zinc.400',
    light: 'zinc.600',
    channel: 'n/a',
    source: 'P: typography.ts:25,36; designTokens.ts:115; Code.tsx:102',
  },
  line: {
    meaning: 'Glyph outlines (1 px) and connectors (1.5 px)',
    dark: 'zinc.500',
    light: 'zinc.500',
    channel: 'n/a',
    source: 'P: styles/tailwind.css:6 (comment tone); D1 (widths)',
  },
  hairline: {
    meaning: 'The one hairline: frame, panel and divider borders (decorative)',
    dark: 'zinc.700',
    light: 'zinc.200',
    channel: 'n/a',
    source: 'P: designTokens.ts:263; typography.ts:41; ProblemCard/index.tsx:253. D4 (one hairline)',
  },
  hatch: {
    meaning: 'Hatch stroke: unused, collectible, unreachable',
    dark: 'zinc.500',
    light: 'zinc.500',
    channel: 'The 45 degree hatch itself, plus a label',
    source: 'D4: hatch zinc-500 (print zinc-500 too: zinc-300 is 1.5:1 on white)',
  },
  now: {
    meaning: 'Changed this step: current code line, active glyph, new connector',
    dark: 'lime.400',
    light: 'lime.700',
    channel:
      'Drawn inside the glyph: a 2 px lime border plus a tinted fill (D5); 2.5 px connectors; a ▸ gutter mark on code lines',
    source: 'P: typography.ts:27; Code.tsx:173 (accent text). D5',
  },
  accent: {
    meaning: 'Filled primary control (Next), scrubber progress',
    dark: 'lime.500',
    light: 'lime.700',
    channel: 'Filled shape, and the label',
    source: 'P: Button.tsx:24 (filled); LessonStatus.tsx:29. D2',
  },
  accentHover: {
    meaning: 'Hovered or pressed filled control',
    dark: 'lime.600',
    light: 'lime.800',
    channel: 'n/a',
    source: 'P: Button.tsx:24 (hover lime-600)',
  },
  onAccent: {
    meaning: 'Text on the accent fill',
    dark: 'zinc.900',
    light: 'white',
    channel: 'n/a',
    source: 'P: Button.tsx:24; LessonStatus.tsx:29',
  },
  focus: {
    meaning: 'Keyboard focus ring: 2 px, offset 2. The only offset ring (D5)',
    dark: 'lime.500',
    light: 'lime.700',
    channel: 'The offset ring geometry (never used for data emphasis)',
    source: 'P: Select.tsx:23; mdx.tsx:70 (lime-500 focus). D5',
  },
  result: {
    meaning: 'Output only: console lines, printed values',
    dark: 'amber.400',
    light: 'amber.700',
    channel: 'Output lines are numbered with a › prefix. Never marks correct answers (D4)',
    source: 'P: designTokens.ts:119 (accentAmber). D4',
  },
  micro: {
    meaning: 'Microtask (job) queue items',
    dark: 'violet.400',
    light: 'violet.600',
    channel: 'Pill shape and the lane name',
    source: 'P: styles/tailwind.css:9 (syntax function hue). S: §2.1',
  },
  queued: {
    meaning: 'Waiting in a container: task queue, frontier, heap entries',
    dark: 'sky.400',
    light: 'sky.700',
    channel: 'Task chips have 4 px corners; lane name',
    source: 'P: styles/tailwind.css:7 (syntax keyword hue). S: §2.1',
  },
  removed: {
    meaning: 'Removed, unmounted, lost, a wrong answer',
    dark: 'rose.400',
    light: 'rose.700',
    channel: 'A × glyph, a dashed stroke, and the reason in text',
    source: 'S: §2.1 (rose, distinct from the red-400 form errors, drift C07)',
  },
  done: {
    meaning: 'Visited, finished, settled',
    dark: 'zinc.400',
    light: 'zinc.600',
    channel: '✓ and the word `done`',
    source: 'S: §2.1',
  },
}

/**
 * Surfaces, described as layers (bottom first). The test composites them with
 * real alpha blending, so the contrast numbers match what the browser paints.
 */
export type Layer = { color: PaletteRef | 'white'; alpha?: number }
export type SurfaceName =
  | 'page'
  | 'frame'
  | 'panel'
  | 'glyph'
  | 'code'
  | 'chipQueued'
  | 'chipMicro'
  | 'nowGlyph'
  | 'nowGlyphFrame'
  | 'nowPanel'
  | 'accent'
  | 'accentHover'
  | 'secondary'
  | 'secondaryHover'
  | 'segmentSelected'
  | 'segmentHover'
  | 'choice'
  | 'choiceHover'
  | 'choiceSelected'
  | 'keyCap'
  | 'tag'
  | 'chipState'
  | 'doneFill'

const PAGE: Layer = { color: 'zinc.900' }
const FRAME: Layer[] = [PAGE, { color: 'zinc.800', alpha: 0.4 }]
const PANEL: Layer[] = [...FRAME, { color: 'zinc.900', alpha: 0.6 }]

export const surfaces: Record<SurfaceName, { dark: Layer[]; light: Layer[] }> = {
  /** P: app/layout.tsx:108 (`dark:bg-zinc-900`). */
  page: { dark: [PAGE], light: [{ color: 'white' }] },
  /** P: Button.tsx:22 (`dark:bg-zinc-800/40`, the raised surface). */
  frame: { dark: FRAME, light: [{ color: 'zinc.50' }] },
  /** Region panels inside the stage (lanes, console). S: §2.1. */
  panel: { dark: PANEL, light: [{ color: 'white' }] },
  /** Glyph fill (chips, cards, records): zinc-800 everywhere (drift C10). */
  glyph: { dark: [...PANEL, { color: 'zinc.800' }], light: [{ color: 'white' }] },
  /** P: Code.tsx:297 (code block surface). */
  code: { dark: [{ color: 'zinc.900' }], light: [{ color: 'zinc.900' }] },
  chipQueued: {
    dark: [...PANEL, { color: 'sky.400', alpha: 0.1 }],
    light: [{ color: 'white' }, { color: 'sky.700', alpha: 0.08 }],
  },
  chipMicro: {
    dark: [...PANEL, { color: 'violet.400', alpha: 0.1 }],
    light: [{ color: 'white' }, { color: 'violet.600', alpha: 0.08 }],
  },
  /** `now` inside a glyph: the lime-400/10 tint replaces the glyph fill (D5), on a panel. */
  nowGlyph: {
    dark: [...PANEL, { color: 'lime.400', alpha: 0.1 }],
    light: [{ color: 'white' }, { color: 'lime.700', alpha: 0.08 }],
  },
  /** The same, for a glyph that sits directly on the frame (list-keys cards). */
  nowGlyphFrame: {
    dark: [...FRAME, { color: 'lime.400', alpha: 0.1 }],
    light: [{ color: 'zinc.50' }, { color: 'lime.700', alpha: 0.08 }],
  },
  /** `now` on a whole region panel: lime-400/5 (D5). */
  nowPanel: {
    dark: [...PANEL, { color: 'lime.400', alpha: 0.05 }],
    light: [{ color: 'white' }, { color: 'lime.700', alpha: 0.05 }],
  },
  /** P: Button.tsx:24 (filled). */
  accent: { dark: [{ color: 'lime.500' }], light: [{ color: 'lime.700' }] },
  accentHover: { dark: [{ color: 'lime.600' }], light: [{ color: 'lime.800' }] },
  /**
   * The secondary role inside the frame is the platform `outline` variant
   * (P: Button.tsx:26; WS1 ruling 1): no fill, a white/10 inset ring, hover
   * white/5 with white text.
   */
  secondary: { dark: FRAME, light: [{ color: 'zinc.50' }] },
  secondaryHover: { dark: [...FRAME, { color: 'white', alpha: 0.05 }], light: [{ color: 'zinc.100' }] },
  /** P: LessonStatus.tsx:30 (selected neutral zinc-600), :40 (hover zinc-700). */
  segmentSelected: { dark: [...FRAME, { color: 'zinc.600' }], light: [{ color: 'zinc.200' }] },
  segmentHover: { dark: [...FRAME, { color: 'zinc.700' }], light: [{ color: 'zinc.100' }] },
  /** P: designTokens.ts:347-349 (self-assessment choice: zinc-700, hover zinc-600). */
  choice: { dark: [...FRAME, { color: 'zinc.700' }], light: [{ color: 'zinc.100' }] },
  choiceHover: { dark: [...FRAME, { color: 'zinc.600' }], light: [{ color: 'zinc.200' }] },
  /** A picked choice after the reveal: the selected neutral (LessonStatus.tsx:30). */
  choiceSelected: { dark: [...FRAME, { color: 'zinc.600' }], light: [{ color: 'zinc.200' }] },
  /** Number key cap on a choice row: zinc-800 on the zinc-700 row. */
  keyCap: { dark: [...FRAME, { color: 'zinc.700' }, { color: 'zinc.800' }], light: [{ color: 'zinc.50' }] },
  /** Tag fill: zinc-800 on the glyph or frame (P: styles/tailwind.css:261 badge family). */
  tag: { dark: [...FRAME, { color: 'zinc.800' }], light: [{ color: 'zinc.100' }] },
  /** The state chip that rides a match line: an inverted (zinc-100) glyph. */
  chipState: { dark: [{ color: 'zinc.100' }], light: [{ color: 'zinc.900' }] },
  /** Solid `done` fill. S: §2.1. */
  doneFill: { dark: [{ color: 'zinc.400' }], light: [{ color: 'zinc.600' }] },
}

/**
 * Every foreground/background pairing the system paints. `text` needs 4.5:1,
 * `graphic` (outlines, markers, focus rings) 3:1. Add a row whenever a
 * component draws a role on a new surface.
 */
export type ContrastPair = {
  use: string
  kind: 'text' | 'graphic'
  fg: { dark: PaletteRef | 'white'; light: PaletteRef | 'white' }
  bg: SurfaceName
}

const r = (name: RoleName) => ({ dark: roles[name].dark, light: roles[name].light })

export const contrastPairs: ContrastPair[] = [
  // Frame text
  { use: 'title, prompt, values on frame', kind: 'text', fg: r('ink'), bg: 'frame' },
  { use: 'text-alternative headings on frame', kind: 'text', fg: r('inkStrong'), bg: 'frame' },
  { use: 'caption, step bar, status on frame', kind: 'text', fg: r('inkSecondary'), bg: 'frame' },
  { use: 'provenance, disclosure, idle segment on frame', kind: 'text', fg: r('inkMuted'), bg: 'frame' },
  // Panels and glyphs
  { use: 'values on panels', kind: 'text', fg: r('ink'), bg: 'panel' },
  { use: 'region labels on panels', kind: 'text', fg: r('inkSecondary'), bg: 'panel' },
  { use: 'empty markers, indices on panels', kind: 'text', fg: r('inkMuted'), bg: 'panel' },
  { use: 'glyph text', kind: 'text', fg: r('ink'), bg: 'glyph' },
  { use: 'glyph header text', kind: 'text', fg: r('inkSecondary'), bg: 'glyph' },
  { use: 'glyph secondary text (key=, markers)', kind: 'text', fg: r('inkMuted'), bg: 'glyph' },
  { use: 'chip text on queued chip', kind: 'text', fg: r('ink'), bg: 'chipQueued' },
  { use: 'chip text on microtask chip', kind: 'text', fg: r('ink'), bg: 'chipMicro' },
  { use: 'glyph text on a now glyph', kind: 'text', fg: r('ink'), bg: 'nowGlyph' },
  { use: 'muted text on a now glyph', kind: 'text', fg: r('inkMuted'), bg: 'nowGlyph' },
  { use: 'glyph text on a now card (on the frame)', kind: 'text', fg: r('ink'), bg: 'nowGlyphFrame' },
  { use: 'muted text on a now card (on the frame)', kind: 'text', fg: r('inkMuted'), bg: 'nowGlyphFrame' },
  { use: 'now: border of a card on the frame', kind: 'graphic', fg: r('now'), bg: 'nowGlyphFrame' },
  { use: 'now tag text on a now glyph', kind: 'text', fg: r('now'), bg: 'nowGlyph' },
  { use: 'values on a now panel', kind: 'text', fg: r('ink'), bg: 'nowPanel' },
  { use: 'output on a now panel', kind: 'text', fg: r('result'), bg: 'nowPanel' },
  { use: 'region label on a now panel', kind: 'text', fg: r('inkSecondary'), bg: 'nowPanel' },
  // Outlines and emphasis
  { use: 'glyph outlines on frame (scrubber track, ticks)', kind: 'graphic', fg: r('line'), bg: 'frame' },
  { use: 'glyph outlines on panels', kind: 'graphic', fg: r('line'), bg: 'panel' },
  { use: 'hatch stroke on a glyph', kind: 'graphic', fg: r('hatch'), bg: 'glyph' },
  { use: 'now: border inside a glyph', kind: 'graphic', fg: r('now'), bg: 'nowGlyph' },
  { use: 'now: border of a panel', kind: 'graphic', fg: r('now'), bg: 'nowPanel' },
  { use: 'now: connectors on panels', kind: 'graphic', fg: r('now'), bg: 'panel' },
  { use: 'now: connectors and scrubber on frame', kind: 'graphic', fg: r('now'), bg: 'frame' },
  {
    use: 'now: current-line bar and ▸ in the code pane',
    kind: 'graphic',
    fg: { dark: 'lime.400', light: 'lime.400' },
    bg: 'code',
  },
  { use: 'focus ring on frame', kind: 'graphic', fg: r('focus'), bg: 'frame' },
  { use: 'focus ring on page', kind: 'graphic', fg: r('focus'), bg: 'page' },
  { use: 'focus ring on panels', kind: 'graphic', fg: r('focus'), bg: 'panel' },
  { use: 'scrubber progress (accent) on frame', kind: 'graphic', fg: r('accent'), bg: 'frame' },
  // Roles
  { use: 'result: console lines on panels', kind: 'text', fg: r('result'), bg: 'panel' },
  { use: 'micro: chip outline', kind: 'graphic', fg: r('micro'), bg: 'panel' },
  { use: 'queued: chip outline', kind: 'graphic', fg: r('queued'), bg: 'panel' },
  { use: 'removed: struck outline on panels', kind: 'graphic', fg: r('removed'), bg: 'panel' },
  { use: 'removed: tag text', kind: 'text', fg: r('removed'), bg: 'tag' },
  { use: 'now: tag text', kind: 'text', fg: r('now'), bg: 'tag' },
  { use: 'neutral tag text', kind: 'text', fg: r('inkSecondary'), bg: 'tag' },
  { use: 'muted tag text', kind: 'text', fg: r('inkMuted'), bg: 'tag' },
  { use: 'code-pane gutter and host note', kind: 'text', fg: { dark: 'zinc.400', light: 'zinc.400' }, bg: 'code' },
  { use: 'code-pane text', kind: 'text', fg: { dark: 'zinc.100', light: 'zinc.100' }, bg: 'code' },
  // Controls
  { use: 'primary button label', kind: 'text', fg: r('onAccent'), bg: 'accent' },
  { use: 'primary button label, hover and press', kind: 'text', fg: r('onAccent'), bg: 'accentHover' },
  { use: 'secondary button label', kind: 'text', fg: r('inkMuted'), bg: 'secondary' },
  { use: 'secondary button label, hover and press', kind: 'text', fg: { dark: 'white', light: 'zinc.900' }, bg: 'secondaryHover' },
  { use: 'text button label', kind: 'text', fg: r('now'), bg: 'frame' },
  { use: 'selected segment label', kind: 'text', fg: { dark: 'zinc.200', light: 'zinc.700' }, bg: 'segmentSelected' },
  { use: 'hovered segment label', kind: 'text', fg: { dark: 'zinc.200', light: 'zinc.700' }, bg: 'segmentHover' },
  { use: 'choice label', kind: 'text', fg: r('inkSecondary'), bg: 'choice' },
  { use: 'choice label, hover', kind: 'text', fg: { dark: 'zinc.200', light: 'zinc.700' }, bg: 'choiceHover' },
  { use: 'picked choice label', kind: 'text', fg: r('ink'), bg: 'choiceSelected' },
  // The ✓ and × marks take the number's slot, so they sit on the key cap (D9).
  // Both are ink (WS1 ruling 3): the glyph shape and the "Right." / "Not
  // quite." text carry the meaning; lime stays reserved for `now`.
  { use: 'choice ✓ and × marks in the key slot', kind: 'text', fg: r('ink'), bg: 'keyCap' },
  { use: 'choice key number', kind: 'text', fg: r('inkSecondary'), bg: 'keyCap' },
  { use: 'state chip text', kind: 'text', fg: { dark: 'zinc.900', light: 'white' }, bg: 'chipState' },
  { use: 'done fill text', kind: 'text', fg: { dark: 'zinc.950', light: 'white' }, bg: 'doneFill' },
]

// ---------------------------------------------------------------------------
// Color classes. Dark first; `print:` twins carry the light roles.
// ---------------------------------------------------------------------------

export const ink = {
  strong: 'text-white print:text-zinc-900',
  base: 'text-zinc-100 print:text-zinc-900',
  secondary: 'text-zinc-300 print:text-zinc-700',
  muted: 'text-zinc-400 print:text-zinc-600',
  now: 'text-lime-400 print:text-lime-700',
  result: 'text-amber-400 print:text-amber-700',
  removed: 'text-rose-400 print:text-rose-700',
} as const

export const stroke = {
  line: 'border-zinc-500 print:border-zinc-500',
  hairline: 'border-zinc-700 print:border-zinc-200',
  now: 'border-lime-400 print:border-lime-700',
  micro: 'border-violet-400 print:border-violet-600',
  queued: 'border-sky-400 print:border-sky-700',
  removed: 'border-rose-400 print:border-rose-700',
} as const

/** SVG twins (`text-*` sets `currentColor` for strokes and fills). */
export const svgInk = {
  line: 'text-zinc-500',
  muted: 'text-zinc-400',
  now: 'text-lime-400 print:text-lime-700',
  removed: 'text-rose-400 print:text-rose-700',
} as const

export const surface = {
  /** P: Button.tsx:22. Never a hex (D4): the frame is a translucent layer. */
  frame: 'bg-zinc-800/40 print:bg-zinc-50',
  /**
   * The same color, opaque, for fills that must mask what is under them
   * (the sticky bar, a hollow scrubber diamond). `vz-frame` is defined in
   * `tailwind.config.ts` as a color-mix of zinc-800 at 40 % over zinc-900.
   */
  frameOpaque: 'bg-vz-frame print:bg-zinc-50',
  panel: 'bg-zinc-900/60 print:bg-white',
  glyph: 'bg-zinc-800 print:bg-white',
  code: 'bg-zinc-900',
  chipQueued: 'bg-sky-400/10 print:bg-sky-700/10',
  chipMicro: 'bg-violet-400/10 print:bg-violet-600/10',
  tag: 'bg-zinc-800 print:bg-zinc-100',
} as const

/**
 * The two emphases (D5), which can never be confused:
 * - `focus`: keyboard focus, a 2 px lime-500 ring at offset 2, on the visible
 *   shape. The only offset ring in the system.
 * - `now`: "changed this step", drawn inside the glyph: a lime-400 border
 *   doubled by an inset ring (2 px total, no layout shift) plus a tinted fill.
 *   Never an outline.
 */
export const focusRing =
  'outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-500'
/** The ring drawn on an inner shape while its `group` parent has focus (segments, scrubber thumb). */
export const focusRingGroup =
  'group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-lime-500'
/** The ring drawn on a label whose input has focus (list-keys checkboxes). */
export const focusRingHas =
  'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-lime-500'

export const now = {
  /** A glyph (chip, card, record) that changed this step. */
  glyph:
    'border-lime-400 bg-lime-400/10 ring-1 ring-inset ring-lime-400 print:border-lime-700 print:ring-lime-700',
  /** A whole region (lane, console) that changed this step. */
  panel: 'border-lime-400 bg-lime-400/5 ring-1 ring-inset ring-lime-400 print:border-lime-700 print:ring-lime-700',
  /** An inverted chip (zinc-100 fill) riding a now connector: a flush 2 px ring, no offset. */
  chip: 'ring-2 ring-lime-400 print:ring-lime-700',
} as const

// ---------------------------------------------------------------------------
// Type (D3). Only the platform scale (P: tailwind.config.ts:19-22):
// 2xs 12/20, xs 13/24, sm 14/24, base 16/28. Sans for UI wording, mono only
// for code, values and identifiers. A compact leading (named class) is allowed
// inside glyphs and panels, where rows have fixed heights.
// ---------------------------------------------------------------------------

export const TEXT_FLOOR_PX = 12

export type TypeToken = { cls: string; size: number; line: number; source: string }

export const type = {
  /** D3: frame title 16/600. P: typography.ts:191-198 (h3 16/28 600). */
  title: { cls: 'font-sans text-base font-semibold', size: 16, line: 28, source: 'D3; P: typography.ts:191' },
  /** D3: the checkpoint prompt. P: text-base. */
  prompt: { cls: 'font-sans text-base font-semibold text-pretty', size: 16, line: 28, source: 'D3; P: tailwind.config.ts:22' },
  /** D3: captions 14/28 zinc-300, pretty wrapping. P: typography.ts:45 (prose body 14/28). */
  caption: { cls: 'font-sans text-sm leading-7 text-pretty', size: 14, line: 28, source: 'D3; P: typography.ts:45' },
  /** Text-alternative body. P: ProblemCard/index.tsx:224 (`text-sm leading-6`). */
  body: { cls: 'font-sans text-sm leading-6', size: 14, line: 24, source: 'P: ProblemCard/index.tsx:224' },
  /** Buttons and segments. P: Button.tsx:48 (`text-sm font-medium`). */
  control: { cls: 'font-sans text-sm font-medium', size: 14, line: 24, source: 'P: Button.tsx:48' },
  /** Disclosure summary. P: ProblemCard/index.tsx:207 (Expand: `text-xs font-medium`). */
  disclosure: { cls: 'font-sans text-xs font-medium', size: 13, line: 24, source: 'P: ProblemCard/index.tsx:207' },
  /** Step bar and status line: sans UI wording (D3), tabular numbers. P: text-2xs. */
  status: {
    cls: 'font-sans text-2xs font-medium tabular-nums',
    size: 12,
    line: 20,
    source: 'D3; P: tailwind.config.ts:19',
  },
  /** Region, column and section labels: sans 12/600, compact. P: designTokens.ts:306. */
  label: { cls: 'font-sans text-2xs leading-4 font-semibold', size: 12, line: 16, source: 'P: designTokens.ts:306' },
  /** In-flow tags and badges: sans 12/500, compact (D3, D17). */
  tag: { cls: 'font-sans text-2xs leading-4 font-medium', size: 12, line: 16, source: 'D3; P: styles/tailwind.css:252' },
  /** Provenance line. P: typography.ts:209-214 (figcaption), text-2xs. */
  provenance: { cls: 'font-sans text-2xs', size: 12, line: 20, source: 'P: typography.ts:209' },
  /** Values and identifiers inside glyphs: mono 13, compact 20. */
  value: { cls: 'font-mono text-xs leading-5', size: 13, line: 20, source: 'P: tailwind.config.ts:20' },
  /** Item labels inside glyphs (data, not code): sans 13, compact 20 (drift T13). */
  item: { cls: 'font-sans text-xs leading-5', size: 13, line: 20, source: 'P: tailwind.config.ts:20' },
  /** Secondary values and glyph headers: mono 12/500, compact 16. */
  glyphHeader: {
    cls: 'font-mono text-2xs leading-4 font-medium',
    size: 12,
    line: 16,
    source: 'P: tailwind.config.ts:19',
  },
  /** Small identifiers inside glyphs (`key=0`, line numbers): mono 12, compact 16. */
  meta: { cls: 'font-mono text-2xs leading-4', size: 12, line: 16, source: 'P: tailwind.config.ts:19' },
  /** Code pane. P: Code.tsx:137 (mono 13/24); 12 below 375 so 40 columns fit (drift T09). */
  code: { cls: 'font-mono text-2xs leading-6 xs:text-xs', size: 12, line: 24, source: 'P: Code.tsx:137' },
} as const satisfies Record<string, TypeToken>

// ---------------------------------------------------------------------------
// Space and shape (D1). 8 pt rhythm plus 4 and 12 (drift S01, S02); keys are
// the Tailwind spacing step (`gap-2` = 8).
// ---------------------------------------------------------------------------

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 6: 24, 8: 32, 12: 48 } as const

/** D1. Px values for geometry, class names for markup. */
export const radius = {
  /** P: Code.tsx:297; mdx.tsx:154 (rounded-2xl). 0 when the frame bleeds below 640. */
  frame: { px: 16, cls: 'rounded-2xl' },
  /** P: Button.tsx:20-26; LessonStatus.tsx:93. */
  control: { px: 9999, cls: 'rounded-full' },
  /** P: designTokens.ts:347 (self-assessment rows). Choice rows, panels, disclosure focus. */
  row: { px: 8, cls: 'rounded-lg' },
  /** S: §3.2. Glyphs: cards, records, function boxes. */
  glyph: { px: 8, cls: 'rounded-lg' },
  /** S: §2.2. Task chips, key caps, tags, checkboxes. */
  chip: { px: 4, cls: 'rounded' },
} as const

/** D1: outlines 1 px; connectors 1.5 px; a `now` connector 2.5 px. */
export const strokeWidth = { outline: 1, connector: 1.5, nowConnector: 2.5 } as const
/** S: §2.2. The one dash pattern. */
export const DASH = '4 4'

/** Minimum touch target (S: A5) and the gap between adjacent targets. */
export const TARGET_PX = 44
export const TARGET_GAP_PX = 8

// ---------------------------------------------------------------------------
// The frame (D1, D4). One class string for every visual.
// ---------------------------------------------------------------------------

export { frameCls } from './frame-cls'

// ---------------------------------------------------------------------------
// Motion. Stage values are the spec's (S: §4); feedback is the platform's
// 150 ms (D11, drift D06). Seconds, as framer-motion expects.
// ---------------------------------------------------------------------------

export const EASE = [0.2, 0, 0, 1] as const
export const EASE_CSS = 'cubic-bezier(0.2, 0, 0, 1)'

export type MotionTokenName = 'feedback' | 'highlight' | 'enter' | 'exit' | 'move' | 'path' | 'draw' | 'caption'

export type TweenToken = { type: 'tween'; duration: number; ease?: readonly number[]; distance?: number }
export type SpringToken = { type: 'spring'; stiffness: number; damping: number; mass: number; settleMs: number }

export const motion: Record<MotionTokenName, { full: TweenToken | SpringToken; reduced: TweenToken }> = {
  /** D11; P: Button.tsx:48 (`transition`, 150 ms). */
  feedback: { full: { type: 'tween', duration: 0.15 }, reduced: { type: 'tween', duration: 0 } },
  highlight: { full: { type: 'tween', duration: 0.12, ease: EASE }, reduced: { type: 'tween', duration: 0 } },
  enter: {
    full: { type: 'tween', duration: 0.2, ease: EASE, distance: 8 },
    reduced: { type: 'tween', duration: 0.12, distance: 0 },
  },
  exit: {
    full: { type: 'tween', duration: 0.16, ease: EASE, distance: 8 },
    reduced: { type: 'tween', duration: 0.12, distance: 0 },
  },
  /**
   * Critically damped (ratio 1.0) and tuned by its settle time: within 0.4 %
   * of the target at 280 ms, so the sampled curve (`shell/flip.ts`) ends
   * inside the 300 ms cap without a visible end snap (M08). omega = 27.6.
   */
  move: {
    full: { type: 'spring', stiffness: 760, damping: 55.2, mass: 1, settleMs: 280 },
    reduced: { type: 'tween', duration: 0 },
  },
  path: { full: { type: 'tween', duration: 0.22, ease: EASE }, reduced: { type: 'tween', duration: 0 } },
  draw: { full: { type: 'tween', duration: 0.22, ease: EASE }, reduced: { type: 'tween', duration: 0 } },
  /**
   * The caption never crossfades (M15, S-4): the old sentence goes at once and
   * the new one fades in over 120 ms on the shared curve, so two sentences
   * never share the cell and the change is still visible.
   */
  caption: { full: { type: 'tween', duration: 0.12, ease: EASE }, reduced: { type: 'tween', duration: 0 } },
}

export const motionRules = {
  /** Per transition; never above `hardMaxMs` (S: A2). */
  maxTransitionMs: 300,
  hardMaxMs: 400,
  maxAnimatedPerStep: 2,
  maxStaggerMs: 40,
  /** D13: two or more commands inside this window render instantly. */
  burstWindowMs: 250,
  /** D10: one cadence (the speed toggle is gone). S: §4 rule 5 (1x). */
  playIntervalMs: 1600,
  maxTransitionShareOfInterval: 0.4,
  /** P: ProblemCard/index.tsx:210 (chevron, 200 ms). */
  disclosureMs: 200,
  /** D12: the scrubber's step tooltip stays this long after the last key press. */
  tooltipLingerMs: 1000,
} as const

/**
 * D21: the one designed reveal per visual. It is the single explicit
 * exception to the per-step budget (`maxAnimatedPerStep`) and to the 300 ms
 * cap: a sequenced moment that runs only on the step that pays off the
 * visual (the event loop's last step, the list-keys reveal), never on load,
 * and lands at once on any instant command (D7) or on Back. Under reduced
 * motion it is a crossfade of at most the reduced `enter` (120 ms) or
 * instant. Each beat inside it still uses a stage token (`enter`, `draw`,
 * `highlight`, `caption`); only these values are new.
 */
export const reveal = {
  /** The whole sequence, first beat to last frame (D21). */
  maxMs: 800,
  /**
   * Between items the reveal plays in order (the console outputs, left to
   * right). `maxStaggerMs` (40) is for chips that enter together; at 40 ms
   * four outputs resolve in 120 ms, faster than the eye reads them as an
   * order. 80 ms reads as playback and keeps four outputs inside 500 ms.
   * The shell shortens it so a long console still ends inside `maxMs`.
   */
  staggerMs: 80,
  /**
   * The carried glyph's ride along its match line (list keys). It crosses
   * the whole stage (about 400 px at 1280), so the 280 ms `move` spring
   * would cover it at 1.4 px/ms, too fast to follow with the eye. It starts
   * from rest after the lift, so it eases in and out on the platform's own
   * curve (Tailwind `transition`, P: Button.tsx:48).
   */
  ride: { duration: 0.42, ease: [0.4, 0, 0.2, 1] as const },
  /** A second carried glyph leaves this much later, so two riders on crossing lines never meet. */
  riderGapMs: 120,
} as const

/**
 * D6: the one functional shadow. Only a glyph moving between regions carries
 * it, ramped in and out with the move (`k` 0 to 1), and the moving glyph gets
 * an opaque raised backing (`vz-frame`, the lighter elevated surface) so
 * nothing it passes over shows through it.
 */
export const LIFT = { y: 6, blur: 16, alpha: 0.45, backingCls: 'bg-vz-frame' } as const
export function liftShadow(k: number): string {
  if (k <= 0) return 'none'
  const f = (n: number) => Math.round(n * k * 100) / 100
  return `0 ${f(LIFT.y)}px ${f(LIFT.blur)}px rgb(0 0 0 / ${f(LIFT.alpha)})`
}

/** CSS twins for class-driven transitions. */
export const transitionCls = {
  /** D11: platform `transition` (150 ms, default curve), plus the press step. */
  // Colors and the press filter only: availability (opacity) snaps, so an
  // instant render never fades a control in or out (D7).
  feedback:
    'transition-[color,background-color,border-color,text-decoration-color,fill,stroke,box-shadow,filter] motion-reduce:transition-none',
  press: 'active:brightness-98',
  highlight:
    'transition-[background-color,opacity,transform,clip-path] duration-[120ms] ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none',
  /** P: ProblemCard/index.tsx:210-211 (rotate 180 over 200 ms). */
  disclosure: 'transition-transform duration-200 motion-reduce:transition-none',
  /**
   * An instant render (D7). Dropping the transition class is not enough: the
   * default `transition-property: all` keeps a transition already running;
   * `none` cancels it, so the value lands in the same frame.
   */
  instant: 'transition-none',
} as const
