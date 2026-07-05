import { render, screen, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProblemQuestion } from './ProblemQuestion'

// Render the pre-serialized MDX path as a marker that exposes whether it
// received the serialized content, so we can assert questions go through the
// MDX pipeline (which renders code blocks) rather than being printed raw.
vi.mock('./PreserializedMdxRenderer', () => ({
  PreserializedMdxRenderer: ({ serializedContent }: { serializedContent: unknown }) => (
    <div data-testid="mdx">{serializedContent ? 'mdx-rendered' : 'no-content'}</div>
  ),
}))

describe('ProblemQuestion', () => {
  afterEach(() => cleanup())

  it('renders the question through the MDX pipeline when serialized', () => {
    render(
      <ProblemQuestion
        question="What does `foo` do? ```js\nfoo()\n```"
        serializedQuestion={{ compiledSource: 'compiled' }}
      />,
    )

    // Goes through MDX (which turns the fenced block into a real code block),
    // instead of printing the raw markdown/backticks.
    expect(screen.getByTestId('mdx')).toHaveTextContent('mdx-rendered')
    expect(screen.queryByText(/```/)).toBeNull()
  })

  it('falls back to raw text (with className) when not yet serialized', () => {
    render(
      <ProblemQuestion
        question="Plain question"
        serializedQuestion={null}
        className="text-sm"
      />,
    )

    expect(screen.queryByTestId('mdx')).toBeNull()
    const p = screen.getByText('Plain question')
    expect(p.tagName).toBe('P')
    expect(p).toHaveClass('text-sm')
  })

  it('falls back when serializedQuestion is undefined', () => {
    render(<ProblemQuestion question="Another question" />)

    expect(screen.queryByTestId('mdx')).toBeNull()
    expect(screen.getByText('Another question').tagName).toBe('P')
  })
})
