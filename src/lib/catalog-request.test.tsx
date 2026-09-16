import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getPublicCatalogStats } from '@/services/catalog-stats'
import { getActiveCoursesWithProgress } from '@/services/course'
import { getProblems } from '@/services/problem'
import { reportErrorSafely } from '@/lib/sentry'
import {
  getCatalogStatsSnapshot,
  getCoursesSnapshot,
  getProblemBankSnapshot,
} from './catalog-request'
import CoursesPage from '@/app/courses/(courses)/page'
import { generateMetadata as courseMetadata } from '@/app/courses/(courses)/layout'
import PremiumPage from '@/app/premium/page'
import { generateMetadata as premiumMetadata } from '@/app/premium/layout'
import ProblemsPage from '@/app/problems/@table/page'
import { generateMetadata as problemMetadata } from '@/app/problems/layout'

// Vitest runs client React, not the RSC dispatcher. Model the request boundary
// explicitly and exercise the actual shared wrapper, metadata and page consumers.
const request = vi.hoisted(() => ({
  values: new Map<
    (...args: unknown[]) => unknown,
    { args: unknown[]; value: unknown }[]
  >(),
}))

vi.mock('react', async (importOriginal) => {
  const react = await importOriginal<typeof import('react')>()
  return {
    ...react,
    cache:
      (fn: (...args: unknown[]) => unknown) =>
      (...args: unknown[]) => {
        const entries = request.values.get(fn) ?? []
        const previous = entries.find(
          (entry) =>
            entry.args.length === args.length &&
            entry.args.every((value, index) => Object.is(value, args[index])),
        )
        if (previous) return previous.value
        const value = fn(...args)
        entries.push({ args, value })
        request.values.set(fn, entries)
        return value
      },
  }
})

vi.mock('@/services/catalog-stats', () => ({ getPublicCatalogStats: vi.fn() }))
vi.mock('@/services/course', () => ({ getActiveCoursesWithProgress: vi.fn() }))
vi.mock('@/services/problem', () => ({ getProblems: vi.fn() }))
vi.mock('@/lib/sentry', () => ({ reportErrorSafely: vi.fn() }))
vi.mock('@/services/stripe', () => ({
  retrieveStripeSession: vi.fn(),
  getActiveCoupons: vi.fn(async () => []),
  getActiveProducts: vi.fn(async () => []),
}))
vi.mock('@/services/user', () => ({ getUserWithSubscriptionDetails: vi.fn() }))
vi.mock('next-auth', () => ({ getServerSession: vi.fn(async () => null) }))
vi.mock('@/app/api/auth/[...nextauth]/route', () => ({ authOptions: {} }))
vi.mock('next/dynamic', () => ({ default: () => () => null }))
vi.mock('@/app/courses/(courses)/providers', () => ({
  CoursesProviders: () => null,
}))
vi.mock('@/app/problems/providers', () => ({ ProblemProviders: () => null }))
vi.mock('@/app/premium/providers', () => ({ PremiumProviders: () => null }))
vi.mock('@/components/PricingTable', () => ({ PricingTable: () => null }))
vi.mock('@/components/TimeLimitedOffer', () => ({
  TimeLimitedOffer: () => null,
}))
vi.mock('@/components/PricingUrgencyMessages', () => ({
  PricingUrgencyMessages: () => null,
}))
vi.mock('@/components/CourseCard', () => ({
  CourseCard: ({ title, problems }: any) => (
    <div data-testid="course-card">
      {title}: {problems.total}
    </div>
  ),
}))
vi.mock('@/components/ProblemList', () => ({
  ProblemList: ({ allProblems, filteredProblems }: any) => (
    <div>
      <div data-testid="all-problems">{allProblems.length}</div>
      <div data-testid="filtered-problems">
        {filteredProblems.map((p: any) => p.id).join(',')}
      </div>
    </div>
  ),
}))

const baseline = {
  courses: 2,
  sections: 8,
  lessons: 120,
  problems: 506,
  resources: 33,
}

function courses(problems: number) {
  return [
    {
      id: 'js',
      title: 'JS',
      metadata: { lessons: { total: 60 }, problems: { total: 200 } },
    },
    {
      id: 'dsa',
      title: 'DSA',
      metadata: { lessons: { total: 60 }, problems: { total: problems - 200 } },
    },
  ] as any
}

function bank(total: number) {
  const allProblems = Array.from({ length: total }, (_, index) => ({
    id: `problem-${index}`,
    title: index === 0 ? 'Selected' : `Task ${index}`,
    difficulty: 'MEDIUM',
    type: 'CODING',
    lesson: { title: 'Lesson', slug: 'lesson' },
    problemProgress: [],
  }))
  return { allProblems, filteredProblems: allProblems, lessons: [] } as any
}

describe('request-scoped catalog consumers', () => {
  beforeEach(() => {
    request.values.clear()
    vi.clearAllMocks()
    vi.mocked(getPublicCatalogStats).mockReset().mockResolvedValue(baseline)
    vi.mocked(getActiveCoursesWithProgress)
      .mockReset()
      .mockResolvedValue(courses(506))
    vi.mocked(getProblems).mockReset().mockResolvedValue(bank(506))
  })
  afterEach(cleanup)

  it.each([506, 507])(
    'keeps course cards, headline and metadata on one %i loaded view',
    async (problems) => {
      vi.mocked(getActiveCoursesWithProgress)
        .mockResolvedValueOnce(courses(problems))
        .mockResolvedValue(courses(problems + 1))
      const [metadata, page] = await Promise.all([
        courseMetadata(),
        CoursesPage({ searchParams: {} }),
      ])
      render(page)
      expect(metadata.description).toContain(`${problems} interview problems`)
      expect(metadata.openGraph?.description).toContain(
        `${problems} interview problems`,
      )
      expect(metadata.twitter?.description).toContain(
        `${problems} interview problems`,
      )
      expect(screen.getByText(String(problems))).toBeInTheDocument()
      expect(
        screen.getAllByTestId('course-card').map((card) => card.textContent),
      ).toEqual(['JS: 200', `DSA: ${problems - 200}`])
      expect(getActiveCoursesWithProgress).toHaveBeenCalledTimes(1)
      expect(getPublicCatalogStats).not.toHaveBeenCalled()
    },
  )

  it.each([506, 507])(
    'keeps bank metadata and filtered UI on the same %i unfiltered list',
    async (problems) => {
      vi.mocked(getProblems)
        .mockResolvedValueOnce(bank(problems))
        .mockResolvedValue(bank(problems + 1))
      const [metadata, page] = await Promise.all([
        problemMetadata(),
        ProblemsPage({ searchParams: { search: 'Selected' } as any }),
      ])
      render(page)
      expect(metadata.title).toContain(`${problems} Coding Challenges`)
      expect(metadata.description).toContain(`${problems} JavaScript`)
      expect(metadata.openGraph?.description).toContain(
        `${problems} JavaScript`,
      )
      expect(metadata.twitter?.description).toContain(`${problems} JavaScript`)
      expect(screen.getByTestId('all-problems').textContent).toBe(
        String(problems),
      )
      expect(screen.getByTestId('filtered-problems').textContent).toBe(
        'problem-0',
      )
      expect(getProblems).toHaveBeenCalledTimes(1)
      expect(getProblems).toHaveBeenCalledWith()
      expect(getPublicCatalogStats).not.toHaveBeenCalled()
    },
  )

  it.each([506, 507])(
    'keeps premium metadata and stat cards on the same %i scalar snapshot',
    async (problems) => {
      vi.mocked(getPublicCatalogStats)
        .mockResolvedValueOnce({ ...baseline, problems })
        .mockResolvedValue({ ...baseline, problems: problems + 1 })
      const [metadata, page] = await Promise.all([
        premiumMetadata(),
        PremiumPage(),
      ])
      render(page)
      expect(metadata.description).toContain(`${problems} JavaScript`)
      expect(metadata.openGraph?.description).toContain(
        `${problems} JavaScript`,
      )
      expect(metadata.twitter?.description).toContain(`${problems} JavaScript`)
      expect(screen.getByText(String(problems))).toBeInTheDocument()
      expect(getPublicCatalogStats).toHaveBeenCalledTimes(1)
    },
  )

  it('does not reuse the scalar snapshot or user-aware lists across server requests', async () => {
    const first = await Promise.all([
      getProblemBankSnapshot(),
      getCoursesSnapshot(),
      getCatalogStatsSnapshot(),
    ])
    vi.mocked(getProblems).mockResolvedValue(bank(507))
    vi.mocked(getActiveCoursesWithProgress).mockResolvedValue(courses(507))
    vi.mocked(getPublicCatalogStats).mockResolvedValue({
      ...baseline,
      problems: 507,
    })
    expect(await getProblemBankSnapshot()).toBe(first[0])
    expect(await getCoursesSnapshot()).toBe(first[1])
    expect(await getCatalogStatsSnapshot()).toBe(first[2])
    request.values.clear()
    const [newBank, newCourses, newStats] = await Promise.all([
      getProblemBankSnapshot(),
      getCoursesSnapshot(),
      getCatalogStatsSnapshot(),
    ])
    expect(newBank.allProblems.length).toBe(507)
    expect(newCourses.status === 'available' && newCourses.stats.problems).toBe(
      507,
    )
    expect(newStats.status === 'available' && newStats.stats.problems).toBe(507)
  })

  it('renders an explicit course failure and evergreen metadata rather than zero or baseline claims', async () => {
    vi.mocked(getActiveCoursesWithProgress).mockRejectedValue(
      new Error('unavailable'),
    )
    const [metadata, page] = await Promise.all([
      courseMetadata(),
      CoursesPage({ searchParams: {} }),
    ])
    const { container } = render(page)
    expect(screen.getByRole('status').textContent).toContain(
      'Courses and catalog counts are unavailable',
    )
    expect(screen.queryAllByTestId('course-card')).toHaveLength(0)
    expect(container.textContent).not.toMatch(/\b(?:0|506|507)\b/)
    expect(JSON.stringify(metadata)).not.toMatch(/\b(?:0|506|507)\b/)
    expect(getActiveCoursesWithProgress).toHaveBeenCalledTimes(1)
    expect(reportErrorSafely).toHaveBeenCalledWith(
      expect.any(Error), { feature: 'catalog', action: 'read-courses' },
    )
  })

  it('renders explicit premium failure and evergreen metadata rather than zero or baseline claims', async () => {
    vi.mocked(getPublicCatalogStats).mockRejectedValue(new Error('unavailable'))
    const [metadata, page] = await Promise.all([
      premiumMetadata(),
      PremiumPage(),
    ])
    const { container } = render(page)
    expect(screen.getByRole('status').textContent).toContain(
      'Catalog counts are unavailable',
    )
    expect(container.textContent).not.toMatch(/\b(?:0|506|507)\b/)
    expect(JSON.stringify(metadata)).not.toMatch(/\b(?:0|506|507)\b/)
    expect(getPublicCatalogStats).toHaveBeenCalledTimes(1)
  })

  it('keeps a bank read failure as an error for both metadata and UI, never an empty bank', async () => {
    vi.mocked(getProblems).mockRejectedValue(new Error('unavailable'))
    const results = await Promise.allSettled([
      problemMetadata(),
      ProblemsPage({ searchParams: {} as any }),
    ])
    expect(results.map((result) => result.status)).toEqual([
      'rejected',
      'rejected',
    ])
    expect(getProblems).toHaveBeenCalledTimes(1)
  })

  it('rejects undefined or malformed scalar service data without claiming availability', async () => {
    vi.mocked(getPublicCatalogStats).mockResolvedValue(undefined as any)
    expect(await getCatalogStatsSnapshot()).toEqual({
      status: 'unavailable',
      code: 'CATALOG_STATS_UNAVAILABLE',
    })
  })
})
