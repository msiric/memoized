import type { HashedProgram, StaticPreset } from '../../../shell/static-types'
import type { ForestPanel, HeapPanel, IntervalPanel, RecNode, RecursionPanel, SegCover, SegNodeView, SegmentPanel } from '../dsa'
import type { TreeData } from '../model'
import {
  fibMemoProgram,
  fibProgram,
  heapProgram,
  lazyProgram,
  lpsAnswerProgram,
  lpsProgram,
  segmentProgram,
  unionChainProgram,
  unionRankProgram,
  unionSizeProgram,
} from '../programs/dsa'
import type { TreePause, TreeProgram, TreeRecording } from '../programs/types'
import heapRec from '../recordings/heaps.json'
import lpsRec from '../recordings/palindromic-subsequence.json'
import recRec from '../recordings/recursion-and-memoization.json'
import segRec from '../recordings/segment-trees.json'
import ufRec from '../recordings/union-find.json'

/**
 * The wave 4A presets (R4 rows segment-trees, union-find, heaps,
 * recursion-and-memoization, palindromic-subsequence). Every panel is built
 * from a committed recording of the lesson's code (values only); a preset
 * adds the title, the caption, the panel headings and note lines whose
 * values are read from the recording. Nothing is computed that the
 * recording does not hold: the builders only select and link recorded
 * values, and `dsa.truth.test.ts` checks every link against the rule the
 * figure states, with lies that must fail.
 */

export type DsaRecordings = Record<string, TreeRecording>
export const DSA_RECORDINGS = { ...segRec, ...ufRec, ...heapRec, ...recRec, ...lpsRec } as unknown as DsaRecordings

const verified = (p: TreeProgram, rec: TreeRecording): HashedProgram => ({ id: p.id, runtime: 'node@24.x', sha256: rec.sha256, observed: rec.stdout })

const num = (v: unknown, what: string): number => {
  if (typeof v !== 'number') throw new Error(`dsa: ${what} is not a recorded number (${JSON.stringify(v)})`)
  return v
}
const nums = (v: unknown, what: string): number[] => {
  if (!Array.isArray(v) || v.some((x) => typeof x !== 'number')) throw new Error(`dsa: ${what} is not a recorded number list`)
  return v as number[]
}
const only = (ps: TreePause[], what: string): TreePause => {
  if (ps.length !== 1) throw new Error(`dsa: ${ps.length} pauses for ${what}, expected 1`)
  return ps[0]
}

// ---------------------------------------------------------------------------
// Segment trees
// ---------------------------------------------------------------------------

/** The calls a run made, split at each `split` probe: each query's visits with how they ended. */
type Visit = { node: number; start: number; end: number; sum: number; cover: SegCover; tag?: number; after?: number }

/** Query visits, in order: a visit probe followed by the probe for how that call ended. */
function visits(pauses: TreePause[], prefix = ''): Visit[] {
  const out: Visit[] = []
  for (let k = 0; k < pauses.length; k++) {
    const p = pauses[k]
    if (p.probe !== `${prefix}visit`) continue
    const next = pauses[k + 1]
    const ends: Record<string, SegCover> = { [`${prefix}disjoint`]: 'disjoint', [`${prefix}full`]: 'full', [`${prefix}partial`]: 'partial' }
    if (!next || !ends[next.probe] || next.vars.node !== p.vars.node) throw new Error(`dsa: visit of node ${String(p.vars.node)} has no recorded end`)
    const v: Visit = { node: num(p.vars.node, 'node'), start: num(p.vars.start, 'start'), end: num(p.vars.end, 'end'), sum: 0, cover: ends[next.probe] }
    v.sum = num(p.vars.sum ?? next.vars.sum, 'sum')
    if (p.vars.tag !== undefined) v.tag = num(p.vars.tag, 'tag')
    if (next.vars.sum !== undefined) v.after = num(next.vars.sum, 'sum after')
    out.push(v)
  }
  return out
}

/** Pauses between the n-th and (n+1)-th pause of probe `at` (statement snapshots split the run). */
function between(pauses: TreePause[], at: string, n: number): TreePause[] {
  const idx = pauses.map((p, i) => (p.probe === at ? i : -1)).filter((i) => i >= 0)
  return pauses.slice(idx[n] + 1, idx[n + 1] ?? pauses.length)
}

/** Every node the build made (all visited by a first query here), with tree[] values from a snapshot. */
function segNodes(vs: Visit[], tree: number[]): SegNodeView[] {
  return [...vs].sort((a, b) => a.node - b.node).map((v) => ({ idx: v.node, start: v.start, end: v.end, sum: tree[v.node] }))
}

const levelOf = (i: number): number => (i === 0 ? 0 : levelOf(Math.floor((i - 1) / 2)) + 1)
const perLevel = (vs: Visit[]) => {
  const c = new Map<number, number>()
  for (const v of vs) c.set(levelOf(v.node), (c.get(levelOf(v.node)) ?? 0) + 1)
  return Math.max(...c.values())
}

const coverLegend = ['doubled: full, taken whole', 'plain: partial, split in two', 'dashed: disjoint, returns 0']

export function segmentData(rec: DsaRecordings): TreeData {
  const r = rec[segmentProgram.id]
  const trees = r.pauses.filter((p) => p.probe === 'tree').map((p) => nums(p.vars.tree, 'tree'))
  if (trees.length !== 3) throw new Error('segment: expected three tree[] snapshots')
  const [built, , updated] = trees
  const first = visits(between(r.pauses, 'tree', 0))
  const second = visits(between(r.pauses, 'tree', 2))
  const updates = between(r.pauses, 'tree', 1).filter((p) => p.probe === 'update')
  const path = new Set(updates.map((p) => num(p.vars.node, 'node')))
  const base = segNodes(first, built)
  const total = (vs: Visit[]) => vs.filter((v) => v.cover === 'full').reduce((s, v) => s + v.sum, 0)
  const fullOf = (vs: Visit[]) => vs.filter((v) => v.cover === 'full').map((v) => `[${v.start},${v.end}]`)
  const [q1, q2] = r.stdout.map(Number)
  if (total(first) !== q1 || total(second) !== q2) throw new Error('segment: the full nodes do not sum to the printed answers')
  const leaf = updates[updates.length - 1]
  return {
    panels: [
      {
        kind: 'segment',
        id: 'query',
        heading: 'query(1, 3) on [1,3,5,7,9,11]',
        mark: 'cover',
        nodes: base.map((n) => ({ ...n, cover: first.find((v) => v.node === n.idx)!.cover })),
        legend: coverLegend,
        notes: [
          `full: ${fullOf(first).join(' ')}`,
          `${first.filter((v) => v.cover === 'full').map((v) => v.sum).join(' + ')} = ${q1}`,
          `at most ${perLevel(first)} calls per level: O(log n)`,
        ],
      },
      {
        kind: 'segment',
        id: 'update',
        heading: 'update(1, 10): one root-to-leaf path',
        mark: 'path',
        nodes: base.map((n) => ({ ...n, sum: updated[n.idx], ...(path.has(n.idx) ? { was: built[n.idx], path: true } : {}) })),
        legend: ['doubled: the path update walks', 'old→new: tree[] before and after'],
        notes: [`${updates.length} calls rewrite ${updates.length} sums`, `leaf [${num(leaf.vars.start, 's')},${num(leaf.vars.end, 'e')}] is set; each parent re-adds`, `query(1, 3) is now ${q2}`],
      },
      ...lazyPanels(rec),
    ],
  }
}

function lazyPanels(rec: DsaRecordings): SegmentPanel[] {
  const r = rec[lazyProgram.id]
  const states = r.pauses.filter((p) => p.probe === 'state').map((p) => ({ tree: nums(p.vars.tree, 'tree'), lazy: nums(p.vars.lazy, 'lazy') }))
  if (states.length !== 3) throw new Error('lazy: expected three state snapshots')
  const first = visits(between(r.pauses, 'state', 0), 'q-')
  const update = between(r.pauses, 'state', 1)
  const second = visits(between(r.pauses, 'state', 2), 'q-')
  const returns = r.pauses.filter((p) => p.probe === 'q-return')
  const end = returns[returns.length - 1]
  if (num(end.vars.node, 'node') !== 0) throw new Error('lazy: the last split return is not the root')
  const after = { tree: nums(end.vars.own, 'tree'), lazy: nums(end.vars.lazy, 'lazy') }
  const mid = states[2]
  const nodes = segNodes(first, mid.tree)
  const tagged = nodes.filter((n) => mid.lazy[n.idx] !== 0)
  const fullUpdate = update.filter((p) => p.probe === 'u-full').map((p) => num(p.vars.node, 'node'))
  const [, q2] = r.stdout.map(Number)
  const fulls = second.filter((v) => v.cover === 'full')
  if (fulls.reduce((s, v) => s + v.after!, 0) !== q2) throw new Error('lazy: the full nodes do not sum to the printed answer')
  const name = (i: number) => {
    const n = nodes.find((x) => x.idx === i)!
    return `[${n.start},${n.end}]`
  }
  return [
    {
      kind: 'segment',
      id: 'lazy-tags',
      heading: 'updateRange(0, 2, 10): tags',
      mark: 'lazy',
      nodes: nodes.map((n) => ({ ...n, ...(mid.lazy[n.idx] ? { tag: mid.lazy[n.idx] } : {}), ...(mid.tree[n.idx] !== states[1].tree[n.idx] ? { was: states[1].tree[n.idx] } : {}) })),
      legend: ['+10: a lazy tag, lazy[i] after the call', 'old→new: tree[] the call rewrote'],
      notes: [
        `${fullUpdate.map(name).join(' ')} is whole: +3 × 10, then stop`,
        `tags on ${tagged.map((n) => name(n.idx)).join(' and ')}`,
        `${tagged.map((n) => n.sum).join(' and ')} stay stale until visited`,
      ],
    },
    {
      kind: 'segment',
      id: 'lazy-query',
      heading: 'queryRange(1, 3) pushes tags down',
      mark: 'cover',
      nodes: nodes.map((n) => {
        const v = second.find((x) => x.node === n.idx)!
        return { ...n, sum: after.tree[n.idx], ...(after.tree[n.idx] !== mid.tree[n.idx] ? { was: mid.tree[n.idx] } : {}), cover: v.cover, ...(after.lazy[n.idx] ? { tag: after.lazy[n.idx] } : {}) }
      }),
      legend: coverLegend,
      notes: [
        'tags apply on entry, then pass down',
        `${fulls.map((v) => v.after).join(' + ')} = ${q2}`,
        after.lazy.every((v) => v === 0) ? 'no tags left: all were visited' : 'tags left: nodes never visited',
      ],
    },
  ]
}

// ---------------------------------------------------------------------------
// Union-find
// ---------------------------------------------------------------------------

export function unionData(rec: DsaRecordings): TreeData {
  const rank = rec[unionRankProgram.id].pauses.map((p) => ({ parent: nums(p.vars.parent, 'parent'), rank: nums(p.vars.rank, 'rank') }))
  const size = only(rec[unionSizeProgram.id].pauses, 'size state')
  const chain = rec[unionChainProgram.id].pauses
  const before = only(chain.filter((p) => p.probe === 'state'), 'chain state')
  const finds = chain.filter((p) => p.probe === 'find')
  const last = finds[finds.length - 1]
  if (num(last.vars.x, 'x') !== 4) throw new Error('union-find: the last find to return is not find(4)')
  const [r1, r2] = rank
  const initial = r1.parent.map((_, i) => i)
  const diff = (a: number[], b: number[]) => a.map((v, i) => (v !== b[i] ? i : -1)).filter((i) => i >= 0)
  const prints = rec[unionRankProgram.id].stdout
  const bySize = rec[unionSizeProgram.id].stdout
  const sizeParent = nums(size.vars.parent, 'parent')
  const sizeOf = nums(size.vars.size, 'size')
  const cParent = nums(before.vars.parent, 'parent')
  const cAfter = nums(last.vars.parent, 'parent')
  const panel = (id: string, heading: string, parent: number[], rankRow: number[], prev: number[], prevRank: number[], notes: string[], rankName = 'rank'): ForestPanel => ({
    kind: 'forest',
    id,
    heading,
    parent,
    rows: [
      { name: 'parent', values: parent, changed: diff(parent, prev) },
      { name: rankName, values: rankRow, changed: diff(rankRow, prevRank) },
    ],
    changed: diff(parent, prev),
    notes,
  })
  const zero = r1.rank.map(() => 0)
  return {
    panels: [
      panel('union-1-2', 'union(1, 2): equal ranks', r1.parent, r1.rank, initial, zero, ['2 now points to 1; rank[1] = 1', 'a root is its own parent']),
      panel('union-2-3', 'union(2, 3): find(2) is 1', r2.parent, r2.rank, r1.parent, r1.rank, [
        `rank 1 > 0: 3 joins root 1`,
        `find(1), find(2), find(3) = ${prints.slice(0, 3).join(', ')}`,
        `by size: root ${sizeParent[1]} (size ${sizeOf[sizeParent[1]]}), finds ${bySize.slice(0, 3).join(', ')}`,
      ]),
      panel('chain', 'a chain, parent[] set by hand', cParent, nums(before.vars.rank, 'rank'), initial, zero, ['4 → 5 → 6 → 7: not built by rank', `find(4) walks ${finds.length - 1} links to root ${rec[unionChainProgram.id].stdout[0]}`]),
      panel('compressed', 'after find(4): path compression', cAfter, nums(before.vars.rank, 'rank'), cParent, nums(before.vars.rank, 'rank'), [
        `${diff(cAfter, cParent).join(' and ')} now point at 7 directly`,
        'the next find(4) is one link',
      ]),
    ],
  }
}

// ---------------------------------------------------------------------------
// Heaps
// ---------------------------------------------------------------------------

export function heapData(rec: DsaRecordings): TreeData {
  const r = rec[heapProgram.id]
  const built = nums(only(r.pauses.filter((p) => p.probe === 'inserted'), 'inserted').vars.built, 'heap')
  const moved = only(r.pauses.filter((p) => p.probe === 'moved'), 'moved')
  const [c1, c2] = r.pauses.filter((p) => p.probe === 'compare')
  const extracted = only(r.pauses.filter((p) => p.probe === 'extracted'), 'extracted')
  const kids = (c: TreePause) => [num(c.vars.left, 'left'), num(c.vars.right, 'right')].filter((k) => k < num(c.vars.length, 'length'))
  const step = (c: TreePause) => {
    const at = num(c.vars.index, 'index')
    const smallest = num(c.vars.smallest, 'smallest')
    return { at, kids: kids(c), smaller: smallest === at ? null : smallest }
  }
  const h1 = nums(moved.vars.heap, 'heap')
  const h2 = nums(extracted.vars.heap, 'heap')
  return {
    panels: [
      {
        kind: 'heap',
        id: 'inserted',
        heading: 'insert 4, 10, 3, 5, 1',
        heap: built,
        formulas: true,
        notes: [`[${built.join(',')}]: not sorted`, 'children of i: 2i+1 and 2i+2', 'each parent ≤ its children'],
      } satisfies HeapPanel,
      {
        kind: 'heap',
        id: 'moved',
        heading: `extractMin() → ${num(moved.vars.min, 'min')}: last to root`,
        heap: h1,
        compare: step(c1),
        formulas: false,
        notes: [`${h1[0]} moves up from index ${built.length - 1}`, `compare ${step(c1).kids.map((k) => h1[k]).join(' and ')}: marked ${h1[step(c1).smaller!]}, the smaller`],
      },
      {
        kind: 'heap',
        id: 'sifted',
        heading: 'after the swap',
        heap: h2,
        compare: step(c2),
        formulas: false,
        notes: [`[${h2.join(',')}]`, `marked ${h2[step(c2).at]}: ${h2[step(c2).at]} ≤ its one child ${step(c2).kids.map((k) => h2[k]).join(', ')}, stop`],
      },
    ],
  }
}

// ---------------------------------------------------------------------------
// Recursion and memoization
// ---------------------------------------------------------------------------

/**
 * The call tree from the recorded pre-order: a call is a leaf when it is a
 * base case (n <= 1, the lesson's first line) or a memo hit (read at its
 * entry); any other call made exactly two calls, the next two subtrees.
 */
export function callTree(rec: TreeRecording): RecNode[] {
  const calls = rec.pauses.filter((p) => p.probe === 'call')
  const nodes: RecNode[] = []
  let k = 0
  const parse = (parent: string | null) => {
    const p = calls[k++]
    if (!p) throw new Error('fib: the pre-order ended inside a call')
    const n = num(p.vars.n, 'n')
    const node: RecNode = { id: `f${nodes.length}`, n, parent }
    if (p.vars.hit === true) node.hit = true
    nodes.push(node)
    if (n <= 1 || node.hit) return
    parse(node.id)
    parse(node.id)
  }
  parse(null)
  if (k !== calls.length) throw new Error(`fib: ${calls.length - k} calls after the root returned`)
  return nodes
}

export function fibData(rec: DsaRecordings): TreeData {
  const naive = callTree(rec[fibProgram.id])
  const memo = callTree(rec[fibMemoProgram.id])
  const count = (n: number) => naive.filter((x) => x.n === n).length
  const writes = rec[fibMemoProgram.id].pauses.filter((p) => p.probe === 'write').map((p) => ({ n: num(p.vars.n, 'n'), value: num(p.vars.value, 'value') }))
  const repeated = [...new Set(naive.filter((x) => x.n > 1 && count(x.n) > 1).map((x) => x.n))].sort((a, b) => b - a)
  const depth = (ns: RecNode[]) => {
    const d: Record<string, number> = {}
    for (const n of ns) d[n.id] = n.parent ? d[n.parent] + 1 : 0
    return Math.max(...Object.values(d)) + 1
  }
  return {
    panels: [
      {
        kind: 'recursion',
        id: 'naive',
        heading: `fib(5) without memo: ${naive.length} calls`,
        nodes: naive.map((x) => (repeated.includes(x.n) ? { ...x, repeat: true } : x)),
        legend: ['node: the call fib(n)', 'doubled: a subproblem computed again'],
        notes: [repeated.map((n) => `fib(${n}) ×${count(n)}`).join(', ') + `, fib(1) ×${count(1)}`, `${naive.length} calls; prints ${rec[fibProgram.id].stdout[0]}`],
      } satisfies RecursionPanel,
      {
        kind: 'recursion',
        id: 'memo',
        heading: `fibMemo(5): ${memo.length} calls`,
        nodes: memo,
        memo: writes,
        legend: ['memo[n]: a hit, `n in memo`, no calls', 'write: the order memo[n] was set'],
        notes: [`${memo.filter((x) => x.hit).map((x) => `memo[${x.n}]`).join(', ')} hit: none recomputed`, `depth ${depth(memo)} either way: O(n) stack`],
      } satisfies RecursionPanel,
    ],
  }
}

// ---------------------------------------------------------------------------
// Palindromic subsequence
// ---------------------------------------------------------------------------

export function lpsData(rec: DsaRecordings): TreeData {
  const r = rec[lpsProgram.id]
  const table = only(r.pauses.filter((p) => p.probe === 'table'), 'table')
  const dp = (table.vars.dp as unknown[]).map((row, i) => nums(row, `dp[${i}]`))
  const s = String(table.vars.s)
  const order = (rr: TreeRecording) => rr.pauses.filter((p) => p.probe === 'cell').map((p) => [num(p.vars.i, 'i'), num(p.vars.j, 'j')] as const)
  const lesson = order(r)
  const answer = order(rec[lpsAnswerProgram.id])
  const n = s.length
  const cells = (ord?: readonly (readonly [number, number])[]) => {
    const out: IntervalPanel['cells'] = []
    for (let i = 0; i < n; i++)
      for (let j = i; j < n; j++) {
        const k = ord ? ord.findIndex(([a, b]) => a === i && b === j) : -1
        out.push({ i, j, value: dp[i][j], ...(ord && i < j ? { order: k + 1 } : {}) })
      }
    return out
  }
  const target: [number, number] = [0, n - 1]
  const same = s[0] === s[n - 1]
  const arrows: IntervalPanel['arrows'] = [
    { to: [1, n - 2], used: same },
    { to: [1, n - 1], used: !same },
    { to: [0, n - 2], used: !same },
  ]
  const answerTable = (only(rec[lpsAnswerProgram.id].pauses.filter((p) => p.probe === 'table'), 'answer table').vars.f as unknown[]).map((row, i) => nums(row, `f[${i}]`))
  if (JSON.stringify(answerTable) !== JSON.stringify(dp)) throw new Error('lps: the answer and the lesson fill different tables')
  return {
    panels: [
      {
        kind: 'interval',
        id: 'table',
        heading: `dp[i][j] for s = "${s}"`,
        s,
        cells: cells(),
        show: 'value',
        target,
        arrows,
        legend: [`bright: s[0] = s[${n - 1}], so dp[1][${n - 2}] + 2`, `dim: max(dp[1][${n - 1}], dp[0][${n - 2}]) if not`],
        notes: [`dp[0][${n - 1}] = ${dp[1][n - 2]} + 2 = ${dp[0][n - 1]}`, `prints ${r.stdout[0]} ("bbbb")`],
      },
      {
        kind: 'interval',
        id: 'by-length',
        heading: 'fill order: by length (lesson)',
        s,
        cells: cells(lesson),
        show: 'order',
        target,
        arrows,
        legend: ['n: the n-th interval cell written'],
        notes: ['every arrow reads a smaller number'],
      },
      {
        kind: 'interval',
        id: 'by-row',
        heading: 'fill order: rows from the bottom',
        s,
        cells: cells(answer),
        show: 'order',
        target,
        arrows,
        legend: ['the practice answer: i down, j up'],
        notes: ['every arrow reads a smaller number', 'i counting up would read rows unset'],
      },
    ],
  }
}

// ---------------------------------------------------------------------------

export const segmentTreeQueryCover: StaticPreset<TreeData, HashedProgram> = {
  id: 'segment-tree-query-cover',
  label: 'Segment tree',
  title: 'Segment tree: cover, path and lazy tags',
  caption: 'A query takes whole nodes and splits partial ones, so it visits O(log n) nodes. An update rewrites one path; a lazy tag waits for a visit.',
  programs: [segmentProgram, lazyProgram].map((p) => verified(p, DSA_RECORDINGS[p.id])),
  claims: [],
  data: segmentData(DSA_RECORDINGS),
}

export const dsuParentForest: StaticPreset<TreeData, HashedProgram> = {
  id: 'dsu-parent-forest',
  label: 'Union-find forest',
  title: 'Union-find: the parent forest',
  caption: 'Each element points at its parent; find follows the arrows to the root. Rank keeps trees shallow; path compression points nodes at the root.',
  programs: [unionRankProgram, unionSizeProgram, unionChainProgram].map((p) => verified(p, DSA_RECORDINGS[p.id])),
  claims: [],
  data: unionData(DSA_RECORDINGS),
}

export const heapInsertExtract: StaticPreset<TreeData, HashedProgram> = {
  id: 'insert-4-10-3-5-1-then-extract',
  label: 'Heap as a tree',
  title: 'A heap array is a complete tree',
  caption: 'The children of i are at 2i + 1 and 2i + 2. extractMin moves the last element to the root and swaps it down with the smaller child.',
  programs: [verified(heapProgram, DSA_RECORDINGS[heapProgram.id])],
  claims: [],
  data: heapData(DSA_RECORDINGS),
}

export const fib5: StaticPreset<TreeData, HashedProgram> = {
  id: 'fib5',
  label: 'Recursion vs memo',
  title: 'fib(5): call tree with and without memo',
  caption: 'Without memo, fib(3) and fib(2) are computed again in each branch. With memo, each n is computed once; later calls return memo[n].',
  programs: [fibProgram, fibMemoProgram].map((p) => verified(p, DSA_RECORDINGS[p.id])),
  claims: [],
  data: fibData(DSA_RECORDINGS),
}

export const lpsIntervalTriangle: StaticPreset<TreeData, HashedProgram> = {
  id: 'lps-interval-triangle',
  label: 'Interval DP table',
  title: 'Palindromic subsequence: interval table',
  caption: 'dp[i][j] reads the cell inside it and its two neighbours, all shorter intervals: fill inner before outer, by length or rows from the bottom.',
  programs: [lpsProgram, lpsAnswerProgram].map((p) => verified(p, DSA_RECORDINGS[p.id])),
  claims: [],
  data: lpsData(DSA_RECORDINGS),
}

export const DSA_PRESETS = [segmentTreeQueryCover, dsuParentForest, heapInsertExtract, fib5, lpsIntervalTriangle]
