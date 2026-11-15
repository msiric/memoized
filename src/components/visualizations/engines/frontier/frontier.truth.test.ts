// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { sha256 } from '../../step-log/truth'
import type { StepLog } from '../../step-log/types'
import { LIMITS, validateDescriptor, validateStepLog } from '../../step-log/validate'
import { frontierDescriptor } from './descriptor'
import { frontierMetrics, headerWidth } from './layout'
import { frontierIntrospection, type FrontierState } from './model'
import { FRONTIER_PROGRAMS } from './programs'
import type { FrontierProgram, FrontierRecording } from './programs/types'
import bfsRec from './recordings/bfs-shortest-path.json'
import matrixRec from './recordings/binary-matrix.json'
import iteratorRec from './recordings/bst-iterator.json'
import dijkstraRec from './recordings/dijkstra.json'
import effortRec from './recordings/min-effort.json'
import { programText, recordFrontier } from './truth/record'

/**
 * Truthful by construction (spec P6): every frontier preset is built from a
 * recording of the lesson's own code block (byte for byte), run in Node 24
 * under the inspector. These tests re-record every program and require the
 * committed recording to match exactly, check the register's verification
 * assertions against the fresh run, check that what each step draws is a
 * state the run passed through, and show that a lying recording, an edited
 * program or a lying step fails.
 */

const RECORDINGS: Record<string, FrontierRecording> = {
  'bfs-shortest-path': bfsRec as FrontierRecording,
  'binary-matrix': matrixRec as FrontierRecording,
  dijkstra: dijkstraRec as FrontierRecording,
  'min-effort': effortRec as FrontierRecording,
  'bst-iterator': iteratorRec as FrontierRecording,
}
const program = (id: string) => FRONTIER_PROGRAMS.find((p) => p.id === id)!
const log = (id: string) => frontierDescriptor.presets.find((p) => p.id === id)!.log

/** Fresh recordings, one per program (each is a Node run under the inspector). */
const fresh = new Map<string, FrontierRecording & { runtime: string }>()
const record = (id: string) => {
  if (!fresh.has(id)) fresh.set(id, recordFrontier(program(id)))
  return fresh.get(id)!
}

/** Which program each preset is built from. */
const PRESET_PROGRAM: Record<string, string> = {
  'bfs-levels': 'bfs-shortest-path',
  'binary-matrix-8dir': 'binary-matrix',
  'dijkstra-lazy-heap': 'dijkstra',
  'min-effort-grid': 'min-effort',
  'bst-iterator-stack': 'bst-iterator',
}

/**
 * Every frontier the run passed through, as the lane draws it (labels in the
 * lane's order), read straight from the pauses: a step may only draw one of these.
 */
function recordedFrontiers(id: string, rec: FrontierRecording): Set<string> {
  const out = new Set<string>(['[]'])
  for (const p of rec.pauses) {
    const v = p.vars as Record<string, unknown>
    if (id === 'bfs-shortest-path' && v.queue) out.add(JSON.stringify(v.queue))
    if (id === 'binary-matrix')
      for (const k of ['q', 'nq'] as const) if (v[k]) out.add(JSON.stringify((v[k] as number[][]).map(([i, j]) => `[${i}, ${j}]`)))
    if (id === 'dijkstra' && v.heap)
      out.add(JSON.stringify([...(v.heap as number[][])].sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(([k, n]) => `(${k}, ${n})`)))
    if (id === 'min-effort' && v.heap)
      out.add(JSON.stringify([...(v.heap as number[][])].sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]).map((e) => `[${e.join(', ')}]`)))
    if (id === 'bst-iterator' && v.stack) out.add(JSON.stringify((v.stack as number[]).map(String)))
  }
  return out
}

function drawnNotRecorded(id: string, l: StepLog<FrontierState>, rec: FrontierRecording): string[] {
  const seen = recordedFrontiers(id, rec)
  return l.steps.flatMap((s, i) =>
    Object.entries(s.state.lanes).flatMap(([lane, chips]) => {
      const drawn = JSON.stringify(chips.map((c) => c.label))
      return seen.has(drawn) ? [] : [`step ${i} ${lane} ${drawn}`]
    }),
  )
}

describe.each(FRONTIER_PROGRAMS.map((p) => [p.id, p] as const))('program %s', (id, p) => {
  it('matches a fresh Node 24 run under the inspector (hash, output, every pause)', () => {
    const run = record(id)
    expect(run.runtime).toMatch(/^node@24\./)
    const { runtime: _r, ...rec } = run
    expect(rec).toEqual(RECORDINGS[id])
    expect(rec.sha256).toBe(sha256(programText(p)))
  })

  it('shows the lesson lines, rewrapped only at their own spaces, in 35 columns', () => {
    expect(displayProblems(p)).toEqual([])
  })
})

/** The pane's rows rejoin into the lesson's lines (whitespace runs only), in order, over one contiguous span. */
function displayProblems(p: FrontierProgram): string[] {
  const problems: string[] = []
  const lesson = p.lesson.split('\n')
  const srcs = [...new Set(p.display.map((d) => d.src))]
  for (let k = 1; k < srcs.length; k++) if (srcs[k] <= srcs[k - 1]) problems.push(`line ${srcs[k]} after ${srcs[k - 1]}`)
  const [a, b] = [srcs[0], srcs[srcs.length - 1]]
  for (let l = a; l <= b; l++) {
    const want = lesson[l - 1].trim().replace(/\s+/g, ' ')
    const rows = p.display.filter((d) => d.src === l).map((d) => d.text.trim())
    if (!want && rows.length) problems.push(`blank line ${l} is shown`)
    if (want && rows.join(' ') !== want) problems.push(`line ${l}: ${JSON.stringify(rows)} is not ${JSON.stringify(want)}`)
  }
  for (const d of p.display) if ([...d.text].length > 35) problems.push(`"${d.text}" is over 35 columns`)
  return problems
}

describe.each(frontierDescriptor.presets.map((p) => [p.id, p.log] as const))('bfs-dfs-frontier/%s', (id, l) => {
  it('passes the authoring lint and engine invariants', () => {
    expect(validateStepLog(l, frontierIntrospection)).toEqual([])
  })

  it('runs exactly the program it was recorded from', () => {
    const p = program(PRESET_PROGRAM[id])
    expect(l.source.snippet).toBe(programText(p))
    expect(l.source.sha256).toBe(sha256(l.source.snippet))
    expect(l.observed.log).toEqual(record(p.id).stdout)
  })

  it('draws only frontiers the run passed through', () => {
    expect(drawnNotRecorded(PRESET_PROGRAM[id], l, record(PRESET_PROGRAM[id]))).toEqual([])
  })

  it('keeps the canvas header on one line at 320 (title and locals)', () => {
    const narrow = 288 - 12
    for (const s of l.steps) expect(headerWidth(s.state), s.event).toBeLessThanOrEqual(narrow)
  })
})

describe('bfs-dfs-frontier descriptor', () => {
  it('fits its title and every group switcher at 320', () => {
    expect(validateDescriptor(frontierDescriptor)).toEqual([])
  })

  it('sizes each group to its own presets (stage heights are positive and finite)', () => {
    for (const p of frontierDescriptor.presets) {
      const m = frontierMetrics([p.log])
      expect(m.layout.stage.narrow).toBeGreaterThan(0)
      expect(Number.isFinite(m.layout.stage.wide)).toBe(true)
    }
  })

  it('code lines stay inside the step-log limit', () => {
    for (const p of frontierDescriptor.presets) for (const c of p.log.code!.lines) expect([...c].length).toBeLessThanOrEqual(LIMITS.codeColumns)
  })
})

describe('the register verification assertions hold on a fresh run', () => {
  it('Graph BFS: bfsShortestPath ends A0 B1 C1 D2 E2 F2; C, not E, labels F', () => {
    const run = record('bfs-shortest-path')
    expect(run.stdout).toEqual(['{ A: 0, B: 1, C: 1, D: 2, E: 2, F: 2 }'])
    expect(run.pauses.at(-1)!.vars.distances).toEqual({ A: 0, B: 1, C: 1, D: 2, E: 2, F: 2 })
    const firstF = run.pauses.find((p) => p.probe === 'check' && p.vars.neighbor === 'F')!
    expect(firstF.vars.vertex).toBe('C')
    expect('F' in (firstF.vars.distances as object)).toBe(false)
    // The queue per level: the order vertices are dequeued.
    const order = [...new Set(run.pauses.filter((p) => p.probe === 'check').map((p) => p.vars.vertex))]
    expect(order).toEqual(['A', 'B', 'C', 'D', 'E', 'F'])
    // The step that labels F is the checkpoint's reveal.
    const l = log('bfs-levels')
    expect(l.steps[l.checkpoints[0].beforeStep].state.lanes.queue.map((c) => c.label)).toContain('F')
    expect(l.steps[l.checkpoints[0].beforeStep - 1].state.vars).toEqual([{ name: 'vertex', value: 'C' }])
  })

  it('Graph BFS: shortestPathBinaryMatrix logs q per level and returns 4', () => {
    const run = record('binary-matrix')
    expect(run.stdout).toEqual(['4'])
    const levels = run.pauses.filter((p) => p.probe === 'level').map((p) => [p.vars.ans, p.vars.q])
    expect(levels).toEqual([
      [1, [[0, 0]]],
      [2, [[0, 1]]],
      [3, [[0, 2], [1, 2]]],
      [4, [[2, 2]]],
    ])
  })

  it('Shortest paths: pops 0@0 4@3 3@5 2@6 1@8, skips the stale (9, 1), returns [0, 8, 6, 5, 3]', () => {
    const run = record('dijkstra')
    const popped = run.pauses.filter((p) => p.probe === 'popped').map((p) => {
      const { u, uDist, dist } = p.vars as { u: number; uDist: number; dist: unknown[] }
      return uDist > (dist[u] as number) ? `stale(${u},${uDist})` : `${u}@${uDist}`
    })
    expect(popped).toEqual(['0@0', '4@3', '3@5', '2@6', '1@8', 'stale(1,9)'])
    expect(run.stdout).toEqual(['[ 0, 8, 6, 5, 3 ]'])
    // The reveal: 2's edge drops dist[1] from 9 to 8 and (9, 1) stays in the heap.
    const l = log('dijkstra-lazy-heap')
    const reveal = l.steps[l.checkpoints[0].beforeStep].state
    expect(reveal.nodes.find((n) => n.id === 'n-1')!.badge).toBe('8')
    expect(reveal.lanes.heap.map((c) => c.label)).toEqual(['(8, 1)', '(9, 1)'])
  })

  it('Shortest paths: the minimum-effort answer is 2, after [2, 2] was first offered 3', () => {
    const run = record('min-effort')
    expect(run.stdout).toEqual(['2'])
    const offers = run.pauses.filter((p) => p.probe === 'relax' && p.vars.x === 2 && p.vars.y === 2).map((p) => p.vars.d)
    expect(offers).toEqual([3, 2])
  })

  it('Trees: the constructor leaves [20, 10, 5]; after next() returns 20 the stack is [30, 25]', () => {
    const run = record('bst-iterator')
    expect(run.pauses.find((p) => p.probe === 'pop')!.vars.stack).toEqual([20, 10, 5])
    const ret20 = run.pauses.find((p) => p.probe === 'return' && p.vars.res === 20)!
    expect(ret20.vars.stack).toEqual([30, 25])
    expect(run.stdout).toEqual(['5', '10', '15', '20', '25', '30', '35'])
    const l = log('bst-iterator-stack')
    expect(l.steps[l.checkpoints[0].beforeStep].state.lanes.stack.map((c) => c.label)).toEqual(['30', '25'])
  })
})

describe('the truth checks catch a lie', () => {
  it('fails when a committed pause differs from the real run', () => {
    const rec = structuredClone(RECORDINGS['bfs-shortest-path'])
    const check = rec.pauses.find((p) => p.probe === 'check' && p.vars.neighbor === 'F')!
    check.vars.vertex = 'E'
    const { runtime: _r, ...run } = record('bfs-shortest-path')
    expect(run).not.toEqual(rec)
  })

  it('fails when the program changes without re-recording', () => {
    const p = program('dijkstra')
    const edited = { ...p, lesson: p.lesson.replace('graph.addEdge(2, 1, 2);', 'graph.addEdge(2, 1, 4);') }
    expect(sha256(programText(edited))).not.toBe(RECORDINGS.dijkstra.sha256)
    expect(recordFrontier(edited).stdout).not.toEqual(RECORDINGS.dijkstra.stdout)
  })

  it('fails when a step draws a frontier the run never had', () => {
    const l = log('bst-iterator-stack')
    const reveal = l.checkpoints[0].beforeStep
    const steps = l.steps.map((s, i) =>
      i === reveal ? { ...s, state: { ...s.state, lanes: { stack: [{ id: 'k-25', label: '25' }] } } } : s,
    )
    expect(drawnNotRecorded('bst-iterator', { ...l, steps }, record('bst-iterator'))).toEqual([`step ${reveal} stack ["25"]`])
  })

  it('fails when a step claims output the run did not print', () => {
    const l = log('bfs-levels')
    const last = l.steps.length - 1
    const steps = l.steps.map((s, i) => (i === last ? { ...s, state: { ...s.state, console: ['{ A: 0, F: 3 }'] } } : s))
    expect(validateStepLog({ ...l, steps }, frontierIntrospection).join('\n')).toMatch(/trace so far is/)
  })

  it('fails when the display drops or rewrites a lesson token', () => {
    const p = program('bfs-shortest-path')
    const display = p.display.map((d) => (d.src === 11 && d.text.includes('+ 1') ? { ...d, text: d.text.replace('+ 1', '+ 2') } : d))
    expect(displayProblems({ ...p, display }).join('\n')).toMatch(/line 11/)
  })
})

/**
 * Byte identity with the lesson: when a local content checkout is present
 * (`src/content`, gitignored: premium lessons are never committed), each
 * program's block must be exactly the block the lesson or answer holds.
 */
const CONTENT = join(process.cwd(), 'src', 'content')
describe.each(FRONTIER_PROGRAMS.map((p) => [p.id, p] as const))('lesson block %s', (_id, p) => {
  const file = join(CONTENT, p.source.path.replace(/^content\//, ''))
  it.skipIf(!existsSync(file))('is byte-identical to the local content checkout', () => {
    const text = readFileSync(file, 'utf8')
    const blocks: string[] = []
    if (file.endsWith('.json')) {
      for (const lesson of JSON.parse(text).lessons) for (const q of lesson.problems) blocks.push(...fences(q.answer, 'typescript'))
    } else blocks.push(...fences(text, 'javascript'))
    expect(blocks).toContain(p.lesson)
  })
})

function fences(text: string, lang: string): string[] {
  const out: string[] = []
  const re = new RegExp('```' + lang + '\\n([\\s\\S]*?)\\n```', 'g')
  for (const m of text.matchAll(re)) out.push(m[1])
  return out
}
