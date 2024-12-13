import { describe, it, expect, vi, beforeEach } from 'vitest'
import { markProblem } from './markProblem'
import { getServerSession } from 'next-auth'
import { markProblemProgress } from '@/services/problem'
import { ServiceError } from '@/utils/error'

vi.mock('next-auth')
vi.mock('@/services/problem')

describe('markProblem', () => {
  const mockProblemProgress = {
    userId: 'user_123',
    problemId: 'problem_123',
    completed: true,
    id: 'id_123',
    completedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should mark problem as complete successfully', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { email: 'test@example.com' },
      userId: 'user_123',
    })
    vi.mocked(markProblemProgress).mockResolvedValue(mockProblemProgress)

    const result = await markProblem({
      problemId: 'problem_123',
      completed: true,
    })

    expect(result.success).toBe(true)
    expect(result.message).toBe('Practice problem marked as complete')
    expect(markProblemProgress).toHaveBeenCalledWith({
      userId: 'user_123',
      problemId: 'problem_123',
      completed: true,
    })
  })

  it('should mark problem as incomplete successfully', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { email: 'test@example.com' },
      userId: 'user_123',
    })
    vi.mocked(markProblemProgress).mockResolvedValue(mockProblemProgress)

    const result = await markProblem({
      problemId: 'problem_123',
      completed: false,
    })

    expect(result.success).toBe(true)
    expect(result.message).toBe('Practice problem marked as incomplete')
  })

  it('should return error if user session is not found', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const result = await markProblem({
      problemId: 'problem_123',
      completed: true,
    })

    expect(result.success).toBe(false)
    expect(result.message).toBe('Failed to retrieve user session')
  })

  it('should return error if problemId is not provided', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { email: 'test@example.com' },
      userId: 'user_123',
    })

    const result = await markProblem({
      problemId: undefined,
      completed: true,
    })

    expect(result.success).toBe(false)
    expect(result.message).toBe('Failed to retrieve practice problem')
  })

  it('should handle service errors', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { email: 'test@example.com' },
      userId: 'user_123',
    })
    vi.mocked(markProblemProgress).mockRejectedValue(
      new ServiceError('Service error', true),
    )

    const result = await markProblem({
      problemId: 'problem_123',
      completed: true,
    })

    expect(result.success).toBe(false)
    expect(result.message).toBe('Failed to update practice problem status')
  })
})
