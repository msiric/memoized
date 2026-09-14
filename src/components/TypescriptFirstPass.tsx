'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import clsx from 'clsx'
import { getProgressSnapshot } from '@/actions/getProgressSnapshot'
import { CONTENT_COLUMN_CLASSES } from '@/constants/content-layout'
import { useContentStore } from '@/contexts/progress'
import {
  firstPassHref,
  firstUnmarkedStep,
  resolveFirstPassSelection,
  TS_BASICS_HREF,
  TS_FIRST_PASS_ID,
  TS_FIRST_PASS_STEPS,
  type FirstPassStepId,
  type PathQueryValue,
} from '@/lib/typescript-first-pass'
import { reportErrorSafely } from '@/lib/sentry'
import type { TypescriptFirstPass as FirstPassData } from '@/types/guided-path'
import { ProblemCard } from './ProblemCard'
import { Button } from './Button'

type ProgressResult = Awaited<ReturnType<typeof getProgressSnapshot>>

export function TypescriptFirstPass({
  path,
  initialProgress,
  requestedStep,
  header,
}: {
  path: FirstPassData
  initialProgress: ProgressResult
  requestedStep: PathQueryValue
  header: ReactNode
}) {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const searchKey = useSearchParams()?.toString() ?? ''
  const ownerId = useContentStore(state => state.progressOwnerId)
  const storeStatus = useContentStore(state => state.progressStatus)
  const completed = useContentStore(state => state.completedProblems)
  const hydrate = useContentStore(state => state.hydrateProgressSnapshot)
  const hydrateFromHeader = useContentStore(state => state.hydrateProgressFromHeader)
  const unavailable = useContentStore(state => state.setProgressUnavailable)
  const firstStep = TS_FIRST_PASS_STEPS[0].id
  const initialDefault = initialProgress.status === 'ready'
    ? firstUnmarkedStep(path.questions, new Set(initialProgress.completedProblems)) ?? firstStep
    : firstStep
  const initialSelection = resolveFirstPassSelection(requestedStep, '', initialDefault)
  const [activeStep, setActiveStep] = useState<FirstPassStepId>(initialSelection.step)
  const [notice, setNotice] = useState<string | null>(initialSelection.notice)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(
    initialProgress.status === 'unavailable' ? initialProgress.message : null,
  )
  const sessionRef = useRef(session)
  sessionRef.current = session
  const refreshInFlight = useRef<{ owner: string; epoch: number } | null>(null)
  const requestEpoch = useRef(0)
  const initializedOwner = useRef<string | null | undefined>(undefined)
  const initialOwnership = useRef<{ owner: string | null; epoch: number } | null>(null)
  const activeRef = useRef(activeStep)
  activeRef.current = activeStep
  const mounted = useRef(true)
  const focusRequest = useRef<number | null>(null)
  const question = path.questions.find(item => item.stepId === activeStep)
  const activeIndex = path.questions.findIndex(item => item.stepId === activeStep)
  const previousQuestion = path.questions[activeIndex - 1]
  const nextQuestion = path.questions[activeIndex + 1]
  const progressStatus = sessionStatus === 'loading'
    ? 'loading'
    : sessionStatus === 'unauthenticated'
      ? 'anonymous'
      : ownerId !== session?.userId
        ? storeStatus === 'unavailable' ? 'unavailable' : 'loading'
        : storeStatus
  const ready = progressStatus === 'ready'
  const markedCount = ready ? path.questions.filter(item => completed.has(item.id)).length : null
  const nextStep = ready ? firstUnmarkedStep(path.questions, completed) : firstStep
  const resumeQuestion = nextStep ? path.questions.find(item => item.stepId === nextStep) : null
  const questionsRef = useRef(path.questions)
  questionsRef.current = path.questions
  const initialDefaultRef = useRef(initialDefault)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      refreshInFlight.current = null
      initializedOwner.current = undefined
      if (focusRequest.current !== null) cancelAnimationFrame(focusRequest.current)
    }
  }, [])

  const focusQuestion = useCallback(() => {
    if (focusRequest.current !== null) cancelAnimationFrame(focusRequest.current)
    focusRequest.current = requestAnimationFrame(() => {
      focusRequest.current = null
      const heading = document.getElementById('guided-question-title')
      heading?.focus({ preventScroll: true })
      heading?.scrollIntoView({ block: 'start', behavior: 'auto' })
    })
  }, [])

  const navigate = useCallback((step: FirstPassStepId) => {
    const previousHref = firstPassHref(activeRef.current)
    const currentHref = `${location.pathname}${location.search}${location.hash}`
    if (currentHref !== previousHref) window.history.replaceState(null, '', previousHref)
    setActiveStep(step)
    setNotice(null)
    const href = firstPassHref(step)
    if (`${location.pathname}${location.search}${location.hash}` !== href) window.history.pushState(null, '', href)
    focusQuestion()
  }, [focusQuestion])

  useEffect(() => {
    const updateFromLocation = (moveFocus: boolean) => {
      const url = new URL(window.location.href)
      if (url.pathname !== TS_BASICS_HREF) return
      if (url.searchParams.get('path') !== TS_FIRST_PASS_ID) {
        router.refresh()
        return
      }
      const values = url.searchParams.getAll('step')
      const query = values.length > 1 ? values : values[0]
      const state = useContentStore.getState()
      const defaultStep = state.progressStatus === 'ready'
        ? firstUnmarkedStep(questionsRef.current, state.completedProblems) ?? firstStep
        : initialDefaultRef.current
      const selection = resolveFirstPassSelection(query, url.hash, defaultStep)
      setActiveStep(selection.step)
      setNotice(selection.notice)
      if (moveFocus || url.hash) focusQuestion()
    }
    updateFromLocation(false)
    const onPopState = () => updateFromLocation(true)
    window.addEventListener('popstate', onPopState)
    window.addEventListener('hashchange', onPopState)
    return () => {
      window.removeEventListener('popstate', onPopState)
      window.removeEventListener('hashchange', onPopState)
    }
  }, [firstStep, focusQuestion, router, searchKey])

  const refreshProgress = useCallback(async () => {
    const requestedOwner = sessionRef.current?.userId
    if (!requestedOwner) return
    if (refreshInFlight.current?.owner === requestedOwner) return
    const epoch = ++requestEpoch.current
    refreshInFlight.current = { owner: requestedOwner, epoch }
    const revision = useContentStore.getState().progressRevision
    setRefreshing(true)
    try {
      const result = await getProgressSnapshot()
      if (!mounted.current || epoch !== requestEpoch.current || sessionRef.current?.userId !== requestedOwner) return
      if (useContentStore.getState().progressRevision !== revision) return
      if (result.status === 'ready' && result.userId === requestedOwner) {
        if (hydrate(result, revision)) setLoadError(null)
      } else {
        unavailable(requestedOwner)
        setLoadError(result.status === 'unavailable'
          ? result.message
          : 'Your session changed. Reload the page to confirm your saved marks.')
      }
    } catch (error) {
      if (!mounted.current || epoch !== requestEpoch.current || sessionRef.current?.userId !== requestedOwner) return
      if (useContentStore.getState().progressRevision !== revision) return
      reportErrorSafely(error, { feature: 'typescript-first-pass', action: 'refresh-progress' })
      unavailable(requestedOwner)
      setLoadError('We could not load your saved marks. You can keep reading and try again.')
    } finally {
      if (refreshInFlight.current?.epoch === epoch) refreshInFlight.current = null
      if (mounted.current && epoch === requestEpoch.current) setRefreshing(false)
    }
  }, [hydrate, unavailable])

  useEffect(() => {
    if (sessionStatus === 'loading') return
    const currentOwner = sessionStatus === 'authenticated' ? session?.userId ?? null : null
    if (initializedOwner.current === currentOwner) return
    initializedOwner.current = currentOwner
    requestEpoch.current++
    useContentStore.getState().setProgressOwner(currentOwner)
    const epoch = useContentStore.getState().progressEpoch
    if (!initialOwnership.current) initialOwnership.current = { owner: currentOwner, epoch }
    setLoadError(null)
    if (!currentOwner) {
      refreshInFlight.current = null
      setRefreshing(false)
      hydrate({ userId: null, completedLessons: [], completedProblems: [] })
      setLoadError(null)
    } else {
      // An RSC bootstrap is valid only for the ownership epoch that received it.
      const canBootstrap = initialOwnership.current.owner === currentOwner &&
        initialOwnership.current.epoch === epoch && initialProgress.userId === currentOwner
      if (canBootstrap) hydrateFromHeader(initialProgress)
      if (canBootstrap && initialProgress.status === 'ready') return
      void refreshProgress()
    }
  }, [hydrate, hydrateFromHeader, initialProgress, refreshProgress, session?.userId, sessionStatus])

  useEffect(() => {
    const onFocus = () => { if (document.visibilityState === 'visible') void refreshProgress() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [refreshProgress])

  const stepClick = (event: MouseEvent<HTMLAnchorElement>, step: FirstPassStepId) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return
    event.preventDefault()
    navigate(step)
  }

  if (!question || activeIndex < 0 || (nextStep && !resumeQuestion)) {
    throw new Error('The selected core question is unavailable')
  }

  return (
    <article className={clsx(CONTENT_COLUMN_CLASSES, 'pb-10 pt-8')} data-guided-path={path.id} data-path-version={path.version}>
      {header}
      <div className="mb-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-lime-700 dark:text-lime-300">Four core questions</p>
        <h1 className="mb-4 text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">TypeScript first pass</h1>
        <p className="text-sm leading-7 text-zinc-600 dark:text-zinc-300">
          Practice explaining what the checker catches and what JavaScript still needs to check at runtime.
        </p>
        <Link href={path.lessonHref} prefetch={false} className="mt-4 inline-block text-sm font-medium text-lime-700 underline underline-offset-4 dark:text-lime-300">
          Open the full lesson
        </Link>
      </div>

      <details className="mb-6 rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
        <summary className="cursor-pointer text-sm font-semibold text-zinc-900 dark:text-white">Preparation options</summary>
        <div className="mt-3 space-y-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
          <p>Already comfortable with JavaScript functions and objects? Start with a question. If TypeScript is new, use its free worked explanation to prepare, then close it and try explaining a changed example.</p>
          <p>The <Link href={`${path.lessonHref}#setting-up-type-script`} prefetch={false} className="text-lime-700 underline dark:text-lime-300">Premium lesson walkthrough</Link> includes the complete local compiler fixture. That manual exercise is not run or counted here.</p>
          <p>Need a JavaScript refresher? Review <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions#defining_functions" target="_blank" rel="noopener noreferrer" className="text-lime-700 underline dark:text-lime-300">defining and calling functions</a> or <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Working_with_objects#objects_and_properties" target="_blank" rel="noopener noreferrer" className="text-lime-700 underline dark:text-lime-300">object properties</a>. Return when you can write a small function and read two object properties.</p>
        </div>
      </details>

      <section aria-label="Core question progress" className="mb-6 rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
        <p className="text-lg font-semibold text-zinc-900 dark:text-white" data-path-count>
          {progressStatus === 'anonymous' ? 'Sign in to save your marks'
            : progressStatus === 'loading' ? 'Loading saved marks...'
              : !ready ? 'Saved marks unavailable'
                : `${markedCount}/4 marked complete`}
        </p>
        <p className="mt-2 text-xs leading-6 text-zinc-500 dark:text-zinc-400">
          These are your existing question checkmarks, not verified mastery or proof that you ran the local exercise.
        </p>
        {refreshing && <p role="status" className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">Refreshing saved marks...</p>}
        {progressStatus === 'unavailable' && (
          <div className="mt-3" role="status">
            <p className="text-sm text-amber-700 dark:text-amber-300">{loadError ?? 'Saved marks could not be loaded. The questions and feedback are still available.'}</p>
            <button type="button" disabled={refreshing} onClick={() => void refreshProgress()} className="mt-2 rounded-md border border-zinc-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200">Retry saved marks</button>
          </div>
        )}
        <div className="mt-4">
          <Button onClick={() => navigate(nextStep ?? firstStep)} className="max-w-full whitespace-normal text-left">
            {!ready ? 'Read the first question' : resumeQuestion
              ? `Continue: ${resumeQuestion.title}`
              : 'Review from the first question'}
          </Button>
        </div>
        {ready && markedCount === 4 && <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">All four questions are marked complete. Review any of them without resetting your history.</p>}
        <details className="mt-5">
          <summary className="cursor-pointer text-sm font-semibold text-zinc-900 dark:text-white">All four questions</summary>
          <nav aria-label="TypeScript first-pass questions">
            <ol className="mt-3 space-y-2">
              {path.questions.map((item, index) => (
                <li key={item.id}>
                  <a href={firstPassHref(item.stepId)} onClick={event => stepClick(event, item.stepId)}
                    aria-current={item.stepId === activeStep ? 'step' : undefined}
                    className={clsx('block rounded-lg border p-3 text-sm',
                      item.stepId === activeStep ? 'border-lime-500 bg-lime-50 text-zinc-900 dark:bg-lime-500/5 dark:text-white' : 'border-zinc-200 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300')}>
                    <span>{index + 1}. {item.title}</span>
                    <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
                      {!ready ? 'Saved status not available' : completed.has(item.id) ? 'Marked complete' : 'Not marked complete'}
                    </span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </details>
      </section>

      {notice && <p role="status" className="mb-5 rounded-lg border border-amber-300 p-3 text-sm text-amber-800 dark:border-amber-700 dark:text-amber-200">{notice}</p>}
      <section aria-label="Current core question">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Question {activeIndex + 1} of 4</p>
        <ProblemCard key={question.id} problem={question} defaultExpanded headingLevel={2} headingId="guided-question-title" />
        <nav aria-label="Question navigation" className="mt-5 grid grid-cols-2 gap-4">
          <button type="button" disabled={!previousQuestion} onClick={previousQuestion ? () => navigate(previousQuestion.stepId) : undefined}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 disabled:opacity-40 dark:border-zinc-600 dark:text-zinc-200">Previous question</button>
          <button type="button" disabled={!nextQuestion} onClick={nextQuestion ? () => navigate(nextQuestion.stepId) : undefined}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 disabled:opacity-40 dark:border-zinc-600 dark:text-zinc-200">Next question</button>
        </nav>
        <p className="mt-3 text-xs leading-6 text-zinc-500 dark:text-zinc-400">Saving a mark keeps this question open. You choose when to move on.</p>
      </section>

      <section aria-label="Optional follow-through" className="mt-10 border-t border-zinc-200 pt-6 dark:border-zinc-700">
        <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-white">Optional follow-through</h2>
        <p className="mb-4 text-sm leading-7 text-zinc-600 dark:text-zinc-300">The advanced question and reference stay available. Neither adds to the four-question count or changes your existing lesson mark.</p>
        <div className="flex flex-col gap-3 text-sm">
          <Link href={path.optionalQuestion.href} prefetch={false} className="text-lime-700 underline underline-offset-4 dark:text-lime-300">{path.optionalQuestion.title} (free question)</Link>
          <Link href={`${path.lessonHref}#classes-and-inheritance`} prefetch={false} className="text-lime-700 underline underline-offset-4 dark:text-lime-300">Lesson reference (Premium)</Link>
        </div>
      </section>
    </article>
  )
}
