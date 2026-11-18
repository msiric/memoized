/**
 * The visual's own app (not lesson code): a Header and two Suspense
 * boundaries, Product (upper) and Reviews (lower), each waiting on its data
 * on the server (the register's 120 ms and 80 ms). On the client the data is
 * already there; each boundary takes `__BUSY` ms to render (a busy loop
 * standing in for an expensive component), so a click can land while the
 * page hydrates. A layout effect (at the commit that hydrated the boundary)
 * and the click handler write to `window.__log`, which the recorder reads.
 *
 * React is passed in, so one file serves React 19 on the server
 * (`truth/run.ts`, under an alias) and in the browser bundle
 * (`truth/client.ts`, bundled with the same alias). The contrast app is the
 * legacy pattern: no Suspense, data fetched before rendering.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type ReactLike = any

export const DATA_MS = { product: 120, reviews: 80 } as const
export const LABELS = { product: 'Add', reviews: 'Helpful' } as const
export const TITLES = { product: 'Product', reviews: 'Reviews' } as const
export const FALLBACKS = { product: 'Loading product', reviews: 'Loading reviews' } as const
export type Slot = keyof typeof DATA_MS

export function makeApps(React: ReactLike) {
  const h = React.createElement
  const isServer = typeof window === 'undefined'
  let cache: Partial<Record<Slot, Promise<string>>> = {}
  const data = (key: Slot, ms: number) => {
    if (isServer && ms > 0) {
      cache[key] ??= new Promise<string>((r) => setTimeout(() => r(key), ms))
      React.use(cache[key])
    }
  }
  const busy = () => {
    if (isServer) return
    const end = performance.now() + ((globalThis as { __BUSY?: number }).__BUSY ?? 0)
    while (performance.now() < end);
  }
  const log = (e: Record<string, unknown>) => (window as unknown as { __log: unknown[] }).__log.push({ ...e, t: performance.now() })

  function Box({ name, ms }: { name: Slot; ms: number }) {
    data(name, ms)
    busy()
    // A layout effect runs in the commit that hydrated this boundary (a passive one may run after a later event).
    React.useLayoutEffect(() => log({ e: 'hydrated', name }), [name])
    return h('section', { id: name }, h('h2', null, TITLES[name]), h('button', { onClick: () => log({ e: 'click', name }) }, LABELS[name]))
  }
  const slot = (name: Slot) =>
    h(React.Suspense, { key: name, fallback: h('p', null, FALLBACKS[name]) }, h(Box, { name, ms: DATA_MS[name] }))

  /** The streaming app: Header, then Product and Reviews, each behind its own Suspense boundary. */
  function StreamApp() {
    return h('main', null, h('header', null, 'Shop'), slot('product'), slot('reviews'))
  }
  /** The renderToString contrast: no boundaries, the data already fetched. */
  function StringApp() {
    return h('main', null, h('header', null, 'Shop'), h(Box, { name: 'product', ms: 0 }), h(Box, { name: 'reviews', ms: 0 }))
  }
  return { StreamApp, StringApp, reset: () => (cache = {}) }
}
