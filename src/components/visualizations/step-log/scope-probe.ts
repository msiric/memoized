/**
 * The inspector half of the scope-chain truth (R4 verification: "inspector
 * Scope panel confirms the chain"). Node-only: tests import this.
 *
 * `recordScopeChains` runs a program in a fresh Node process under
 * `--inspect-brk`, sets a breakpoint on each given line through the Chrome
 * DevTools Protocol (the same data DevTools' Scope panel shows), and records
 * at each pause the call stack (function names, innermost first; the
 * CommonJS module wrapper is anonymous, '') and the scope chain of the
 * paused frame: each scope's type (`block`, `local`, `closure`, `global`)
 * and its own bindings. A binding still in its temporal dead zone has the
 * value null (DevTools shows it as unavailable). Variables no closure
 * captures are not in an outer scope's list (V8 keeps them on the stack), so
 * a check reads a value where its own frame is paused.
 */
import { spawnSync } from 'node:child_process'
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export type ScopeView = { type: string; names: Record<string, string | number | boolean | null> }
export type Pause = { line: number; stack: string[]; scopes: ScopeView[] }
export type ScopeRun = { pauses: Pause[]; stdout: string[]; error: string | null; runtime: string }

/** The recorder, run as an ES module in the child Node (it drives a grandchild under --inspect-brk). */
const RECORDER = String.raw`
import { spawn } from 'node:child_process'
import { pathToFileURL } from 'node:url'
const [file, linesJson] = process.argv.slice(1)
const lines = JSON.parse(linesJson)
const child = spawn(process.execPath, ['--inspect-brk=127.0.0.1:0', file], { stdio: ['ignore', 'pipe', 'pipe'], timeout: 8_000 })
let out = '', err = ''
child.stdout.on('data', (d) => (out += d))
const url = await new Promise((res) => child.stderr.on('data', (d) => { err += d; const m = err.match(/ws:\/\/\S+/); if (m) res(m[0]) }))
const ws = new WebSocket(url)
// --inspect-brk waits for the debugger to leave once the program ends.
child.stderr.on('data', () => { if (/Waiting for the debugger to disconnect/.test(err)) ws.close() })
await new Promise((r) => ws.addEventListener('open', r))
let id = 0
const wait = new Map()
const post = (method, params = {}) => new Promise((res) => { const i = ++id; wait.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })
const pauses = []
ws.addEventListener('message', async (ev) => {
  const m = JSON.parse(ev.data)
  if (m.id) return wait.get(m.id)?.(m.result ?? m.error)
  if (m.method !== 'Debugger.paused') return
  const { callFrames, reason } = m.params
  if (reason === 'Break on start') return post('Debugger.resume')
  const scopes = []
  for (const sc of callFrames[0].scopeChain) {
    if (sc.type === 'global') { scopes.push({ type: 'global', names: {} }); continue }
    const r = await post('Runtime.getProperties', { objectId: sc.object.objectId, ownProperties: true })
    scopes.push({ type: sc.type, names: Object.fromEntries(r.result.map((p) => [p.name, p.value ? (p.value.type === 'function' ? 'function' : (p.value.value ?? p.value.description ?? null)) : null])) })
  }
  pauses.push({ line: callFrames[0].location.lineNumber + 1, stack: callFrames.map((f) => f.functionName), scopes })
  post('Debugger.resume')
})
await post('Runtime.enable')
await post('Debugger.enable')
for (const line of lines) await post('Debugger.setBreakpointByUrl', { url: pathToFileURL(file).href, lineNumber: line - 1 })
await post('Runtime.runIfWaitingForDebugger')
await new Promise((r) => child.on('exit', r))
const error = (err.match(/^(\w*Error)\b/m) || [])[1] ?? null
console.log(JSON.stringify({ pauses, stdout: out.split('\n').filter((l, i, a) => i < a.length - 1 || l !== ''), error }))
`

export function recordScopeChains(snippet: string, lines: readonly number[]): ScopeRun {
  // The real path: Node loads the file by it, and breakpoints match its URL.
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'viz-scope-')))
  try {
    const file = join(dir, 'example.cjs')
    writeFileSync(file, snippet)
    const run = spawnSync(process.execPath, ['--input-type=module', '-e', RECORDER, file, JSON.stringify(lines)], {
      encoding: 'utf8',
      timeout: 20_000,
      // A clean environment: no NODE_OPTIONS or test globals leak into the run.
      env: { PATH: process.env.PATH ?? '' } as unknown as NodeJS.ProcessEnv,
    })
    if (run.error) throw run.error
    if (run.status !== 0) throw new Error(`scope recorder exited with ${run.status}: ${run.stderr}`)
    return { ...JSON.parse(run.stdout), runtime: `node@${process.versions.node}` }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}
