import type { HashedProgram, StaticPreset } from '../../../shell/static-types'
import { callLabel, callNodes, callPanel, pathText, popAt } from '../calls'
import { waterPanel, waterRun } from '../graph'
import { kPairsRun, poppedPanel, seededPanel, twicePanel } from '../grid'
import type { TreeData } from '../model'
import { combinationSumProgram } from '../programs/backtracking'
import { kPairsProgram } from '../programs/k-way-merge'
import { waterAllFiveProgram, waterProgram } from '../programs/minimum-spanning-trees'
import type { TreeProgram, TreeRecording } from '../programs/types'
import btRec from '../recordings/backtracking.json'
import kwmRec from '../recordings/k-way-merge.json'
import mstRec from '../recordings/minimum-spanning-trees.json'

/**
 * The wave 3A presets (R4 rows backtracking, minimum-spanning-trees and
 * k-way-merge). Every panel is built from a committed recording of the
 * lesson's practice answer; a preset adds only the title, the caption, the
 * panel headings and note lines whose values are read from the recording.
 * The truth test rebuilds each `data` from a fresh run.
 */

export type Recordings = Record<string, TreeRecording>
export const SINGLES_RECORDINGS = {
  ...btRec,
  ...mstRec,
  ...kwmRec,
} as unknown as Recordings

const verified = (p: TreeProgram, rec: TreeRecording): HashedProgram => ({
  id: p.id,
  runtime: 'node@24.x',
  sha256: rec.sha256,
  observed: rec.stdout,
})

const edge = (e: readonly number[]) => `${e[0]}-${e[1]}`

export function combinationSumData(rec: Recordings): TreeData {
  const r = rec[combinationSumProgram.id]
  const { candidates, nodes } = callNodes(r)
  const answers = nodes.filter((n) => n.end?.kind === 'answer').map((n) => pathText(n.t))
  // The register's side note: the take from (0, 5) returns with t = [2, 2], and its pop restores [2].
  const restoreFrom = nodes.find((n) => n.parent && n.edge === 'take' && n.i === 0 && n.t.length === 2)!
  const before = popAt(r, restoreFrom.i, restoreFrom.s + candidates[restoreFrom.i])!
  return {
    panels: [
      callPanel(r, {
        id: 'calls',
        heading: `combinationSum([${candidates.join(',')}], ${nodes[0].s})`,
        legend: ['box: i,s; under it: t', 'straight: skip c[i], (i + 1, s)', 'bent +c: take c[i], (i, s - c)', 'dashed: cut, s < c[i] or i past end'],
        notes: [
          `${nodes.length} calls; answers ${answers.join(' and ')}`,
          `(${callLabel(restoreFrom)}) returns: pop ${pathText(before)} to ${pathText(before.slice(0, -1))}`,
        ],
      }),
    ],
  }
}

export function waterData(rec: Recordings): TreeData {
  const main = waterRun(rec[waterProgram.id])
  const five = waterRun(rec[waterAllFiveProgram.id])
  const untried = main.edges.filter((e) => !main.tried.some((t) => edge(t) === edge(e) && t[2] === e[2]))
  const wellFive = five.accepted.filter((e) => e[0] === 0)
  return {
    panels: [
      waterPanel(rec[waterProgram.id], {
        id: 'houses',
        heading: 'n = 3: houses, pipes, wells',
        withSource: false,
        notes: ['each house digs a well, or takes', 'a pipe from a house that has water'],
      }),
      waterPanel(rec[waterProgram.id], {
        id: 'source',
        heading: '+ source 0: one MST on n + 1 nodes',
        withSource: true,
        notes: [
          `accepted ${main.accepted.map(edge).join(', ')}; total ${main.total}`,
          `${untried.map(edge).join(', ')} never tried: all joined`,
          `all wells 5: ${wellFive.map((e) => `${edge(e)} (${e[2]})`).join(', ')} joins; total ${five.total}`,
        ],
      }),
    ],
  }
}

export function kPairsData(rec: Recordings): TreeData {
  const run = kPairsRun(rec[kPairsProgram.id])
  const n = run.pops.length
  // The note on the last pop holds only if the run pushed nothing there.
  if (run.pops[n - 1].pushed) throw new Error('k-pairs: the last pop pushed a cell')
  return {
    panels: [
      seededPanel(run, {
        id: 'seeded',
        heading: 'seeded: (i, 0) for each row',
        notes: [`the heap holds ${run.seeded.length} cells, one per row`],
      }),
      poppedPanel(run, n, {
        id: 'popped',
        heading: `after ${n} pops`,
        notes: ['each pop pushes (i, j + 1) only', `pop ${n} is in the last column: no push`, `result ${run.result}`],
      }),
      twicePanel(run, {
        id: 'twice',
        heading: 'if a pop pushed (i+1, j) and (i, j+1)',
        notes: ['(1,1) has two parents: pushed twice', 'so that rule needs a visited set'],
      }),
    ],
  }
}

export const combinationSumTakeSkip: StaticPreset<TreeData, HashedProgram> = {
  id: 'combination-sum-take-skip',
  label: 'Combination sum',
  title: 'Combination sum: take or skip',
  caption: 'Skip moves on to the next candidate; take stays on it and subtracts it, so 2 can repeat. Sorted input cuts once s < c[i].',
  programs: [verified(combinationSumProgram, SINGLES_RECORDINGS[combinationSumProgram.id])],
  claims: [],
  data: combinationSumData(SINGLES_RECORDINGS),
}

export const waterWellsSource: StaticPreset<TreeData, HashedProgram> = {
  id: 'water-wells-virtual-source',
  label: 'Wells as edges',
  title: 'Wells as edges to a source node',
  caption: 'A well is an edge from source 0 to its house, so one minimum spanning tree over n + 1 nodes picks wells and pipes together.',
  programs: [waterProgram, waterAllFiveProgram].map((p) => verified(p, SINGLES_RECORDINGS[p.id])),
  claims: [],
  data: waterData(SINGLES_RECORDINGS),
}

export const kPairsLazyGrid: StaticPreset<TreeData, HashedProgram> = {
  id: 'k-pairs-lazy-grid',
  label: 'K pairs grid',
  title: 'K pairs: a lazy frontier on a grid',
  caption: 'Seed one cell per row; each pop pushes only its right neighbour, so every cell has one parent and no visited set is needed.',
  programs: [verified(kPairsProgram, SINGLES_RECORDINGS[kPairsProgram.id])],
  claims: [],
  data: kPairsData(SINGLES_RECORDINGS),
}
