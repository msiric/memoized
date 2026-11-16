import type { HashedProgram, StaticDescriptor, StaticEngineCore, StaticTextAlternative } from '../../shell/static-types'
import { layoutTree } from './layout'
import type { GainPanel, SuffixPanel, TreeData, TreePanel, TriePanel } from './model'
import { maxPathGainVsThrough, suffixTreeBanana, trieEndMarkers } from './presets'

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

function describePanel(p: TreePanel): string[] {
  if (p.kind === 'gain') return describeGain(p)
  if (p.kind === 'trie') return describeTrie(p)
  return describeSuffix(p)
}

export function describeTree(d: TreeData): Omit<StaticTextAlternative, 'outputs'> {
  return {
    parts: d.panels.map((p) => ({ heading: p.heading, lines: describePanel(p) })),
    model:
      'Every value is recorded from a real run of the lesson code under the inspector: what each call returned, each node’s flags and children, each edge’s range.' +
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
  presets: [maxPathGainVsThrough, trieEndMarkers, suffixTreeBanana],
  defaultPreset: 'max-path-gain-vs-through',
  since: '2026-11',
}
