import { describe, expect, it } from 'vitest'
import { validateStepLog } from '../../step-log/validate'
import { buildLog, stateOf } from './build'
import { swDescriptor } from './descriptor'
import { swMetrics, fitProblems } from './layout'
import { SLOTS, swIntrospection } from './model'
import { SW_SCENARIOS, type SwRecording } from './programs/scenarios'
import { SW_RECORDING, firstInstallSpec, skipWaitingSpec, updateSpec } from './presets/service-workers'
import { claimProblems } from './truth/claims'
import { SW_GENERATOR } from './truth/generator'
import { chromiumAvailable, recordSw, scenariosHash } from './truth/record'

/**
 * The service-worker lifecycle truth (spec P6). With Playwright's Chromium
 * installed, a fresh run of every scenario must equal the committed
 * recording; everywhere, the recording must be of the scenarios and worker
 * in the repo, every preset must be its recording rebuilt, the lesson's
 * claims must hold in it (and fail on tampered copies), and each checkpoint's
 * answer must be what its reveal step draws.
 */

const SPECS = [updateSpec, skipWaitingSpec, firstInstallSpec]
const clone = (r: SwRecording): SwRecording => JSON.parse(JSON.stringify(r))
const hasChromium = chromiumAvailable()

describe('sw-lifecycle recording', () => {
  it.skipIf(!hasChromium)(
    'a fresh Chromium run of every scenario equals the committed recording',
    async () => {
      const { runtime, browser, ...fresh } = await recordSw()
      const { browser: committed, ...want } = SW_RECORDING
      expect(browser).toMatch(/^chromium@/)
      expect(committed).toMatch(/^chromium@/)
      expect(runtime).toMatch(/^node@24\./)
      expect(fresh).toEqual(want)
      expect(claimProblems({ ...fresh, browser })).toEqual([])
    },
    300_000,
  )

  it('says why the re-recording skipped (no Chromium)', () => {
    if (!hasChromium) console.info('sw-lifecycle: re-recording skipped: Playwright Chromium is not installed (npx playwright install chromium)')
  })

  it('is a recording of the scenarios and the worker in the repo, by this recorder', () => {
    expect(SW_RECORDING.generator).toBe(SW_GENERATOR)
    expect(SW_RECORDING.sha256).toBe(scenariosHash())
    expect(Object.keys(SW_RECORDING.scenarios).sort()).toEqual(SW_SCENARIOS.map((s) => s.id).sort())
    for (const s of SW_SCENARIOS)
      expect(SW_RECORDING.scenarios[s.id].map((x) => x.as)).toEqual(s.actions.flatMap((a) => (a.do === 'snap' ? [a.as] : [])))
  })

  it('the lesson’s claims hold in the committed recording', () => {
    expect(claimProblems(SW_RECORDING)).toEqual([])
  })

  it('lies fail: a reload that hands over, a skipWaiting that leaves B on v1, a first visit controlled without claim, claim moving tabs', () => {
    const lies: [string, (r: SwRecording) => void][] = [
      ['reload hands over', (r) => (r.scenarios['update-and-reload'].find((x) => x.as === 'reload-a')!.snap.tabs.A.controller = 'v2')],
      ['only-tab reload hands over', (r) => (r.scenarios['update-and-reload'].find((x) => x.as === 'reload-b')!.snap.tabs.B.controller = 'v2')],
      ['skipWaiting leaves B', (r) => (r.scenarios['skip-waiting'].find((x) => x.as === 'activating')!.snap.tabs.B.controller = 'v1')],
      ['no controllerchange', (r) => (r.scenarios['skip-waiting'].find((x) => x.as === 'activating')!.snap.tabs.A.changes = 0)],
      ['first visit controlled', (r) => (r.scenarios['first-install'].find((x) => x.as === 'activated')!.snap.tabs.A.controller = 'v1')],
      ['claim moves tabs', (r) => (r.scenarios['skip-waiting-claim'].find((x) => x.as === 'installing')!.snap.tabs.B.changes = 1)],
      ['v2 activates early', (r) => {
        const s = r.scenarios['update-and-reload'].find((x) => x.as === 'close-a')!.snap
        s.slots.active = { v: 'v2', state: 'activated' }
        s.slots.waiting = null
      }],
    ]
    for (const [name, lie] of lies) {
      const r = clone(SW_RECORDING)
      lie(r)
      expect(claimProblems(r).length, name).toBeGreaterThan(0)
    }
  })
})

describe('sw-lifecycle presets', () => {
  it('every preset is its recording rebuilt: one step per snapshot, each state the snapshot', () => {
    for (const spec of SPECS) {
      const p = swDescriptor.presets.find((x) => `sw-lifecycle/${x.id}` === spec.id)!
      const rebuilt = buildLog(spec)
      expect(p.log).toEqual(rebuilt)
      const run = SW_RECORDING.scenarios[spec.scenario]
      expect(p.log.steps.length).toBe(run.length)
      p.log.steps.forEach((s, i) => {
        const { marked: _m, ...state } = s.state
        expect(state, `${spec.id} step ${i}`).toEqual(stateOf(run[i].snap))
      })
      expect(p.log.source.sha256).toBe(SW_RECORDING.sha256)
    }
  })

  it('passes the step-log lint and the descriptor’s fit', () => {
    for (const p of swDescriptor.presets) expect(validateStepLog(p.log, swIntrospection), p.id).toEqual([])
    expect(fitProblems(swDescriptor.presets.map((p) => p.log))).toEqual([])
    expect(() => swMetrics(swDescriptor.presets.map((p) => p.log))).not.toThrow()
  })

  it('each checkpoint’s answer is what its reveal step draws', () => {
    const at = (id: string) => swDescriptor.presets.find((p) => p.id === id)!.log
    const upd = at('update-and-reload')
    expect(upd.checkpoints[0].answer).toBe(upd.steps[upd.checkpoints[0].beforeStep].state.tabs.A.controller)
    const skip = at('skipWaiting')
    expect(skip.checkpoints[0].answer).toBe(skip.steps[skip.checkpoints[0].beforeStep].state.tabs.B.controller)
    const first = at('first-install-claim')
    expect(first.steps[first.checkpoints[0].beforeStep].state.tabs.A.controller).toBeNull()
    expect(first.checkpoints[0].answer).toBe('none')
  })

  it('the captions name what the step draws (controllers, slots, caches)', () => {
    for (const p of swDescriptor.presets)
      for (const s of p.log.steps) {
        const text = `${s.event} ${s.why} ${s.narration}`
        for (const v of ['v1', 'v2'] as const) {
          const drawn = SLOTS.some((k) => s.state.slots[k].some((w) => w.v === v)) || s.state.redundant.some((w) => w.v === v)
          if (!drawn) expect(text, `${p.id}: "${s.event}" names ${v}, which is not on stage`).not.toMatch(new RegExp(`\\b${v}\\b`))
        }
        // "A reloads: still v1", "A reloads under v1", "New tab: v2 controls": the tab's controller is that worker.
        const still = s.event.match(/^([AB]) reloads(?:: still| under) (v\d)/)
        if (still) expect(s.state.tabs[still[1] as 'A' | 'B'].controller, s.event).toBe(still[2])
        const fresh = s.event.match(/^New tab: (v\d) controls/)
        if (fresh) expect(s.state.tabs.A.controller, s.event).toBe(fresh[1])
      }
  })

  it('lies fail: a recording where a worker sits in two slots cannot build a sound state', () => {
    const r = clone(SW_RECORDING)
    const snap = r.scenarios['update-and-reload'][2].snap
    snap.slots.active = { v: 'v2', state: 'activated' }
    const state = stateOf(snap)
    const seen = SLOTS.flatMap((k) => state.slots[k].map((w) => w.v))
    expect(new Set(seen).size).toBeLessThan(seen.length)
    // The committed recording never does.
    for (const run of Object.values(SW_RECORDING.scenarios))
      for (const { snap: s } of run) {
        const vs = SLOTS.flatMap((k) => stateOf(s).slots[k].map((w) => w.v))
        expect(new Set(vs).size).toBe(vs.length)
      }
  })
})
