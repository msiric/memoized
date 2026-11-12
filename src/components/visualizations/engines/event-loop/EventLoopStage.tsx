'use client'

import { AnimatePresence, m } from 'framer-motion'
import { useEffect, useMemo, useRef } from 'react'
import { cn as clsx } from '../../primitives/cn'
import {
  ink,
  now as nowCls,
  radius,
  stroke,
  surface,
  type as typeScale,
} from '../../primitives/tokens-v3'
import { useFlip } from '../../shell/flip'
import { transitionFor, travel } from '../../shell/motion'
import type { PerVariant, StageProps } from '../../shell/types'
import { Lane, showCls, type LaneChip } from '../../substrates/Lane'
import { remHeights, toRem } from '../../substrates/units'
import {
  G,
  consoleVisible,
  earlierLabel,
  moreLabel,
  queueVisible,
  type EventLoopMetrics,
  type LaneKind,
} from './layout'
import {
  eventLoopIntrospection,
  outId,
  type ElChip,
  type EventLoopState,
} from './model'

/**
 * Event-loop renderer: state -> lanes (VIZ-H D16).
 *
 * Below 768 (phones): code, then the four lanes as a 2x2 grid with their
 * labels on top, then the console strip, so code line, stage, caption and
 * Next fit one 375x667 screen. From 768: code with the console under it on
 * the left (source, then what it printed), the machine on the right.
 *
 * The console is one left-to-right strip in log order: the order is the
 * content. Output is amber from the step it appears on and never changes
 * color (D4); the newest output carries a quiet amber tint, and its arrival
 * is the enter motion, so there is no `new` tag (D22).
 */

const both = { narrow: true, wide: true }

/** Chips visible per variant, plus one `+N more` chip per variant that collapses (A1). */
function laneChips(
  lane: string,
  chips: readonly ElChip[],
  kind: LaneKind,
  width: PerVariant<number>,
  rows: number,
): LaneChip[] {
  const k = {
    narrow: queueVisible(chips, kind, width.narrow, rows),
    wide: queueVisible(chips, kind, width.wide, rows),
  }
  const out: LaneChip[] = chips.map((c, i) => ({
    ...c,
    show:
      i < k.narrow && i < k.wide
        ? undefined
        : { narrow: i < k.narrow, wide: i < k.wide },
  }))
  for (const v of ['narrow', 'wide'] as const)
    if (k[v] < chips.length)
      out.push({
        id: `${lane}-more-${v}`,
        label: moreLabel(chips.length - k[v]),
        more: true,
        show: { narrow: v === 'narrow', wide: v === 'wide' },
      })
  return out
}

export function EventLoopStage({
  step,
  previous,
  codePane,
  layout,
  motion: gate,
  label,
}: StageProps<EventLoopState>) {
  // Region heights cover every preset of the visual (computed over all
  // logs), so switching presets never moves anything.
  const metrics = layout.detail as EventLoopMetrics
  const state = step.state
  const focus = useMemo(() => new Set(step.focus), [step.focus])
  const ids = eventLoopIntrospection.ids(state)
  const prevIds = previous
    ? eventLoopIntrospection.ids(previous.state)
    : new Set<string>()
  const created = new Set(
    [...focus].filter((f) => !prevIds.has(f) && !f.startsWith('out-')),
  )

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

  const rows = G.queueRows
  const micro = laneChips(
    'micro',
    state.micro,
    'micro',
    metrics.queueWidth,
    rows,
  )
  const tasks = laneChips(
    'tasks',
    state.tasks,
    'task',
    metrics.queueWidth,
    rows,
  )
  const host = laneChips('host', state.host, 'host', metrics.hostWidth, rows)

  // The console keeps the newest outputs; the oldest collapse into `N earlier`.
  const out = state.console
  const kept = {
    narrow: consoleVisible(out, metrics.consoleWidth.narrow, G.consoleRows),
    wide: consoleVisible(out, metrics.consoleWidth.wide, G.consoleRows),
  }
  const firstShown = {
    narrow: out.length - kept.narrow,
    wide: out.length - kept.wide,
  }

  return (
    <div
      ref={root}
      className={clsx(
        'relative flex h-full flex-col',
        'md:grid md:[grid-template-columns:var(--vz-cols-md)] md:[grid-template-rows:auto_minmax(0,1fr)] xl:[grid-template-columns:var(--vz-cols-xl)]',
      )}
      style={{
        gap: toRem(G.gap),
        columnGap: toRem(16),
        ['--vz-cols-md' as string]: `${toRem(metrics.codeColumn.md)} minmax(0, 1fr)`,
        ['--vz-cols-xl' as string]: `${toRem(metrics.codeColumn.xl)} minmax(0, 1fr)`,
      }}
    >
      {/* From 768 the pane fills the fixed code column, so its edges line up
          with the console under it. */}
      <div className="flex min-w-0 flex-col md:col-start-1 md:row-start-1 md:[&>*]:!w-full md:[&>*]:self-stretch">
        {codePane}
      </div>

      {/* The machine. Its accessible name describes every region, the console included. */}
      <div
        role="img"
        aria-label={label}
        className="grid min-w-0 grid-cols-2 md:col-start-2 md:row-span-2 md:row-start-1 md:flex md:flex-col"
        style={{ gap: toRem(G.gap) }}
      >
        <Lane
          {...common}
          id="stack"
          label="Call stack"
          kind="frame"
          chips={state.stack}
          labelAt={{
            narrow: 'top',
            wide: metrics.stackLabelTopWide ? 'top' : 'inline',
          }}
          height={metrics.stackLane}
          from={{ y: -1 }}
          to={{ y: -1 }}
        />
        <Lane
          {...common}
          id="host"
          label="Host (timers)"
          kind="host"
          chips={host}
          labelAt={{ narrow: 'top', wide: 'inline' }}
          height={metrics.hostLane}
          from={{ x: -1 }}
          to={{ x: 1 }}
        />
        <Lane
          {...common}
          id="micro"
          label="Microtasks"
          kind="micro"
          chips={micro}
          labelAt={{ narrow: 'top', wide: 'inline' }}
          height={metrics.queueLane}
          from={{ x: 1 }}
          to={{ x: -1 }}
        />
        <Lane
          {...common}
          id="tasks"
          label="Tasks"
          kind="task"
          chips={tasks}
          labelAt={{ narrow: 'top', wide: 'inline' }}
          height={metrics.queueLane}
          from={{ x: 1 }}
          to={{ x: -1 }}
        />
      </div>

      <div
        aria-hidden
        data-viz-region="console"
        data-focus={consoleFocused || undefined}
        className={clsx(
          // From 768 the console fills the rest of the left column, so both
          // columns end on one line whatever the preset's code length.
          'relative flex min-w-0 flex-col border p-2 md:col-start-1 md:row-start-2 md:min-h-[var(--vz-h-w)] md:self-stretch',
          'h-[var(--vz-h-n)] md:h-auto',
          radius.row.cls,
          stroke.hairline,
          surface.panel,
          consoleFocused && nowCls.panel,
        )}
        style={remHeights(metrics.console, { gap: toRem(G.labelGap) })}
      >
        <span
          className={clsx('h-4 shrink-0', typeScale.label.cls, ink.secondary)}
        >
          Console
        </span>
        <ol
          className="m-0 flex min-h-0 min-w-0 list-none flex-wrap content-start items-center p-0"
          style={{ columnGap: toRem(G.outGap), rowGap: toRem(G.outRowGap) }}
        >
          {out.length > kept.narrow || out.length > kept.wide
            ? (['narrow', 'wide'] as const).map((v) =>
                firstShown[v] > 0 ? (
                  <li
                    key={`earlier-${v}`}
                    data-viz-part="console-earlier"
                    className={clsx(
                      'm-0 flex h-5 items-center p-0',
                      typeScale.tag.cls,
                      ink.muted,
                      showCls({ narrow: v === 'narrow', wide: v === 'wide' }),
                    )}
                  >
                    {earlierLabel(firstShown[v])}
                  </li>
                ) : null,
              )
            : null}
          <AnimatePresence initial={false} mode="popLayout">
            {out.map((text, k) => {
              const isNew = focus.has(outId(k))
              const show = {
                narrow: k >= firstShown.narrow,
                wide: k >= firstShown.wide,
              }
              return (
                <m.li
                  key={`${k}:${gate.epoch}`}
                  data-out={k}
                  data-focus={isNew || undefined}
                  className={clsx(
                    'm-0 flex h-5 min-w-0 max-w-full items-center p-0',
                    typeScale.value.cls,
                    showCls(show.narrow && show.wide ? both : show),
                  )}
                  style={{ gap: toRem(G.outMark) }}
                  initial={gate.instant ? false : { opacity: 0, y: dIn }}
                  animate={{ opacity: 1, y: 0, transition: enterT }}
                  exit={{ opacity: 0, transition: { duration: 0 } }}
                >
                  <span aria-hidden className={clsx('shrink-0', ink.muted)}>
                    ›
                  </span>
                  <span
                    title={text}
                    className={clsx(
                      // The newest output is never the one truncated (F4): the
                      // lint keeps outputs short, and a guard only truncates older ones.
                      isNew ? 'break-all' : 'min-w-0 truncate',
                      ink.result,
                      isNew &&
                        clsx(
                          '-mx-1 px-1',
                          radius.chip.cls,
                          'bg-amber-400/10 print:bg-transparent',
                        ),
                    )}
                  >
                    {text}
                  </span>
                </m.li>
              )
            })}
          </AnimatePresence>
          {out.length === 0 ? (
            <li
              aria-hidden
              className={clsx(
                'm-0 flex h-5 items-center p-0',
                typeScale.tag.cls,
                ink.muted,
              )}
            >
              no output yet
            </li>
          ) : null}
        </ol>
      </div>
    </div>
  )
}
