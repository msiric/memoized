'use server'

import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import {
  markProblemProgress,
  MarkProblemArgs as ServiceMarkProblemArgs,
} from '@/services/problem'
import { createCustomError } from '@/utils/error'
import { createCustomResponse } from '@/utils/response'
import { getServerSession } from 'next-auth'

export type MarkProblemArgs = {
  problemId?: string
  completed: boolean
}

export async function markProblem({ problemId, completed }: MarkProblemArgs) {
  try {
    const session = await getServerSession(authOptions)

    if (!session)
      return createCustomError({
        message: 'Failed to retrieve user session',
        showSnackbar: true,
      })
    if (!problemId)
      return createCustomError({
        message: 'Failed to retrieve practice problem',
        showSnackbar: true,
      })

    const userId = session.userId

    await markProblemProgress({
      userId,
      problemId,
      completed,
    } as ServiceMarkProblemArgs)

    return createCustomResponse({
      message: `Practice problem marked as ${completed ? 'complete' : 'incomplete'}`,
      showSnackbar: true,
    })
  } catch (error) {
    return createCustomError({
      message: 'Failed to update practice problem status',
      showSnackbar: true,
    })
  }
}
