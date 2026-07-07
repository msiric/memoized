'use client'

import clsx from 'clsx'
import { motion, useReducedMotion } from 'framer-motion'
import { useMemo, useState } from 'react'

/**
 * A reusable, data-driven array visualizer for the interview-prep lessons.
 *
 * The author provides only DATA (an array + a window size). The component runs
 * the algorithm to build a step-log, then renders each frame. The window is a
 * single overlay sized EXACTLY to the active cells and sitting behind them
 * (the cells are transparent, so the overlay shows through as the highlight).
 * Its position and width are computed from the step, so it slides reliably and
 * there are no coordinates to hand-tune. The same component generalises to
 * two-pointer, binary search, and sorting by swapping the step-log generator.
 */

export type ArrayStep = {
  start: number
  end: number
  sum: number | null
  max: number
  removed?: number
  added?: number
  note: string
  win?: boolean
}

/** Fixed-size sliding window: emit one frame per window position. */
export const buildSlidingWindowSteps = (
  data: number[],
  k: number,
): ArrayStep[] => {
  if (k <= 0 || k > data.length) {
    return [
      { start: 0, end: -1, sum: null, max: 0, note: 'Window size must be between 1 and the array length.' },
    ]
  }
  const steps: ArrayStep[] = []
  let sum = 0
  for (let i = 0; i < k; i++) sum += data[i]
  let max = sum
  let maxStart = 0
  steps.push({ start: 0, end: k - 1, sum, max, note: `First window [0..${k - 1}] has sum ${sum}.` })
  for (let end = k; end < data.length; end++) {
    const removed = end - k
    const added = end
    sum = sum - data[removed] + data[added]
    const isNewMax = sum > max
    if (isNewMax) {
      max = sum
      maxStart = removed + 1
    }
    steps.push({
      start: removed + 1,
      end,
      sum,
      max,
      removed,
      added,
      note: `Slide: remove ${data[removed]} (i${removed}), add ${data[added]} (i${added}) \u2192 sum ${sum}.${isNewMax ? ' New max.' : ''}`,
    })
  }
  steps.push({
    start: maxStart,
    end: maxStart + k - 1,
    sum: max,
    max,
    win: true,
    note: `The largest sum of ${k} contiguous elements is ${max}.`,
  })
  return steps
}

export type ArrayVisualizerProps = {
  data: number[]
  windowSize: number
  label?: string
}

const CELL = 44 // px, compact for a lesson page
const GAP = 10 // px

export function ArrayVisualizer({ data, windowSize, label }: ArrayVisualizerProps) {
  const steps = useMemo(() => buildSlidingWindowSteps(data, windowSize), [data, windowSize])
  const [index, setIndex] = useState(0)
  const [pulse, setPulse] = useState<{ entering: number[]; leaving: number[] }>({ entering: [], leaving: [] })
  const reduce = useReducedMotion()
  const step = steps[index]

  const windowSet = (s: ArrayStep) => {
    const set = new Set<number>()
    if (s.start >= 0 && s.end >= s.start) for (let i = s.start; i <= s.end; i++) set.add(i)
    return set
  }
  // Direction-aware transition: compare the window we were showing to the one we
  // move to, so entering/leaving are correct whether stepping forward or back.
  const navigate = (target: number) => {
    const n = Math.max(0, Math.min(steps.length - 1, target))
    const from = windowSet(steps[index])
    const to = windowSet(steps[n])
    setPulse({
      entering: [...to].filter((i) => !from.has(i)),
      leaving: [...from].filter((i) => !to.has(i)),
    })
    setIndex(n)
  }

  const hasWindow = step.start >= 0 && step.end >= step.start
  const count = hasWindow ? step.end - step.start + 1 : 0
  const pitch = CELL + GAP
  const frameX = step.start * pitch
  const frameW = count > 0 ? count * CELL + (count - 1) * GAP : 0
  const rowW = data.length * CELL + (data.length - 1) * GAP

  const cellPulse = (i: number) => {
    if (reduce) return {}
    if (pulse.entering.includes(i)) return { scale: [0.75, 1.08, 1] }
    if (pulse.leaving.includes(i)) return { y: [0, 5, 0], opacity: [1, 0.6, 1] }
    return { scale: 1 }
  }

  return (
    <div className="my-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700/60 dark:bg-zinc-800/40">
      {label ? (
        <p className="mb-3 text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
      ) : null}

      <div className="overflow-x-auto py-1">
        {/* the window overlay is sized exactly to the active cells and sits behind them */}
        <div className="relative mx-auto" style={{ width: rowW, height: CELL }}>
          {hasWindow ? (
            <motion.div
              aria-hidden
              initial={false}
              animate={{ x: frameX, width: frameW }}
              transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 32 }}
              className={clsx(
                'pointer-events-none absolute left-0 top-0 z-0 rounded-lg border-2',
                step.win
                  ? 'border-amber-400 bg-amber-400/15 shadow-[0_0_16px_rgba(251,191,36,0.35)]'
                  : 'border-lime-500 bg-lime-400/15 shadow-[0_0_16px_rgba(132,204,22,0.4)]',
              )}
              style={{ height: CELL }}
            />
          ) : null}

          <div className="absolute inset-0 z-10 flex" style={{ gap: GAP }} data-testid="array-cells">
            {data.map((value, i) => {
              const active = i >= step.start && i <= step.end
              return (
                <motion.div
                  key={i}
                  data-testid="cell"
                  animate={cellPulse(i)}
                  transition={{ duration: reduce ? 0 : 0.3 }}
                  className={clsx(
                    'flex items-center justify-center rounded-lg border-2 font-mono text-base font-semibold transition-colors',
                    active
                      ? 'border-transparent bg-transparent text-zinc-900 dark:text-white'
                      : 'border-zinc-200 bg-white text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-600',
                    pulse.leaving.includes(i) && 'text-rose-500 dark:text-rose-300',
                    pulse.entering.includes(i) && 'text-lime-600 dark:text-lime-300',
                  )}
                  style={{ width: CELL, height: CELL }}
                >
                  {value}
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* index row */}
        <div className="mx-auto mt-1 flex" style={{ width: rowW, gap: GAP }}>
          {data.map((_, i) => (
            <span
              key={i}
              className="text-center font-mono text-[10px] text-zinc-400"
              style={{ width: CELL }}
            >
              i{i}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <span className="rounded-md border border-lime-500/40 bg-lime-50 px-2.5 py-1.5 font-mono text-xs text-lime-800 dark:bg-lime-400/10 dark:text-lime-200" data-testid="sum">
          window sum = <strong>{step.sum ?? '\u2013'}</strong>
        </span>
        <span className="rounded-md border border-amber-400/50 bg-amber-50 px-2.5 py-1.5 font-mono text-xs text-amber-800 dark:bg-amber-400/10 dark:text-amber-200" data-testid="max">
          max so far = <strong>{step.max}</strong>
        </span>
      </div>

      <p
        className="mt-3 rounded-lg border border-zinc-200 border-l-[3px] border-l-lime-500 bg-white p-2.5 text-xs text-zinc-700 dark:border-zinc-700 dark:border-l-lime-400 dark:bg-zinc-900 dark:text-zinc-200"
        data-testid="narration"
      >
        {step.note}
      </p>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate(0)}
          className="rounded-md border border-zinc-300 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-700/50"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={() => navigate(index - 1)}
          disabled={index === 0}
          aria-label="Previous step"
          className="rounded-md border border-zinc-300 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-700/50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => navigate(index + 1)}
          disabled={index === steps.length - 1}
          aria-label="Next step"
          className="rounded-md bg-lime-500 px-2.5 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-lime-400 disabled:opacity-40"
        >
          Step
        </button>
        <span className="ml-auto font-mono text-[10px] text-zinc-400" data-testid="step-counter">
          {index} / {steps.length - 1}
        </span>
      </div>
    </div>
  )
}
