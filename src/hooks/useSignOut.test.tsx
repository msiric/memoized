import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useSignOut } from './useSignOut'
import { useContentStore } from '@/contexts/progress'
import { useAuthStore } from '@/contexts/auth'
import { signOut } from 'next-auth/react'

vi.mock('next-auth/react', () => ({ signOut: vi.fn() }))
afterEach(cleanup)

it('clears personal client history and pending saves immediately on sign-out', () => {
  useContentStore.setState(useContentStore.getInitialState(), true)
  useContentStore.getState().hydrateProgressSnapshot({
    userId: 'a', completedLessons: ['lesson'], completedProblems: ['problem'],
  })
  const token = useContentStore.getState().beginProblemSave('a', 'other')!
  const { result } = renderHook(useSignOut)
  act(() => result.current.signOut())
  const state = useContentStore.getState()
  expect(state.progressStatus).toBe('anonymous')
  expect(state.progressOwnerId).toBeNull()
  expect(state.completedLessons.size).toBe(0)
  expect(state.completedProblems.size).toBe(0)
  expect(state.finishProblemSave('a', 'other', token, true)).toBe(false)
  expect(useAuthStore.getState().user).toBeNull()
  expect(signOut).toHaveBeenCalled()
})
