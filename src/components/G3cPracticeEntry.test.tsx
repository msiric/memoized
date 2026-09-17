import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { G3C_LESSON_CONTENT_ID, G3C_OLD_TASK_IDS, G3C_TASK } from '@/lib/g3c-task'
import { G3cPracticeEntry } from './G3cPracticeEntry'

afterEach(cleanup)
const problems = [...G3C_OLD_TASK_IDS.map(id => ({ contentId: `${G3C_LESSON_CONTENT_ID}/${id}` })), { contentId: G3C_TASK.contentId }]

describe('free G3C primary entry', () => {
  it('links only to the real sixth task with honest local preparation', () => {
    render(<G3cPracticeEntry lessonContentId={G3C_LESSON_CONTENT_ID} problems={problems} />)
    expect(screen.getByRole('link', { name: G3C_TASK.title })).toHaveAttribute('href', `#${G3C_TASK.id}`)
    expect(screen.getByText(/Its preparation, starter and feedback are free/)).toBeInTheDocument()
  })

  it('has no entry before creation or in another lesson', () => {
    const { container, rerender } = render(<G3cPracticeEntry lessonContentId={G3C_LESSON_CONTENT_ID} problems={problems.slice(0, 5)} />)
    expect(container).toBeEmptyDOMElement()
    rerender(<G3cPracticeEntry lessonContentId="/another/lesson" problems={problems} />)
    expect(container).toBeEmptyDOMElement()
  })
})
