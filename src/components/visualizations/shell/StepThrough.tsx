'use client'

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
import { BackIcon, Button, NextIcon, PauseIcon, PlayIcon, RestartIcon } from '../primitives/Button'
import { captionCls, promptCls } from '../primitives/Caption'
import { ChoiceRow } from '../primitives/ChoiceRow'
import { cn } from '../primitives/cn'
import { Disclosure } from '../primitives/Disclosure'
import { Frame } from '../primitives/Frame'
import { Provenance } from '../primitives/Provenance'
import { SegmentedControl } from '../primitives/SegmentedControl'
import { TARGET_GAP_PX, ink, motionRules, type as typeScale } from '../primitives/tokens-v3'
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
import { transitionFor, type MotionGate } from './motion'
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
        style={heights({ narrow: metrics.narrow.header, wide: metrics.wide.header })}
      >
        <p id={titleId} className={cn('m-0 truncate', typeScale.title.cls, ink.base)}>
          {def.title}
        </p>
        <div className={cn('self-start md:self-auto', hidden && 'invisible')}>
          <SegmentedControl
            label="Example"
            options={def.presets}
            value={s.preset}
            interactive={interactive}
            onChange={(i) => dispatch({ type: 'preset', preset: i }, true)}
          />
        </div>
      </header>

      {/* 2. Stage: fixed footprint, code pane inside the stage grid. */}
      <div
        data-viz-region="stage"
        className={cn('relative', H_CLS)}
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

      {/* 3. Step bar: event (what) left, counter right. Sans UI wording (D3). */}
      <div
        data-viz-region="stepbar"
        className={cn('flex items-center justify-between gap-4', typeScale.status.cls, ink.secondary)}
        style={{ height: STEP_BAR, marginTop: FRAME.stageGap }}
      >
        <span className="min-w-0 truncate" data-viz-part="viz-event">
          {s.index === 0 ? '' : step.event}
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
        className={cn('relative grid print:hidden', H_CLS)}
        style={heights({ narrow: metrics.narrow.dock, wide: metrics.wide.dock }, { marginTop: FRAME.dockGap })}
      >
        <div
          data-inactive={mode !== 'controls' || undefined}
          className={cn('col-start-1 row-start-1 grid content-start', mode !== 'controls' && 'invisible')}
        >
          <AnimatePresence initial={false} custom={captionT}>
            <m.p
              key={`${s.preset}:${s.index}:${nav.epoch}`}
              data-viz-part="viz-caption"
              className={cn('col-start-1 row-start-1', captionCls)}
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
          className={cn(
            'col-start-1 row-start-1 flex min-w-0 flex-col self-start md:flex-row md:items-center',
            mode === 'controls' && 'invisible',
          )}
          style={{ gap: CHOICE.textGap }}
        >
          <div className="min-w-0 md:flex-1 md:pr-2">
            {feedback ? (
              <p className={captionCls} data-viz-part="viz-feedback">
                <span className={cn('font-semibold', ink.base)}>{feedback.lead}</span> {feedback.body}
              </p>
            ) : (
              <p id={promptId} className={promptCls} data-viz-part="viz-prompt">
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
                    if (mode === 'ask') onChoiceKey(e, i, cp?.choices.length ?? 0)
                  }}
                  onFocus={() => setChoiceFocus(i)}
                  data-choice={choice.id}
                />
              )
            })}
          </div>
        </div>
      </div>

      {/* Controls bar: scrubber, then Restart, Back, Next, Play. In flow at
          every width: the sticky dock is gone (D14), and the speed toggle (D10). */}
      <div
        data-viz-region="bar"
        className={cn('flex flex-col print:hidden', H_CLS, hidden && 'invisible')}
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
        />
        <div className="flex items-center" style={{ marginTop: TARGET_GAP_PX, gap: TARGET_GAP_PX }}>
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
          {/* Next and "Skip, show me" share one slot; both stay mounted so
              focus can be handed over deliberately (§5.2). */}
          <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)] md:w-32 md:flex-none">
            <Button
              ref={nextRef}
              variant="primary"
              tabIndex={-1}
              aria-label="Next"
              aria-keyshortcuts="ArrowRight"
              data-inactive={mode === 'ask' || undefined}
              unavailable={!interactive || s.index >= last || mode === 'ask'}
              onClick={() => dispatch({ type: 'next' })}
              className={cn('col-start-1 row-start-1', mode === 'ask' && 'invisible')}
              data-viz-part="viz-next"
            >
              <span>Next</span>
              <NextIcon />
            </Button>
            <Button
              variant="text"
              tabIndex={mode === 'ask' ? 0 : -1}
              data-inactive={mode !== 'ask' || undefined}
              unavailable={mode !== 'ask'}
              onClick={() => dispatch({ type: 'skip' })}
              className={cn('col-start-1 row-start-1', mode !== 'ask' && 'invisible')}
              data-viz-part="viz-skip"
            >
              Skip, show me
            </Button>
          </div>
          <Button
            size="icon"
            tabIndex={-1}
            aria-label={s.playing ? 'Pause' : 'Play'}
            aria-keyshortcuts="Space K"
            unavailable={!interactive || (!s.playing && (s.index >= last || mode === 'ask'))}
            onClick={() => dispatch({ type: 'toggle' })}
            // Play cannot run at an open checkpoint; its slot goes to "Skip, show me".
            className={cn(mode === 'ask' && 'hidden')}
          >
            {s.playing ? <PauseIcon /> : <PlayIcon />}
          </Button>
        </div>
      </div>

      {/* 5. Footer: steps as text and provenance. */}
      <footer className="relative" style={{ marginTop: FRAME.footerGap }}>
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
