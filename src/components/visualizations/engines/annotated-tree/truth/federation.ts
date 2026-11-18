/**
 * The Module Federation recorder (Micro-frontends): a webpack 5 shell and
 * two remotes, built with `ModuleFederationPlugin` and loaded in Chromium.
 *
 * The apps are the figure's own code (below). The shell and products
 * install react@19.0.0, cart installs react@18.3.1, each in its own folder
 * of a harness directory that also holds webpack 5, so every container
 * registers the React it was built with. `requiredVersion` is the
 * practice answer's: ^19.0.0 for shell and products, ^18.0.0 for cart.
 * Three scenarios differ only in cart's `shared.react`: singleton (as the
 * answer), singleton with `strictVersion: true`, and not singleton.
 *
 * The shell loads products, then cart, and records for each container the
 * React version its module got, which container's copy that is (the share
 * scope entry marked loaded), whether it is the shell's React object, and
 * whether a component calling `useState` from that copy renders under the
 * shell's react-dom; plus the share scope's registered versions and every
 * console warning and error.
 *
 * The harness directory (`VIZ_MF_DIR`, prepared once: see
 * `prepareFederationHarness`) is outside the repo: webpack and the two
 * React majors are not app dependencies. Without it the recorder and the
 * truth test skip, saying so.
 *
 * Node-only.
 */
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import type { FederationRecording, FederationScenario } from '../programs/frontend'
import { sha256 } from '../../../step-log/truth'
import { FRONTEND_GENERATOR } from './record-frontend'

export const FEDERATION_APPS = { shell: { react: '19.0.0', required: '^19.0.0' }, products: { react: '19.0.0', required: '^19.0.0' }, cart: { react: '18.3.1', required: '^18.0.0' } } as const
type App = keyof typeof FEDERATION_APPS
type Scenario = keyof FederationRecording['scenarios']
const CART_SHARED: Record<Scenario, { singleton: boolean; strictVersion?: boolean }> = {
  singleton: { singleton: true },
  strict: { singleton: true, strictVersion: true },
  unshared: { singleton: false },
}

/** The harness directory, if it is prepared. */
export function federationDir(): string | null {
  const dir = process.env.VIZ_MF_DIR
  if (!dir) return null
  const ok = fs.existsSync(path.join(dir, 'node_modules', 'webpack')) && (Object.keys(FEDERATION_APPS) as App[]).every((a) => fs.existsSync(path.join(dir, a, 'node_modules', 'react', 'package.json')))
  return ok ? dir : null
}

/** The install commands that prepare a harness directory (run once, by hand: they fetch packages). */
export const prepareFederationHarness = (dir: string) =>
  [
    `mkdir -p ${dir}/shell ${dir}/products ${dir}/cart && cd ${dir} && npm init -y && npm i --ignore-scripts webpack@5`,
    ...(Object.entries(FEDERATION_APPS) as [App, (typeof FEDERATION_APPS)[App]][]).map(([a, v]) => `cd ${dir}/${a} && npm init -y && npm i --ignore-scripts react@${v.react} react-dom@${v.react}`),
  ].join('\n')

const REMOTE_ENTRY = 'remoteEntry.js'

const WIDGET = `import React from 'react'
export function info() {
  return { react: React.version, same: React === window.__shellReact }
}
export function Widget() {
  const [text] = React.useState('hook ok')
  return React.createElement('span', null, text)
}
`

/** How long the page waits for a render to commit or fail before it reads the result (the harness's, not a visual's). */
const SETTLE_MS = 50

const BOOTSTRAP = `import React from 'react'
import { createRoot } from 'react-dom/client'
window.__shellReact = React
const scope = () => __webpack_share_scopes__.default.react
const fromOf = (version) => {
  const e = scope()[version]
  return e ? e.from : ''
}
function hook(Widget) {
  return new Promise((resolve) => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    let error = ''
    const root = createRoot(el, { onUncaughtError: (e) => (error = String(e && e.message).split('\\n')[0]) })
    root.render(React.createElement(Widget))
    setTimeout(() => resolve(error || el.textContent), ${SETTLE_MS})
  })
}
const remotes = { products: () => import('products/Widget'), cart: () => import('cart/Widget') }
async function main() {
  const containers = [{ name: 'shell', react: React.version, from: fromOf(React.version), sameInstanceAsShell: true, hook: await hook(() => React.createElement('span', null, React.useState('hook ok')[0])) }]
  const errors = []
  for (const [name, load] of Object.entries(remotes)) {
    try {
      const m = await load()
      const i = m.info()
      containers.push({ name, react: i.react, from: fromOf(i.react), sameInstanceAsShell: i.same, hook: await hook(m.Widget) })
    } catch (e) {
      errors.push(name + ': ' + String(e && e.message).split('\\n')[0])
    }
  }
  const registered = Object.fromEntries(Object.entries(scope()).map(([v, e]) => [v, e.from]))
  window.__report = { containers, errors, scope: registered }
}
main()
`

function config(dir: string, app: App, port: number, scenario: Scenario) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const webpack = require(path.join(dir, 'node_modules', 'webpack'))
  const v = FEDERATION_APPS[app]
  const react = { singleton: true, requiredVersion: v.required, ...(app === 'cart' ? CART_SHARED[scenario] : {}) }
  return webpack({
    mode: 'development',
    devtool: false,
    context: path.join(dir, app),
    entry: app === 'shell' ? './src/index.js' : {},
    output: { path: path.join(dir, 'dist', scenario, app), publicPath: `http://localhost:${port}/${app}/`, uniqueName: app },
    plugins: [
      new webpack.container.ModuleFederationPlugin({
        name: app,
        ...(app === 'shell'
          ? { remotes: { products: `products@http://localhost:${port}/products/remoteEntry.js`, cart: `cart@http://localhost:${port}/cart/remoteEntry.js` } }
          : { filename: REMOTE_ENTRY, exposes: { './Widget': './src/Widget.js' } }),
        shared: { react, 'react-dom': { ...react } },
      }),
    ],
  })
}

const build = (compiler: { run: (cb: (e: Error | null, s: { hasErrors: () => boolean; toString: (o: string) => string }) => void) => void }) =>
  new Promise<void>((resolve, reject) =>
    compiler.run((err, stats) => (err ? reject(err) : stats.hasErrors() ? reject(new Error(stats.toString('errors-only'))) : resolve())),
  )

export async function recordFederation(dir: string): Promise<FederationRecording> {
  for (const app of Object.keys(FEDERATION_APPS) as App[]) {
    fs.mkdirSync(path.join(dir, app, 'src'), { recursive: true })
    if (app === 'shell') {
      fs.writeFileSync(path.join(dir, app, 'src', 'index.js'), "import('./bootstrap')\n")
      fs.writeFileSync(path.join(dir, app, 'src', 'bootstrap.js'), BOOTSTRAP)
    } else fs.writeFileSync(path.join(dir, app, 'src', 'Widget.js'), WIDGET)
  }
  // One static server for every scenario's bundles (the scenario is the first path segment the page asks for).
  let current: Scenario = 'singleton'
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    if (url.pathname === '/') {
      res.setHeader('content-type', 'text/html')
      res.end('<!doctype html><html><head><title>shell</title></head><body><script src="/shell/main.js"></script></body></html>')
      return
    }
    const file = path.join(dir, 'dist', current, url.pathname)
    if (!file.startsWith(path.join(dir, 'dist')) || !fs.existsSync(file)) {
      res.statusCode = 404
      res.end()
      return
    }
    res.setHeader('content-type', 'text/javascript')
    res.end(fs.readFileSync(file))
  })
  await new Promise<void>((r) => server.listen(0, r))
  const port = (server.address() as { port: number }).port
  const { chromium } = await import('playwright')
  const browser = await chromium.launch()
  try {
    const scenarios = {} as FederationRecording['scenarios']
    for (const scenario of Object.keys(CART_SHARED) as Scenario[]) {
      for (const app of Object.keys(FEDERATION_APPS) as App[]) await build(config(dir, app, port, scenario))
      current = scenario
      const page = await browser.newPage()
      const warnings: string[] = []
      const errors: string[] = []
      page.on('console', (m) => {
        if (m.type() === 'warning') warnings.push(m.text())
        if (m.type() === 'error') errors.push(m.text().split('\n')[0])
      })
      await page.goto(`http://localhost:${port}/`)
      await page.waitForFunction('window.__report', null, { timeout: 15_000 })
      const report = (await page.evaluate('window.__report')) as { containers: Omit<FederationScenario['containers'][number], 'requiredVersion' | 'provides'>[]; errors: string[]; scope: Record<string, string> }
      scenarios[scenario] = {
        scope: report.scope,
        containers: report.containers.map((c) => ({ ...c, requiredVersion: FEDERATION_APPS[c.name as App].required, provides: FEDERATION_APPS[c.name as App].react })),
        warnings,
        errors: [...report.errors, ...errors],
      }
      await page.close()
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const webpackVersion = require(path.join(dir, 'node_modules', 'webpack', 'package.json')).version as string
    return { generator: FRONTEND_GENERATOR, sha256: sha256(JSON.stringify({ FEDERATION_APPS, CART_SHARED, WIDGET, BOOTSTRAP })), webpack: webpackVersion, browser: `chromium@${browser.version()}`, scenarios }
  } finally {
    await browser.close()
    server.close()
    fs.rmSync(path.join(dir, 'dist'), { recursive: true, force: true })
  }
}
