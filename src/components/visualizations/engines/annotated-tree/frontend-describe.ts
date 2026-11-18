import type { BoxesPanel, BoxNode } from './boxes'

/**
 * The text alternative of a `boxes` panel (wave 4D): what each node is and
 * says, in the panel's own words, then its links. The figure's builder
 * names its parts through `data-*` values, so the sentences read the same
 * values the drawing does.
 */

const labelsFor = (p: BoxesPanel, id: string, part?: string) => p.labels.filter((l) => l.for === id && (!part || l.part === part)).map((l) => l.text)
const name = (n: BoxNode) => n.lines.join(' ')

function describeContext(p: BoxesPanel): string[] {
  const lines = p.nodes.map((n) => {
    if (n.shape === 'pill') return `${name(n)}: a Provider element (no render function).`
    const cause = labelsFor(p, n.id, 'cause')[0] ?? ''
    return `${name(n)}: ${n.state === 'mark' ? 'renders' : 'does not render'} (${cause})${n.state === 'mark' ? ' (marked)' : ''}.`
  })
  const nameOf = (id: string) => name(p.nodes.find((n) => n.id === id)!)
  for (const e of p.edges) {
    const what = e.data?.kind === 'context' ? `reads ${e.data.context} from` : 'is a child of'
    const tag = e.tag ? `, through ${e.tag.text}` : ''
    lines.push(`${nameOf(e.to)} ${what} ${nameOf(e.from)}${tag}${e.mark ? ': this edge carries the render (marked)' : ''}.`)
  }
  return lines
}

function describeFederation(p: BoxesPanel): string[] {
  const scope = p.nodes.find((n) => n.id === 'scope')!
  const lines = [`Share scope for react: ${scope.lines[1]}.`]
  for (const e of p.edges) {
    const c = p.nodes.find((n) => n.id === e.from)!
    const t = p.nodes.find((n) => n.id === e.to)!
    lines.push(`${c.lines[0]} (requires ${c.lines[1]}) gets ${t.lines[0]}, ${t.lines[1]}${e.data?.same === 'yes' ? ', the shell’s React object' : ', not the shell’s React object'}${e.tag ? `, with a ${e.tag.text} (marked)` : ''}; a useState call: ${e.data?.hook}.`)
  }
  return lines
}

function describeRows(p: BoxesPanel): string[] {
  return p.nodes.map((n) => {
    const depth = Number(n.data?.depth ?? 0)
    const tab = labelsFor(p, n.id, 'tab')[0]
    const reason = labelsFor(p, n.id, 'reason')[0]
    const from = labelsFor(p, n.id, 'from')[0]
    const parts = [
      `${name(n)}${depth ? ` (level ${depth + 1})` : ''}`,
      ...(from ? [`from <${from}>`] : []),
      ...(n.state === 'gone' ? [`not in the tree${reason && reason !== 'text kept' ? ` (${reason})` : ''}`] : []),
      ...(reason === 'text kept' ? ['its text kept'] : []),
      ...(tab ? [`Tab stop ${tab}${n.state === 'gone' ? ' (marked)' : ''}`] : []),
      ...(n.state === 'mark' ? ['role overridden by ARIA (marked)'] : []),
    ]
    return `${parts.join(', ')}.`
  }).concat(p.edges.map((e) => `${name(p.nodes.find((n) => n.id === e.from)!)} is labelled by ${name(p.nodes.find((n) => n.id === e.to)!)} (aria-labelledby).`))
}

function describeGit(p: BoxesPanel): string[] {
  // Newest first, as drawn.
  return p.nodes.map((n) => {
    const hash = String(n.data?.hash)
    const parents = String(n.data?.parents ?? '')
      .split(',')
      .filter(Boolean)
    const refs = p.labels.filter((l) => l.for === n.id && l.part === 'ref')
    const refText = refs.length ? `; ${refs.map((r) => `${r.text}${r.mark ? ' (moved, marked)' : ''}${r.dashed ? ' (reflog entry)' : ''}`).join(', ')}` : ''
    const state = n.state === 'mark' ? ' (new, marked)' : n.state === 'ghost' ? ' (unreferenced, dashed)' : ''
    return `${name(n)} ${hash}${state}: ${parents.length ? `parent${parents.length > 1 ? 's' : ''} ${parents.join(' and ')}` : 'no parent'}${refText}.`
  })
}

export function describeBoxes(p: BoxesPanel): string[] {
  const body = ['split', 'split-memo', 'providers'].includes(p.id)
    ? describeContext(p)
    : ['singleton', 'unshared'].includes(p.id)
      ? describeFederation(p)
      : p.id === 'dom' || p.id === 'ax'
        ? describeRows(p)
        : describeGit(p)
  return [...body, ...p.notes.map((n) => (/[.!?:]$/.test(n) ? n : `${n}.`))]
}
