import type { HashedProgram, StaticDescriptor, StaticEngineCore, StaticTextAlternative } from '../../shell/static-types'
import { layoutLanes } from './layout'
import type { DispatchPanel, LanesData, LanesPanel, SequencePanel, SetsPanel, TimelinePanel } from './model'
import { debounceVsThrottle, eventDispatchPath, oauthPkceChannels, unionVsIntersection } from './presets'

/**
 * The lanes substrate without its renderer (wave 3B): React-free, for the
 * registry, the manifest and the tests.
 */

const PHASE = { 1: 'capturing', 2: 'at the target', 3: 'bubbling' } as const

function describeTimeline(p: TimelinePanel): string[] {
  return [
    ...p.rows.map((r) => {
      const say = r.marks.map((m) =>
        m.kind === 'call' ? `${m.label} at ${m.t}` : m.kind === 'ghost' ? `deadline ${m.t} cleared` : m.kind === 'invoke' ? `runs with ${m.label} at ${m.t}` : m.kind === 'drop' ? `${m.label} at ${m.t} dropped` : `gate opens at ${m.t}, nothing runs`,
      )
      const bands = r.bands.map((b) => `gate closed ${b.from} to ${b.to}`)
      return `${r.label}: ${[...say, ...bands].join('; ')}.`
    }),
    ...p.notes.map((n) => `${n}.`),
  ]
}

function describeDispatch(p: DispatchPanel): string[] {
  const lines = [`Path: ${p.path.join(', ')} (the target).`]
  for (const s of p.steps) lines.push(`${s.n}. ${s.at}, ${PHASE[s.phase]} (eventPhase ${s.phase}): logs "${s.log}"${s.ran ? '' : ', skipped'}.`)
  if (p.cutAfter !== undefined) lines.push(`stopPropagation() runs right after listener ${p.cutAfter}; nothing after it runs.`)
  return lines
}

function describeSequence(p: SequencePanel): string[] {
  const name = Object.fromEntries(p.parties.map((x) => [x.id, x.label]))
  const lines = p.messages.map((m) =>
    m.channel === 'self'
      ? `${m.n}. ${m.title} at the ${name[m.from]} (not recorded: the harness stands in for it).`
      : `${m.n}. ${name[m.from]} to ${name[m.to]}, ${m.channel} channel: ${m.title}${m.params.length ? `; carries ${m.params.join(', ')}` : ''}.`,
  )
  for (const x of p.parties) lines.push(`${x.label} holds: ${p.holds[x.id].join(', ') || 'none of these values'}.`)
  return [...lines, ...p.notes.map((n) => `${n[0].toUpperCase()}${n.slice(1)}.`)]
}

function describeSets(p: SetsPanel): string[] {
  if (p.mode === 'values')
    return [
      `A has a and shared; B has b and shared.`,
      `${p.left.sample} is only an A, ${p.right.sample} only a B, ${p.both.sample.join(' ')} both.`,
      `${p.union}: every one of them. ${p.both.label}: only the one that is both (marked).`,
    ]
  if (p.mode === 'members') return [...p.cards.map((c) => `${c.label}${c.marked ? ' (marked)' : ''}: ${c.members.map((m) => (m.includes(' ') ? `${m.split(' ')[0]} is an error (${m.split(' ')[1]})` : `${m} reads`)).join(', ')}.`), ...p.notes.map((n) => `${n[0].toUpperCase()}${n.slice(1)}.`)]
  return [...p.pairs.map((x) => `${x.left} & ${x.right}: ${x.result}.`), ...p.notes.map((n) => `${n[0].toUpperCase()}${n.slice(1)}.`)]
}

function describePanel(p: LanesPanel): string[] {
  if (p.kind === 'timeline') return describeTimeline(p)
  if (p.kind === 'dispatch') return describeDispatch(p)
  if (p.kind === 'sequence') return describeSequence(p)
  return describeSets(p)
}

const MODEL: Record<LanesPanel['kind'], string> = {
  timeline: 'Every mark is an event of a real Node 24 run of the lesson’s debounce and throttle on a controlled clock (no real waiting); real timers can run late.',
  dispatch: 'Recorded from a trusted click in real Chromium: which listener ran, on which element, in which eventPhase. The two stop variants add one listener that calls stopPropagation() right after the lesson’s.',
  sequence: `Recorded from a real Node 24 run of the lesson’s routes against a local stand-in for the authorization server, which checks S256(code_verifier) against the stored challenge. Messages draw the values that matter here; this list names every parameter.`,
  sets: 'Every verdict is a real tsc --strict run on the register’s panel code: which values each type admits, which reads compile, which intersections reduce to never.',
}

export function describeLanes(d: LanesData): Omit<StaticTextAlternative, 'outputs'> {
  return { parts: d.panels.map((p) => ({ heading: p.heading, lines: describePanel(p) })), model: MODEL[d.panels[0].kind] }
}

export const lanesEngineCore: StaticEngineCore<LanesData> = {
  id: 'lanes',
  stageHeight: (d) => layoutLanes(d),
  describe: describeLanes,
}

export const lanesDescriptor: StaticDescriptor<LanesData, HashedProgram> = {
  id: 'lanes',
  form: 'static',
  title: 'Lanes',
  engine: lanesEngineCore,
  presets: [debounceVsThrottle, eventDispatchPath, oauthPkceChannels, unionVsIntersection],
  defaultPreset: 'debounce-vs-throttle',
  since: '2026-11',
}
