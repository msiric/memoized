/**
 * The reachability recorder (memory-management and memory-leaks presets):
 * runs a lesson program with a probe after each snapshot point, then lets
 * the event loop turn, forces full collections (`gc()`, exposed by
 * `--expose-gc`) and records which of the objects the probes saw survived.
 * A program without a DOM runs in Node 24; one that builds DOM nodes runs in
 * Chromium (Playwright, `--js-flags=--expose-gc`), as the lanes dispatch
 * figure does.
 *
 * Every object a probe meets gets a number (a WeakMap, so the recorder never
 * keeps anything alive) and a WeakRef; a later probe also lists the objects
 * earlier probes saw that no root reaches any more (the island), still
 * linked as they are. WeakMap entries cannot be enumerated, so a snapshot
 * names them (`weak`: [map, key] expressions) and later probes follow them
 * while both ends exist. Values only: kinds, keys, primitive values, links.
 *
 * Node-only: the truth test and `yarn viz:reach` import this.
 */
import { spawnSync } from 'node:child_process'
import { sha256 } from '../../../step-log/truth'

export type GcSnapshotSpec = {
  id: string
  /** After this line of the program as run (1-based): a line number, so no lesson text is committed. */
  after: number
  /** Root expressions, in order, as the panel names them. */
  roots: readonly (readonly [name: string, expr: string])[]
  /** WeakMap entries to follow: [map expression, key expression], read here. */
  weak?: readonly (readonly [map: string, key: string])[]
}

export type GcRun = {
  /** `node`: Node 24 with --expose-gc; `chromium`: a page in Chromium with V8's --expose-gc. */
  env: 'node' | 'chromium'
  snapshots: readonly GcSnapshotSpec[]
  /** How long the run waits before collecting, for the program's own timers (ms). */
  settleMs?: number
}

export type GcValue = { text: string } | { ref: number; weak?: true }
export type GcObject = {
  id: number
  kind: string
  rows: [key: string, value: GcValue][]
  /** An element's subtree, collapsed: how many children, their tag, their numbers (for liveness). */
  children?: { count: number; tag: string; ids: number[] }
  /** A long array's length (its elements are not listed). */
  size?: number
}
export type GcSnapshot = { roots: [name: string, value: GcValue][]; objects: GcObject[] }

export type GcRecording = {
  sha256: string
  env: string
  /** What the program printed (console.log), line by line. */
  stdout: string[]
  snapshots: Record<string, GcSnapshot>
  /** Numbers of the objects still alive after the collections, and of those collected. */
  alive: number[]
  dead: number[]
}

/** The probe library, plain JavaScript for Node and for a page. */
const PROBE = String.raw`
const __R = (() => {
  const ids = new WeakMap(); const refs = []; const entries = []; const seen = new Set(); const snaps = {}
  const isObj = (v) => v !== null && (typeof v === 'object' || typeof v === 'function')
  const idOf = (o) => { if (!ids.has(o)) { ids.set(o, refs.length + 1); refs.push(new WeakRef(o)) } return ids.get(o) }
  const text = (v) => typeof v === 'string' ? "'" + v + "'" : typeof v === 'bigint' ? v + 'n' : String(v)
  const isEl = (o) => typeof Element !== 'undefined' && o instanceof Element
  const kindOf = (o) => Array.isArray(o) ? 'Array' : o instanceof WeakMap ? 'WeakMap' : o instanceof Map ? 'Map' : typeof o === 'function' ? 'Function' : isEl(o) ? o.tagName.toLowerCase() : (Object.getPrototypeOf(o)?.constructor?.name || 'Object')
  function walk(roots) {
    const objects = []; const done = new Set(); const queue = []
    const val = (v) => { if (!isObj(v)) return { text: text(v) }; const id = idOf(v); if (!done.has(id)) { done.add(id); queue.push(v) } return { ref: id } }
    const rs = roots.map(([n, v]) => [n, val(v)])
    const visit = () => { while (queue.length) {
      const o = queue.shift(); const rec = { id: idOf(o), kind: kindOf(o), rows: [] }
      if (o instanceof WeakMap) { for (const [m, k, v] of entries) if (m.deref() === o && k.deref() !== undefined) { rec.rows.push(['key', { ...val(k.deref()), weak: true }]); rec.rows.push(['value', val(v.deref())]) } }
      else if (o instanceof Map) { for (const [k, v] of o) rec.rows.push([text(k), val(v)]) }
      else if (isEl(o)) {
        // document.body lists its element children as links; any other element collapses its subtree to a count.
        const kids = [...o.children]
        if (o === document.body) kids.forEach((c, i) => rec.rows.push(['children[' + i + ']', val(c)]))
        else rec.children = { count: kids.length, tag: kids.length ? kids[0].tagName.toLowerCase() : '', ids: kids.map(idOf) }
      }
      else if (Array.isArray(o) && o.length > 8) rec.size = o.length
      else if (typeof o !== 'function') for (const k of Object.keys(o)) rec.rows.push([k, val(o[k])])
      objects.push(rec)
    } }
    visit()
    // The island: objects earlier probes saw that no root reaches now, still linked.
    for (const id of [...seen].sort((a, b) => a - b)) { const o = refs[id - 1].deref(); if (o !== undefined && !done.has(id)) { done.add(id); queue.push(o); visit() } }
    for (const o of objects) seen.add(o.id)
    return { roots: rs, objects }
  }
  return {
    snap(id, roots, weak) {
      for (const [m, k] of weak) entries.push([new WeakRef(m), new WeakRef(k), new WeakRef(m.get(k))])
      if (snaps[id]) throw new Error('snapshot ' + id + ' ran twice')
      snaps[id] = walk(roots)
    },
    async finish(ms) {
      await new Promise((r) => setTimeout(r, ms))
      for (let i = 0; i < 3; i++) { gc(); await new Promise((r) => setTimeout(r)) }
      const alive = [], dead = []
      refs.forEach((r, i) => (r.deref() === undefined ? dead : alive).push(i + 1))
      return { snapshots: snaps, alive, dead }
    },
  }
})()`

const js = (s: string) => JSON.stringify(s)

/** The program with a probe after each snapshot point (same indentation), inside one async function. */
export function instrumentGc(program: string, run: GcRun): string {
  const lines = program.split('\n')
  const after = new Map<number, string[]>()
  for (const s of run.snapshots) {
    const at = s.after - 1
    if (!lines[at]?.trim()) throw new Error(`${s.id}: line ${s.after} is blank or outside the program`)
    const hits = [at]
    // A probe after a block's opening line goes inside it, one level in.
    const indent = lines[at].match(/^\s*/)![0] + (/[{(]\s*$/.test(lines[at]) ? '  ' : '')
    // Values, not getters: a getter closure here would join the function's context and keep its locals alive.
    const roots = s.roots.map(([n, e]) => `[${js(n)}, ${e}]`).join(', ')
    const weak = (s.weak ?? []).map(([m, k]) => `[${m}, ${k}]`).join(', ')
    after.set(hits[0], [...(after.get(hits[0]) ?? []), `${indent}__R.snap(${js(s.id)}, [${roots}], [${weak}])`])
  }
  const body: string[] = []
  lines.forEach((l, i) => body.push(l, ...(after.get(i) ?? [])))
  // console.log is captured in order; nothing else of the program changes.
  // A classic script, as a lesson program runs: its top-level bindings stay in the global lexical
  // scope (long-lived roots), a block's locals die with the block. No wrapper function: a suspended
  // or returned wrapper frame would decide what survives instead of the program.
  return `${PROBE}\n${body.join('\n')}`
}

export async function recordGc(program: string, run: GcRun): Promise<GcRecording & { runtime: string }> {
  const code = instrumentGc(program, run)
  let result: Omit<GcRecording, 'sha256' | 'env'>
  let env: string
  if (run.env === 'node') {
    const script = `const vm = require('node:vm'); vm.runInThisContext(${js(code)}); vm.runInThisContext('__R').finish(${run.settleMs ?? 20}).then((r) => process.stderr.write('\\u0000GC' + JSON.stringify({ ...r, stdout: undefined }) + '\\n'), (e) => { console.error(e); process.exit(3) })`
    const r = spawnSync(process.execPath, ['--expose-gc', '--input-type=commonjs', '-e', script], {
      encoding: 'utf8',
      timeout: 30_000,
      env: { PATH: process.env.PATH ?? '' } as unknown as NodeJS.ProcessEnv,
    })
    if (r.error) throw r.error
    if (r.status !== 0) throw new Error(`exited with ${r.status}: ${r.stderr}`)
    const line = r.stderr.split('\n').find((l) => l.startsWith('\u0000GC'))
    if (!line) throw new Error(`no recording: ${r.stderr}`)
    const stdout = r.stdout.split('\n')
    if (stdout[stdout.length - 1] === '') stdout.pop()
    result = { ...JSON.parse(line.slice(3)), stdout }
    env = `node@${process.versions.node}`
  } else {
    const { chromium } = await import('playwright')
    const browser = await chromium.launch({ args: ['--js-flags=--expose-gc'] })
    try {
      const page = await browser.newPage()
      await page.setContent('<!doctype html><html><body></body></html>')
      const stdout: string[] = []
      page.on('console', (m) => m.type() === 'log' && stdout.push(m.text()))
      await page.addScriptTag({ content: code })
      result = { ...((await page.evaluate(`__R.finish(${run.settleMs ?? 20})`)) as typeof result), stdout }
      env = `chromium@${browser.version()}`
    } finally {
      await browser.close()
    }
  }
  for (const s of run.snapshots) if (!result.snapshots[s.id]) throw new Error(`${s.id}: the snapshot point never ran`)
  return { sha256: sha256(program), env: env.replace(/^(\w+@\d+).*$/, '$1'), ...result, runtime: env }
}
