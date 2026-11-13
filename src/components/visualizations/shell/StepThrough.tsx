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
import { Feedback, captionCls, feedbackLeadCls, promptCls } from '../primitives/Caption'
import { ChoiceRow } from '../primitives/ChoiceRow'
import { cn } from '../primitives/cn'
import { Disclosure } from '../primitives/Disclosure'
import { Frame } from '../primitives/Frame'
import { Provenance } from '../primitives/Provenance'
import { SegmentedControl } from '../primitives/SegmentedControl'
import { TARGET_GAP_PX, ink, motion, motionRules, type as typeScale } from '../primitives/tokens-v3'
import type { Checkpoint, StepLog } from '../step-log/types'
import { CodePane, codeRows } from './CodePane'
import { CHOICE, FRAME, STEP_BAR, choiceColumn, choiceRowBeside, choiceRowWidth, definitionMetrics } from './footprint'
import { RECAP_NONE, allFeedback, allRecaps, feedbackText, recapText } from './feedback'
import {
  dockMode,
  initialState,
  answeredAt,
  openCheckpointAt,
  reduce,
  type Action,
  type MachineState,
  type PresetShape,
} from './machine'
import { motionBudget, transitionFor, vacating, type MotionGate } from './motion'
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
 * - R2: every reserved band (stage, dock) is sized to the preset on screen.
 * - R3: the step's name (sentence case) sits on its caption, the counter
 *   ("3 of 8") at the right of the name.
 * - R4: at a checkpoint Next waits as the outline variant (`aria-disabled`);
 *   "Skip" is a muted text button. A prediction judged at the end (R7) locks
 *   in and the run continues; its verdict lands in the finale's recap.
 * - R5: on the reveal the name and caption of the previous step stay until
 *   the engine's playback has landed, then the recap replaces them. Replay
 *   (the primary, same slot) ignores presses until the recap has landed, and
 *   its label arrives with the recap (R1M-11, R1M-12). A resize during the
 *   reveal lands it at once (R1M-17).
 * - R1M-16: the controls bar precedes the dock in the DOM (the dock is drawn
 *   above it with `order`), so Tab from the stepper reaches the question.
 */

/** The ms a reveal ends after its playback has landed: the caption's fade. */
const CAPTION_MS = motion.caption.full.type === 'tween' ? motion.caption.full.duration * 1000 : 0

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
type Nav = {
  /** A reveal landed at once by a resize (R1M-17): this render keeps the state and snaps. */
  landed?: boolean
  state: MachineState
  pace: Pace
  direction: 1 | -1
  allow: ReadonlySet<string>
  /** This render plays the visual's reveal (D21): Next or Play onto the last step. */
  reveal: boolean
  /** Glyphs that fade in place as a mover arrives where they were (R1M-13). */
  vacate: ReadonlySet<string>
  /** When the last navigation happened (`performance.now()`). */
  at: number
}

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
  const startPreset = Math.max(
    0,
    def.presets.findIndex((p) => p.id === (preset ?? def.defaultPreset)),
  )

  // State plus the motion decision for the render it produced. Two commands
  // inside the shared burst window render instantly (§4 rule 3, D13).
  const [nav, send] = useReducer(
    (prev: Nav, a: (Action | { type: 'land' }) & { forceInstant?: boolean; now: number }): Nav => {
      // Land a reveal that is still playing, in one frame (R1M-17): same
      // state, an instant render with a new epoch.
      if (a.type === 'land')
        return prev.reveal
          ? { ...prev, reveal: false, landed: true, pace: { ...prev.pace, instant: true, epoch: prev.pace.epoch + 1 } }
          : prev
      const state = reduce(shapes, prev.state, a)
      const from = prev.state
      // Play advances at once (D10), so it navigates like Next.
      const moved = state.index !== from.index || state.preset !== from.preset
      if (!NAV_ACTIONS.has(a.type) && !moved) return state === prev.state ? prev : { ...prev, state }
      const p = pace(prev.pace, a.now, Boolean(a.forceInstant))
      const direction = state.index < from.index ? -1 : 1
      const last = def.presets[state.preset].log.steps.length - 1
      // The one reveal (D21): a forward, paced step onto the last step. Never
      // on load, a jump, Back or a burst (those are instant or mirrored).
      const reveal =
        !p.instant && state.preset === from.preset && state.index === last && from.index === last - 1
      let allow = NOTHING
      let vacate = NOTHING
      if (!p.instant && state.preset === from.preset && Math.abs(state.index - from.index) === 1) {
        const steps = def.presets[state.preset].log.steps
        const { ids, region } = def.engine.introspect
        const was = steps[from.index].state
        const now = steps[state.index].state
        allow = motionBudget(ids(was), ids(now), steps[Math.max(from.index, state.index)].focus)
        if (region)
          vacate = vacating(
            ids(was),
            ids(now),
            allow,
            (id) => region(was, id),
            (id) => region(now, id),
          )
      }
      return { state, pace: p, direction, allow, vacate, reveal, at: a.now }
    },
    undefined,
    () => ({
      state: initialState(shapes, startPreset),
      pace: INITIAL_PACE,
      direction: 1 as const,
      allow: NOTHING,
      vacate: NOTHING,
      reveal: false,
      at: -Infinity,
    }),
  )
  const dispatch = useCallback(
    (a: Action | { type: 'land' }, forceInstant = false) => send({ ...a, forceInstant, now: performance.now() }),
    [],
  )
  const s = nav.state
  // Every reserved band is sized to the preset on screen (R2).
  const metrics = useMemo(() => definitionMetrics(def, s.preset), [def, s.preset])
  const layout = useMemo(
    () => def.engine.layout([def.presets[s.preset].log], def.presets.map((p) => p.log)),
    [def, s.preset],
  )

  const prefersReduced = useReducedMotion() ?? false
  const gate: MotionGate = {
    reduce: prefersReduced,
    instant: nav.pace.instant || !interactive,
    epoch: nav.pace.epoch,
    direction: nav.direction,
    allow: nav.allow,
    vacate: nav.vacate,
    reveal: nav.reveal && interactive,
  }
  const animate = !gate.instant && !gate.reduce

  const current = def.presets[s.preset]
  const log = current.log
  const step = log.steps[s.index]
  const previous = s.index > 0 ? log.steps[s.index - 1] : undefined
  const total = log.steps.length
  const last = total - 1
  // The server frame shows the same dock as the live Start (the question, if
  // Start asks one), with its controls hidden until the engine loads (R12).
  const mode = dockMode(shapes, s)
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

  // The end (D21): the primary becomes Replay in the same slot, and the
  // caption leads with a recap of this pass's predictions.
  const atEnd = interactive && s.index === last && mode !== 'ask'
  const recap =
    atEnd && mode === 'controls' && log.checkpoints.length
      ? (recapText(log.checkpoints, s.picked) ?? RECAP_NONE)
      : null
  // The recap replaces the caption once the stage's playback has landed (R5).
  const revealMs = gate.reveal && !gate.reduce ? (def.engine.revealMs?.(step.state) ?? 0) : 0

  // The reveal's two moments, per navigation: until `revealMs` the previous
  // name and caption hold (R5); until the recap has faded in, Replay ignores
  // presses (R1M-11). Derived at render, so the first reveal frame holds.
  const [heldUntil, setHeldUntil] = useState<{ hold: Nav | null; busy: Nav | null }>({ hold: null, busy: null })
  const holding = revealMs > 0 && heldUntil.hold !== nav
  const revealBusy = Boolean(gate.reveal) && heldUntil.busy !== nav
  useEffect(() => {
    if (!gate.reveal) return
    const t1 = window.setTimeout(() => setHeldUntil((h) => ({ ...h, hold: nav })), revealMs)
    const t2 = window.setTimeout(() => setHeldUntil((h) => ({ ...h, busy: nav })), revealMs + CAPTION_MS)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nav])
  const shown = holding && previous ? previous : step
  const shownIndex = holding && previous ? s.index - 1 : s.index

  const counter = `${shownIndex} of ${last}`
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

  // ---- a resize lands a reveal at once (D7, R1M-17) -------------------------
  const busyRef = useRef(false)
  busyRef.current = revealBusy
  useEffect(() => {
    const el = frameRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    let width = el.offsetWidth
    const ro = new ResizeObserver(() => {
      if (el.offsetWidth === width) return
      width = el.offsetWidth
      if (busyRef.current) dispatch({ type: 'land' })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [dispatch])

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
    if (recap) text = `${where} ${step.narration} ${recap} ${step.why}`
    if (mode === 'ask' && cp) text += ` Checkpoint: ${cp.prompt}`
    if (mode === 'reveal' && cp && cpIndex !== null) {
      const f = feedbackText(cp, s.picked[cpIndex])
      text = cp.verdict === 'end' ? `${f.lead} ${f.body}` : `${f.lead} ${f.body} ${where} ${step.narration}`
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
        // This preset's rows, soft-wrapped at the pane's columns (A4).
        wide: Math.min(layout.codeRows.wide, codeRows(log.code.lines, layout.codeCols ?? Infinity)),
      }}
      cols={layout.codeCols}
      animate={animate}
      trace={def.engine.codeTrace?.(log, s.index)}
      playTrace={gate.reveal && !gate.reduce}
    />
  ) : null
  const Stage = def.engine.Stage
  const hidden = !interactive
  const captionT = transitionFor('caption', gate)

  const checkpointIndex = cpIndex ?? -1
  const picked = checkpointIndex >= 0 ? s.picked[checkpointIndex] : null
  const lastTime = checkpointIndex >= 0 ? s.memory[`${s.preset}:${checkpointIndex}`] : undefined
  const feedback = mode === 'reveal' && cp ? feedbackText(cp, picked) : null
  const atCheckpoint = interactive && mode === 'ask'
  // A prediction judged at the end shows no verdict yet (R5, R7).
  const deferred = cp?.verdict === 'end'

  return (
    <Frame
      ref={frameRef}
      // A column, so the dock can be drawn above the controls bar while the
      // bar comes first in the DOM (R1M-16: Tab from the stepper reaches the question).
      className="flex flex-col"
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
        // A floor, not a fixed height: the title may wrap under very large
        // text (R9). It never changes between steps, so nothing shifts.
        className={cn(
          'flex flex-col gap-2 vz-wide:flex-row vz-wide:items-center vz-wide:justify-between vz-wide:gap-4',
          'min-h-[var(--vz-h-n)] vz-wide:min-h-[var(--vz-h-w)]',
        )}
        style={heights({
          narrow: metrics.narrow.header,
          wide: metrics.wide.header,
        })}
      >
        <p id={titleId} className={cn('m-0 min-w-0 text-pretty', typeScale.title.cls, ink.base)}>
          {def.title}
        </p>
        {/* One preset has no switcher, and no gap reserved for one (A5). */}
        {def.presets.length > 1 ? (
          // The switcher takes the row's remaining room and falls back to a
          // select when its segments do not fit there (A2).
          <div className={cn('min-w-0 vz-wide:flex-1 print:hidden', hidden && 'invisible')}>
            <SegmentedControl
              className="vz-wide:justify-end"
              label="Example"
              options={def.presets}
              value={s.preset}
              interactive={interactive}
              onChange={(i) => dispatch({ type: 'preset', preset: i }, true)}
            />
          </div>
        ) : null}
        {/* On paper the switcher is a line of text (R10). */}
        {def.presets.length > 1 ? (
          <p className={cn('m-0 hidden print:block', typeScale.status.cls, ink.muted)}>{`Example: ${current.label}`}</p>
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

      {/* 3. Step bar: the step's name, joined to its caption below (R3), and
          the counter. It holds the previous name while a reveal plays (R5). */}
      <div
        data-viz-region="stepbar"
        className="flex items-baseline justify-between gap-4"
        style={{ height: rem(STEP_BAR), marginTop: rem(FRAME.stageGap) }}
      >
        <span className={cn('min-w-0 truncate', typeScale.stepName.cls, ink.base)} data-viz-part="viz-event">
          {shown.event}
        </span>
        <span className={cn('shrink-0 print:hidden', typeScale.status.cls, ink.muted)} data-viz-part="viz-counter">
          {counter}
        </span>
      </div>

      {/* Narration: one polite status once input settles, outside the stage. */}
      <div role="status" className="sr-only" data-viz-part="viz-live">
        {live}
      </div>

      {/* Controls bar: scrubber, then Restart, Back, Next, Play. In flow at
          every width (D14) and never changing shape (D9): at a checkpoint
          Next waits as the outline variant and Play is unavailable. First in
          the DOM after the stage, drawn under the dock (`order`, R1M-16). */}
      <div
        data-viz-region="bar"
        // Sized by its content, which never changes between steps or modes,
        // so the row can wrap under large text without any shift (D9, D19).
        className={cn('order-2 flex flex-col print:hidden', hidden && 'invisible')}
        style={{ marginTop: rem(FRAME.barGap) }}
      >
        <Scrubber
          ref={sliderRef}
          index={s.index}
          total={total}
          events={log.steps.map((st) => st.event)}
          checkpoints={log.checkpoints.map((c, k) => ({
            at: answeredAt(c),
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
            // At a checkpoint Next waits as the outline variant (R4), not a
            // dimmed lime pill; if it had focus, focus moves to the first choice (§5.2).
            variant={atCheckpoint ? 'secondary' : 'primary'}
            tabIndex={-1}
            aria-label={atEnd && !holding ? 'Replay' : 'Next'}
            aria-keyshortcuts={atEnd ? 'Home' : 'ArrowRight'}
            aria-description={atCheckpoint ? 'Answer or skip to continue' : undefined}
            data-inactive={atCheckpoint || undefined}
            unavailable={!interactive || (s.index >= last && !atEnd)}
            // While the reveal plays, a press is never a Replay (R1M-11, R1M-12).
            waiting={atCheckpoint || revealBusy}
            onClick={() => {
              if (!atEnd) return dispatch({ type: 'next' })
              if (revealBusy || performance.now() - nav.at < BURST_WINDOW_MS) return
              dispatch({ type: 'restart' }, true)
            }}
            // Fills the row below 768; from 768 an 8 rem pill that may shrink
            // (at 200 % text the row is wider than the frame otherwise).
            className="flex-auto vz-wide:w-32 vz-wide:flex-initial"
            data-viz-part="viz-next"
            data-viz-end={atEnd || undefined}
          >
            {/* Same slot, same width (D9): only the label changes. Replay
                arrives with the recap, on the caption token (R1M-12). */}
            <m.span
              key={atEnd && !holding ? 'replay' : 'next'}
              className="inline-flex items-center gap-1"
              initial={atEnd && !holding && animate ? { opacity: 0 } : false}
              animate={{ opacity: 1 }}
              transition={captionT}
            >
              {/* Replay is a word only: Restart beside it already carries
                  the arrow, and the label must be no wider than "Next" plus
                  its arrow, or the row wraps at 320 (D9). */}
              {atEnd && !holding ? (
                <span>Replay</span>
              ) : (
                <>
                  <span>Next</span>
                  <NextIcon />
                </>
              )}
            </m.span>
          </Button>
          <Button
            size="icon"
            tabIndex={-1}
            aria-label={s.playing ? 'Pause' : 'Play'}
            aria-keyshortcuts="Space K"
            unavailable={!interactive || (!s.playing && (s.index >= last || mode === 'ask'))}
            onClick={() => dispatch({ type: 'toggle' })}
            data-viz-part="viz-play"
          >
            {s.playing ? <PauseIcon /> : <PlayIcon />}
          </Button>
        </div>
      </div>

      {/* 4. Dock: one slot shared by the caption, the checkpoint (prompt,
          choices, Skip) and the reveal (feedback over the marked choices). A
          ghost stack of every variant of this preset holds its height (D15, R2). */}
      <div
        data-viz-region="dock"
        className="relative order-1 grid print:hidden"
        style={{ marginTop: rem(FRAME.nameGap) }}
      >
        <DockGhosts log={log} />
        {mode === 'controls' ? (
          <m.p
            key={`${s.preset}:${shownIndex}:${nav.pace.epoch}`}
            data-viz-part="viz-caption"
            className={cn('col-start-1 row-start-1 self-start', captionCls)}
            // The old sentence goes at once and the new one fades in: two
            // sentences never share the cell (M15). On the reveal the
            // previous one stays until the recap replaces it (R5).
            initial={gate.instant || gate.reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={captionT}
            data-viz-reveal={gate.reveal && !holding ? 'recap' : undefined}
          >
            {recap && !holding ? (
              <>
                <span className={feedbackLeadCls} data-viz-part="viz-recap">
                  {recap}
                </span>{' '}
              </>
            ) : null}
            {shown.why}
          </m.p>
        ) : null}
        {cp ? (
          <CheckpointBlock
            cp={cp}
            className="col-start-1 row-start-1 self-start"
            answered={!!feedback}
            text={
              feedback ? (
                <Feedback data-viz-part="viz-feedback" lead={feedback.lead} body={feedback.body} />
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
                data-vz-choices
                className={cn(CHOICES_CLS, hidden && 'invisible')}
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
                      // The number slot becomes the result (D9, R4): ✓ on the
                      // answer, × on a wrong pick. A prediction judged at the
                      // end keeps its numbers: only the pick is marked (R5).
                      mark={revealed && !deferred ? (isAnswer ? 'right' : isPicked ? 'wrong' : null) : null}
                      tag={!revealed && lastTime === choice.id ? 'last time' : undefined}
                      tabIndex={atCheckpoint && i === choiceFocus ? 0 : -1}
                      onClick={() => atCheckpoint && dispatch({ type: 'answer', choice: choice.id })}
                      onKeyDown={(e) => {
                        if (atCheckpoint) onChoiceKey(e, i, cp.choices.length)
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
                className={cn(SKIP_CLS, !atCheckpoint && 'invisible')}
                data-viz-part="viz-skip"
              >
                <span className={SKIP_LABEL_CLS}>Skip</span>
              </Button>
            }
          />
        ) : null}
      </div>

      {/* 5. Footer: steps as text and provenance. */}
      <footer className="relative order-3" style={{ marginTop: rem(FRAME.footerGap) }}>
        <Disclosure className="print:hidden" data-viz-own-keys summary="Steps as text" summaryProps={{ 'data-viz-focus': 'text-alternative' }}>
          <StepsAsText log={log} />
        </Disclosure>
        <Provenance runtimes={[runtimeName(log.source.runtime)]} />
      </footer>

      {/* Print: every step, with checkpoint answers (§3.5). */}
      <div className="order-4 hidden print:mt-4 print:block">
        <StepsAsText log={log} />
      </div>
    </Frame>
  )
}

// ---------------------------------------------------------------------------
// Dock parts. The live checkpoint and its ghosts share one component, so the
// reserved height is the rendered height by construction.
// ---------------------------------------------------------------------------

/**
 * Two columns of 44 px choices; from 768, two columns beside the text, each
 * as wide as the checkpoint's longest label needs (at most 168 px). A
 * checkpoint with more than two short choices puts them in one row wherever
 * the row fits (`choiceRowCss`), so a four-way question does not reserve two
 * rows of dock on every step (R2).
 */
/**
 * Skip when stacked (F1 ruling 2): its 44 px target rises 16 px above the
 * prompt's 28 px line (into the step bar's empty right half, which holds no
 * target), so the row is no taller than its text and the choices stay 8 px
 * under the target. The label sits level with the prompt, and the focus
 * ring is drawn on the label, so it never crosses the counter above.
 */
const SKIP_CLS = 'group vz-narrow:-mt-4 vz-narrow:pt-4 vz-narrow:focus-visible:outline-none'
const SKIP_LABEL_CLS = cn(
  'rounded-md',
  'vz-narrow:group-focus-visible:outline vz-narrow:group-focus-visible:outline-2 vz-narrow:group-focus-visible:outline-offset-4 vz-narrow:group-focus-visible:outline-lime-500',
)

const CHOICES_CLS = 'grid shrink-0 grid-cols-2 [grid-area:choices] vz-wide:w-[var(--vz-choices-w)]'
const choicesStyle = { gap: rem(CHOICE.gap) }

/**
 * Container queries (in rem, so larger text switches sooner, D19) that lay a
 * checkpoint's choices in one row where it fits: under the prompt in the
 * narrow variant, beside it in the wide one. Server-final CSS, scoped to one
 * block (the live block and its ghost each carry their own).
 */
function choiceRowCss(scope: string, cp: Checkpoint): string {
  const n = cp.choices.length
  const col = choiceColumn(cp)
  const row = choiceRowWidth(cp)
  const sel = `[data-vz-cp="${scope}"] [data-vz-choices]`
  const two = `${sel}{--vz-choices-w:${rem(2 * col + CHOICE.gap)}}`
  if (n <= 2) return two
  const cols = `grid-template-columns:repeat(${n},minmax(0,1fr))`
  return (
    two +
    `@container vz (max-width:37.874rem) and (min-width:${rem(row)}){${sel}{${cols}}}` +
    `@container vz (min-width:${rem(choiceRowBeside(cp))}){${sel}{${cols};--vz-choices-w:${rem(row)}}}`
  )
}

/**
 * The checkpoint block (D9). In the narrow variant (phones, or large text):
 * the text with "Skip" at its right, the choices under both. In the wide
 * variant (the frame from 37.875rem, D19): text, choices, Skip in one row. The text
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
  answered = false,
}: {
  cp: Checkpoint
  text: ReactNode
  choices: ReactNode
  skip: ReactNode
  className?: string
  ghost?: boolean
  /** The text is the feedback (the reveal), not the prompt. */
  answered?: boolean
}) {
  // Ghosts use the live markup exactly (the feedback lead is semibold): a
  // lighter ghost can wrap one line shorter than the text it reserves for.
  const feedbacks = allFeedback(cp)
  const scope = useId().replace(/:/g, '')
  return (
    <div
      data-vz-cp={scope}
      data-viz-part={ghost ? undefined : 'viz-checkpoint'}
      className={cn(
        'grid min-w-0 items-end [grid-template-areas:"text_skip""choices_choices"] [grid-template-columns:minmax(0,1fr)_auto]',
        'vz-wide:items-center vz-wide:[grid-template-areas:"text_choices_skip"] vz-wide:[grid-template-columns:minmax(0,1fr)_auto_auto]',
        className,
      )}
      style={{ columnGap: rem(CHOICE.textGap), rowGap: rem(CHOICE.textGap) }}
    >
      {/* Raw, so the server does not entity-escape the selectors' quotes (the
          rule must hold in the server frame too). Generated CSS only. */}
      <style dangerouslySetInnerHTML={{ __html: choiceRowCss(scope, cp) }} />
      {/* The prompt beside Skip; the feedback (Skip is gone by then) takes
          the full row when stacked, beside the choices from 768. Each cell
          holds its own ghosts, so the row is the taller of the two (F1
          ruling 2: no reserved band beyond what a state needs). */}
      <div className="grid min-w-0 content-end [grid-area:text] vz-wide:pr-2">
        <p aria-hidden className={cn('invisible col-start-1 row-start-1', promptCls)}>
          {cp.prompt}
        </p>
        {answered ? null : <div className="col-start-1 row-start-1 self-end">{text}</div>}
      </div>
      <div className="grid min-w-0 content-end [grid-column:1/-1] [grid-row:1] vz-wide:pr-2 vz-wide:[grid-area:text]">
        {feedbacks.map((f, k) => (
          <Feedback key={k} aria-hidden className="invisible col-start-1 row-start-1" lead={f.lead} body={f.body} />
        ))}
        {answered ? <div className="col-start-1 row-start-1 self-end">{text}</div> : null}
      </div>
      {choices}
      <div className="[grid-area:skip]">{skip}</div>
    </div>
  )
}

/**
 * Every caption, prompt and feedback of the preset on screen, invisible in
 * the dock's grid cell: the cell is as tall as the tallest of them at this
 * width and text size (R2: per preset), and never changes while stepping or
 * answering.
 */
function DockGhosts<S>({ log }: { log: StepLog<S> }) {
  const ghosts = useMemo(() => {
    const captions = [...new Set(log.steps.map((st) => st.why))]
    // The end caption with every recap it can lead with (D21).
    const end = log.steps[log.steps.length - 1].why
    const recaps = allRecaps(log.checkpoints).map((r) => ({ r, end }))
    return { captions, checkpoints: log.checkpoints, recaps }
  }, [log])
  return (
    <div aria-hidden data-viz-part="dock-ghosts" className="invisible col-start-1 row-start-1 grid">
      {ghosts.captions.map((t) => (
        <p key={t} className={cn('col-start-1 row-start-1', captionCls)}>
          {t}
        </p>
      ))}
      {ghosts.recaps.map(({ r, end }) => (
        <Feedback key={`${r} ${end}`} className="col-start-1 row-start-1" lead={r} body={end} />
      ))}
      {ghosts.checkpoints.map((c, k) => (
        <CheckpointBlock
          key={k}
          ghost
          cp={c}
          className="col-start-1 row-start-1"
          text={null}
          choices={
            <div data-vz-choices className={CHOICES_CLS} style={choicesStyle}>
              {c.choices.map((ch) => (
                <div key={ch.id} className="h-11" />
              ))}
            </div>
          }
          skip={
            <Button variant="text" tabIndex={-1} unavailable className={SKIP_CLS}>
              <span className={SKIP_LABEL_CLS}>Skip</span>
            </Button>
          }
        />
      ))}
    </div>
  )
}
