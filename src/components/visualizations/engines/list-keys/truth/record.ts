/**
 * Records what real React does for every list-keys combination.
 *
 * Node-only, test-only. It receives React and react-dom as arguments (never
 * imports them), so `run.ts` can hand it React 18 or React 19 in a fresh
 * process. Every fixture renders, sets its state through real DOM events,
 * re-renders with the action applied, and reads back what React left in the
 * DOM: which instance each row has, whether it is checked, what unmounted.
 *
 * Two list fixtures, so the result is not an artefact of one kind of state:
 * - `dom`: the lesson's TodoList, an uncontrolled `<input type="checkbox">`
 *   (state lives in the DOM node React reuses or replaces);
 * - `state`: a `TodoItem` component holding `useState` (state lives on the fiber).
 */
import {
  AFTER,
  BEFORE,
  ITEMS,
  KEY_STRATEGIES,
  LIST_ACTIONS,
  WRAPPER_ACTIONS,
  type ItemId,
} from '../model'

/* eslint-disable @typescript-eslint/no-explicit-any */
type ReactLike = {
  version: string
  createElement: (...args: any[]) => any
  useState: <T>(init: T | (() => T)) => [T, (v: T | ((p: T) => T)) => void]
  useEffect: (fn: () => void | (() => void), deps?: unknown[]) => void
  act: (fn: () => void) => void
}
type Root = { render: (el: unknown) => void; unmount: () => void }
type DomClient = { createRoot: (el: Element) => Root }

export type ObservedRow = { text: string; instance: string; checked: boolean }
export type ObservedList = { rows: ObservedRow[]; unmounted: string[] }
export type ObservedWrapper = {
  tag: string
  count: number
  wrapperReused: boolean
  counterReused: boolean
  unmounted: string[]
}

export type Recording = {
  react: string
  /** `${key}/${action}/${variant}/${checks}` with checks like `milk+dog`, `milk`, `none`. */
  list: Record<string, ObservedList>
  /** `${action}/${startCount}` */
  wrapper: Record<string, ObservedWrapper>
}

export const CHECK_SUBSETS: readonly (readonly ('milk' | 'dog')[])[] = [
  [],
  ['milk'],
  ['dog'],
  ['milk', 'dog'],
]
export const subsetName = (s: readonly string[]) =>
  s.length ? s.join('+') : 'none'
export const WRAPPER_COUNTS = [0, 1, 7, 12] as const

const keyFor = {
  index: (_t: ItemId, i: number) => i,
  id: (t: ItemId) => t,
  random: () => Math.random(),
} as const

export function record(
  React: ReactLike,
  ReactDOM: DomClient,
  document: Document,
): Recording {
  const h = React.createElement
  const out: Recording = { react: React.version, list: {}, wrapper: {} }

  function mount() {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = ReactDOM.createRoot(host)
    return { host, root }
  }

  // ---- list fixtures --------------------------------------------------------
  for (const strategy of KEY_STRATEGIES) {
    for (const action of LIST_ACTIONS) {
      for (const subset of CHECK_SUBSETS) {
        // 1. `dom`: exactly the lesson's code; state is the input's DOM checked.
        {
          const { host, root } = mount()
          const TodoList = ({ todos }: { todos: readonly ItemId[] }) =>
            h(
              'ul',
              null,
              todos.map((t, i) =>
                h(
                  'li',
                  { key: keyFor[strategy](t, i) },
                  h('input', { type: 'checkbox' }),
                  ITEMS[t].text,
                ),
              ),
            )
          React.act(() => root.render(h(TodoList, { todos: BEFORE })))
          const tag = new Map<Element, string>()
          const startLis = [...host.querySelectorAll('li')]
          startLis.forEach((li, i) => tag.set(li, 'AB'[i]))
          startLis.forEach((li, i) => {
            if (subset.includes(BEFORE[i] as 'milk' | 'dog')) {
              React.act(() =>
                (li.querySelector('input') as HTMLInputElement).click(),
              )
            }
          })
          React.act(() => root.render(h(TodoList, { todos: AFTER[action] })))
          const rows = [...host.querySelectorAll('li')].map((li) => ({
            text: li.textContent ?? '',
            instance: tag.get(li) ?? 'new',
            checked: (li.querySelector('input') as HTMLInputElement).checked,
          }))
          const unmounted = startLis
            .filter((li) => !li.isConnected)
            .map((li) => tag.get(li)!)
          out.list[`${strategy}/${action}/dom/${subsetName(subset)}`] = {
            rows,
            unmounted,
          }
          React.act(() => root.unmount())
          host.remove()
        }

        // 2. `state`: a component with useState; identity read from the fiber's own state.
        {
          const { host, root } = mount()
          let mounted = 0
          const unmounted: string[] = []
          function TodoItem({ text }: { text: string }) {
            const [id] = React.useState(() =>
              mounted < 2 ? 'AB'[mounted++] : `new${mounted++}`,
            )
            const [done, setDone] = React.useState(false)
            // The instance id never changes, so the cleanup runs only on unmount.
            // eslint-disable-next-line react-hooks/exhaustive-deps
            React.useEffect(() => () => void unmounted.push(id), [])
            return h(
              'li',
              { 'data-instance': id },
              h('input', {
                type: 'checkbox',
                checked: done,
                onChange: () => setDone((d) => !d),
              }),
              text,
            )
          }
          const TodoList = ({ todos }: { todos: readonly ItemId[] }) =>
            h(
              'ul',
              null,
              todos.map((t, i) =>
                h(TodoItem, {
                  key: keyFor[strategy](t, i),
                  text: ITEMS[t].text,
                }),
              ),
            )
          React.act(() => root.render(h(TodoList, { todos: BEFORE })))
          const startLis = [...host.querySelectorAll('li')]
          startLis.forEach((li, i) => {
            if (subset.includes(BEFORE[i] as 'milk' | 'dog')) {
              React.act(() =>
                (li.querySelector('input') as HTMLInputElement).click(),
              )
            }
          })
          React.act(() => root.render(h(TodoList, { todos: AFTER[action] })))
          const rows = [...host.querySelectorAll('li')].map((li) => {
            const inst = li.getAttribute('data-instance') ?? ''
            return {
              text: li.textContent ?? '',
              instance: inst.startsWith('new') ? 'new' : inst,
              checked: (li.querySelector('input') as HTMLInputElement).checked,
            }
          })
          out.list[`${strategy}/${action}/state/${subsetName(subset)}`] = {
            rows,
            unmounted: [...unmounted],
          }
          React.act(() => root.unmount())
          host.remove()
        }
      }
    }
  }

  // ---- wrapper fixture ------------------------------------------------------
  for (const action of WRAPPER_ACTIONS) {
    for (const start of WRAPPER_COUNTS) {
      const { host, root } = mount()
      let mounted = 0
      const unmounted: string[] = []
      function Counter() {
        const [id] = React.useState(() => 'AB'[mounted++] ?? 'new')
        const [count, setCount] = React.useState(0)
        // The instance id never changes, so the cleanup runs only on unmount.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        React.useEffect(() => () => void unmounted.push(id), [])
        return h(
          'button',
          { 'data-instance': id, onClick: () => setCount((c) => c + 1) },
          `count ${count}`,
        )
      }
      React.act(() => root.render(h('div', null, h(Counter))))
      const wrapperBefore = host.firstElementChild!
      for (let k = 0; k < start; k++)
        React.act(() =>
          (host.querySelector('button') as HTMLButtonElement).click(),
        )
      const after =
        action === 'type'
          ? h('span', null, h(Counter))
          : h('div', { className: 'on' }, h(Counter))
      React.act(() => root.render(after))
      const wrapper = host.firstElementChild!
      const button = host.querySelector('button')!
      out.wrapper[`${action}/${start}`] = {
        tag: wrapper.tagName.toLowerCase(),
        count: Number((button.textContent ?? '').replace('count ', '')),
        wrapperReused: wrapper === wrapperBefore,
        counterReused: button.getAttribute('data-instance') === 'A',
        unmounted: [...unmounted],
      }
      React.act(() => root.unmount())
      host.remove()
    }
  }

  return out
}
