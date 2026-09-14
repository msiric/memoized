'use client'

import { markProblem } from '@/actions/markProblem'
import { useAuthStore } from '@/contexts/auth'
import { useContentStore } from '@/contexts/progress'
import { handleError } from '@/lib/sentry'
import type { UserWithSubscriptionsAndProgress } from '@/types'
import type { ProgressSnapshotResult } from '@/types/progress'
import { handleResponse } from '@/utils/response'
import { useSession } from 'next-auth/react'
import { enqueueSnackbar } from 'notistack'
import { useCallback, useEffect, useRef, useState } from 'react'

const useProgressSession = () => {
  const { data: session, status } = useSession()
  const userId = session?.userId ?? (status === 'unauthenticated' ? null : undefined)
  useEffect(() => {
    if (userId !== undefined) useContentStore.getState().setProgressOwner(userId)
  }, [userId])
  return userId
}

export function useProgressInitialization(
  progress: ProgressSnapshotResult | undefined,
  userData: UserWithSubscriptionsAndProgress | null | undefined,
) {
  const userId = useProgressSession()
  const sourceEpoch = useRef<{ progress: ProgressSnapshotResult; epoch: number } | null>(null)
  useEffect(() => {
    if (userId === undefined) return
    const state = useContentStore.getState()
    // A mounted header's undated payload must not survive an account round trip.
    if (progress && sourceEpoch.current?.progress !== progress) {
      sourceEpoch.current = { progress, epoch: state.progressEpoch }
    }
    if (!progress || progress.userId !== userId || sourceEpoch.current?.epoch !== state.progressEpoch) {
      useAuthStore.getState().setUser(null)
      return
    }
    state.hydrateProgressFromHeader(progress)
    useAuthStore.getState().setUser(progress.status === 'ready' ? userData ?? null : null)
  }, [progress, userData, userId])
}

export function useProblemCompletion(problemId: string) {
  const userId = useProgressSession()
  const currentUserId = useRef(userId)
  currentUserId.current = userId
  const ownerId = useContentStore((state) => state.progressOwnerId)
  const status = useContentStore((state) => state.progressStatus)
  const epoch = useContentStore((state) => state.progressEpoch)
  const marked = useContentStore((state) => state.completedProblems.has(problemId))
  const pending = useContentStore((state) => state.pendingProblems.has(problemId))
  const openModal = useAuthStore((state) => state.openModal)
  const [failure, setFailure] = useState<{ userId: string; epoch: number; problemId: string; message: string } | null>(null)
  const isReady = typeof userId === 'string' && ownerId === userId && status === 'ready'
  const isPending = ownerId === userId && pending
  const error = failure && failure.userId === userId && failure.epoch === epoch && failure.problemId === problemId
    ? failure.message
    : null

  const setCompleted = useCallback(async (completed: boolean): Promise<boolean> => {
    if (userId === null) {
      openModal()
      return false
    }
    if (userId === undefined) return false
    const state = useContentStore.getState()
    const token = state.beginProblemSave(userId, problemId)
    if (token === null) return false
    const saveEpoch = state.progressEpoch
    setFailure(null)
    const stillCurrent = () => currentUserId.current === userId &&
      useContentStore.getState().progressOwnerId === userId &&
      useContentStore.getState().progressEpoch === saveEpoch
    try {
      const response = await markProblem({ problemId, completed, expectedUserId: userId })
      if (!stillCurrent()) return false
      if (!response.success) {
        const message = response.message || 'Failed to save progress. Please try again.'
        setFailure({ userId, epoch: saveEpoch, problemId, message })
        handleError({ ...response, message, showSnackbar: true }, enqueueSnackbar)
        return false
      }
      if (!('userId' in response) || response.userId !== userId ||
          response.problemId !== problemId || response.completed !== completed) {
        throw new Error('Your account or save confirmation changed. Refresh and try again.')
      }
      if (!useContentStore.getState().finishProblemSave(userId, problemId, token, completed)) return false
      handleResponse(response, enqueueSnackbar)
      return true
    } catch (error) {
      if (!stillCurrent()) return false
      const message = 'Failed to save progress. Please refresh or try again.'
      setFailure({ userId, epoch: saveEpoch, problemId, message })
      handleError(error, enqueueSnackbar)
      enqueueSnackbar(message, { variant: 'error' })
      return false
    } finally {
      useContentStore.getState().finishProblemSave(userId, problemId, token)
    }
  }, [userId, problemId, openModal])

  return {
    isCompleted: isReady && marked,
    isPending,
    isDisabled: isPending || (userId !== null && !isReady),
    error,
    setCompleted,
  }
}
