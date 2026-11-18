import type { HashedProgram, StaticPreset } from '../../../shell/static-types'
import { cutEdges, flowRun, reachable, reachesWithoutReverse, residualPanel, type FlowRun, type Hop } from '../flow'
import type { TreeData } from '../model'
import { ekClrsProgram, ffDiamondProgram } from '../programs/flow'
import type { TreeProgram, TreeRecording } from '../programs/types'
import mfRec from '../recordings/maximum-flow.json'
import nfRec from '../recordings/network-flow-algorithms.json'

/**
 * The residual-graph presets (R4 shared visual `residual-graph`, wave 4B):
 * `diamond-reverse-edge` (Maximum Flow and Network Flow Algorithms) and
 * `clrs-23-min-cut` (Network Flow Algorithms). Every flow, residual, path
 * and cut is read from a committed recording of the lessons' own
 * Ford-Fulkerson and Edmonds-Karp code; a preset adds only headings, the
 * vertex names and places, and note lines whose values come from the run.
 */

export type FlowRecordings = Record<string, TreeRecording>
export const FLOW_RECORDINGS = { ...mfRec, ...nfRec } as unknown as FlowRecordings

const verified = (p: TreeProgram, rec: TreeRecording): HashedProgram => ({ id: p.id, runtime: 'node@24.x', sha256: rec.sha256, observed: rec.stdout })

export const DIAMOND_NAMES = ['S', 'A', 'B', 'T'] as const
const DIAMOND_AT = [
  [0, 1],
  [1, 0],
  [1, 2],
  [2, 1],
] as const

/** "S → A → B → T" (a hop back along an edge reads the same; the legend names it). */
export function pathText(hops: readonly Hop[], names: readonly string[]): string {
  return names[hops[0].u] + hops.map((h) => ` → ${names[h.v]}`).join('')
}

const sideText = (side: number[], n: number, names: readonly string[]) =>
  `{${side.map((v) => names[v]).join(', ')}} | {${Array.from({ length: n }, (_, v) => v).filter((v) => !side.includes(v)).map((v) => names[v]).join(', ')}}`

export function diamondData(rec: FlowRecordings): TreeData {
  const run = flowRun(rec[ffDiamondProgram.id])
  const names = DIAMOND_NAMES
  const [one, two] = run.augments
  if (!one || !two || run.augments.length !== 2) throw new Error('diamond: the run did not take two paths')
  const back = two.hops.find((h) => h.reverse)
  if (!back) throw new Error('diamond: the second path uses no reverse edge')
  const sink = run.start.length - 1
  const stuck = !reachesWithoutReverse(run.start, one.graph, 0, sink)
  const side = reachable(run.final)
  const cut = cutEdges(run, side)
  const common = { names, at: DIAMOND_AT, reverse: true }
  return {
    panels: [
      residualPanel(run, one.graph, {
        ...common,
        id: 'path-1',
        heading: `Path 1: ${pathText(one.hops, names)}, +${one.pathFlow}`,
        path: one.hops,
        legend: ['f/c: flow / capacity', 'dashed: reverse residual, = flow'],
        notes: [`${names[back.v]} → ${names[back.u]} is full; reverse ${names[back.u]} → ${names[back.v]} has ${one.pathFlow}`, ...(stuck ? ['no forward path is left: stuck at 1'] : [])],
      }),
      residualPanel(run, one.graph, {
        ...common,
        id: 'path-2',
        heading: `Path 2: ${pathText(two.hops, names)}, +${two.pathFlow}`,
        path: two.hops,
        legend: ['marked: the next augmenting path', `${names[back.u]} → ${names[back.v]} is the dashed reverse edge`],
        notes: [`sending ${two.pathFlow} back cancels ${names[back.v]} → ${names[back.u]}`, `its flow moves to ${pathText(two.hops.slice(two.hops.indexOf(back) + 1), names)}`],
      }),
      residualPanel(run, run.final, {
        ...common,
        id: 'cut',
        heading: `Max flow ${run.maxFlow}: the min cut`,
        cut: true,
        legend: [`shaded: what ${names[0]} still reaches`, 'marked: the edges leaving it'],
        notes: [`cut ${sideText(side, run.start.length, names)}`, `${cut.map((e) => e.cap).join(' + ')} = ${cut.reduce((s, e) => s + e.cap, 0)}, the max flow`],
      }),
    ],
  }
}

export function clrsData(rec: FlowRecordings): TreeData {
  const run: FlowRun = flowRun(rec[ekClrsProgram.id])
  const n = run.start.length
  const names = Array.from({ length: n }, (_, v) => String(v))
  const side = reachable(run.final)
  const cut = cutEdges(run, side)
  return {
    panels: [
      residualPanel(run, run.final, {
        id: 'clrs',
        heading: `Edmonds-Karp ends at ${run.maxFlow}`,
        names,
        at: [
          [0, 1],
          [1, 0],
          [1, 2],
          [2, 0],
          [2, 2],
          [3, 1],
        ],
        reverse: false,
        cut: true,
        wide: true,
        legend: [`shaded: what source 0 still reaches`, 'marked: the edges leaving it, all full'],
        notes: [
          `${run.augments.length} BFS paths; 0 reaches {${side.join(', ')}}`,
          `cut ${cut.map((e) => `${e.u}→${e.v}`).join(' + ')}`,
          `= ${cut.map((e) => e.cap).join(' + ')} = ${cut.reduce((s, e) => s + e.cap, 0)}`,
        ],
      }),
    ],
  }
}

export const diamondReverseEdge: StaticPreset<TreeData, HashedProgram> = {
  id: 'diamond-reverse-edge',
  label: 'Reverse edge',
  title: 'Residual graph: the reverse edge',
  caption: 'A reverse edge lets a later path cancel flow; at the end, the edges leaving what S still reaches are full and sum to the max flow.',
  programs: [verified(ffDiamondProgram, FLOW_RECORDINGS[ffDiamondProgram.id])],
  claims: [],
  data: diamondData(FLOW_RECORDINGS),
}

export const clrsMinCut: StaticPreset<TreeData, HashedProgram> = {
  id: 'clrs-23-min-cut',
  label: 'Min cut 23',
  title: 'The lesson network’s minimum cut',
  caption: 'No augmenting path is left, so every edge out of the reachable set is full: their capacities add up to the max flow, 23.',
  programs: [verified(ekClrsProgram, FLOW_RECORDINGS[ekClrsProgram.id])],
  claims: [],
  data: clrsData(FLOW_RECORDINGS),
}
