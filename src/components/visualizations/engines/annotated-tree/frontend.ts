import type { Point } from '../../substrates/box-arrow'
import { BOX, bodyTop, finish, nodeH, nodeW, port, smallW, valueW, type BoxEdge, type BoxKey, type BoxLabel, type BoxNode, type BoxesPanel } from './boxes'
import { W } from './layout'
import type { AxRecording, FederationScenario, GitPanelRun, RenderRun } from './programs/frontend'

/**
 * The wave 4D frontend figures, each built on the `boxes` panel kind from a
 * recorded run (values only, `./programs/frontend.ts`). The builders read
 * every drawn value from the recording; the structure they draw (which
 * component reads which context, which container is which) is the
 * programs' own, and `frontend.truth.test.ts` checks the drawing against the
 * rule the figure states, with lies that must fail.
 */

const node = (id: string, lines: string[], at: { cx?: number; x?: number; y: number }, o: Partial<BoxNode> = {}): BoxNode => {
  const w = o.w ?? nodeW(lines)
  const h = o.h ?? nodeH(lines)
  return { id, lines, x: Math.round(at.x ?? (at.cx ?? 0) - w / 2), y: at.y, w, h, shape: 'box', align: 'middle', ...o }
}

// ---------------------------------------------------------------------------
// State Management: render causes after setUser
// ---------------------------------------------------------------------------

/** A node of the component tree as the program builds it. */
export type TreeNodeModel = {
  id: string
  /** Box lines. */
  lines: string[]
  /** A Provider element (not a component: it has no render function and is never logged). */
  provider?: true
  /** The tree parent (the edge drawn solid). */
  parent: string | null
  /** The component whose render creates this element. */
  owner: string | null
  /** The context it reads (drawn dashed from that context's provider). */
  reads?: 'theme' | 'user'
  /** Wrapped in React.memo. */
  memo?: true
  /** The provider node of a context. */
  provides?: 'theme' | 'user'
}

export const CONTEXT_TREES: Record<'split' | 'split-memo' | 'providers', TreeNodeModel[]> = {
  split: [
    { id: 'App', lines: ['App'], parent: null, owner: null },
    { id: 'ThemeP', lines: ['ThemeContext', 'Provider'], provider: true, parent: 'App', owner: 'App', provides: 'theme' },
    { id: 'UserP', lines: ['UserContext', 'Provider'], provider: true, parent: 'ThemeP', owner: 'App', provides: 'user' },
    { id: 'Sidebar', lines: ['Sidebar'], parent: 'UserP', owner: 'App', reads: 'theme' },
    { id: 'Header', lines: ['Header'], parent: 'UserP', owner: 'App', reads: 'user' },
  ],
  'split-memo': [
    { id: 'App', lines: ['App'], parent: null, owner: null },
    { id: 'ThemeP', lines: ['ThemeContext', 'Provider'], provider: true, parent: 'App', owner: 'App', provides: 'theme' },
    { id: 'UserP', lines: ['UserContext', 'Provider'], provider: true, parent: 'ThemeP', owner: 'App', provides: 'user' },
    { id: 'Sidebar', lines: ['Sidebar'], parent: 'UserP', owner: 'App', reads: 'theme', memo: true },
    { id: 'Header', lines: ['Header'], parent: 'UserP', owner: 'App', reads: 'user' },
  ],
  // Fix 2: App passes <Sidebar/> and <Header/> as children, so App owns their elements.
  providers: [
    { id: 'App', lines: ['App'], parent: null, owner: null },
    { id: 'ThemeProvider', lines: ['ThemeProvider'], parent: 'App', owner: 'App', provides: 'theme' },
    { id: 'UserProvider', lines: ['UserProvider'], parent: 'ThemeProvider', owner: 'App', provides: 'user' },
    { id: 'Sidebar', lines: ['Sidebar'], parent: 'UserProvider', owner: 'App', reads: 'theme' },
    { id: 'Header', lines: ['Header'], parent: 'UserProvider', owner: 'App', reads: 'user' },
  ],
}

export type RenderCause = 'set' | 'parent' | 'context' | 'parent+context' | 'memo' | 'skipped'
export const CAUSE_TEXT: Record<RenderCause, string> = {
  set: 'set: owns user',
  parent: 'parent rendered',
  context: 'context changed',
  'parent+context': 'parent + context',
  memo: 'skipped: memo',
  skipped: 'skipped',
}

/**
 * The figure's rule, applied to a tree: after setUser, the component that
 * owns the user state renders; a component renders when the component that
 * creates its element rendered (unless React.memo keeps it: it has no
 * props) or when it reads the user context. Returns each component's cause.
 */
export function predictCauses(tree: readonly TreeNodeModel[], userOwner: string): Record<string, RenderCause> {
  const out: Record<string, RenderCause> = {}
  const rendered = new Set<string>([userOwner])
  for (const n of tree) {
    if (n.provider) continue
    if (n.id === userOwner) {
      out[n.id] = 'set'
      continue
    }
    const parent = n.owner !== null && rendered.has(n.owner) && !n.memo
    const context = n.reads === 'user'
    out[n.id] = parent && context ? 'parent+context' : parent ? 'parent' : context ? 'context' : n.memo && n.owner !== null && rendered.has(n.owner) ? 'memo' : 'skipped'
    if (parent || context) rendered.add(n.id)
  }
  return out
}

export const renders = (c: RenderCause) => c === 'set' || c === 'parent' || c === 'context' || c === 'parent+context'

const CONTEXT_KEYS: BoxKey[] = [
  { sample: 'solid', text: 'parent' },
  { sample: 'dashed', text: 'reads context' },
]

export function contextPanel(id: 'split' | 'split-memo' | 'providers', run: RenderRun, o: { heading: string; notes: string[] }): BoxesPanel {
  const tree = CONTEXT_TREES[id]
  const causes = predictCauses(tree, run.userOwner)
  const top = bodyTop(CONTEXT_KEYS)
  const COL = 110
  const LEAF = { Sidebar: 60, Header: 204 } as Record<string, number>
  const pitch = 58
  const nodes: BoxNode[] = []
  const labels: BoxLabel[] = []
  const at: Record<string, BoxNode> = {}
  let y = top
  for (const n of tree) {
    const leaf = n.id in LEAF
    const ny = leaf ? top + 3 * pitch + 10 : y
    const b = node(n.id, n.lines, { cx: leaf ? LEAF[n.id] : COL, y: ny }, { shape: n.provider ? 'pill' : 'box', data: { cause: causes[n.id] ?? 'provider' } })
    if (!n.provider) b.state = renders(causes[n.id]) ? 'mark' : 'ghost'
    if (!n.provider && run.afterSetUser.includes(n.id)) b.data!.rendered = ''
    nodes.push(b)
    at[n.id] = b
    if (!leaf) y += pitch
    if (!n.provider) {
      const text = CAUSE_TEXT[causes[n.id]]
      labels.push(
        leaf
          ? { x: b.x + b.w / 2, y: b.y + b.h + 14, text, anchor: 'middle', tone: renders(causes[n.id]) ? 'note' : 'muted', part: 'cause', for: n.id }
          : { x: b.x + b.w + 8, y: b.y + 12, text, anchor: 'start', tone: renders(causes[n.id]) ? 'note' : 'muted', part: 'cause', for: n.id },
      )
    }
  }
  const edges: BoxEdge[] = []
  const rendered = (id: string) => renders(causes[id] ?? 'skipped')
  for (const n of tree) {
    if (!n.parent) continue
    const a = at[n.parent]
    const b = at[n.id]
    // A parent edge carries the render when the element's owner rendered and memo did not stop it.
    const live = n.owner !== null && rendered(n.owner) && !n.memo
    const leaf = n.id in LEAF
    const from = port(a, 'bottom')
    const points: Point[] = leaf
      ? (() => {
          const mid = a.y + a.h + (b.y - a.y - a.h) / 2
          const sx = a.x + a.w / 2 + (n.id === 'Sidebar' ? -12 : 12)
          return [{ x: sx, y: a.y + a.h }, { x: sx, y: mid }, { x: b.x + b.w / 2, y: mid }, port(b, 'top')]
        })()
      : [from, port(b, 'top')]
    const e: BoxEdge = { id: `${n.parent}-${n.id}`, from: n.parent, to: n.id, points, mark: live, data: { kind: 'parent' } }
    if (n.memo) {
      const p1 = points[2]
      const p0 = points[1]
      e.tag = { text: 'memo', at: { x: Math.round((p0.x + p1.x) / 2), y: p0.y } }
    }
    edges.push(e)
  }
  for (const n of tree) {
    if (!n.reads) continue
    const prov = tree.find((x) => x.provides === n.reads)!
    const a = at[prov.id]
    const b = at[n.id]
    const changed = n.reads === 'user'
    const points: Point[] =
      n.id === 'Sidebar'
        ? [port(a, 'left'), { x: b.x + 10, y: a.y + a.h / 2 }, { x: b.x + 10, y: b.y }]
        : (() => {
            const y0 = a.y + Math.round(a.h * 0.78)
            const x = b.x + b.w - 10
            return [{ x: a.x + a.w, y: y0 }, { x, y: y0 }, { x, y: b.y }]
          })()
    edges.push({ id: `${prov.id}~${n.id}`, from: prov.id, to: n.id, points, dashed: true, mark: changed, data: { kind: 'context', context: n.reads } })
  }
  const bottom = Math.max(...nodes.map((n) => n.y + n.h)) + 18
  return finish({ kind: 'boxes', id, heading: o.heading, keys: CONTEXT_KEYS, nodes, edges, labels, notes: o.notes }, bottom)
}

// ---------------------------------------------------------------------------
// Micro-frontends: the share scope and the React each container gets
// ---------------------------------------------------------------------------

export function federationPanel(id: 'singleton' | 'unshared', s: FederationScenario, o: { heading: string; notes: string[] }): BoxesPanel {
  const top = bodyTop([])
  const scope = Object.entries(s.scope).map(([v, from]) => `${v} from ${from}`)
  const nodes: BoxNode[] = [node('scope', ['share scope: react', scope.join(' · ')], { x: 0, y: top }, { w: W, data: { versions: Object.keys(s.scope).join(',') } })]
  const cy = top + nodes[0].h + 18
  const names = ['shell', 'products', 'cart'] as const
  const cw = 84
  const gap = (W - 3 * cw) / 2
  const containers = names.map((n, i) => {
    const c = s.containers.find((x) => x.name === n)
    return node(n, [n, c?.requiredVersion ?? ''], { x: i * (cw + gap), y: cy }, { w: cw, data: { react: c?.react ?? '', required: c?.requiredVersion ?? '' } })
  })
  nodes.push(...containers)
  // One instance per container copy that some container got.
  const iy = cy + containers[0].h + 52
  const copies = [...new Set(s.containers.map((c) => c.from))]
  const inst = copies.map((from) => {
    const c = s.containers.find((x) => x.from === from)!
    return { from, version: c.react }
  })
  const instNodes =
    inst.length === 1
      ? [node(`react-${inst[0].from}`, [`react ${inst[0].version}`, `${inst[0].from}'s copy`], { x: 64, y: iy }, { w: W - 128, data: { version: inst[0].version, from: inst[0].from } })]
      : inst.map((c, i) =>
          i === 0
            ? node(`react-${c.from}`, [`react ${c.version}`, `${c.from}'s copy`], { x: 0, y: iy }, { w: 168, data: { version: c.version, from: c.from } })
            : node(`react-${c.from}`, [`react ${c.version}`, `${c.from}'s copy`], { x: W - 112, y: iy }, { w: 112, data: { version: c.version, from: c.from } }),
        )
  // The copy no other container shares (cart's own) carries the mark.
  for (const n of instNodes) if (instNodes.length > 1 && n.data!.from !== 'shell') n.state = 'mark'
  nodes.push(...instNodes)
  const edges: BoxEdge[] = []
  for (const c of containers) {
    const got = s.containers.find((x) => x.name === c.id)
    if (!got) continue
    const target = instNodes.find((n) => n.data!.from === got.from)!
    const x = c.x + c.w / 2
    const inside = x > target.x + 8 && x < target.x + target.w - 8
    const points: Point[] = inside
      ? [port(c, 'bottom'), { x, y: target.y }]
      : x < target.x
        ? [port(c, 'bottom'), { x, y: target.y + target.h / 2 }, port(target, 'left')]
        : [port(c, 'bottom'), { x, y: target.y + target.h / 2 }, port(target, 'right')]
    const warned = s.warnings.some((w) => w.includes(`required ${got.requiredVersion}`)) && got.react !== got.provides
    const e: BoxEdge = { id: `${c.id}-${target.id}`, from: c.id, to: target.id, points, mark: warned, data: { react: got.react, same: got.sameInstanceAsShell ? 'yes' : 'no', hook: got.hook } }
    if (warned) e.tag = { text: 'warning', at: { x, y: Math.round(c.y + c.h + (target.y + target.h / 2 - c.y - c.h) / 2) } }
    edges.push(e)
  }
  const bottom = Math.max(...nodes.map((n) => n.y + n.h)) + 8
  return finish({ kind: 'boxes', id, heading: o.heading, keys: [], nodes, edges, labels: [], notes: o.notes }, bottom)
}

// ---------------------------------------------------------------------------
// Accessibility: the DOM and Chromium's accessibility tree
// ---------------------------------------------------------------------------

const REASON: Record<string, string> = {
  ariaHiddenElement: 'aria-hidden',
  ariaHiddenSubtree: 'aria-hidden',
  inertElement: 'inert',
  inertSubtree: 'inert',
  presentationalRole: 'role=none',
  uninteresting: 'role=none',
}

/** A DOM element as a row: its tag, its attributes without ids (booleans bare), its own text. */
export function domRowText(d: AxRecording['dom'][number]): string {
  const attrs = d.attrs
    .filter((a) => !a.startsWith('id='))
    .map((a) => a.replace(/^([\w-]+)="(true)?"$/, '$1').replace(/^(role|tabindex)="([^"]*)"$/, '$1=$2').replace(/^(aria-labelledby)=".*"$/, '$1'))
  return [d.tag, ...attrs, ...(d.text ? [`"${d.text}"`] : [])].join(' ')
}

const ROW = BOX.row
const INDENT = 12
const GUTTER = 20

export function domPanel(rec: AxRecording, o: { heading: string; notes: string[] }): BoxesPanel {
  const top = bodyTop([])
  const depth = (id: number): number => {
    const p = rec.dom.find((d) => d.id === id)!.parent
    return p === null ? 0 : depth(p) + 1
  }
  const exposed = new Set(rec.ax.map((n) => n.dom))
  const ignored = new Map(rec.ignored.map((i) => [i.dom, i.reasons]))
  const nodes: BoxNode[] = []
  const labels: BoxLabel[] = []
  rec.dom.forEach((d, i) => {
    const text = domRowText(d)
    const y = top + i * ROW
    const x = GUTTER + depth(d.id) * INDENT
    const own = d.attrs.some((a) => /^(aria-hidden|inert|role="none")/.test(a))
    const gone = !exposed.has(d.id)
    nodes.push({ id: `dom-${d.id}`, lines: [text], x, y, w: Math.ceil(smallW(text)), h: ROW, shape: 'row', align: 'start', small: true, ...(gone ? { state: 'gone' as const } : {}), data: { dom: d.id, depth: depth(d.id), tag: d.tag, exposed: gone ? 'no' : 'yes', ...(ignored.has(d.id) ? { reasons: ignored.get(d.id)!.join(',') } : {}) } })
    // An inherited reason, said in words at the right (an element's own attribute already says it).
    const reasons = ignored.get(d.id) ?? []
    if (gone && !own && reasons.length) labels.push({ x: W, y: y + 15, text: REASON[reasons[0]] ?? reasons[0], anchor: 'end', tone: 'muted', part: 'reason', for: `dom-${d.id}` })
    // An element whose own row is left out but whose text is kept.
    if (!gone && d.text && rec.ax.some((n) => n.dom === d.id && n.role === 'generic')) labels.push({ x: W, y: y + 15, text: 'text kept', anchor: 'end', tone: 'note', part: 'reason', for: `dom-${d.id}` })
    const tab = rec.tabOrder.indexOf(d.id)
    if (tab >= 0) labels.push({ x: 8, y: y + 15, text: String(tab + 1), anchor: 'middle', tone: 'tag', part: 'tab', for: `dom-${d.id}`, ...(gone ? { mark: true } : {}) })
  })
  // aria-labelledby: from the section's row to the element it names.
  const edges: BoxEdge[] = []
  for (const d of rec.dom) {
    const ref = d.attrs.find((a) => a.startsWith('aria-labelledby='))
    if (!ref) continue
    const targetId = ref.split('"')[1]
    const t = rec.dom.find((x) => x.attrs.includes(`id="${targetId}"`))
    if (!t) continue
    const a = nodes.find((n) => n.id === `dom-${d.id}`)!
    const b = nodes.find((n) => n.id === `dom-${t.id}`)!
    const ay = a.y + ROW / 2
    const by = b.y + ROW / 2
    const x = Math.max(a.x + a.w, b.x + b.w) + 16
    edges.push({ id: `labelledby-${d.id}-${t.id}`, from: a.id, to: b.id, points: [{ x: a.x + a.w + 6, y: ay }, { x, y: ay }, { x, y: by }, { x: b.x + b.w + 6, y: by }], data: { kind: 'labelledby' } })
  }
  return finish({ kind: 'boxes', id: 'dom', heading: o.heading, keys: [], nodes, edges, labels, notes: o.notes }, top + rec.dom.length * ROW)
}

/** The rows of Chromium's tree that carry meaning: no inline text boxes, and text only where its parent has no name. */
export function axRows(rec: AxRecording): { i: number; depth: number; text: string; dom: AxRecording['dom'][number] | null }[] {
  const keep = (i: number): boolean => {
    const n = rec.ax[i]
    if (n.role === 'InlineTextBox') return false
    if (n.role === 'StaticText') return n.parent !== null && rec.ax[n.parent].name === ''
    return true
  }
  const depth = (i: number): number => {
    const p = rec.ax[i].parent
    return p === null ? 0 : depth(p) + (keep(p) ? 1 : 0)
  }
  return rec.ax.flatMap((n, i) =>
    keep(i) ? [{ i, depth: depth(i), text: `${n.role === 'StaticText' ? 'text' : n.role}${n.name ? ` "${n.name}"` : ''}`, dom: n.dom === null ? null : rec.dom.find((d) => d.id === n.dom)! }] : [],
  )
}

/** The native role of an element (HTML-AAM, for the elements the fragment uses), to tell where ARIA overrode it. */
const NATIVE: Record<string, string> = { header: 'banner', button: 'button', dialog: 'dialog', section: 'region', h2: 'heading', td: 'cell', table: 'table', main: 'main', a: 'link' }

export function axPanel(rec: AxRecording, o: { heading: string; notes: string[] }): BoxesPanel {
  const top = bodyTop([])
  const rows = axRows(rec)
  const nodes: BoxNode[] = []
  const labels: BoxLabel[] = []
  rows.forEach((r, k) => {
    const y = top + k * ROW
    const n = rec.ax[r.i]
    const overridden = r.dom !== null && NATIVE[r.dom.tag] !== undefined && NATIVE[r.dom.tag] !== n.role && r.dom.attrs.some((a) => a.startsWith('role='))
    nodes.push({ id: `ax-${r.i}`, lines: [r.text], x: r.depth * INDENT, y, w: Math.ceil(smallW(r.text)), h: ROW, shape: 'row', align: 'start', small: true, ...(overridden ? { state: 'mark' as const } : {}), data: { role: n.role, name: n.name, depth: r.depth, ...(r.dom ? { dom: r.dom.id } : {}) } })
    if (r.dom) labels.push({ x: W, y: y + 15, text: r.dom.tag, anchor: 'end', tone: overridden ? 'note' : 'muted', part: 'from', for: `ax-${r.i}` })
  })
  return finish({ kind: 'boxes', id: 'ax', heading: o.heading, keys: [], nodes, edges: [], labels, notes: o.notes }, top + rows.length * ROW)
}

// ---------------------------------------------------------------------------
// Git: commit graphs drawn as `git log --graph` (newest at the top)
// ---------------------------------------------------------------------------

export type GitView = {
  /** Branches and remote refs whose history the panel draws. */
  show: string[]
  /** The ref the command moved (the panel's one changed ref). */
  moved: string
  /** A reflog entry drawn as a dashed tag (`HEAD@{1}`). */
  reflog?: string
}

/** Each commit's letter: its subject, primed when an older commit has the same subject (a rebase copy) or when it reverts one. */
export function commitLetters(run: GitPanelRun): Record<string, string> {
  const out: Record<string, string> = {}
  run.commits.forEach((c, i) => {
    const reverted = /^Revert "(.+)"$/.exec(c.subject)
    if (reverted) out[c.hash] = `${reverted[1]}'`
    else out[c.hash] = run.commits.slice(0, i).some((x) => x.subject === c.subject) ? `${c.subject}'` : c.subject
  })
  return out
}

/** Commits reachable from `refs` (the object store keeps the rest). */
export function reachableFrom(run: GitPanelRun, refs: readonly string[]): Set<string> {
  const byHash = new Map(run.commits.map((c) => [c.hash, c]))
  const seen = new Set<string>()
  const stack = refs.map((r) => run.refs[r]).filter(Boolean)
  while (stack.length) {
    const h = stack.pop()!
    if (seen.has(h)) continue
    seen.add(h)
    stack.push(...(byHash.get(h)?.parents ?? []))
  }
  return seen
}

const GIT = { pitch: 34, lane: [13, 39], hashX: 58, tagGap: 6 } as const

export function gitPanel(id: string, run: GitPanelRun, base: GitPanelRun, view: GitView, o: { heading: string; notes: string[]; extra?: string[] }): BoxesPanel {
  const top = bodyTop([])
  const letters = commitLetters(run)
  const headBranch = run.refs.HEAD?.startsWith('-> ') ? run.refs.HEAD.slice(3) : null
  const drawn = reachableFrom(run, view.show)
  // Unreferenced commits of the branches shown (a rebase's originals) are drawn as ghosts.
  for (const h of run.unreachable) drawn.add(h)
  const byHash = new Map(run.commits.map((c) => [c.hash, c]))
  const commits = run.commits.filter((c) => drawn.has(c.hash)).reverse()
  // Lane 0: the first-parent chain from HEAD; everything else lane 1.
  const main = new Set<string>()
  for (let h: string | undefined = run.refs[headBranch ?? 'HEAD']; h; h = byHash.get(h)?.parents[0]) main.add(h)
  const created = new Set(run.commits.map((c) => c.hash).filter((h) => !base.commits.some((c) => c.hash === h)))
  const nodes: BoxNode[] = []
  const labels: BoxLabel[] = []
  const at = new Map<string, BoxNode>()
  commits.forEach((c, k) => {
    const lane = main.has(c.hash) ? 0 : 1
    const y = top + k * GIT.pitch
    const d = 2 * BOX.circle
    const ghost = run.unreachable.includes(c.hash)
    const n: BoxNode = {
      id: c.hash,
      lines: [letters[c.hash]],
      x: GIT.lane[lane] - BOX.circle,
      y: y + (GIT.pitch - d) / 2 - 2,
      w: d,
      h: d,
      shape: 'circle',
      align: 'middle',
      ...(ghost ? { state: 'ghost' as const } : created.has(c.hash) ? { state: 'mark' as const } : {}),
      data: { hash: c.hash, parents: c.parents.join(','), lane },
    }
    nodes.push(n)
    at.set(c.hash, n)
    const baseline = n.y + n.h / 2 + 4
    labels.push({ x: GIT.hashX, y: baseline, text: c.hash, anchor: 'start', tone: ghost ? 'muted' : 'note', part: 'hash', for: c.hash })
    let x = GIT.hashX + Math.ceil(smallW(c.hash)) + 8
    const tags: { text: string; mark?: boolean; dashed?: boolean }[] = []
    for (const [ref, hash] of Object.entries(run.refs)) {
      if (ref === 'HEAD' || hash !== c.hash || !view.show.includes(ref)) continue
      tags.push({ text: ref === headBranch ? `HEAD→${ref}` : ref, ...(ref === view.moved ? { mark: true } : {}) })
    }
    if (view.reflog) {
      const entry = run.reflog.find((r) => r[1] === view.reflog)
      if (entry && entry[0] === c.hash) tags.push({ text: view.reflog, dashed: true })
    }
    if (ghost) tags.push({ text: 'unreferenced' })
    for (const t of tags) {
      if (t.text === 'unreferenced') {
        labels.push({ x, y: baseline, text: t.text, anchor: 'start', tone: 'muted', part: 'unreferenced', for: c.hash })
        continue
      }
      labels.push({ x, y: baseline, text: t.text, anchor: 'start', tone: 'tag', part: 'ref', for: c.hash, ...(t.mark ? { mark: true } : {}), ...(t.dashed ? { dashed: true } : {}) })
      x += Math.ceil(smallW(t.text)) + 2 * BOX.tagPad + GIT.tagGap
    }
  })
  const edges: BoxEdge[] = []
  for (const c of commits) {
    const a = at.get(c.hash)!
    c.parents.forEach((ph, pi) => {
      const b = at.get(ph)
      if (!b) return
      const ac = { x: a.x + a.w / 2, y: a.y + a.h / 2 }
      const bc = { x: b.x + b.w / 2, y: b.y + b.h / 2 }
      const points: Point[] =
        ac.x === bc.x
          ? [port(a, 'bottom'), port(b, 'top')]
          : // Another lane: down the child's lane to the parent's row, then across into its side.
            [port(a, 'bottom'), { x: ac.x, y: bc.y }, port(b, ac.x > bc.x ? 'right' : 'left')]
      edges.push({ id: `${c.hash}-${ph}`, from: c.hash, to: ph, points, ...(a.state === 'ghost' ? { dashed: true } : {}), data: { parent: pi } })
    })
  }
  const bottom = top + commits.length * GIT.pitch
  return finish({ kind: 'boxes', id, heading: o.heading, keys: [], nodes, edges, labels, notes: o.notes }, bottom)
}

/** The width a git row's text needs (for the layout test). */
export const gitRowWidth = (hash: string, tags: string[]) => GIT.hashX + smallW(hash) + 8 + tags.reduce((s, t) => s + smallW(t) + 2 * BOX.tagPad + GIT.tagGap, 0)

export { valueW }
