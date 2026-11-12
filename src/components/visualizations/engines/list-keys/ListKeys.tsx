'use client'

import { useReducedMotion } from 'framer-motion'
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
import { Button } from '../../primitives/Button'
import { captionCls } from '../../primitives/Caption'
import { ChoiceRow } from '../../primitives/ChoiceRow'
import { cn as clsx } from '../../primitives/cn'
import { Disclosure } from '../../primitives/Disclosure'
import { Frame } from '../../primitives/Frame'
import { Provenance } from '../../primitives/Provenance'
import { SegmentedControl } from '../../primitives/SegmentedControl'
import { ink, type as typeScale } from '../../primitives/tokens-v3'
import { CodePane } from '../../shell/CodePane'
import type { MotionGate } from '../../shell/motion'
import { escapePauses, isBurst } from '../../shell/pace'
import { H_CLS } from '../../shell/vars'
import { remHeights, toRem } from '../../substrates/units'
import {
  CODE,
  CODE_COLS,
  CODE_ROWS,
  CODE_TOKENS,
  type CodeVariant,
} from './code'
import { Columns } from './Columns'
import { DOCK, DockGhosts } from './DockGhosts'
import {
  BACK_LABEL,
  LIST_RULE,
  NO_CHECK_PROMPT,
  PICK_HINT,
  SHOW_LABEL,
  SKIP_LABEL,
  TITLE,
  WRAPPER_RULE,
  WRAPPER_TITLE,
  WRAPPER_SETUP,
  feedbackLead,
  keyPhrase,
  listChoices,
  listOutcomeSentence,
  listPrompt,
  wrapperChoices,
  wrapperOutcomeSentence,
  wrapperPrompt,
} from './content'
import { PRESET_CONFIGS, DEFAULT_PRESET } from './descriptor'
import {
  CODE_HEIGHT,
  GAPS,
  KEY_ROW,
  STATUS,
  listKeysMetrics,
} from './layout'
import {
  answerOf,
  experimentId,
  explore,
  initialExplore,
  type ExploreAction,
  type ExploreState,
} from './machine'
import {
  ACTION_LABEL,
  BEFORE,
  ITEMS,
  KEY_LABEL,
  KEY_STRATEGIES,
  LIST_ACTIONS,
  WRAPPER_ACTIONS,
  WRAPPER_LABEL,
  afterRows,
  trackedRow,
  unmountedRows,
} from './model'
import { LIST_OUTCOMES, WRAPPER_OUTCOMES } from './outcomes'
import { OutcomesAsText, RECORDED_RUNTIMES } from './OutcomesAsText'

/**
 * The React list-keys explorable (spec §8.3): the learner sets the starting
 * state, picks a key strategy and an action, predicts where the state goes,
 * and then sees which instance React matched to each row. Every outcome is
 * React's recorded behaviour (`outcomes.ts`), never computed here.
 *
 * Frame anatomy follows the step-through shell (§3.3): header with the scene
 * switcher, a fixed stage (key row, code strip, Before | lines | After), a
 * status line, one reserved dock shared by the three modes (pick, predict,
 * reveal), and a footer with the full text alternative and provenance.
 */

const useIsoLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect

const KEYS = KEY_STRATEGIES.map((k) => ({ id: k, label: KEY_LABEL[k] }))

type Nav = { s: ExploreState; play: boolean; at: number; epoch: number }

const metrics = listKeysMetrics()

export type ListKeysProps = { preset?: string; interactive?: boolean }

export function ListKeys({ preset, interactive = true }: ListKeysProps) {
  const uid = useId().replace(/:/g, '')
  const titleId = `${uid}-title`
  const promptId = `${uid}-prompt`
  const config =
    PRESET_CONFIGS.find((p) => p.id === preset) ??
    PRESET_CONFIGS.find((p) => p.id === DEFAULT_PRESET)!

  // The reveal animates only when it follows a deliberate answer or skip, and
  // not inside a burst of commands (§4 rule 3, the shared window in
  // shell/pace.ts, D13). Everything else is instant.
  const [nav, send] = useReducer(
    (prev: Nav, a: ExploreAction & { now: number }): Nav => {
      const s = explore(prev.s, a)
      if (s === prev.s) return prev
      const enteringReveal = s.phase === 'reveal' && prev.s.phase !== 'reveal'
      const burst = isBurst(prev.at, a.now)
      const play = enteringReveal && !burst
      return { s, play, at: a.now, epoch: play ? prev.epoch : prev.epoch + 1 }
    },
    undefined,
    () => ({ s: initialExplore(config), play: false, at: -Infinity, epoch: 0 }),
  )
  const dispatch = useCallback(
    (a: ExploreAction) => send({ ...a, now: performance.now() }),
    [],
  )
  const s = nav.s

  const prefersReduced = useReducedMotion() ?? false
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const gate: MotionGate = {
    reduce: prefersReduced,
    instant: !nav.play || !interactive || !mounted,
    epoch: nav.epoch,
  }
  const play = nav.play && interactive && mounted

  // ---- derived ---------------------------------------------------------------
  const action = s.scene === 'list' ? s.listAction : s.wrapperAction
  const phase = s.phase
  const tracked = trackedRow(s.checks)
  const answer = answerOf(s)
  const choices =
    s.scene === 'list'
      ? s.listAction
        ? listChoices(s.listAction)
        : []
      : s.wrapperAction
        ? wrapperChoices(s.count)
        : []
  const labelOf = (id: string) => choices.find((c) => c.id === id)?.label ?? id
  const prompt =
    s.scene === 'list'
      ? tracked === null
        ? NO_CHECK_PROMPT
        : listPrompt(BEFORE[tracked])
      : s.wrapperAction
        ? wrapperPrompt(s.wrapperAction)
        : ''
  const canPredict = answer !== null
  const lastTime = experimentId(s) ? s.memory[experimentId(s)!] : undefined

  const outcomeSentence =
    s.scene === 'list'
      ? s.listAction
        ? listOutcomeSentence(
            s.listAction,
            LIST_OUTCOMES[`${s.key}/${s.listAction}`],
            s.checks,
          )
        : ''
      : s.wrapperAction
        ? wrapperOutcomeSentence(s.wrapperAction, s.count)
        : ''
  const rule =
    s.scene === 'list'
      ? s.listAction
        ? LIST_RULE[`${s.key}/${s.listAction}`]
        : ''
      : s.wrapperAction
        ? WRAPPER_RULE[s.wrapperAction]
        : ''
  const lead = canPredict ? feedbackLead(s.pick, answer!, labelOf) : ''
  const revealed = s.phase === 'reveal'

  const codeVariant: CodeVariant =
    s.scene === 'list'
      ? `list/${s.key}`
      : `wrapper/${s.phase === 'pick' ? 'none' : (s.wrapperAction ?? 'none')}`
  const code = CODE[codeVariant]

  const counts = useMemo(() => {
    if (s.phase !== 'reveal') return ''
    if (s.scene === 'wrapper') {
      const o = s.wrapperAction ? WRAPPER_OUTCOMES[s.wrapperAction] : null
      return o ? (o.counterReused ? 'Counter reused' : 'Counter remounted') : ''
    }
    if (!s.listAction) return ''
    const outcome = LIST_OUTCOMES[`${s.key}/${s.listAction}`]
    const reused = outcome.reused.filter((r) => r !== null).length
    const mountedN = outcome.reused.length - reused
    const gone = unmountedRows(outcome).length
    return [
      reused && `${reused} reused`,
      mountedN && `${mountedN} mounted`,
      gone && `${gone} unmounted`,
    ]
      .filter(Boolean)
      .join(' · ')
  }, [s])

  const event =
    s.phase === 'pick' || !action
      ? s.scene === 'list'
        ? 'Before: set the state'
        : 'Before: set the count'
      : s.scene === 'list'
        ? ACTION_LABEL[s.listAction!]
        : WRAPPER_LABEL[s.wrapperAction!]

  const eventKey =
    s.scene === 'list' && s.phase !== 'pick' && action
      ? `, ${keyPhrase(s.key)}`
      : ''

  // ---- focus: moves only when the focused control is replaced (§5.2) -------
  const frameRef = useRef<HTMLElement>(null)
  const dockRef = useRef<HTMLDivElement>(null)
  const pendingFocus = useRef<string | null>(null)
  const [choiceFocus, setChoiceFocus] = useState(0)
  const lastAction = useRef<string | null>(null)

  const fromDock = (a: ExploreAction, focusTarget: string) => {
    pendingFocus.current = focusTarget
    dispatch(a)
  }

  useIsoLayoutEffect(() => {
    const target = pendingFocus.current
    pendingFocus.current = null
    if (!target || !frameRef.current) return
    const active = document.activeElement
    if (
      active &&
      active !== document.body &&
      !frameRef.current.contains(active)
    )
      return
    const el = frameRef.current.querySelector<HTMLElement>(`[data-viz-focus="${target}"]`)
    if (!el) return
    // Never scroll the page on a handover (F10): focus in place, and bring
    // the control into view only if it is entirely off screen.
    el.focus({ preventScroll: true })
    const r = el.getBoundingClientRect()
    if (r.bottom < 0 || r.top > window.innerHeight) el.scrollIntoView({ block: 'nearest' })
  }, [s.phase, s.scene])

  // ---- narration (§5.3): polite, never on load -----------------------------
  const [live, setLive] = useState('')
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (s.phase === 'pick')
      setLive(s.scene === 'list' ? PICK_HINT.list : PICK_HINT.wrapper)
    else if (s.phase === 'ask')
      setLive(
        `${event}${eventKey}. ${canPredict ? `Predict: ${prompt}` : prompt}`,
      )
    else {
      let rows = ''
      if (s.scene === 'list' && s.listAction) {
        rows = ` After: ${afterRows(
          s.key,
          s.listAction,
          LIST_OUTCOMES[`${s.key}/${s.listAction}`],
          s.checks,
        )
          .map(
            (r) =>
              `${ITEMS[r.item].text} ${r.checked ? 'checked' : 'unchecked'}, instance ${r.instance}`,
          )
          .join('; ')}.`
      }
      setLive(`${lead} ${outcomeSentence} ${rule}${rows}`.trim())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    s.phase,
    s.scene,
    s.key,
    s.listAction,
    s.wrapperAction,
    s.reveals,
    tracked,
  ])

  // ---- keyboard: 1 to 4 answer (§5.2). Esc never resets (D13): with no
  // playback to pause, the explorable has no Esc action. ----------------------
  const onKeyDown = (e: ReactKeyboardEvent<HTMLElement>) => {
    if (!interactive || e.altKey || e.ctrlKey || e.metaKey) return
    // The shared Esc rule (shell/pace.ts): nothing plays here, so it passes
    // the key on and never resets, leaves the prediction or moves focus.
    if (escapePauses(e, false, () => {})) return
    if (s.phase !== 'ask') return
    if (/^[1-4]$/.test(e.key) && canPredict) {
      const i = Number(e.key) - 1
      const c = choices[i]
      if (c) {
        e.preventDefault()
        // Focus moves only when the focused control is replaced (§5.2, M19):
        // from the dock (a choice, Skip) to "Try another action" in its
        // place; from the key switcher or a checkbox it does not move.
        const inDock = dockRef.current?.contains(document.activeElement)
        if (inDock) fromDock({ type: 'answer', choice: c.id }, 'again')
        else dispatch({ type: 'answer', choice: c.id })
      }
    }
  }

  const onChoiceKey = (e: ReactKeyboardEvent<HTMLButtonElement>, i: number) => {
    const delta =
      e.key === 'ArrowDown' || e.key === 'ArrowRight'
        ? 1
        : e.key === 'ArrowUp' || e.key === 'ArrowLeft'
          ? -1
          : 0
    if (!delta) return
    e.preventDefault()
    const n = (i + delta + choices.length) % choices.length
    setChoiceFocus(n)
    frameRef.current
      ?.querySelector<HTMLElement>(`[data-choice-index="${n}"]`)
      ?.focus()
  }

  // ---- render ----------------------------------------------------------------
  const hidden = !interactive
  const actions =
    s.scene === 'list'
      ? LIST_ACTIONS.map((a) => ({ id: a, label: ACTION_LABEL[a] }))
      : WRAPPER_ACTIONS.map((a) => ({ id: a, label: WRAPPER_LABEL[a] }))

  return (
    <Frame
      ref={frameRef}
      aria-labelledby={titleId}
      aria-roledescription="explorable"
      data-viz-frame="list-keys"
      data-viz-preset={config.id}
      data-viz-scene={s.scene}
      data-viz-key={s.key}
      data-viz-action={action ?? ''}
      data-viz-mode={phase}
      data-viz-interactive={interactive ? 'true' : 'false'}
      onKeyDown={onKeyDown}
    >
      {/* 1. Header: the title. Each preset is one scene (D17): the wrapper
          case is its own preset, not a tab in this frame. */}
      <header
        className={clsx('flex items-center', H_CLS)}
        style={remHeights({
          narrow: metrics.narrow.header,
          wide: metrics.wide.header,
        })}
      >
        <p
          id={titleId}
          className={clsx('m-0 truncate', typeScale.title.cls, ink.base)}
        >
          {s.scene === 'list' ? TITLE : WRAPPER_TITLE}
        </p>
      </header>

      {/* 2. Stage: key row, code strip, then Before | match lines | After. */}
      <div
        data-viz-region="stage"
        className={clsx('relative flex flex-col', H_CLS)}
        style={remHeights(
          { narrow: metrics.narrow.stage, wide: metrics.wide.stage },
          { marginTop: toRem(GAPS.header) },
        )}
      >
        <div
          className="flex shrink-0 items-center gap-3"
          style={{ height: toRem(KEY_ROW) }}
          data-viz-region="keyrow"
        >
          {s.scene === 'list' ? (
            <>
              <span
                className={clsx(typeScale.label.cls, ink.secondary)}
                aria-hidden
              >
                Key
              </span>
              <div className={clsx('min-w-0 flex-1', hidden && 'invisible')} data-viz-part="keys">
                <SegmentedControl
                  label="Key strategy"
                  options={KEYS}
                  value={KEY_STRATEGIES.indexOf(s.key)}
                  interactive={interactive}
                  onChange={(i) =>
                    dispatch({ type: 'key', key: KEY_STRATEGIES[i] })
                  }
                />
              </div>
            </>
          ) : (
            <p
              className={clsx('m-0 line-clamp-2', typeScale.item.cls, ink.secondary)}
            >
              {WRAPPER_SETUP}
            </p>
          )}
        </div>
        <div className="mt-2 grid min-w-0 grid-cols-1 items-start gap-4 vz-wide:mt-4 vz-wide:grid-cols-[auto_minmax(0,1fr)]">
          <CodePane
            lines={code.lines}
            tokens={CODE_TOKENS[codeVariant]}
            line={
              s.scene === 'wrapper' && s.phase === 'pick'
                ? undefined
                : code.line
            }
            rows={{ narrow: CODE_ROWS, wide: CODE_ROWS }}
            height={{ narrow: CODE_HEIGHT, wide: CODE_HEIGHT }}
            cols={CODE_COLS}
            animate={false}
          />
          <Columns
            s={s}
            interactive={interactive}
            gate={gate}
            play={play}
            dispatch={dispatch}
          />
        </div>
      </div>

      {/* 3. Status: what was applied (left), what React did (right). */}
      <div
        data-viz-region="status"
        className={clsx(
          'flex items-center justify-between gap-4',
          typeScale.status.cls,
          ink.secondary,
        )}
        style={{ height: toRem(STATUS), marginTop: toRem(GAPS.status) }}
      >
        <span className="min-w-0 truncate" data-viz-part="viz-event">
          {event}
          {/* The key expression is code, so it stays mono inside the sans status (D3). */}
          {eventKey ? (
            <span className="hidden vz-wide:inline">
              {', '}
              <span className="font-mono">{eventKey.slice(2)}</span>
            </span>
          ) : null}
        </span>
        <span className="shrink-0" data-viz-part="viz-counts">
          {s.phase === 'ask' ? 'predict first' : counts}
        </span>
      </div>

      <div role="status" className="sr-only" data-viz-part="viz-live">
        {live}
      </div>

      {/* 4. Dock: one slot for pick, predict and reveal, as tall as its
          tallest state (a ghost stack, measured like the shell's, D15). */}
      <div
        ref={dockRef}
        data-viz-region="dock"
        className={clsx('relative grid print:hidden', hidden && 'invisible')}
        style={{ marginTop: toRem(GAPS.dock) }}
      >
        <DockGhosts />
        <div className="col-start-1 row-start-1 min-w-0">
          {s.phase === 'pick' || !action ? (
            <div className={DOCK.pick} style={DOCK.pickStyle} data-viz-part="dock-pick">
              <p className={captionCls}>
                {s.scene === 'list' ? PICK_HINT.list : PICK_HINT.wrapper}
              </p>
              <div
                className={DOCK.pickGrid(s.scene)}
                role="group"
                aria-label="Actions"
              >
                {actions.map((a) => (
                  <Button
                    key={a.id}
                    tabIndex={interactive ? 0 : -1}
                    unavailable={!interactive}
                    data-viz-focus={`action-${a.id}`}
                    onClick={() => {
                      lastAction.current = a.id
                      setChoiceFocus(0)
                      const nothingToFollow =
                        s.scene === 'list' && tracked === null
                      fromDock(
                        { type: 'apply', action: a.id },
                        nothingToFollow ? 'skip' : 'choice-0',
                      )
                    }}
                    className="min-w-0 px-2"
                  >
                    <span
                      className={clsx(
                        'truncate',
                        s.scene === 'wrapper' &&
                          a.id === 'type' &&
                          'font-mono text-xs',
                      )}
                    >
                      {a.label}
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          ) : !revealed ? (
            <div className={DOCK.ask} style={DOCK.askStyle} data-viz-part="dock-ask">
              <p
                id={promptId}
                className={DOCK.prompt}
                data-viz-part="viz-prompt"
              >
                {prompt}
              </p>
              <div
                role="radiogroup"
                aria-labelledby={promptId}
                className={clsx(DOCK.choices, !canPredict && 'invisible')}
                style={DOCK.choicesStyle}
                data-viz-part="choices"
              >
                {choices.map((c, i) => (
                  <ChoiceRow
                    key={c.id}
                    index={i}
                    label={c.label}
                    wrap="truncate"
                    mono={s.scene === 'wrapper'}
                    tag={lastTime === c.id ? 'last time' : undefined}
                    data-choice={c.id}
                    data-choice-index={i}
                    data-viz-focus={`choice-${i}`}
                    tabIndex={canPredict && i === choiceFocus ? 0 : -1}
                    // The choice is replaced by the reveal, so focus moves to the
                    // control in its place (§5.2), as the shell hands it on.
                    onClick={() => fromDock({ type: 'answer', choice: c.id }, 'again')}
                    onKeyDown={(e) => onChoiceKey(e, i)}
                    onFocus={() => setChoiceFocus(i)}
                  />
                ))}
              </div>
              <div className={DOCK.askActions}>
                <Button
                  variant="text"
                  tabIndex={interactive ? 0 : -1}
                  data-viz-focus="skip"
                  data-viz-part="viz-skip"
                  onClick={() => fromDock({ type: 'skip' }, 'again')}
                >
                  {canPredict ? SKIP_LABEL : SHOW_LABEL}
                </Button>
                <Button
                  variant="text"
                  tabIndex={interactive ? 0 : -1}
                  data-viz-part="viz-back"
                  onClick={() => fromDock({ type: 'back' }, `action-${lastAction.current ?? action}`)}
                >
                  {BACK_LABEL}
                </Button>
              </div>
            </div>
          ) : (
            <div className={DOCK.reveal} style={DOCK.revealStyle} data-viz-part="dock-reveal">
              <div className={DOCK.revealText}>
                <p className={DOCK.feedback} data-viz-part="viz-feedback">
                  {lead ? <span className="font-semibold">{lead}</span> : null} {outcomeSentence}
                </p>
                <p className={DOCK.rule} data-viz-part="viz-caption">
                  {rule}
                </p>
              </div>
              <Button
                tabIndex={interactive ? 0 : -1}
                data-viz-focus="again"
                data-viz-part="viz-again"
                onClick={() => fromDock({ type: 'again' }, `action-${lastAction.current ?? action}`)}
                className={DOCK.again}
                style={DOCK.againStyle}
              >
                Try another action
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 5. Footer: outcomes as text, and provenance. */}
      <footer className="relative" style={{ marginTop: toRem(GAPS.footer) }}>
        <Disclosure summary="Outcomes as text" summaryProps={{ 'data-viz-focus': 'text-alternative' }}>
          <OutcomesAsText />
        </Disclosure>
        <Provenance runtimes={RECORDED_RUNTIMES} />
      </footer>

      <div className="hidden print:mt-4 print:block">
        <OutcomesAsText />
      </div>
    </Frame>
  )
}
