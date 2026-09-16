import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { G3B_CARD_ORDER, G3B_LESSON_CONTENT_ID, G3B_TASK } from '@/lib/g3b-task'
import { G3bPracticeEntry } from './G3bPracticeEntry'

afterEach(cleanup)
const problems = G3B_CARD_ORDER.map(contentId => ({ contentId }))

describe('free G3B primary practice entry', () => {
  it('points to the actual native card and explains the optional comparisons', () => {
    render(<G3bPracticeEntry lessonContentId={G3B_LESSON_CONTENT_ID} problems={problems} />)
    expect(screen.getByRole('link', { name: G3B_TASK.title })).toHaveAttribute('href', `#${G3B_TASK.id}`)
    expect(screen.getByText(/Prefix, subsequence and edit distance are optional comparisons/)).toBeInTheDocument()
  })

  it('does not announce a task before its record exists', () => {
    const { container } = render(<G3bPracticeEntry lessonContentId={G3B_LESSON_CONTENT_ID} problems={problems.slice(0, 3)} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('does not add a primary path to another lesson', () => {
    const { container } = render(<G3bPracticeEntry lessonContentId="/another/lesson" problems={problems} />)
    expect(container).toBeEmptyDOMElement()
  })
})
