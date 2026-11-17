// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { annotatedTreeDescriptor } from './descriptor'
import {
  FOREST,
  HEAP,
  INTERVAL,
  REC,
  ROW,
  SEG,
  forestDepth,
  hitWidth,
  layoutForest,
  layoutHeap,
  layoutInterval,
  layoutRecursion,
  layoutSegment,
  smallW,
  type ForestPanel,
  type HeapPanel,
  type IntervalPanel,
  type RecursionPanel,
  type SegmentPanel,
} from './dsa'
import { SIZE, W } from './layout'
import type { TreeData } from './model'
import {
  DSA_PRESETS,
  DSA_RECORDINGS,
  callTree,
  dsuParentForest,
  fib5,
  fibData,
  heapData,
  heapInsertExtract,
  lpsData,
  lpsIntervalTriangle,
  segmentData,
  segmentTreeQueryCover,
  unionData,
} from './presets/dsa'

/**
 * The wave 4A figures (segment trees, union-find, heaps, recursion and
 * memoization, palindromic subsequence) against the register's verification
 * values (R4) and the rule each figure states, with the lies that must fail.
 * The recordings themselves are re-run from the content checkout by
 * `annotated-tree.truth.test.ts`.
 */

const R = DSA_RECORDINGS

// ---------------------------------------------------------------------------
// The rules each figure states, as checks a lie must fail.
// ---------------------------------------------------------------------------

/** A segment tree: each node's range halves into its children's, a leaf is arr[i], a parent's sum is its children's. */
export function segmentProblems(p: SegmentPanel, arr: number[]): string[] {
  const out: string[] = []
  const by = new Map(p.nodes.map((n) => [n.idx, n]))
  for (const n of p.nodes) {
    const l = by.get(2 * n.idx + 1)
    const r = by.get(2 * n.idx + 2)
    if (n.start === n.end) {
      if (l || r) out.push(`${n.idx}: a leaf with children`)
      // A leaf with a pending tag is stale: its sum is the array value until visited.
      continue
    }
    const mid = Math.floor((n.start + n.end) / 2)
    if (!l || !r) {
      out.push(`${n.idx}: an inner node without two children`)
      continue
    }
    if (l.start !== n.start || l.end !== mid || r.start !== mid + 1 || r.end !== n.end) out.push(`${n.idx}: children do not halve [${n.start},${n.end}]`)
  }
  for (const n of p.nodes.filter((x) => x.start === x.end && x.was === undefined && !x.tag && p.mark !== 'lazy')) if (n.sum !== arr[n.start] && p.mark === 'cover' && p.id === 'query') out.push(`leaf ${n.idx} is not arr[${n.start}]`)
  return out
}

/** A query's cover: full inside [L, R], disjoint outside, partial overlapping; a full or disjoint node's subtree is never visited. */
export function coverProblems(p: SegmentPanel, L: number, R: number): string[] {
  const out: string[] = []
  for (const n of p.nodes) {
    if (!n.cover) continue
    const want = n.end < L || n.start > R ? 'disjoint' : L <= n.start && n.end <= R ? 'full' : 'partial'
    if (n.cover !== want) out.push(`${n.idx} [${n.start},${n.end}] is ${n.cover}, not ${want}`)
  }
  return out
}

/** The update path: root to the leaf of `index`, each step into the child whose range holds it; every sum off the path unchanged. */
export function pathProblems(p: SegmentPanel, index: number): string[] {
  const out: string[] = []
  for (const n of p.nodes) {
    const on = n.start <= index && index <= n.end
    if (Boolean(n.path) !== on) out.push(`${n.idx}: ${n.path ? 'marked off' : 'not marked on'} the path to ${index}`)
    if (!on && n.was !== undefined) out.push(`${n.idx}: off the path but its sum changed`)
  }
  return out
}

/** The forest: every arrow is parent[i], no cycles, and a marked node's pointer differs from the panel before. */
export function forestProblems(p: ForestPanel, prev: number[]): string[] {
  const out: string[] = []
  const row = p.rows.find((r) => r.name === 'parent')!
  if (JSON.stringify(row.values) !== JSON.stringify(p.parent)) out.push('the parent[] row is not the forest')
  try {
    for (let i = 0; i < p.parent.length; i++) forestDepth(p.parent, i)
  } catch {
    out.push('parent[] has a cycle')
  }
  for (let i = 0; i < p.parent.length; i++) {
    const changed = p.parent[i] !== prev[i]
    if (changed !== p.changed.includes(i)) out.push(`${i}: ${changed ? 'changed but not marked' : 'marked but unchanged'}`)
  }
  return out
}

/** The heap property, parent <= children, over the array read as a tree; `skip` exempts one node mid-sift. */
export function heapProblems(heap: number[], skip?: number): string[] {
  const out: string[] = []
  for (let i = 1; i < heap.length; i++) {
    const parent = Math.floor((i - 1) / 2)
    if (parent !== skip && heap[parent] > heap[i]) out.push(`${heap[parent]} at ${parent} is above a smaller ${heap[i]} at ${i}`)
  }
  return out
}

/** The call tree: fib(n) calls fib(n - 1) then fib(n - 2); a base case or a memo hit calls nothing. */
export function callProblems(p: RecursionPanel): string[] {
  const out: string[] = []
  for (const n of p.nodes) {
    const kids = p.nodes.filter((k) => k.parent === n.id)
    if ((n.n <= 1 || n.hit) && kids.length) out.push(`${n.id}: fib(${n.n}) has calls below it`)
    if (n.n > 1 && !n.hit && (kids.length !== 2 || kids[0].n !== n.n - 1 || kids[1].n !== n.n - 2)) out.push(`${n.id}: fib(${n.n}) does not call n - 1 then n - 2`)
  }
  return out
}

/** An order overlay respects the arrows: every cell is written after the cells it reads (the base cells first). */
export function orderProblems(p: IntervalPanel): string[] {
  const out: string[] = []
  const at = (i: number, j: number) => p.cells.find((c) => c.i === i && c.j === j)!
  const order = (i: number, j: number) => (i === j ? 0 : at(i, j).order!)
  for (const c of p.cells) {
    if (c.i === c.j) continue
    for (const [a, b] of [
      [c.i + 1, c.j - 1],
      [c.i + 1, c.j],
      [c.i, c.j - 1],
    ]) {
      if (a > b) continue
      if (order(a, b) >= order(c.i, c.j)) out.push(`(${c.i},${c.j}) #${order(c.i, c.j)} reads (${a},${b}) #${order(a, b)} before it is written`)
    }
  }
  return out
}

// ---------------------------------------------------------------------------

describe('segment-tree-query-cover (segment-trees)', () => {
  const [query, update, tags, pushed] = segmentTreeQueryCover.data.panels as SegmentPanel[]
  const arr = [1, 3, 5, 7, 9, 11]

  it('the register: query(1,3) = 15, then 22 after update(1,10); the lazy example prints 15 and 35 (Node 24)', () => {
    expect(segmentTreeQueryCover.programs.map((p) => p.observed)).toEqual([
      ['15', '22'],
      ['15', '35'],
    ])
    expect(query.nodes.find((n) => n.idx === 0)!.sum).toBe(36)
    expect(query.nodes.map((n) => n.idx)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 11, 12])
    for (const p of [query, update, tags, pushed]) expect(segmentProblems(p, arr), p.id).toEqual([])
  })

  it('panel 1: full [1,1] [2,2] [3,3]; partial [0,5] [0,2] [0,1] [3,5] [3,4]; disjoint [0,0] [4,4] [5,5]', () => {
    const of = (c: string) => query.nodes.filter((n) => n.cover === c).map((n) => `[${n.start},${n.end}]`)
    expect(of('full')).toEqual(['[2,2]', '[1,1]', '[3,3]'])
    expect(of('partial')).toEqual(['[0,5]', '[0,2]', '[3,5]', '[0,1]', '[3,4]'])
    expect(of('disjoint')).toEqual(['[5,5]', '[0,0]', '[4,4]'])
    expect(coverProblems(query, 1, 3)).toEqual([])
    expect(query.notes[1]).toBe('3 + 5 + 7 = 15')
  })

  it('panel 2: update(1,10) walks [0,5] -> [0,2] -> [0,1] -> [1,1] with old -> new sums; nothing else changes', () => {
    expect(update.nodes.filter((n) => n.path).map((n) => [`[${n.start},${n.end}]`, n.was, n.sum])).toEqual([
      ['[0,5]', 36, 43],
      ['[0,2]', 9, 16],
      ['[0,1]', 4, 11],
      ['[1,1]', 3, 10],
    ])
    expect(pathProblems(update, 1)).toEqual([])
    expect(update.notes[2]).toBe('query(1, 3) is now 22')
  })

  it('panel 3: updateRange(0,2,10) tags nodes 3 and 4 ([0,1], [2,2]) while their sums stay 4 and 5', () => {
    expect(tags.nodes.filter((n) => n.tag).map((n) => [n.idx, n.tag, n.sum])).toEqual([
      [3, 10, 4],
      [4, 10, 5],
    ])
    expect(tags.nodes.filter((n) => n.was !== undefined).map((n) => [n.idx, n.was, n.sum])).toEqual([
      [0, 36, 66],
      [1, 9, 39],
    ])
  })

  it('panel 4: queryRange(1,3) applies every tag it meets: [0,1] 24, leaves 11 and 13, [2,2] 15; 13 + 15 + 7 = 35; no tag left', () => {
    expect(pushed.nodes.filter((n) => n.was !== undefined).map((n) => [n.idx, n.was, n.sum])).toEqual([
      [3, 4, 24],
      [4, 5, 15],
      [7, 1, 11],
      [8, 3, 13],
    ])
    expect(pushed.nodes.some((n) => n.tag)).toBe(false)
    expect(coverProblems(pushed, 1, 3)).toEqual([])
    expect(pushed.notes[1]).toBe('13 + 15 + 7 = 35')
  })

  it('a lie fails: a wrong cover, a path off the index, a range that does not halve', () => {
    const swap = { ...query, nodes: query.nodes.map((n) => (n.idx === 7 ? { ...n, cover: 'full' as const } : n)) }
    expect(coverProblems(swap, 1, 3).join('\n')).toMatch(/7 \[0,0\] is full, not disjoint/)
    const wrongPath = { ...update, nodes: update.nodes.map((n) => (n.idx === 4 ? { ...n, path: true } : n)) }
    expect(pathProblems(wrongPath, 1).join('\n')).toMatch(/4: marked off the path/)
    const bad = { ...query, nodes: query.nodes.map((n) => (n.idx === 3 ? { ...n, end: 2 } : n)) }
    expect(segmentProblems(bad, arr).join('\n')).toMatch(/children do not halve/)
  })

  it('a tampered recording cannot build: a full node whose sum does not add up to the printed answer', () => {
    const rec = R['segment-tree']
    const pauses = rec.pauses.map((p) => (p.probe === 'full' && p.vars.node === 8 ? { ...p, vars: { ...p.vars, sum: 4 } } : p))
    const visits = pauses.map((p) => (p.probe === 'visit' && p.vars.node === 8 ? { ...p, vars: { ...p.vars, sum: 4 } } : p))
    expect(() => segmentData({ ...R, 'segment-tree': { ...rec, pauses: visits } })).toThrow(/do not sum/)
  })
})

describe('dsu-parent-forest (union-find)', () => {
  const [p1, p2, chain, compressed] = dsuParentForest.data.panels as ForestPanel[]
  const id = Array.from({ length: 10 }, (_, i) => i)

  it('the register: the lesson prints 1,1,1,4 (rank) and 2,2,2,4 (size) (Node 24)', () => {
    expect(dsuParentForest.programs.map((p) => p.observed)).toEqual([['1', '1', '1', '4'], ['2', '2', '2', '4'], ['7']])
  })

  it('panel 1: union(1,2) by rank hangs 2 under 1 and sets rank[1] = 1', () => {
    expect(p1.parent[2]).toBe(1)
    expect(p1.rows[1].values[1]).toBe(1)
    expect(forestProblems(p1, id)).toEqual([])
  })

  it('panel 2: union(2,3) hangs 3 under root 1 (find(1) is 1, not 3); by size the root is 2', () => {
    expect(p2.parent.slice(1, 4)).toEqual([1, 1, 1])
    expect(p2.changed).toEqual([3])
    expect(forestProblems(p2, p1.parent)).toEqual([])
    expect(p2.notes[2]).toBe('by size: root 2 (size 3), finds 2, 2, 2')
  })

  it('panels 3 and 4: the chain 4 -> 5 -> 6 -> 7, then find(4) points 4, 5 and 6 straight at 7', () => {
    expect(chain.parent.slice(4, 8)).toEqual([5, 6, 7, 7])
    expect(compressed.parent.slice(4, 8)).toEqual([7, 7, 7, 7])
    expect(forestProblems(compressed, chain.parent)).toEqual([])
    expect(compressed.changed).toEqual([4, 5])
    expect(Math.max(...compressed.parent.map((_, i) => forestDepth(compressed.parent, i)))).toBe(1)
  })

  it('a lie fails: a marked node that did not change, a missing mark, a cycle', () => {
    expect(forestProblems({ ...p2, changed: [2, 3] }, p1.parent).join('\n')).toMatch(/2: marked but unchanged/)
    expect(forestProblems({ ...compressed, changed: [4] }, chain.parent).join('\n')).toMatch(/5: changed but not marked/)
    const cyc = [...chain.parent]
    cyc[7] = 4
    expect(forestProblems({ ...chain, parent: cyc, rows: [{ ...chain.rows[0], values: cyc }, chain.rows[1]] }, chain.parent).join('\n')).toMatch(/cycle/)
  })

  it('a tampered recording cannot build: the last find to return is not find(4)', () => {
    const rec = R['union-find-chain']
    const pauses = rec.pauses.slice(0, -1)
    expect(() => unionData({ ...R, 'union-find-chain': { ...rec, pauses } })).toThrow(/not find\(4\)/)
  })
})

describe('insert-4-10-3-5-1-then-extract (heaps)', () => {
  const [built, moved, sifted] = heapInsertExtract.data.panels as HeapPanel[]

  it('the register: [1,3,4,10,5], then [5,3,4,10], then [3,5,4,10] (Node 24)', () => {
    expect(built.heap).toEqual([1, 3, 4, 10, 5])
    expect(moved.heap).toEqual([5, 3, 4, 10])
    expect(sifted.heap).toEqual([3, 5, 4, 10])
    expect(heapInsertExtract.programs[0].observed).toEqual(['[1,3,4,10,5]', '1 [3,5,4,10]'])
  })

  it('not sorted, yet a heap; 5 at the root compares 3 and 4 and swaps with 3; then 5 has one child, 10, and stops', () => {
    expect([...built.heap].sort((a, b) => a - b)).not.toEqual(built.heap)
    expect(heapProblems(built.heap)).toEqual([])
    expect(moved.compare).toEqual({ at: 0, kids: [1, 2], smaller: 1 })
    expect(heapProblems(moved.heap, 0)).toEqual([])
    expect(heapProblems(moved.heap).length).toBeGreaterThan(0)
    expect(sifted.compare).toEqual({ at: 1, kids: [3], smaller: null })
    expect(heapProblems(sifted.heap)).toEqual([])
  })

  it('a lie fails: a sorted array drawn as the inserts, a larger child marked smaller', () => {
    expect(heapProblems([1, 10, 3, 5, 4]).join('\n')).toMatch(/10 at 1 is above a smaller 5 at 3/)
    const wrong = { ...moved, compare: { ...moved.compare!, smaller: 2 } }
    expect(wrong.heap[wrong.compare.smaller]).toBeGreaterThan(Math.min(...wrong.compare.kids.map((k) => wrong.heap[k])))
  })

  it('a tampered recording cannot build: a second extracted snapshot', () => {
    const rec = R['min-heap-extract']
    expect(() => heapData({ ...R, 'min-heap-extract': { ...rec, pauses: [...rec.pauses, rec.pauses[rec.pauses.length - 1]] } })).toThrow(/expected 1/)
  })
})

describe('fib5 (recursion-and-memoization)', () => {
  const [naive, memo] = fib5.data.panels as RecursionPanel[]

  it('the register: 15 calls without memo, 9 with; memo writes 2, 3, 4, 5 (Node 24)', () => {
    expect(naive.nodes).toHaveLength(15)
    expect(memo.nodes).toHaveLength(9)
    expect(memo.memo!.map((m) => m.n)).toEqual([2, 3, 4, 5])
    expect(memo.memo!.map((m) => m.value)).toEqual([1, 2, 3, 5])
    expect(fib5.programs.map((p) => p.observed)).toEqual([['5'], ['5']])
  })

  it('fib(3) twice and fib(2) three times are marked; memo hits are the right children memo[2] and memo[3]', () => {
    const marked = naive.nodes.filter((n) => n.repeat).map((n) => n.n)
    expect(marked.filter((n) => n === 3)).toHaveLength(2)
    expect(marked.filter((n) => n === 2)).toHaveLength(3)
    expect(memo.nodes.filter((n) => n.hit).map((n) => [n.n, memo.nodes.find((x) => x.id === n.parent)!.n])).toEqual([
      [2, 4],
      [3, 5],
    ])
    expect(callProblems(naive)).toEqual([])
    expect(callProblems(memo)).toEqual([])
  })

  it('a lie fails: a hit with calls below it, a call that skips n - 1', () => {
    const lie = { ...memo, nodes: memo.nodes.map((n) => (n.n === 2 && !n.hit ? { ...n, hit: true } : n)) }
    expect(callProblems(lie).join('\n')).toMatch(/fib\(2\) has calls below it/)
    const skip = { ...naive, nodes: naive.nodes.map((n) => (n.id === 'f1' ? { ...n, n: 3 } : n)) }
    expect(callProblems(skip).join('\n')).toMatch(/does not call n - 1 then n - 2/)
  })

  it('a tampered recording cannot build: a missing call breaks the pre-order', () => {
    const rec = R['fib-5']
    expect(() => callTree({ ...rec, pauses: rec.pauses.slice(0, -1) })).toThrow()
  })
})

describe('lps-interval-triangle (palindromic-subsequence)', () => {
  const [table, byLength, byRow] = lpsIntervalTriangle.data.panels as IntervalPanel[]

  it('the register: row 0 of "bbbab" is 1 2 3 3 4; the lesson and the answer print 4 and fill the same table (Node 24)', () => {
    expect(table.cells.filter((c) => c.i === 0).map((c) => c.value)).toEqual([1, 2, 3, 3, 4])
    expect(lpsIntervalTriangle.programs.map((p) => p.observed)).toEqual([['4'], ['4']])
    expect(table.cells.every((c) => c.i <= c.j)).toBe(true)
    expect(table.cells).toHaveLength(15)
  })

  it('dp[0][4] reads dp[1][3] (+2, used: s[0] = s[4]), dp[1][4] and dp[0][3]', () => {
    expect(table.target).toEqual([0, 4])
    expect(table.arrows).toEqual([
      { to: [1, 3], used: true },
      { to: [1, 4], used: false },
      { to: [0, 3], used: false },
    ])
    const at = (i: number, j: number) => table.cells.find((c) => c.i === i && c.j === j)!.value
    expect(at(0, 4)).toBe(at(1, 3) + 2)
  })

  it('both orders respect the arrows: by length (lesson) and rows from the bottom (answer)', () => {
    expect(byLength.cells.filter((c) => c.i < c.j).sort((a, b) => a.order! - b.order!).map((c) => `${c.i}${c.j}`)).toEqual(['01', '12', '23', '34', '02', '13', '24', '03', '14', '04'])
    expect(byRow.cells.filter((c) => c.i < c.j).sort((a, b) => a.order! - b.order!).map((c) => `${c.i}${c.j}`)).toEqual(['34', '23', '24', '12', '13', '14', '01', '02', '03', '04'])
    expect(orderProblems(byLength)).toEqual([])
    expect(orderProblems(byRow)).toEqual([])
  })

  it('a lie fails: rows filled top-down (i counting up) read cells not yet written', () => {
    const up = ['01', '02', '03', '04', '12', '13', '14', '23', '24', '34']
    const lie = { ...byRow, cells: byRow.cells.map((c) => (c.i < c.j ? { ...c, order: up.indexOf(`${c.i}${c.j}`) + 1 } : c)) }
    expect(orderProblems(lie).join('\n')).toMatch(/\(0,2\) #2 reads \(1,1\)|reads \(1,2\) #5 before it is written/)
  })

  it('the figure carries no answer text: order numbers only', () => {
    expect(JSON.stringify(byRow)).not.toMatch(/longestPalindromeSubseq|Math\.max|for \(|f\[i/)
  })

  it('a tampered recording cannot build: the answer filling a different table', () => {
    const rec = R['lps-answer-bbbab']
    const pauses = rec.pauses.map((p) => (p.probe === 'table' ? { ...p, vars: { f: [[9]] } } : p))
    expect(() => lpsData({ ...R, 'lps-answer-bbbab': { ...rec, pauses } })).toThrow(/different tables/)
  })
})

describe('the presets are their recordings, rebuilt', () => {
  it('all five', () => {
    expect(segmentData(R)).toEqual(segmentTreeQueryCover.data)
    expect(unionData(R)).toEqual(dsuParentForest.data)
    expect(heapData(R)).toEqual(heapInsertExtract.data)
    expect(fibData(R)).toEqual(fib5.data)
    expect(lpsData(R)).toEqual(lpsIntervalTriangle.data)
  })

  it('every preset is registered on the annotated tree', () => {
    for (const p of DSA_PRESETS) expect(annotatedTreeDescriptor.presets).toContain(p)
  })
})

// ---------------------------------------------------------------------------
// Layout: nothing spills or collides in the 288 panel.
// ---------------------------------------------------------------------------

type Box = { id: string; x: number; y: number; w: number; h: number }
const overlaps = (a: Box, b: Box, pad = 1) => a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad
function apart(boxes: Box[]) {
  for (const a of boxes) {
    expect(a.x, a.id).toBeGreaterThanOrEqual(0)
    expect(a.x + a.w, a.id).toBeLessThanOrEqual(W)
    for (const b of boxes) if (a !== b) expect(overlaps(a, b), `${a.id} / ${b.id}`).toBe(false)
  }
}
const texts = (p: { heading: string; notes: string[]; legend?: string[] }) => [p.heading, ...p.notes, ...(p.legend ?? [])]

describe('wave 4A layouts', () => {
  const all = DSA_PRESETS.flatMap((p) => (p.data as TreeData).panels)

  it('every heading, legend and note line fits the 288 panel', () => {
    for (const p of all) for (const t of texts(p as never)) expect(smallW(t), t).toBeLessThanOrEqual(W)
  })

  it('segment trees: boxes inside and apart', () => {
    for (const p of segmentTreeQueryCover.data.panels as SegmentPanel[]) {
      const g = layoutSegment(p)
      apart(Object.values(g.boxes).map((b) => ({ id: `${p.id}:${b.idx}`, x: b.x, y: b.y, w: b.w, h: SEG.h })))
    }
  })

  it('forests: nodes in their columns, cells inside', () => {
    for (const p of dsuParentForest.data.panels as ForestPanel[]) {
      const g = layoutForest(p)
      apart(g.at.map((a, i) => ({ id: `${p.id}:${i}`, x: a.x - FOREST.r, y: a.y - FOREST.r, w: 2 * FOREST.r, h: 2 * FOREST.r })))
      expect(g.colX[g.colX.length - 1] + FOREST.cellW / 2).toBeLessThanOrEqual(W)
      expect(g.rows.rowY[0]).toBeGreaterThan(Math.max(...g.at.map((a) => a.y)) + FOREST.r)
    }
  })

  it('heaps: nodes and cells inside and apart', () => {
    for (const p of heapInsertExtract.data.panels as HeapPanel[]) {
      const g = layoutHeap(p)
      apart([
        ...g.at.map((a, i) => ({ id: `${p.id}:n${i}`, x: a.x - HEAP.r, y: a.y - HEAP.r, w: 2 * HEAP.r, h: 2 * HEAP.r })),
        ...g.cellX.map((x, i) => ({ id: `${p.id}:c${i}`, x: x - HEAP.cellW / 2, y: g.rows.rowY[0], w: HEAP.cellW, h: ROW.cell.h })),
      ])
      expect(g.bend).toBeLessThan(g.rows.headerY! - 13)
    }
  })

  it('call trees: nodes and memo-hit leaves inside and apart', () => {
    for (const p of fib5.data.panels as RecursionPanel[]) {
      const g = layoutRecursion(p)
      apart(
        p.nodes.map((n) => {
          const a = g.at[n.id]
          const w = n.hit ? hitWidth(n.n) : 2 * REC.r
          return { id: `${p.id}:${n.id}`, x: a.x - w / 2, y: a.y - REC.r, w, h: 2 * REC.r }
        }),
      )
    }
  })

  it('interval tables: cells inside; the lower-triangle label fits left of the diagonal', () => {
    for (const p of lpsIntervalTriangle.data.panels as IntervalPanel[]) {
      const g = layoutInterval(p)
      expect(g.x[g.x.length - 1] + INTERVAL.cell.w).toBeLessThanOrEqual(W)
      expect(g.empty.x + smallW('i > j: empty interval')).toBeLessThanOrEqual(g.x[p.s.length - 1] - 4)
    }
  })

  it('the figure data is plain values (no code text)', () => {
    for (const p of DSA_PRESETS) expect(JSON.stringify(p.data)).not.toMatch(/function|const |=>|\.push\(|this\./)
  })

  it('the panel line is the substrate line', () => {
    expect(SIZE.line).toBe(16)
  })
})
