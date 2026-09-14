import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Wrapper as CourseHeader } from '@/app/courses/[courseSlug]/@header/wrapper'
import { Wrapper as CoursesHeader } from '@/app/courses/(courses)/@header/wrapper'
import { Wrapper as ProblemsHeader } from '@/app/problems/@header/wrapper'
import { Wrapper as ResourcesHeader } from '@/app/resources/@header/wrapper'
import { Wrapper as CourseNavigation } from '@/app/courses/[courseSlug]/@navigation/wrapper'
import { Wrapper as ProblemsNavigation } from '@/app/problems/@navigation/wrapper'
import { Wrapper as ResourcesNavigation } from '@/app/resources/@navigation/wrapper'
import CourseHeaderServer from '@/app/courses/[courseSlug]/@header/default'
import { useContentStore } from './progress'
import { useAuthStore } from './auth'
import type { ProgressSnapshotResult } from '@/types/progress'
import type { UserWithSubscriptionsAndProgress } from '@/types'

const mocks = vi.hoisted(() => ({ session: vi.fn(), curriculum: vi.fn() }))
vi.mock('next-auth/react', () => ({ useSession: mocks.session }))
vi.mock('next-auth', () => ({ getServerSession: async () => ({ userId: 'a' }) }))
vi.mock('@/actions/markProblem', () => ({ markProblem: vi.fn() }))
vi.mock('@/app/api/auth/[...nextauth]/route', () => ({ authOptions: {} }))
vi.mock('@/services/user', () => ({ getUserProgressWithCurriculum: mocks.curriculum }))
vi.mock('@/components/Header', () => ({ Header: () => <header>Header</header> }))
vi.mock('@/components/Navigation', () => ({ Navigation: () => <nav>Navigation</nav> }))
vi.mock('@/hooks/useCourseSlug', () => ({ useCourseSlug: () => 'course' }))

const progress: ProgressSnapshotResult = {
  status: 'ready', userId: 'a', completedLessons: ['lesson', 'unrelated-lesson'],
  completedProblems: ['p1', 'p5', 'unrelated'],
}
beforeEach(() => {
  vi.clearAllMocks()
  useContentStore.setState(useContentStore.getInitialState(), true)
  useAuthStore.setState(useAuthStore.getInitialState(), true)
  mocks.session.mockReturnValue({ data: { userId: 'a' }, status: 'authenticated' })
})
afterEach(cleanup)

describe('Header and navigation progress initialization', () => {
  it.each([
    ['course', (data: ProgressSnapshotResult) => <CourseHeader courseSlug="course" progressData={data} />],
    ['courses', (data: ProgressSnapshotResult) => <CoursesHeader courseSlug="course" progressData={data} />],
    ['problems', (data: ProgressSnapshotResult) => <ProblemsHeader progressData={data} />],
    ['resources', (data: ProgressSnapshotResult) => <ResourcesHeader progressData={data} />],
  ] as const)('%s header initializes the entire user snapshot and clears anonymous marks', (_, header) => {
    const { rerender } = render(header(progress))
    expect(useContentStore.getState().completedProblems).toEqual(new Set(['p1', 'p5', 'unrelated']))
    expect(useContentStore.getState().completedLessons).toEqual(new Set(['lesson', 'unrelated-lesson']))
    expect(useContentStore.getState().progressStatus).toBe('ready')
    mocks.session.mockReturnValue({ data: null, status: 'unauthenticated' })
    rerender(header({ status: 'anonymous', userId: null, completedLessons: [], completedProblems: [] }))
    expect(useContentStore.getState().completedProblems.size).toBe(0)
    expect(useContentStore.getState().progressStatus).toBe('anonymous')
  })

  it('does not let metadata-only navigation erase either progress or the authenticated user', () => {
    useContentStore.getState().hydrateProgressSnapshot(progress)
    const user = { id: 'a' } as UserWithSubscriptionsAndProgress
    useAuthStore.getState().setUser(user)
    render(<>
      <CourseNavigation courseSlug="course" allLessons={[]} allProblems={[]} />
      <ProblemsNavigation allLessons={[]} allProblems={[]} />
      <ResourcesNavigation />
    </>)
    expect(useContentStore.getState().completedProblems.size).toBe(3)
    expect(useContentStore.getState().completedLessons.size).toBe(2)
    expect(useAuthStore.getState().user).toBe(user)
    expect(useContentStore.getState().currentLessonProgress).toBe(0)
    expect(useContentStore.getState().currentProblemProgress).toBe(0)
  })

  it('passes initial progress failure through the course header without throwing away public children', async () => {
    mocks.curriculum.mockResolvedValue({
      user: null, progress: { status: 'unavailable', userId: 'a', message: 'Retry' },
      curriculum: [], lessons: [], problems: [],
    })
    const element = await CourseHeaderServer({ params: { courseSlug: 'course' } })
    render(element)
    expect(useContentStore.getState()).toMatchObject({ progressOwnerId: 'a', progressStatus: 'unavailable' })
  })

  it('does not replace confirmations when an action revalidates the mounted header', () => {
    const { rerender } = render(<CourseHeader courseSlug="course" progressData={progress} />)
    act(() => {
      const token = useContentStore.getState().beginProblemSave('a', 'p1')!
      useContentStore.getState().finishProblemSave('a', 'p1', token, false)
    })
    rerender(<CourseHeader courseSlug="course" progressData={{ ...progress }} />)
    expect(useContentStore.getState().completedProblems).toEqual(new Set(['p5', 'unrelated']))
  })
})
