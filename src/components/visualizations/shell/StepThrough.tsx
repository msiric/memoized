'use client'

import { m, useReducedMotion } from 'framer-motion'
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
  type ReactNode,
} from 'react'
import { BackIcon, Button, NextIcon, PauseIcon, PlayIcon, RestartIcon } from '../primitives/Button'
import { captionCls, promptCls } from '../primitives/Caption'
import { ChoiceRow } from '../primitives/ChoiceRow'
import { cn } from '../primitives/cn'
import { Disclosure } from '../primitives/Disclosure'
import { Frame } from '../primitives/Frame'
import { Provenance } from '../primitives/Provenance'
import { SegmentedControl } from '../primitives/SegmentedControl'
import { TARGET_GAP_PX, ink, motionRules, type as typeScale } from '../primitives/tokens-v3'
import type { Checkpoint } from '../step-log/types'
import { CodePane } from './CodePane'
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
} from './machine'
import { motionBudget, transitionFor, type MotionGate } from './motion'
import { BURST_WINDOW_MS, INITIAL_PACE, escapePauses, pace, type Pace } from './pace'
import { Scrubber } from './Scrubber'
import { StepsAsText, runtimeName } from './StepsAsText'
import type { StepThroughDefinition } from './types'
import { H_CLS, heights, rem } from './vars'

/**
 * StepThrough: the single shell for every step-through visual (spec §6.1).
 *
 * It owns the frame anatomy (§3.3), the stepper state and dock modes (§5),
 * narration (§5.3), footprint reservation and the motion gate (§4). An engine
 * only renders its stage for a state.
 *
 * `interactive={false}` renders the static Start frame for the server: the
 * controls keep their space but are hidden and `aria-disabled` (§3.5).
 *
 * Behavior (VIZ-H):
 * - D7: scrub, Home, End, Restart and preset switches render instantly, and
 *   so does a burst (two commands within the shared 250 ms window, D13).
 * - D8: the gate carries the direction, so Back plays Next mirrored.
 * - Spec §4 rule 1: per step at most two stage glyphs animate (`motionBudget`).
 * - D9: the control row never changes shape. At a checkpoint Next stays in
 *   place, `aria-disabled`; the choices and "Skip" appear in the dock.
 * - D15: the dock reserves the tallest of every caption, prompt and feedback
 *   of every preset as measured at the current width and text size (an
 *   invisible ghost stack in the same grid cell), so there is no shift across
 *   steps, presets and checkpoint modes, and no reserve beyond the real worst
 *   case at this width.
 * - Narration is announced once input settles (one burst window), not per press.
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

/**
 * State plus the motion decision for the render it produced. `pace.epoch`
 * counts instant renders: glyphs keyed by it remount at their end state, which
 * snaps any transition still in flight. `allow` is the step's motion budget.
 */
type Nav = { state: MachineState; pace: Pace; direction: 1 | -1; allow: ReadonlySet<string> }

const NOTHING: ReadonlySet<string> = new Set()

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
  // inside the shared burst window render instantly (§4 rule 3, D13).
  const [nav, send] = useReducer(
    (prev: Nav, a: Action & { forceInstant?: boolean; now: number }): Nav => {
      const state = reduce(shapes, prev.state, a)
      const from = prev.state
      // Play advances at once (D10), so it navigates like Next.
      const moved = state.index !== from.index || state.preset !== from.preset
      if (!NAV_ACTIONS.has(a.type) && !moved) return state === prev.state ? prev : { ...prev, state }
      const p = pace(prev.pace, a.now, Boolean(a.forceInstant))
      const direction = state.index < from.index ? -1 : 1
      let allow = NOTHING
      if (!p.instant && state.preset === from.preset && Math.abs(state.index - from.index) === 1) {
        const steps = def.presets[state.preset].log.steps
        const ids = def.engine.introspect.ids
        allow = motionBudget(
          ids(steps[from.index].state),
          ids(steps[state.index].state),
          steps[Math.max(from.index, state.index)].focus,
        )
      }
      return { state, pace: p, direction, allow }
    },
    undefined,
    () => ({ state: initialState(shapes, startPreset), pace: INITIAL_PACE, direction: 1 as const, allow: NOTHING }),
  )
  const dispatch = useCallback(
    (a: Action, forceInstant = false) => send({ ...a, forceInstant, now: performance.now() }),
    [],
  )
  const s = nav.state

  const prefersReduced = useReducedMotion() ?? false
  const gate: MotionGate = {
    reduce: prefersReduced,
    instant: nav.pace.instant || !interactive,
    epoch: nav.pace.epoch,
    direction: nav.direction,
    allow: nav.allow,
  }
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
    const id = window.setTimeout(() => dispatch({ type: 'tick' }), motionRules.playIntervalMs)
    return () => window.clearTimeout(id)
  }, [s.playing, s.index, dispatch])

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

  // ---- narration: once input settles, polite, never on load (§5.3, M21) ---
  const [live, setLive] = useState('')
  // The state last spoken (or loaded): nothing is announced on load, and a
  // burst that ends where it started says nothing. Safe under strict effects.
  const spoken = useRef(`${s.preset}:${s.index}:${mode}`)
  useEffect(() => {
    const key = `${s.preset}:${s.index}:${mode}`
    if (key === spoken.current) return
    const where = s.index === 0 ? 'Start.' : `Step ${s.index} of ${last}.`
    let text = `${where} ${step.narration} ${step.why}`
    if (mode === 'ask' && cp) text += ` Checkpoint: ${cp.prompt}`
    if (mode === 'reveal' && cp && cpIndex !== null) {
      const f = feedbackText(cp, s.picked[cpIndex])
      text = `${f.lead} ${f.body} ${where} ${step.narration}`
    }
    // One announcement for a burst: only the step the reader settles on.
    const id = window.setTimeout(() => {
      spoken.current = key
      setLive(text)
    }, BURST_WINDOW_MS)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.index, s.preset, mode])

  // ---- keyboard (§5.2), handled on the frame ------------------------------
  const onKeyDown = (e: ReactKeyboardEvent<HTMLElement>) => {
    if (!interactive || e.altKey || e.ctrlKey || e.metaKey) return
    const target = e.target as HTMLElement
    const ownKeys = target.closest('[data-viz-own-keys]')
    if (e.key === 'Escape') {
      escapePauses(e, s.playing, () => dispatch({ type: 'pause' }))
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
  const atCheckpoint = mode === 'ask'

  return (
    <Frame
      ref={frameRef}
      aria-labelledby={titleId}
      aria-roledescription="step-through"
      data-viz-frame={def.id}
      data-viz-preset={current.id}
      data-viz-step={s.index}
      data-viz-mode={mode}
      data-viz-interactive={interactive ? 'true' : 'false'}
      onKeyDown={onKeyDown}
    >
      {/* 1. Header: title, then the preset switcher (right from 768). */}
      <header
        className={cn('flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-4', H_CLS)}
        style={heights({
          narrow: metrics.narrow.header,
          wide: metrics.wide.header,
        })}
      >
        <p id={titleId} className={cn('m-0 truncate', typeScale.title.cls, ink.base)}>
          {def.title}
        </p>
        {/* One preset has no switcher, and no gap reserved for one (A5). */}
        {def.presets.length > 1 ? (
          <div className={cn('self-start md:self-auto', hidden && 'invisible')}>
            <SegmentedControl
              label="Example"
              options={def.presets}
              value={s.preset}
              interactive={interactive}
              onChange={(i) => dispatch({ type: 'preset', preset: i }, true)}
            />
          </div>
        ) : null}
      </header>

      {/* 2. Stage: fixed footprint, code pane inside the stage grid. */}
      <div
        data-viz-region="stage"
        className={cn('relative', H_CLS)}
        style={heights({ narrow: metrics.narrow.stage, wide: metrics.wide.stage }, { marginTop: rem(FRAME.headerGap) })}
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

      {/* 3. Step bar: event (what) left, counter right. Sans UI wording (D3). */}
      <div
        data-viz-region="stepbar"
        className={cn('flex items-center justify-between gap-4', typeScale.status.cls, ink.secondary)}
        style={{ height: rem(STEP_BAR), marginTop: rem(FRAME.stageGap) }}
      >
        <span className="min-w-0 truncate" data-viz-part="viz-event">
          {s.index === 0 ? '' : step.event}
        </span>
        <span className="shrink-0" data-viz-part="viz-counter">
          {counter}
        </span>
      </div>

      {/* Narration: one polite status once input settles, outside the stage. */}
      <div role="status" className="sr-only" data-viz-part="viz-live">
        {live}
      </div>

      {/* 4. Dock: one slot shared by the caption, the checkpoint (prompt,
          choices, Skip) and the reveal (feedback over the marked choices). A
          ghost stack of every variant of every preset holds its height (D15). */}
      <div data-viz-region="dock" className="relative grid print:hidden" style={{ marginTop: rem(FRAME.dockGap) }}>
        <DockGhosts def={def} />
        {mode === 'controls' ? (
          <m.p
            key={`${s.preset}:${s.index}:${nav.pace.epoch}`}
            data-viz-part="viz-caption"
            className={cn('col-start-1 row-start-1 self-start', captionCls)}
            // The old sentence goes at once and the new one fades in: two
            // sentences never share the cell (M15).
            initial={gate.instant || gate.reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={captionT}
          >
            {step.why}
          </m.p>
        ) : null}
        {cp ? (
          <CheckpointBlock
            cp={cp}
            className="col-start-1 row-start-1 self-start"
            text={
              feedback ? (
                <p className={captionCls} data-viz-part="viz-feedback">
                  <span className={cn('font-semibold', ink.base)}>{feedback.lead}</span> {feedback.body}
                </p>
              ) : (
                <p id={promptId} className={promptCls} data-viz-part="viz-prompt">
                  {cp.prompt}
                </p>
              )
            }
            choices={
              <div
                ref={choicesRef}
                role="radiogroup"
                aria-labelledby={promptId}
                data-viz-own-keys
                className={CHOICES_CLS}
                style={choicesStyle}
              >
                {cp.choices.map((choice, i) => {
                  const isPicked = picked === choice.id
                  const isAnswer = cp.answer === choice.id
                  const revealed = mode === 'reveal'
                  return (
                    <ChoiceRow
                      key={choice.id}
                      ref={(el) => {
                        choiceRefs.current[i] = el
                      }}
                      index={i}
                      label={choice.label}
                      state={revealed ? 'resolved' : 'ask'}
                      picked={revealed && isPicked}
                      // The number slot becomes the result (D9): ✓ on the answer, × on a wrong pick.
                      mark={revealed ? (isAnswer ? 'right' : isPicked ? 'wrong' : null) : null}
                      tag={!revealed && lastTime === choice.id ? 'last time' : undefined}
                      tabIndex={mode === 'ask' && i === choiceFocus ? 0 : -1}
                      onClick={() => mode === 'ask' && dispatch({ type: 'answer', choice: choice.id })}
                      onKeyDown={(e) => {
                        if (mode === 'ask') onChoiceKey(e, i, cp.choices.length)
                      }}
                      onFocus={() => setChoiceFocus(i)}
                      data-choice={choice.id}
                    />
                  )
                })}
              </div>
            }
            skip={
              <Button
                variant="text"
                tabIndex={atCheckpoint ? 0 : -1}
                aria-label="Skip, show me"
                data-inactive={!atCheckpoint || undefined}
                unavailable={!atCheckpoint}
                // Skip hides itself on the reveal, so it hands focus to the
                // stepper before the render (a hidden focused control would be
                // blurred to the page before the layout effect could move it).
                onClick={() => {
                  sliderRef.current?.focus({ preventScroll: true })
                  dispatch({ type: 'skip' })
                }}
                className={cn(!atCheckpoint && 'invisible')}
                data-viz-part="viz-skip"
              >
                Skip
              </Button>
            }
          />
        ) : null}
      </div>

      {/* Controls bar: scrubber, then Restart, Back, Next, Play. In flow at
          every width (D14) and never changing shape (D9): at a checkpoint
          Next and Play stay in place, unavailable. */}
      <div
        data-viz-region="bar"
        // Sized by its content, which never changes between steps or modes,
        // so the row can wrap under large text without any shift (D9, D19).
        className={cn('flex flex-col print:hidden', hidden && 'invisible')}
        style={{ marginTop: rem(FRAME.barGap) }}
      >
        <Scrubber
          ref={sliderRef}
          index={s.index}
          total={total}
          events={log.steps.map((st) => st.event)}
          checkpoints={log.checkpoints.map((c, k) => ({
            at: c.beforeStep,
            status: s.status[k],
          }))}
          valueText={valueText}
          label={`${def.title}: step`}
          interactive={interactive}
          animate={animate}
          onSeek={(to) => dispatch({ type: 'seek', to }, true)}
        />
        {/* One row at every width at the default text size. At 150 % and
            200 % text on a phone, Next and Play wrap to a second row rather
            than overflow; the order and the targets never change. */}
        <div className="flex flex-wrap items-center" style={{ marginTop: rem(TARGET_GAP_PX), gap: rem(TARGET_GAP_PX) }}>
          <Button
            size="icon"
            tabIndex={-1}
            aria-label="Restart"
            aria-keyshortcuts="Home"
            unavailable={!interactive || s.index === 0}
            onClick={() => dispatch({ type: 'restart' }, true)}
          >
            <RestartIcon />
          </Button>
          <Button
            tabIndex={-1}
            aria-label="Back"
            aria-keyshortcuts="ArrowLeft"
            unavailable={!interactive || s.index === 0}
            onClick={() => dispatch({ type: 'back' })}
          >
            <BackIcon />
            <span>Back</span>
          </Button>
          <Button
            ref={nextRef}
            variant="primary"
            tabIndex={-1}
            aria-label="Next"
            aria-keyshortcuts="ArrowRight"
            // At a checkpoint Next stays in place, unavailable; if it had
            // focus, focus moves to the first choice (§5.2).
            data-inactive={atCheckpoint || undefined}
            unavailable={!interactive || s.index >= last || atCheckpoint}
            onClick={() => dispatch({ type: 'next' })}
            // Fills the row below 768; from 768 an 8 rem pill that may shrink
            // (at 200 % text the row is wider than the frame otherwise).
            className="flex-auto md:w-32 md:flex-initial"
            data-viz-part="viz-next"
          >
            <span>Next</span>
            <NextIcon />
          </Button>
          <Button
            size="icon"
            tabIndex={-1}
            aria-label={s.playing ? 'Pause' : 'Play'}
            aria-keyshortcuts="Space K"
            unavailable={!interactive || (!s.playing && (s.index >= last || atCheckpoint))}
            onClick={() => dispatch({ type: 'toggle' })}
            data-viz-part="viz-play"
          >
            {s.playing ? <PauseIcon /> : <PlayIcon />}
          </Button>
        </div>
      </div>

      {/* 5. Footer: steps as text and provenance. */}
      <footer className="relative" style={{ marginTop: rem(FRAME.footerGap) }}>
        <Disclosure data-viz-own-keys summary="Steps as text" summaryProps={{ 'data-viz-focus': 'text-alternative' }}>
          <StepsAsText log={log} />
        </Disclosure>
        <Provenance runtimes={[runtimeName(log.source.runtime)]} />
      </footer>

      {/* Print: every step, with checkpoint answers (§3.5). */}
      <div className="hidden print:mt-4 print:block">
        <StepsAsText log={log} />
      </div>
    </Frame>
  )
}

// ---------------------------------------------------------------------------
// Dock parts. The live checkpoint and its ghosts share one component, so the
// reserved height is the rendered height by construction.
// ---------------------------------------------------------------------------

/** Two columns of 44 px choices; from 768, two 168 px columns beside the text. */
const CHOICES_CLS = 'grid shrink-0 grid-cols-2 [grid-area:choices] md:w-[var(--vz-choices-w)]'
const choicesStyle = {
  gap: rem(CHOICE.gap),
  ['--vz-choices-w' as string]: rem(2 * CHOICE.wideWidth + CHOICE.gap),
}

/**
 * The checkpoint block (D9). Below 768: the text with "Skip" at its right,
 * the choices under both. From 768: text, choices, Skip in one row. The text
 * cell holds the prompt and every feedback of this checkpoint (invisible but
 * one), so the choices never move between asking and the reveal; the text
 * sits on the choices. DOM order is text, choices, Skip, so focus reaches the
 * choices before Skip.
 */
function CheckpointBlock({
  cp,
  text,
  choices,
  skip,
  className,
  ghost = false,
}: {
  cp: Checkpoint
  text: ReactNode
  choices: ReactNode
  skip: ReactNode
  className?: string
  ghost?: boolean
}) {
  // Ghosts use the live markup exactly (the feedback lead is semibold): a
  // lighter ghost can wrap one line shorter than the text it reserves for.
  const feedbacks = [null, ...cp.choices.map((c) => c.id)].map((p) => feedbackText(cp, p))
  return (
    <div
      data-viz-part={ghost ? undefined : 'viz-checkpoint'}
      className={cn(
        'grid min-w-0 items-end [grid-template-areas:"text_skip""choices_choices"] [grid-template-columns:minmax(0,1fr)_auto]',
        'md:items-center md:[grid-template-areas:"text_choices_skip"] md:[grid-template-columns:minmax(0,1fr)_auto_auto]',
        className,
      )}
      style={{ columnGap: rem(CHOICE.textGap), rowGap: rem(CHOICE.textGap) }}
    >
      {/* Below 768 the text's last line sits level with Skip's label (8 px under it, 44 px target). */}
      <div className="grid min-w-0 content-end [grid-area:text] max-md:pb-2 md:pr-2">
        <p aria-hidden className={cn('invisible col-start-1 row-start-1', promptCls)}>
          {cp.prompt}
        </p>
        {feedbacks.map((f, k) => (
          <p key={k} aria-hidden className={cn('invisible col-start-1 row-start-1', captionCls)}>
            <span className={cn('font-semibold', ink.base)}>{f.lead}</span> {f.body}
          </p>
        ))}
        <div className="col-start-1 row-start-1 self-end">{text}</div>
      </div>
      {choices}
      <div className="[grid-area:skip]">{skip}</div>
    </div>
  )
}

/**
 * Every caption, prompt and feedback of every preset, invisible in the dock's
 * grid cell: the cell is as tall as the tallest of them at this width and
 * text size, and never changes while stepping, switching presets or answering.
 */
function DockGhosts<S>({ def }: { def: StepThroughDefinition<S> }) {
  const ghosts = useMemo(() => {
    const captions = [...new Set(def.presets.flatMap((p) => p.log.steps.map((st) => st.why)))]
    const checkpoints = def.presets.flatMap((p) => p.log.checkpoints)
    return { captions, checkpoints }
  }, [def])
  return (
    <div aria-hidden data-viz-part="dock-ghosts" className="invisible col-start-1 row-start-1 grid">
      {ghosts.captions.map((t) => (
        <p key={t} className={cn('col-start-1 row-start-1', captionCls)}>
          {t}
        </p>
      ))}
      {ghosts.checkpoints.map((c, k) => (
        <CheckpointBlock
          key={k}
          ghost
          cp={c}
          className="col-start-1 row-start-1"
          text={null}
          choices={
            <div className={CHOICES_CLS} style={choicesStyle}>
              {c.choices.map((ch) => (
                <div key={ch.id} className="h-11" />
              ))}
            </div>
          }
          skip={
            <Button variant="text" tabIndex={-1} unavailable>
              Skip
            </Button>
          }
        />
      ))}
    </div>
  )
}
