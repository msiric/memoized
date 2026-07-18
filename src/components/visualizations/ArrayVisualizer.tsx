'use client'

import clsx from 'clsx'
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useRef } from 'react'
import { VizControls } from './primitives/VizControls'
import { VizFrame } from './primitives/VizFrame'
import { useMounted } from './primitives/useMounted'
import { useStepper } from './primitives/useStepper'
import { viz } from './primitives/tokens'

/**
 * A reusable, data-driven array visualizer for the interview-prep lessons.
 *
 * The author provides only DATA (an array + a window size). The component runs
 * the algorithm to build a step-log, then plays it via the shared stepper. The
 * window is a single overlay sized EXACTLY to the active cells and positioned
 * from the step, so it slides reliably with no hand-placed coordinates. Entering
 * and leaving cues are derived from the previous frame, so they stay correct in
 * both directions. The same component generalises to two-pointer, binary search,
 * and sorting by swapping the step-log generator.
 */

export type ArrayStep = {
  start: number
  end: number
  sum: number | null
  max: number
  note: string
  win?: boolean
}

/** Fixed-size sliding window: emit one frame per window position. */
export const buildSlidingWindowSteps = (data: number[], k: number): ArrayStep[] => {
  if (k <= 0 || k > data.length) {
    return [{ start: 0, end: -1, sum: null, max: 0, note: 'Window size must be between 1 and the array length.' }]
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

const windowSet = (s: ArrayStep | undefined): Set<number> => {
  const set = new Set<number>()
  if (s && s.start >= 0 && s.end >= s.start) for (let i = s.start; i <= s.end; i++) set.add(i)
  return set
}

export function ArrayVisualizer({ data, windowSize, label }: ArrayVisualizerProps) {
  const steps = useMemo(() => buildSlidingWindowSteps(data, windowSize), [data, windowSize])
  const stepper = useStepper(steps.length, { ariaLabel: 'Sliding window visualization' })
  const reduce = useReducedMotion()
  const mounted = useMounted()
  const { index } = stepper
  const step = steps[index]

  // Derive entering/leaving from the previous committed frame, so the cues are
  // correct whether stepping forward, back, or resetting.
  const prevIndexRef = useRef(index)
  const fromStep = steps[prevIndexRef.current]
  useEffect(() => {
    prevIndexRef.current = index
  })
  const to = windowSet(step)
  const from = windowSet(fromStep)
  const entering = [...to].filter((i) => !from.has(i))
  const leaving = [...from].filter((i) => !to.has(i))

  const hasWindow = step.start >= 0 && step.end >= step.start
  const count = hasWindow ? step.end - step.start + 1 : 0
  const pitch = CELL + GAP
  const frameX = step.start * pitch
  const frameW = count > 0 ? count * CELL + (count - 1) * GAP : 0
  const rowW = data.length * CELL + (data.length - 1) * GAP

  const cellPulse = (i: number) => {
    if (reduce) return {}
    if (entering.includes(i)) return viz.motion.pulseEnter
    if (leaving.includes(i)) return viz.motion.pulseLeave
    return { scale: 1 }
  }

  return (
    <VizFrame
      label={label}
      caption={step.note}
      captionReserve={steps.map((s) => s.note)}
      controls={<VizControls stepper={stepper} />}
      containerProps={stepper.containerProps}
    >
      <div className="overflow-x-auto py-1">
        {/* the window overlay is sized exactly to the active cells and sits behind them */}
        <div className="relative mx-auto" style={{ width: rowW, height: CELL }}>
          {hasWindow ? (
            mounted ? (
              <motion.div
                aria-hidden
                initial={false}
                animate={{ x: frameX, width: frameW }}
                transition={reduce ? { duration: 0 } : viz.motion.slide}
                className={clsx('pointer-events-none absolute left-0 top-0 z-0', viz.window.base, step.win ? viz.window.win : viz.window.default)}
                style={{ height: CELL }}
              />
            ) : (
              <div
                aria-hidden
                className={clsx('pointer-events-none absolute left-0 top-0 z-0', viz.window.base, step.win ? viz.window.win : viz.window.default)}
                style={{ height: CELL, width: frameW, transform: `translateX(${frameX}px)` }}
              />
            )
          ) : null}

          <div className="absolute inset-0 z-10 flex" style={{ gap: GAP }} data-testid="array-cells">
            {data.map((value, i) => {
              const active = i >= step.start && i <= step.end
              const className = clsx(
                viz.cell.base,
                active ? viz.cell.active : viz.cell.muted,
                leaving.includes(i) && viz.cell.leavingText,
                entering.includes(i) && viz.cell.enteringText,
              )
              const style = { width: CELL, height: CELL }
              return mounted ? (
                <motion.div
                  key={i}
                  data-testid="cell"
                  animate={cellPulse(i)}
                  transition={{ duration: reduce ? 0 : viz.motion.pulseDuration }}
                  className={className}
                  style={style}
                >
                  {value}
                </motion.div>
              ) : (
                <div key={i} data-testid="cell" className={className} style={style}>
                  {value}
                </div>
              )
            })}
          </div>
        </div>

        {/* index row */}
        <div className="mx-auto mt-1 flex" style={{ width: rowW, gap: GAP }}>
          {data.map((_, i) => (
            <span key={i} className="text-center font-mono text-[10px] text-zinc-400" style={{ width: CELL }}>
              i{i}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <span className={clsx(viz.pill.base, viz.pill.primary)} data-testid="sum">
          window sum = <strong>{step.sum ?? '\u2013'}</strong>
        </span>
        <span className={clsx(viz.pill.base, viz.pill.win)} data-testid="max">
          max so far = <strong>{step.max}</strong>
        </span>
      </div>
    </VizFrame>
  )
}
