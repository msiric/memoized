/**
 * The service-worker lifecycle recorder (spec P6): plays each scenario
 * (`../programs/scenarios.ts`) in real Chromium through Playwright against a
 * local server on `localhost` (a secure context), changing the bytes of
 * /worker.js between versions, and records values only:
 *
 * - the registration's installing, waiting and active workers and the
 *   redundant ones, from the DevTools protocol's ServiceWorker domain (read
 *   from an observer page on another origin, so it works with no tab open);
 * - each tab's `navigator.serviceWorker.controller` (the slot whose worker
 *   object it is, so the version is DevTools'), how many `controllerchange` events it saw, and a held
 *   fetch's result;
 * - the origin's Cache Storage names (`caches.keys()` in a tab, or in a
 *   running worker of the origin when no tab is open).
 *
 * With a tab open, the registration that page sees must equal the DevTools
 * one (a cross-check, or the recording fails). A step is recorded once the
 * state has held for four reads 150 ms apart; the worker's gates make the
 * installing and activating states last until released.
 *
 * Node-only: the truth test and `yarn viz:sw` import this.
 */
import fs from 'node:fs'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { chromium } from 'playwright'
import { sha256 } from '../../../step-log/truth'
import { PAGE, SW_SCENARIOS, workerSource, type SwRecording, type SwScenario, type SwSnap, type TabId, type Version } from '../programs/scenarios'
import { SW_GENERATOR } from './generator'

/** The hash a recording carries: the scenarios and every worker they deploy. */
export function scenariosHash(scenarios: readonly SwScenario[] = SW_SCENARIOS): string {
  const workers = scenarios.flatMap((s) => s.actions.flatMap((a) => (a.do === 'deploy' ? [workerSource(a.v, a.opts)] : [])))
  return sha256(JSON.stringify(scenarios) + PAGE + workers.join('\n'))
}

/** True when Playwright's Chromium is installed (CI's unit job has none: the re-recording skips, saying so). */
export function chromiumAvailable(): boolean {
  try {
    return fs.existsSync(chromium.executablePath())
  } catch {
    return false
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

type Cdp = { send(method: string, params?: object): Promise<any>; on(event: string, fn: (p: any) => void): void }

export async function recordSw(scenarios: readonly SwScenario[] = SW_SCENARIOS): Promise<SwRecording & { runtime: string }> {
  const browser = await chromium.launch()
  try {
    const out: SwRecording['scenarios'] = {}
    for (const s of scenarios) out[s.id] = await play(browser, s)
    return { generator: SW_GENERATOR, sha256: scenariosHash(scenarios), browser: `chromium@${browser.version()}`, scenarios: out, runtime: `node@${process.versions.node}` }
  } finally {
    await browser.close()
  }
}

async function play(browser: import('playwright').Browser, s: SwScenario): Promise<{ as: string; snap: SwSnap }[]> {
  let script = ''
  // Whether the browser has fetched the bytes deployed last (its update check ran).
  let served = true
  // Gates the recorder has opened, as `<event>/<version>`.
  const open = new Set<string>()
  const server = http.createServer((q, res) => {
    if (q.url?.startsWith('/gate/')) {
      res.writeHead(200, { 'content-type': 'text/plain', 'cache-control': 'no-store' })
      return res.end(open.has(q.url.slice('/gate/'.length)) ? 'open' : 'shut')
    }
    if (q.url === '/worker.js') {
      served = true
      res.writeHead(200, { 'content-type': 'text/javascript', 'cache-control': 'no-store' })
      return res.end(script)
    }
    res.writeHead(200, { 'content-type': 'text/html', 'cache-control': 'no-store' })
    res.end(q.url === '/observer' ? '<!doctype html><title>observer</title>' : PAGE)
  })
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  const port = (server.address() as AddressInfo).port
  const origin = `http://localhost:${port}`
  const ctx = await browser.newContext()
  try {
    const observer = await ctx.newPage()
    await observer.goto(`http://127.0.0.1:${port}/observer`)
    const cdp = (await ctx.newCDPSession(observer)) as unknown as Cdp
    // versionId -> status, for the registration whose scope is the localhost origin.
    const regs = new Map<string, string>()
    const versions = new Map<string, { reg: string; status: string }>()
    cdp.on('ServiceWorker.workerRegistrationUpdated', ({ registrations }) => {
      for (const r of registrations) regs.set(r.registrationId, r.scopeURL)
    })
    cdp.on('ServiceWorker.workerVersionUpdated', ({ versions: vs }) => {
      for (const v of vs) versions.set(v.versionId, { reg: v.registrationId, status: v.status })
    })
    await cdp.send('ServiceWorker.enable')

    const deployed: Version[] = []
    const tabs = new Map<TabId, import('playwright').Page>()
    const steps: { as: string; snap: SwSnap }[] = []

    const fromDevtools = () => {
      const mine = [...versions.entries()].filter(([, v]) => regs.get(v.reg) === `${origin}/`).sort((a, b) => Number(a[0]) - Number(b[0]))
      if (mine.length > deployed.length) throw new Error(`${s.id}: ${mine.length} worker versions for ${deployed.length} deploys`)
      const slots: SwSnap['slots'] = { installing: null, waiting: null, active: null }
      const redundant: Version[] = []
      mine.forEach(([, v], k) => {
        const ver = deployed[k]
        if (v.status === 'redundant') redundant.push(ver)
        else if (v.status === 'new' || v.status === 'installing') slots.installing = { v: ver, state: 'installing' }
        else if (v.status === 'installed') slots.waiting = { v: ver, state: 'installed' }
        else if (v.status === 'activating' || v.status === 'activated') slots.active = { v: ver, state: v.status }
        else throw new Error(`${s.id}: unknown worker status ${v.status}`)
      })
      return { slots, redundant }
    }

    const read = async (): Promise<SwSnap> => {
      const { slots, redundant } = fromDevtools()
      // With no tab open, Cache Storage is read inside a running worker of the origin (read-only).
      let caches: string[] = []
      if (!tabs.size) {
        const w = ctx.serviceWorkers().filter((x) => x.url().startsWith(origin))
        if (w.length) caches = ((await w[w.length - 1].evaluate('caches.keys()')) as string[]).sort()
      }
      const snap: SwSnap = {
        slots,
        redundant,
        tabs: {
          A: { open: false, controller: null, changes: 0, fetched: null },
          B: { open: false, controller: null, changes: 0, fetched: null },
        },
        caches,
      }
      for (const [id, page] of tabs) {
        const r = (await page.evaluate('window.__sw.read()')) as {
          controller: 'installing' | 'waiting' | 'active' | 'other' | null
          changes: number
          fetched: string | null
          slots: Record<'installing' | 'waiting' | 'active', string | null>
          caches: string[]
        }
        if (r.controller === 'other') throw new Error(`${s.id}: tab ${id} is controlled by a worker in no slot`)
        const controller = r.controller ? (slots[r.controller]?.v ?? null) : null
        snap.tabs[id] = { open: true, controller, changes: r.changes, fetched: r.fetched }
        snap.caches = r.caches
        // The page's view, kept for the cross-check after the state settles.
        ;(snap as SwSnap & { page?: unknown[] }).page = [...(((snap as SwSnap & { page?: unknown[] }).page as unknown[]) ?? []), { id, slots: r.slots, caches: r.caches }]
      }
      return snap
    }

    // After a deploy, a navigation or update() re-fetches /worker.js (the update check): wait for that request, then let the state settle.
    const fetched = async () => {
      for (let t = 0; t < 100 && !served; t++) await sleep(100)
      if (!served) throw new Error(`${s.id}: the browser never re-fetched /worker.js`)
    }

    const settle = async (): Promise<SwSnap> => {
      let last = ''
      let same = 0
      for (let t = 0; t < 100; t++) {
        const snap = await read()
        const key = JSON.stringify(snap)
        same = key === last ? same + 1 : 0
        last = key
        if (same >= 3) return snap
        await sleep(150)
      }
      throw new Error(`${s.id}: the state never settled: ${last}`)
    }

    for (const a of s.actions) {
      if (a.do === 'deploy') {
        script = workerSource(a.v, a.opts)
        served = false
        deployed.push(a.v)
      } else if (a.do === 'open') {
        const page = await ctx.newPage()
        await page.goto(`${origin}/`, { waitUntil: 'load' })
        tabs.set(a.tab, page)
        await settle()
      } else if (a.do === 'reload') {
        await tabs.get(a.tab)!.reload({ waitUntil: 'load' })
        await fetched()
        await settle()
      } else if (a.do === 'close') {
        await tabs.get(a.tab)!.close()
        tabs.delete(a.tab)
      } else if (a.do === 'update') {
        await tabs.get(a.tab)!.evaluate('window.__sw.update()')
        await fetched()
      } else if (a.do === 'release') {
        open.add(`${a.gate}/${a.v}`)
      } else if (a.do === 'fetch') {
        await tabs.get(a.tab)!.evaluate('window.__sw.fetch()')
      } else if (a.do === 'snap') {
        const snap = (await settle()) as SwSnap & { page?: { id: string; slots: Record<string, string | null>; caches: string[] }[] }
        // Cross-check: every open tab sees the registration and caches DevTools reports.
        for (const p of snap.page ?? []) {
          const states = { installing: snap.slots.installing?.state ?? null, waiting: snap.slots.waiting?.state ?? null, active: snap.slots.active?.state ?? null }
          if (JSON.stringify(p.slots) !== JSON.stringify(states))
            throw new Error(`${s.id} ${a.as}: tab ${p.id} sees ${JSON.stringify(p.slots)}, DevTools ${JSON.stringify(snap.slots)}`)
          if (JSON.stringify(p.caches) !== JSON.stringify(snap.caches)) throw new Error(`${s.id} ${a.as}: tab ${p.id} sees caches ${p.caches}, DevTools ${snap.caches}`)
        }
        delete snap.page
        steps.push({ as: a.as, snap })
        if (process.env.SW_DEBUG) console.log(s.id, a.as, JSON.stringify(snap))
      }
    }
    return steps
  } finally {
    await ctx.close()
    server.close()
  }
}
