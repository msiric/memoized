/**
 * Child-process entry for the state-management render recorder:
 * `node --import tsx render-run.ts` reads `{ programs: [{ id, code }] }` (JSX
 * already compiled) on stdin and prints one `RenderRecording['runs']` with
 * the React versions as JSON.
 *
 * React 19 is the dev alias `react-19` / `react-dom-19`, redirected for its
 * own `require('react')` calls as the list-keys recorder does, in jsdom.
 * Each program renders `<App />` into a fresh root inside `act`, then the
 * setter of the state whose value is `{ name: 'Alice' }` (the user) is
 * called with `{ name: 'Bob' }` inside `act`; every component render in
 * between is logged by name.
 */
import fs from 'node:fs'
import Module from 'node:module'

const M = Module as unknown as { _resolveFilename: (req: string, ...rest: unknown[]) => string }
const resolve = M._resolveFilename
const alias: Record<string, string> = { react: 'react-19', 'react-dom': 'react-dom-19' }
M._resolveFilename = function (request: string, ...rest: unknown[]) {
  const [pkg, ...sub] = request.split('/')
  const to = alias[pkg]
  return resolve.call(this, to ? [to, ...sub].join('/') : request, ...rest)
}

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports */
const { JSDOM } = require('jsdom') as { JSDOM: new (html: string) => { window: any } }
const dom = new JSDOM('<!doctype html><html><body></body></html>')
const g = globalThis as Record<string, unknown>
g.window = dom.window
g.document = dom.window.document
g.HTMLElement = dom.window.HTMLElement
g.Node = dom.window.Node
g.IS_REACT_ACT_ENVIRONMENT = true

const React = require('react')
const ReactDOM = require('react-dom/client')
const ReactDOMPkg = require('react-dom/package.json')
if (!String(React.version).startsWith('19.')) throw new Error(`expected React 19, loaded ${React.version}`)

const errors: string[] = []
const original = console.error
console.error = (...args: unknown[]) => {
  errors.push(args.map(String).join(' '))
  original(...args)
}

type Input = { programs: { id: string; code: string }[] }
const input = JSON.parse(fs.readFileSync(0, 'utf8')) as Input

const runs: Record<string, { mount: string[]; userOwner: string; afterSetUser: string[]; text: string }> = {}
for (const p of input.programs) {
  const log: string[] = []
  const states: { owner: string; initial: unknown; set: (v: unknown) => void }[] = []
  let current = ''
  const h = {
    rendered(name: string) {
      current = name
      log.push(name)
    },
    count(name: string, fn: (props: unknown) => unknown) {
      const C = (props: unknown) => {
        current = name
        log.push(name)
        return fn(props)
      }
      C.displayName = name
      return C
    },
    useState(init: unknown) {
      const pair = React.useState(init)
      // Each render calls useState in the same order: note each piece of state once, by its owner and its first value.
      const owner = current
      const known = states.find((s) => s.owner === owner && s.set === pair[1])
      if (!known) states.push({ owner, initial: init, set: pair[1] })
      return pair
    },
  }
  const App = new Function('React', '__h', p.code)(React, h)
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = ReactDOM.createRoot(container)
  React.act(() => root.render(React.createElement(App)))
  const mount = [...log]
  const user = states.filter((s) => (s.initial as { name?: string } | null)?.name === 'Alice')
  if (user.length !== 1) throw new Error(`${p.id}: expected one user state, found ${user.length}`)
  log.length = 0
  React.act(() => user[0].set({ name: 'Bob' }))
  runs[p.id] = { mount, userOwner: user[0].owner, afterSetUser: [...log], text: container.textContent ?? '' }
  React.act(() => root.unmount())
  container.remove()
}
if (errors.length) throw new Error(`React reported errors:\n${errors.join('\n')}`)
process.stdout.write(JSON.stringify({ react: React.version, reactDom: ReactDOMPkg.version, runs }))
