'use client'

import type { ProblemContent } from '@/types'
import { useCallback, useEffect, useState } from 'react'

type State =
  | { status: 'loading' }
  | { status: 'ready'; content: ProblemContent }
  | { status: 'error' }

// Loads one problem's question and answer when the bank drawer opens it.
// Results are kept for the session so stepping back and forth doesn't refetch.
const cache = new Map<string, ProblemContent>()
const inFlight = new Map<string, Promise<ProblemContent>>()

// Holding an arrow key steps through problems many times a second; only fetch
// once the drawer settles so the site-wide per-IP rate limit is not consumed.
export const PROBLEM_CONTENT_SETTLE_MS = 150

function loadProblemContent(problemId: string): Promise<ProblemContent> {
  const cached = cache.get(problemId)
  if (cached) return Promise.resolve(cached)
  const pending = inFlight.get(problemId)
  if (pending) return pending
  const request = fetch(`/api/problems/${encodeURIComponent(problemId)}/content`)
    .then(async (response) => {
      if (!response.ok) throw new Error(`Problem content request failed: ${response.status}`)
      const content = (await response.json()) as ProblemContent
      if (content.id !== problemId) throw new Error('Problem content mismatch')
      cache.set(problemId, content)
      return content
    })
    .finally(() => inFlight.delete(problemId))
  inFlight.set(problemId, request)
  return request
}

/** Warm the cache for a neighbour so prev/next opens without a loading state. */
export function prefetchProblemContent(problemId: string | undefined) {
  if (!problemId || cache.has(problemId)) return
  loadProblemContent(problemId).catch(() => {})
}

export function useProblemContent(problemId: string) {
  const [state, setState] = useState<State>(() => {
    const cached = cache.get(problemId)
    return cached ? { status: 'ready', content: cached } : { status: 'loading' }
  })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const cached = cache.get(problemId)
    if (cached) {
      setState({ status: 'ready', content: cached })
      return
    }
    let active = true
    setState({ status: 'loading' })
    // A shared in-flight request may serve other consumers, so it is not aborted;
    // a late result for a problem this drawer has left is simply ignored.
    const timer = setTimeout(() => {
      loadProblemContent(problemId).then(
        (content) => { if (active) setState({ status: 'ready', content }) },
        () => { if (active) setState({ status: 'error' }) },
      )
    }, attempt === 0 ? PROBLEM_CONTENT_SETTLE_MS : 0)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [problemId, attempt])

  const retry = useCallback(() => setAttempt((value) => value + 1), [])
  return { ...state, retry }
}

export function clearProblemContentCacheForTests() {
  cache.clear()
  inFlight.clear()
}
