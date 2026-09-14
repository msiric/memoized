'use server'

import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { reportErrorSafely } from '@/lib/sentry'
import { getUserProgressSnapshot } from '@/services/user'
import type { ProgressSnapshotResult } from '@/types/progress'
import { getServerSession } from 'next-auth'

export async function getProgressSnapshot(): Promise<ProgressSnapshotResult> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return { status: 'anonymous', userId: null, completedLessons: [], completedProblems: [] }
  }
  if (!session.userId) {
    reportErrorSafely('Authenticated session is missing a user ID', { feature: 'progress', action: 'read-snapshot' })
    return { status: 'unavailable', userId: null, message: 'Your session could not be loaded. Please sign in again.' }
  }
  return getUserProgressSnapshot(session.userId)
}
