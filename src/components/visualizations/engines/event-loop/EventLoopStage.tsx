'use client'

import clsx from 'clsx'
import { AnimatePresence, m } from 'framer-motion'
import { useEffect, useMemo, useRef } from 'react'
import { ink, surface, type as typeScale } from '../../primitives/tokens-v2'
import { useFlip } from '../../shell/flip'
import { transitionFor, travel } from '../../shell/motion'
import type { StageProps } from '../../shell/types'
import { H_CLS, heights } from '../../shell/vars'
import { Lane } from '../../substrates/Lane'
import type { EventLoopMetrics } from './layout'
import { eventLoopIntrospection, outId, type EventLoopState } from './model'

/**
 * Event-loop renderer: state -> lanes. Narrow: code on top, then
 * [call stack | host], microtasks, tasks, console. Wide: code on the left at
 * full stage height, regions on the right.
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
  const enterT = transitionFor('enter', gate)
  const dIn = travel('enter', gate)
  const consoleFocused = focus.has('console')

  return (
    <div
      ref={root}
      className="relative flex h-full flex-col gap-2 md:grid md:grid-cols-[minmax(280px,max-content)_minmax(240px,1fr)] md:gap-x-4 xl:grid-cols-[minmax(360px,max-content)_minmax(0,1fr)]"
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
            'relative flex flex-col gap-2 rounded-lg border border-zinc-700/60 p-2 print:border-zinc-300',
            surface.panel,
            consoleFocused && 'outline outline-2 outline-offset-1 outline-lime-400',
            H_CLS,
          )}
          style={heights(metrics.console)}
        >
          <span className={clsx('h-4', typeScale.regionLabel.cls, ink.secondary)}>Console</span>
          <ol
            className="m-0 grid min-h-0 list-none grid-flow-col grid-cols-[repeat(2,minmax(0,13rem))] gap-x-4 p-0 [grid-template-rows:repeat(var(--vz-r-n),20px)] md:[grid-template-rows:repeat(var(--vz-r-w),20px)]"
            style={{
              ['--vz-r-n' as string]: String(metrics.consoleRows.narrow),
              ['--vz-r-w' as string]: String(metrics.consoleRows.wide),
            }}
          >
            <AnimatePresence initial={false} mode="popLayout">
              {state.console.map((text, k) => {
                const now = focus.has(outId(k))
                return (
                  <m.li
                    key={`${k}:${gate.epoch}`}
                    data-out={k}
                    className="m-0 flex min-w-0 items-center gap-2 p-0 font-mono text-[13px] leading-5"
                    initial={gate.instant ? false : { opacity: 0, y: dIn }}
                    animate={{ opacity: 1, y: 0, transition: enterT }}
                    exit={{ opacity: 0, transition: { duration: 0 } }}
                  >
                    <span className={clsx('w-4 shrink-0 text-right text-[12px] tabular-nums', ink.muted)}>{k + 1}</span>
                    <span className={clsx('min-w-0 truncate', now ? ink.now : ink.result)}>› {text}</span>
                    {now ? <span className={clsx('shrink-0 text-[12px] leading-4', ink.now)}>new</span> : null}
                  </m.li>
                )
              })}
            </AnimatePresence>
            {state.console.length === 0 ? (
              <li aria-hidden className={clsx('m-0 flex items-center p-0 text-[12px] leading-4', ink.muted)}>
                no output yet
              </li>
            ) : null}
          </ol>
        </div>
      </div>
    </div>
  )
}
