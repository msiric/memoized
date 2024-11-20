import { recmaPlugins } from './recma.mjs'
import { rehypePlugins } from './rehype.mjs'
import { remarkPlugins } from './remark.mjs'

export const mdxOptions = {
  remarkPlugins,
  rehypePlugins,
  recmaPlugins,
}
