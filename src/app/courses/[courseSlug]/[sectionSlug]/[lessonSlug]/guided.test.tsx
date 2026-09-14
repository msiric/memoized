import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { getLessonBySlug } from '@/services/lesson'
import { getUserWithSubscriptionDetails } from '@/services/user'
import { getProgressSnapshot } from '@/actions/getProgressSnapshot'
import { TypescriptFirstPass } from '@/components/TypescriptFirstPass'
import { userHasAccess } from '@/utils/helpers'
import { createFirstPassLessonFixture } from '@/test-fixtures/typescript-first-pass'
import Lesson from './page'

vi.mock('@/services/lesson')
vi.mock('@/services/user')
vi.mock('@/actions/getProgressSnapshot')
vi.mock('@/utils/helpers')
vi.mock('@/lib/sentry', () => ({ reportErrorSafely: vi.fn() }))
vi.mock('@/app/api/auth/[...nextauth]/route', () => ({ authOptions: {} }))
vi.mock('next-auth', () => ({ getServerSession: async () => ({ userId: 'user-a' }) }))
vi.mock('@/services/search', () => ({ getSearchCatalog: async () => ({ courses: [], resources: [], posts: [] }) }))
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('Not found') } }))
vi.mock('@/components/TypescriptFirstPass', () => ({
  TypescriptFirstPass: vi.fn(({ path, header }: { path: { questions: { title: string }[] }; header: ReactNode }) =>
    <article data-testid="guided">{header}<h1>TypeScript first pass</h1>{path.questions.map(question => <p key={question.title}>{question.title}</p>)}</article>),
}))
vi.mock('@/components/PreserializedMdxRenderer', () => ({
  PreserializedMdxRenderer: ({ header }: { header: ReactNode }) => <article>{header}<h1>Normal reader</h1></article>,
}))
vi.mock('@/components/LessonPreview', () => ({
  LessonPreview: ({ header, actions }: { header: ReactNode; actions?: ReactNode }) => <article>{header}<h1>Public preview</h1>{actions}</article>,
}))

const params = { courseSlug: 'js-track', sectionSlug: 'typescript-introduction', lessonSlug: 'ts-basics' }
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('G4_TS_FIRST_PASS_ENABLED', 'true')
  vi.mocked(getLessonBySlug).mockResolvedValue(createFirstPassLessonFixture())
  vi.mocked(getUserWithSubscriptionDetails).mockResolvedValue(null)
  vi.mocked(userHasAccess).mockReturnValue(false)
  vi.mocked(getProgressSnapshot).mockResolvedValue({
    status: 'ready', userId: 'user-a', completedLessons: ['old-lesson'], completedProblems: ['unrelated'],
  })
})
afterEach(() => { cleanup(); vi.unstubAllEnvs() })

describe('guided route boundary', () => {
  it('projects only the four free questions, never the paid lesson object', async () => {
    render(await Lesson({ params, searchParams: { path: 'typescript-first-pass' } }))
    expect(screen.getByTestId('guided')).toBeDefined()
    expect(getUserWithSubscriptionDetails).not.toHaveBeenCalled()
    const props = vi.mocked(TypescriptFirstPass).mock.calls[0][0]
    expect(props.path.questions).toHaveLength(4)
    expect(JSON.stringify(props)).not.toContain('PRIVATE_LESSON_BODY')
    expect(props.path).not.toHaveProperty('serializedBody')
  })

  it('preserves the normal public reader when the server flag is disabled', async () => {
    vi.stubEnv('G4_TS_FIRST_PASS_ENABLED', 'false')
    render(await Lesson({ params, searchParams: { path: 'typescript-first-pass', step: 'typescript-vs-javascript' } }))
    expect(screen.getByRole('heading', { name: 'Public preview' })).toBeDefined()
    expect(screen.queryByRole('link', { name: 'Open the guided first pass' })).toBeNull()
    expect(TypescriptFirstPass).not.toHaveBeenCalled()
    expect(getProgressSnapshot).not.toHaveBeenCalled()
  })

  it('keeps normal browsing as the default and shows the bounded entry only when active', async () => {
    render(await Lesson({ params }))
    expect(screen.getByRole('heading', { name: 'Public preview' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Open the guided first pass' })).toHaveAttribute('href', expect.stringContaining('?path=typescript-first-pass'))
  })

  it.each(['wrong-path', ['typescript-first-pass', 'typescript-first-pass']])('does not silently accept a malformed path query', async query => {
    render(await Lesson({ params, searchParams: { path: query } }))
    expect(screen.getByText(/not available here/)).toBeDefined()
    expect(TypescriptFirstPass).not.toHaveBeenCalled()
  })

  it('keeps public questions available when progress is explicitly unavailable', async () => {
    vi.mocked(getProgressSnapshot).mockResolvedValue({ status: 'unavailable', userId: 'user-a', message: 'Retry saved marks' })
    render(await Lesson({ params, searchParams: { path: 'typescript-first-pass' } }))
    expect(screen.getByTestId('guided')).toBeDefined()
    expect(vi.mocked(TypescriptFirstPass).mock.calls[0][0].initialProgress.status).toBe('unavailable')
  })

  it('fails the guided view closed rather than shrinking missing content to three questions', async () => {
    const invalid = createFirstPassLessonFixture()
    invalid.problems.splice(1, 1)
    vi.mocked(getLessonBySlug).mockResolvedValue(invalid)
    render(await Lesson({ params, searchParams: { path: 'typescript-first-pass' } }))
    expect(screen.getByText(/guided view is not available right now/)).toBeDefined()
    expect(screen.getByRole('link', { name: 'Open the full lesson and free questions' })).toHaveAttribute('href', '/courses/js-track/typescript-introduction/ts-basics')
    expect(TypescriptFirstPass).not.toHaveBeenCalled()
    expect(getProgressSnapshot).not.toHaveBeenCalled()
  })
})
