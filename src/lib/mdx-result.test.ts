import { describe, expect, it } from 'vitest'
import { serialize } from 'next-mdx-remote-client/serialize'
import { assertCompiledMdx } from './mdx-result'
import { mdxOptions } from '@/mdx/index.mjs'

describe('MDX serialization contract', () => {
  it.each([
    null,
    undefined,
    {},
    { compiledSource: '' },
    { error: { message: 'Failed compilation' } },
  ])('rejects missing or failed compilation: %j', (value) => {
    expect(() => assertCompiledMdx(value, 'example.mdx')).toThrow(
      /MDX compilation failed/,
    )
  })
  it('accepts valid content and tolerates a null error field', () => {
    expect(() =>
      assertCompiledMdx({ compiledSource: 'return {}', error: null }),
    ).not.toThrow()
  })
  it('catches the real multiple-annotation failure instead of persisting it as successful content', async () => {
    const bad = await serialize({
      source:
        "```javascript {{ title: 'Questions' }} {{ exec: false }}\n1 + 1\n```",
      options: { mdxOptions },
    })
    expect(() => assertCompiledMdx(bad)).toThrow()
    const good = await serialize({
      source: "```javascript {{ title: 'Questions', exec: false }}\n1 + 1\n```",
      options: { mdxOptions },
    })
    expect(() => assertCompiledMdx(good)).not.toThrow()
  })
})
