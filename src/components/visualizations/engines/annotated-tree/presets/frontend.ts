import type { HashedProgram, StaticPreset } from '../../../shell/static-types'
import { axPanel, contextPanel, domPanel, federationPanel, gitPanel, predictCauses, renders, CONTEXT_TREES } from '../frontend'
import type { TreeData } from '../model'
import type { AxRecording, FederationRecording, GitRecording, RenderRecording } from '../programs/frontend'
import axRec from '../recordings/accessibility.json'
import gitRec from '../recordings/git.json'
import mfRec from '../recordings/micro-frontends.json'
import stateRec from '../recordings/state-management.json'

/**
 * The wave 4D presets (R4 rows state-management, micro-frontends,
 * accessibility, git): four `boxes` figures, each built from a committed
 * recording (values only). A preset adds the title, the caption, the panel
 * headings and note lines whose values are read from the recording.
 */

export const STATE_RECORDING = stateRec as unknown as RenderRecording
export const FEDERATION_RECORDING = mfRec as unknown as FederationRecording
export const AX_RECORDING = axRec as unknown as AxRecording
export const GIT_RECORDING = gitRec as unknown as GitRecording

const major = (v: string) => v.split('@')[1]?.split('.')[0] ?? v
const list = (xs: readonly string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)

// ---------------------------------------------------------------------------

const rendered = (id: 'split' | 'split-memo' | 'providers') => STATE_RECORDING.runs[id].afterSetUser
const program = (id: string, observed: string[]): HashedProgram => ({ id, runtime: `React@${STATE_RECORDING.react}`, sha256: STATE_RECORDING.sha256[id], observed })

export const contextRenderCauses: StaticPreset<TreeData, HashedProgram> = {
  id: 'context-render-causes',
  label: 'context renders',
  title: 'setUser: what re-renders and why',
  caption: 'A component renders when its parent renders or a context it reads changes. Splitting contexts removes only the second cause.',
  programs: (['one-context', 'split', 'split-memo', 'providers'] as const).map((id) => program(id, STATE_RECORDING.runs[id].afterSetUser)),
  claims: [],
  data: {
    panels: [
      contextPanel('split', STATE_RECORDING.runs.split, {
        heading: '1. Split contexts, state in App',
        notes: [`Renders: ${list(rendered('split'))}.`, 'Sidebar renders: App, its parent, did.'],
      }),
      contextPanel('split-memo', STATE_RECORDING.runs['split-memo'], {
        heading: '2. The same, React.memo(Sidebar)',
        notes: [`Renders: ${list(rendered('split-memo'))}.`, 'memo: Sidebar has no props to change.'],
      }),
      contextPanel('providers', STATE_RECORDING.runs.providers, {
        heading: '3. Providers own the state (Fix 2)',
        notes: [`Renders: ${list(rendered('providers'))}.`, 'App did not render: its children are', 'the same elements, so Sidebar skips.'],
      }),
    ],
  },
}

/** The causes each panel draws, by setup (the truth test compares them with the recording). */
export const CONTEXT_CAUSES = Object.fromEntries((['split', 'split-memo', 'providers'] as const).map((id) => [id, predictCauses(CONTEXT_TREES[id], STATE_RECORDING.runs[id].userOwner)]))
export const contextPredictedRenders = (id: 'split' | 'split-memo' | 'providers') =>
  CONTEXT_TREES[id].filter((n) => !n.provider && renders(CONTEXT_CAUSES[id][n.id])).map((n) => n.id)

// ---------------------------------------------------------------------------

const S = FEDERATION_RECORDING.scenarios
const warning = S.singleton.warnings[0] ?? ''
const unsatisfied = /Unsatisfied version (\S+) from (\S+) of shared singleton module react \(required (\S+)\)/.exec(warning)
const thrown = S.strict.errors.find((e) => e.startsWith('cart: ')) ?? ''
const cartUnshared = S.unshared.containers.find((c) => c.name === 'cart')
const fedRuntime = `Chromium@${major(FEDERATION_RECORDING.browser)}`
const fedProgram = (id: keyof FederationRecording['scenarios']): HashedProgram => ({
  id: `federation-${id}`,
  runtime: fedRuntime,
  sha256: FEDERATION_RECORDING.sha256,
  observed: [...S[id].containers.map((c) => `${c.name} gets react ${c.react} from ${c.from}`), ...S[id].warnings.map((w) => `warning: ${w}`), ...S[id].errors.filter((e) => e.startsWith('cart: ')).map((e) => `throws: ${e.slice(6)}`)],
})

export const federationReactSingleton: StaticPreset<TreeData, HashedProgram> = {
  id: 'federation-react-singleton',
  label: 'federation react',
  title: 'Module Federation: one React or two',
  caption: 'Singleton: every container gets one React, and a version mismatch only warns at runtime. Unshared: cart loads its own React and hooks fail.',
  programs: (['singleton', 'strict', 'unshared'] as const).map(fedProgram),
  claims: [],
  data: {
    panels: [
      federationPanel('singleton', S.singleton, {
        heading: 'A. react shared, singleton: true',
        notes: unsatisfied
          ? [`cart warns: Unsatisfied version ${unsatisfied[1]}`, `(required ${unsatisfied[3]}), runs on ${unsatisfied[1]}.`, thrown ? 'strictVersion: true: cart throws.' : 'strictVersion: true: cart loads.']
          : ['No warning was recorded.'],
      }),
      federationPanel('unshared', S.unshared, {
        heading: 'B. cart: singleton: false',
        notes: cartUnshared
          ? [`cart gets its own react ${cartUnshared.react}, a`, `${cartUnshared.sameInstanceAsShell ? 'shared' : 'second'} React. Under the shell's`, /Invalid hook call/.test(S.unshared.errors.join(' ')) ? 'react-dom its useState fails:' : `react-dom its useState: ${cartUnshared.hook}.`, ...(/Invalid hook call/.test(S.unshared.errors.join(' ')) ? ['Invalid hook call.'] : [])]
          : ['cart did not load.'],
      }),
    ],
  },
}

// ---------------------------------------------------------------------------

const AX = AX_RECORDING
const tabbed = AX.tabOrder.map((id) => AX.dom.find((d) => d.id === id)!)
const hiddenTab = tabbed.findIndex((d) => !AX.ax.some((n) => n.dom === d.id))

export const domAccessibilityTree: StaticPreset<TreeData, HashedProgram> = {
  id: 'dom-vs-accessibility-tree',
  label: 'accessibility tree',
  title: 'The DOM and its accessibility tree',
  caption: 'The accessibility tree is built from the DOM: ARIA names, overrides and prunes nodes, but aria-hidden does not take a button out of Tab.',
  programs: [
    {
      id: 'accessibility-tree',
      runtime: `Chromium@${major(AX.browser)}`,
      sha256: AX.sha256,
      observed: [`Tab order: ${tabbed.map((d) => (d.text ? `${d.tag} "${d.text}"` : d.tag)).join(', ')}`],
    },
  ],
  claims: [],
  data: {
    panels: [
      domPanel(AX, {
        heading: 'DOM',
        notes: ['Struck: left out. 1, 2, 3: Tab order.', hiddenTab >= 0 ? `${tabbed[hiddenTab].text}: out of the tree, still Tab ${hiddenTab + 1}.` : 'Every Tab stop is in the tree.'],
      }),
      axPanel(AX, {
        heading: 'Accessibility tree (Chromium)',
        notes: ['Right: the DOM element of each node.', 'Marked: a role ARIA overrode.'],
      }),
    ],
  },
}

// ---------------------------------------------------------------------------

const G = GIT_RECORDING
const P = G.panels
const reset = P.reset
const rejected = reset.pushes.find((p) => p.status !== 0)
const leased = reset.pushes.find((p) => p.args.includes('--force-with-lease'))
const gitProgram = (id: keyof GitRecording['panels']): HashedProgram => ({
  id: `git-${id}`,
  runtime: G.git.replace(/^git version /, 'git@'),
  sha256: G.sha256,
  observed: P[id].pushes.map((p) => `git ${p.args}: ${p.status ? 'rejected' : 'accepted'}`),
})

export const gitHistoryOperations: StaticPreset<TreeData, HashedProgram> = {
  id: 'merge-rebase-squash-revert-reset',
  label: 'git history',
  title: 'Merge, rebase, squash, revert, reset',
  caption: 'Merge and squash add a commit; rebase copies commits with new hashes; revert adds an inverse commit; reset moves the branch back.',
  programs: (['merge', 'rebase', 'squash', 'revert', 'reset'] as const).map(gitProgram),
  claims: [],
  data: {
    panels: [
      gitPanel('merge', P.merge, G.base, { show: ['main', 'feature'], moved: 'main' }, { heading: '1. git merge feature (on main)', notes: ['M has two parents: C and E.'] }),
      gitPanel('rebase', P.rebase, G.base, { show: ['main', 'feature'], moved: 'feature' }, { heading: '2. git rebase main (on feature)', notes: ["D' and E': new commits, new hashes.", 'D and E: unreferenced, in the reflog.'] }),
      gitPanel('squash', P.squash, G.base, { show: ['main', 'feature'], moved: 'main' }, { heading: '3. merge --squash feature (on main)', notes: ['S: one parent, C; it holds D and E.', "D and E are not in main's history."] }),
      gitPanel('revert', P.revert, G.base, { show: ['main', 'origin/main'], moved: 'main' }, { heading: '4. git revert HEAD, then push', notes: ["C' undoes C; the push is accepted."] }),
      gitPanel(
        'reset',
        reset,
        G.base,
        { show: ['main', 'origin/main'], moved: 'main', reflog: 'HEAD@{1}' },
        {
          heading: '5. git reset --hard HEAD~1',
          notes: [
            'main moves back to B; C is kept.',
            rejected ? 'git push: rejected (non-fast-forward).' : 'git push: accepted.',
            leased && leased.status === 0 ? 'push --force-with-lease: accepted.' : 'push --force-with-lease: rejected.',
            G.expiry.kept29 && !G.expiry.kept31 ? 'Unreachable in the reflog: 30 days.' : 'Reflog expiry: not the 30-day default.',
          ],
        },
      ),
    ],
  },
}

export const FRONTEND_PRESETS = [contextRenderCauses, federationReactSingleton, domAccessibilityTree, gitHistoryOperations]
