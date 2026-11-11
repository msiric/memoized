/**
 * Visual tokens v2 for lesson visualizations (VIZ-01 design spec §2 to §4).
 *
 * This is the only vocabulary the v2 system (`StepThrough`, engines) may use:
 * one meaning per hue, a non-color channel for every role, an 8 pt rhythm, a
 * 12 px text floor and the exact motion values from §4. Every text and graphic
 * pairing below is contrast-checked in `tokens-v2.test.ts` (4.5:1 for text,
 * 3:1 for graphics) against the surface it is actually drawn on.
 *
 * The legacy `tokens.ts` stays untouched so the v1 components keep working
 * until they are ported (ArrayVisualizer, SequenceStepper, StructureVisualizer).
 *
 * Class strings are written out in full on purpose: Tailwind's JIT only emits
 * classes it can find literally in the source.
 */

// ---------------------------------------------------------------------------
// Color: Tailwind v3 palette references. `dark` is the product (forced dark
// theme). `light` applies to print only (owner decision 1).
// ---------------------------------------------------------------------------

/** A Tailwind palette reference such as `zinc.400`. */
export type PaletteRef = `${string}.${number}`

export type RoleName =
  | 'ink'
  | 'inkSecondary'
  | 'inkMuted'
  | 'line'
  | 'hairline'
  | 'now'
  | 'result'
  | 'micro'
  | 'queued'
  | 'removed'
  | 'done'

export type Role = {
  meaning: string
  dark: PaletteRef
  light: PaletteRef
  /** How the role is told apart without color (WCAG 1.4.1, spec A7). */
  channel: string
}

export const roles: Record<RoleName, Role> = {
  ink: { meaning: 'Text, values', dark: 'zinc.100', light: 'zinc.900', channel: 'n/a' },
  inkSecondary: {
    meaning: 'Secondary text: region labels, step event and counter, controls',
    dark: 'zinc.300',
    light: 'zinc.700',
    channel: 'n/a',
  },
  inkMuted: {
    meaning: 'Tertiary text: empty states, provenance, host note, line numbers',
    dark: 'zinc.400',
    light: 'zinc.600',
    channel: 'n/a',
  },
  line: { meaning: 'Glyph outlines, arrows, edges (1.5 px)', dark: 'zinc.500', light: 'zinc.500', channel: 'n/a' },
  hairline: {
    meaning: 'Frame and panel borders (decorative, exempt)',
    dark: 'zinc.700',
    light: 'zinc.200',
    channel: 'n/a',
  },
  now: {
    meaning: 'Changed this step: current code line, active element, primary control',
    dark: 'lime.400',
    light: 'lime.700',
    channel: 'Thicker stroke (2 px vs 1 px), a ▸ gutter mark on code lines, a `new` tag on elements created this step',
  },
  result: {
    meaning: 'Output and answers: console lines, final values',
    dark: 'amber.400',
    light: 'amber.700',
    channel: 'Output lines are numbered with a › prefix; tags `answer`',
  },
  micro: {
    meaning: 'Microtask (job) queue items',
    dark: 'violet.400',
    light: 'violet.600',
    channel: 'Pill shape and the lane name',
  },
  queued: {
    meaning: 'Waiting in a container: task queue, frontier, heap entries',
    dark: 'sky.400',
    light: 'sky.700',
    channel: 'Task chips have 4 px corners; lane name',
  },
  removed: {
    meaning: 'Removed, cut, pruned, stale, thrown, unmounted',
    dark: 'rose.400',
    light: 'rose.700',
    channel: 'Strikethrough or ×, a dashed stroke, and the reason in text',
  },
  done: {
    meaning: 'Visited, finished, settled',
    dark: 'zinc.400',
    light: 'zinc.600',
    channel: '✓ and the word `done`',
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
  | 'code'
  | 'chipQueued'
  | 'chipMicro'
  | 'chipHost'
  | 'nowFill'
  | 'doneFill'
  | 'segment'
  | 'keyCap'

export const surfaces: Record<SurfaceName, { dark: Layer[]; light: Layer[] }> = {
  /** The lesson page (`dark:bg-zinc-900`). */
  page: { dark: [{ color: 'zinc.900' }], light: [{ color: 'white' }] },
  /** Frame: zinc-800/40 over the page, #1e1e21 (spec §2.1). */
  frame: {
    dark: [{ color: 'zinc.900' }, { color: 'zinc.800', alpha: 0.4 }],
    light: [{ color: 'zinc.50' }],
  },
  /** Region panels inside the stage (lanes, console). */
  panel: {
    dark: [{ color: 'zinc.900' }, { color: 'zinc.800', alpha: 0.4 }, { color: 'zinc.900', alpha: 0.6 }],
    light: [{ color: 'white' }],
  },
  /** The code pane reuses the lesson code-block surface (`Code.tsx`). */
  code: { dark: [{ color: 'zinc.900' }], light: [{ color: 'zinc.900' }] },
  chipQueued: {
    dark: [
      { color: 'zinc.900' },
      { color: 'zinc.800', alpha: 0.4 },
      { color: 'zinc.900', alpha: 0.6 },
      { color: 'sky.400', alpha: 0.1 },
    ],
    light: [{ color: 'white' }, { color: 'sky.700', alpha: 0.08 }],
  },
  chipMicro: {
    dark: [
      { color: 'zinc.900' },
      { color: 'zinc.800', alpha: 0.4 },
      { color: 'zinc.900', alpha: 0.6 },
      { color: 'violet.400', alpha: 0.1 },
    ],
    light: [{ color: 'white' }, { color: 'violet.600', alpha: 0.08 }],
  },
  /** Neutral chips: stack frames (owner decision 2) and host slots. */
  chipHost: {
    dark: [
      { color: 'zinc.900' },
      { color: 'zinc.800', alpha: 0.4 },
      { color: 'zinc.900', alpha: 0.6 },
      { color: 'zinc.800' },
    ],
    light: [{ color: 'white' }, { color: 'zinc.100' }],
  },
  /** Solid `now` fill: the primary control. */
  nowFill: { dark: [{ color: 'lime.400' }], light: [{ color: 'lime.700' }] },
  /** Selected segment of the preset switcher. */
  segment: {
    dark: [{ color: 'zinc.900' }, { color: 'zinc.800', alpha: 0.4 }, { color: 'zinc.700' }],
    light: [{ color: 'zinc.200' }],
  },
  /** Key-number cap on checkpoint choices. */
  keyCap: {
    dark: [{ color: 'zinc.900' }, { color: 'zinc.800', alpha: 0.4 }, { color: 'zinc.800' }],
    light: [{ color: 'zinc.100' }],
  },
  /** Solid `done` fill. */
  doneFill: { dark: [{ color: 'zinc.400' }], light: [{ color: 'zinc.600' }] },
}

/**
 * Every foreground/background pairing the v2 system paints. `text` needs
 * 4.5:1, `graphic` (outlines, markers, focus rings, control boundaries) 3:1.
 * Add a row whenever a component draws a role on a new surface.
 */
export type ContrastPair = {
  use: string
  kind: 'text' | 'graphic'
  fg: { dark: PaletteRef | 'white'; light: PaletteRef | 'white' }
  bg: SurfaceName
}

const r = (name: RoleName) => ({ dark: roles[name].dark, light: roles[name].light })

export const contrastPairs: ContrastPair[] = [
  { use: 'title, caption, values on frame', kind: 'text', fg: r('ink'), bg: 'frame' },
  { use: 'values on panels', kind: 'text', fg: r('ink'), bg: 'panel' },
  { use: 'step event, counter, secondary controls on frame', kind: 'text', fg: r('inkSecondary'), bg: 'frame' },
  { use: 'region labels on panels', kind: 'text', fg: r('inkSecondary'), bg: 'panel' },
  { use: 'tertiary: provenance, hint on frame', kind: 'text', fg: r('inkMuted'), bg: 'frame' },
  { use: 'selected preset segment', kind: 'text', fg: { dark: 'zinc.50', light: 'zinc.900' }, bg: 'segment' },
  { use: 'choice key number', kind: 'text', fg: r('inkSecondary'), bg: 'keyCap' },
  { use: 'region labels, empty markers on panels', kind: 'text', fg: r('inkMuted'), bg: 'panel' },
  { use: 'code-pane gutter and host note', kind: 'text', fg: { dark: 'zinc.400', light: 'zinc.400' }, bg: 'code' },
  { use: 'code-pane text', kind: 'text', fg: { dark: 'zinc.100', light: 'zinc.100' }, bg: 'code' },
  { use: 'glyph outlines, scrubber track and ticks', kind: 'graphic', fg: r('line'), bg: 'frame' },
  { use: 'glyph outlines on panels', kind: 'graphic', fg: r('line'), bg: 'panel' },
  { use: 'secondary control boundary', kind: 'graphic', fg: r('line'), bg: 'frame' },
  { use: 'now: focus ring, scrubber thumb, changed outline', kind: 'graphic', fg: r('now'), bg: 'frame' },
  { use: 'now: changed outline on panels', kind: 'graphic', fg: r('now'), bg: 'panel' },
  { use: 'now: focus ring against the page', kind: 'graphic', fg: r('now'), bg: 'page' },
  {
    use: 'now: current-line bar and ▸ in the code pane',
    kind: 'graphic',
    fg: { dark: 'lime.400', light: 'lime.400' },
    bg: 'code',
  },
  { use: 'now: `new` tag text on panels', kind: 'text', fg: r('now'), bg: 'panel' },
  { use: 'result: console lines on panels', kind: 'text', fg: r('result'), bg: 'panel' },
  { use: 'result: answer tag on frame', kind: 'text', fg: r('result'), bg: 'frame' },
  { use: 'micro: chip outline', kind: 'graphic', fg: r('micro'), bg: 'panel' },
  { use: 'queued: chip outline', kind: 'graphic', fg: r('queued'), bg: 'panel' },
  { use: 'removed: wrong-answer mark on frame', kind: 'text', fg: r('removed'), bg: 'frame' },
  { use: 'removed: struck glyph outline on panels', kind: 'graphic', fg: r('removed'), bg: 'panel' },
  { use: 'chip text on queued chip', kind: 'text', fg: r('ink'), bg: 'chipQueued' },
  { use: 'chip text on microtask chip', kind: 'text', fg: r('ink'), bg: 'chipMicro' },
  { use: 'chip text on neutral chip (stack, host)', kind: 'text', fg: r('ink'), bg: 'chipHost' },
  { use: 'neutral chip outline', kind: 'graphic', fg: r('line'), bg: 'panel' },
  { use: 'primary control label on now fill', kind: 'text', fg: { dark: 'zinc.950', light: 'white' }, bg: 'nowFill' },
  { use: 'primary control boundary against the frame', kind: 'graphic', fg: r('now'), bg: 'frame' },
  { use: 'done fill text', kind: 'text', fg: { dark: 'zinc.950', light: 'white' }, bg: 'doneFill' },
]

// ---------------------------------------------------------------------------
// Class strings. Dark first; `print:` variants carry the light roles.
// ---------------------------------------------------------------------------

export const ink = {
  base: 'text-zinc-100 print:text-zinc-900',
  secondary: 'text-zinc-300 print:text-zinc-700',
  muted: 'text-zinc-400 print:text-zinc-600',
  now: 'text-lime-400 print:text-lime-700',
  result: 'text-amber-400 print:text-amber-700',
  removed: 'text-rose-400 print:text-rose-700',
} as const

export const stroke = {
  line: 'border-zinc-500 print:border-zinc-500',
  hairline: 'border-zinc-700/60 print:border-zinc-200',
  now: 'border-lime-400 print:border-lime-700',
  micro: 'border-violet-400 print:border-violet-600',
  queued: 'border-sky-400 print:border-sky-700',
  removed: 'border-rose-400 print:border-rose-700',
} as const

export const surface = {
  frame: 'bg-zinc-800/40 print:bg-zinc-50',
  /** Opaque twin of `frame`, for the sticky dock that covers scrolled content. */
  frameOpaque: 'bg-[#1e1e21] print:bg-zinc-50',
  panel: 'bg-zinc-900/60 print:bg-white',
  code: 'bg-zinc-900',
  chipQueued: 'bg-sky-400/10 print:bg-sky-700/10',
  chipMicro: 'bg-violet-400/10 print:bg-violet-600/10',
  chipHost: 'bg-zinc-800 print:bg-zinc-100',
  nowFill: 'bg-lime-400 text-zinc-950 print:bg-lime-700 print:text-white',
} as const

/** Focus ring (spec §5.2): 2 px `now`, 2 px offset, at least 3:1 on every surface. */
export const focusRing =
  'outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-400'

// ---------------------------------------------------------------------------
// Type (§3.1). The floor is 12 px at every width.
// ---------------------------------------------------------------------------

export const TEXT_FLOOR_PX = 12

export const type = {
  title: { cls: 'font-sans text-[14px] leading-5 font-semibold', size: 14, line: 20 },
  regionLabel: { cls: 'font-sans text-[12px] leading-4 font-semibold', size: 12, line: 16 },
  value: { cls: 'font-mono text-[13px] leading-5', size: 13, line: 20 },
  code: { cls: 'font-mono text-[13px] leading-6', size: 13, line: 24 },
  index: { cls: 'font-mono text-[12px] leading-4 font-medium tabular-nums', size: 12, line: 16 },
  caption: { cls: 'font-sans text-[14px] leading-6', size: 14, line: 24 },
  prompt: { cls: 'font-sans text-[16px] leading-6 font-semibold', size: 16, line: 24 },
} as const

// ---------------------------------------------------------------------------
// Space and shape (§3.2). 8 pt rhythm; 4 only inside glyphs.
// ---------------------------------------------------------------------------

export const space = { 1: 8, 2: 16, 3: 24, 4: 32, 6: 48 } as const
export const GLYPH_INSET = 4
export const radius = { frame: 12, panel: 8, glyph: 8, chip: 4, control: 10 } as const
/** Minimum touch target (A5) and the gap between adjacent targets. */
export const TARGET_PX = 44
export const TARGET_GAP_PX = 8

// ---------------------------------------------------------------------------
// Motion (§4). The only values allowed. Seconds, as framer-motion expects.
// ---------------------------------------------------------------------------

export const EASE = [0.2, 0, 0, 1] as const
export const EASE_CSS = 'cubic-bezier(0.2, 0, 0, 1)'

export type MotionTokenName = 'feedback' | 'highlight' | 'enter' | 'exit' | 'move' | 'path' | 'draw' | 'caption'

export type TweenToken = { type: 'tween'; duration: number; ease?: readonly number[]; distance?: number }
export type SpringToken = { type: 'spring'; stiffness: number; damping: number; mass: number; settleMs: number }

export const motion: Record<MotionTokenName, { full: TweenToken | SpringToken; reduced: TweenToken }> = {
  feedback: { full: { type: 'tween', duration: 0.1 }, reduced: { type: 'tween', duration: 0 } },
  highlight: { full: { type: 'tween', duration: 0.12, ease: EASE }, reduced: { type: 'tween', duration: 0 } },
  enter: {
    full: { type: 'tween', duration: 0.2, ease: EASE, distance: 8 },
    reduced: { type: 'tween', duration: 0.12, distance: 0 },
  },
  exit: {
    full: { type: 'tween', duration: 0.16, ease: EASE, distance: 8 },
    reduced: { type: 'tween', duration: 0.12, distance: 0 },
  },
  move: {
    full: { type: 'spring', stiffness: 520, damping: 46, mass: 1, settleMs: 250 },
    reduced: { type: 'tween', duration: 0 },
  },
  path: { full: { type: 'tween', duration: 0.22, ease: EASE }, reduced: { type: 'tween', duration: 0 } },
  draw: { full: { type: 'tween', duration: 0.22, ease: EASE }, reduced: { type: 'tween', duration: 0 } },
  caption: { full: { type: 'tween', duration: 0.12 }, reduced: { type: 'tween', duration: 0 } },
}

/** §4 rules. */
export const motionRules = {
  /** Per transition; never above `hardMaxMs` (A2). */
  maxTransitionMs: 300,
  hardMaxMs: 400,
  maxAnimatedPerStep: 2,
  maxStaggerMs: 40,
  /** Two or more commands inside this window render instantly. */
  burstWindowMs: 250,
  /** Play cadence per speed; a transition uses at most 40 % of it. */
  playIntervalMs: { 1: 1600, 2: 800 } as const,
  maxTransitionShareOfInterval: 0.4,
} as const

/** CSS twins for class-driven transitions (code line, scrubber, buttons). */
export const transitionCls = {
  feedback: 'transition-[color,background-color,border-color,opacity] duration-100 motion-reduce:transition-none',
  highlight:
    'transition-[background-color,opacity,transform] duration-[120ms] ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none',
} as const
