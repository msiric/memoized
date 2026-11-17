// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { loadProgram, skipNote } from '../../step-log/lesson-block'
import { gainPanel, suffixPanel, trieDeletePanels, trieNodes, trieSearchPanel, type RecordedSuffixNode, type RecordedTrie } from './build'
import { annotatedTreeDescriptor } from './descriptor'
import type { GainPanel, SuffixPanel, TriePanel } from './model'
import { RECORDINGS, hiddenClassTransitions, maxPathData, maxPathGainVsThrough, suffixData, suffixTreeBanana, trieData, trieEndMarkers, type TreeRecordings } from './presets'
import { SINGLES_RECORDINGS } from './presets/singles'
import { DSA_RECORDINGS } from './presets/dsa'
import { TREE_LESSONS } from './programs'
import { suffixArrayProgram, suffixTreeProgram } from './programs/suffix'
import { maxPathSumNegativeProgram, maxPathSumProgram } from './programs/tree-dfs'
import { TRIE_WORDS, trieDeleteProgram, trieSearchProgram } from './programs/tries'
import type { TreeRecording } from './programs/types'
import { recordTree } from './truth/record'

/**
 * The annotated trees are recordings, not drawings: every returned value,
 * through value, END flag, edge range, suffix index and LCP is read from a
 * real Node 24 run of the lesson code (`truth/record.ts`). With a local
 * content checkout this test checks each block's sha256, re-records every
 * program and requires the committed recording; everywhere it rebuilds each
 * preset from the recordings, checks the register's verification values
 * and that lies (a returned through value, a pruned word, a wrong deepest
 * node, a tampered recording) fail. Without the checkout (CI) the premium
 * code is absent: the re-recording skips, saying so, and the rest runs.
 */

const ALL = Object.values(TREE_LESSONS).flat()

/** A fresh recording from the checkout, or null where the checkout lacks the block (CI). */
function fresh(id: string): TreeRecording | null {
  const p = ALL.find((x) => x.id === id)!
  const loaded = loadProgram(p.source)
  if (!loaded.ok) return null
  const { runtime, ...rec } = recordTree(p, loaded.text)
  expect(runtime).toMatch(/^node@24\./)
  return rec
}

const missing = ALL.map((p) => loadProgram(p.source)).find((l) => !l.ok)

describe('annotated-tree recordings', () => {
  it.skipIf(Boolean(missing)).each(ALL.map((p) => p.id))('%s: a fresh Node 24 run under the inspector equals the committed recording', (id) => {
    expect(fresh(id)).toEqual({ ...RECORDINGS, ...SINGLES_RECORDINGS, ...DSA_RECORDINGS }[id])
  })

  it('says why the re-recording skipped (no content checkout)', () => {
    if (missing && !missing.ok) console.info(`annotated-tree: re-recording skipped: ${skipNote(missing.missing)}`)
    expect(true).toBe(true)
  })

  it('every preset is its recordings, rebuilt (fresh where the checkout has the code)', () => {
    const rec: TreeRecordings = { ...RECORDINGS, ...SINGLES_RECORDINGS, ...DSA_RECORDINGS }
    if (!missing) for (const p of ALL) rec[p.id] = fresh(p.id)!
    expect(maxPathData(rec)).toEqual(maxPathGainVsThrough.data)
    expect(trieData(rec)).toEqual(trieEndMarkers.data)
    expect(suffixData(rec)).toEqual(suffixTreeBanana.data)
    // The hidden-class preset has its own recorder and test (`hidden-classes.truth.test.ts`).
    for (const preset of annotatedTreeDescriptor.presets.filter((p) => p !== hiddenClassTransitions))
      for (const prog of preset.programs) {
        expect(prog.sha256).toBe(rec[prog.id].sha256)
        expect(prog.observed).toEqual(rec[prog.id].stdout)
      }
  })
})

describe('max-path-gain-vs-through (tree-dfs, maximum-path-sum)', () => {
  const [main, inset] = maxPathGainVsThrough.data.panels as GainPanel[]
  const byValue = (p: GainPanel) => Object.fromEntries(Object.values(p.nodes).map((n) => [n.value, n]))

  it('the register: through/returns 9/9, 15/15, 7/7, 42/35, 34/25; ans 42', () => {
    const n = byValue(main)
    expect([9, 15, 7, 20, -10].map((v) => [n[v].through, n[v].returned])).toEqual([
      [9, 9],
      [15, 15],
      [7, 7],
      [42, 35],
      [34, 25],
    ])
    expect(maxPathGainVsThrough.programs[0].observed).toEqual(['42'])
    expect(main.heading).toBe('[-10, 9, 20, null, null, 15, 7]')
    expect(main.best!.map((id) => main.nodes[id].value)).toEqual([15, 20, 7])
  })

  it('the through value is never returned: 42 is recorded at 20, which returns 35', () => {
    const n = byValue(main)
    expect(n[20].returned).not.toBe(n[20].through)
    expect(Object.values(main.nodes).map((x) => x.returned)).not.toContain(42)
    // The marked path never touches the edge to 20's parent.
    expect(main.best).not.toContain(main.root)
  })

  it('every through value is the recorded ans update: ans after a node = max(ans before, l + r + value)', () => {
    for (const p of [main, inset]) {
      const order: string[] = []
      const walk = (id: string | null) => {
        if (!id) return
        walk(p.nodes[id].left)
        walk(p.nodes[id].right)
        order.push(id)
      }
      walk(p.root)
      let ans = -Infinity
      for (const id of order) {
        ans = Math.max(ans, p.nodes[id].through)
        expect(p.nodes[id].ans, id).toBe(ans)
      }
      // And each gain is the child's recorded return, clamped at 0 by the parent.
      for (const x of Object.values(p.nodes)) {
        expect(x.gainLeft).toBe(x.left ? Math.max(0, p.nodes[x.left].returned) : 0)
        expect(x.gainRight).toBe(x.right ? Math.max(0, p.nodes[x.right].returned) : 0)
        expect(x.returned).toBe(Math.max(x.gainLeft, x.gainRight) + x.value)
      }
    }
  })

  it('the inset: -9 returns -9, its upward edge reads max(0, -9) = 0, ans stays 42', () => {
    const n = byValue(inset)
    expect(n[-9].returned).toBe(-9)
    expect(n[-10].gainLeft).toBe(0)
    expect(inset.clamp).toEqual({ child: n[-9].id })
    expect(inset.notes[0]).toBe('-10 takes max(0, -9) = 0 from -9')
    expect(n[-10].ans).toBe(42)
    expect(maxPathGainVsThrough.programs[1].observed).toEqual(['42'])
  })

  it('catches a lie: a run where 20 returned its through value', () => {
    const rec = structuredClone(RECORDINGS[maxPathSumProgram.id])
    rec.pauses.find((p) => p.vars.val === 20)!.returned = 42
    expect(gainPanel(rec, { id: 'gains', heading: '' })).not.toEqual({ ...main, heading: '', legend: [] })
    const neg = structuredClone(RECORDINGS[maxPathSumNegativeProgram.id])
    neg.pauses.find((p) => p.vars.val === -10)!.vars.left = -9
    expect(gainPanel(neg, { id: 'clamp', heading: '' }).nodes.n.through).not.toBe(inset.nodes.n.through)
  })
})

describe('trie-end-markers (tries)', () => {
  const [search, afterApp, afterApplet] = trieEndMarkers.data.panels as TriePanel[]
  const node = (p: TriePanel, id: string) => p.nodes.find((n) => n.id === id)
  const words = (p: TriePanel) => p.nodes.filter((n) => n.end && n.mark !== 'pruned').map((n) => n.id)

  it('the trie of app, apple, applet, banana: one node per character, END on each word', () => {
    expect(search.nodes).toHaveLength(13)
    expect(words(search)).toEqual([...TRIE_WORDS])
  })

  it("search('ap') is false (p is not END) while startsWith('ap') is true", () => {
    expect(trieEndMarkers.programs[0].observed).toEqual(['false', 'true'])
    expect(node(search, 'ap')).toMatchObject({ end: false, mark: 'path' })
    expect(search.nodes.filter((n) => n.mark === 'path').map((n) => n.id)).toEqual(['a', 'ap'])
  })

  it("delete('app') clears END on the second p only and keeps apple and applet", () => {
    expect(node(afterApp, 'app')).toMatchObject({ end: false, mark: 'cleared' })
    expect(words(afterApp)).toEqual(['apple', 'applet', 'banana'])
    expect(afterApp.nodes.filter((n) => n.mark === 'pruned')).toEqual([])
    expect(afterApp.nodes.filter((n) => n.mark).map((n) => n.id)).toEqual(['app'])
  })

  it("delete('applet') prunes t and stops at e, because e is END", () => {
    expect(afterApplet.nodes.filter((n) => n.mark === 'pruned').map((n) => n.id)).toEqual(['applet'])
    expect(node(afterApplet, 'apple')).toMatchObject({ end: true, mark: 'stop' })
    expect(words(afterApplet)).toEqual(['apple', 'banana'])
    // The recursion's own returns: t's call returned true (prune it), e's returned false (stop).
    const rec = RECORDINGS[trieDeleteProgram.id].pauses.filter((p) => p.vars.word === 'applet' && p.probe !== 'before' && p.probe !== 'after')
    expect(rec.map((p) => [p.vars.depth, p.returned])).toEqual([
      [6, true],
      [5, false],
      [4, false],
      [3, false],
      [2, false],
      [1, false],
      [0, false],
    ])
  })

  it('catches a lie: a delete that also unmarked apple, or a search that found a word', () => {
    const rec = structuredClone(RECORDINGS[trieDeleteProgram.id])
    const after = rec.pauses.find((p) => p.probe === 'after' && p.vars.word === 'app')!
    const t = after.vars.trie as RecordedTrie
    const apple = t.kids[0][1].kids[0][1].kids[0][1].kids[0][1].kids[0][1]
    apple.end = false
    expect(trieDeletePanels(rec)[0]).not.toEqual(afterApp)
    const s = structuredClone(RECORDINGS[trieSearchProgram.id])
    s.stdout = ['true', 'true']
    expect(trieSearchPanel(s, 'ap')).not.toEqual({ ...search, heading: trieSearchPanel(s, 'ap').heading })
    expect(trieNodes((rec.pauses[0].vars.trie as RecordedTrie)).length).toBe(13)
  })
})

describe('suffix-tree-banana (suffix-arrays-and-suffix-trees)', () => {
  const p = suffixTreeBanana.data.panels[0] as SuffixPanel
  const leaves = p.nodes.filter((n) => n.leaf !== undefined)

  it('the compressed suffix tree of banana$: four root edges, ranges and leaf indices as recorded', () => {
    const rootEdges = p.nodes.filter((n) => n.parent === 'root').map((n) => [n.edge!.text, n.edge!.start, n.edge!.end])
    expect(rootEdges).toEqual([
      ['$', 6, 6],
      ['a', 1, 1],
      ['banana$', 0, 6],
      ['na', 2, 3],
    ])
    expect(leaves.map((n) => n.leaf).sort()).toEqual([0, 1, 2, 3, 4, 5, 6])
    // Every root-to-leaf path spells the suffix that starts at the leaf's index.
    for (const l of leaves) {
      let s = ''
      for (let id: string | null = l.id; id && id !== 'root'; id = p.nodes.find((n) => n.id === id)!.parent) s = p.nodes.find((n) => n.id === id)!.edge!.text + s
      expect(s).toBe(p.text.slice(l.leaf!))
    }
  })

  it('leaves top to bottom are the suffix array; the LCP is the recorded one', () => {
    expect(leaves.map((n) => n.leaf)).toEqual(p.rows.map((r) => r.sa))
    expect(p.rows.map((r) => r.sa)).toEqual([6, 5, 3, 1, 0, 4, 2])
    expect(p.rows.map((r) => r.lcp)).toEqual([0, 0, 1, 3, 0, 0, 2])
    expect(suffixTreeBanana.programs[1].observed[2]).toBe('ana')
  })

  it("'ana' is the max-LCP node: the deepest internal node, depth 3, the longest repeated substring", () => {
    const internal = p.nodes.filter((n) => n.path !== undefined)
    const deepest = internal.reduce((a, b) => (b.path!.length > a.path!.length ? b : a))
    expect(deepest.path).toBe('ana')
    expect(deepest.marked).toBe(true)
    const max = p.rows[p.maxRank].lcp
    expect(max).toBe(deepest.path!.length)
    expect(p.rows[p.maxRank].suffix.slice(0, max)).toBe(deepest.path)
    expect(p.rows[p.maxRank - 1].suffix.slice(0, max)).toBe(deepest.path)
    // 'na' (depth 2) and 'a' are repeats too, but shorter; only the path to 'ana' is marked.
    for (const n of internal) if (n !== deepest) expect(n.path!.length).toBeLessThan(max)
    expect(internal.filter((n) => n.marked).map((n) => n.path)).toEqual(['a', 'ana'])
  })

  it('the inset: 11 nodes compressed, 23 in a plain trie (one node per distinct suffix prefix, plus the root)', () => {
    const prefixes = new Set<string>()
    for (let i = 0; i < p.text.length; i++) for (let j = i + 1; j <= p.text.length; j++) prefixes.add(p.text.slice(i, j))
    expect(p.nodes).toHaveLength(11)
    expect(prefixes.size + 1).toBe(23)
    expect(p.notes[2]).toBe(`${p.nodes.length} nodes; ${prefixes.size + 1} in a plain trie`)
  })

  it('catches a lie: a tampered tree or suffix array', () => {
    const t = structuredClone(RECORDINGS[suffixTreeProgram.id])
    const root = t.pauses[0].vars.tree as RecordedSuffixNode
    root.kids[1][1].start = 5
    root.kids[1][1].end = 5
    expect(suffixPanel(t, RECORDINGS[suffixArrayProgram.id], { id: p.id, heading: p.heading })).not.toEqual(p)
    const a = structuredClone(RECORDINGS[suffixArrayProgram.id])
    a.stdout[1] = '[0,0,1,2,0,0,3]'
    const lie = suffixPanel(RECORDINGS[suffixTreeProgram.id], a, { id: p.id, heading: p.heading })
    expect(lie.maxRank).not.toBe(p.maxRank)
  })
})

describe('annotated-tree text alternative', () => {
  it('describes every panel and lists every program that printed', () => {
    for (const preset of annotatedTreeDescriptor.presets) {
      const alt = annotatedTreeDescriptor.engine.describe(preset.data)
      expect(alt.parts).toHaveLength(preset.data.panels.length)
      for (const part of alt.parts) expect(part.lines.length).toBeGreaterThan(2)
    }
    const gain = annotatedTreeDescriptor.engine.describe(maxPathGainVsThrough.data).parts[0].lines.join(' ')
    expect(gain).toMatch(/20: takes 15 from the left and 7 from the right, through = 15 \+ 7 \+ 20 = 42, returns 35/)
    const trie = annotatedTreeDescriptor.engine.describe(trieEndMarkers.data).parts[2].lines.join(' ')
    expect(trie).toMatch(/Dashed: applet, pruned/)
    const suffix = annotatedTreeDescriptor.engine.describe(suffixTreeBanana.data).parts[0].lines.join(' ')
    expect(suffix).toMatch(/Suffix array \(leaves top to bottom\): 6, 5, 3, 1, 0, 4, 2/)
  })
})
