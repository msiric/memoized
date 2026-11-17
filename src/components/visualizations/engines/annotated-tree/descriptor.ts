import type { HashedProgram, StaticDescriptor, StaticEngineCore, StaticTextAlternative } from '../../shell/static-types'
import { layoutTree } from './layout'
import { callLabel, cutText, pathText } from './calls'
import { cellLabel } from './grid'
import type { CallPanel, GainPanel, GraphPanel, GridPanel, SuffixPanel, TreeData, TreePanel, TriePanel } from './model'
import { hiddenClassTransitions, maxPathGainVsThrough, suffixTreeBanana, trieEndMarkers } from './presets'
import { combinationSumTakeSkip, kPairsLazyGrid, waterWellsSource } from './presets/singles'
import { shapeLabel, type ShapesPanel } from './shapes'

/**
 * The annotated-tree substrate without its renderer (R4 shared visual
 * "annotated-tree", wave 2D): the static presets of Tree DFS, Tries and
 * Suffix Arrays and Suffix Trees.
 */

function describeGain(p: GainPanel): string[] {
  const order: string[] = []
  const walk = (id: string | null) => {
    if (!id) return
    walk(p.nodes[id].left)
    walk(p.nodes[id].right)
    order.push(id)
  }
  walk(p.root)
  const lines = order.map((id) => {
    const n = p.nodes[id]
    return `${n.value}: takes ${n.gainLeft} from the left and ${n.gainRight} from the right, through = ${n.gainLeft} + ${n.gainRight} + ${n.value} = ${n.through}, returns ${n.returned}${id === p.root ? '' : ' to its parent'}.`
  })
  if (p.best) lines.push(`Marked: the path ${p.best.map((id) => p.nodes[id].value).join(', ')}, recorded in ans and never returned (it does not touch the edge to the parent).`)
  if (p.clamp) lines.push(`Marked: the edge from ${p.nodes[p.clamp.child].value}, which returns ${p.nodes[p.clamp.child].returned}; its parent adds max(0, ${p.nodes[p.clamp.child].returned}).`)
  return [...lines, ...p.notes.map((n) => `${n}.`)]
}

function describeTrie(p: TriePanel): string[] {
  const words = p.nodes.filter((n) => n.end && n.mark !== 'pruned').map((n) => n.id)
  const lines = [`END nodes (words): ${words.join(', ') || 'none'}.`]
  const branches = p.nodes.filter((n) => n.parent === 'root').map((n) => n.char)
  lines.push(`From the root: ${branches.join(' and ')}; one node per character.`)
  const path = p.nodes.filter((n) => n.mark === 'path')
  if (path.length) {
    const last = path[path.length - 1]
    lines.push(`Marked path: root to ${path.map((n) => n.char).join(' to ')}; it ends on ${last.id}, which is ${last.end ? '' : 'not '}END.`)
  }
  for (const n of p.nodes) {
    if (n.mark === 'cleared') lines.push(`Marked: ${n.id}, its END flag cleared; the node stays.`)
    if (n.mark === 'pruned') lines.push(`Dashed: ${n.id}, pruned.`)
    if (n.mark === 'stop') lines.push(`Marked: ${n.id}, where pruning stopped${n.end ? ' (END)' : ''}.`)
  }
  for (const r of p.results) lines.push(`${[r.call, r.value].filter(Boolean).join(' returns ')}${r.note ? `${r.call ? ': ' : ''}${r.note}` : ''}.`)
  return lines
}

function describeSuffix(p: SuffixPanel): string[] {
  const lines = p.nodes
    .filter((n) => n.parent !== null)
    .map((n) => {
      const parent = p.nodes.find((x) => x.id === n.parent)!
      const from = parent.parent === null ? 'root' : parent.path
      const to = n.leaf !== undefined ? `leaf ${n.leaf}` : `node ${n.path}`
      return `${from} to ${to}: "${n.edge!.text}" [${n.edge!.start},${n.edge!.end}].`
    })
  lines.push(`Suffix array (leaves top to bottom): ${p.rows.map((r) => r.sa).join(', ')}.`)
  lines.push(`LCP: ${p.rows.map((r) => r.lcp).join(', ')}; the maximum, ${p.rows[p.maxRank].lcp}, is at rank ${p.maxRank} (${p.rows[p.maxRank - 1].suffix} and ${p.rows[p.maxRank].suffix}).`)
  return [...lines, ...p.notes.map((n) => `${n}.`)]
}

function describeCalls(p: CallPanel): string[] {
  const lines = p.nodes.map((n) => {
    const head = `(${callLabel(n)}) with t ${pathText(n.t)}`
    if (n.end?.kind === 'answer') return `${head}: s is 0, an answer.`
    if (n.end?.kind === 'cut') return `${head}: cut, ${n.end.index ? `i = ${n.end.n} is past the candidates` : `${cutText(n)}, s is less than c[i]`}.`
    const [skip, take] = p.nodes.filter((k) => k.parent === n.id)
    return `${head}: skips ${p.candidates[n.i]} to (${callLabel(skip)}), then takes it to (${callLabel(take)}).`
  })
  return [...lines, ...p.notes.map((n) => `${n}.`)]
}

const ordinal = (n: number) => `${n}${['st', 'nd', 'rd'][n - 1] ?? 'th'}`

function describeGraph(p: GraphPanel): string[] {
  const name = (id: string) => p.nodes.find((n) => n.id === id)!.label
  const houses = p.nodes.filter((n) => !n.source).map((n) => `house ${n.label}${n.note ? `, ${n.note}` : ''}`)
  const edges = p.edges.map(
    (e) => `${e.well ? 'Well' : 'Pipe'} ${name(e.a)} to ${name(e.b)}, cost ${e.w}${e.accepted ? `, accepted ${ordinal(e.accepted)} (marked)` : ''}${e.untried ? ', never tried' : ''}.`,
  )
  return [`${houses.join('; ')}.`, ...edges, ...p.notes.map((n) => `${n}.`)]
}

function describeGrid(p: GridPanel): string[] {
  const at = (i: number, j: number) => `(${i},${j})`
  const lines = [`Rows ${p.rows.name} [${p.rows.values.join(', ')}], columns ${p.cols.name} [${p.cols.values.join(', ')}]; each cell is the pair's sum.`]
  for (const c of p.cells) if (cellLabel(c)) lines.push(`${at(c.i, c.j)} ${c.sum}: ${cellLabel(c)}${p.mark === 'heap' && c.state === 'heap' ? ' (marked)' : ''}.`)
  for (const a of p.arrows) lines.push(`Arrow from ${at(...a.from)} to ${at(...a.to)}.`)
  return [...lines, ...p.notes.map((n) => `${n}.`)]
}

function describeShapes(p: ShapesPanel): string[] {
  const byId = new Map(p.nodes.map((n) => [n.id, n]))
  const lines = p.nodes.map((n) => {
    const at = n.objects.length ? `; ${n.objects.join(' and ')} ${n.objects.length > 1 ? 'end' : 'ends'} here` : ''
    if (!n.parent) return `${shapeLabel(n.keys)}: the root${n.inferred ? ' (inferred, not printed by V8)' : ''}${at}.`
    const parent = byId.get(n.parent)!
    return `${shapeLabel(parent.keys)} + ${n.keys[n.keys.length - 1]} → ${shapeLabel(n.keys)}${n.inferred ? ' (inferred from its child’s back pointer)' : ''}${at}.`
  })
  for (const r of p.results) lines.push(`${r.expr} is ${r.value}.`)
  return [...lines, ...p.notes.map((n) => `${n}.`)]
}

function describePanel(p: TreePanel): string[] {
  if (p.kind === 'shapes') return describeShapes(p)
  if (p.kind === 'gain') return describeGain(p)
  if (p.kind === 'trie') return describeTrie(p)
  if (p.kind === 'calls') return describeCalls(p)
  if (p.kind === 'graph') return describeGraph(p)
  if (p.kind === 'grid') return describeGrid(p)
  return describeSuffix(p)
}

export function describeTree(d: TreeData): Omit<StaticTextAlternative, 'outputs'> {
  return {
    parts: d.panels.map((p) => ({ heading: p.heading, lines: describePanel(p) })),
    model: d.panels.every((p) => p.kind === 'shapes')
      ? 'Hidden classes are not visible to plain JavaScript: each node is a V8 map printed by %DebugPrint in a real run of the lesson code under node --allow-natives-syntax, joined to the map it came from (its back pointer); a dashed node was seen only as a back pointer.'
      : 'Every value is recorded from a real run of the lesson code under the inspector: what each call returned, each node’s flags and children, each edge’s range.' +
        (d.panels.some((p) => p.kind === 'grid' && p.mark === 'twice') ? ' The two-neighbour rule is not run: its panel is a structural illustration, not a run, of how that rule reaches one cell from two parents, both pushed by the first pop.' : '') +
      (d.panels.some((p) => p.kind === 'suffix') ? ' Children are drawn in character order, so the leaves read in suffix-array order (the lesson’s Map keeps insertion order).' : ''),
  }
}

export const annotatedTreeEngineCore: StaticEngineCore<TreeData> = {
  id: 'annotated-tree',
  stageHeight: (d) => layoutTree(d).height,
  describe: describeTree,
}

export const annotatedTreeDescriptor: StaticDescriptor<TreeData, HashedProgram> = {
  id: 'annotated-tree',
  form: 'static',
  title: 'Annotated tree',
  engine: annotatedTreeEngineCore,
  presets: [maxPathGainVsThrough, trieEndMarkers, suffixTreeBanana, combinationSumTakeSkip, waterWellsSource, kPairsLazyGrid, hiddenClassTransitions],
  defaultPreset: 'max-path-gain-vs-through',
  since: '2026-11',
}
