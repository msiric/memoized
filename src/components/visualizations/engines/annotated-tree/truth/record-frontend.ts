/**
 * The wave 4D frontend figures' recorders (spec P6, values only). Each runs
 * the real thing and records what it did:
 *
 * - `recordRenders`: React 19 render logs (`render-run.ts` in a fresh Node
 *   process, the programs' JSX compiled by esbuild);
 * - `recordGit`: the scenario with the real `git` in a scratch repository
 *   (fixed identities and dates, so every hash is reproducible);
 * - `recordAx`: the fragment in Chromium (Playwright): the DOM, the full
 *   accessibility tree over CDP (`Accessibility.getFullAXTree`), the Tab
 *   order, and Playwright's aria snapshot;
 * - Module Federation lives in `./federation/` (it needs webpack).
 *
 * Node-only: tests and `yarn viz:frontend` import this, the browser never does.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { sha256 } from '../../../step-log/truth'
import { GIT_BASE, GIT_PANELS, GIT_THEN, type AxRecording, type GitPanelRun, type GitRecording, type GitStep, type RenderRecording } from '../programs/frontend'

export const FRONTEND_GENERATOR = 'frontend@1'

// ---------------------------------------------------------------------------
// React renders
// ---------------------------------------------------------------------------

export async function recordRenders(programs: readonly { id: string; code: string }[]): Promise<RenderRecording> {
  const { transformSync } = await import('esbuild')
  const compiled = programs.map((p) => ({
    id: p.id,
    code: transformSync(p.code, { loader: 'jsx', jsx: 'transform', jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment' }).code,
  }))
  const run = spawnSync(process.execPath, ['--import', 'tsx', path.join(__dirname, 'render-run.ts')], {
    input: JSON.stringify({ programs: compiled }),
    encoding: 'utf8',
    env: { ...process.env, NODE_ENV: 'development' },
  })
  if (run.status !== 0) throw new Error(`render-run failed:\n${run.stderr}`)
  const out = JSON.parse(run.stdout) as Pick<RenderRecording, 'react' | 'reactDom' | 'runs'>
  return {
    generator: FRONTEND_GENERATOR,
    react: out.react,
    reactDom: out.reactDom,
    sha256: Object.fromEntries(programs.map((p) => [p.id, sha256(p.code)])),
    runs: out.runs,
  }
}

// ---------------------------------------------------------------------------
// Git
// ---------------------------------------------------------------------------

const T0 = 1_700_000_000
const IDENTITY = { GIT_AUTHOR_NAME: 'Dev', GIT_AUTHOR_EMAIL: 'dev@example.com', GIT_COMMITTER_NAME: 'Dev', GIT_COMMITTER_EMAIL: 'dev@example.com' }

/** A scratch repository that ignores the machine's git config, with a clock that advances one minute per command. */
function scratch(dir: string) {
  let t = T0
  const env = (at = t) => ({
    ...process.env,
    ...IDENTITY,
    GIT_CONFIG_GLOBAL: os.devNull,
    GIT_CONFIG_SYSTEM: os.devNull,
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_AUTHOR_DATE: `@${at} +0000`,
    GIT_COMMITTER_DATE: `@${at} +0000`,
    GIT_EDITOR: 'true',
  })
  const git = (args: readonly string[], cwd = dir, at?: number) => {
    t += 60
    return spawnSync('git', args, { cwd, env: env(at ?? t), encoding: 'utf8' })
  }
  const ok = (args: readonly string[], cwd = dir, at?: number) => {
    const r = git(args, cwd, at)
    if (r.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${r.stderr}`)
    return r.stdout
  }
  return { git, ok }
}

function runSteps(dir: string, steps: readonly GitStep[], s: ReturnType<typeof scratch>, pushes: GitPanelRun['pushes']) {
  for (const step of steps) {
    if ('commit' in step) {
      fs.writeFileSync(path.join(dir, `${step.commit}.txt`), `${step.commit}\n`)
      s.ok(['add', `${step.commit}.txt`])
      s.ok(['commit', '-q', '-m', step.commit])
      continue
    }
    const r = s.git(step.git)
    if (step.git[0] === 'push') pushes.push({ args: step.git.filter((a) => a !== '-q').join(' '), status: r.status ?? -1, ...(r.status ? { error: r.stderr.split('\n').find((l) => /rejected|error/.test(l))?.trim() } : {}) })
    if ((r.status !== 0) !== Boolean(step.expectFail)) throw new Error(`git ${step.git.join(' ')}: status ${r.status} ${r.stderr}`)
  }
}

function snapshot(dir: string, s: ReturnType<typeof scratch>, pushes: GitPanelRun['pushes']): GitPanelRun {
  const short = (h: string) => h.slice(0, 7)
  // Every commit in the object store (reachable or not), oldest first by date.
  const all = s
    .ok(['cat-file', '--batch-all-objects', '--batch-check=%(objectname) %(objecttype)'])
    .split('\n')
    .filter((l) => l.endsWith(' commit'))
    .map((l) => l.split(' ')[0])
  const commits = all
    .map((h) => {
      const [hash, parents, date, subject] = s.ok(['show', '-s', '--format=%H%x00%P%x00%ct%x00%s', h]).trim().split('\0')
      return { hash: short(hash), parents: parents ? parents.split(' ').map(short) : [], subject, date: Number(date) }
    })
    .sort((a, b) => a.date - b.date || a.subject.localeCompare(b.subject))
    .map(({ date: _date, ...c }) => c)
  const refs = Object.fromEntries(
    s
      .ok(['for-each-ref', '--format=%(refname:short) %(objectname:short=7)'])
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((l) => l.split(' ') as [string, string]),
  )
  const head = s.git(['symbolic-ref', '--short', 'HEAD']).stdout.trim()
  refs.HEAD = head ? `-> ${head}` : short(s.ok(['rev-parse', 'HEAD']).trim())
  const reflog = s
    .ok(['reflog', '--format=%h%x00%gd%x00%gs', 'HEAD'])
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((l) => l.split('\0') as [string, string, string])
  const reachable = new Set(
    s
      .ok(['rev-list', '--branches', '--remotes', '--tags'])
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(short),
  )
  return { commits, refs, reflog, unreachable: commits.map((c) => c.hash).filter((h) => !reachable.has(h)), pushes: [...pushes] }
}

function fresh(root: string, name: string) {
  const dir = path.join(root, name)
  const remote = path.join(root, `${name}.git`)
  fs.mkdirSync(dir)
  const s = scratch(dir)
  s.ok(['init', '-q', '--bare', '-b', 'main', remote], root)
  s.ok(['init', '-q', '-b', 'main', dir], root)
  s.ok(['remote', 'add', 'origin', remote])
  return { dir, s }
}

/** Reflog expiry with git's defaults: is the entry of a commit no branch reaches any more kept after 29 days, and after 31? */
function expiry(root: string): GitRecording['expiry'] {
  const now = Math.floor(Date.now() / 1000)
  const day = 86_400
  const probe = (name: string, daysAgo: number) => {
    const dir = path.join(root, name)
    fs.mkdirSync(dir)
    const s = scratch(dir)
    const at = now - daysAgo * day
    s.ok(['init', '-q', '-b', 'main', dir], root, at)
    fs.writeFileSync(path.join(dir, 'a.txt'), 'a\n')
    s.ok(['add', 'a.txt'], dir, at)
    s.ok(['commit', '-q', '-m', 'A'], dir, at)
    fs.writeFileSync(path.join(dir, 'x.txt'), 'x\n')
    s.ok(['add', 'x.txt'], dir, at)
    s.ok(['commit', '-q', '-m', 'X'], dir, at)
    const x = s.ok(['rev-parse', '--short=7', 'HEAD']).trim()
    // Reset away from X (the reset's own entry is dated now, so only X's entry is old).
    s.ok(['reset', '-q', '--hard', 'HEAD~1'], dir, now)
    s.ok(['reflog', 'expire', '--all'], dir, now)
    return s.ok(['reflog', '--format=%h %gs', 'HEAD']).split('\n').some((l) => l.startsWith(`${x} commit:`))
  }
  return { kept29: probe('u29', 29), kept31: probe('u31', 31) }
}

export function recordGit(): GitRecording {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'viz-git-'))
  try {
    const version = execFileSync('git', ['--version'], { encoding: 'utf8' }).trim()
    const b = fresh(root, 'base')
    runSteps(b.dir, GIT_BASE, b.s, [])
    const base = snapshot(b.dir, b.s, [])
    const panels = {} as GitRecording['panels']
    for (const [id, steps] of Object.entries(GIT_PANELS) as [keyof GitRecording['panels'], readonly GitStep[]][]) {
      const { dir, s } = fresh(root, id)
      const pushes: GitPanelRun['pushes'] = []
      runSteps(dir, GIT_BASE, s, pushes)
      runSteps(dir, steps, s, pushes)
      const run = snapshot(dir, s, pushes)
      runSteps(dir, GIT_THEN[id] ?? [], s, pushes)
      panels[id] = { ...run, pushes }
    }
    return { generator: FRONTEND_GENERATOR, git: version, sha256: sha256(JSON.stringify({ GIT_BASE, GIT_PANELS, GIT_THEN })), base, panels, expiry: expiry(root) }
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
}

// ---------------------------------------------------------------------------
// Accessibility tree (Chromium)
// ---------------------------------------------------------------------------

type CdpAxNode = {
  nodeId: string
  ignored: boolean
  ignoredReasons?: { name: string; value?: { value?: unknown } }[]
  role?: { value?: string }
  name?: { value?: string }
  properties?: { name: string; value: { value?: unknown } }[]
  parentId?: string
  childIds?: string[]
  backendDOMNodeId?: number
}

export async function recordAx(html: string): Promise<AxRecording> {
  const { chromium } = await import('playwright')
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await page.setContent(`<!doctype html><html lang="en"><head><title>Fragment</title></head><body>${html}</body></html>`)
    // Number every element under body in document order (the ids the recording uses).
    const dom = (await page.evaluate(`(() => {
      const els = [...document.body.querySelectorAll('*')]
      return els.map((el, i) => {
        el.setAttribute('data-ax-id', String(i))
        const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).filter(Boolean).join(' ')
        return {
          id: i,
          parent: el.parentElement === document.body ? null : els.indexOf(el.parentElement),
          tag: el.localName,
          attrs: [...el.attributes].filter((a) => a.name !== 'data-ax-id' && !['width', 'height', 'cx', 'cy', 'r', 'href'].includes(a.name)).map((a) => (a.value === '' ? a.name : a.name + '="' + a.value + '"')),
          ...(own ? { text: own } : {}),
        }
      })
    })()`)) as AxRecording['dom']
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('DOM.getDocument', { depth: -1 })
    const { nodes } = (await cdp.send('Accessibility.getFullAXTree')) as { nodes: CdpAxNode[] }
    // Map backend DOM node ids to the recording's ids.
    const backendToId = new Map<number, number>()
    for (const d of dom) {
      const { nodeIds } = (await cdp.send('DOM.querySelectorAll', { nodeId: ((await cdp.send('DOM.getDocument', { depth: 0 })) as { root: { nodeId: number } }).root.nodeId, selector: `[data-ax-id="${d.id}"]` })) as { nodeIds: number[] }
      const { node } = (await cdp.send('DOM.describeNode', { nodeId: nodeIds[0] })) as { node: { backendNodeId: number } }
      backendToId.set(node.backendNodeId, d.id)
    }
    const byId = new Map(nodes.map((n) => [n.nodeId, n]))
    // The exposed tree: ignored nodes are skipped, their children hoisted to the nearest exposed ancestor.
    const ax: AxRecording['ax'] = []
    const walk = (n: CdpAxNode, parent: number | null) => {
      let here = parent
      if (!n.ignored) {
        const level = n.properties?.find((p) => p.name === 'level')?.value.value
        ax.push({
          role: n.role?.value ?? '',
          name: n.name?.value ?? '',
          parent,
          dom: n.backendDOMNodeId !== undefined ? (backendToId.get(n.backendDOMNodeId) ?? null) : null,
          ...(typeof level === 'number' ? { level } : {}),
        })
        here = ax.length - 1
      }
      for (const c of n.childIds ?? []) {
        const child = byId.get(c)
        if (child) walk(child, here)
      }
    }
    walk(nodes.find((n) => !n.parentId)!, null)
    // Why each element the exposed tree does not hold is left out: its own node (a pruned subtree such as aria-hidden or inert is not in the full tree at all).
    const exposed = new Set(ax.map((n) => n.dom))
    const ignored: AxRecording['ignored'] = []
    for (const [backendNodeId, id] of [...backendToId].sort((a, b) => a[1] - b[1])) {
      if (exposed.has(id)) continue
      const { nodes: own } = (await cdp.send('Accessibility.getPartialAXTree', { backendNodeId, fetchRelatives: false })) as { nodes: CdpAxNode[] }
      const n = own.find((x) => x.backendDOMNodeId === backendNodeId)
      ignored.push({ dom: id, reasons: (n?.ignoredReasons ?? []).filter((r) => r.value?.value !== false).map((r) => r.name) })
    }
    // Tab from the top of the page until focus comes back around.
    const tabOrder: number[] = []
    await page.evaluate('document.activeElement && document.activeElement.blur()')
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab')
      const id = (await page.evaluate('document.activeElement && document.activeElement.getAttribute("data-ax-id")')) as string | null
      if (id === null) break
      if (tabOrder.includes(Number(id))) break
      tabOrder.push(Number(id))
    }
    const aria = await page.locator('body').ariaSnapshot()
    return { generator: FRONTEND_GENERATOR, browser: `chromium@${browser.version()}`, sha256: sha256(html), dom, ax, ignored, tabOrder, aria }
  } finally {
    await browser.close()
  }
}
