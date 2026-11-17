// @vitest-environment node
import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { loadProgram, skipNote } from '../../step-log/lesson-block'
import { dispatchPanel, sequencePanel, timelinePanel } from './build'
import { lanesDescriptor } from './descriptor'
import { layoutDispatch, layoutLanes, layoutSequence, pack } from './layout'
import type { DispatchPanel, SequencePanel, SetsPanel, TimelinePanel } from './model'
import { DISPATCH_HTML, DISPATCH_JS, DISPATCH_SCENARIOS } from './programs/dispatch'
import { pkceSource } from './programs/pkce'
import { timersSource } from './programs/timers'
import { TYPE_CASES } from './programs/types'
import { LANES_RECORDINGS, debounceVsThrottle, dispatchData, eventDispatchPath, oauthPkceChannels, pkceData, timersData, typesData, unionVsIntersection } from './presets'
import { recordDispatch, recordPkce, recordTimers, recordTypes } from './truth/record'

/**
 * The lanes figures are recordings: the timeline's marks are the events of
 * the lesson's debounce and throttle on a controlled clock, the dispatch
 * badges the listener calls of a trusted click in Chromium, the sequence's
 * messages the hops of the answer's OAuth routes against a local token
 * endpoint, the sets' verdicts tsc's diagnostics. With the content checkout
 * each is re-recorded (the dispatch also needs Playwright's Chromium); the
 * tsc cases are the register's own code and always re-run. Everywhere each
 * preset is rebuilt from its recording, the register's assertions are
 * checked and lies must fail.
 */

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x))
const timers = loadProgram(timersSource)
const pkce = loadProgram(pkceSource)
const html = loadProgram([DISPATCH_HTML])
const js = loadProgram([DISPATCH_JS])

describe('lanes recordings', () => {
  it.skipIf(!timers.ok)('debounce/throttle: a fresh Node 24 run equals the committed recording', () => {
    if (!timers.ok) return
    const { runtime, ...rec } = recordTimers(timers.text)
    expect(runtime).toMatch(/^node@24\./)
    expect(rec).toEqual(LANES_RECORDINGS.timers)
  })

  it.skipIf(!pkce.ok)('PKCE: a fresh Node 24 run equals the committed recording', () => {
    if (!pkce.ok) return
    const { runtime, ...rec } = recordPkce(pkce.text)
    expect(runtime).toMatch(/^node@24\./)
    expect(rec).toEqual(LANES_RECORDINGS.pkce)
  })

  it.skipIf(!html.ok || !js.ok)('dispatch: a fresh trusted click in Chromium equals the committed recording', async () => {
    if (!html.ok || !js.ok) return
    const { runtime, browser, ...rec } = await recordDispatch(html.text, js.text, DISPATCH_SCENARIOS)
    const { browser: committed, ...want } = LANES_RECORDINGS.dispatch
    expect(browser).toMatch(/^chromium@/)
    expect(committed).toMatch(/^chromium@/)
    expect(runtime).toMatch(/^node@24\./)
    expect(rec).toEqual(want)
  }, 60_000)

  it('advanced types: a fresh tsc run equals the committed recording (the register code is in the repo)', async () => {
    expect(await recordTypes(TYPE_CASES)).toEqual(LANES_RECORDINGS.types)
  })

  it('says why a re-recording skipped (no content checkout)', () => {
    for (const l of [timers, pkce, html, js]) if (!l.ok) console.info(`lanes: re-recording skipped: ${skipNote(l.missing)}`)
    expect(true).toBe(true)
  })

  it('every preset is its recording, rebuilt', () => {
    expect(timersData(LANES_RECORDINGS.timers)).toEqual(debounceVsThrottle.data)
    expect(dispatchData(LANES_RECORDINGS.dispatch)).toEqual(eventDispatchPath.data)
    expect(pkceData(LANES_RECORDINGS.pkce)).toEqual(oauthPkceChannels.data)
    expect(typesData(LANES_RECORDINGS.types)).toEqual(unionVsIntersection.data)
    expect(lanesDescriptor.presets).toHaveLength(4)
  })
})

describe('debounce-vs-throttle (performance-optimization)', () => {
  const [calls, debounce, throttle] = (debounceVsThrottle.data.panels[0] as TimelinePanel).rows
  const at = (r: typeof debounce, kind: string) => r.marks.filter((m) => m.kind === kind).map((m) => (m.label ? `${m.label}@${m.t}` : m.t))

  it('the register: calls a..e at 0..40 and f at 150', () => {
    expect(at(calls, 'call')).toEqual(['a@0', 'b@10', 'c@20', 'd@30', 'e@40', 'f@150'])
  })

  it('trailing debounce: deadlines 100..130 cleared, runs e at 140, then f at 250', () => {
    expect(at(debounce, 'ghost')).toEqual([100, 110, 120, 130])
    expect(at(debounce, 'invoke')).toEqual(['e@140', 'f@250'])
    expect(debounce.bands).toEqual([])
  })

  it('leading-only throttle: a at 0, b..e dropped, the gate opens at 100 with no call, f at 150', () => {
    expect(at(throttle, 'invoke')).toEqual(['a@0', 'f@150'])
    expect(at(throttle, 'drop')).toEqual(['b@10', 'c@20', 'd@30', 'e@40'])
    expect(at(throttle, 'release')).toEqual([100, 250])
    expect(throttle.bands.map((b) => [b.from, b.to])).toEqual([
      [0, 100],
      [150, 250],
    ])
  })

  it('lies fail: a recording whose burst is not the register’s, or a debounce that ran early', () => {
    const r = clone(LANES_RECORDINGS.timers)
    ;(r.debounce[0] as unknown as [string, number, string])[1] = 5
    expect(() => timelinePanel(r, '')).toThrow(/burst/)
    const early = clone(LANES_RECORDINGS.timers)
    const i = early.debounce.findIndex((e) => e[0] === 'invoke')
    ;(early.debounce[i] as unknown as [string, number, string])[1] = 100
    expect(timersData(early)).not.toEqual(debounceVsThrottle.data)
  })
})

describe('event-dispatch-path (event-handling)', () => {
  const [main, atTarget, inCapture] = eventDispatchPath.data.panels as DispatchPanel[]

  it('the path is the real one: window, document, html, body, #outer, #middle, #inner', () => {
    expect(main.path).toEqual(['window', 'document', 'html', 'body', '#outer', '#middle', '#inner'])
  })

  it('the register: 1, 2 capture at #outer, #middle; 3 at the target; 4, 5 bubble at #middle, #outer', () => {
    expect(main.steps.map((s) => [s.n, s.at, s.phase])).toEqual([
      [1, '#outer', 1],
      [2, '#middle', 1],
      [3, '#inner', 2],
      [4, '#middle', 3],
      [5, '#outer', 3],
    ])
    expect(main.steps.every((s) => s.ran)).toBe(true)
    expect(eventDispatchPath.programs[0].observed).toEqual(['outer capture', 'middle capture', 'inner target', 'middle bubble', 'outer bubble'])
  })

  it('stopPropagation at the target cuts after 3; in #outer’s capture after 1, so the target never runs', () => {
    expect(atTarget.cutAfter).toBe(3)
    expect(atTarget.steps.filter((s) => s.ran).map((s) => s.n)).toEqual([1, 2, 3])
    expect(inCapture.cutAfter).toBe(1)
    expect(inCapture.steps.filter((s) => s.ran).map((s) => s.n)).toEqual([1])
    expect(layoutDispatch(inCapture).cut).toMatchObject({ vertical: false })
    expect(layoutDispatch(atTarget).cut).toMatchObject({ vertical: true })
  })

  it('compact variants pack beside each other on a phone and beside the path at 768', () => {
    expect(pack(eventDispatchPath.data, 'narrow').map((r) => r.panels)).toEqual([[0], [1, 2]])
    expect(pack(eventDispatchPath.data, 'wide').map((r) => r.panels)).toEqual([[0, 1, 2]])
  })

  it('lies fail: a variant whose logs are not the default’s prefix, or that skips the stopper', () => {
    const r = clone(LANES_RECORDINGS.dispatch)
    r.scenarios['stop-at-target'].logs = ['outer capture', 'inner target']
    expect(() => dispatchPanel(r, 'stop-at-target', { heading: '' })).toThrow(/prefix/)
    const s = clone(LANES_RECORDINGS.dispatch)
    s.scenarios['stop-in-capture'].calls.pop()
    expect(() => dispatchPanel(s, 'stop-in-capture', { heading: '' })).toThrow(/beyond/)
  })
})

describe('oauth-pkce-channels (frontend-development/security)', () => {
  const p = oauthPkceChannels.data.panels[0] as SequencePanel
  const msg = (n: number) => p.messages.find((m) => m.n === n)!

  it('RFC 6749 4.1 / RFC 7636: the authorization request carries client_id, code_challenge (S256), state; the redirect back code and state', () => {
    expect(msg(1)).toMatchObject({ from: 'browser', to: 'auth', channel: 'front' })
    expect(msg(1).params).toEqual(expect.arrayContaining(['client_id', 'redirect_uri', 'response_type', 'code_challenge', 'code_challenge_method', 'state']))
    expect(msg(3)).toMatchObject({ from: 'auth', to: 'browser', channel: 'front', params: ['code', 'state'] })
  })

  it('the token request is back channel with code + code_verifier (+ client_secret); tokens return to the app only', () => {
    expect(msg(4)).toMatchObject({ from: 'app', to: 'auth', channel: 'back' })
    expect(msg(4).params).toEqual(expect.arrayContaining(['code', 'code_verifier', 'client_secret', 'grant_type']))
    expect(msg(5)).toMatchObject({ from: 'auth', to: 'app', channel: 'back', params: ['access_token', 'id_token'] })
    expect(p.messages.filter((m) => m.channel === 'front').flatMap((m) => m.params)).not.toEqual(expect.arrayContaining(['code_verifier']))
    expect(p.holds.browser).toEqual(['state', 'code_challenge', 'code'])
    expect(LANES_RECORDINGS.pkce.holds).toMatchObject({ challengeIsS256: true, verifierInFront: false, tokensInFront: false })
  })

  it('S256 is base64url(sha256(verifier)) by node:crypto (RFC 7636 appendix B vector)', () => {
    const v = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
    expect(createHash('sha256').update(v).digest('base64url')).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')
  })

  it('state and PKCE defend: a forged state gets 400, a stolen code without the verifier gets invalid_grant', () => {
    expect(LANES_RECORDINGS.pkce.attacks).toEqual({ forgedState: 400, codeWithoutVerifier: 'invalid_grant' })
  })

  it('lies fail: a verifier in the front channel would be held by the browser; message labels fit their room', () => {
    const r = clone(LANES_RECORDINGS.pkce)
    r.hops.find((h) => h.n === 3)!.params.push('code_verifier')
    expect(sequencePanel(r, { heading: '', titles: {}, signIn: '', notes: [] }).holds.browser).toContain('code_verifier')
    for (const w of [288, 606]) expect(() => layoutSequence(p, w)).not.toThrow()
  })
})

describe('union-vs-intersection (advanced-types)', () => {
  const [values, members, never] = unionVsIntersection.data.panels as SetsPanel[]
  const diag = (id: string) => LANES_RECORDINGS.types.cases[id].map((d) => d.code)

  it('the register: u.a on A | B is TS2339; the incomplete intersection literal is TS2322 (b missing)', () => {
    expect(diag('union-a-read')).toEqual([2339])
    expect(diag('inter-a')).toEqual([2322])
    expect(LANES_RECORDINGS.types.cases['inter-a'][0].message).toMatch(/Property 'b' is missing/)
    expect(LANES_RECORDINGS.types.tsc).toMatch(/^5\.9\./)
  })

  it('A | B admits all three values, A & B only the one with every member', () => {
    expect(values.mode === 'values' && [values.union, values.both.label]).toEqual(['A | B: 3 of 3', 'A & B: 1 of 3'])
    expect(members.mode === 'members' && members.cards.map((c) => c.members)).toEqual([
      ['shared', 'a TS2339', 'b TS2339'],
      ['a', 'b', 'shared'],
    ])
  })

  it("{kind:'a'} & {kind:'b'} and string & number are never; {x:string} & {x:number} is not reduced", () => {
    expect(never.mode === 'never' && never.pairs.map((x) => x.result)).toEqual(['never', 'never', 'not reduced'])
    expect(diag('never-kind-false')).toEqual([2322])
  })

  it('lies fail: an intersection that admitted a partial value cannot be drawn as the overlap', () => {
    const r = clone(LANES_RECORDINGS.types)
    r.cases['inter-a'] = []
    expect(() => typesData(r)).toThrow(/overlap/)
  })
})

describe('lanes layout', () => {
  it('reserves whole pixels for every preset', () => {
    for (const p of lanesDescriptor.presets) {
      const h = layoutLanes(p.data)
      expect(Number.isInteger(h.narrow) && Number.isInteger(h.wide), p.id).toBe(true)
    }
  })
})
