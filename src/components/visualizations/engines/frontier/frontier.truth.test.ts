// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { loadProgram, skipNote } from '../../step-log/lesson-block'
import { displayProblems as rowProblems, displayText, isAnswerSource } from '../../step-log/lesson-source'
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
import courseRec from './recordings/course-schedule-ii.json'
import noBackRec from './recordings/dfs-cycle-no-back-edge.json'
import cycleRec from './recordings/dfs-cycle.json'
import topoRec from './recordings/dfs-topological.json'
import kahnCycleRec from './recordings/kahn-cycle.json'
import kahnRec from './recordings/kahn.json'
import mhtRec from './recordings/min-height-trees.json'
import { recordFrontier } from './truth/record'

/**
 * Truthful by construction (spec P6): every frontier preset is built from a
 * recording of the lesson's own code block (byte for byte), run in Node 24
 * under the inspector. The block is premium text, never committed: with a
 * local content checkout these tests check its sha256, re-record every
 * program and require the committed recording to match exactly, and check
 * the pane's rows against the block. Without one (CI), those tests skip,
 * saying why, and everything else runs on the committed recordings: the
 * register's verification assertions, that what each step draws is a state
 * the run passed through, and that a lying recording or step fails.
 */

const RECORDINGS: Record<string, FrontierRecording> = {
  'bfs-shortest-path': bfsRec as FrontierRecording,
  'binary-matrix': matrixRec as FrontierRecording,
  dijkstra: dijkstraRec as FrontierRecording,
  'min-effort': effortRec as FrontierRecording,
  'bst-iterator': iteratorRec as FrontierRecording,
  'dfs-cycle-no-back-edge': noBackRec as FrontierRecording,
  'dfs-cycle': cycleRec as FrontierRecording,
  'dfs-topological': topoRec as FrontierRecording,
  kahn: kahnRec as FrontierRecording,
  'course-schedule-ii': courseRec as FrontierRecording,
  'kahn-cycle': kahnCycleRec as FrontierRecording,
  'min-height-trees': mhtRec as FrontierRecording,
}
const program = (id: string) => FRONTIER_PROGRAMS.find((p) => p.id === id)!
const log = (id: string) => frontierDescriptor.presets.find((p) => p.id === id)!.log

/** Each program as run, from the local content checkout (or why it is absent). */
const LOADED = new Map(FRONTIER_PROGRAMS.map((p) => [p.id, loadProgram(p.source)] as const))
const textOf = (id: string) => {
  const l = LOADED.get(id)!
  if (!l.ok) throw new Error(skipNote(l.missing))
  return l.text
}
/** A test that needs the program's text: skipped, with the reason in its name, when the checkout lacks it. */
const withText = (id: string, name: string) => {
  const l = LOADED.get(id)!
  return [l.ok ? name : `${name} (skipped: ${skipNote(l.missing)})`, !l.ok] as const
}

/** Fresh recordings, one per program (each is a Node run under the inspector). */
const fresh = new Map<string, FrontierRecording & { runtime: string }>()
const record = (id: string) => {
  if (!fresh.has(id)) fresh.set(id, recordFrontier(program(id), textOf(id)))
  return fresh.get(id)!
}
/** The committed recording: equal to a fresh run wherever the checkout can check it. */
const recorded = (id: string) => RECORDINGS[id]

/** Which program each preset is built from. */
const PRESET_PROGRAM: Record<string, string> = {
  'bfs-levels': 'bfs-shortest-path',
  'binary-matrix-8dir': 'binary-matrix',
  'dijkstra-lazy-heap': 'dijkstra',
  'min-effort-grid': 'min-effort',
  'bst-iterator-stack': 'bst-iterator',
  'dfs-directed-recstack': 'dfs-cycle-no-back-edge',
  'dfs-back-edge': 'dfs-cycle',
  'dfs-finish-order': 'dfs-topological',
  'kahn-indegree': 'kahn',
  'course-schedule-ii-edges': 'course-schedule-ii',
  'kahn-cycle-stall': 'kahn-cycle',
  'mht-leaf-peeling': 'min-height-trees',
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
    // Wave 4B: every set, stack, queue and order the run held (values as the lanes label them).
    for (const k of ['visited', 'recStack', 'stack', 'queue', 'order', 'q', 'ans', 't'] as const)
      if (id.startsWith('dfs-') || ['kahn', 'kahn-cycle', 'course-schedule-ii', 'min-height-trees'].includes(id))
        if (Array.isArray(v[k])) out.add(JSON.stringify((v[k] as unknown[]).map(String)))
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
  it.skipIf(withText(id, '')[1])(withText(id, 'is the lesson block it names (sha256) and matches a fresh Node 24 run under the inspector')[0], () => {
    const run = record(id)
    expect(run.runtime).toMatch(/^node@24\./)
    const { runtime: _r, ...rec } = run
    expect(rec).toEqual(RECORDINGS[id])
    expect(rec.sha256).toBe(sha256(textOf(id)))
  })

  it.skipIf(withText(id, '')[1])(withText(id, 'shows the lesson lines, rewrapped only at their own spaces, in 35 columns')[0], () => {
    expect(displayProblems(p, textOf(id))).toEqual([])
  })

  it('commits a practice answer only as rows without text, a lesson example as its rows', () => {
    const answer = isAnswerSource(p.source)
    for (const r of p.display) expect('wrap' in r, `${id} row ${r.src}`).toBe(answer)
    // The harness is a call with the register's input, never a declaration.
    for (const part of p.source) if ('code' in part) expect(part.code).not.toMatch(/^\s*(class|function)\s/m)
  })
})

/**
 * The pane's rows (`lesson-source.ts`), and for a lesson example, its rows
 * rejoin into the lesson's lines at their own spaces only.
 */
function displayProblems(p: FrontierProgram, text: string): string[] {
  const lines = text.split('\n')
  const problems = rowProblems(lines, p.display, { maxCols: 35, blankRows: false })
  const shown = displayText(lines, p.display)
  for (const l of new Set(p.display.map((d) => d.src))) {
    const want = lines[l - 1].trim().replace(/\s+/g, ' ')
    const rows = p.display.flatMap((d, i) => (d.src === l ? [shown[i].trim()] : []))
    if (rows.join(' ') !== want) problems.push(`line ${l}: ${JSON.stringify(rows)} is not ${JSON.stringify(want)}`)
  }
  return problems
}

describe.each(frontierDescriptor.presets.map((p) => [p.id, p.log] as const))('bfs-dfs-frontier/%s', (id, l) => {
  it('passes the authoring lint and engine invariants', () => {
    expect(validateStepLog(l, frontierIntrospection)).toEqual([])
  })

  it('names the program it was recorded from (hash and output), never its text', () => {
    const p = program(PRESET_PROGRAM[id])
    expect(l.source.snippet).toBeUndefined()
    expect(l.source.sha256).toBe(recorded(p.id).sha256)
    expect(l.observed.log).toEqual(recorded(p.id).stdout)
    // A practice answer's pane is placeholders until a page resolves it.
    expect(Boolean(l.code?.premium)).toBe(isAnswerSource(p.source))
  })

  it('draws only frontiers the run passed through', () => {
    expect(drawnNotRecorded(PRESET_PROGRAM[id], l, recorded(PRESET_PROGRAM[id]))).toEqual([])
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

describe('the register verification assertions hold on the recorded run (a fresh one, where the checkout can check it)', () => {
  it('Graph BFS: bfsShortestPath ends A0 B1 C1 D2 E2 F2; C, not E, labels F', () => {
    const run = recorded('bfs-shortest-path')
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
    const run = recorded('binary-matrix')
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
    const run = recorded('dijkstra')
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
    const run = recorded('min-effort')
    expect(run.stdout).toEqual(['2'])
    const offers = run.pauses.filter((p) => p.probe === 'relax' && p.vars.x === 2 && p.vars.y === 2).map((p) => p.vars.d)
    expect(offers).toEqual([3, 2])
  })

  it('Trees: the constructor leaves [20, 10, 5]; after next() returns 20 the stack is [30, 25]', () => {
    const run = recorded('bst-iterator')
    expect(run.pauses.find((p) => p.probe === 'pop')!.vars.stack).toEqual([20, 10, 5])
    const ret20 = run.pauses.find((p) => p.probe === 'return' && p.vars.res === 20)!
    expect(ret20.vars.stack).toEqual([30, 25])
    expect(run.stdout).toEqual(['5', '10', '15', '20', '25', '30', '35'])
    const l = log('bst-iterator-stack')
    expect(l.steps[l.checkpoints[0].beforeStep].state.lanes.stack.map((c) => c.label)).toEqual(['30', '25'])
  })
})

describe('the truth checks catch a lie', () => {
  it.skipIf(withText('bfs-shortest-path', '')[1])(withText('bfs-shortest-path', 'fails when a committed pause differs from the real run')[0], () => {
    const rec = structuredClone(RECORDINGS['bfs-shortest-path'])
    const check = rec.pauses.find((p) => p.probe === 'check' && p.vars.neighbor === 'F')!
    check.vars.vertex = 'E'
    const { runtime: _r, ...run } = record('bfs-shortest-path')
    expect(run).not.toEqual(rec)
  })

  it.skipIf(withText('dijkstra', '')[1])(withText('dijkstra', 'fails when the program changes without re-recording')[0], () => {
    // One more edge, 0 to 1 of weight 1, ahead of the example's own: dist[1] changes.
    const edited = textOf('dijkstra').replace('graph.addEdge(', 'graph.addEdge(0, 1, 1);\ngraph.addEdge(')
    expect(sha256(edited)).not.toBe(RECORDINGS.dijkstra.sha256)
    expect(recordFrontier(program('dijkstra'), edited).stdout).not.toEqual(RECORDINGS.dijkstra.stdout)
  })

  it('fails when a step draws a frontier the run never had', () => {
    const l = log('bst-iterator-stack')
    const reveal = l.checkpoints[0].beforeStep
    const steps = l.steps.map((s, i) =>
      i === reveal ? { ...s, state: { ...s.state, lanes: { stack: [{ id: 'k-25', label: '25' }] } } } : s,
    )
    expect(drawnNotRecorded('bst-iterator', { ...l, steps }, recorded('bst-iterator'))).toEqual([`step ${reveal} stack ["25"]`])
  })

  it('fails when a step claims output the run did not print', () => {
    const l = log('bfs-levels')
    const last = l.steps.length - 1
    const steps = l.steps.map((s, i) => (i === last ? { ...s, state: { ...s.state, console: ['{ A: 0, F: 3 }'] } } : s))
    expect(validateStepLog({ ...l, steps }, frontierIntrospection).join('\n')).toMatch(/trace so far is/)
  })

  it.skipIf(withText('bfs-shortest-path', '')[1])(withText('bfs-shortest-path', 'fails when the display drops or rewrites a lesson token')[0], () => {
    const p = program('bfs-shortest-path')
    const display = p.display.map((d) => ('text' in d && d.src === 11 && d.text.includes('+ 1') ? { ...d, text: d.text.replace('+ 1', '+ 2') } : d))
    expect(displayProblems({ ...p, display }, textOf('bfs-shortest-path')).join('\n')).toMatch(/line 11/)
  })

  it.skipIf(withText('bst-iterator', '')[1])(withText('bst-iterator', 'fails when an answer row slices the line wrong')[0], () => {
    const p = program('bst-iterator')
    const display = p.display.map((d, i) => (i === 3 && 'wrap' in d ? { ...d, wrap: [d.wrap[0], d.wrap[1] + 1, d.wrap[2]] as const } : d))
    expect(displayProblems({ ...p, display }, textOf('bst-iterator')).join('\n')).toMatch(/line 14/)
  })
})

// ---------------------------------------------------------------------------
// Wave 4B: Graph DFS (stack mode, recStack beside visited) and Topological
// Sort (queue mode, in-degree badges).
// ---------------------------------------------------------------------------

/** Every degree array the run held (Kahn's inDegree, the answers' indeg and degree), as the badges label them. */
function badgesNotRecorded(id: string, l: StepLog<FrontierState>, rec: FrontierRecording): string[] {
  const seen = new Set<string>()
  for (const p of rec.pauses)
    for (const k of ['inDegree', 'indeg', 'degree'] as const) if (Array.isArray(p.vars[k])) seen.add(JSON.stringify((p.vars[k] as number[]).map(String)))
  return l.steps.flatMap((s, i) => {
    const badges = s.state.nodes.map((n) => n.badge)
    if (badges.every((b) => b === undefined)) return []
    const drawn = JSON.stringify(badges)
    return seen.has(drawn) ? [] : [`step ${i} badges ${drawn}`]
  })
}

/**
 * The rule the DFS presets draw: a vertex with the queued edge or the doubled
 * edge is on recStack (or the call path), a solid one is visited and off it,
 * an empty one unvisited, and each step's canvas agrees with its lanes.
 */
function statusProblems(l: StepLog<FrontierState>, onPath: string, done: string): string[] {
  return l.steps.flatMap((s, i) => {
    const path = new Set(s.state.lanes[onPath]?.map((c) => c.label))
    const visited = new Set(s.state.lanes.visited.map((c) => c.label))
    const finished = new Set(s.state.lanes[done]?.map((c) => c.label) ?? [])
    return s.state.nodes.flatMap((n) => {
      const ok =
        n.status === 'idle'
          ? !visited.has(n.label)
          : n.status === 'done'
            ? visited.has(n.label) && !path.has(n.label) && (done === 'visited' || finished.has(n.label))
            : onPath === 'recStack'
              ? path.has(n.label)
              : visited.has(n.label) && !finished.has(n.label)
      return ok ? [] : [`step ${i} ${n.label} ${n.status}`]
    })
  })
}

describe('wave 4B: the register verification assertions hold on the recorded runs', () => {
  it('Graph DFS: the lesson graph (E -> A) prints true; with E: [] it prints false', () => {
    expect(recorded('dfs-cycle').stdout).toEqual(['true'])
    expect(recorded('dfs-cycle-no-back-edge').stdout).toEqual(['false'])
    // The variant is the lesson block with one token changed, shown with the same rows.
    const variant = program('dfs-cycle-no-back-edge')
    expect(variant.source).toEqual([{ ...program('dfs-cycle').source[0], replace: ["E: ['A']", 'E: []'] }])
    expect(variant.display).toEqual(program('dfs-cycle').display)
  })

  it('Graph DFS: A -> C meets C visited and off recStack (no cycle); E -> A meets A on recStack (a cycle)', () => {
    const ac = recorded('dfs-cycle-no-back-edge').pauses.find((p) => p.probe === 'edge' && p.vars.vertex === 'A' && p.vars.neighbor === 'C')!
    expect(ac.vars.visited).toContain('C')
    expect(ac.vars.recStack).toEqual(['A'])
    const ea = recorded('dfs-cycle').pauses.find((p) => p.probe === 'edge' && p.vars.vertex === 'E' && p.vars.neighbor === 'A')!
    expect(ea.vars.recStack).toEqual(['A', 'B', 'D', 'C', 'E'])
    // In the lesson run A -> C is never examined: the cycle is found first, so the variant is needed for that question.
    expect(recorded('dfs-cycle').pauses.some((p) => p.probe === 'edge' && p.vars.vertex === 'A' && p.vars.neighbor === 'C')).toBe(false)
    const l = log('dfs-directed-recstack')
    const reveal = l.steps[l.checkpoints[0].beforeStep].state
    expect(reveal.edges.find((e) => e.active)!.id).toBe('e-A-C')
    expect(reveal.lanes.recStack.map((c) => c.label)).toEqual(['A'])
    expect(reveal.nodes.find((n) => n.label === 'C')!.status).toBe('done')
    const back = log('dfs-back-edge')
    const hit = back.steps[back.checkpoints[0].beforeStep].state
    expect(hit.edges.find((e) => e.active)!.id).toBe('e-E-A')
    expect(hit.lanes.recStack.map((c) => c.label)).toContain('A')
  })

  it("Graph DFS: topologicalSort prints [ 'B', 'D', 'A', 'C', 'E', 'F' ], the finish order F, E, C, A, D, B reversed", () => {
    const run = recorded('dfs-topological')
    expect(run.stdout).toEqual(["[ 'B', 'D', 'A', 'C', 'E', 'F' ]"])
    expect(run.pauses.filter((p) => p.probe === 'push').map((p) => p.vars.vertex)).toEqual(['F', 'E', 'C', 'A', 'D', 'B'])
  })

  it('Graph DFS: every vertex is drawn in the state its sets give it', () => {
    for (const id of ['dfs-directed-recstack', 'dfs-back-edge']) expect(statusProblems(log(id), 'recStack', 'visited'), id).toEqual([])
    // Topological: on the call path means visited and not yet pushed; done means pushed.
    const l = log('dfs-finish-order')
    for (const [i, s] of l.steps.entries())
      for (const n of s.state.nodes) {
        const v = s.state.lanes.visited.some((c) => c.label === n.label)
        const pushed = s.state.lanes.stack.some((c) => c.label === n.label)
        const want = !v ? 'idle' : pushed ? 'done' : ['current', 'frontier']
        expect(Array.isArray(want) ? want.includes(n.status) : n.status === want, `step ${i} ${n.label}`).toBe(true)
      }
  })

  it('Topological Sort: Kahn prints [ 4, 5, 2, 0, 3, 1 ], seeded 4 then 5; badges start 2, 2, 1, 1, 0, 0', () => {
    const run = recorded('kahn')
    expect(run.stdout).toEqual(['[ 4, 5, 2, 0, 3, 1 ]'])
    expect(run.pauses.find((p) => p.probe === 'built')!.vars.inDegree).toEqual([2, 2, 1, 1, 0, 0])
    expect(run.pauses.find((p) => p.probe === 'seeded')!.vars.queue).toEqual([4, 5])
    const l = log('kahn-indegree')
    expect(l.steps[0].state.nodes.map((n) => n.badge)).toEqual(['2', '2', '1', '1', '0', '0'])
  })

  it('Topological Sort: findOrder(4, [[1,0],[2,1],[3,2]]) is [0, 1, 2, 3]; each pair [a, b] is the edge b -> a', () => {
    const run = recorded('course-schedule-ii')
    expect(run.stdout).toEqual(['[ 0, 1, 2, 3 ]'])
    expect(run.pauses.find((p) => p.probe === 'built')!.vars.g).toEqual([[1], [2], [3], []])
    const l = log('course-schedule-ii-edges')
    expect(l.steps[0].state.edges).toEqual([])
    expect(l.steps[l.checkpoints[0].beforeStep].state.edges.map((e) => e.id)).toEqual(['e-0-1', 'e-1-2', 'e-2-3'])
  })

  it('Topological Sort: the cycle variant outputs 4 and 1, stalls with 0, 2, 3 and 5 above 0, and returns []', () => {
    const run = recorded('kahn-cycle')
    expect(run.stdout).toEqual(['[]'])
    const end = run.pauses.find((p) => p.probe === 'end')!.vars as { order: number[]; inDegree: number[] }
    expect(end.order).toEqual([4, 1])
    expect([0, 2, 3, 5].every((v) => end.inDegree[v] > 0)).toBe(true)
  })

  it('Topological Sort: Minimum Height Trees peels 0, 1, 2, 5, then 3 and 4, and returns [ 3, 4 ]', () => {
    const run = recorded('min-height-trees')
    expect(run.stdout).toEqual(['[ 3, 4 ]'])
    expect(run.pauses.find((p) => p.probe === 'seeded')!.vars.q).toEqual([0, 1, 2, 5])
    expect(run.pauses.filter((p) => p.probe === 'peel').map((p) => p.vars.a)).toEqual([0, 1, 2, 5, 3, 4])
  })

  it('every badge is a degree array the run held', () => {
    for (const id of ['kahn-indegree', 'course-schedule-ii-edges', 'kahn-cycle-stall', 'mht-leaf-peeling'])
      expect(badgesNotRecorded(PRESET_PROGRAM[id], log(id), recorded(PRESET_PROGRAM[id])), id).toEqual([])
  })
})

describe('wave 4B: the truth checks catch a lie', () => {
  it('fails when a step puts a finished vertex back on recStack (the visited-means-cycle error)', () => {
    const l = log('dfs-directed-recstack')
    const reveal = l.checkpoints[0].beforeStep
    const steps = l.steps.map((s, i) =>
      i === reveal ? { ...s, state: { ...s.state, lanes: { ...s.state.lanes, recStack: [...s.state.lanes.recStack, { id: 'k-r-C', label: 'C' }] } } } : s,
    )
    expect(drawnNotRecorded('dfs-cycle-no-back-edge', { ...l, steps }, recorded('dfs-cycle-no-back-edge'))).toEqual([`step ${reveal} recStack ["A","C"]`])
  })

  it('fails when a vertex on recStack is drawn finished', () => {
    const l = log('dfs-back-edge')
    const at = l.checkpoints[0].beforeStep
    const steps = l.steps.map((s, i) =>
      i === at ? { ...s, state: { ...s.state, nodes: s.state.nodes.map((n) => (n.label === 'A' ? { ...n, status: 'done' as const } : n)) } } : s,
    )
    expect(statusProblems({ ...l, steps }, 'recStack', 'visited')).toEqual([`step ${at} A done`])
  })

  it('fails when a badge skips a count the run never held', () => {
    const l = log('kahn-indegree')
    const steps = l.steps.map((s, i) => (i === 3 ? { ...s, state: { ...s.state, nodes: s.state.nodes.map((n) => (n.label === '0' ? { ...n, badge: '0' } : n)) } } : s))
    expect(badgesNotRecorded('kahn', { ...l, steps }, recorded('kahn'))).toHaveLength(1)
  })

  it.skipIf(withText('dfs-cycle', '')[1])(withText('dfs-cycle', 'the lesson graph as written does not give the variant run (the replace matters)')[0], () => {
    const { runtime: _r, ...run } = record('dfs-cycle')
    expect(run.stdout).not.toEqual(recorded('dfs-cycle-no-back-edge').stdout)
  })

  it.skipIf(withText('kahn', '')[1])(withText('kahn', 'fails when an edge is read the wrong way round (a -> b for [a, b])')[0], () => {
    // The lesson's edges reversed: the output changes, so a drawing of the wrong direction cannot pass.
    const edited = textOf('kahn').replace('graph[u].push(v);\n        inDegree[v]++;', 'graph[v].push(u);\n        inDegree[u]++;')
    expect(edited).not.toBe(textOf('kahn'))
    expect(recordFrontier(program('kahn'), edited).stdout).not.toEqual(RECORDINGS.kahn.stdout)
  })
})
