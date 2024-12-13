import { describe, it, expect, vi, beforeEach } from 'vitest'
import { markLesson } from './markLesson'
import { getServerSession } from 'next-auth'
import { markLessonProgress } from '@/services/lesson'
import { ServiceError } from '@/utils/error'

vi.mock('next-auth')
vi.mock('@/services/lesson')

describe('markLesson', () => {
  const mockLessonProgress = {
    userId: 'user_123',
    lessonId: 'lesson_123',
    completed: true,
    id: 'id_123',
    completedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should mark lesson as complete successfully', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { email: 'test@example.com' },
      userId: 'user_123',
    })
    vi.mocked(markLessonProgress).mockResolvedValue(mockLessonProgress)

    const result = await markLesson({
      lessonId: 'lesson_123',
      completed: true,
    })

    expect(result.success).toBe(true)
    expect(result.message).toBe('Lesson marked as complete')
    expect(markLessonProgress).toHaveBeenCalledWith({
      userId: 'user_123',
      lessonId: 'lesson_123',
      completed: true,
    })
  })

  it('should mark lesson as incomplete successfully', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { email: 'test@example.com' },
      userId: 'user_123',
    })
    vi.mocked(markLessonProgress).mockResolvedValue(mockLessonProgress)

    const result = await markLesson({
      lessonId: 'lesson_123',
      completed: false,
    })

    expect(result.success).toBe(true)
    expect(result.message).toBe('Lesson marked as incomplete')
  })

  it('should return error if user session is not found', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const result = await markLesson({
      lessonId: 'lesson_123',
      completed: true,
    })

    expect(result.success).toBe(false)
    expect(result.message).toBe('Failed to retrieve user session')
  })

  it('should return error if lessonId is not provided', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { email: 'test@example.com' },
      userId: 'user_123',
    })

    const result = await markLesson({
      lessonId: undefined,
      completed: true,
    })

    expect(result.success).toBe(false)
    expect(result.message).toBe('Failed to retrieve lesson')
  })

  it('should handle service errors', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { email: 'test@example.com' },
      userId: 'user_123',
    })
    vi.mocked(markLessonProgress).mockRejectedValue(
      new ServiceError('Service error', true),
    )

    const result = await markLesson({
      lessonId: 'lesson_123',
      completed: true,
    })

    expect(result.success).toBe(false)
    expect(result.message).toBe('Failed to update lesson status')
  })
})
