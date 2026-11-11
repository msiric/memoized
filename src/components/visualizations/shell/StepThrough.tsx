'use client'

import clsx from 'clsx'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import {
  TARGET_GAP_PX,
  focusRing,
  ink,
  motionRules,
  surface,
  transitionCls,
  type as typeScale,
} from '../primitives/tokens-v2'
import { CodePane } from './CodePane'
import { BackIcon, DockButton, NextIcon, PauseIcon, PlayIcon, RestartIcon } from './controls'
import { CHOICE, FRAME, STEP_BAR, definitionMetrics } from './footprint'
import { feedbackText } from './feedback'
import {
  dockMode,
  initialState,
  openCheckpointAt,
  reduce,
  type Action,
  type MachineState,
  type PresetShape,
  type Speed,
} from './machine'
import { transitionFor, type MotionGate } from './motion'
import { PresetSwitcher } from './PresetSwitcher'
import { Scrubber } from './Scrubber'
import { StepsAsText, runtimeName } from './StepsAsText'
import type { StepThroughDefinition } from './types'
import { H_CLS, heights } from './vars'

/**
 * StepThrough: the single shell for every step-through visual (spec §6.1).
 *
 * It owns the frame anatomy (§3.3), the stepper state and dock modes (§5),
 * narration (§5.3), footprint reservation and the motion gate (§4). An engine
 * only renders its stage for a state.
 *
 * `interactive={false}` renders the static Start frame for the server: the
 * controls keep their space but are hidden and `aria-disabled` (§3.5).
 */

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

const NAV_ACTIONS = new Set<Action['type']>([
  'next',
  'back',
  'seek',
  'end',
  'restart',
  'answer',
  'skip',
  'tick',
  'preset',
])

/** `epoch` counts instant renders: glyphs keyed by it remount at their end state, which snaps any transition still in flight. */
type Nav = { state: MachineState; instant: boolean; at: number; epoch: number }

export type StepThroughProps<S> = {
  def: StepThroughDefinition<S>
  preset?: string
  interactive?: boolean
}

export function StepThrough<S>({ def, preset, interactive = true }: StepThroughProps<S>) {
  const uid = useId().replace(/:/g, '')
  const titleId = `${uid}-title`
  const promptId = `${uid}-prompt`
  const shapes: PresetShape[] = useMemo(
    () => def.presets.map((p) => ({ steps: p.log.steps.length, checkpoints: p.log.checkpoints })),
    [def],
  )
  const metrics = useMemo(() => definitionMetrics(def), [def])
  const layout = useMemo(() => def.engine.layout(def.presets.map((p) => p.log)), [def])
  const startPreset = Math.max(
    0,
    def.presets.findIndex((p) => p.id === (preset ?? def.defaultPreset)),
  )

  // State plus the motion decision for the render it produced. Two commands
  // inside one transition window render instantly (§4 rule 3).
  const [nav, send] = useReducer(
    (prev: Nav, a: Action & { forceInstant?: boolean; now: number }): Nav => {
      const state = reduce(shapes, prev.state, a)
      if (!NAV_ACTIONS.has(a.type)) return state === prev.state ? prev : { ...prev, state }
      const instant = Boolean(a.forceInstant) || a.now - prev.at < motionRules.maxTransitionMs
      return { state, instant, at: a.now, epoch: instant ? prev.epoch + 1 : prev.epoch }
    },
    undefined,
    () => ({ state: initialState(shapes, startPreset), instant: true, at: -Infinity, epoch: 0 }),
  )
  const dispatch = useCallback(
    (a: Action, forceInstant = false) => send({ ...a, forceInstant, now: performance.now() }),
    [],
  )
  const s = nav.state

  const prefersReduced = useReducedMotion() ?? false
  const gate: MotionGate = { reduce: prefersReduced, instant: nav.instant || !interactive, epoch: nav.epoch }
  const animate = !gate.instant && !gate.reduce

  const current = def.presets[s.preset]
  const log = current.log
  const step = log.steps[s.index]
  const previous = s.index > 0 ? log.steps[s.index - 1] : undefined
  const total = log.steps.length
  const last = total - 1
  const mode = interactive ? dockMode(shapes, s) : 'controls'
  const openK = openCheckpointAt(shapes, s)
  const cpIndex = mode === 'ask' ? openK : mode === 'reveal' ? s.reveal : null
  const cp = cpIndex !== null && cpIndex >= 0 ? log.checkpoints[cpIndex] : null

  const anchor = useMemo(() => {
    for (let i = s.index; i >= 0; i--) {
      const l = log.steps[i].line
      if (typeof l === 'number') return l
      if (Array.isArray(l)) return l[0] as number
    }
    return undefined
  }, [log, s.index])

  const counter = s.index === 0 ? 'Start' : `${s.index} / ${last}`
  const valueText = s.index === 0 ? 'Start' : `Step ${s.index} of ${last}`

  // ---- refs and focus management (§5.2) -----------------------------------
  const frameRef = useRef<HTMLElement>(null)
  const sliderRef = useRef<HTMLDivElement>(null)
  const choicesRef = useRef<HTMLDivElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)
  const choiceRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [choiceFocus, setChoiceFocus] = useState(0)
  const [hint, setHint] = useState<'never' | 'show' | 'hide'>('never')

  useIsoLayoutEffect(() => {
    const active = typeof document === 'undefined' ? null : (document.activeElement as HTMLElement | null)
    if (!active || !frameRef.current?.contains(active)) return
    // Focus moves on its own only when the focused control is replaced:
    // Next turning into the choices, a committed answer, Skip, or Back out
    // of a checkpoint. It never leaves the frame.
    const replaced = Boolean(active.closest('[data-inactive]'))
    if (mode === 'ask' && replaced) {
      setChoiceFocus(0)
      choiceRefs.current[0]?.focus()
    } else if (mode === 'reveal' && (choicesRef.current?.contains(active) || replaced)) {
      sliderRef.current?.focus()
    } else if (replaced) {
      sliderRef.current?.focus()
    }
  }, [mode, s.index])

  // ---- play cadence and stops (§4 rule 5) ---------------------------------
  useEffect(() => {
    if (!s.playing) return
    const id = window.setTimeout(() => dispatch({ type: 'tick' }), motionRules.playIntervalMs[s.speed])
    return () => window.clearTimeout(id)
  }, [s.playing, s.index, s.speed, dispatch])

  useEffect(() => {
    if (!s.playing) return
    const onVisibility = () => document.hidden && dispatch({ type: 'pause' })
    document.addEventListener('visibilitychange', onVisibility)
    let io: IntersectionObserver | undefined
    if (frameRef.current && typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(
        ([entry]) => {
          if (entry && entry.intersectionRatio < 0.5) dispatch({ type: 'pause' })
        },
        { threshold: [0, 0.5] },
      )
      io.observe(frameRef.current)
    }
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      io?.disconnect()
    }
  }, [s.playing, dispatch])

  // ---- narration: once per step, polite, never on load (§5.3) -------------
  const [live, setLive] = useState('')
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    const where = s.index === 0 ? 'Start.' : `Step ${s.index} of ${last}.`
    let text = `${where} ${step.narration} ${step.why}`
    if (mode === 'ask' && cp) text += ` Checkpoint: ${cp.prompt}`
    if (mode === 'reveal' && cp && cpIndex !== null) {
      const f = feedbackText(cp, s.picked[cpIndex])
      text = `${f.lead} ${f.body} ${where} ${step.narration}`
    }
    setLive(text)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.index, s.preset, mode])

  // ---- keyboard (§5.2), handled on the frame ------------------------------
  const onKeyDown = (e: ReactKeyboardEvent<HTMLElement>) => {
    if (!interactive || e.altKey || e.ctrlKey || e.metaKey) return
    const target = e.target as HTMLElement
    const ownKeys = target.closest('[data-viz-own-keys]')
    if (e.key === 'Escape') {
      if (s.playing) {
        e.preventDefault()
        dispatch({ type: 'pause' })
      }
      return
    }
    if (/^[1-4]$/.test(e.key) && mode === 'ask' && cp && target.tagName !== 'SELECT') {
      const choice = cp.choices[Number(e.key) - 1]
      if (choice) {
        e.preventDefault()
        dispatch({ type: 'answer', choice: choice.id })
      }
      return
    }
    if (ownKeys) return
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        e.preventDefault()
        if (mode === 'ask') {
          choiceRefs.current[0]?.focus()
          setChoiceFocus(0)
        } else dispatch({ type: 'next' })
        break
      case 'ArrowLeft':
      case 'ArrowDown':
        e.preventDefault()
        dispatch({ type: 'back' })
        break
      case 'Home':
        e.preventDefault()
        dispatch({ type: 'restart' }, true)
        break
      case 'End':
        e.preventDefault()
        dispatch({ type: 'end' }, true)
        break
      case ' ':
      case 'k':
      case 'K':
        e.preventDefault()
        dispatch({ type: 'toggle' })
        break
    }
  }

  const onChoiceKey = (e: ReactKeyboardEvent<HTMLButtonElement>, i: number, count: number) => {
    const delta =
      e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0
    if (!delta) return
    e.preventDefault()
    const n = (i + delta + count) % count
    setChoiceFocus(n)
    choiceRefs.current[n]?.focus()
  }

  // ---- render -------------------------------------------------------------
  const stageLabel = def.engine.describe(step.state)
  const codePane = log.code ? (
    <CodePane
      lines={log.code.lines}
      tokens={log.code.tokens}
      line={step.line}
      anchor={anchor}
      rows={{
        narrow: layout.codeRows.narrow,
        wide: Math.min(layout.codeRows.wide, log.code.lines.length),
      }}
      cols={layout.codeCols}
      animate={animate}
    />
  ) : null
  const Stage = def.engine.Stage
  const hidden = !interactive
  const captionT = transitionFor('caption', gate)

  const checkpointIndex = cpIndex ?? -1
  const picked = checkpointIndex >= 0 ? s.picked[checkpointIndex] : null
  const lastTime = checkpointIndex >= 0 ? s.memory[`${s.preset}:${checkpointIndex}`] : undefined
  const feedback = mode === 'reveal' && cp ? feedbackText(cp, picked) : null

  return (
    <section
      ref={frameRef}
      aria-labelledby={titleId}
      aria-roledescription="step-through"
      data-viz-frame={def.id}
      data-viz-preset={current.id}
      data-viz-step={s.index}
      data-viz-mode={mode}
      data-viz-interactive={interactive ? 'true' : 'false'}
      onKeyDown={onKeyDown}
      className={clsx(
        'not-prose relative -mx-4 border-y border-zinc-700/60 p-4 sm:mx-0 sm:rounded-xl sm:border-x print:break-inside-avoid',
        surface.frame,
      )}
      style={{ paddingTop: FRAME.padding, paddingBottom: FRAME.padding }}
    >
      {/* 1. Header: title, then the preset switcher (right from 768). */}
      <header
        className={clsx('flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-4', H_CLS)}
        style={heights({ narrow: metrics.narrow.header, wide: metrics.wide.header })}
      >
        <p id={titleId} className={clsx('m-0 truncate', typeScale.title.cls, ink.base)}>
          {def.title}
        </p>
        <div className={clsx('self-start md:self-auto', hidden && 'invisible')}>
          <PresetSwitcher
            presets={def.presets}
            value={s.preset}
            interactive={interactive}
            onChange={(i) => dispatch({ type: 'preset', preset: i }, true)}
          />
        </div>
      </header>

      {/* 2. Stage: fixed footprint, code pane inside the stage grid. */}
      <div
        data-viz-region="stage"
        className={clsx('relative', H_CLS)}
        style={heights({ narrow: metrics.narrow.stage, wide: metrics.wide.stage }, { marginTop: FRAME.headerGap })}
      >
        <Stage
          log={log}
          index={s.index}
          step={step}
          previous={previous}
          codePane={codePane}
          layout={layout}
          motion={gate}
          label={stageLabel}
          instanceId={uid}
        />
      </div>

      {/* 3. Step bar: event (what) left, counter right. */}
      <div
        data-viz-region="stepbar"
        className={clsx('flex items-center justify-between gap-4', typeScale.index.cls, ink.secondary)}
        style={{ height: STEP_BAR, marginTop: FRAME.stageGap }}
      >
        <span className="min-w-0 truncate" data-viz-part="viz-event">
          {s.index === 0 ? '' : step.event}
        </span>
        <span
          aria-hidden
          className={clsx('hidden min-w-0 truncate md:inline', ink.muted, hint === 'show' ? 'visible' : 'invisible')}
        >
          ← → to step
        </span>
        <span className="shrink-0" data-viz-part="viz-counter">
          {counter}
        </span>
      </div>

      {/* Narration: one polite status per step, outside the stage. */}
      <div role="status" className="sr-only" data-viz-part="viz-live">
        {live}
      </div>

      {/* 4. Dock: one reserved slot shared by the caption, the checkpoint
          (prompt and choices) and the reveal (feedback over marked choices).
          Below 768 the choices sit under the text, from 768 beside it. */}
      <div
        data-viz-region="dock"
        className={clsx('relative grid print:hidden', H_CLS)}
        style={heights({ narrow: metrics.narrow.dock, wide: metrics.wide.dock }, { marginTop: FRAME.dockGap })}
      >
        <div
          data-inactive={mode !== 'controls' || undefined}
          className={clsx('col-start-1 row-start-1 grid content-start', mode !== 'controls' && 'invisible')}
        >
          <AnimatePresence initial={false} custom={captionT}>
            <m.p
              key={`${s.preset}:${s.index}:${nav.epoch}`}
              data-viz-part="viz-caption"
              className={clsx('col-start-1 row-start-1 m-0', typeScale.caption.cls, ink.base)}
              initial={gate.instant ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit="out"
              custom={captionT}
              variants={{ out: (t: typeof captionT) => ({ opacity: 0, transition: t }) }}
              transition={captionT}
            >
              {step.why}
            </m.p>
          </AnimatePresence>
        </div>
        <div
          data-inactive={mode === 'controls' || undefined}
          className={clsx(
            'col-start-1 row-start-1 flex min-w-0 flex-col self-start md:flex-row md:items-center',
            mode === 'controls' && 'invisible',
          )}
          style={{ gap: CHOICE.textGap }}
        >
          <div className="min-w-0 md:flex-1 md:pr-2">
            {feedback ? (
              <p className={clsx('m-0', typeScale.caption.cls, ink.base)} data-viz-part="viz-feedback">
                <span className="font-semibold">{feedback.lead}</span> {feedback.body}
              </p>
            ) : (
              <p id={promptId} className={clsx('m-0', typeScale.prompt.cls, ink.base)} data-viz-part="viz-prompt">
                {cp?.prompt}
              </p>
            )}
          </div>
          <div
            ref={choicesRef}
            role="radiogroup"
            aria-labelledby={promptId}
            data-viz-own-keys
            className="grid shrink-0 grid-cols-2 md:w-[var(--vz-choices-w)]"
            style={{ gap: CHOICE.gap, ['--vz-choices-w' as string]: `${2 * CHOICE.wideWidth + CHOICE.gap}px` }}
          >
            {(cp?.choices ?? []).map((choice, i) => {
              const isPicked = picked === choice.id
              const isAnswer = cp?.answer === choice.id
              const revealed = mode === 'reveal'
              const badge = revealed && isAnswer ? 'answer' : !revealed && lastTime === choice.id ? 'last time' : null
              return (
                <button
                  key={choice.id}
                  ref={(el) => {
                    choiceRefs.current[i] = el
                  }}
                  type="button"
                  role="radio"
                  aria-checked={revealed ? isPicked : false}
                  aria-disabled={revealed || undefined}
                  tabIndex={mode === 'ask' && i === choiceFocus ? 0 : -1}
                  onClick={() => mode === 'ask' && dispatch({ type: 'answer', choice: choice.id })}
                  onKeyDown={(e) => {
                    if (mode === 'ask') onChoiceKey(e, i, cp?.choices.length ?? 0)
                  }}
                  onFocus={() => setChoiceFocus(i)}
                  data-choice={choice.id}
                  className={clsx(
                    'relative flex h-11 min-w-0 items-center gap-2 rounded-[10px] border pl-2 pr-3 text-left',
                    focusRing,
                    transitionCls.feedback,
                    revealed && isAnswer
                      ? 'border-amber-400 shadow-[inset_0_0_0_1px_theme(colors.amber.400)]'
                      : revealed && isPicked
                        ? 'border-rose-400 shadow-[inset_0_0_0_1px_theme(colors.rose.400)]'
                        : 'border-zinc-600',
                    mode === 'ask' ? 'hover:border-zinc-400 hover:bg-zinc-800' : 'cursor-default',
                  )}
                >
                  <span
                    aria-hidden
                    className={clsx(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-md',
                      revealed && isPicked
                        ? clsx('text-[16px] font-semibold leading-5', isAnswer ? ink.now : ink.removed)
                        : clsx('bg-zinc-800 font-mono text-[12px] leading-4', revealed ? 'invisible' : ink.secondary),
                    )}
                  >
                    {revealed ? (isPicked ? (isAnswer ? '✓' : '×') : '') : i + 1}
                  </span>
                  <span className={clsx('line-clamp-2 min-w-0 flex-1 text-[14px] leading-5', ink.base)}>
                    {choice.label}
                    {badge ? <span className="sr-only">{`, ${badge}`}</span> : null}
                  </span>
                  {badge ? (
                    <span
                      aria-hidden
                      className={clsx(
                        'absolute -top-2 right-2 px-1 text-[12px] font-medium leading-4',
                        surface.frameOpaque,
                        badge === 'answer' ? ink.result : ink.muted,
                      )}
                    >
                      {badge}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Controls bar: scrubber, then Restart, Back, Next, Play (+ speed
          from 768). Sticky to the viewport bottom below 768 (§3.4). */}
      <div
        data-viz-region="bar"
        className={clsx(
          'sticky bottom-0 z-10 -mx-4 flex flex-col border-t border-zinc-700/60 px-4 pb-2 pt-[7px] md:static md:mx-0 md:border-t-0 md:px-0 md:py-0 print:hidden',
          surface.frameOpaque,
          'md:bg-transparent',
          H_CLS,
          hidden && 'invisible',
        )}
        style={heights({ narrow: metrics.narrow.bar, wide: metrics.wide.bar }, { marginTop: FRAME.barGap })}
      >
        <Scrubber
          ref={sliderRef}
          index={s.index}
          total={total}
          events={log.steps.map((st) => st.event)}
          checkpoints={log.checkpoints.map((c, k) => ({ at: c.beforeStep - 0.5, status: s.status[k] }))}
          valueText={valueText}
          label={`${def.title}: step`}
          interactive={interactive}
          animate={animate}
          onSeek={(to) => dispatch({ type: 'seek', to }, true)}
          onFocus={() => setHint((h) => (h === 'never' ? 'show' : h))}
          onBlur={() => setHint((h) => (h === 'show' ? 'hide' : h))}
        />
        <div className="flex items-center" style={{ marginTop: TARGET_GAP_PX, gap: TARGET_GAP_PX }}>
          <DockButton
            icon
            aria-label="Restart"
            aria-keyshortcuts="Home"
            unavailable={!interactive || s.index === 0}
            onClick={() => dispatch({ type: 'restart' }, true)}
          >
            <RestartIcon />
          </DockButton>
          <DockButton
            aria-label="Back"
            aria-keyshortcuts="ArrowLeft"
            unavailable={!interactive || s.index === 0}
            onClick={() => dispatch({ type: 'back' })}
          >
            <BackIcon />
            <span>Back</span>
          </DockButton>
          {/* Next and "Skip, show me" share one slot; both stay mounted so
              focus can be handed over deliberately (§5.2). */}
          <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)] md:w-40 md:flex-none">
            <DockButton
              ref={nextRef}
              variant="primary"
              aria-label="Next"
              aria-keyshortcuts="ArrowRight"
              data-inactive={mode === 'ask' || undefined}
              unavailable={!interactive || s.index >= last || mode === 'ask'}
              onClick={() => dispatch({ type: 'next' })}
              className={clsx('col-start-1 row-start-1', mode === 'ask' && 'invisible')}
              data-viz-part="viz-next"
            >
              <span>Next</span>
              <NextIcon />
            </DockButton>
            <DockButton
              variant="quiet"
              tabIndex={mode === 'ask' ? 0 : -1}
              data-inactive={mode !== 'ask' || undefined}
              unavailable={mode !== 'ask'}
              onClick={() => dispatch({ type: 'skip' })}
              className={clsx('col-start-1 row-start-1 whitespace-nowrap px-2', mode !== 'ask' && 'invisible')}
              data-viz-part="viz-skip"
            >
              Skip, show me
            </DockButton>
          </div>
          <DockButton
            icon
            aria-label={s.playing ? 'Pause' : 'Play'}
            aria-keyshortcuts="Space K"
            unavailable={!interactive || (!s.playing && (s.index >= last || mode === 'ask'))}
            onClick={() => dispatch({ type: 'toggle' })}
            // Play cannot run at an open checkpoint; its slot goes to "Skip, show me".
            className={clsx(mode === 'ask' && 'hidden')}
          >
            {s.playing ? <PauseIcon /> : <PlayIcon />}
          </DockButton>
          {/* Speed lives with Play: a quiet toggle, from 768 only (§5.1). */}
          <DockButton
            variant="quiet"
            aria-label={`Speed ${s.speed}×, switch to ${s.speed === 1 ? 2 : 1}×`}
            unavailable={!interactive}
            onClick={() => dispatch({ type: 'speed', speed: (s.speed === 1 ? 2 : 1) as Speed })}
            className={clsx(
              'hidden w-11 justify-center px-0 font-mono text-[13px] font-medium tabular-nums text-zinc-300 no-underline hover:text-zinc-50 md:inline-flex',
              mode === 'ask' && 'md:hidden',
            )}
          >
            {s.speed}×
          </DockButton>
        </div>
      </div>

      {/* 5. Footer: steps as text and provenance. */}
      <footer className="relative" style={{ marginTop: FRAME.footerGap }}>
        <details data-viz-own-keys className="group">
          <summary
            data-viz-focus="text-alternative"
            className={clsx(
              'flex h-11 w-max cursor-pointer list-none items-center gap-2 rounded-[10px] pr-2 text-[14px] font-semibold leading-5 [&::-webkit-details-marker]:hidden',
              ink.base,
              focusRing,
            )}
          >
            <svg aria-hidden width="16" height="16" viewBox="0 0 16 16" className="shrink-0 group-open:rotate-90">
              <path
                d="m6 4 4 4-4 4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Steps as text
          </summary>
          <StepsAsText log={log} />
        </details>
        <p
          className={clsx(
            'm-0 md:absolute md:right-0 md:top-0 md:flex md:h-11 md:items-center',
            typeScale.index.cls,
            'font-sans font-normal',
            ink.muted,
          )}
        >
          {`Recorded from a real run in ${runtimeName(log.source.runtime)}`}
        </p>
      </footer>

      {/* Print: every step, with checkpoint answers (§3.5). */}
      <div className="hidden print:mt-4 print:block">
        <StepsAsText log={log} />
      </div>
    </section>
  )
}
