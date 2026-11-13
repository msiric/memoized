'use client'

import type { ReactNode } from 'react'
import { BackIcon, Button, NextIcon, PlayIcon, RestartIcon, type ButtonVariant } from '@/components/visualizations/primitives/Button'
import { Caption, Feedback, promptCls } from '@/components/visualizations/primitives/Caption'
import { NUDGE_TEXT, lastTimeText } from '@/components/visualizations/shell/footprint'
import { CheckpointBlock, PromptBlock, SkipButton } from '@/components/visualizations/primitives/Checkpoint'
import { ChoiceRow } from '@/components/visualizations/primitives/ChoiceRow'
import { cn } from '@/components/visualizations/primitives/cn'
import { Disclosure } from '@/components/visualizations/primitives/Disclosure'
import { Frame } from '@/components/visualizations/primitives/Frame'
import { Provenance } from '@/components/visualizations/primitives/Provenance'
import { SegmentedControl } from '@/components/visualizations/primitives/SegmentedControl'
import { Tag, type TagTone } from '@/components/visualizations/primitives/Tag'
import { CheckBox } from '@/components/visualizations/engines/list-keys/CheckBox'
import { eventLoopDescriptor } from '@/components/visualizations/engines/event-loop/descriptor'
import { CodePane, codeRows } from '@/components/visualizations/shell/CodePane'
import { STATIC_GATE } from '@/components/visualizations/shell/motion'
import { Scrubber } from '@/components/visualizations/shell/Scrubber'
import { Lane, type ChipKind, type LaneChip } from '@/components/visualizations/substrates/Lane'
import {
  DASH,
  changed,
  tooltipCls,
  ink,
  now,
  radius,
  space,
  stroke,
  strokeWidth,
  surface,
  svgInk,
  type as typeScale,
} from '@/components/visualizations/primitives/tokens-v3'
import { Force, type ForcedState } from './Force'

export type RoleRow = {
  name: string
  meaning: string
  dark: string
  hex: string
  source: string
  onFrame: number
}
export type PairRow = { use: string; kind: 'text' | 'graphic'; fg: string; bg: string; ratio: number; min: number }

const STATES: (ForcedState | 'rest' | 'unavailable')[] = ['rest', 'hover', 'press', 'focus', 'unavailable']

function Section({ id, title, note, children }: { id: string; title: string; note?: string; children: ReactNode }) {
  return (
    <section data-specimen={id} className="mt-12 first:mt-0">
      <h2 className={cn('m-0', typeScale.title.cls, ink.base)}>{title}</h2>
      {note ? <p className={cn('mb-0 mt-1 max-w-2xl', typeScale.body.cls, ink.muted)}>{note}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  )
}

/** One cell of a state matrix, labelled under the specimen. */
function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col items-start gap-2">
      <div className="flex min-h-11 items-center">{children}</div>
      <span className={cn(typeScale.status.cls, ink.muted)}>{label}</span>
    </div>
  )
}

function inState(state: (typeof STATES)[number], node: ReactNode) {
  return state === 'rest' || state === 'unavailable' ? node : <Force state={state}>{node}</Force>
}

const noop = () => {}

const CODE = eventLoopDescriptor.presets[0].log.code!
const EVENTS = eventLoopDescriptor.presets[0].log.steps.map((st) => st.event)
const LONG_CODE = [
  "queueMicrotask(() => console.log('a microtask queued while the queue drains'))",
  "setTimeout(() => console.log('B'), 0)",
]
const ids = (chips: readonly LaneChip[]) => new Set(chips.map((c) => c.id))

/** One lane at rest, with its chips present before and after (no motion). */
function SpecimenLane({
  label,
  kind,
  chips,
  focus = [],
  stack = false,
}: {
  label: string
  kind: ChipKind
  chips: LaneChip[]
  focus?: string[]
  /** The call stack: a taller lane, chips stacked upward (Q8: the same label column). */
  stack?: boolean
}) {
  const present = ids(chips)
  return (
    <Lane
      id={kind}
      label={label}
      kind={kind}
      chips={chips}
      labelAt={{ narrow: 'top', wide: 'inline' }}
      height={stack ? { narrow: 108, wide: 108 } : { narrow: 72, wide: 44 }}
      focus={new Set(focus)}
      created={new Set()}
      present={present}
      before={present}
      gate={STATIC_GATE}
      from={{}}
      to={{}}
    />
  )
}

/** The specimen scrubber: 9 steps, checkpoints in every status. */
function SpecimenScrubber({
  index,
  interactive = true,
  checkpoints,
}: {
  index: number
  interactive?: boolean
  checkpoints: { at: number; status: 'open' | 'answered' | 'skipped' }[]
}) {
  return (
    <div className="w-72 max-w-full">
      <Scrubber
        index={index}
        total={EVENTS.length}
        events={EVENTS}
        checkpoints={checkpoints}
        valueText={`Step ${index + 1} of ${EVENTS.length}`}
        label="Step"
        interactive={interactive}
        animate={false}
        onSeek={noop}
      />
    </div>
  )
}

export function SystemSpecimen({ roles, pairs }: { roles: RoleRow[]; pairs: PairRow[] }) {
  const buttons: { variant: ButtonVariant; node: ReactNode; icon?: boolean }[] = [
    {
      variant: 'primary',
      node: (
        <>
          <span>Next</span>
          <NextIcon />
        </>
      ),
    },
    {
      variant: 'secondary',
      node: (
        <>
          <BackIcon />
          <span>Back</span>
        </>
      ),
    },
    { variant: 'secondary', icon: true, node: <RestartIcon /> },
    { variant: 'secondary', icon: true, node: <PlayIcon /> },
    { variant: 'text', node: <span>Skip</span> },
  ]

  return (
    <Frame as="div" data-viz-frame="system" className="xl:-mx-20">
      <Section
        id="type"
        title="Type ramp"
        note="Only the platform scale (2xs 12/20, xs 13/24, sm 14/24, base 16/28). Sans for UI wording, mono only for code, values and identifiers. Compact leadings are for fixed-height glyph rows."
      >
        <div className="grid gap-4">
          {Object.entries(typeScale).map(([name, t]) => (
            <div key={name} className="grid grid-cols-1 items-baseline gap-1 md:grid-cols-[10rem_minmax(0,1fr)] md:gap-6">
              <span className={cn(typeScale.status.cls, ink.muted)}>
                {name} · {t.size}/{t.line}
              </span>
              <span className={cn(t.cls, name === 'caption' ? ink.secondary : ink.base)}>
                {name === 'code' || name === 'value' || name === 'meta' || name === 'glyphHeader'
                  ? "queueMicrotask(() => log('B'))"
                  : name === 'status'
                    ? 'enqueue microtask · 3 / 12'
                    : 'The script runs to the end before anything it queues can run.'}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section
        id="color"
        title="Color roles"
        note="One meaning per hue. Ratios are against the frame surface (zinc-800/40 over the zinc-900 page)."
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((r) => (
            <div key={r.name} className={cn('flex items-center gap-3 border p-2', radius.row.cls, stroke.hairline)}>
              <span aria-hidden className={cn('h-10 w-10 shrink-0 border', radius.chip.cls, stroke.hairline)} style={{ background: r.hex }} />
              <span className="block min-w-0 flex-1">
                <span className={cn('block', typeScale.control.cls, ink.base)}>
                  {r.name} <span className={cn(typeScale.meta.cls, ink.muted)}>{r.dark}</span>
                </span>
                <span className={cn('block truncate', typeScale.status.cls, ink.muted)} title={r.source}>
                  {r.onFrame.toFixed(2)}:1 · {r.meaning}
                </span>
              </span>
            </div>
          ))}
        </div>
        <details className="mt-4">
          <summary className={cn('cursor-pointer', typeScale.disclosure.cls, ink.muted)}>
            Every tested pair ({pairs.length})
          </summary>
          <table className={cn('mt-2 w-full border-collapse text-left', typeScale.status.cls, ink.secondary)}>
            <tbody>
              {pairs.map((p) => (
                <tr key={p.use} className={cn('border-t', stroke.hairline)}>
                  <td className="py-1 pr-4">{p.use}</td>
                  <td className="py-1 pr-4 font-mono">{p.fg}</td>
                  <td className="py-1 pr-4 font-mono">{p.bg}</td>
                  <td className={cn('py-1 tabular-nums', p.ratio >= p.min ? ink.base : ink.removed)}>
                    {p.ratio.toFixed(2)} / {p.min}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </Section>

      <Section
        id="shape"
        title="Space, radii and strokes"
        note="8 pt rhythm plus 4 and 12. Frame 16, pill controls, rows and glyphs 8, chips 4. Outlines 1 px, connectors 1.5 px, a now connector 2.5 px."
      >
        <div className="flex flex-wrap items-end gap-6">
          {Object.entries(space).map(([k, v]) => (
            <Cell key={k} label={`${v}`}>
              <span aria-hidden className="block bg-lime-500/40" style={{ width: v, height: v }} />
            </Cell>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-6">
          {(['frame', 'control', 'row', 'glyph', 'chip'] as const).map((k) => (
            <Cell key={k} label={`${k} · ${radius[k].cls}`}>
              <span aria-hidden className={cn('block h-11 w-24 border', radius[k].cls, stroke.line, surface.glyph)} />
            </Cell>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-8">
          {(
            [
              ['outline 1', strokeWidth.outline, svgInk.line, undefined],
              ['connector 1.5', strokeWidth.connector, svgInk.line, undefined],
              ['dashed 4 4', strokeWidth.connector, svgInk.line, DASH],
              ['now 2.5', strokeWidth.nowConnector, svgInk.now, undefined],
              ['removed', strokeWidth.connector, svgInk.removed, DASH],
            ] as const
          ).map(([label, w, cls, dash]) => (
            <Cell key={label} label={label}>
              <svg aria-hidden width="96" height="20" className={cls}>
                <path d="M2 10 H94" stroke="currentColor" strokeWidth={w} strokeDasharray={dash} strokeLinecap="round" />
              </svg>
            </Cell>
          ))}
        </div>
      </Section>

      <Section
        id="emphasis"
        title="Focus, changed and lands here"
        note="Three emphases that never look alike (Q9). Focus: the only offset ring, 2 px lime-500, 2 px away from the shape. Changed this step (`changed`): the glyph keeps its own role hue, doubles its own edge with an inset ring and takes its own tint; never lime (event-loop chips). Lands here (`now`): lime marks only the current code line, a traced path, the primary action and where a payoff lands, such as the correct choice or the list-keys row that receives the check."
      >
        <div className="flex flex-wrap items-start gap-8">
          <Cell label="chip, rest">
            <span className={cn('flex h-7 items-center border px-1.5', radius.chip.cls, typeScale.value.cls, ink.base, stroke.queued, surface.glyph)}>
              cb B
            </span>
          </Cell>
          <Cell label="changed: task">
            <span className={cn('flex h-7 items-center border px-1.5', radius.chip.cls, typeScale.value.cls, ink.base, surface.glyph, stroke.queued, changed.queued)}>
              cb B
            </span>
          </Cell>
          <Cell label="changed: microtask">
            <span className={cn('flex h-7 items-center border px-1.5', radius.chip.cls, typeScale.value.cls, ink.base, surface.glyph, stroke.micro, changed.micro)}>
              cb C
            </span>
          </Cell>
          <Cell label="changed: stack frame">
            <span className={cn('flex h-7 items-center border px-1.5', radius.chip.cls, typeScale.value.cls, ink.base, surface.glyph, stroke.line, changed.neutral)}>
              script
            </span>
          </Cell>
          <Cell label="lands here: card">
            <span className={cn('flex h-7 items-center border px-2', radius.glyph.cls, typeScale.item.cls, ink.base, now.glyph)}>
              Buy milk
            </span>
          </Cell>
          <Cell label="lands here: correct choice">
            <ChoiceRow className="w-40" index={1} label="C, from .then" state="resolved" mark="right" />
          </Cell>
          <Cell label="control, focus">
            <Force state="focus">
              <Button variant="secondary">
                <BackIcon />
                <span>Back</span>
              </Button>
            </Force>
          </Cell>
          <Cell label="region, now">
            <span className={cn('flex h-11 w-40 items-center border p-2', radius.row.cls, stroke.hairline, surface.panel, now.panel, typeScale.label.cls, ink.secondary)}>
              Microtasks
            </span>
          </Cell>
          <Cell label="lands here and focus">
            <Force state="focus">
              <span tabIndex={-1} className={cn('flex h-7 items-center border px-2 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-500', radius.glyph.cls, typeScale.item.cls, ink.base, now.glyph)}>
                Buy milk
              </span>
            </Force>
          </Cell>
        </div>
      </Section>

      <Section
        id="button"
        title="Button"
        note="The platform Button variants at a 44 px target: primary (Next and Replay, the platform's own main action, Q12), secondary (Back, Restart, Play, actions), text (Skip). Hover applies only on devices that hover; press is one more step (R13). A control that cannot act looks unavailable, always (Q2): Next while a question is open is the outline variant at the same reduced treatment as Back at Start."
      >
        <div className="grid gap-6">
          {buttons.map((b, k) => (
            <div key={k} className="flex flex-wrap gap-6">
              {STATES.map((st) => (
                <Cell key={st} label={`${b.variant}${b.icon ? ' icon' : ''} · ${st}`}>
                  {inState(
                    st,
                    <Button variant={b.variant} size={b.icon ? 'icon' : 'default'} unavailable={st === 'unavailable'} aria-label={b.icon ? 'icon' : undefined}>
                      {b.node}
                    </Button>,
                  )}
                </Cell>
              ))}
            </div>
          ))}
        </div>
      </Section>

      <Section id="segmented" title="Segmented control" note="The LessonStatus pattern: a radiogroup with one tab stop; arrows, Home and End move and select.">
        <div className="flex flex-wrap gap-6">
          {(['rest', 'hover', 'press', 'focus', 'unavailable'] as const).map((st) => (
            <Cell key={st} label={st === 'hover' || st === 'press' ? `${st} (on Drain)` : st}>
              {inState(
                st,
                <SegmentedControl
                  label={`Example ${st}`}
                  options={[
                    { id: 'basics', label: 'Basics' },
                    { id: 'drain', label: 'Drain' },
                  ]}
                  value={0}
                  onChange={noop}
                  interactive={st !== 'unavailable'}
                />,
              )}
            </Cell>
          ))}
          <Cell label="three options">
            <SegmentedControl
              label="Key strategy"
              options={[
                { id: 'index', label: 'index' },
                { id: 'id', label: 'id' },
                { id: 'random', label: 'Math.random()' },
              ]}
              value={1}
              onChange={noop}
            />
          </Cell>
        </div>
      </Section>

      <Section id="choice" title="Choice row" note="Checkpoint choices (Q3 to Q5): the outline control with a quiet numeral that teaches the 1 to 4 keys. A locked-in pick is the selected segment; on the reveal the correct choice gets ✓ on the lime tint with full ink, every other choice drops to muted ink, and a wrong pick shows ×. Labels wrap, never truncate. Never amber.">
        <div className="grid max-w-3xl grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
          <Cell label="rest">
            <ChoiceRow className="w-44" index={0} label="B, from the timer" />
          </Cell>
          <Cell label="hover">
            <Force state="hover">
              <ChoiceRow className="w-44" index={0} label="B, from the timer" />
            </Force>
          </Cell>
          <Cell label="press">
            <Force state="press">
              <ChoiceRow className="w-44" index={0} label="B, from the timer" />
            </Force>
          </Cell>
          <Cell label="focus">
            <Force state="focus">
              <ChoiceRow className="w-44" index={0} label="B, from the timer" />
            </Force>
          </Cell>
          <Cell label="prompt, last time">
            <div className="w-72">
              <PromptBlock live={false} prompt="What logs after D?" note={lastTimeText('C')} noteReserve={NUDGE_TEXT} />
            </div>
          </Cell>
          <Cell label="prompt, nudge after Next (Q2)">
            <div className="w-72">
              <PromptBlock live={false} prompt="Which logs last?" note={NUDGE_TEXT} noteReserve={NUDGE_TEXT} />
            </div>
          </Cell>
          <Cell label="wraps (Q5)">
            <ChoiceRow className="w-44" index={2} label="micro 2 (microtask) then timeout" />
          </Cell>
          <Cell label="locked in (picked, no verdict yet)">
            <ChoiceRow className="w-44" index={1} label="B" state="resolved" picked />
          </Cell>
          <Cell label="locked in: not picked">
            <ChoiceRow className="w-44" index={2} label="C" state="resolved" />
          </Cell>
          <Cell label="picked, wrong">
            <ChoiceRow className="w-44" index={0} label="B, from the timer" state="resolved" picked mark="wrong" />
          </Cell>
          <Cell label="not picked, not the answer">
            <ChoiceRow className="w-44" index={0} label="B, from the timer" state="resolved" />
          </Cell>
          <Cell label="answer, not picked">
            <ChoiceRow className="w-44" index={1} label="C, from .then" state="resolved" mark="right" />
          </Cell>
          <Cell label="picked, right">
            <ChoiceRow className="w-44" index={1} label="C, from .then" state="resolved" picked mark="right" />
          </Cell>
          <Cell label="unavailable">
            <ChoiceRow className="w-44" index={3} label="It’s lost" state="unavailable" />
          </Cell>
          <Cell label="code label">
            <ChoiceRow className="w-44" index={0} label="count 7" mono />
          </Cell>
        </div>
        <div className="mt-6 grid max-w-3xl gap-6 [container:vz/inline-size]">
          <Cell label="checkpoint block: the choice row with Skip trailing (Q4)">
            <CheckpointBlock
              ghost
              labels={['A', 'B', 'C', 'D']}
              text={<PromptBlock live={false} prompt="Which logs last?" note={null} noteReserve={NUDGE_TEXT} />}
              choices={['A', 'B', 'C', 'D'].map((l, i) => (
                <ChoiceRow key={l} index={i} label={l} tabIndex={-1} />
              ))}
              skip={<SkipButton tabIndex={-1} />}
            />
          </Cell>
        </div>
      </Section>

      <Section id="tag" title="Tag" note="Sans 12/500, always in flow, never on a border. Tones follow the roles.">
        <div className="flex flex-wrap gap-6">
          {(['neutral', 'muted', 'now', 'removed'] as TagTone[]).map((t) => (
            <Cell key={t} label={t}>
              <Tag tone={t}>{t === 'removed' ? '× unmounted' : t === 'now' ? 'new' : t === 'muted' ? 'last time' : 'kept'}</Tag>
            </Cell>
          ))}
          <Cell label="inside a chip">
            <span className={cn('flex h-7 items-center gap-2 border px-2', radius.chip.cls, typeScale.value.cls, ink.base, stroke.micro, surface.chipMicro)}>
              then cb
              <Tag tone="now" className="h-4 bg-transparent px-0">
                new
              </Tag>
            </span>
          </Cell>
        </div>
      </Section>

      <Section
        id="feedback"
        title="Feedback and recap"
        note="One feedback style in every visual (R4): the caption, led by a semibold verdict. The recap reuses it."
      >
        <div className="grid max-w-2xl gap-3">
          <Feedback lead="Right." body="C logs before B: the microtask queue drains before the next task." />
          <Feedback lead="Not quite." body="B waits in the task queue until every microtask has run." />
          <Feedback lead="" body="Replay to make the prediction yourself." />
        </div>
      </Section>

      <Section
        id="select"
        title="Select fallback"
        note="Segments that do not fit their container become the platform select (A2). Forced here by a narrow container and by more options than maxSegments."
      >
        <div className="flex flex-wrap items-start gap-6">
          <Cell label="narrow container">
            <div className="w-36">
              <SegmentedControl
                label="Example narrow"
                options={[
                  { id: 'basics', label: 'Basics' },
                  { id: 'drain', label: 'Microtask drain' },
                ]}
                value={0}
                onChange={noop}
              />
            </div>
          </Cell>
          <Cell label="over maxSegments">
            <SegmentedControl
              label="Action"
              options={[
                { id: 'insert-top', label: 'Insert at top' },
                { id: 'delete-first', label: 'Delete first' },
                { id: 'append', label: 'Append' },
                { id: 'reverse', label: 'Reverse' },
              ]}
              value={1}
              onChange={noop}
              maxSegments={3}
            />
          </Cell>
          <Cell label="focus">
            <Force state="focus">
              <div className="w-36">
                <SegmentedControl
                  label="Example focus"
                  options={[
                    { id: 'basics', label: 'Basics' },
                    { id: 'drain', label: 'Microtask drain' },
                  ]}
                  value={0}
                  onChange={noop}
                />
              </div>
            </Force>
          </Cell>
        </div>
      </Section>

      <Section
        id="scrubber"
        title="Scrubber"
        note="Track in the line role, progress and thumb in the accent, a tick per step, a diamond on each checkpoint (hollow open, filled answered, crossed skipped); the diamond sits on the step where its question is asked, and the thumb carries the diamond it sits on. Hover a rail to see the step tooltip, beside the thumb on the track (it never covers text)."
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <Cell label="start, open checkpoint">
            <SpecimenScrubber index={0} checkpoints={[{ at: 5, status: 'open' }]} />
          </Cell>
          <Cell label="mid, answered and skipped">
            <SpecimenScrubber
              index={4}
              checkpoints={[
                { at: 2, status: 'answered' },
                { at: 6, status: 'skipped' },
              ]}
            />
          </Cell>
          <Cell label="on a checkpoint">
            <SpecimenScrubber index={5} checkpoints={[{ at: 5, status: 'answered' }]} />
          </Cell>
          <Cell label="unavailable">
            <SpecimenScrubber index={2} interactive={false} checkpoints={[{ at: 5, status: 'open' }]} />
          </Cell>
          <Cell label="focus">
            <Force state="focus">
              <SpecimenScrubber index={3} checkpoints={[{ at: 5, status: 'open' }]} />
            </Force>
          </Cell>
          <Cell label="tooltip">
            <span className={tooltipCls}>4 · Run the microtask</span>
          </Cell>
        </div>
      </Section>

      <Section
        id="code"
        title="Code pane"
        note="github-dark tokens on zinc-900, the current line lit with the now bar and ▸, line numbers at every width (Q7). Long lines soft-wrap with a hanging indent and a white/10 continuation hairline (A4). A step the host runs says so beside its name in the step bar, not under the code (Q15)."
      >
        <div className="grid gap-6 md:grid-cols-2">
          <Cell label="current line 2">
            <div className="grid w-80 max-w-full">
              <CodePane lines={CODE.lines} tokens={CODE.tokens} line={2} anchor={2} rows={{ narrow: 5, wide: 5 }} animate={false} />
            </div>
          </Cell>
          <Cell label="host step (note)">
            <div className="grid w-80 max-w-full">
              <CodePane lines={CODE.lines} tokens={CODE.tokens} line="host" anchor={5} rows={{ narrow: 5, wide: 5 }} animate={false} hostNote />
            </div>
          </Cell>
          <Cell label="soft wrap, current wrapped line">
            <div className="grid w-64 max-w-full">
              <CodePane
                lines={LONG_CODE}
                line={1}
                anchor={1}
                rows={{ narrow: codeRows(LONG_CODE, 26), wide: codeRows(LONG_CODE, 26) }}
                animate={false}
              />
            </div>
          </Cell>
          <Cell label="finale: traced lines">
            <div className="grid w-80 max-w-full">
              <CodePane
                lines={CODE.lines}
                tokens={CODE.tokens}
                rows={{ narrow: 5, wide: 5 }}
                animate={false}
                trace={{ lines: [1, 5, 4, 2], delaysMs: [0, 0, 0, 0] }}
              />
            </div>
          </Cell>
        </div>
      </Section>

      <Section
        id="lanes"
        title="Lanes and chips"
        note="Borderless panels on the frame (R2). One lane anatomy per variant (Q8): labels in the same place, tokens from the same x and first row. Chips share one neutral fill with the lane hue on the edge only (R1); a changed chip doubles its edge and takes its own tint, in its own hue, never lime (Q9); host chips are dashed; a collapsed tail reads +N more."
      >
        <div className="grid gap-2">
          <SpecimenLane stack label="Call stack" kind="frame" chips={[{ id: 's1', label: 'script' }, { id: 's2', label: 'cb B' }]} focus={['s2']} />
          <SpecimenLane label="Host (timers)" kind="host" chips={[{ id: 'h1', label: 'timer 0 ms → cb B' }]} focus={['h1']} />
          <SpecimenLane
            label="Microtasks"
            kind="micro"
            chips={[
              { id: 'm1', label: 'then cb' },
              { id: 'm2', label: 'cb micro 2' },
            ]}
            focus={['m2']}
          />
          <SpecimenLane
            label="Tasks"
            kind="task"
            chips={[
              { id: 't1', label: 'timer cb' },
              { id: 't2', label: '+2 more', more: true },
            ]}
            focus={['t1']}
          />
          <SpecimenLane label="Tasks (empty)" kind="task" chips={[]} />
        </div>
      </Section>

      <Section
        id="checkbox"
        title="Checkbox"
        note="List keys: a real checkbox in each Before card, a drawn box in each After card (unknown is dashed, a socket waits for a landing check). Checked is ink on screen and a drawn tick on paper (R10)."
      >
        <div className="flex flex-wrap items-start gap-6">
          <Cell label="unchecked">
            <label className="flex h-11 items-center">
              <CheckBox input={{ checked: false, onChange: noop, 'aria-label': 'unchecked' }} shown={false} />
            </label>
          </Cell>
          <Cell label="checked">
            <label className="flex h-11 items-center">
              <CheckBox input={{ checked: true, onChange: noop, 'aria-label': 'checked' }} shown />
            </label>
          </Cell>
          <Cell label="drawn: checked">
            <CheckBox state />
          </Cell>
          <Cell label="drawn: empty">
            <CheckBox state={false} />
          </Cell>
          <Cell label="drawn: unknown">
            <CheckBox state="?" />
          </Cell>
          <Cell label="drawn: socket">
            <CheckBox state="slot" />
          </Cell>
        </div>
      </Section>

      <Section id="text" title="Caption, prompt, disclosure and provenance">
        <div className="grid max-w-2xl gap-4">
          <Caption>
            The timer callback waits in the task queue: microtasks always drain first, so C logs before B even though the
            timer was set first.
          </Caption>
          <p className={promptCls}>What logs after D?</p>
          <div className="relative">
            <Disclosure summary="Steps as text">
              <Caption>Start. The script is about to run.</Caption>
            </Disclosure>
            <Provenance runtimes={['Node 24.x']} />
          </div>
          <div className="flex flex-wrap gap-6">
            {(['hover', 'focus'] as const).map((st) => (
              <Cell key={st} label={`disclosure · ${st}`}>
                <Force state={st}>
                  <Disclosure summary="Diagram as text">
                    <span />
                  </Disclosure>
                </Force>
              </Cell>
            ))}
          </div>
        </div>
      </Section>
    </Frame>
  )
}
