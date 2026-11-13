'use client'

import { m, useReducedMotion } from 'framer-motion'
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { Button } from '../../primitives/Button'
import { cn as clsx } from '../../primitives/cn'
import { Disclosure } from '../../primitives/Disclosure'
import { Frame } from '../../primitives/Frame'
import { Provenance } from '../../primitives/Provenance'
import { SegmentedControl } from '../../primitives/SegmentedControl'
import { TARGET_GAP_PX, ink, type as typeScale } from '../../primitives/tokens-v3'
import { CodePane } from '../../shell/CodePane'
import type { MotionGate } from '../../shell/motion'
import { BURST_WINDOW_MS, escapePauses, isBurst } from '../../shell/pace'
import { lastTimeText } from '../../shell/footprint'
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
import {
  AGAIN_LABEL,
  CONTROL_LABEL,
  LIST_RULE,
  NO_CHECK_PROMPT,
  SHOW_LABEL,
  SKIP_LABEL,
  SKIP_NAME,
  TITLE,
  WRAPPER_RULE,
  WRAPPER_SETUP,
  WRAPPER_TITLE,
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
import { ChoiceGhosts, DOCK, LkChoice, TextCell, TrailingGhost, VerdictText, dockCss } from './DockGhosts'
import {
  CODE_HEIGHT,
  CONTROLS,
  GAPS,
  dockStrings,
  STAGE_GAP,
  listKeysMetrics,
  listTally,
  wrapperTally,
} from './layout'
import {
  actionOf,
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
} from './model'
import { LIST_OUTCOMES, WRAPPER_OUTCOMES } from './outcomes'
import { OutcomesAsText, RECORDED_RUNTIMES } from './OutcomesAsText'
import { BEAT, BEAT_MS, beatFade, beatTransition, useRevealView } from './reveal'
import { stackCss } from './stack-css'

/**
 * The React list-keys explorable (spec §8.3): the learner sets the starting
 * state, picks a key strategy and an action (two always-visible controls,
 * H3 R8), predicts where the state goes, and then sees which instance React
 * matched to each row. Every outcome is React's recorded behaviour
 * (`outcomes.ts`), never computed here.
 *
 * Frame anatomy: header (title), a fixed stage (the two control rows, the
 * code strip, Before | lines | After), one checkpoint dock (H3 R4, Q4:
 * question, choices that stay and become ✓ or ×, Skip trailing them and then
 * "Try another" in its place), and a
 * footer with the full text alternative and provenance.
 */

const useIsoLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect

const KEYS = KEY_STRATEGIES.map((k) => ({ id: k, label: KEY_LABEL[k] }))

type Nav = { s: ExploreState; play: boolean; at: number; epoch: number }

const METRICS = { list: listKeysMetrics('list'), wrapper: listKeysMetrics('wrapper') }
const CHOICE_SETS = { list: dockStrings('list').choiceSets, wrapper: dockStrings('wrapper').choiceSets }

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
  const revealed = s.phase === 'reveal'
  const view = useRevealView(`${s.reveals}:${nav.epoch}`, play && !gate.reduce && revealed)

  // ---- derived ---------------------------------------------------------------
  const action = actionOf(s)
  const tracked = trackedRow(s.checks)
  const answer = answerOf(s)
  const choices =
    s.scene === 'list' ? listChoices(s.listAction) : wrapperChoices(s.count)
  const labelOf = (id: string) => choices.find((c) => c.id === id)?.label ?? id
  const prompt =
    s.scene === 'list'
      ? tracked === null
        ? NO_CHECK_PROMPT
        : listPrompt(BEFORE[tracked])
      : wrapperPrompt(s.wrapperAction)
  const canPredict = answer !== null
  const lastTime = s.memory[experimentId(s)]
  // The answer is remembered as it is given; the question still on screen
  // during the payoff keeps the line it was asked with.
  const askedLast = useRef<string | undefined>(undefined)
  if (s.phase === 'ask') askedLast.current = lastTime ? choices.find((c) => c.id === lastTime)?.label : undefined
  const lastLabel = askedLast.current

  const outcomeSentence =
    s.scene === 'list'
      ? listOutcomeSentence(s.listAction, LIST_OUTCOMES[`${s.key}/${s.listAction}`], s.checks)
      : wrapperOutcomeSentence(s.wrapperAction, s.count)
  const rule =
    s.scene === 'list' ? LIST_RULE[`${s.key}/${s.listAction}`] : WRAPPER_RULE[s.wrapperAction]
  const lead = canPredict ? feedbackLead(s.pick, answer!, labelOf) : ''
  const tally =
    s.scene === 'list'
      ? listTally(LIST_OUTCOMES[`${s.key}/${s.listAction}`])
      : wrapperTally(WRAPPER_OUTCOMES[s.wrapperAction].counterReused)

  const codeVariant: CodeVariant =
    s.scene === 'list' ? `list/${s.key}` : `wrapper/${s.wrapperAction}`
  const code = CODE[codeVariant]
  const metrics = METRICS[s.scene]
  const choiceSets = CHOICE_SETS[s.scene]

  const actionOptions =
    s.scene === 'list'
      ? LIST_ACTIONS.map((a) => ({ id: a, label: ACTION_LABEL[a] }))
      : WRAPPER_ACTIONS.map((a) => ({ id: a, label: WRAPPER_LABEL[a] }))
  const actionIndex = actionOptions.findIndex((o) => o.id === action)
  const actionName = `${ACTION_LABEL[s.listAction]}, ${keyPhrase(s.key)}`

  // ---- focus: moves only when the focused control is replaced (§5.2) -------
  const frameRef = useRef<HTMLElement>(null)
  const dockRef = useRef<HTMLDivElement>(null)
  const pendingFocus = useRef<string | null>(null)
  const pendingByPointer = useRef(false)
  const [choiceFocus, setChoiceFocus] = useState(0)

  /** `e`: the activating click; a pointer click has `detail > 0`, a key press 0. */
  const fromDock = (a: ExploreAction, focusTarget: string, e?: { detail: number }) => {
    pendingFocus.current = focusTarget
    pendingByPointer.current = (e?.detail ?? 0) > 0
    dispatch(a)
  }

  useIsoLayoutEffect(() => {
    const target = pendingFocus.current
    pendingFocus.current = null
    if (!target || !frameRef.current) return
    const active = document.activeElement
    if (active && active !== document.body && !frameRef.current.contains(active)) return
    const el = frameRef.current.querySelector<HTMLElement>(`[data-viz-focus="${target}"]`)
    if (!el) return
    // Never scroll the page on a handover (F10): focus in place. A keyboard
    // user's focus is brought into view only if it lands entirely off
    // screen; a pointer user's page never moves (they see where they clicked).
    el.focus({ preventScroll: true })
    if (pendingByPointer.current) return
    const r = el.getBoundingClientRect()
    if (r.bottom < 0 || r.top > window.innerHeight) el.scrollIntoView({ block: 'nearest' })
  }, [s.phase, s.scene, s.listAction, s.wrapperAction])

  // ---- narration (§5.3, R1M-14, Q18): one polite status once input settles
  // (the shared 250 ms window), and the verdict when its text appears (the
  // verdict beat after the landing), never on load. Merge note (H3 F2): use
  // F1's shared narration hook with the same delay. -------------------------
  const [live, setLive] = useState('')
  const first = useRef(true)
  const liveText = !revealed
    ? `${s.scene === 'list' ? `${actionName}. ` : `${WRAPPER_LABEL[s.wrapperAction]}. `}${canPredict ? `Predict: ${prompt}` : prompt}`
    : view.landed
      ? `${lead} ${outcomeSentence} ${rule}${
          s.scene === 'list'
            ? ` After: ${afterRows(s.key, s.listAction, LIST_OUTCOMES[`${s.key}/${s.listAction}`], s.checks)
                .map((r) => `${ITEMS[r.item].text} ${r.checked ? 'checked' : 'unchecked'}, instance ${r.instance}`)
                .join('; ')}.`
            : ''
        }`.trim()
      : null
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (liveText === null) return
    const delay = !revealed ? BURST_WINDOW_MS : view.sequence ? BEAT.verdict * BEAT_MS : 0
    const id = window.setTimeout(() => setLive(liveText), delay)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveText, revealed])

  // ---- keyboard: 1 to 4 answer (§5.2). Esc never resets (D13): with no
  // playback to pause, the explorable has no Esc action. ----------------------
  const onKeyDown = (e: ReactKeyboardEvent<HTMLElement>) => {
    if (!interactive || e.altKey || e.ctrlKey || e.metaKey) return
    if (escapePauses(e, false, () => {})) return
    if (s.phase !== 'ask') return
    if (/^[1-4]$/.test(e.key) && canPredict) {
      const c = choices[Number(e.key) - 1]
      if (c) {
        e.preventDefault()
        // Focus moves only from the dock (the answered choice hands on to
        // "Try another"); from the controls or a checkbox it does not (M19).
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
    frameRef.current?.querySelector<HTMLElement>(`[data-choice-index="${n}"]`)?.focus()
  }

  // ---- render ----------------------------------------------------------------
  const hidden = !interactive
  const controlLabel = clsx('flex h-11 items-center', typeScale.label.cls, ink.secondary)
  // The verdict, its marks and the tally wait for the landing (H3 R5).
  const verdictShown = revealed && view.landed

  return (
    <Frame
      ref={frameRef}
      aria-labelledby={titleId}
      aria-roledescription="explorable"
      data-viz-frame="list-keys"
      data-viz-preset={config.id}
      data-viz-scene={s.scene}
      data-viz-key={s.key}
      data-viz-action={action}
      data-viz-mode={s.phase}
      data-viz-landed={verdictShown || undefined}
      data-viz-interactive={interactive ? 'true' : 'false'}
      onKeyDown={onKeyDown}
    >
      {/* Raw, so the server does not entity-escape the selectors' quotes (generated CSS only). */}
      <style dangerouslySetInnerHTML={{ __html: stackCss + dockCss }} />
      {/* 1. Header: the title (a div, so the blog's print sheet keeps it, H3 R10). */}
      {/* At least one title line; under very large text the title wraps
          rather than truncates (it never changes within a preset, so the
          frame still holds still, H3 R9). */}
      <div className="flex items-center" style={{ minHeight: toRem(metrics.narrow.header) }}>
        <p id={titleId} className={clsx('m-0 text-pretty', typeScale.title.cls, ink.base)}>
          {s.scene === 'list' ? TITLE : WRAPPER_TITLE}
        </p>
      </div>

      {/* 2. Stage: the two control rows, the code strip, then Before | lines | After. */}
      <div
        data-viz-region="stage"
        data-lk-stage
        className={clsx('relative flex flex-col print:h-auto', H_CLS)}
        style={remHeights(
          { narrow: metrics.narrow.stage, wide: metrics.wide.stage },
          { marginTop: toRem(GAPS.header) },
        )}
      >
        <div
          className="grid shrink-0 grid-cols-[auto_minmax(0,1fr)] content-start gap-x-3 print:hidden"
          style={{ height: toRem(CONTROLS), rowGap: toRem(TARGET_GAP_PX) }}
          data-viz-region="keyrow"
        >
          {s.scene === 'list' ? (
            <>
              <span className={controlLabel} aria-hidden>
                {CONTROL_LABEL.key}
              </span>
              <div className={clsx('flex h-11 min-w-0 items-center', hidden && 'invisible')} data-viz-part="keys">
                <SegmentedControl
                  className="flex-1"
                  label="Key strategy"
                  options={KEYS}
                  value={KEY_STRATEGIES.indexOf(s.key)}
                  interactive={interactive}
                  onChange={(i) => dispatch({ type: 'key', key: KEY_STRATEGIES[i] })}
                />
              </div>
            </>
          ) : (
            <p className={clsx('col-span-2 m-0 flex h-11 items-center', typeScale.item.cls, ink.secondary)}>
              <span className="line-clamp-2">{WRAPPER_SETUP}</span>
            </p>
          )}
          <span className={controlLabel} aria-hidden>
            {s.scene === 'list' ? CONTROL_LABEL.action : CONTROL_LABEL.change}
          </span>
          <div className={clsx('flex h-11 min-w-0 items-center', hidden && 'invisible')} data-viz-part="actions">
            <SegmentedControl
              className="flex-1"
              label={s.scene === 'list' ? 'Action' : 'Change'}
              options={actionOptions}
              value={actionIndex}
              interactive={interactive}
              // Every action stays a visible segment wherever the four fit (H3 R8).
              maxSegments={LIST_ACTIONS.length}
              optionProps={(o) => ({ 'data-viz-focus': `action-${o.id}` })}
              selectProps={{ 'data-viz-part': 'segments-select' }}
              onChange={(i) => dispatch({ type: 'apply', action: actionOptions[i].id as never })}
            />
          </div>
        </div>
        {/* Print: the controls are buttons, so the choice is printed as text (H3 R10). */}
        <p className={clsx('m-0 hidden print:block', typeScale.status.cls, ink.secondary)}>
          {s.scene === 'list'
            ? `${CONTROL_LABEL.key}: ${KEY_LABEL[s.key]} · ${CONTROL_LABEL.action}: ${ACTION_LABEL[s.listAction]}`
            : `${CONTROL_LABEL.change}: ${WRAPPER_LABEL[s.wrapperAction]}`}
        </p>
        <div
          className="grid min-w-0 grid-cols-1 items-start gap-4 vz-wide:grid-cols-[auto_minmax(0,1fr)]"
          style={{ marginTop: toRem(STAGE_GAP.narrow) }}
        >
          <CodePane
            lines={code.lines}
            tokens={CODE_TOKENS[codeVariant]}
            line={code.line}
            rows={{ narrow: CODE_ROWS, wide: CODE_ROWS }}
            height={{ narrow: CODE_HEIGHT, wide: CODE_HEIGHT }}
            cols={CODE_COLS}
            animate={false}
          />
          <Columns s={s} interactive={interactive} gate={gate} view={view} dispatch={dispatch} />
        </div>
      </div>

      <div role="status" className="sr-only" data-viz-part="viz-live">
        {live}
      </div>

      {/* 3. Dock: the checkpoint (H3 R4, Q4). The text cell holds the
          question, then the verdict; the choices stay, Skip trails them, and
          "Try another" takes Skip's place on the reveal. */}
      <div
        ref={dockRef}
        data-viz-region="dock"
        className={clsx('relative print:hidden', hidden && 'invisible')}
        style={{ marginTop: toRem(GAPS.dock) }}
      >
        <div className={DOCK.block} style={DOCK.blockStyle} data-viz-part={revealed ? 'dock-reveal' : 'dock-ask'}>
          <TextCell scene={s.scene}>
            {verdictShown ? (
              <m.div
                key={view.key}
                className="col-start-1 row-start-1 self-end"
                initial={view.sequence ? { opacity: 0 } : false}
                animate={{ opacity: 1 }}
                transition={beatFade(view.sequence, BEAT.verdict)}
                data-viz-reveal={view.sequence ? 'verdict' : undefined}
              >
                <p id={promptId} className="sr-only">
                  {prompt}
                </p>
                <VerdictText live lead={lead} rule={rule} />
                {/* What React did, counted (F2 ruling 2), as the verdict's note line (N2-13). */}
                <p className={DOCK.note} data-viz-part="viz-counts">
                  {tally}
                </p>
              </m.div>
            ) : null}
            {/* The question stays until the payoff lands (H3 R5) and, played,
                until the verdict's own beat: then it goes at once while the
                verdict fades in (the caption rule, M15), so the cell is never
                empty. The earlier answer sits under it once (G ruling 2). */}
            {!verdictShown || view.sequence ? (
              <div
                className="col-start-1 row-start-1 self-end"
                aria-hidden={verdictShown || undefined}
                // A step, not a fade: it leaves at the verdict beat's start.
                style={
                  verdictShown
                    ? { opacity: 0, transitionProperty: 'opacity', transitionDuration: '0s', transitionDelay: `${BEAT.verdict * BEAT_MS}ms` }
                    : undefined
                }
              >
                <p id={verdictShown ? undefined : promptId} className={DOCK.prompt} data-viz-part={verdictShown ? undefined : 'viz-prompt'}>
                  {prompt}
                </p>
                <p
                  id={verdictShown ? undefined : `${promptId}-last`}
                  className={clsx(DOCK.note, !lastLabel && 'invisible')}
                  data-viz-part={lastLabel && !verdictShown ? 'viz-last-time' : undefined}
                  aria-hidden={lastLabel ? undefined : true}
                >
                  {lastLabel ? lastTimeText(lastLabel) : '\u00a0'}
                </p>
              </div>
            ) : null}
          </TextCell>
          {/* The choice row: every choice set's ghost in one cell, so the row
              never changes height between actions (Q5), then the live row. */}
          <div className="grid min-w-0">
            <ChoiceGhosts sets={choiceSets} mono={s.scene === 'wrapper'} />
            <div data-lk-row className="col-start-1 row-start-1 min-w-0">
              <div
                role="radiogroup"
                aria-labelledby={promptId}
                aria-describedby={lastLabel && !revealed ? `${promptId}-last` : undefined}
                className={clsx(!canPredict && 'invisible')}
                style={{ ['--lk-n' as string]: choices.length }}
                data-lk-choices
                data-viz-part="choices"
              >
                {choices.map((c, i) => (
                  <LkChoice
                    key={c.id}
                    index={i}
                    label={c.label}
                    mono={s.scene === 'wrapper'}
                    // Answered: locked while the payoff plays; the emphasis,
                    // the ✓ and × wait for the verdict beat (H3 R5, Q3, Q4).
                    state={!revealed ? 'ask' : verdictShown && canPredict ? 'resolved' : 'locked'}
                    picked={revealed && s.pick === c.id}
                    answer={c.id === answer}
                    beat={beatTransition(view.sequence, BEAT.verdict)}
                    data-choice={c.id}
                    data-choice-index={i}
                    data-viz-focus={`choice-${i}`}
                    tabIndex={canPredict && !revealed && i === choiceFocus ? 0 : -1}
                    onClick={(e) => fromDock({ type: 'answer', choice: c.id }, 'again', e)}
                    onKeyDown={(e) => onChoiceKey(e, i)}
                    onFocus={() => setChoiceFocus(i)}
                  />
                ))}
              </div>
              {/* The trailing action, in a cell that also holds "Try another"
                  as a ghost, so Skip and Try another share one place. */}
              <div className="grid shrink-0">
                <TrailingGhost />
                <div className="col-start-1 row-start-1 flex items-center">
                  {revealed ? (
                    <Button
                      key="again"
                      tabIndex={interactive ? 0 : -1}
                      data-viz-focus="again"
                      data-viz-part="viz-again"
                      onClick={(e) => {
                        setChoiceFocus(0)
                        fromDock({ type: 'again' }, canPredict ? 'choice-0' : 'skip', e)
                      }}
                    >
                      {AGAIN_LABEL}
                    </Button>
                  ) : (
                    <Button
                      key="skip"
                      variant="text"
                      tabIndex={interactive ? 0 : -1}
                      aria-label={canPredict ? SKIP_NAME : undefined}
                      data-viz-focus="skip"
                      data-viz-part="viz-skip"
                      data-lk-skip
                      onClick={(e) => fromDock({ type: 'skip' }, 'again', e)}
                    >
                      {canPredict ? SKIP_LABEL : SHOW_LABEL}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Footer: outcomes as text, and provenance. */}
      {/* On paper the full text is printed below, open (H3 R10), with its own
          recorded-runs line, so the footer stays on screen. */}
      <footer className="relative print:hidden" style={{ marginTop: toRem(GAPS.footer) }}>
        <Disclosure className="print:hidden" summary="Outcomes as text" summaryProps={{ 'data-viz-focus': 'text-alternative' }}>
          <OutcomesAsText />
        </Disclosure>
        <Provenance runtimes={RECORDED_RUNTIMES} />
      </footer>

      <div className="hidden print:mt-4 print:block">
        <OutcomesAsText print />
      </div>
    </Frame>
  )
}
