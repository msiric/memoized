'use client'

import { AnimatePresence, m } from 'framer-motion'
import { useEffect, useMemo, useRef } from 'react'
import { cn as clsx } from '../../primitives/cn'
import {
  ink,
  radius,
  surface,
  type as typeScale,
} from '../../primitives/tokens-v3'
import { useFlip } from '../../shell/flip'
import { presence, transitionFor } from '../../shell/motion'
import type { PerVariant, StageProps } from '../../shell/types'
import { Lane, showCls, type LaneChip } from '../../substrates/Lane'
import { remHeights, toRem } from '../../substrates/units'
import {
  G,
  consoleVisible,
  earlierLabel,
  lineTag,
  moreLabel,
  outputLines,
  queueVisible,
  type EventLoopMetrics,
  type LaneKind,
} from './layout'
import {
  consoleReveal,
  eventLoopIntrospection,
  outId,
  type ElChip,
  type EventLoopState,
} from './model'

/**
 * Event-loop renderer: state -> lanes (VIZ-H D16, R7).
 *
 * Below 768 (phones): code, then the four lanes as a 2x2 grid with their
 * labels on top, then the console strip, so code line, stage, caption and
 * Next fit one 375x667 screen. From 768: code with the console under it on
 * the left (source, then what it printed), the machine on the right.
 *
 * The console is one left-to-right strip in log order: the order is the
 * content. Output is amber from the step it appears on and never changes
 * color (D4). The newest output, and only it, is marked: a quiet amber
 * ground (`surface.resultTint`); the panel itself is never lime (R1, N03).
 * Its arrival is the enter motion, so there is no `new` tag (D22).
 *
 * The finale (D21, R7): on the last step every output resolves in turn, left
 * to right, `consoleReveal` apart: its ground comes up, the tag naming the
 * source line that printed it (`L5`) appears under it, and the shell's code
 * pane relights that line (`codeTrace`), so the reordering of the source
 * reads in one pass. No new color, no movement. The tag's line is reserved
 * on every step, so the finale moves nothing. Under reduced motion it lands
 * in one crossfade; Back, a resize and instant renders land it in one frame.
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
  log,
  index,
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
  // The end of the run: every output is part of the answer (D21).
  const resolved = index === log.steps.length - 1
  const sweep = consoleReveal(state.console.length)
  const sources = useMemo(() => outputLines(log), [log])

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
    narrow: consoleVisible(out, metrics.consoleWidth.narrow, G.consoleRows, sources),
    wide: consoleVisible(out, metrics.consoleWidth.wide, G.consoleRows, sources),
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
        'vz-wide:grid vz-wide:[grid-template-columns:var(--vz-cols-md)] vz-wide:[grid-template-rows:auto_minmax(0,1fr)] vz-xl:[grid-template-columns:var(--vz-cols-xl)]',
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
      <div className="flex min-w-0 flex-col vz-wide:col-start-1 vz-wide:row-start-1 vz-wide:[&>*]:!w-full vz-wide:[&>*]:self-stretch">
        {codePane}
      </div>

      {/* The machine. Its accessible name describes every region, the console included. */}
      <div
        role="img"
        aria-label={label}
        className="grid min-w-0 grid-cols-2 vz-wide:col-start-2 vz-wide:row-span-2 vz-wide:row-start-1 vz-wide:flex vz-wide:flex-col"
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
        className={clsx(
          // From 768 the console fills the rest of the left column, so both
          // columns end on one line whatever the preset's code length.
          // Borderless (R2); a transparent border keeps the geometry.
          'relative flex min-w-0 flex-col border border-transparent p-2 vz-wide:col-start-1 vz-wide:row-start-2 vz-wide:min-h-[var(--vz-h-w)] vz-wide:self-stretch',
          'h-[var(--vz-h-n)] vz-wide:h-auto',
          radius.row.cls,
          surface.panel,
        )}
        style={remHeights(metrics.console, { gap: toRem(G.labelGap) })}
      >
        <span
          className={clsx('h-4 shrink-0', typeScale.label.cls, ink.secondary)}
        >
          Console
        </span>
        <ol
          className="m-0 flex min-h-0 min-w-0 list-none flex-wrap content-start items-start p-0"
          style={{ columnGap: toRem(G.outGap), rowGap: toRem(G.outRowGap) }}
        >
          {out.length > kept.narrow || out.length > kept.wide
            ? (['narrow', 'wide'] as const).map((v) =>
                firstShown[v] > 0 ? (
                  <li
                    key={`earlier-${v}`}
                    data-viz-part="console-earlier"
                    className={clsx(
                      'm-0 flex h-5 items-center self-start p-0',
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
          <AnimatePresence
            key={gate.epoch}
            initial={false}
            mode="popLayout"
            custom={{ gate }}
          >
            {out.map((text, k) => {
              const isNew = focus.has(outId(k))
              const lit = isNew || resolved
              // Only the finale tweens: every output's ground and tag come up
              // in turn, the newest included (its ground restarts from 0, R5).
              // Everything else lands (an output that stops being newest,
              // Back, a jump, a resize).
              const playing = gate.reveal && resolved
              const beat = playing
                ? gate.reduce
                  ? transitionFor('enter', gate)
                  : { ...transitionFor('enter', gate), delay: (k * sweep.staggerMs) / 1000 }
                : { duration: 0 }
              const show = {
                narrow: k >= firstShown.narrow,
                wide: k >= firstShown.wide,
              }
              const source = sources[k]
              return (
                <m.li
                  key={`${k}:${gate.epoch}`}
                  data-out={k}
                  data-focus={isNew || undefined}
                  // `›` in its own column; the value and, under it, its tag.
                  className={clsx(
                    'm-0 grid min-w-0 max-w-full items-center p-0 [grid-template-columns:auto_minmax(0,1fr)]',
                    typeScale.value.cls,
                    showCls(show.narrow && show.wide ? both : show),
                  )}
                  style={{ columnGap: toRem(G.outMark) }}
                  // Rises into place; on Back it leaves the way it came (D8).
                  {...presence(outId(k), gate, {
                    from: { y: 1 },
                    to: { y: 1 },
                  })}
                >
                  <span aria-hidden className={clsx('flex h-5 items-center', ink.muted)}>
                    ›
                  </span>
                  <span className="flex h-5 min-w-0 items-center">
                    <span
                      title={text}
                      className={clsx(
                        // The newest output is never the one truncated (F4): the
                        // lint keeps outputs short, and a guard only truncates older ones.
                        isNew ? 'break-all' : 'min-w-0 truncate',
                        // Room for the ground without moving the text.
                        'relative -mx-1 px-1',
                        ink.result,
                      )}
                    >
                      <m.span
                        // Remounted for the finale, so every ground starts at 0.
                        key={playing ? 'finale' : 'step'}
                        aria-hidden
                        data-viz-reveal="out"
                        className={clsx('absolute inset-0', surface.resultTint, radius.chip.cls)}
                        initial={playing ? { opacity: 0 } : false}
                        animate={{ opacity: lit ? 1 : 0 }}
                        transition={beat}
                      />
                      <span className="relative">{text}</span>
                    </span>
                  </span>
                  {/* The finale's tag: the source line that printed this output (R7). */}
                  {source ? (
                    <m.span
                      key={playing ? 'finale' : 'step'}
                      aria-hidden
                      data-viz-reveal="tag"
                      data-line={source}
                      className={clsx('col-start-2 h-4', typeScale.meta.cls, ink.muted)}
                      initial={playing ? { opacity: 0 } : false}
                      animate={{ opacity: resolved ? 1 : 0 }}
                      transition={beat}
                    >
                      {lineTag(source)}
                    </m.span>
                  ) : null}
                </m.li>
              )
            })}
          </AnimatePresence>
          {out.length === 0 ? (
            <li
              aria-hidden
              className={clsx(
                'm-0 flex h-5 items-center self-start p-0',
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
