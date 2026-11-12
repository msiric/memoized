'use client'

import { AnimatePresence, m } from 'framer-motion'
import { useEffect, useMemo, useRef } from 'react'
import { cn as clsx } from '../../primitives/cn'
import { Tag } from '../../primitives/Tag'
import { ink, now as nowCls, radius, stroke, surface, type as typeScale } from '../../primitives/tokens-v3'
import { useFlip } from '../../shell/flip'
import { presence } from '../../shell/motion'
import type { StageProps } from '../../shell/types'
import { H_CLS, heights } from '../../shell/vars'
import { Lane } from '../../substrates/Lane'
import { G, type EventLoopMetrics } from './layout'
import { eventLoopIntrospection, outId, type EventLoopState } from './model'

/**
 * Event-loop renderer: state -> lanes. Narrow: code on top, then
 * [call stack | host], microtasks, tasks, console. Wide: code on the left at
 * full stage height, regions on the right.
 *
 * Console lines are output, so they are amber from the step they appear on
 * and never change color again (D4). The newest line is marked by a `new`
 * tag (the non-color channel), not by a second color.
 */
export function EventLoopStage({ step, previous, codePane, layout, motion: gate, label }: StageProps<EventLoopState>) {
  // Region heights cover every preset of the visual (computed by the shell
  // over all logs), so switching presets never moves anything.
  const metrics = layout.detail as EventLoopMetrics
  const topRowNarrow = Math.max(metrics.stackLane.narrow, metrics.hostLane.narrow)
  const state = step.state
  const focus = useMemo(() => new Set(step.focus), [step.focus])
  const ids = eventLoopIntrospection.ids(state)
  const prevIds = previous ? eventLoopIntrospection.ids(previous.state) : new Set<string>()
  const created = new Set([...focus].filter((f) => !prevIds.has(f) && !f.startsWith('out-')))

  // What was on stage in the last render, so a moved chip slides instead of
  // fading in (scrubs and jumps included).
  const rendered = useRef<ReadonlySet<string>>(ids)
  const before = rendered.current
  useEffect(() => {
    rendered.current = ids
  })

  const common = { focus, created, present: ids, before, gate }
  const root = useRef<HTMLDivElement>(null)
  useFlip(root, gate, step)
  const consoleFocused = focus.has('console')

  return (
    <div
      ref={root}
      className="relative flex h-full flex-col gap-2 md:grid md:gap-x-4 md:[grid-template-columns:var(--vz-cols-md)] xl:[grid-template-columns:var(--vz-cols-xl)]"
      style={{
        ['--vz-cols-md' as string]: `minmax(${G.codeMin.md}px, max-content) minmax(${G.regionsMin}px, 1fr)`,
        ['--vz-cols-xl' as string]: `minmax(${G.codeMin.xl}px, max-content) minmax(0, 1fr)`,
      }}
    >
      {codePane}
      <div role="img" aria-label={label} className="flex min-w-0 flex-col gap-2">
        <div className="grid grid-cols-2 gap-2 md:flex md:flex-col">
          <Lane
            {...common}
            id="stack"
            label="Call stack"
            kind="frame"
            chips={state.stack}
            labelAt={{ narrow: 'top', wide: metrics.maxStack > 1 ? 'top' : 'inline' }}
            height={{ narrow: topRowNarrow, wide: metrics.stackLane.wide }}
            from={{ y: -1 }}
            to={{ y: -1 }}
          />
          <Lane
            {...common}
            id="host"
            label="Host (timers)"
            kind="host"
            chips={state.host}
            labelAt={{ narrow: 'top', wide: 'inline' }}
            height={{ narrow: topRowNarrow, wide: metrics.hostLane.wide }}
            from={{ x: -1 }}
            to={{ x: 1 }}
          />
        </div>
        <Lane
          {...common}
          id="micro"
          label="Microtasks"
          kind="micro"
          chips={state.micro}
          labelAt={{ narrow: 'inline', wide: 'inline' }}
          height={{ narrow: metrics.queueLane, wide: metrics.queueLane }}
          from={{ x: 1 }}
          to={{ x: -1 }}
        />
        <Lane
          {...common}
          id="tasks"
          label="Tasks"
          kind="task"
          chips={state.tasks}
          labelAt={{ narrow: 'inline', wide: 'inline' }}
          height={{ narrow: metrics.queueLane, wide: metrics.queueLane }}
          from={{ x: 1 }}
          to={{ x: -1 }}
        />
        <div
          data-viz-region="console"
          className={clsx(
            'relative flex flex-col gap-2 border p-2',
            radius.row.cls,
            stroke.hairline,
            surface.panel,
            consoleFocused && nowCls.panel,
            H_CLS,
          )}
          style={heights(metrics.console)}
        >
          <span className={clsx('h-4', typeScale.label.cls, ink.secondary)}>Console</span>
          <ol
            className="m-0 grid min-h-0 list-none grid-flow-col gap-x-4 p-0 [grid-template-rows:var(--vz-r-n)] md:[grid-template-rows:var(--vz-r-w)]"
            style={{
              gridTemplateColumns: `repeat(2, minmax(0, ${G.consoleCol}px))`,
              ['--vz-r-n' as string]: `repeat(${metrics.consoleRows.narrow}, ${G.consoleRow}px)`,
              ['--vz-r-w' as string]: `repeat(${metrics.consoleRows.wide}, ${G.consoleRow}px)`,
            }}
          >
            <AnimatePresence initial={false} mode="popLayout" custom={{ gate }}>
              {state.console.map((text, k) => {
                const isNew = focus.has(outId(k))
                return (
                  <m.li
                    key={`${k}:${gate.epoch}`}
                    data-out={k}
                    className={clsx('m-0 flex min-w-0 items-center gap-2 p-0', typeScale.value.cls)}
                    // Rises into place; on Back it leaves the way it came (D8).
                    {...presence(outId(k), gate, { from: { y: 1 }, to: { y: 1 } })}
                  >
                    <span className={clsx('w-4 shrink-0 text-right tabular-nums', typeScale.meta.cls, ink.muted)}>
                      {k + 1}
                    </span>
                    <span className={clsx('min-w-0 truncate', ink.result)}>› {text}</span>
                    {isNew ? (
                      <Tag tone="now" className="h-4 bg-transparent px-0">
                        new
                      </Tag>
                    ) : null}
                  </m.li>
                )
              })}
            </AnimatePresence>
            {state.console.length === 0 ? (
              <li aria-hidden className={clsx('m-0 flex items-center p-0', typeScale.tag.cls, ink.muted)}>
                no output yet
              </li>
            ) : null}
          </ol>
        </div>
      </div>
    </div>
  )
}
