'use client'

import type { ReactNode } from 'react'
import { BackIcon, Button, NextIcon, PlayIcon, RestartIcon, type ButtonVariant } from '@/components/visualizations/primitives/Button'
import { Caption, promptCls } from '@/components/visualizations/primitives/Caption'
import { ChoiceRow } from '@/components/visualizations/primitives/ChoiceRow'
import { cn } from '@/components/visualizations/primitives/cn'
import { Disclosure } from '@/components/visualizations/primitives/Disclosure'
import { Frame } from '@/components/visualizations/primitives/Frame'
import { Provenance } from '@/components/visualizations/primitives/Provenance'
import { SegmentedControl } from '@/components/visualizations/primitives/SegmentedControl'
import { Tag, type TagTone } from '@/components/visualizations/primitives/Tag'
import {
  DASH,
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
    { variant: 'text', node: <span>Skip, show me</span> },
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
        title="Focus versus now"
        note="Keyboard focus is the only offset ring: 2 px lime-500, 2 px away from the shape. Now (changed this step) is drawn inside the glyph: a lime-400 border doubled by an inset ring, and a tint. They never look alike."
      >
        <div className="flex flex-wrap items-start gap-8">
          <Cell label="glyph, rest">
            <span className={cn('flex h-7 items-center border px-2', radius.chip.cls, typeScale.value.cls, ink.base, stroke.queued, surface.chipQueued)}>
              timer cb
            </span>
          </Cell>
          <Cell label="glyph, now">
            <span className={cn('flex h-7 items-center border px-2', radius.chip.cls, typeScale.value.cls, ink.base, stroke.queued, now.glyph)}>
              timer cb
            </span>
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
          <Cell label="glyph, now and focus">
            <Force state="focus">
              <span tabIndex={-1} className={cn('flex h-7 items-center border px-2 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-500', radius.chip.cls, typeScale.value.cls, ink.base, stroke.queued, now.glyph)}>
                timer cb
              </span>
            </Force>
          </Cell>
        </div>
      </Section>

      <Section
        id="button"
        title="Button"
        note="The platform Button variants at a 44 px target: filled (Next), secondary (Back, Restart, Play, actions), text (Skip). Hover applies only on devices that hover; press adds 0.98 brightness."
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

      <Section id="choice" title="Choice row" note="Checkpoint choices: the number slot becomes a check or a cross after the answer. Never amber.">
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
          <Cell label="last time">
            <ChoiceRow className="w-44" index={1} label="C, from .then" tag="last time" />
          </Cell>
          <Cell label="two lines">
            <ChoiceRow className="w-44" index={2} label="micro 2 (microtask) then timeout" />
          </Cell>
          <Cell label="picked, wrong">
            <ChoiceRow className="w-44" index={0} label="B, from the timer" state="resolved" picked mark="wrong" />
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
            <ChoiceRow className="w-44" index={0} label="count 7" mono wrap="truncate" />
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

      <Section id="text" title="Caption, prompt, disclosure and provenance">
        <div className="grid max-w-2xl gap-4">
          <Caption>
            The timer callback waits in the task queue: microtasks always drain first, so C logs before B even though the
            timer was set first.
          </Caption>
          <p className={promptCls}>D has logged. What logs next?</p>
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
