/**
 * The lanes recorders (spec P6): each runs a lesson program (read from the
 * local content checkout by the caller, `loadProgram`) or the register's
 * panel code, and records only values.
 *
 * - `recordTimers`: the lesson's debounce and throttle on a controlled clock
 *   in a fresh Node 24 process (`../programs/timers.ts`).
 * - `recordPkce`: the practice answer's OAuth routes against a local token
 *   endpoint in a fresh Node 24 process (`../programs/pkce.ts`).
 * - `recordDispatch`: the practice answer's markup and listeners in real
 *   Chromium (Playwright), one trusted click per scenario
 *   (`../programs/dispatch.ts`).
 * - `recordTypes`: the register's union and intersection code through the
 *   repo's TypeScript compiler with `strict` (`../programs/types.ts`).
 *
 * Node-only: tests and `yarn viz:lanes` import this, the browser never does.
 */
import { recordNodeTrace, sha256 } from '../../../step-log/truth'
import type { DispatchRecording, DispatchScenario } from '../programs/dispatch'
import type { PkceRecording } from '../programs/pkce'
import type { TimersRecording } from '../programs/timers'
import type { TypeCase, TypesRecording } from '../programs/types'

export const LANES_GENERATOR = 'node-lanes@1'

/** The last line a program printed, as JSON. */
function lastJson<T>(code: string): { value: T; runtime: string } {
  const run = recordNodeTrace(code)
  const last = run.log[run.log.length - 1]
  if (!last) throw new Error('the program printed nothing')
  return { value: JSON.parse(last) as T, runtime: run.runtime }
}

export function recordTimers(code: string): TimersRecording & { runtime: string } {
  const { value, runtime } = lastJson<Pick<TimersRecording, 'debounce' | 'throttle'>>(code)
  return { generator: LANES_GENERATOR, sha256: sha256(code), debounce: value.debounce, throttle: value.throttle, runtime }
}

export function recordPkce(code: string): PkceRecording & { runtime: string } {
  const { value, runtime } = lastJson<Omit<PkceRecording, 'generator' | 'sha256'>>(code)
  return { generator: LANES_GENERATOR, sha256: sha256(code), ...value, runtime }
}

/**
 * Real DOM dispatch: the answer's markup as the page body, a recorder that
 * wraps `addEventListener` (each listener logs its element and
 * `eventPhase` when it runs) and notes the event's `composedPath()`, the
 * answer's script, then per scenario its extra listener (`stopPropagation`
 * at the target, or in #outer's capture), and a trusted click on #inner.
 */
const LISTEN = String.raw`
(() => {
  const name = (t) => (t === window ? 'window' : t === document ? 'document' : t.id ? '#' + t.id : t.localName)
  window.__calls = []
  window.__path = []
  const add = EventTarget.prototype.addEventListener
  // Only the lesson's listeners and the scenario's are recorded (the harness's own clicks add some too).
  window.__armed = false
  EventTarget.prototype.addEventListener = function (type, fn, opts) {
    if (!window.__armed) return add.call(this, type, fn, opts)
    return add.call(this, type, function (e) {
      window.__calls.push([name(e.currentTarget), e.eventPhase])
      return fn.call(this, e)
    }, opts)
  }
  add.call(window, 'click', (e) => (window.__path = e.composedPath().map(name)), true)
})()
`

export async function recordDispatch(html: string, js: string, scenarios: readonly DispatchScenario[]): Promise<DispatchRecording & { runtime: string }> {
  const { chromium } = await import('playwright')
  const browser = await chromium.launch()
  try {
    const out: DispatchRecording['scenarios'] = {}
    for (const s of scenarios) {
      const page = await browser.newPage()
      const logs: string[] = []
      page.on('console', (m) => logs.push(m.text()))
      await page.setContent(`<!doctype html><html><body>${html}</body></html>`)
      // A string, not a function: transpilers add helpers a page does not have.
      await page.addScriptTag({ content: LISTEN })
      // Armed only while the lesson's script and the scenario's line run.
      await page.addScriptTag({ content: `window.__armed = true\n${js}\n${s.extra ?? ''}\nwindow.__armed = false` })
      await page.click('#inner')
      const { calls, path } = (await page.evaluate('({ calls: window.__calls, path: window.__path })')) as Omit<DispatchRecording['scenarios'][string], 'logs'>
      out[s.id] = { logs, calls, path }
      await page.close()
    }
    return { generator: LANES_GENERATOR, sha256: sha256(`${html}\n${js}`), browser: `chromium@${browser.version()}`, scenarios: out, runtime: `node@${process.versions.node}` }
  } finally {
    await browser.close()
  }
}

/**
 * Each case through `tsc --strict` (the compiler API on an in-memory file,
 * with the default library): the diagnostics it reports, by code and line.
 */
export async function recordTypes(cases: readonly TypeCase[]): Promise<TypesRecording> {
  const ts = await import('typescript')
  const results: TypesRecording['cases'] = {}
  for (const c of cases) {
    const file = `/${c.id}.ts`
    const options = { strict: true, noEmit: true, target: ts.ScriptTarget.ES2022, lib: ['lib.es2022.d.ts'], types: [] }
    const host = ts.createCompilerHost(options)
    const read = host.getSourceFile
    host.getSourceFile = (name, lang, ...rest) => (name === file ? ts.createSourceFile(name, c.code, lang) : read.call(host, name, lang, ...rest))
    const program = ts.createProgram([file], options, host)
    const sf = program.getSourceFile(file)!
    results[c.id] = ts.getPreEmitDiagnostics(program, sf).map((d) => ({
      code: d.code,
      line: sf.getLineAndCharacterOfPosition(d.start ?? 0).line + 1,
      message: ts.flattenDiagnosticMessageText(d.messageText, ' '),
    }))
  }
  return { generator: LANES_GENERATOR, tsc: ts.version, sha256: sha256(cases.map((c) => c.code).join('\n')), cases: results }
}
