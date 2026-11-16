import type { TreePause, TreeRecording } from './programs/types'
import type { GainNode, GainPanel, SuffixNodeView, SuffixPanel, TrieMark, TrieNodeView, TriePanel } from './model'

/**
 * Recordings to panels: pure functions of the recorded values, so the truth
 * test can rebuild every panel from a fresh run and compare it with the
 * committed preset. Nothing here computes what the program computes: each
 * returned value, flag, edge range, suffix index and LCP is read from the
 * recording; the build only arranges them (ids, order, which node is
 * marked) and sums the three recorded terms a node's through value is made
 * of, a sum the truth test ties to the recorded `ans`.
 */

// ---------------------------------------------------------------------------
// Maximum path sum (Tree DFS)
// ---------------------------------------------------------------------------

type Shape = [number, Shape | null, Shape | null]

const num = (v: unknown, what: string): number => {
  if (typeof v !== 'number') throw new Error(`annotated-tree: ${what} is not a recorded number (${JSON.stringify(v)})`)
  return v
}

/**
 * One gain panel from a maximum-path-sum run: the tree is the shape the
 * root's call read, its nodes matched to the calls in post-order (the order
 * the returns were recorded); `best` is the path through the node whose
 * update set the final `ans`, extended down each side whose gain was taken.
 */
export function gainPanel(rec: TreeRecording, opts: { id: string; heading: string }): GainPanel {
  const calls = rec.pauses.filter((p) => p.probe === 'call')
  const shape = calls[calls.length - 1].vars.shape as Shape
  const nodes: Record<string, GainNode> = {}
  const order: string[] = []
  let k = 0
  const visit = (s: Shape, id: string): string => {
    const left = s[1] ? visit(s[1], `${id}l`) : null
    const right = s[2] ? visit(s[2], `${id}r`) : null
    const call: TreePause = calls[k++]
    const value = num(call.vars.val, `${id}.val`)
    if (value !== s[0]) throw new Error(`annotated-tree: call ${k} read ${value}, the tree has ${s[0]} there`)
    const gainLeft = num(call.vars.left, `${id} left`)
    const gainRight = num(call.vars.right, `${id} right`)
    nodes[id] = {
      id,
      value,
      left,
      right,
      returned: num(call.returned, `${id} returned`),
      gainLeft,
      gainRight,
      through: gainLeft + gainRight + value,
      ans: num(call.vars.ans, `${id} ans`),
    }
    order.push(id)
    return id
  }
  const root = visit(shape, 'n')
  if (k !== calls.length) throw new Error(`annotated-tree: ${calls.length} calls for ${k} nodes`)
  const final = nodes[root].ans
  // The node whose own update set the final answer: the first call, in recorded order, whose ans reached it.
  const setter = order.map((id) => nodes[id]).find((n) => n.ans === final && n.through === final)
  const down = (id: string | null): string[] => {
    if (!id) return []
    const n = nodes[id]
    if (n.returned <= 0) return []
    const next = n.gainLeft >= n.gainRight ? n.left : n.right
    const taken = n.gainLeft >= n.gainRight ? n.gainLeft : n.gainRight
    return [id, ...(taken > 0 ? down(next) : [])]
  }
  const best = setter
    ? [...down(setter.gainLeft > 0 ? setter.left : null).reverse(), setter.id, ...down(setter.gainRight > 0 ? setter.right : null)]
    : undefined
  const clampChild = Object.values(nodes).find((n) => n.returned < 0 && n.id !== root)
  const notes: string[] = []
  if (clampChild) {
    const parent = Object.values(nodes).find((n) => n.left === clampChild.id || n.right === clampChild.id)!
    const took = parent.left === clampChild.id ? parent.gainLeft : parent.gainRight
    notes.push(`${parent.value} takes max(0, ${clampChild.returned}) = ${took} from ${clampChild.value}`)
    notes.push(`${parent.value}: ${parent.gainLeft} + ${parent.gainRight} + ${parent.value} = ${parent.through}; ans stays ${final}`)
  } else if (setter) {
    const s = nodes[setter.id]
    notes.push(`ans = ${final} at ${s.value}: ${s.gainLeft} + ${s.gainRight} + ${s.value}`)
    notes.push(`${s.value} returns ${s.returned}: ${final} is never returned`)
  }
  return { kind: 'gain', id: opts.id, heading: opts.heading, legend: [], root, nodes, best: clampChild ? undefined : best, clamp: clampChild ? { child: clampChild.id } : undefined, notes }
}

// ---------------------------------------------------------------------------
// Tries
// ---------------------------------------------------------------------------

export type RecordedTrie = { end: boolean; kids: [string, RecordedTrie][] }

/** A recorded trie as nodes in DFS (insertion) order; ids are the prefixes ('' the root). */
export function trieNodes(t: RecordedTrie): TrieNodeView[] {
  const out: TrieNodeView[] = []
  const walk = (n: RecordedTrie, prefix: string, parent: string | null) => {
    out.push({ id: prefix || 'root', char: prefix.slice(-1), parent, depth: prefix.length, end: n.end })
    for (const [c, k] of n.kids) walk(k, prefix + c, prefix || 'root')
  }
  walk(t, '', null)
  return out
}

const mark = (nodes: TrieNodeView[], marks: Record<string, TrieMark>): TrieNodeView[] =>
  nodes.map((n) => (marks[n.id] ? { ...n, mark: marks[n.id] } : n))

/** The ids along a word's path from the root, as far as the trie has it. */
export function trieWalk(nodes: TrieNodeView[], word: string): string[] {
  const ids = new Set(nodes.map((n) => n.id))
  const out: string[] = []
  for (let i = 1; i <= word.length && ids.has(word.slice(0, i)); i++) out.push(word.slice(0, i))
  return out
}

export function trieSearchPanel(rec: TreeRecording, prefix: string): TriePanel {
  const t = rec.pauses.find((p) => p.probe === 'inserted')!.vars.trie as RecordedTrie
  const nodes = trieNodes(t)
  const path = trieWalk(nodes, prefix)
  const [search, startsWith] = rec.stdout
  const last = nodes.find((n) => n.id === path[path.length - 1])!
  return {
    kind: 'trie',
    id: 'search',
    heading: `search vs startsWith('${prefix}')`,
    nodes: mark(nodes, Object.fromEntries(path.map((id) => [id, 'path' as const]))),
    results: [
      { call: `search('${prefix}')`, value: search, note: last.end ? `${last.char} is END` : `${last.char} is not END` },
      { call: `startsWith('${prefix}')`, value: startsWith, note: 'path exists' },
    ],
  }
}

/** The two delete panels: the trie after each delete, its changed node marked from the before and after recordings. */
export function trieDeletePanels(rec: TreeRecording): TriePanel[] {
  const before = rec.pauses.filter((p) => p.probe === 'before')
  const after = rec.pauses.filter((p) => p.probe === 'after')
  return after.map((a, i) => {
    const word = String(a.vars.word)
    const was = trieNodes(before[i].vars.trie as RecordedTrie)
    const now = trieNodes(a.vars.trie as RecordedTrie)
    const nowIds = new Map(now.map((n) => [n.id, n]))
    const pruned = was.filter((n) => !nowIds.has(n.id))
    const cleared = now.filter((n) => was.find((w) => w.id === n.id)!.end && !n.end)
    // Where the pruning stopped: the deepest kept node on the word's path (recorded `return false` after deleting a child).
    const stopped = rec.pauses.find((p) => p.probe === 'pruned-child' && p.vars.word === word)
    const stopId = stopped ? word.slice(0, Number(stopped.vars.depth)) : undefined
    const marks: Record<string, TrieMark> = {}
    for (const n of cleared) marks[n.id] = 'cleared'
    if (stopId) marks[stopId] = 'stop'
    // Pruned nodes stay in the drawing as ghosts, where they were.
    const nodes = was.map((n) => (nowIds.has(n.id) ? { ...nowIds.get(n.id)!, ...(marks[n.id] ? { mark: marks[n.id] } : {}) } : { ...n, mark: 'pruned' as const }))
    const results: TriePanel['results'] = []
    if (cleared.length) results.push({ call: `delete('${word}')`, note: `END cleared on ${cleared.map((n) => n.char).join(', ')}` })
    else results.push({ call: `delete('${word}')`, note: `${pruned.map((n) => n.char).join(', ')} pruned (dashed)` })
    if (stopId) {
      const s = nowIds.get(stopId)!
      results.push({ call: '', note: `stops at ${s.char}: ${s.end ? 'it is END' : 'it has children'}` })
    } else if (cleared.length) {
      const c = cleared[0]
      const kids = now.filter((n) => n.parent === c.id).map((n) => n.char)
      results.push({ call: '', note: `${pruned.length ? `${pruned.length} pruned` : 'nothing pruned'}: ${c.char} still has ${kids.join(', ')}` })
    }
    return { kind: 'trie', id: `delete-${word}`, heading: `after delete('${word}')`, nodes, results }
  })
}

// ---------------------------------------------------------------------------
// Suffix tree (banana$)
// ---------------------------------------------------------------------------

export type RecordedSuffixNode = { start: number; end: number; index: number; kids: [string, RecordedSuffixNode][] }

/**
 * The recorded suffix tree with children in character (code unit) order,
 * so a depth-first walk meets the leaves in suffix-array order; internal
 * nodes carry their path string. The deepest internal node (greatest string
 * depth) and its path are marked.
 */
export function suffixPanel(tree: TreeRecording, array: TreeRecording, opts: { id: string; heading: string }): SuffixPanel {
  const built = tree.pauses.find((p) => p.probe === 'built')!
  const text = String(built.vars.text)
  const root = built.vars.tree as RecordedSuffixNode
  const nodes: SuffixNodeView[] = []
  let deepest: { id: string; depth: number } = { id: 'root', depth: 0 }
  const walk = (n: RecordedSuffixNode, id: string, parent: string | null, path: string) => {
    const edge = parent === null ? null : { text: text.slice(n.start, n.end + 1), start: n.start, end: n.end }
    const full = path + (edge?.text ?? '')
    const leaf = n.kids.length === 0
    nodes.push({ id, parent, edge, ...(leaf ? { leaf: n.index } : { path: full }) })
    if (!leaf && parent !== null && full.length > deepest.depth) deepest = { id, depth: full.length }
    const kids = [...n.kids].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    for (const [c, k] of kids) walk(k, `${id}/${c}`, id, full)
  }
  walk(root, 'root', null, '')
  const onPath = new Set<string>()
  for (let id: string | null = deepest.id; id; id = nodes.find((n) => n.id === id)!.parent) onPath.add(id)
  const marked = nodes.map((n) => (onPath.has(n.id) && n.id !== 'root' ? { ...n, marked: true } : n))
  const sa = JSON.parse(array.stdout[0]) as number[]
  const lcp = JSON.parse(array.stdout[1]) as number[]
  const suffixes = array.pauses.find((p) => p.probe === 'sorted')!.vars.suffixes as string[]
  const rows = sa.map((s, i) => ({ sa: s, suffix: suffixes[i], lcp: lcp[i] }))
  const maxRank = lcp.indexOf(Math.max(...lcp))
  const deep = marked.find((n) => n.id === deepest.id)!
  const plain = 1 + marked.reduce((s, n) => s + (n.edge ? n.edge.end - n.edge.start + 1 : 0), 0)
  return {
    kind: 'suffix',
    id: opts.id,
    heading: opts.heading,
    text,
    nodes: marked,
    rows,
    maxRank,
    notes: [
      `${deep.path}, depth ${deepest.depth}, = max LCP ${lcp[maxRank]}:`,
      'the longest repeated substring',
      `${marked.length} nodes; ${plain} in a plain trie`,
    ],
  }
}
