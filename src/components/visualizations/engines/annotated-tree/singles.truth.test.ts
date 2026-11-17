// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { monoWidth } from '../../substrates/text-metrics'
import { CALLS, layoutCalls, popAt, underText } from './calls'
import { GRAPH, layoutGraph, waterRun } from './graph'
import { GRID, kPairsRun, layoutGrid } from './grid'
import { annotatedTreeDescriptor } from './descriptor'
import { SIZE } from './layout'
import type { CallPanel, GraphPanel, GridPanel, TreeData } from './model'
import { SINGLES_RECORDINGS, combinationSumData, combinationSumTakeSkip, kPairsData, kPairsLazyGrid, waterData, waterWellsSource } from './presets/singles'

/**
 * The wave 3A figures (backtracking, minimum-spanning-trees, k-way-merge)
 * against the register's verification values (R4) and the rules each
 * figure states, with the lies that must fail. The recordings themselves
 * are re-run from the content checkout by `annotated-tree.truth.test.ts`.
 */

const R = SINGLES_RECORDINGS

// ---------------------------------------------------------------------------
// The rules each figure states, as checks a lie must fail.
// ---------------------------------------------------------------------------

/** Skip: (i + 1, s), t unchanged; take: (i, s - c[i]), t + [c[i]]; two children or an end; a cut is s < c[i] or i past the end. */
export function callRuleProblems(p: CallPanel): string[] {
  const out: string[] = []
  const c = p.candidates
  for (const n of p.nodes) {
    const kids = p.nodes.filter((k) => k.parent === n.id)
    if (n.end && kids.length) out.push(`${n.id}: an end with children`)
    if (!n.end && (kids.length !== 2 || kids[0].edge !== 'skip' || kids[1].edge !== 'take')) out.push(`${n.id}: not skip then take`)
    if (n.end?.kind === 'answer' && n.s !== 0) out.push(`${n.id}: an answer with s ${n.s}`)
    if (n.end?.kind === 'cut' && (n.end.index ? n.i < c.length : !(n.s < c[n.i] && n.end.c === c[n.i]))) out.push(`${n.id}: a cut that holds no rule`)
    const parent = p.nodes.find((x) => x.id === n.parent)
    if (!parent) continue
    const want = n.edge === 'skip' ? { i: parent.i + 1, s: parent.s, t: parent.t } : { i: parent.i, s: parent.s - c[parent.i], t: [...parent.t, c[parent.i]] }
    if (n.i !== want.i || n.s !== want.s || JSON.stringify(n.t) !== JSON.stringify(want.t))
      out.push(`${n.id}: (${n.i},${n.s}) ${n.t} is not ${n.edge} of ${parent.id}`)
    if (n.edge === 'take' && n.took !== c[parent.i]) out.push(`${n.id}: takes ${n.took}, not c[${parent.i}]`)
  }
  return out
}

/** The marked edges are the run's accepted ones, they join all n + 1 nodes as a tree, and their weights sum to the printed total. */
export function treeProblems(p: GraphPanel, accepted: number[][], total: string): string[] {
  const out: string[] = []
  const marked = p.edges.filter((e) => e.accepted !== undefined).sort((a, b) => a.accepted! - b.accepted!)
  if (JSON.stringify(marked.map((e) => [e.a, e.b, e.w])) !== JSON.stringify(accepted.map(([a, b, c]) => [`n${a}`, `n${b}`, c])))
    out.push('marked edges are not the accepted ones')
  const parent = new Map(p.nodes.map((n) => [n.id, n.id]))
  const find = (x: string): string => (parent.get(x) === x ? x : find(parent.get(x)!))
  for (const e of marked) {
    if (find(e.a) === find(e.b)) out.push(`${e.a}-${e.b} closes a cycle`)
    parent.set(find(e.a), find(e.b))
  }
  if (new Set(p.nodes.map((n) => find(n.id))).size !== 1) out.push('the marked edges do not join every node')
  if (String(marked.reduce((s, e) => s + e.w, 0)) !== total) out.push(`marked weights do not sum to ${total}`)
  return out
}

/** Every arrow of the answer's rule points right by one column, from a popped cell; no cell has two parents. */
export function frontierProblems(p: GridPanel): string[] {
  const out: string[] = []
  const into = new Map<string, number>()
  for (const a of p.arrows) {
    if (a.from[0] !== a.to[0] || a.to[1] !== a.from[1] + 1) out.push(`${a.from}->${a.to} is not the right neighbour`)
    const from = p.cells.find((c) => c.i === a.from[0] && c.j === a.from[1])!
    if (from.state !== 'popped') out.push(`${a.from} pushed without being popped`)
    into.set(`${a.to}`, (into.get(`${a.to}`) ?? 0) + 1)
  }
  for (const [k, n] of into) if (n > 1) out.push(`${k} has ${n} parents`)
  // A popped cell past column 0 (the seeds) was pushed by a pop: its parent, one to the left, is popped.
  for (const c of p.cells.filter((x) => x.state === 'popped' && x.j > 0)) {
    const parent = p.cells.find((x) => x.i === c.i && x.j === c.j - 1)!
    if (parent.state !== 'popped') out.push(`${c.i},${c.j} is popped but its parent ${parent.i},${parent.j} is not`)
  }
  return out
}

/**
 * The two-neighbour rule's panel, as a structure: it starts from (0,0) alone;
 * every arrow points right or down by one, from a popped cell; every popped
 * cell but (0,0) has a parent and that parent is popped (a cell is pushed
 * only by a pop); the cell marked twice has exactly two parents.
 */
export function twoNeighbourProblems(p: GridPanel): string[] {
  const out: string[] = []
  const at = (i: number, j: number) => p.cells.find((c) => c.i === i && c.j === j)!
  const popped = (c: GridPanel['cells'][number]) => c.state === 'pop' || c.state === 'popped'
  for (const a of p.arrows) {
    const right = a.from[0] === a.to[0] && a.to[1] === a.from[1] + 1
    const down = a.from[1] === a.to[1] && a.to[0] === a.from[0] + 1
    if (!right && !down) out.push(`${a.from}->${a.to} is not a right or down neighbour`)
    if (!popped(at(...a.from))) out.push(`${a.from} pushed without being popped`)
  }
  for (const c of p.cells.filter(popped)) {
    const into = p.arrows.filter((a) => a.to[0] === c.i && a.to[1] === c.j)
    if (c.i === 0 && c.j === 0) {
      if (into.length) out.push('(0,0) is the start: it has no parent')
      continue
    }
    if (!into.length) out.push(`${c.i},${c.j} is popped but nothing pushed it`)
    for (const a of into) if (!popped(at(...a.from))) out.push(`${c.i},${c.j} is popped but its parent ${a.from} is not`)
  }
  if (!p.cells.some((c) => c.i === 0 && c.j === 0 && popped(c))) out.push('(0,0), the start, is not popped')
  for (const c of p.cells.filter((x) => x.state === 'twice')) {
    const n = p.arrows.filter((a) => a.to[0] === c.i && a.to[1] === c.j).length
    if (n !== 2) out.push(`${c.i},${c.j} is marked twice with ${n} parents`)
  }
  return out
}

/** Which cells the two-neighbour rule pushes more than once if every reachable cell is popped (no visited set). */
function pushedTwice(rows: number, cols: number): string[] {
  const count = new Map<string, number>()
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < cols; j++)
      for (const [a, b] of [
        [i + 1, j],
        [i, j + 1],
      ])
        if (a < rows && b < cols) count.set(`${a},${b}`, (count.get(`${a},${b}`) ?? 0) + 1)
  return [...count].filter(([, n]) => n > 1).map(([k]) => k)
}

// ---------------------------------------------------------------------------

describe('combination-sum-take-skip (backtracking, combination-sum)', () => {
  const p = combinationSumTakeSkip.data.panels[0] as CallPanel

  it('the register: 19 calls of combinationSum([2,3,6,7], 7), answers [7] and [2,2,3] (Node 24)', () => {
    expect(p.nodes).toHaveLength(19)
    expect(combinationSumTakeSkip.programs[0].observed).toEqual(['[[7],[2,2,3]]'])
    expect(p.nodes.filter((n) => n.end?.kind === 'answer').map((n) => n.t)).toEqual([[7], [2, 2, 3]])
    expect(p.heading).toBe('combinationSum([2,3,6,7], 7)')
  })

  it('every node is a recorded call, in call order, and every edge holds the rule the legend states', () => {
    const calls = R['combination-sum'].pauses.filter((x) => x.probe === 'call').map((x) => [x.vars.i, x.vars.s, x.vars.t])
    expect(p.nodes.map((n) => [n.i, n.s, n.t])).toEqual(calls)
    expect(callRuleProblems(p)).toEqual([])
  })

  it('take stays on i and skip moves on; the cuts are where s < c[i] or i ran past the candidates', () => {
    for (const n of p.nodes.filter((x) => x.edge === 'take')) expect(n.i).toBe(p.nodes.find((x) => x.id === n.parent)!.i)
    const cuts = p.nodes.filter((n) => n.end?.kind === 'cut').map(underText)
    expect(cuts).toEqual(['i = 4', '1 < 6', '4 < 6', '1 < 3', '5 < 6', '2 < 3', '3 < 6', '1 < 2'])
  })

  it('the side note: after (0,3) returns, its parent pops t from [2,2] back to [2]', () => {
    expect(popAt(R['combination-sum'], 0, 5)).toEqual([2, 2])
    expect(p.notes[1]).toBe('(0,3) returns: pop [2,2] to [2]')
  })

  it('a lie fails: a skip that subtracts, a take that moves on, a cut with no rule', () => {
    const lie = (f: (n: CallPanel['nodes'][number]) => CallPanel['nodes'][number]) => callRuleProblems({ ...p, nodes: p.nodes.map(f) })
    expect(lie((n) => (n.id === 'c1' ? { ...n, s: 5 } : n)).join('\n')).toMatch(/c1: .* is not skip/)
    expect(lie((n) => (n.edge === 'take' && n.id === p.nodes.find((x) => x.edge === 'take')!.id ? { ...n, i: n.i + 1 } : n)).join('\n')).toMatch(/not take/)
    expect(lie((n) => (n.end?.kind === 'cut' && !n.end.index ? { ...n, end: { kind: 'cut', c: 0 } } : n)).join('\n')).toMatch(/a cut that holds no rule/)
  })

  it('a tampered recording cannot build: a call out of order breaks the pre-order', () => {
    const rec = R['combination-sum']
    const pauses = rec.pauses.filter((x, i) => i !== 5)
    expect(() => combinationSumData({ ...R, 'combination-sum': { ...rec, pauses } })).toThrow()
  })
})

describe('water-wells-virtual-source (minimum-spanning-trees, optimize-water-distribution)', () => {
  const [houses, source] = waterWellsSource.data.panels as GraphPanel[]
  const main = waterRun(R['water-wells-122'])
  const five = waterRun(R['water-wells-555'])

  it('the register: 3 for the example, 7 for wells [5,5,5] (Node 24); accepted 1-2, 2-3, 0-1', () => {
    expect(waterWellsSource.programs.map((x) => x.observed)).toEqual([['3'], ['7']])
    expect(main.accepted).toEqual([
      [1, 2, 1],
      [2, 3, 1],
      [0, 1, 1],
    ])
    expect(five.accepted.filter((e) => e[0] === 0)).toEqual([[0, 1, 5]])
  })

  it('panel 1 is houses, pipes and well costs as labels; panel 2 adds source 0 with dashed well edges', () => {
    expect(houses.nodes.map((n) => [n.label, n.note])).toEqual([
      ['1', 'well 1'],
      ['2', 'well 2'],
      ['3', 'well 2'],
    ])
    expect(houses.edges.every((e) => !e.well)).toBe(true)
    expect(source.nodes.find((n) => n.source)!.label).toBe('source 0')
    expect(source.edges.filter((e) => e.well).map((e) => [e.b, e.w])).toEqual([
      ['n1', 1],
      ['n2', 2],
      ['n3', 2],
    ])
  })

  it('the marked edges are the accepted ones and form one spanning tree over n + 1 nodes, total 3', () => {
    expect(treeProblems(source, main.accepted, main.total)).toEqual([])
    expect(source.edges.filter((e) => e.untried).map((e) => `${e.a}-${e.b}`)).toEqual(['n0-n2', 'n0-n3'])
  })

  it('a lie fails: an extra marked edge, a missing one, or a wrong total', () => {
    const extra = { ...source, edges: source.edges.map((e) => (e.untried && e.b === 'n2' ? { ...e, accepted: 4 } : e)) }
    expect(treeProblems(extra, main.accepted, main.total).join('\n')).toMatch(/not the accepted|cycle/)
    const missing = { ...source, edges: source.edges.map((e) => (e.accepted === 3 ? { ...e, accepted: undefined } : e)) }
    expect(treeProblems(missing, main.accepted, main.total).join('\n')).toMatch(/do not join every node/)
    expect(treeProblems(source, main.accepted, '4').join('\n')).toMatch(/do not sum to 4/)
  })
})

describe('k-pairs-lazy-grid (k-way-merge, find-k-pairs-with-smallest-sums)', () => {
  const [seeded, popped, twice] = kPairsLazyGrid.data.panels as GridPanel[]
  const run = kPairsRun(R['k-pairs'])

  it('the register: kSmallestPairs([1,7,11], [2,4,6], 3) = [[1,2],[1,4],[1,6]] (Node 24)', () => {
    expect(kPairsLazyGrid.programs[0].observed).toEqual(['[[1,2],[1,4],[1,6]]'])
    expect(seeded.cells.map((c) => c.sum)).toEqual([3, 5, 7, 9, 11, 13, 13, 15, 17])
  })

  it('snapshot 1: after seeding, column 0 is in the heap and nothing else', () => {
    expect(seeded.cells.filter((c) => c.state === 'heap').map((c) => [c.i, c.j])).toEqual([
      [0, 0],
      [1, 0],
      [2, 0],
    ])
  })

  it('snapshot 2: pops 1 to 3 in order, the heap after them, one right arrow per push', () => {
    expect(popped.cells.filter((c) => c.state === 'popped').map((c) => [c.i, c.j, c.order])).toEqual([
      [0, 0, 1],
      [0, 1, 2],
      [0, 2, 3],
    ])
    expect(popped.cells.filter((c) => c.state === 'heap').map((c) => [c.i, c.j])).toEqual(run.pops[2].heap.map((e) => [e[1], e[2]]).sort())
    expect(popped.arrows).toEqual([
      { from: [0, 0], to: [0, 1] },
      { from: [0, 1], to: [0, 2] },
    ])
    expect(frontierProblems(popped)).toEqual([])
    expect(run.pops[2].pushed).toBeNull()
  })

  it('snapshot 3: the two-neighbour rule reaches (1,1) from two parents, the first cell it pushes twice', () => {
    expect(pushedTwice(3, 3)[0] ?? null).toBeDefined()
    expect(pushedTwice(3, 3)).toContain('1,1')
    expect(twice.cells.filter((c) => c.state === 'twice').map((c) => `${c.i},${c.j}`)).toEqual(['1,1'])
    expect(twice.arrows.filter((a) => a.to.join(',') === '1,1').map((a) => a.from.join(','))).toEqual(['0,1', '1,0'])
    expect(frontierProblems(twice).join('\n')).toMatch(/1,1 has 2 parents/)
  })

  it('snapshot 3 is a structure whose pops all have popped parents: 3 first, pushing 5 and 9, which each push 11', () => {
    const at = (i: number, j: number) => twice.cells.find((c) => c.i === i && c.j === j)!
    expect(twice.cells.filter((c) => c.state === 'pop').map((c) => [c.i, c.j, c.sum])).toEqual([
      [0, 0, 3],
      [0, 1, 5],
      [1, 0, 9],
    ])
    expect(at(1, 1).sum).toBe(11)
    expect(twice.arrows.map((a) => `${a.from}->${a.to}`)).toEqual(['0,0->0,1', '0,0->1,0', '0,1->1,1', '1,0->1,1'])
    expect(twoNeighbourProblems(twice)).toEqual([])
    // A structure, not a run: no pop numbers, and the text alternative says the rule is not run.
    expect(twice.cells.some((c) => c.order !== undefined)).toBe(false)
    expect(annotatedTreeDescriptor.engine.describe(kPairsLazyGrid.data).model).toMatch(/two-neighbour rule is not run: its panel is a structural illustration, not a run/)
  })

  it('a lie fails: a popped cell whose parent is not popped, a pop nothing pushed, a diagonal, a twice with one parent', () => {
    const plainStart = { ...twice, cells: twice.cells.map((c) => (c.i === 0 && c.j === 0 ? { i: c.i, j: c.j, sum: c.sum } : c)) }
    expect(twoNeighbourProblems(plainStart).join('\n')).toMatch(/0,1 is popped but its parent 0,0 is not/)
    expect(twoNeighbourProblems(plainStart).join('\n')).toMatch(/0,0 pushed without being popped/)
    const orphan = { ...twice, arrows: twice.arrows.filter((a) => a.from.join(',') !== '0,0') }
    expect(twoNeighbourProblems(orphan).join('\n')).toMatch(/0,1 is popped but nothing pushed it/)
    const diagonal = { ...twice, arrows: [...twice.arrows, { from: [0, 0] as [number, number], to: [1, 1] as [number, number] }] }
    expect(twoNeighbourProblems(diagonal).join('\n')).toMatch(/not a right or down neighbour/)
    const once = { ...twice, arrows: twice.arrows.slice(0, 3) }
    expect(twoNeighbourProblems(once).join('\n')).toMatch(/1,1 is marked twice with 1 parents/)
  })

  it('a lie fails: a down arrow, a push from an unpopped cell, two parents', () => {
    const down = { ...popped, arrows: [...popped.arrows, { from: [0, 0] as [number, number], to: [1, 0] as [number, number] }] }
    expect(frontierProblems(down).join('\n')).toMatch(/not the right neighbour/)
    const unpopped = { ...popped, arrows: [{ from: [1, 0] as [number, number], to: [1, 1] as [number, number] }] }
    expect(frontierProblems(unpopped).join('\n')).toMatch(/without being popped/)
    const orphan = { ...popped, cells: popped.cells.map((c) => (c.i === 0 && c.j === 1 ? { i: c.i, j: c.j, sum: c.sum } : c)) }
    expect(frontierProblems(orphan).join('\n')).toMatch(/0,2 is popped but its parent 0,1 is not/)
  })

  it('a tampered recording cannot build: a pop that pushed two cells', () => {
    const rec = R['k-pairs']
    const pauses = rec.pauses.map((x, i) => (i === 2 ? { ...x, vars: { ...x.vars, heap: [...(x.vars.heap as number[][]), [11, 1, 1]] } } : x))
    expect(() => kPairsData({ ...R, 'k-pairs': { ...rec, pauses } })).toThrow(/more than one cell/)
  })
})

describe('the presets are their recordings, rebuilt', () => {
  it('combination sum, water and k pairs', () => {
    expect(combinationSumData(R)).toEqual(combinationSumTakeSkip.data)
    expect(waterData(R)).toEqual(waterWellsSource.data)
    expect(kPairsData(R)).toEqual(kPairsLazyGrid.data)
  })
})

// ---------------------------------------------------------------------------
// Layout: nothing spills or collides at either width.
// ---------------------------------------------------------------------------

const textW = (t: string) => monoWidth(t, SIZE.small)

describe('wave 3A layouts', () => {
  const calls = combinationSumTakeSkip.data.panels[0] as CallPanel

  it.each(['narrow', 'wide'] as const)('call tree (%s): boxes and the lines under them stay inside and apart', (v) => {
    const g = layoutCalls(calls, v)
    const items = calls.nodes.map((n) => {
      const b = g.boxes[n.id]
      const w = Math.max(b.w, textW(underText(n)))
      return { id: n.id, x: b.x + b.w / 2 - w / 2, w, y: b.y, h: CALLS.under + 4 }
    })
    for (const a of items) {
      expect(a.x, a.id).toBeGreaterThanOrEqual(0)
      expect(a.x + a.w, a.id).toBeLessThanOrEqual(g.width)
      for (const b of items)
        if (a !== b && a.y === b.y) expect(Math.abs(a.x + a.w / 2 - (b.x + b.w / 2)), `${a.id} ${b.id}`).toBeGreaterThanOrEqual((a.w + b.w) / 2 + 2)
    }
    for (const e of g.edges) if (e.label) expect(e.label.x - textW(e.label.text)).toBeGreaterThanOrEqual(0)
    for (const l of [...calls.legend, ...calls.notes, calls.heading]) expect(textW(l), l).toBeLessThanOrEqual(g.width)
  })

  it('graphs: nodes, labels and notes inside the 288 panel', () => {
    for (const p of waterWellsSource.data.panels as GraphPanel[]) {
      const g = layoutGraph(p)
      for (const a of Object.values(g.at)) {
        expect(a.x - (a.w ? a.w / 2 : GRAPH.r)).toBeGreaterThanOrEqual(0)
        expect(a.x + (a.w ? a.w / 2 : GRAPH.r)).toBeLessThanOrEqual(g.width)
      }
      for (const l of [...p.notes, p.heading]) expect(textW(l), l).toBeLessThanOrEqual(g.width)
    }
  })

  it('grids: cells, arrows and notes inside the 288 panel', () => {
    for (const p of kPairsLazyGrid.data.panels as GridPanel[]) {
      const g = layoutGrid(p)
      expect(g.x[g.x.length - 1] + GRID.cell.w).toBeLessThanOrEqual(g.width)
      for (const l of [...p.notes, p.heading]) expect(textW(l), l).toBeLessThanOrEqual(g.width)
    }
  })

  it('the figure data is plain values (no code text)', () => {
    for (const d of [combinationSumTakeSkip.data, waterWellsSource.data, kPairsLazyGrid.data] as TreeData[])
      expect(JSON.stringify(d)).not.toMatch(/function|const |=>|\.push\(|heap\[/)
  })
})
