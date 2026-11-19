import type { BlockRef, ProgramSource } from '../../../step-log/lesson-source'

/**
 * The wave 4D frontend figures' runs, by locator (the premium-code policy:
 * a practice answer is named by its locator and sha256, never its text).
 * Each recorder (`../truth/record-frontend.ts`) records values only.
 *
 * - State Management: which components a `setUser` re-renders, counted in
 *   real React 19 (react-dom 19 in jsdom) for four setups. Two are the
 *   practice answer's own blocks (the single `{ theme, user }` context, and
 *   Fix 2's two providers that own their state and render `children`); two
 *   are the visual's own code: split contexts whose state stays in App, and
 *   the same with `React.memo` on Sidebar. The harness supplies the
 *   consumers (Sidebar reads the theme, Header the user), counts each render
 *   and finds the user state's setter by its value.
 * - Micro-frontends: a webpack 5 Module Federation shell with two remotes
 *   (`../truth/federation/`), loaded in Chromium.
 * - Accessibility: the figure's own DOM fragment in Chromium, its full
 *   accessibility tree read over CDP and its Tab order pressed.
 * - Git: the figure's own scenario run with the real `git` in a scratch
 *   repository, every hash recorded.
 */

const FRONTEND = 'content/js-track/frontend-development/_lessons.json'
const CONTEXT_Q = { path: FRONTEND, lesson: '/state-management', problem: 'the-context-api-prop-drilling-fix-with-performance-caveats' } as const

/** The answer's single context whose value is `{ theme, user }` (its third jsx block). */
export const ONE_CONTEXT_BLOCK = { block: { ...CONTEXT_Q, lang: 'jsx', nth: 3 } as BlockRef, lessonSha256: '695bb027b1880c3761f2fe594089312b591ff98fc3bc3717771185b380e2c1d0' } as const
/** The answer's Fix 2: ThemeProvider and UserProvider own their state and render `children` (its fifth jsx block). */
export const FIX_2_BLOCK = { block: { ...CONTEXT_Q, lang: 'jsx', nth: 5 } as BlockRef, lessonSha256: '42da94ba0c3a0ddbb3ecf454e09cea9424894eb1657961f3c8215277788eea3b' } as const

/*
 * Harness parts. `__h` is the recorder's: `count(name, fn)` wraps a
 * component so each render is logged, `useState` is React's, noting which
 * component owns each piece of state. The consumers are the harness's:
 * Sidebar reads the theme and Header the user, as the answer's comments say.
 */
const PRELUDE = 'const { createContext, useContext } = React\nconst useState = __h.useState'
const counted = (names: readonly string[]) => names.map((n) => `${n} = __h.count('${n}', ${n})`).join('\n')

/** The visual's own code: split contexts, both pieces of state in App, optionally a memoized Sidebar. */
const appOwnsState = (memo: boolean) => `const ThemeContext = React.createContext('light')
const UserContext = React.createContext(null)
function Sidebar() {
  __h.rendered('Sidebar')
  return React.createElement('aside', null, useContext(ThemeContext))
}
function Header() {
  __h.rendered('Header')
  return React.createElement('header', null, useContext(UserContext).name)
}
${memo ? 'const SidebarSlot = React.memo(Sidebar)' : 'const SidebarSlot = Sidebar'}
function App() {
  __h.rendered('App')
  const [theme] = useState('light')
  const [user] = useState({ name: 'Alice' })
  return React.createElement(ThemeContext.Provider, { value: theme },
    React.createElement(UserContext.Provider, { value: user },
      React.createElement(SidebarSlot), React.createElement(Header)))
}
return App`

export type RenderProgram = {
  id: 'one-context' | 'split' | 'split-memo' | 'providers'
  /** The program as run (the JSX is compiled by esbuild before it runs). */
  source: ProgramSource
}

export const RENDER_PROGRAMS: readonly RenderProgram[] = [
  {
    id: 'one-context',
    source: [
      { code: PRELUDE },
      ONE_CONTEXT_BLOCK,
      {
        code: `function Sidebar() {
  __h.rendered('Sidebar')
  return React.createElement('aside', null, useContext(ThemeContext).theme)
}
function Header() {
  __h.rendered('Header')
  return React.createElement('header', null, useContext(ThemeContext).user.name)
}
${counted(['App'])}
return App`,
      },
    ],
  },
  { id: 'split', source: [{ code: PRELUDE }, { code: appOwnsState(false) }] },
  { id: 'split-memo', source: [{ code: PRELUDE }, { code: appOwnsState(true) }] },
  {
    id: 'providers',
    source: [
      { code: PRELUDE },
      FIX_2_BLOCK,
      {
        code: `function Sidebar() {
  __h.rendered('Sidebar')
  return React.createElement('aside', null, useContext(ThemeContext))
}
function Header() {
  __h.rendered('Header')
  return React.createElement('header', null, useContext(UserContext).name)
}
${counted(['App', 'ThemeProvider', 'UserProvider'])}
return App`,
      },
    ],
  },
]

/** One setup's run: the components the first render rendered, which component owns the user state, and the components `setUser` re-rendered, in render order. */
export type RenderRun = { mount: string[]; userOwner: string; afterSetUser: string[]; text: string }
export type RenderRecording = { generator: string; react: string; reactDom: string; sha256: Record<string, string>; runs: Record<RenderProgram['id'], RenderRun> }

// ---------------------------------------------------------------------------
// Git: the register's scenario, with real commands.
// ---------------------------------------------------------------------------

/** One step of the scratch repository's script: `git` arguments, or a file to write and commit. */
export type GitStep = { git: readonly string[]; expectFail?: true } | { commit: string }

/**
 * Start: main A-B-C, feature from B with D-E. Each panel restarts from
 * that state (`base`), then runs its own steps. The fourth panel works on
 * main A-B-C pushed to a bare remote: revert C, or reset --hard to B and
 * try to push.
 */
export const GIT_BASE: readonly GitStep[] = [
  { commit: 'A' },
  { commit: 'B' },
  { git: ['branch', 'feature'] },
  { commit: 'C' },
  { git: ['switch', '-q', 'feature'] },
  { commit: 'D' },
  { commit: 'E' },
  { git: ['switch', '-q', 'main'] },
]

export const GIT_PANELS: Record<'merge' | 'rebase' | 'squash' | 'revert' | 'reset', readonly GitStep[]> = {
  merge: [{ git: ['merge', '-q', '--no-ff', 'feature', '-m', 'M'] }],
  rebase: [{ git: ['switch', '-q', 'feature'] }, { git: ['rebase', '-q', 'main'] }],
  squash: [{ git: ['merge', '-q', '--squash', 'feature'] }, { git: ['commit', '-q', '-m', 'S'] }],
  revert: [{ git: ['push', '-q', 'origin', 'main'] }, { git: ['revert', '--no-edit', 'HEAD'] }, { git: ['push', '-q', 'origin', 'main'] }],
  reset: [{ git: ['push', '-q', 'origin', 'main'] }, { git: ['reset', '-q', '--hard', 'HEAD~1'] }, { git: ['push', '-q', 'origin', 'main'], expectFail: true }],
}

/** Run after a panel's snapshot (its pushes are recorded, the drawing is the state before them). */
export const GIT_THEN: Partial<Record<keyof typeof GIT_PANELS, readonly GitStep[]>> = {
  reset: [{ git: ['push', '-q', '--force-with-lease', 'origin', 'main'] }],
}

export type GitCommit = { hash: string; parents: string[]; subject: string }
export type GitPanelRun = {
  commits: GitCommit[]
  /** Each ref and the commit it names (short hashes). */
  refs: Record<string, string>
  /** `git reflog` of HEAD, newest first: [short hash, selector, message]. */
  reflog: [string, string, string][]
  /** Commits not reachable from any branch, tag or remote ref (but still in the object store). */
  unreachable: string[]
  /** For each step that ran `git push` (those after the snapshot included): its exit status and git's rejection line. */
  pushes: { args: string; status: number; error?: string }[]
}
/** Reflog expiry with git's defaults: is the entry of a commit no branch reaches, dated 29 or 31 days back, kept by `git reflog expire --all`? */
export type GitExpiry = { kept29: boolean; kept31: boolean }
export type GitRecording = { generator: string; git: string; sha256: string; base: GitPanelRun; panels: Record<keyof typeof GIT_PANELS, GitPanelRun>; expiry: GitExpiry }

// ---------------------------------------------------------------------------
// Accessibility: the figure's own fragment.
// ---------------------------------------------------------------------------

/**
 * The register's fragment, made coherent: an open dialog whose page behind
 * it (`main`) is inert holds the section, its heading, the layout table and
 * the heading turned into a button (in `main` they would all be pruned).
 */
export const AX_HTML = `<header>
  <button id="search"><svg aria-hidden="true" width="12" height="12"></svg>Search</button>
  <button id="help" aria-hidden="true">Help</button>
</header>
<main inert>
  <a id="sale" href="#sale">Sale</a>
</main>
<dialog open>
  <section id="filters" aria-labelledby="filters-h">
    <h2 id="filters-h">Filters</h2>
    <table role="none"><tbody><tr><td>Free returns</td></tr></tbody></table>
    <h2 id="sort" role="button" tabindex="0">Sort</h2>
  </section>
</dialog>`

/** A DOM element of the fragment, in document order. */
export type AxDomNode = { id: number; parent: number | null; tag: string; attrs: string[]; text?: string }
/** An accessibility-tree node Chromium exposes (ignored nodes dropped), with the DOM node it comes from. */
export type AxNode = { role: string; name: string; parent: number | null; dom: number | null; level?: number }
/** A DOM element Chromium leaves out of the tree, and why (CDP `ignoredReasons`). */
export type AxIgnored = { dom: number; reasons: string[] }
export type AxRecording = {
  generator: string
  browser: string
  sha256: string
  dom: AxDomNode[]
  ax: AxNode[]
  ignored: AxIgnored[]
  /** The elements Tab focuses from the top of the page, in order (DOM node ids). */
  tabOrder: number[]
  /** Playwright's aria snapshot of the body. */
  aria: string
}

// ---------------------------------------------------------------------------
// Micro-frontends: Module Federation (webpack 5), see ../truth/federation/.
// ---------------------------------------------------------------------------

/** One container's view at runtime: the React it got, from which container, and whether a hook worked. */
export type FederationContainer = { name: string; requiredVersion: string; provides: string; react: string; from: string; sameInstanceAsShell: boolean; hook: string }
export type FederationScenario = {
  /** The share scope's registered react versions, by the container that registered each. */
  scope: Record<string, string>
  containers: FederationContainer[]
  warnings: string[]
  errors: string[]
}
export type FederationRecording = {
  generator: string
  /** sha256 of the apps' sources and each scenario's shared config. */
  sha256: string
  webpack: string
  browser: string
  scenarios: Record<'singleton' | 'strict' | 'unshared', FederationScenario>
}
