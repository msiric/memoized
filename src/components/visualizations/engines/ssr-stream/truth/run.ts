/**
 * Child-process entry for the ssr-stream recorder:
 * `node --import tsx run.ts` prints one `SsrRecording` as JSON.
 *
 * React 19 is installed under the aliases `react-19` and `react-dom-19`;
 * every `require('react')` here is redirected to that copy (as the
 * list-keys recorder does). Two parts:
 *
 * - The wire: the visual's app (`app.ts`) through `renderToPipeableStream`
 *   into a stream that records every write and its time; the contrast waits
 *   for both fetches, then writes `renderToString` once.
 * - The browser: the same apps served over HTTP to Chromium (Playwright). A
 *   MutationObserver logs what each slot shows over time; the client bundle
 *   (`client.ts`, esbuild) is held back until the stream has ended, then
 *   hydrates, once untouched and once with a trusted click on Reviews'
 *   button sent as soon as hydration begins (its pointerdown is logged by a
 *   native capture listener, so the recording shows where it landed).
 */
import Module from 'node:module'
import http from 'node:http'
import path from 'node:path'
import { Writable } from 'node:stream'
import type { HydrationEvent, HydrationRun, Scenario, ScreenEntry, SsrRecording, WireChunk } from './types'
import { SSR_GENERATOR } from './types'

const M = Module as unknown as { _resolveFilename: (req: string, ...rest: unknown[]) => string }
const resolve = M._resolveFilename
const ALIAS: Record<string, string> = { react: 'react-19', 'react-dom': 'react-dom-19' }
M._resolveFilename = function (request: string, ...rest: unknown[]) {
  const [pkg, ...sub] = request.split('/')
  const to = ALIAS[pkg]
  return resolve.call(this, to ? [to, ...sub].join('/') : request, ...rest)
}

/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any */
const React = require('react')
const server = require('react-dom/server')
const { makeApps } = require('./app') as typeof import('./app')
const apps = makeApps(React)

/** Client render cost per boundary: long enough that a click lands mid-hydration. */
const BUSY_MS = 200
/** How long the page waits, after load, before its JavaScript is let through. */
const JS_AFTER_MS = 600

const round10 = (n: number) => Math.round(n / 10) * 10
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** The server's writes for one request, each with its time. */
async function wire(kind: 'stream' | 'string'): Promise<WireChunk[]> {
  const t0 = performance.now()
  const out: WireChunk[] = []
  await new Promise<void>((done) => {
    const sink = new Writable({
      write(chunk, _enc, cb) {
        out.push({ ms: round10(performance.now() - t0), html: String(chunk) })
        cb()
      },
    })
    sink.on('finish', () => done())
    if (kind === 'string') {
      // The legacy pattern: fetch everything first (in parallel), then render once.
      void Promise.all([wait(120), wait(80)]).then(() => {
        sink.end(server.renderToString(React.createElement(apps.StringApp)))
      })
      return
    }
    apps.reset()
    const { pipe } = server.renderToPipeableStream(React.createElement(apps.StreamApp), { onShellReady: () => pipe(sink) })
  })
  return out
}

/** Logs what each slot shows whenever the document changes (read back as `screen`). */
const OBSERVE = `<script>window.__log=[];(function(){var last='';function view(n){var c=document.getElementById(n);if(c&&c.isConnected&&!c.closest('[hidden]'))return'content';var t={product:'Loading product',reviews:'Loading reviews'}[n];var f=[].slice.call(document.querySelectorAll('#root p')).filter(function(p){return p.textContent===t&&!p.closest('[hidden]')})[0];return f?'fallback':'none'}function look(){var s={product:view('product'),reviews:view('reviews')};var k=s.product+','+s.reviews;if(k!==last){last=k;window.__log.push({e:'screen',product:s.product,reviews:s.reviews,t:performance.now()})}}new MutationObserver(look).observe(document,{subtree:true,childList:true,characterData:true});look();addEventListener('pointerdown',function(){window.__log.push({e:'press',t:performance.now()})},true)})()</script>`

async function bundle(): Promise<string> {
  const esbuild = require('esbuild')
  const r = await esbuild.build({
    entryPoints: [path.join(__dirname, 'client.ts')],
    bundle: true,
    write: false,
    alias: ALIAS,
    define: { 'process.env.NODE_ENV': '"production"' },
    logLevel: 'silent',
  })
  return r.outputFiles[0].text
}

async function browserRuns(js: string) {
  let release: () => void = () => {}
  let gate = Promise.resolve()
  const srv = http.createServer(async (req, res) => {
    if (req.url === '/client.js') {
      await gate
      res.setHeader('Content-Type', 'text/javascript; charset=utf-8')
      return res.end(js)
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.write(`<!doctype html><html><head>${OBSERVE}</head><body><div id="root">`)
    if (req.url?.startsWith('/string')) {
      await Promise.all([wait(120), wait(80)])
      res.write(server.renderToString(React.createElement(apps.StringApp)))
      return res.end('</div></body></html>')
    }
    apps.reset()
    const { pipe } = server.renderToPipeableStream(React.createElement(apps.StreamApp), { onShellReady: () => pipe(res) })
  })
  await new Promise<void>((r) => srv.listen(0, '127.0.0.1', () => r()))
  const port = (srv.address() as { port: number }).port
  const { chromium } = require('playwright')
  const browser = await chromium.launch()
  try {
    const run = async (route: string, click: boolean) => {
      gate = new Promise<void>((r) => (release = r))
      const page = await browser.newPage({ viewport: { width: 800, height: 600 } })
      await page.addInitScript(`globalThis.__BUSY = ${BUSY_MS}`)
      await page.goto(`http://127.0.0.1:${port}${route}`, { waitUntil: 'load' })
      await page.waitForTimeout(JS_AFTER_MS)
      const box = await page.locator('#reviews button').boundingBox()
      await page.evaluate(`(() => { const s = document.createElement('script'); s.src = '/client.js'; document.body.append(s) })()`)
      release()
      await page.waitForFunction(`window.__log.some((x) => x.e === 'hydrate-start')`, null, { polling: 1 })
      if (click) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
      await page.waitForFunction(`window.__log.filter((x) => x.e === 'hydrated').length === 2`, null, { timeout: 10_000 })
      await page.waitForTimeout(300)
      const log = (await page.evaluate('window.__log')) as any[]
      await page.close()
      return log
    }
    // The register's scenario needs the press to land while hydration is running. A run whose
    // pointerdown reached the page (a native capture listener, before React) only after the first
    // commit tested something else, so it is run again (at most three times).
    const clickRun = async (route: string) => {
      // The contrast has no boundary to hydrate first. Whether its press reaches the page before or after
      // the one commit depends on the machine's load, so its recording keeps only the commit and the click.
      if (route !== '/') return (await run(route, true)).filter((x) => x.e !== 'press')
      for (let attempt = 0; attempt < 3; attempt++) {
        const log = await run(route, true)
        const press = log.find((x) => x.e === 'press')
        const first = log.find((x) => x.e === 'hydrated')
        if (press && first && press.t < first.t) return log
      }
      throw new Error(`${route}: the click never landed during hydration`)
    }
    const scenario = async (route: string) => {
      const idle = await run(route, false)
      const clicked = await clickRun(route)
      return { screen: screenOf(idle), hydration: { idle: hydrationOf(idle, false), click: hydrationOf(clicked, true) } }
    }
    return { stream: await scenario('/'), string: await scenario('/string'), browser: `chromium@${browser.version()}` }
  } finally {
    await browser.close()
    srv.close()
  }
}

function screenOf(log: any[]): ScreenEntry[] {
  return log.filter((x) => x.e === 'screen').map((x) => ({ ms: round10(x.t), product: x.product, reviews: x.reviews }))
}

function hydrationOf(log: any[], click: boolean): HydrationRun {
  const rows = log.filter((x) => x.e !== 'screen')
  const events: HydrationEvent[] = rows.map((x) => (x.e === 'hydrate-start' || x.e === 'press' ? { e: x.e } : { e: x.e, name: x.name }))
  const commits: HydrationRun['commits'] = []
  let at = -Infinity
  for (const x of rows.filter((r) => r.e === 'hydrated')) {
    // Effects of one commit run in one task: the same timestamp.
    if (Math.abs(x.t - at) < 1) commits[commits.length - 1].push(x.name)
    else commits.push([x.name])
    at = x.t
  }
  return { click, events, commits }
}

/** sha256 of the app and the client entry, as run. */
function appSha256(): string {
  const fs = require('node:fs')
  const text = ['app.ts', 'client.ts'].map((f) => fs.readFileSync(path.join(__dirname, f), 'utf8')).join('\n')
  return require('node:crypto').createHash('sha256').update(text).digest('hex')
}

async function main() {
  const js = await bundle()
  const b = await browserRuns(js)
  const scenario = async (kind: 'stream' | 'string', s: Omit<Scenario, 'wire'>): Promise<Scenario> => ({ wire: await wire(kind), ...s })
  const rec: SsrRecording & { runtime: string } = {
    generator: SSR_GENERATOR,
    react: `${React.version}`,
    browser: b.browser,
    sha256: appSha256(),
    busyMs: BUSY_MS,
    stream: await scenario('stream', b.stream),
    string: await scenario('string', b.string),
    runtime: `node@${process.versions.node}`,
  }
  if (require('react-dom/package.json').version !== React.version) throw new Error('react and react-dom differ')
  process.stdout.write(JSON.stringify(rec))
}

main().catch((e) => {
  process.stderr.write(String(e?.stack ?? e))
  process.exit(1)
})
