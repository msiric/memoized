/**
 * Shared visual tokens for the lesson visualization system.
 *
 * Semantic roles (frame, label, caption, window, cell states, pills, controls,
 * motion) mapped to the platform palette (lime primary, amber win-state, zinc
 * neutrals, rose for leaving) with dark-mode and reduced-motion in mind. This is
 * the ONLY source of color, spacing, and motion for visualizations. Components
 * compose these so they cannot drift apart.
 */

export const viz = {
  frame:
    'my-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700/60 dark:bg-zinc-800/40',
  label: 'mb-3 text-xs font-medium text-zinc-500 dark:text-zinc-400',
  caption:
    'rounded-lg border border-zinc-200 border-l-[3px] border-l-lime-500 bg-white p-2.5 text-xs text-zinc-700 dark:border-zinc-700 dark:border-l-lime-400 dark:bg-zinc-900 dark:text-zinc-200',

  /** A framed highlight overlay (e.g. the sliding window). */
  window: {
    base: 'rounded-lg border-2',
    default: 'border-lime-500 bg-lime-400/15 shadow-[0_0_16px_rgba(132,204,22,0.4)]',
    win: 'border-amber-400 bg-amber-400/15 shadow-[0_0_16px_rgba(251,191,36,0.35)]',
  },

  /** A value box (array cell, queue chip container). */
  cell: {
    base: 'flex items-center justify-center rounded-lg border-2 font-mono text-base font-semibold transition-colors',
    active: 'border-transparent bg-transparent text-zinc-900 dark:text-white',
    muted: 'border-zinc-200 bg-white text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-600',
    enteringText: 'text-lime-600 dark:text-lime-300',
    leavingText: 'text-rose-500 dark:text-rose-300',
  },

  /** A labelled chip in a lane (call stack frame, queued callback). */
  chip: {
    base: 'flex h-7 items-center rounded-md border px-2.5 font-mono text-xs',
    stack: 'border-lime-500/50 bg-lime-400/10 text-lime-800 dark:text-lime-200',
    micro: 'border-violet-500/50 bg-violet-400/10 text-violet-800 dark:text-violet-200',
    macro: 'border-amber-500/50 bg-amber-400/10 text-amber-800 dark:text-amber-200',
    webapi: 'border-zinc-400/50 bg-zinc-400/10 text-zinc-700 dark:text-zinc-300',
    console: 'border-emerald-500/50 bg-emerald-400/10 text-emerald-800 dark:text-emerald-200',
  },

  /** A status pill (window sum, max so far). */
  pill: {
    base: 'rounded-md border px-2.5 py-1.5 font-mono text-xs',
    primary: 'border-lime-500/40 bg-lime-50 text-lime-800 dark:bg-lime-400/10 dark:text-lime-200',
    win: 'border-amber-400/50 bg-amber-50 text-amber-800 dark:bg-amber-400/10 dark:text-amber-200',
  },

  laneLabel: 'mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400',

  button: {
    base: 'rounded-md border border-zinc-300 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-700/50',
    primary:
      'rounded-md bg-lime-500 px-2.5 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-lime-400 disabled:opacity-40',
  },
  counter: 'ml-auto font-mono text-[10px] text-zinc-400',

  /** Motion presets. Renderers gate these on prefers-reduced-motion. */
  motion: {
    slide: { type: 'spring', stiffness: 380, damping: 32 } as const,
    pulseEnter: { scale: [0.75, 1.08, 1] },
    pulseLeave: { y: [0, 5, 0], opacity: [1, 0.6, 1] },
    pulseDuration: 0.3,
  },
}
