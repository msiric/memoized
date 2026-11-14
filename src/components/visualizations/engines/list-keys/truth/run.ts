/**
 * Child-process entry for the list-keys truth recorder:
 * `node --import tsx run.ts 18|19` prints one `Recording` as JSON.
 *
 * A fresh process per React major keeps the two copies apart. React 19 is
 * installed under the aliases `react-19` and `react-dom-19` (dev only); its
 * own `require('react')` calls are redirected to that copy, so React 19's
 * react-dom never sees the app's React 18.
 */
import Module from 'node:module'
import { record } from './record'

const major = process.argv[2]
if (major !== '18' && major !== '19')
  throw new Error(`usage: run.ts 18|19 (got ${major})`)

if (major === '19') {
  const M = Module as unknown as {
    _resolveFilename: (req: string, ...rest: unknown[]) => string
  }
  const resolve = M._resolveFilename
  const alias: Record<string, string> = {
    react: 'react-19',
    'react-dom': 'react-dom-19',
  }
  M._resolveFilename = function (request: string, ...rest: unknown[]) {
    const [pkg, ...sub] = request.split('/')
    const to = alias[pkg]
    return resolve.call(this, to ? [to, ...sub].join('/') : request, ...rest)
  }
}

// jsdom ships no types here; the recorder needs only a document.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { JSDOM } = require('jsdom') as {
  JSDOM: new (html: string) => { window: any }
}
const dom = new JSDOM('<!doctype html><html><body></body></html>')
const g = globalThis as Record<string, unknown>
g.window = dom.window
g.document = dom.window.document
g.HTMLElement = dom.window.HTMLElement
g.Node = dom.window.Node
g.IS_REACT_ACT_ENVIRONMENT = true

// eslint-disable-next-line @typescript-eslint/no-require-imports
const React = require('react')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ReactDOM = require('react-dom/client')
if (!String(React.version).startsWith(`${major}.`)) {
  throw new Error(`expected React ${major}, loaded ${React.version}`)
}
const errors: string[] = []
const original = console.error
console.error = (...args: unknown[]) => {
  errors.push(args.map(String).join(' '))
  original(...args)
}
const recording = record(React, ReactDOM, dom.window.document)
if (errors.length)
  throw new Error(`React reported errors:\n${errors.join('\n')}`)
process.stdout.write(JSON.stringify(recording))
