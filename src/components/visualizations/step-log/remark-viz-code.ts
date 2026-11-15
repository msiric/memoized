/**
 * A remark plugin for the MDX serializer (the premium-code policy): every
 * `<Viz id preset>` whose frame shows a practice answer gets that answer's
 * pane as a `code` attribute (a JSON string), resolved from the content
 * checkout when the lesson is serialized (`resolve-code.ts`). The serialized
 * lesson is served only to readers who may open it, so the answer's text
 * reaches only them; the app repo and its bundles never hold it.
 *
 * Without the content (a free-only checkout), or if the answer drifted from
 * its committed hash, the element is left as it is and the frame renders
 * nothing; `onMissing` hears why.
 *
 * Node-only: `sync-content.ts` and the dev lesson-context page add it to
 * their `serialize` calls; it is not in the app-wide `mdxOptions`, which a
 * client component also imports.
 */
import { visit } from 'unist-util-visit'
import { resolveVizCode } from './resolve-code'
import { contentRoot } from './lesson-block'

type Attr = { type: string; name?: string; value?: unknown }
type JsxNode = { type: string; name?: string | null; attributes?: Attr[] }

export type VizCodeOptions = { root?: string; onMissing?: (why: string) => void }

const literal = (n: JsxNode, name: string) => {
  const a = n.attributes?.find((x) => x.type === 'mdxJsxAttribute' && x.name === name)
  return typeof a?.value === 'string' ? a.value : undefined
}

export function remarkVizCode(options: VizCodeOptions = {}) {
  const root = options.root ?? contentRoot()
  const onMissing = options.onMissing ?? ((why: string) => console.warn(`<Viz> left unresolved: ${why}`))
  return async (tree: unknown) => {
    const vizzes: JsxNode[] = []
    visit(tree as Parameters<typeof visit>[0], (node) => {
      const n = node as JsxNode
      if ((n.type === 'mdxJsxFlowElement' || n.type === 'mdxJsxTextElement') && n.name === 'Viz') vizzes.push(n)
    })
    for (const n of vizzes) {
      const id = literal(n, 'id')
      if (!id || literal(n, 'code') !== undefined) continue
      const r = await resolveVizCode(id, literal(n, 'preset'), root)
      if (r.kind === 'missing') onMissing(`${id}/${literal(n, 'preset') ?? '(default)'}: ${r.why}`)
      if (r.kind !== 'resolved') continue
      n.attributes = [...(n.attributes ?? []), { type: 'mdxJsxAttribute', name: 'code', value: JSON.stringify(r.code) }]
    }
  }
}
