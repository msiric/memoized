'use server'

import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import {
  markLessonProgress,
  MarkLessonArgs as ServiceMarkLessonArgs,
} from '@/services/lesson'
import { createCustomError } from '@/utils/error'
import { createCustomResponse } from '@/utils/response'
import { getServerSession } from 'next-auth'

export type MarkLessonArgs = {
  lessonId?: string
  completed: boolean
}

// Create tests for this method using Vitest. AI!
export async function markLesson({ lessonId, completed }: MarkLessonArgs) {
  try {
    const session = await getServerSession(authOptions)

    if (!session)
      return createCustomError({
        message: 'Failed to retrieve user session',
        showSnackbar: true,
      })

    if (!lessonId)
      return createCustomError({
        message: 'Failed to retrieve lesson',
        showSnackbar: true,
      })

    const userId = session.userId

    await markLessonProgress({
      userId,
      lessonId,
      completed,
    } as ServiceMarkLessonArgs)

    return createCustomResponse({
      message: `Lesson marked as ${completed ? 'complete' : 'incomplete'}`,
      showSnackbar: true,
    })
  } catch (error) {
    return createCustomError({
      message: 'Failed to update lesson status',
      showSnackbar: true,
      error,
    })
  }
}
