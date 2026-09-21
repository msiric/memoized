import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { CourseCard, type CourseCardProps } from './CourseCard'

afterEach(cleanup)

const course: CourseCardProps = {
  slug: 'js-track', href: '/courses/js-track', title: 'JavaScript', description: 'Course description',
  lessons: { total: 10, free: 2, premium: 8 },
  problems: { total: 50, byDifficulty: {} },
  progress: {
    lessonProgress: { completed: 4, total: 10, percentage: 40 },
    problemProgress: { completed: 10, total: 50, percentage: 20 },
  },
}

describe('course completion scope', () => {
  it('labels the unchanged all-problem counter and includes optional work in its explanation', () => {
    render(<CourseCard {...course} />)
    expect(screen.getByText('all problems')).toBeInTheDocument()
    expect(screen.getByText('20%')).toBeInTheDocument()
    expect(screen.getByText('40%')).toBeInTheDocument()
    expect(screen.getByText(/counts your marks across the full course, including optional practice/)).toBeInTheDocument()
  })

  it('does not claim to have saved marks for an anonymous visitor', () => {
    render(<CourseCard {...course} progress={null} />)
    expect(screen.queryByText(/counts your marks/)).not.toBeInTheDocument()
    expect(screen.getByText('all problems')).toBeInTheDocument()
  })
})
