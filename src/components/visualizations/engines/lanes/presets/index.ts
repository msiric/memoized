import type { HashedProgram, StaticPreset } from '../../../shell/static-types'
import { dispatchPanel, sequencePanel, timelinePanel, verdict } from '../build'
import type { LanesData, SetsPanel } from '../model'
import type { DispatchRecording } from '../programs/dispatch'
import type { PkceRecording } from '../programs/pkce'
import { WAIT, type TimersRecording } from '../programs/timers'
import type { TypesRecording } from '../programs/types'
import dispatchRec from '../recordings/event-handling.json'
import timersRec from '../recordings/performance-optimization.json'
import pkceRec from '../recordings/security.json'
import typesRec from '../recordings/advanced-types.json'

/**
 * The lanes presets, one per lesson (R4 rows performance-optimization,
 * event-handling, frontend-development/security and advanced-types). Each
 * `data` is built from a committed recording; a preset adds the title, the
 * caption, headings and the words of its notes, whose numbers come from the
 * recording. The truth tests rebuild each from a fresh run.
 */

export type LanesRecordings = { timers: TimersRecording; dispatch: DispatchRecording; pkce: PkceRecording; types: TypesRecording }
export const LANES_RECORDINGS: LanesRecordings = {
  timers: timersRec as unknown as TimersRecording,
  dispatch: dispatchRec as unknown as DispatchRecording,
  pkce: pkceRec as unknown as PkceRecording,
  types: typesRec as unknown as TypesRecording,
}

const program = (id: string, sha256: string, observed: string[] = []): HashedProgram => ({ id, runtime: 'node@24.x', sha256, observed })

// --- Performance Optimization ------------------------------------------------

export function timersData(rec: TimersRecording): LanesData {
  const panel = timelinePanel(rec, `calls a to f, wait ${WAIT} ms`)
  const [, debounce, throttle] = panel.rows
  const runs = (r: typeof debounce) => r.marks.filter((m) => m.kind === 'invoke').map((m) => `${m.label} at ${m.t}`)
  const ghosts = debounce.marks.filter((m) => m.kind === 'ghost').map((m) => m.t)
  const release = throttle.marks.filter((m) => m.kind === 'release').map((m) => m.t)
  panel.notes = [
    `debounce: deadline moved ${ghosts.join(', ')} → ${runs(debounce)[0].split(' at ')[1]}; runs ${runs(debounce).join(', ')}`,
    `throttle: runs ${runs(throttle).join(', ')}; opens at ${release.join(', ')} with no call`,
  ]
  return { panels: [panel] }
}

export const debounceVsThrottle: StaticPreset<LanesData, HashedProgram> = {
  id: 'debounce-vs-throttle',
  label: 'Debounce, throttle',
  title: 'One burst, two policies',
  caption: 'Debounce moves its deadline on every call and runs once after the burst; leading-only throttle runs the first call and drops the rest.',
  programs: [program('debounce-throttle', LANES_RECORDINGS.timers.sha256)],
  claims: [],
  data: timersData(LANES_RECORDINGS.timers),
}

// --- Event Handling ------------------------------------------------------------

export function dispatchData(rec: DispatchRecording): LanesData {
  return {
    panels: [
      dispatchPanel(rec, 'default', { heading: 'click on #inner: listeners 1 to 5' }),
      dispatchPanel(rec, 'stop-at-target', { heading: 'stop at target', compact: true }),
      dispatchPanel(rec, 'stop-in-capture', { heading: 'stop in capture', compact: true }),
    ],
  }
}

export const eventDispatchPath: StaticPreset<LanesData, HashedProgram> = {
  id: 'event-dispatch-path',
  label: 'Dispatch path',
  title: 'Capture down, target, bubble up',
  caption: 'Capture listeners run from window down to the parent, then the target, then bubble listeners back up; stopPropagation() ends the walk.',
  programs: [{ id: 'dispatch', runtime: 'Chromium', sha256: LANES_RECORDINGS.dispatch.sha256, observed: LANES_RECORDINGS.dispatch.scenarios.default.logs }],
  claims: [],
  data: dispatchData(LANES_RECORDINGS.dispatch),
}

// --- Frontend Security -------------------------------------------------------------

export function pkceData(rec: PkceRecording): LanesData {
  return {
    panels: [
      sequencePanel(rec, {
        heading: 'Google sign-in, code + PKCE',
        titles: { 1: 'redirect to sign in', 3: 'redirect back', 4: 'POST /token, state checked', 5: 'tokens, to the app only', 6: "redirect, app's own session" },
        signIn: 'user signs in',
        notes: [
          `state: a forged callback got ${rec.attacks.forgedState}`,
          `PKCE: a stolen code without code_verifier got ${rec.attacks.codeWithoutVerifier}`,
          'implicit flow (old): access_token came back in the URL #fragment, through the browser',
        ],
      }),
    ],
  }
}

export const oauthPkceChannels: StaticPreset<LanesData, HashedProgram> = {
  id: 'oauth-pkce-channels',
  label: 'OAuth + PKCE',
  title: 'What the browser sees in PKCE',
  caption: 'The browser carries only the challenge, state and a one-time code; the verifier, the secret and the tokens travel server to server.',
  programs: [program('pkce', LANES_RECORDINGS.pkce.sha256)],
  claims: [],
  data: pkceData(LANES_RECORDINGS.pkce),
}

// --- Advanced Types --------------------------------------------------------------

const ok = (rec: TypesRecording, id: string) => verdict(rec, id) === 'ok'
const codes = (rec: TypesRecording, id: string) => {
  const v = verdict(rec, id)
  return v === 'ok' ? '' : v.map((c) => `TS${c}`).join(', ')
}

export function typesData(rec: TypesRecording): LanesData {
  const union = ['union-a', 'union-both', 'union-b'].filter((id) => ok(rec, id)).length
  const inter = ['inter-a', 'inter-both', 'inter-b'].filter((id) => ok(rec, id)).length
  if (!ok(rec, 'inter-both') || ok(rec, 'inter-a') || ok(rec, 'inter-b')) throw new Error('the figure draws A & B as the overlap only')
  const values: SetsPanel = {
    kind: 'sets',
    id: 'values',
    heading: 'values each type admits',
    mode: 'values',
    left: { label: 'A', members: 'a, shared', sample: '{a, shared}' },
    right: { label: 'B', members: 'b, shared', sample: '{b, shared}' },
    both: { label: `A & B: ${inter} of 3`, sample: ['{a, b,', 'shared}'] },
    union: `A | B: ${union} of 3`,
    notes: [],
  }
  const readable = (id: string, name: string) => (ok(rec, id) ? name : `${name} ${codes(rec, id)}`)
  const members: SetsPanel = {
    kind: 'sets',
    id: 'members',
    heading: 'members you can read, no narrowing',
    mode: 'members',
    cards: [
      { label: 'u: A | B', members: [readable('union-shared', 'shared'), readable('union-a-read', 'a'), readable('union-b-read', 'b')] },
      { label: 'v: A & B', members: ok(rec, 'inter-reads') ? ['a', 'b', 'shared'] : [], marked: true },
    ],
    notes: ['fewer values, more members', `{a, shared} as A & B: ${codes(rec, 'inter-a')}, b missing`],
  }
  const reduces = (id: string) => (ok(rec, id) ? 'never' : 'not never')
  if (ok(rec, 'never-kind-false')) throw new Error('the never check accepted both answers')
  const never: SetsPanel = {
    kind: 'sets',
    id: 'never',
    heading: 'disjoint: the overlap is never',
    mode: 'never',
    pairs: [
      { left: "{kind:'a'}", right: "{kind:'b'}", result: reduces('never-kind') },
      { left: 'string', right: 'number', result: reduces('never-prims') },
      { left: '{x:string}', right: '{x:number}', result: ok(rec, 'never-x') ? 'not reduced' : 'never' },
    ],
    notes: ['only x is never in the last; the type stays'],
  }
  return { panels: [values, members, never] }
}

export const unionVsIntersection: StaticPreset<LanesData, HashedProgram> = {
  id: 'union-vs-intersection',
  label: 'Union vs intersect',
  title: 'A | B vs A & B for object types',
  caption: 'A | B admits more values but lets you read only shared members; A & B admits fewer values and lets you read every member of both.',
  programs: [{ id: 'tsc', runtime: `TypeScript@${LANES_RECORDINGS.types.tsc}`, sha256: LANES_RECORDINGS.types.sha256, observed: [] }],
  claims: [],
  data: typesData(LANES_RECORDINGS.types),
}
