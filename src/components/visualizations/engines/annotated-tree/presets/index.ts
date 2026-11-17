import type { HashedProgram, StaticPreset } from '../../../shell/static-types'
import { gainPanel, suffixPanel, trieDeletePanels, trieSearchPanel } from '../build'
import type { GainPanel, TreeData } from '../model'
import { suffixArrayProgram, suffixTreeProgram } from '../programs/suffix'
import { maxPathSumNegativeProgram, maxPathSumProgram } from '../programs/tree-dfs'
import { trieDeleteProgram, trieSearchProgram } from '../programs/tries'
import type { TreeProgram, TreeRecording } from '../programs/types'
import suffixRec from '../recordings/suffix-arrays-and-suffix-trees.json'
import mapsRec from '../recordings/engine-and-runtime.json'
import { fixedProgram, lateProgram, orderProgram } from '../programs/hidden-classes'
import { shapesPanel } from '../shapes'
import type { MapProgram, MapRecording } from '../truth/record-maps'
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

// ---------------------------------------------------------------------------
// Engine and Runtime (R4 row js-track/core-fundamentals/engine-and-runtime).
// ---------------------------------------------------------------------------

export type MapRecordings = Record<string, MapRecording>
export const MAP_RECORDINGS = mapsRec as unknown as MapRecordings

/** A natives run as the preset lists it: it prints nothing (its output is the recorded maps). */
export const verifiedMaps = (p: MapProgram, rec: MapRecording): HashedProgram => ({ id: p.id, runtime: 'node@24.x', sha256: rec.sha256, observed: [] })

/** The map an object had at a probe (the last time the probe paused). */
export function mapAt(rec: MapRecording, probe: string, expr: string): string {
  const p = rec.pauses.filter((x) => x.probe === probe).at(-1)
  const m = p?.maps[expr]
  if (!m) throw new Error(`no map of ${expr} at ${probe}`)
  return m.map
}

export function hiddenClassData(rec: MapRecordings): TreeData {
  const fixed = rec[fixedProgram.id]
  const same = mapAt(fixed, 'obj1-before', 'obj1') === mapAt(fixed, 'obj1-after', 'obj1')
  if (!same) throw new Error('obj1.c = 3 changed the map: the fixed panel would lie')
  return {
    panels: [
      shapesPanel(rec[lateProgram.id], {
        id: 'late',
        heading: 'c and d added after new: a fork',
        objects: ['obj1', 'obj2'],
        results: [['%HaveSameMap(obj1, obj2)', 'same']],
      }),
      shapesPanel(rec[fixedProgram.id], {
        id: 'fixed',
        heading: 'a, b, c, d all set in the constructor',
        objects: ['obj1', 'obj2'],
        results: [['%HaveSameMap(obj1, obj2)', 'same']],
        notes: ['obj1.c = 3 kept its map: no new node'],
      }),
      shapesPanel(rec[orderProgram.id], {
        id: 'order',
        heading: 'same keys, other order: a fork',
        objects: ['a', 'b', 'c'],
        results: [
          ['%HaveSameMap(a, b)', 'ab'],
          ['%HaveSameMap(a, c)', 'ac'],
        ],
      }),
    ],
  }
}

export const hiddenClassTransitions: StaticPreset<TreeData, HashedProgram> = {
  id: 'hidden-class-transitions',
  label: 'Hidden classes',
  title: 'Hidden classes: one map per path',
  caption: 'Each new property moves an object to a child map. Late or reordered properties fork the tree; one constructor keeps one leaf.',
  programs: [lateProgram, fixedProgram, orderProgram].map((p) => verifiedMaps(p, MAP_RECORDINGS[p.id])),
  claims: [],
  data: hiddenClassData(MAP_RECORDINGS),
}
