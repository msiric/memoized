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
} from 'react'
import { BackIcon, Button, NextIcon, PauseIcon, PlayIcon, RestartIcon } from '../primitives/Button'
import { Feedback, captionCls, feedbackLeadCls } from '../primitives/Caption'
import { CheckpointBlock, PromptBlock, SkipButton } from '../primitives/Checkpoint'
import { ChoiceRow } from '../primitives/ChoiceRow'
import { cn } from '../primitives/cn'
import { Disclosure } from '../primitives/Disclosure'
import { Frame } from '../primitives/Frame'
import { Provenance } from '../primitives/Provenance'
import { SegmentedControl } from '../primitives/SegmentedControl'
import { STEP_BEATS, TARGET_GAP_PX, ink, motion, motionRules, type StepBeats, type as typeScale } from '../primitives/tokens-v3'
import type { Checkpoint, StepLog } from '../step-log/types'
import { CodePane, codeRows } from './CodePane'
import { FRAME, NUDGE_TEXT, STEP_BAR, definitionMetrics, lastTimeText, longestLastTime } from './footprint'
import { RECAP_NONE, allFeedback, allRecaps, feedbackText, recapText } from './feedback'
import {
  dockMode,
  initialState,
  openCheckpointAt,
  reduce,
  type Action,
  type DockMode,
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
 * - H3 R2 Q1: a paced step moves in three beats (`STEP_BEATS`): the code
 *   line, then the moving glyph, then the console line and the caption (the
 *   name and caption of the previous step hold until then). Back plays them
 *   in reverse. A checkpoint's verdict and marks land with the third beat
 *   (Q4), and the narration speaks when its text appears (R2M-12).
 * - Q2: no dead controls. While a question is open Next looks unavailable;
 *   a press moves focus to the first choice and the note line says "Pick an
 *   answer, or Skip." A press during the finale lands it at once.
 * - Q11: Restart, Back, Next and Play are Tab stops; the DOM follows the
 *   visual order (dock, then the controls bar).
 * - Q13: autoplay dwells with the length of the step's text.
 * - Q14: at the finale only Replay is offered (Restart and Play keep their
 *   place, hidden).
 */

/** The third beat's fade (Q1): the caption, the console line and a verdict, 160 ms. */
const LAND_MS = motion.land.full.type === 'tween' ? motion.land.full.duration * 1000 : 0

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
  /** A reveal landed at once by a resize or a press (R1M-17, Q2): this render keeps the state and snaps. */
  landed?: boolean
  state: MachineState
  pace: Pace
  direction: 1 | -1
  allow: ReadonlySet<string>
  /** This render plays the visual's reveal (D21): Next or Play onto the last step. */
  reveal: boolean
  /** Glyphs that fade in place as a mover arrives where they were (R1M-13). */
  vacate: ReadonlySet<string>
  /** The step's beats (Q1): forward, mirrored for Back, none for an instant render or no step. */
  beats: StepBeats
  /** What the dock showed before this navigation: it holds until the third beat (Q1). */
  fromDock?: { mode: DockMode; cp: number | null }
  /** When the last navigation happened (`performance.now()`). */
  at: number
}

const NOTHING: ReadonlySet<string> = new Set()

/** Q13: how long autoplay dwells on a step: 1.6 s plus 25 ms per character of its text, at most 4 s. */
export function dwellMs(text: string): number {
  return Math.min(motionRules.playMaxMs, motionRules.playIntervalMs + motionRules.playPerCharMs * [...text].length)
}

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
      // Land a reveal that is still playing, in one frame (R1M-17, Q2): same
      // state, an instant render with a new epoch.
      if (a.type === 'land')
        return prev.reveal
          ? {
              ...prev,
              reveal: false,
              landed: true,
              beats: STEP_BEATS.none,
              pace: { ...prev.pace, instant: true, epoch: prev.pace.epoch + 1 },
            }
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
      let beats = STEP_BEATS.none
      if (!p.instant && state.preset === from.preset && Math.abs(state.index - from.index) === 1) {
        const steps = def.presets[state.preset].log.steps
        const { ids, region } = def.engine.introspect
        const was = steps[from.index].state
        const now = steps[state.index].state
        allow = motionBudget(ids(was), ids(now), steps[Math.max(from.index, state.index)].focus)
        beats = direction === 1 ? STEP_BEATS.forward : STEP_BEATS.back
        if (region)
          vacate = vacating(
            ids(was),
            ids(now),
            allow,
            (id) => region(was, id),
            (id) => region(now, id),
          )
      }
      const fm = dockMode(shapes, from)
      const fromDock = { mode: fm, cp: fm === 'ask' ? openCheckpointAt(shapes, from) : fm === 'reveal' ? from.reveal : null }
      return { state, pace: p, direction, allow, vacate, reveal, beats, fromDock, at: a.now }
    },
    undefined,
    () => ({
      state: initialState(shapes, startPreset),
      pace: INITIAL_PACE,
      direction: 1 as const,
      allow: NOTHING,
      vacate: NOTHING,
      reveal: false,
      beats: STEP_BEATS.none,
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
  const instant = nav.pace.instant || !interactive
  // Beats only under full motion (reduced motion crossfades in place, Q1).
  const beats = instant || prefersReduced ? STEP_BEATS.none : nav.beats
  const gate: MotionGate = {
    reduce: prefersReduced,
    instant,
    epoch: nav.pace.epoch,
    direction: nav.direction,
    allow: nav.allow,
    vacate: nav.vacate,
    reveal: nav.reveal && interactive,
    beats,
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
  // What holds before the third beat (Q1): the previous step's name and
  // caption, or a checkpoint's prompt over its unmarked choices (Q4), until
  // the moving glyph has landed; on the reveal, until the playback has.
  const holdMs = gate.reveal ? revealMs : nav.direction === 1 ? beats.land : 0

  // Per navigation: until `holdMs` the previous text holds; until it has
  // faded in, a press on the primary lands the reveal (R1M-11, Q2). Derived
  // at render, so the first frame of a step already holds.
  const [heldUntil, setHeldUntil] = useState<{ hold: Nav | null; busy: Nav | null }>({ hold: null, busy: null })
  const holding = holdMs > 0 && heldUntil.hold !== nav
  const revealBusy = Boolean(gate.reveal) && heldUntil.busy !== nav
  useEffect(() => {
    if (!holdMs && !gate.reveal) return
    const t1 = window.setTimeout(() => setHeldUntil((h) => ({ ...h, hold: nav })), holdMs)
    const t2 = gate.reveal
      ? window.setTimeout(() => setHeldUntil((h) => ({ ...h, busy: nav })), holdMs + LAND_MS)
      : undefined
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nav])
  const shown = holding && previous ? previous : step
  const shownIndex = holding && previous ? s.index - 1 : s.index
  // The text that lands with the third beat fades in (Q1, Q4); held or instant text does not.
  const landing = animate && holdMs > 0

  // The counter is a position: it agrees with the thumb at once (R2M-07).
  const counter = `${s.index} of ${last}`
  const valueText = s.index === 0 ? 'Start' : `Step ${s.index} of ${last}`

  // ---- refs and focus management (§5.2) -----------------------------------
  const frameRef = useRef<HTMLElement>(null)
  const sliderRef = useRef<HTMLDivElement>(null)
  const choicesRef = useRef<HTMLDivElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)
  const choiceRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [choiceFocus, setChoiceFocus] = useState(0)
  // Q2: a press on Next while the question is open says what to do.
  const [nudged, setNudged] = useState<string | null>(null)
  const nudgeKey = `${s.preset}:${s.index}:${mode}`

  useIsoLayoutEffect(() => {
    const active = typeof document === 'undefined' ? null : (document.activeElement as HTMLElement | null)
    if (!active || !frameRef.current?.contains(active)) return
    // Focus moves on its own only when the focused control is replaced
    // (Next turning into the choices, a committed answer, Skip, Back out of a
    // checkpoint) or can no longer act (Restart at Start, R2M-13). It never
    // leaves the frame, and never rests on an unavailable control.
    const replaced = Boolean(active.closest('[data-inactive]'))
    const dead = active.getAttribute('aria-disabled') === 'true' || getComputedStyle(active).visibility === 'hidden'
    if (mode === 'ask' && replaced) {
      setChoiceFocus(0)
      choiceRefs.current[0]?.focus()
    } else if (mode === 'reveal' && (choicesRef.current?.contains(active) || replaced)) {
      sliderRef.current?.focus()
    } else if (replaced || dead) {
      sliderRef.current?.focus()
    }
  }, [mode, s.index, holding])

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

  // ---- play cadence and stops (§4 rule 5, Q13) ------------------------------
  useEffect(() => {
    if (!s.playing) return
    const id = window.setTimeout(() => dispatch({ type: 'tick' }), dwellMs(`${step.event} ${step.why}`))
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // ---- narration: once input settles and its text shows, polite, never on load (§5.3, R2M-12)
  const [live, setLive] = useState('')
  // The state last spoken (or loaded): nothing is announced on load, and a
  // burst that ends where it started says nothing. Safe under strict effects.
  const spoken = useRef(`${s.preset}:${s.index}:${mode}`)
  useEffect(() => {
    const key = `${s.preset}:${s.index}:${mode}`
    if (key === spoken.current) return
    const where = s.index === 0 ? 'Start.' : `Step ${s.index} of ${last}.`
    let text = `${where} ${step.narration} ${step.why}`
    if (recap) text = `${where} ${step.narration} ${[recap.lead, recap.body].filter(Boolean).join(' ')} ${step.why}`
    if (mode === 'ask' && cp) text += ` Checkpoint: ${cp.prompt}`
    if (mode === 'reveal' && cp && cpIndex !== null) {
      const f = feedbackText(cp, s.picked[cpIndex])
      text = cp.verdict === 'end' ? `${f.lead} ${f.body}` : `${f.lead} ${f.body} ${where} ${step.narration}`
    }
    // One announcement for a burst, spoken when its text appears (the third
    // beat, or the recap): only the step the reader settles on.
    const id = window.setTimeout(
      () => {
        spoken.current = key
        setLive(text)
      },
      Math.max(BURST_WINDOW_MS, holdMs),
    )
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
    // Buttons keep their own Enter and Space (Q11: they are Tab stops now).
    if (target.tagName === 'BUTTON' && (e.key === ' ' || e.key === 'Enter')) return
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
      delayMs={beats.line}
      previousLine={previous?.line}
      trace={def.engine.codeTrace?.(log, s.index)}
      playTrace={gate.reveal && !gate.reduce}
    />
  ) : null
  const Stage = def.engine.Stage
  const hidden = !interactive
  // The caption lands on the third beat (Q1): from 0.3, never an empty cell (R2M-09).
  const captionT = transitionFor('land', gate)

  // Until the third beat the dock keeps what it showed: a verdict stays up
  // while the next step's glyph moves, then the caption replaces it (Q1).
  const heldDock = holding && mode === 'controls' && nav.fromDock?.mode === 'reveal' ? nav.fromDock : null
  const dMode: DockMode = heldDock ? 'reveal' : mode
  const dIndex = heldDock ? heldDock.cp : cpIndex
  const dcp = dIndex !== null && dIndex >= 0 ? log.checkpoints[dIndex] : null
  const checkpointIndex = dIndex ?? -1
  const picked = checkpointIndex >= 0 ? s.picked[checkpointIndex] : null
  const lastTime = checkpointIndex >= 0 ? s.memory[`${s.preset}:${checkpointIndex}`] : undefined
  // The earlier answer by its value ("Last time: micro 2"), short enough to share the prompt's line.
  const lastChoice = dcp && lastTime ? dcp.choices.find((c) => c.id === lastTime) : undefined
  const lastLabel = lastChoice ? (lastChoice.value ?? lastChoice.label) : undefined
  const verdictLanded = heldDock !== null || (mode === 'reveal' && !holding)
  const feedback = verdictLanded && dcp ? feedbackText(dcp, picked) : null
  const atCheckpoint = interactive && mode === 'ask'
  // A prediction judged at the end shows no verdict yet (R5, R7).
  const deferred = dcp?.verdict === 'end'
  const note = nudged === nudgeKey ? NUDGE_TEXT : lastLabel && mode === 'ask' ? lastTimeText(lastLabel) : null
  // Q14: at the finale only Replay is offered.
  const replay = atEnd && !holding

  const dock = (
    <div data-viz-region="dock" className="relative grid print:hidden" style={{ marginTop: rem(FRAME.nameGap) }}>
      <DockGhosts log={log} />
      {dMode === 'controls' ? (
        <m.p
          key={`${s.preset}:${shownIndex}:${nav.pace.epoch}`}
          data-viz-part="viz-caption"
          className={cn('col-start-1 row-start-1 self-start', captionCls)}
          // The old sentence goes at once and the new one fades in from 0.3:
          // two sentences never share the cell (M15) and it never reads empty
          // (R2M-09). On a step it lands with the third beat; on the reveal
          // the previous one stays until the recap replaces it (R5).
          initial={gate.instant || gate.reduce ? false : { opacity: 0.3 }}
          animate={{ opacity: 1 }}
          transition={captionT}
          data-viz-reveal={gate.reveal && !holding ? 'recap' : undefined}
        >
          {recap && !holding ? (
            <>
              <span data-viz-part="viz-recap">
                {recap.lead ? <span className={feedbackLeadCls}>{recap.lead}</span> : null}
                {recap.lead && recap.body ? ' ' : null}
                {recap.body}
              </span>{' '}
            </>
          ) : null}
          {shown.why}
        </m.p>
      ) : null}
      {dcp ? (
        <CheckpointBlock
          className="col-start-1 row-start-1 self-start"
          labels={dcp.choices.map((c) => c.label)}
          text={
            feedback ? (
              <Feedback
                data-viz-part="viz-feedback"
                className={cn(landing && !heldDock && 'vz-land-in')}
                lead={feedback.lead}
                body={feedback.body}
              />
            ) : (
              <PromptBlock
                id={promptId}
                prompt={dcp.prompt}
                note={note}
                noteId={`${promptId}-note`}
                noteReserve={longestLastTime(dcp)}
              />
            )
          }
          textGhosts={<CheckpointTextGhosts cp={dcp} />}
          choicesProps={{
            ref: choicesRef,
            role: 'radiogroup',
            'aria-labelledby': promptId,
            'aria-describedby': note && dMode === 'ask' ? `${promptId}-note` : undefined,
            'data-viz-own-keys': true,
            className: cn(hidden && 'invisible'),
          }}
          choices={dcp.choices.map((choice, i) => {
            const isPicked = picked === choice.id
            const isAnswer = dcp.answer === choice.id
            const revealed = dMode === 'reveal'
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
                // The verdict lands with the third beat (Q4): ✓ on the answer,
                // × on a wrong pick. A prediction judged at the end keeps its
                // numbers: only the pick is selected (R5, Q3).
                mark={verdictLanded && !deferred ? (isAnswer ? 'right' : isPicked ? 'wrong' : null) : null}
                fade={landing && !heldDock}
                tabIndex={atCheckpoint && i === choiceFocus ? 0 : -1}
                onClick={() => atCheckpoint && dispatch({ type: 'answer', choice: choice.id })}
                onKeyDown={(e) => {
                  if (atCheckpoint) onChoiceKey(e, i, dcp.choices.length)
                }}
                onFocus={() => setChoiceFocus(i)}
                data-choice={choice.id}
              />
            )
          })}
          skip={
            <SkipButton
              tabIndex={atCheckpoint ? 0 : -1}
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
            />
          }
        />
      ) : null}
    </div>
  )

  return (
    <Frame
      ref={frameRef}
      className="flex flex-col"
      aria-labelledby={titleId}
      aria-roledescription="step-through"
      data-viz-frame={def.id}
      data-viz-preset={current.id}
      data-viz-step={s.index}
      data-viz-last={last}
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
        // Paper grows with the code pane (it prints every line, print:!h-auto),
        // so the regions under it are never pushed out of the stage.
        className={cn('relative print:!h-auto', H_CLS)}
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
          the counter. The name holds with the caption until the third beat (Q1, R5). */}
      <div
        data-viz-region="stepbar"
        className="flex items-baseline justify-between gap-4"
        style={{ height: rem(STEP_BAR), marginTop: rem(FRAME.stageGap) }}
      >
        <span className="flex min-w-0 items-baseline gap-2">
          <span className={cn('min-w-0 shrink-0 truncate', typeScale.stepName.cls, ink.base)} data-viz-part="viz-event">
            {shown.event}
          </span>
          {/* A step the host runs has no line of the reader's code: said here,
              beside its name, not in a band reserved under the code (Q15). */}
          {shown.line === 'host' ? (
            <span className={cn('min-w-0 truncate', typeScale.status.cls, ink.muted)} data-viz-part="viz-host-note">
              not a line of your code
            </span>
          ) : null}
        </span>
        <span className={cn('shrink-0 print:hidden', typeScale.status.cls, ink.muted)} data-viz-part="viz-counter">
          {counter}
        </span>
      </div>

      {/* Narration: one polite status once input settles, outside the stage. */}
      <div role="status" className="sr-only" data-viz-part="viz-live">
        {live}
      </div>

      {/* 4. Dock: one slot shared by the caption, the checkpoint (prompt,
          choices, Skip) and the reveal (feedback over the marked choices). A
          ghost stack of every variant of this preset holds its height (D15, R2).
          Before the controls in the DOM: Tab follows what the eye reads (Q11). */}
      {dock}

      {/* 5. Controls bar: scrubber, then Restart, Back, Next, Play, each a Tab
          stop (Q11). In flow at every width (D14) and never changing shape (D9). */}
      <div
        data-viz-region="bar"
        // Sized by its content, which never changes between steps or modes,
        // so the row can wrap under large text without any shift (D9, D19).
        className={cn('flex flex-col print:hidden', 'mt-[var(--vz-g-n)] vz-wide:mt-[var(--vz-g-w)]', hidden && 'invisible')}
        style={{ ['--vz-g-n' as string]: rem(FRAME.barGapNarrow), ['--vz-g-w' as string]: rem(FRAME.barGap), gap: rem(TARGET_GAP_PX) }}
      >
        <Scrubber
          ref={sliderRef}
          index={s.index}
          total={total}
          events={log.steps.map((st) => st.event)}
          checkpoints={log.checkpoints.map((c, k) => ({
            at: c.beforeStep - 1,
            status: s.status[k],
          }))}
          valueText={valueText}
          label={`${def.title}: step`}
          interactive={interactive}
          animate={animate}
          onSeek={(to) => dispatch({ type: 'seek', to }, true)}
        />
        {/* One row at every width at the default text size. Under very large
            text Back is an icon, and Next and Play wrap to a second row rather
            than overflow; the order and the targets never change. On a phone
            the row sits above the scrubber, right under the caption, so Next
            stays on screen with the code line and the stage (Q15). */}
        <div className="flex flex-wrap items-center vz-narrow:order-first" style={{ gap: rem(TARGET_GAP_PX) }}>
          <Button
            size="icon"
            aria-label="Restart"
            aria-keyshortcuts="Home"
            unavailable={!interactive || s.index === 0}
            onClick={() => dispatch({ type: 'restart' }, true)}
            className={cn(replay && 'invisible')}
          >
            <RestartIcon />
          </Button>
          <Button
            aria-label="Back"
            aria-keyshortcuts="ArrowLeft"
            unavailable={!interactive || s.index === 0}
            onClick={() => dispatch({ type: 'back' })}
            className="vz-tight:w-11 vz-tight:px-0"
          >
            <BackIcon />
            <span className="vz-tight:sr-only">Back</span>
          </Button>
          <Button
            ref={nextRef}
            // The platform `primary` (Q12). While a question is open it can
            // only point at the answers: drawn unavailable, a press moves focus
            // to the first choice and says why (Q2).
            variant={atCheckpoint ? 'secondary' : 'primary'}
            aria-label={replay ? 'Replay' : 'Next'}
            aria-keyshortcuts={atEnd ? 'Home' : 'ArrowRight'}
            aria-description={atCheckpoint ? 'Answer or skip to continue' : undefined}
            data-inactive={atCheckpoint || undefined}
            unavailable={!interactive || atCheckpoint || (s.index >= last && !atEnd)}
            redirects={atCheckpoint}
            onClick={() => {
              if (atCheckpoint) {
                setNudged(nudgeKey)
                setChoiceFocus(0)
                choiceRefs.current[0]?.focus()
                return
              }
              if (!atEnd) return dispatch({ type: 'next' })
              // A press during the finale lands it at once: never a dead press (Q2).
              if (revealBusy) return dispatch({ type: 'land' })
              if (performance.now() - nav.at < BURST_WINDOW_MS) return
              dispatch({ type: 'restart' }, true)
            }}
            // Fills the row below 768; from 768 an 8 rem pill that may shrink
            // (at 200 % text the row is wider than the frame otherwise).
            className="flex-auto vz-wide:w-32 vz-wide:flex-initial"
            data-viz-part="viz-next"
            data-viz-end={atEnd || undefined}
          >
            {/* Same slot, same width (D9): only the label changes. Replay
                arrives with the recap from 0.4, so the label slot is never
                empty (R1M-12, R2M-09). */}
            <m.span
              key={replay ? 'replay' : 'next'}
              className="inline-flex items-center gap-1"
              initial={replay && animate ? { opacity: 0.4 } : false}
              animate={{ opacity: 1 }}
              transition={captionT}
            >
              {replay ? (
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
            aria-label={s.playing ? 'Pause' : 'Play'}
            aria-keyshortcuts="Space K"
            unavailable={!interactive || (!s.playing && (s.index >= last || mode === 'ask'))}
            onClick={() => dispatch({ type: 'toggle' })}
            className={cn(replay && 'invisible')}
            data-viz-part="viz-play"
          >
            {s.playing ? <PauseIcon /> : <PlayIcon />}
          </Button>
        </div>
      </div>

      {/* 6. Footer: steps as text and provenance. */}
      <footer className="relative" style={{ marginTop: rem(FRAME.footerGap) }}>
        <Disclosure className="print:hidden" data-viz-own-keys summary="Steps as text" summaryProps={{ 'data-viz-focus': 'text-alternative' }}>
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

/** The text cell's ghosts: the prompt with its note line and every feedback (the cell is as tall as the tallest). */
function CheckpointTextGhosts({ cp }: { cp: Checkpoint }) {
  // Ghosts use the live markup exactly (the feedback lead is semibold): a
  // lighter ghost can wrap one line shorter than the text it reserves for.
  return (
    <>
      <div aria-hidden className="invisible col-start-1 row-start-1">
        <PromptBlock live={false} prompt={cp.prompt} note={null} noteReserve={longestLastTime(cp)} />
      </div>
      {allFeedback(cp).map((f, k) => (
        <Feedback key={k} aria-hidden className="invisible col-start-1 row-start-1" lead={f.lead} body={f.body} />
      ))}
    </>
  )
}

/**
 * Every caption, recap and checkpoint of the preset on screen, invisible in
 * the dock's grid cell: the cell is as tall as the tallest of them at this
 * width and text size (R2: per preset), and never changes while stepping or
 * answering. Checkpoint ghosts render real choice rows, so wrapped labels
 * reserve their lines (Q5).
 */
function DockGhosts<S>({ log }: { log: StepLog<S> }) {
  const ghosts = useMemo(() => {
    const captions = [...new Set(log.steps.map((st) => st.why))]
    // The end caption with every recap it can lead with (D21, Q14).
    const end = log.steps[log.steps.length - 1].why
    const recaps = allRecaps(log.checkpoints).map((r) => ({ ...r, end }))
    return { captions, checkpoints: log.checkpoints, recaps }
  }, [log])
  return (
    <div aria-hidden data-viz-part="dock-ghosts" className="invisible col-start-1 row-start-1 grid">
      {ghosts.captions.map((t) => (
        <p key={t} className={cn('col-start-1 row-start-1', captionCls)}>
          {t}
        </p>
      ))}
      {ghosts.recaps.map((r) => (
        <Feedback
          key={`${r.lead}|${r.body}`}
          className="col-start-1 row-start-1"
          lead={r.lead}
          body={`${r.body} ${r.end}`.trim()}
        />
      ))}
      {ghosts.checkpoints.map((c, k) => (
        <CheckpointBlock
          key={k}
          ghost
          className="col-start-1 row-start-1"
          labels={c.choices.map((ch) => ch.label)}
          text={null}
          textGhosts={<CheckpointTextGhosts cp={c} />}
          choices={c.choices.map((ch, i) => (
            <ChoiceRow key={ch.id} index={i} label={ch.label} tabIndex={-1} />
          ))}
          skip={<SkipButton tabIndex={-1} unavailable />}
        />
      ))}
    </div>
  )
}
