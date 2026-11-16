import type { HashedProgram, StaticPreset } from '../../../shell/static-types'
import { gainPanel, suffixPanel, trieDeletePanels, trieSearchPanel } from '../build'
import type { GainPanel, TreeData } from '../model'
import { suffixArrayProgram, suffixTreeProgram } from '../programs/suffix'
import { maxPathSumNegativeProgram, maxPathSumProgram } from '../programs/tree-dfs'
import { trieDeleteProgram, trieSearchProgram } from '../programs/tries'
import type { TreeProgram, TreeRecording } from '../programs/types'
import suffixRec from '../recordings/suffix-arrays-and-suffix-trees.json'
import treeDfsRec from '../recordings/tree-dfs.json'
import triesRec from '../recordings/tries.json'

/**
 * The three presets, one per lesson (R4 rows tree-dfs, tries and
 * suffix-arrays-and-suffix-trees). Every panel is built from a committed
 * recording (`../build.ts`); a preset adds only the title, the caption and
 * the panel headings. The truth test rebuilds each `data` from a fresh run.
 */

export type TreeRecordings = Record<string, TreeRecording>
export const RECORDINGS = { ...treeDfsRec, ...triesRec, ...suffixRec } as unknown as TreeRecordings

/** The recorded run as the preset lists it: its output, never its code (premium). */
export const verified = (p: TreeProgram, rec: TreeRecording): HashedProgram => ({
  id: p.id,
  runtime: 'node@24.x',
  sha256: rec.sha256,
  observed: rec.stdout,
})

/** The tree in LeetCode's level order ("[-10, 9, 20, null, null, 15, 7]"), from the recorded shape. */
export function levelOrder(p: GainPanel): string {
  const out: (number | null)[] = []
  let level: (string | null)[] = [p.root]
  while (level.some(Boolean)) {
    const next: (string | null)[] = []
    for (const id of level) {
      out.push(id ? p.nodes[id].value : null)
      if (id) next.push(p.nodes[id].left, p.nodes[id].right)
    }
    level = next
  }
  while (out[out.length - 1] === null) out.pop()
  return `[${out.map((v) => (v === null ? 'null' : v)).join(', ')}]`
}

export function maxPathData(rec: TreeRecordings): TreeData {
  const main = gainPanel(rec[maxPathSumProgram.id], { id: 'gains', heading: '' })
  const inset = gainPanel(rec[maxPathSumNegativeProgram.id], { id: 'clamp', heading: '' })
  const swapped = Object.values(main.nodes).find((n) => inset.nodes[n.id].value !== n.value)!
  return {
    panels: [
      { ...main, heading: levelOrder(main), legend: ['box: value | through = l + r + value', '↑n on an edge: what the call returns'] },
      { ...inset, heading: `inset: ${swapped.value} replaced by ${inset.nodes[swapped.id].value}`, legend: ['the parent adds max(0, ↑n):', 'a side that loses counts as 0'] },
    ],
  }
}

export function trieData(rec: TreeRecordings): TreeData {
  const search = trieSearchPanel(rec[trieSearchProgram.id], 'ap')
  return { panels: [{ ...search, heading: 'insert app, apple, applet, banana' }, ...trieDeletePanels(rec[trieDeleteProgram.id])] }
}

export function suffixData(rec: TreeRecordings): TreeData {
  return { panels: [suffixPanel(rec[suffixTreeProgram.id], rec[suffixArrayProgram.id], { id: 'suffix-tree', heading: 'banana$: edges [start,end]' })] }
}

export const maxPathGainVsThrough: StaticPreset<TreeData, HashedProgram> = {
  id: 'max-path-gain-vs-through',
  label: 'Max path sum',
  title: 'Path sum: returned vs recorded',
  caption: 'Each call returns one side, max(l, r) + value, and records the path through itself in ans: 42 is recorded at 20, never returned.',
  programs: [maxPathSumProgram, maxPathSumNegativeProgram].map((p) => verified(p, RECORDINGS[p.id])),
  claims: [],
  data: maxPathData(RECORDINGS),
}

export const trieEndMarkers: StaticPreset<TreeData, HashedProgram> = {
  id: 'trie-end-markers',
  label: 'Trie END flags',
  title: 'Trie: a path is not a word',
  caption: 'search needs the END flag, startsWith only the path. delete clears a flag, then prunes only childless nodes that are not END.',
  programs: [trieSearchProgram, trieDeleteProgram].map((p) => verified(p, RECORDINGS[p.id])),
  claims: [],
  data: trieData(RECORDINGS),
}

export const suffixTreeBanana: StaticPreset<TreeData, HashedProgram> = {
  id: 'suffix-tree-banana',
  label: 'Suffix tree',
  title: 'Suffix tree of banana$',
  caption: 'Internal nodes are repeated substrings. Leaves, top to bottom, are the suffix array; the deepest internal node, ana, is the max LCP.',
  programs: [suffixTreeProgram, suffixArrayProgram].map((p) => verified(p, RECORDINGS[p.id])),
  claims: [],
  data: suffixData(RECORDINGS),
}
