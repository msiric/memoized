import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { LessonPreview } from './LessonPreview'

afterEach(cleanup)

describe('public lesson preview actions', () => {
  it('keeps the breadcrumb adjacent to the title and puts the guided action after it', () => {
    render(<LessonPreview title="TS Basics" description="Description" topics={[]} problems={[]}
      header={<nav aria-label="Breadcrumb">Courses / TS Basics</nav>}
      actions={<a href="?path=typescript-first-pass">Open the guided first pass</a>} />)
    const title = screen.getByRole('heading', { level: 1, name: 'TS Basics' })
    const action = screen.getByRole('link', { name: 'Open the guided first pass' })
    expect(title.compareDocumentPosition(action) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' }).textContent).not.toContain('guided')
  })
})
