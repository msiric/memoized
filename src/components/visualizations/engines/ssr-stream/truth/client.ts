/**
 * The browser bundle the recorder serves (esbuild, React 19 under the
 * `react` alias): hydrates the page the server streamed. Logged before the
 * call, so the recorder knows hydration has begun.
 */
import * as React from 'react'
import { hydrateRoot } from 'react-dom/client'
import { makeApps } from './app'

const { StreamApp, StringApp } = makeApps(React)
const w = window as unknown as { __log: unknown[] }
w.__log.push({ e: 'hydrate-start', t: performance.now() })
hydrateRoot(document.getElementById('root')!, React.createElement(location.pathname.startsWith('/string') ? StringApp : StreamApp))
