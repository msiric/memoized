import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Courses from '../page'
import * as courseService from '../../../../services/course'
import * as stripeService from '../../../../services/stripe'

vi.mock('../../../../services/course')
vi.mock('../../../../services/stripe')
vi.mock('../../../../components/CourseCard', () => ({
  CourseCard: () => <div data-testid="course-card" />,
}))
vi.mock('../../../../components/PremiumModal', () => ({
  PremiumModal: () => <div data-testid="premium-modal" />,
}))

describe('Courses Page', () => {
  const mockCourses = [
    {
      id: '1',
      slug: 'test-course',
      href: '/courses/test-course',
      title: 'Test Course',
      description: 'Test Description',
      progress: {
        lessonProgress: {
          completed: 1,
          total: 2,
          percentage: 50,
        },
      },
      metadata: {
        lessons: 2,
        problems: 10,
      },
    },
  ]

  it('renders the courses page with title and description', async () => {
    vi.spyOn(courseService, 'getActiveCoursesWithProgress').mockResolvedValue(mockCourses)
    
    const { container } = await render(
      <Courses searchParams={{}} />
    )

    expect(screen.getByText('Level Up Your Software Engineering Skills')).toBeInTheDocument()
    expect(screen.getByText(/Structured learning paths/)).toBeInTheDocument()
    expect(container.querySelector('.grid')).toBeInTheDocument()
  })

  it('renders course cards when courses are available', async () => {
    vi.spyOn(courseService, 'getActiveCoursesWithProgress').mockResolvedValue(mockCourses)
    
    await render(<Courses searchParams={{}} />)
    
    expect(screen.getByTestId('course-card')).toBeInTheDocument()
  })

  it('shows premium modal when premium query param is present', async () => {
    vi.spyOn(courseService, 'getActiveCoursesWithProgress').mockResolvedValue(mockCourses)
    vi.spyOn(stripeService, 'retrieveStripeSession').mockResolvedValue({
      id: 'test-session',
      status: 'complete',
    })
    
    await render(
      <Courses
        searchParams={{
          premium: 'true',
          session: 'test-session',
        }}
      />
    )
    
    expect(screen.getByTestId('premium-modal')).toBeInTheDocument()
  })

  it('handles failed course fetch gracefully', async () => {
    vi.spyOn(courseService, 'getActiveCoursesWithProgress').mockRejectedValue(new Error('Failed to fetch'))
    
    await render(<Courses searchParams={{}} />)
    
    expect(screen.queryByTestId('course-card')).not.toBeInTheDocument()
  })
})
