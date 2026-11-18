// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { loadProgram, readBlock, skipNote } from '../../step-log/lesson-block'
import { sha256 } from '../../step-log/truth'
import { intersects, type Rect } from '../../substrates/box-arrow'
import { monoWidth } from '../../substrates/text-metrics'
import { FLOW, cutEdges, flowRun, layoutResidual, reachable, reachesWithoutReverse, type ResidualPanel } from './flow'
import { SIZE } from './layout'
import { DIAMOND_NAMES, FLOW_RECORDINGS, clrsData, clrsMinCut, diamondData, diamondReverseEdge, pathText, type FlowRecordings } from './presets/flow'
import { TREE_LESSONS } from './programs'
import { ekClrsProgram, ekDiamondProgram, ffDiamondNetworkProgram, ffDiamondProgram, ffSabtProgram } from './programs/flow'
import { recordTree } from './truth/record'

/**
 * The residual graphs (wave 4B) are recordings of the lessons' own
 * Ford-Fulkerson and Edmonds-Karp code: every flow, residual, path and cut.
 * With a local content checkout this test re-records each program and
 * rebuilds both figures from the fresh runs; everywhere it checks the
 * register's values (2 on the diamond with the second path through the
 * reverse edge, 12 on the lesson's S/A/B/T network, 23 on CLRS), that every
 * drawn panel is a flow (capacity and conservation hold, a reverse residual
 * is its edge's flow, a cut edge is full and the cut equals the flow), and
 * that lies fail.
 */

const FLOW_PROGRAMS = [...TREE_LESSONS['maximum-flow'], ...TREE_LESSONS['network-flow-algorithms']]
const missing = FLOW_PROGRAMS.map((p) => loadProgram(p.source)).find((l) => !l.ok)
const why = missing && !missing.ok ? ` (skipped: ${skipNote(missing.missing)})` : ''

function fresh(): FlowRecordings {
  const out: FlowRecordings = {}
  for (const p of FLOW_PROGRAMS) {
    const l = loadProgram(p.source)
    if (!l.ok) throw new Error(skipNote(l.missing))
    const { runtime, ...rec } = recordTree(p, l.text)
    expect(runtime).toMatch(/^node@24\./)
    out[p.id] = rec
  }
  return out
}

/** A panel's flow problems: over capacity, not conserved at an inner vertex, a reverse residual that is not the flow, a cut edge not full. */
function flowProblems(p: ResidualPanel, source = 'v0', sink = p.nodes[p.nodes.length - 1].id): string[] {
  const out: string[] = []
  const net = new Map<string, number>()
  for (const e of p.edges) {
    if (e.flow < 0 || e.flow > e.cap) out.push(`${e.from}-${e.to}: ${e.flow}/${e.cap}`)
    if (e.back && e.back.residual !== e.flow) out.push(`${e.to}-${e.from}: reverse ${e.back.residual} is not the flow ${e.flow}`)
    if (e.mark === 'cut' && e.flow !== e.cap) out.push(`${e.from}-${e.to}: a cut edge that is not full`)
    net.set(e.from, (net.get(e.from) ?? 0) - e.flow)
    net.set(e.to, (net.get(e.to) ?? 0) + e.flow)
  }
  for (const n of p.nodes) if (n.id !== source && n.id !== sink && (net.get(n.id) ?? 0) !== 0) out.push(`${n.id} is not conserved`)
  if (p.cut) {
    const across = p.edges.filter((e) => p.cut!.includes(e.from) && !p.cut!.includes(e.to))
    const back = p.edges.filter((e) => !p.cut!.includes(e.from) && p.cut!.includes(e.to))
    if (across.some((e) => e.mark !== 'cut')) out.push('an edge leaving the cut is not marked')
    if (back.some((e) => e.flow !== 0)) out.push('an edge into the cut carries flow')
    if (net.get(sink) !== across.reduce((s, e) => s + e.cap, 0)) out.push('the cut capacity is not the flow')
  }
  return out
}

describe('residual-graph recordings', () => {
  it.skipIf(Boolean(missing))(`a fresh Node 24 run of every program equals the committed recording, and the figures rebuild from it${why}`, () => {
    const rec = fresh()
    for (const p of FLOW_PROGRAMS) expect(rec[p.id], p.id).toEqual(FLOW_RECORDINGS[p.id])
    expect(diamondData(rec)).toEqual(diamondReverseEdge.data)
    expect(clrsData(rec)).toEqual(clrsMinCut.data)
  })

  it.skipIf(Boolean(missing))(`both lessons carry the same Ford-Fulkerson and Edmonds-Karp blocks, so the shared figure holds for both${why}`, () => {
    for (const heading of ['### **Ford-Fulkerson Method**', '### **Edmonds-Karp Algorithm**']) {
      const a = readBlock({ path: 'content/dsa-track/advanced-topics/maximum-flow/page.mdx', heading, lang: 'javascript' })!
      const b = readBlock({ path: 'content/dsa-track/advanced-topics/network-flow-algorithms/page.mdx', heading, lang: 'javascript' })!
      expect(sha256(a)).toBe(sha256(b))
    }
  })

  it('the network lesson’s diamond run is the maximum-flow lesson’s, value for value', () => {
    expect(FLOW_RECORDINGS[ffDiamondNetworkProgram.id]).toEqual(FLOW_RECORDINGS[ffDiamondProgram.id])
  })

  it('every preset names its programs by hash and output', () => {
    for (const preset of [diamondReverseEdge, clrsMinCut])
      for (const p of preset.programs) {
        expect(p.sha256).toBe(FLOW_RECORDINGS[p.id].sha256)
        expect(p.observed).toEqual(FLOW_RECORDINGS[p.id].stdout)
      }
  })
})

describe('the register verification assertions hold on the recorded runs', () => {
  it('diamond: Ford-Fulkerson (DFS) takes S-A-B-T, then S-B-A-T through the reverse edge B -> A; the flow is 2', () => {
    const run = flowRun(FLOW_RECORDINGS[ffDiamondProgram.id])
    expect(run.stdout).toEqual(['2'])
    expect(run.augments.map((a) => pathText(a.hops, DIAMOND_NAMES))).toEqual(['S → A → B → T', 'S → B → A → T'])
    expect(run.augments.map((a) => a.hops.map((h) => h.reverse))).toEqual([
      [false, false, false],
      [false, true, false],
    ])
    expect(run.augments.map((a) => a.pathFlow)).toEqual([1, 1])
  })

  it('diamond: after the first path no forward-only path is left (greedy without reverse edges stops at 1)', () => {
    const run = flowRun(FLOW_RECORDINGS[ffDiamondProgram.id])
    expect(reachesWithoutReverse(run.start, run.augments[0].graph, 0, 3)).toBe(false)
    // With the reverse entries it is: the second path exists.
    expect(reachable(run.augments[0].graph)).toContain(3)
  })

  it('diamond: Edmonds-Karp (BFS) also gives 2, on the two short paths, with no reverse hop', () => {
    const run = flowRun(FLOW_RECORDINGS[ekDiamondProgram.id])
    expect(run.stdout).toEqual(['2'])
    expect(run.augments.map((a) => pathText(a.hops, DIAMOND_NAMES))).toEqual(['S → A → T', 'S → B → T'])
    expect(run.augments.flatMap((a) => a.hops).some((h) => h.reverse)).toBe(false)
  })

  it("the lesson's S/A/B/T network: 12, cut {S, A, B} | {T} = 2 + 10 (the caption the content can add)", () => {
    const run = flowRun(FLOW_RECORDINGS[ffSabtProgram.id])
    expect(run.stdout).toEqual(['12'])
    const side = reachable(run.final)
    expect(side.map((v) => DIAMOND_NAMES[v])).toEqual(['S', 'A', 'B'])
    expect(cutEdges(run, side).map((e) => [DIAMOND_NAMES[e.u], DIAMOND_NAMES[e.v], e.cap, e.flow])).toEqual([
      ['A', 'T', 2, 2],
      ['B', 'T', 10, 10],
    ])
  })

  it('CLRS: Edmonds-Karp prints 23; 0 reaches {0, 1, 2, 4}; the cut 1->3 + 4->3 + 4->5 = 12 + 7 + 4 = 23', () => {
    const run = flowRun(FLOW_RECORDINGS[ekClrsProgram.id])
    expect(run.stdout).toEqual(['23'])
    const side = reachable(run.final)
    expect(side).toEqual([0, 1, 2, 4])
    expect(cutEdges(run, side).map((e) => [e.u, e.v, e.cap])).toEqual([
      [1, 3, 12],
      [4, 3, 7],
      [4, 5, 4],
    ])
  })

  it('every drawn panel is a flow; the cut panels equal the flow and mark exactly the edges leaving the cut', () => {
    for (const preset of [diamondReverseEdge, clrsMinCut])
      for (const p of preset.data.panels as ResidualPanel[]) expect(flowProblems(p), `${preset.id}/${p.id}`).toEqual([])
    const [one, two, cut] = diamondReverseEdge.data.panels as ResidualPanel[]
    // Panel 1 marks path 1 on its own result; panel 2 marks path 2 on the same residual, back along A -> B.
    expect(one.edges.filter((e) => e.mark === 'path').map((e) => `${e.from}-${e.to}`)).toEqual(['v0-v1', 'v1-v2', 'v2-v3'])
    expect(two.edges.filter((e) => e.mark === 'path').map((e) => `${e.from}-${e.to}`)).toEqual(['v0-v2', 'v1-v3'])
    expect(two.edges.find((e) => e.back?.mark === 'path')).toMatchObject({ from: 'v1', to: 'v2', flow: 1 })
    expect(cut.cut).toEqual(['v0'])
    expect(cut.edges.find((e) => e.from === 'v1' && e.to === 'v2')!.flow).toBe(0)
  })
})

describe('the residual checks catch a lie', () => {
  it('fails a flow over capacity, a broken conservation and a reverse that is not the flow', () => {
    const p = structuredClone(diamondReverseEdge.data.panels[0]) as ResidualPanel
    p.edges[0].flow = 2
    const problems = flowProblems(p).join('\n')
    expect(problems).toMatch(/v0-v1: 2\/1/)
    expect(problems).toMatch(/reverse 1 is not the flow 2/)
    expect(problems).toMatch(/v1 is not conserved/)
  })

  it('fails a cut that leaves an unsaturated edge, or one whose capacity is not the flow', () => {
    const p = structuredClone(clrsMinCut.data.panels[0]) as ResidualPanel
    p.cut = ['v0', 'v1', 'v2']
    expect(flowProblems(p).join('\n')).toMatch(/not marked|not full|not the flow/)
  })

  it('a recorded path whose parentEdge leads elsewhere does not build', () => {
    const rec = structuredClone(FLOW_RECORDINGS[ffDiamondProgram.id])
    const aug = rec.pauses.find((p) => p.probe === 'augment')!
    ;(aug.vars.parentEdge as number[])[3] = 0
    expect(() => flowRun(rec)).toThrow(/parentEdge/)
  })

  it('a run that never needs the reverse edge cannot build the diamond figure', () => {
    // Edmonds-Karp's run in place of Ford-Fulkerson's: no second path through B -> A.
    const rec = { ...FLOW_RECORDINGS, [ffDiamondProgram.id]: FLOW_RECORDINGS[ekDiamondProgram.id] }
    expect(() => diamondData(rec)).toThrow(/reverse edge/)
  })
})

// ---------------------------------------------------------------------------
// Layout: every text inside its svg, labels clear of vertices and of each
// other, the cut region around its vertices only.
// ---------------------------------------------------------------------------

const small = (t: string) => monoWidth(t, SIZE.small)
const panels = [diamondReverseEdge, clrsMinCut].flatMap((preset) =>
  (preset.data.panels as ResidualPanel[]).flatMap((p) => (p.wide ? (['narrow', 'wide'] as const) : (['narrow'] as const)).map((v) => [`${preset.id}/${p.id}/${v}`, p, v] as const)),
)

describe.each(panels)('residual layout %s', (_name, p, variant) => {
  const g = layoutResidual(p, variant)
  const labels: Rect[] = g.edges.map((e) => ({ x: e.label.x - e.label.w / 2, y: e.label.y - FLOW.labelH / 2, w: e.label.w, h: FLOW.labelH }))
  const discs: Rect[] = Object.values(g.at).map((a) => ({ x: a.x - FLOW.r, y: a.y - FLOW.r, w: 2 * FLOW.r, h: 2 * FLOW.r }))

  it('every text run fits the svg', () => {
    for (const t of [p.heading, ...p.legend, ...p.notes]) expect(small(t), t).toBeLessThanOrEqual(g.width)
    for (const r of labels) {
      expect(r.x).toBeGreaterThanOrEqual(-0.5)
      expect(r.x + r.w).toBeLessThanOrEqual(g.width + 0.5)
    }
  })

  it('labels clear every vertex and each other', () => {
    for (const [i, r] of labels.entries()) {
      for (const d of discs) expect(intersects(r, d, 1), `${g.edges[i].label.text} on a vertex`).toBe(false)
      for (const [j, o] of labels.entries()) if (j > i) expect(intersects(r, o, 1), `${g.edges[i].label.text} on ${g.edges[j].label.text}`).toBe(false)
    }
  })

  it('the cut region holds its vertices and no other', () => {
    if (!p.cut) return
    const inCut = (id: string) => p.cut!.includes(id)
    // The grown hull reaches FLOW.hull past each cut centre; an outside centre must clear it by its radius.
    const cut = p.nodes.filter((n) => inCut(n.id)).map((n) => g.at[n.id])
    for (const n of p.nodes.filter((x) => !inCut(x.id))) {
      const a = g.at[n.id]
      // Distance to the cut centres' hull: to its nearest segment (every pair spans one), or 0 inside a triangle of them.
      const seg = (p: { x: number; y: number }, q: { x: number; y: number }) => {
        const l2 = (q.x - p.x) ** 2 + (q.y - p.y) ** 2
        const t = l2 ? Math.max(0, Math.min(1, ((a.x - p.x) * (q.x - p.x) + (a.y - p.y) * (q.y - p.y)) / l2)) : 0
        return Math.hypot(a.x - p.x - t * (q.x - p.x), a.y - p.y - t * (q.y - p.y))
      }
      const sign = (p: { x: number; y: number }, q: { x: number; y: number }) => (q.x - p.x) * (a.y - p.y) - (q.y - p.y) * (a.x - p.x)
      let near = Math.min(...cut.flatMap((c, i) => cut.map((d, j) => (j >= i ? seg(c, d) : Infinity))))
      for (const [i, x] of cut.entries())
        for (const [j, y] of cut.entries())
          for (const [k, z] of cut.entries()) {
            if (!(i < j && j < k)) continue
            const s = [sign(x, y), sign(y, z), sign(z, x)]
            if (s.every((v) => v > 0) || s.every((v) => v < 0)) near = 0
          }
      expect(near, n.id).toBeGreaterThan(FLOW.hull + FLOW.r)
    }
  })

  it('reserves whole pixels', () => {
    expect(Number.isInteger(g.height)).toBe(true)
  })
})
