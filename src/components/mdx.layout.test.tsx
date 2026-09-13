import { cleanup, render, screen } from '@testing-library/react'
import type { Problem } from '@prisma/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CONTENT_COLUMN_CLASSES } from '@/constants/content-layout'
import { wrapper as Wrapper } from './mdx'
import { CatalogDirectory } from './CatalogDirectory'
import { LessonPreview } from './LessonPreview'
import { Prose } from './Prose'

vi.mock('./LessonStatus', () => ({
  LessonStatus: () => <div>Lesson status</div>,
}))
vi.mock('./LessonFeedback', () => ({
  LessonFeedback: () => <div>Lesson feedback</div>,
}))
vi.mock('./NextPage', () => ({
  NextPage: () => <div>Next lesson</div>,
}))
vi.mock('./ExpandableAnswer', () => ({
  ExpandableAnswer: () => <div>Practice card</div>,
}))

const problem: Problem = {
  id: 'problem-id',
  contentId: '/course/section/lesson/problem',
  lessonId: 'lesson-id',
  title: 'Practice question',
  slug: 'practice-question',
  question: 'Explain the example.',
  answer: 'An explanation.',
  serializedQuestion: null,
  serializedAnswer: null,
  difficulty: 'EASY',
  type: 'THEORY',
  href: '',
  link: '',
  createdAt: new Date(0),
  updatedAt: new Date(0),
}

describe('shared reader layout', () => {
  afterEach(cleanup)

  it('allows long prose identifiers to wrap inside deeply nested lists', () => {
    const { container } = render(
      <Prose><ul><li><strong>BinaryExpression</strong></li></ul></Prose>,
    )
    expect(container.querySelector('.prose')).toHaveClass('[overflow-wrap:anywhere]')
    expect(screen.getByText('BinaryExpression').tagName).toBe('STRONG')
  })

  it('uses intrinsic content height rather than filling the parent main', () => {
    const { container } = render(
      <Wrapper lessonId="lesson-id" problems={[problem]}>
        <h1>Lesson</h1>
        <p>Last body paragraph</p>
      </Wrapper>,
    )
    const article = container.querySelector('article')
    expect(article).not.toHaveClass('h-full')
    expect(article?.querySelectorAll(':scope > .flex-auto')).toHaveLength(0)
    expect(article?.querySelectorAll(':scope > .prose')).toHaveLength(2)
    expect(screen.getByRole('heading', { name: 'Practice Problems' })).toHaveClass('!mt-10')
    expect(article?.querySelector('footer')?.className).toContain(CONTENT_COLUMN_CLASSES)
  })

  it('puts the breadcrumb inside the same article and column without stacked top padding', () => {
    const { container } = render(
      <Wrapper header={<nav aria-label="Breadcrumb">Course / Lesson</nav>}>
        <h1>Lesson</h1>
      </Wrapper>,
    )
    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(breadcrumb.closest('article')).toBe(container.querySelector('article'))
    expect(breadcrumb.parentElement?.className).toBe(CONTENT_COLUMN_CLASSES)
    expect(container.querySelector('article')).toHaveClass('pt-8')
    expect(container.querySelector('article')).not.toHaveClass('md:pt-16')
  })

  it('does not reserve an empty practice area in introductions, resources or answers', () => {
    const { container } = render(
      <Wrapper withPadding={false} showNextPage={false} showFooter={false}>
        <p>Answer</p>
      </Wrapper>,
    )
    expect(container.querySelectorAll('.prose')).toHaveLength(1)
    expect(screen.queryByRole('heading', { name: 'Practice Problems' })).toBeNull()
    expect(container.querySelector('footer')).toBeNull()
    expect(screen.queryByText('Next lesson')).toBeNull()
    expect(container.querySelector('article')).toHaveClass('p-1', 'pt-2')
  })

  it('aligns public previews and related directories with the full reader column', () => {
    const { container } = render(
      <>
        <LessonPreview
          title="Lesson"
          description="Description"
          topics={[]}
          problems={[]}
          header={<nav aria-label="Breadcrumb">Course / Lesson</nav>}
        />
        <CatalogDirectory title="Continue" items={[{ title: 'Next', href: '/next' }]} />
      </>,
    )
    const article = container.querySelector('article')
    const directory = screen.getByRole('region', { name: 'Continue' })
    expect(article?.className).toContain(CONTENT_COLUMN_CLASSES)
    expect(directory.className).toContain(CONTENT_COLUMN_CLASSES)
    expect(article).not.toHaveClass('px-4')
    expect(directory).not.toHaveClass('px-4', 'my-10')
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' }).closest('article')).toBe(article)
  })
})
