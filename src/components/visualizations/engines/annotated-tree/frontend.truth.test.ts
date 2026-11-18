// @vitest-environment node
import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { loadProgram, skipNote } from '../../step-log/lesson-block'
import { checkBoxes, type BoxesPanel } from './boxes'
import { CONTEXT_TREES, axPanel, axRows, commitLetters, contextPanel, domPanel, federationPanel, gitPanel, predictCauses, renders } from './frontend'
import { AX_HTML, RENDER_PROGRAMS, type AxRecording, type FederationRecording, type GitRecording } from './programs/frontend'
import { AX_RECORDING, FEDERATION_RECORDING, FRONTEND_PRESETS, GIT_RECORDING, STATE_RECORDING, contextPredictedRenders } from './presets/frontend'
import { federationDir, recordFederation } from './truth/federation'
import { recordAx, recordGit, recordRenders } from './truth/record-frontend'

/**
 * The wave 4D frontend figures against real runs: with what this machine
 * has, a fresh recording equals the committed one (git always; React with
 * the content checkout; Chromium where Playwright's browser is installed;
 * Module Federation with a prepared harness, `VIZ_MF_DIR`); everywhere,
 * the register's verification on the committed recordings, the rule each
 * figure states checked against them, lies that must fail, and every
 * panel's layout.
 */

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T
const panels = (id: string) => FRONTEND_PRESETS.find((p) => p.id === id)!.data.panels as BoxesPanel[]
const chromiumReady = async () => {
  try {
    const { chromium } = await import('playwright')
    return fs.existsSync(chromium.executablePath())
  } catch {
    return false
  }
}

describe('frontend recordings: a fresh run equals the committed one', () => {
  const loaded = RENDER_PROGRAMS.map((p) => ({ id: p.id, l: loadProgram(p.source) }))
  const missing = loaded.find((p) => !p.l.ok)

  it('git: the scenario with the real git (fixed identities and dates, so the hashes repeat)', () => {
    const { git: _g, ...fresh } = recordGit()
    const { git: _c, ...committed } = GIT_RECORDING
    expect(fresh).toEqual(committed)
  }, 60_000)

  it.skipIf(Boolean(missing))('React 19: the four setups re-render the same components after setUser', async () => {
    const fresh = await recordRenders(loaded.map((p) => ({ id: p.id, code: (p.l as { text: string }).text })))
    expect(fresh).toEqual(STATE_RECORDING)
  }, 60_000)

  it('Chromium: the fragment’s accessibility tree and Tab order (skipped without the browser)', async () => {
    if (!(await chromiumReady())) return console.info('frontend: Chromium is not installed; the accessibility re-recording skipped')
    const { browser: _b, ...fresh } = await recordAx(AX_HTML)
    const { browser: _c, ...committed } = AX_RECORDING
    expect(fresh).toEqual(committed)
  }, 60_000)

  it('Module Federation: the shell and remotes in Chromium (skipped without VIZ_MF_DIR)', async () => {
    const dir = federationDir()
    if (!dir || !(await chromiumReady())) return console.info('frontend: no Module Federation harness (VIZ_MF_DIR); its re-recording skipped')
    const { browser: _b, ...fresh } = await recordFederation(dir)
    const { browser: _c, ...committed } = FEDERATION_RECORDING
    expect(fresh).toEqual(committed)
  }, 180_000)

  it('says why a re-recording skipped (no content checkout)', () => {
    if (missing && !missing.l.ok) console.info(`frontend: React re-recording skipped: ${skipNote(missing.l.missing)}`)
    expect(true).toBe(true)
  })
})

describe('context-render-causes (state-management)', () => {
  const R = STATE_RECORDING.runs
  it('the register: after setUser, one context and split contexts render App, Sidebar, Header; React.memo(Sidebar) renders App, Header', () => {
    expect(STATE_RECORDING.react.startsWith('19.')).toBe(true)
    expect(R['one-context'].afterSetUser).toEqual(['App', 'Sidebar', 'Header'])
    expect(R.split.afterSetUser).toEqual(['App', 'Sidebar', 'Header'])
    expect(R['split-memo'].afterSetUser).toEqual(['App', 'Header'])
    expect([R.split.userOwner, R['split-memo'].userOwner]).toEqual(['App', 'App'])
  })
  it('the triage’s correction: Fix 2’s two providers own the state, so only UserProvider and Header render', () => {
    expect(R.providers.userOwner).toBe('UserProvider')
    expect(R.providers.afterSetUser).toEqual(['UserProvider', 'Header'])
    expect(R.providers.mount).toEqual(['App', 'ThemeProvider', 'UserProvider', 'Sidebar', 'Header'])
  })
  it('the figure’s rule (parent or context) predicts exactly the recorded renders, in order', () => {
    for (const id of ['split', 'split-memo', 'providers'] as const) expect(contextPredictedRenders(id), id).toEqual(R[id].afterSetUser)
  })
  it('every drawn node carries its recorded state, and every carrying edge leads to a rendered node', () => {
    for (const p of panels('context-render-causes')) {
      const run = R[p.id as 'split']
      for (const n of p.nodes.filter((x) => x.shape === 'box')) expect(n.state === 'mark', `${p.id} ${n.id}`).toBe(run.afterSetUser.includes(n.id))
      for (const e of p.edges.filter((x) => x.mark)) {
        const to = p.nodes.find((n) => n.id === e.to)!
        expect(to.shape === 'pill' || run.afterSetUser.includes(to.id), `${p.id} ${e.id}`).toBe(true)
      }
      expect(p.edges.filter((e) => e.tag).map((e) => e.tag!.text)).toEqual(p.id === 'split-memo' ? ['memo'] : [])
    }
  })
  it('lies fail: no memo, a single AppProvider owner, or "split contexts stop Sidebar" disagree with the run', () => {
    const noMemo = CONTEXT_TREES['split-memo'].map((n) => ({ ...n, memo: undefined }))
    const lie1 = noMemo.filter((n) => !n.provider && renders(predictCauses(noMemo, 'App')[n.id])).map((n) => n.id)
    expect(lie1).not.toEqual(R['split-memo'].afterSetUser)
    // State owned by the user provider while App still creates the children: Sidebar would skip, which the run contradicts.
    const lie2 = predictCauses(CONTEXT_TREES.split, 'UserP')
    expect(Object.entries(lie2).filter(([, c]) => renders(c)).map(([id]) => id)).not.toEqual(R.split.afterSetUser)
    const lieRun = { ...R.split, afterSetUser: ['App', 'Header'] }
    const drawn = contextPanel('split', lieRun, { heading: 'x', notes: [] })
    expect(drawn.nodes.find((n) => n.id === 'Sidebar')!.data!.rendered).toBeUndefined()
    expect(contextPredictedRenders('split')).not.toEqual(lieRun.afterSetUser)
  })
})

describe('federation-react-singleton (micro-frontends)', () => {
  const S = FEDERATION_RECORDING.scenarios
  const get = (s: keyof FederationRecording['scenarios'], n: string) => S[s].containers.find((c) => c.name === n)
  it('the share scope holds 19.0.0 from shell and 18.3.1 from cart', () => {
    for (const s of ['singleton', 'strict', 'unshared'] as const) expect(S[s].scope).toEqual({ '19.0.0': 'shell', '18.3.1': 'cart' })
  })
  it('the answer: singleton, cart (^18.0.0) gets the shell’s 19.0.0 with a runtime warning, the same React object, and its hook works', () => {
    const cart = get('singleton', 'cart')!
    expect([cart.react, cart.from, cart.sameInstanceAsShell, cart.hook]).toEqual(['19.0.0', 'shell', true, 'hook ok'])
    expect(S.singleton.warnings).toEqual(['Unsatisfied version 19.0.0 from shell of shared singleton module react (required ^18.0.0)'])
    expect(get('singleton', 'products')!.from).toBe('shell')
  })
  it('strictVersion: true throws when cart loads (at runtime, the build passed)', () => {
    expect(get('strict', 'cart')).toBeUndefined()
    expect(S.strict.errors).toEqual(['cart: Unsatisfied version 19.0.0 from shell of shared singleton module react (required ^18.0.0)'])
  })
  it('not singleton: cart loads its own 18.3.1, a second React object, and useState fails under the shell’s react-dom', () => {
    const cart = get('unshared', 'cart')!
    expect([cart.react, cart.from, cart.sameInstanceAsShell]).toEqual(['18.3.1', 'cart', false])
    expect(cart.hook).toMatch(/useState/)
    expect(S.unshared.errors.some((e) => /Invalid hook call/.test(e))).toBe(true)
  })
  it('the drawing: one instance with singleton, two without; each container’s arrow ends on the copy it got', () => {
    const [a, b] = panels('federation-react-singleton')
    expect(a.nodes.filter((n) => n.id.startsWith('react-')).length).toBe(1)
    expect(b.nodes.filter((n) => n.id.startsWith('react-')).length).toBe(2)
    for (const [p, s] of [[a, S.singleton], [b, S.unshared]] as const)
      for (const e of p.edges) expect(p.nodes.find((n) => n.id === e.to)!.data!.from, e.id).toBe(s.containers.find((c) => c.name === e.from)!.from)
    expect(a.edges.filter((e) => e.tag).map((e) => e.from)).toEqual(['cart'])
  })
  it('lies fail: "cart falls back to its own 18" under singleton draws two copies; "the build fails" leaves no container loaded', () => {
    const lie = clone(S.singleton)
    lie.containers[2] = { ...lie.containers[2], react: '18.3.1', from: 'cart', sameInstanceAsShell: false }
    expect(federationPanel('singleton', lie, { heading: 'x', notes: [] }).nodes.filter((n) => n.id.startsWith('react-')).length).toBe(2)
    expect(S.strict.containers.map((c) => c.name)).toEqual(['shell', 'products'])
  })
})

describe('dom-vs-accessibility-tree (accessibility)', () => {
  const A = AX_RECORDING
  const dom = (sel: (d: AxRecording['dom'][number]) => boolean) => A.dom.find(sel)!
  const help = dom((d) => d.attrs.includes('id="help"'))
  const sort = dom((d) => d.attrs.includes('id="sort"'))
  it('aria-hidden takes the Help button out of the tree, not out of Tab; inert takes the link out of both', () => {
    expect(A.ax.some((n) => n.dom === help.id)).toBe(false)
    expect(A.tabOrder).toEqual([dom((d) => d.attrs.includes('id="search"')).id, help.id, sort.id])
    const sale = dom((d) => d.tag === 'a')
    expect(A.tabOrder.includes(sale.id) || A.ax.some((n) => n.dom === sale.id)).toBe(false)
    expect(A.ignored.find((i) => i.dom === sale.id)!.reasons).toEqual(['inertElement'])
  })
  it('role=none drops the table (and its rows) but keeps the cell’s text; ARIA overrides h2 to button', () => {
    const table = dom((d) => d.tag === 'table')
    expect(A.ignored.find((i) => i.dom === table.id)!.reasons).toEqual(['presentationalRole'])
    const td = dom((d) => d.tag === 'td')
    expect(A.ax.find((n) => n.dom === td.id)!.role).toBe('generic')
    expect(A.ax.some((n) => n.role === 'StaticText' && n.name === 'Free returns')).toBe(true)
    expect(A.ax.find((n) => n.dom === sort.id)).toMatchObject({ role: 'button', name: 'Sort' })
  })
  it('aria-labelledby names the region from the heading; text content names the button, the svg is pruned (aria-hidden)', () => {
    expect(A.ax.find((n) => n.role === 'region')!.name).toBe('Filters')
    expect(A.ax.find((n) => n.dom === dom((d) => d.attrs.includes('id="search"')).id)!.name).toBe('Search')
    expect(A.ignored.find((i) => i.dom === dom((d) => d.tag === 'svg').id)!.reasons).toEqual(['ariaHiddenElement'])
  })
  it('the drawing: struck rows are exactly the elements the tree leaves out; the marked tab badge is the hidden button; the marked AX row is the override', () => {
    const [d, a] = panels('dom-vs-accessibility-tree')
    expect(d.nodes.filter((n) => n.state === 'gone').map((n) => Number(n.data!.dom))).toEqual(A.dom.filter((x) => !A.ax.some((n) => n.dom === x.id)).map((x) => x.id))
    expect(d.labels.filter((l) => l.part === 'tab' && l.mark).map((l) => l.for)).toEqual([`dom-${help.id}`])
    expect(a.nodes.filter((n) => n.state === 'mark').map((n) => n.lines[0])).toEqual(['button "Sort"'])
    expect(a.nodes.length).toBe(axRows(A).length)
  })
  it('lies fail: a Help button out of Tab, or an exposed inert link, change the drawing', () => {
    const lie = clone(A)
    lie.tabOrder = lie.tabOrder.filter((t) => t !== help.id)
    expect(domPanel(lie, { heading: 'x', notes: [] }).labels.some((l) => l.part === 'tab' && l.mark)).toBe(false)
    const lie2 = clone(A)
    lie2.ax.push({ role: 'link', name: 'Sale', parent: 0, dom: dom((d) => d.tag === 'a').id })
    expect(domPanel(lie2, { heading: 'x', notes: [] }).nodes.filter((n) => n.state === 'gone').length).toBe(domPanel(A, { heading: 'x', notes: [] }).nodes.filter((n) => n.state === 'gone').length - 1)
    expect(axPanel(lie2, { heading: 'x', notes: [] }).nodes.length).toBe(axPanel(A, { heading: 'x', notes: [] }).nodes.length + 1)
  })
})

describe('merge-rebase-squash-revert-reset (git)', () => {
  const G = GIT_RECORDING
  const byLetter = (run: GitRecording['panels']['merge'], letter: string) => {
    const l = commitLetters(run)
    return run.commits.find((c) => l[c.hash] === letter)!
  }
  it('merge: M has two parents, C then E; main moves to M', () => {
    const r = G.panels.merge
    const m = byLetter(r, 'M')
    expect(m.parents).toEqual([byLetter(r, 'C').hash, byLetter(r, 'E').hash])
    expect(r.refs.main).toBe(m.hash)
  })
  it('rebase: D′ and E′ are new commits (new hashes) on C; D and E are unreferenced and still in the reflog', () => {
    const r = G.panels.rebase
    const [d, e, d2, e2] = ['D', 'E', "D'", "E'"].map((x) => byLetter(r, x))
    expect(d2.hash).not.toBe(d.hash)
    expect(e2.hash).not.toBe(e.hash)
    expect(d2.parents).toEqual([byLetter(r, 'C').hash])
    expect(r.refs.feature).toBe(e2.hash)
    expect(r.unreachable.sort()).toEqual([d.hash, e.hash].sort())
    expect(r.reflog.some((x) => x[0] === e.hash)).toBe(true)
  })
  it('squash: S has one parent, C; D and E are not in main’s history', () => {
    const r = G.panels.squash
    expect(byLetter(r, 'S').parents).toEqual([byLetter(r, 'C').hash])
    expect(r.refs.feature).toBe(byLetter(r, 'E').hash)
  })
  it('revert: C′ (Revert "C") on C; main and origin/main move together, both pushes accepted', () => {
    const r = G.panels.revert
    const c2 = byLetter(r, "C'")
    expect(c2.parents).toEqual([byLetter(r, 'C').hash])
    expect([r.refs.main, r.refs['origin/main']]).toEqual([c2.hash, c2.hash])
    expect(r.pushes.map((p) => p.status)).toEqual([0, 0])
  })
  it('reset --hard: main moves to B, C stays (origin/main, HEAD@{1}); a plain push is rejected, --force-with-lease accepted', () => {
    const r = G.panels.reset
    expect(r.refs.main).toBe(byLetter(r, 'B').hash)
    expect(r.refs['origin/main']).toBe(byLetter(r, 'C').hash)
    expect(r.reflog.find((x) => x[1] === 'HEAD@{1}')![0]).toBe(byLetter(r, 'C').hash)
    expect(r.pushes.map((p) => [p.args, p.status])).toEqual([['push origin main', 0], ['push origin main', 1], ['push --force-with-lease origin main', 0]])
    expect(r.pushes[1].error).toMatch(/non-fast-forward/)
  })
  it('the content’s fix: an unreachable reflog entry is kept at 29 days and pruned at 31 (gc.reflogExpireUnreachable, 30 days)', () => {
    expect(G.expiry).toEqual({ kept29: true, kept31: false })
  })
  it('the drawing: every edge a recorded parent, ghosts exactly the unreferenced commits, marked nodes exactly the new ones', () => {
    for (const p of panels('merge-rebase-squash-revert-reset')) {
      const run = G.panels[p.id as 'merge']
      for (const e of p.edges) expect(run.commits.find((c) => c.hash === e.from)!.parents, e.id).toContain(e.to)
      expect(p.nodes.filter((n) => n.state === 'ghost').map((n) => n.id).sort()).toEqual([...run.unreachable].sort())
      expect(p.nodes.filter((n) => n.state === 'mark').map((n) => n.id).sort()).toEqual(run.commits.filter((c) => !G.base.commits.some((b) => b.hash === c.hash) && p.nodes.some((n) => n.id === c.hash)).map((c) => c.hash).sort())
    }
  })
  it('lies fail: a rebase that keeps the hashes, or a reset that deletes C', () => {
    const lie = clone(G.panels.rebase)
    const l = commitLetters(lie)
    const d = lie.commits.find((c) => l[c.hash] === 'D')!
    const d2 = lie.commits.find((c) => l[c.hash] === "D'")!
    d2.hash = d.hash
    expect(new Set(lie.commits.map((c) => c.hash)).size).toBeLessThan(lie.commits.length)
    const lie2 = clone(G.panels.reset)
    lie2.commits = lie2.commits.filter((c) => c.subject !== 'C')
    expect(gitPanel('reset', lie2, G.base, { show: ['main', 'origin/main'], moved: 'main' }, { heading: 'x', notes: [] }).nodes.some((n) => n.lines[0] === 'C')).toBe(false)
  })
})

describe('frontend figures: layout', () => {
  it('every panel: nodes, text and tags inside, nothing over text, edges on their nodes and through none', () => {
    for (const preset of FRONTEND_PRESETS) for (const p of preset.data.panels as BoxesPanel[]) expect(checkBoxes(p), p.id).toEqual([])
  })
  it('the checker catches a label pushed off the panel and an edge cut short', () => {
    const p = clone(panels('context-render-causes')[0])
    p.labels[0].x = p.width + 10
    p.edges[0].points[p.edges[0].points.length - 1].y -= 6
    const out = checkBoxes(p)
    expect(out.some((x) => x.includes('leaves the panel'))).toBe(true)
    expect(out.some((x) => x.includes('does not end on'))).toBe(true)
  })
  it('figures show values, never code: no drawn text is a line of the practice answer’s blocks (with the checkout)', () => {
    const texts = FRONTEND_PRESETS.flatMap((p) => (p.data.panels as BoxesPanel[]).flatMap((x) => [x.heading, ...x.notes, ...x.nodes.flatMap((n) => n.lines), ...x.labels.map((l) => l.text)]))
    for (const p of RENDER_PROGRAMS) {
      const l = loadProgram(p.source)
      if (!l.ok) continue
      const lines = new Set(l.text.split('\n').map((x) => x.trim()).filter((x) => x.length >= 8))
      for (const t of texts) expect(lines.has(t.trim()), t).toBe(false)
    }
    for (const t of texts) expect(t.length, t).toBeLessThan(42)
  })
})
