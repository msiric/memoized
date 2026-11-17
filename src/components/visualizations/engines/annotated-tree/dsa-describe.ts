import { hitText, outcomeText, rangeText, sumText, type DsaPanel, type ForestPanel, type HeapPanel, type IntervalPanel, type RecursionPanel, type SegmentPanel } from './dsa'

/** The text alternative of the wave 4A panels: every drawn value and mark, in words. */

function describeSegment(p: SegmentPanel): string[] {
  const lines = p.nodes.map((n) => {
    const parts = [`Node ${n.idx} ${rangeText(n)}: sum ${sumText(n).replace('→', ' becomes ')}`]
    if (p.mark === 'cover' && n.cover) parts.push(`${n.cover}${n.cover === 'full' ? ' (marked)' : n.cover === 'disjoint' ? ' (dashed)' : ''}`)
    if (p.mark === 'path' && n.path) parts.push('on the update path (marked)')
    if (n.tag) parts.push(`lazy tag +${n.tag}`)
    return `${parts.join(', ')}.`
  })
  return [...lines, ...p.notes.map((l) => `${l}.`)]
}

function describeForest(p: ForestPanel): string[] {
  const roots = p.parent.map((v, i) => (v === i ? i : -1)).filter((i) => i >= 0)
  const lines = [`Roots (their own parent): ${roots.join(', ')}.`]
  for (const [i, v] of p.parent.entries()) if (v !== i) lines.push(`${i} points to ${v}${p.changed.includes(i) ? ' (marked: changed in this panel)' : ''}.`)
  for (const r of p.rows) lines.push(`${r.name}[]: ${r.values.join(', ')}.`)
  return [...lines, ...p.notes.map((l) => `${l}.`)]
}

function describeHeap(p: HeapPanel): string[] {
  const lines = [`Array [${p.heap.join(', ')}], read as a tree by index.`]
  for (const [i, v] of p.heap.entries()) {
    const kids = [2 * i + 1, 2 * i + 2].filter((k) => k < p.heap.length)
    lines.push(`Index ${i}, ${v}: ${kids.length ? `children ${kids.map((k) => `${p.heap[k]} at ${k}`).join(' and ')}` : 'a leaf'}.`)
  }
  const out = outcomeText(p)
  if (out) lines.push(`Comparing ${p.heap[p.compare!.at]} at index ${p.compare!.at}: ${out} (marked).`)
  return [...lines, ...p.notes.map((l) => `${l}.`)]
}

function describeRecursion(p: RecursionPanel): string[] {
  const label = (id: string) => {
    const n = p.nodes.find((x) => x.id === id)!
    return n.hit ? `${hitText(n.n)} (a memo hit)` : `fib(${n.n})`
  }
  const lines = p.nodes
    .filter((n) => !n.hit && p.nodes.some((k) => k.parent === n.id))
    .map((n) => {
      const kids = p.nodes.filter((k) => k.parent === n.id)
      return `fib(${n.n})${n.repeat ? ' (marked: computed again)' : ''} calls ${kids.map((k) => label(k.id)).join(' and ')}.`
    })
  if (p.memo) lines.push(`Memo writes, in order: ${p.memo.map((m) => `memo[${m.n}] = ${m.value}`).join(', ')}.`)
  return [...lines, ...p.notes.map((l) => `${l}.`)]
}

function describeInterval(p: IntervalPanel): string[] {
  const rows: string[] = []
  const n = p.s.length
  for (let i = 0; i < n; i++) {
    const cells = p.cells.filter((c) => c.i === i)
    rows.push(`Row ${i} (${p.s[i]}), j from ${i}: ${cells.map((c) => (p.show === 'value' ? c.value : c.i === c.j ? 'base' : c.order)).join(', ')}.`)
  }
  const [ti, tj] = p.target
  rows.push(`dp[${ti}][${tj}] (marked) reads ${p.arrows.map((a) => `dp[${a.to[0]}][${a.to[1]}]${a.used ? ' (used here)' : ''}`).join(', ')}.`)
  rows.push('Below the diagonal (i > j) is an empty interval, left blank.')
  return [...rows, ...p.notes.map((l) => `${l}.`)]
}

export function describeDsa(p: DsaPanel): string[] {
  if (p.kind === 'segment') return describeSegment(p)
  if (p.kind === 'forest') return describeForest(p)
  if (p.kind === 'heap') return describeHeap(p)
  if (p.kind === 'recursion') return describeRecursion(p)
  return describeInterval(p)
}
