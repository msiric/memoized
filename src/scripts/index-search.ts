import { randomUUID } from 'node:crypto'
import { MeiliSearchApiError, type EnqueuedTask } from 'meilisearch'
import { meiliSearch } from '@/lib/meili'
import prisma from '@/lib/prisma'
import { COURSES_PREFIX } from '../constants'

const ACTIVE_INDEX = 'lessons'

type ActivationStatus = 'not_attempted' | 'failed' | 'unknown' | 'succeeded'
type RebuildPhase =
  | 'create_staging'
  | 'settings'
  | 'documents'
  | 'verify_staging'
  | 'bootstrap'
  | 'activate'
  | 'cleanup'

export type SearchIndexRebuildResult = {
  indexUid: string
  documentCount: number
  stagingIndex: string
  swapTaskUid: number
  cleanup: { status: 'succeeded'; taskUid: number }
}

export type SearchIndexRebuildProgress = Readonly<{
  phase: RebuildPhase
  stagingIndex: string
  activation: ActivationStatus
  taskUid?: number
  event: 'before-enqueue' | 'enqueued' | 'succeeded'
}>

export class SearchIndexRebuildError extends Error {
  constructor(
    readonly stagingIndex: string,
    readonly phase: RebuildPhase,
    readonly taskUid: number | undefined,
    readonly activation: ActivationStatus,
    cause: unknown,
  ) {
    super(
      `Search rebuild failed during ${phase}; activation=${activation}; ` +
        `staging=${stagingIndex}; task=${taskUid ?? 'unknown'}. ` +
        'Inspect the index and task before retrying or cleaning up. ' +
        (cause instanceof Error ? cause.message : String(cause)),
      { cause },
    )
    this.name = 'SearchIndexRebuildError'
  }
}

// The SDK's polling timeout does not bound an individual stalled HTTP request.
async function withTimeout<T>(operation: Promise<T>, timeoutMs: number) {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error(`Search task request timed out after ${timeoutMs}ms`),
            ),
          timeoutMs,
        )
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

export async function indexLessons({
  taskTimeoutMs = 300_000,
  taskIntervalMs = 250,
  onProgress,
}: {
  taskTimeoutMs?: number
  taskIntervalMs?: number
  onProgress?: (progress: SearchIndexRebuildProgress) => void
} = {}): Promise<SearchIndexRebuildResult> {
  if (
    !Number.isSafeInteger(taskTimeoutMs) ||
    taskTimeoutMs <= 0 ||
    taskTimeoutMs > 2_147_483_647 ||
    !Number.isSafeInteger(taskIntervalMs) ||
    taskIntervalMs <= 0 ||
    taskIntervalMs > taskTimeoutMs
  ) {
    throw new Error(
      'Search task timeout and polling interval must be positive, bounded milliseconds',
    )
  }

  const lessons = await prisma.lesson.findMany({
    select: {
      id: true,
      title: true,
      description: true,
      body: true,
      access: true,
      slug: true,
      section: {
        select: { course: { select: { slug: true } }, title: true, slug: true },
      },
    },
  })

  if (lessons.length === 0) {
    throw new Error('Refusing to publish an empty lessons search index')
  }

  const documentsToIndex = lessons.map((lesson) => ({
    id: lesson.id,
    title: lesson.title,
    description: lesson.description,
    body: lesson.body,
    access: lesson.access,
    sectionTitle: lesson.section.title,
    href: `${COURSES_PREFIX}/${lesson.section.course.slug}/${lesson.section.slug}/${lesson.slug}`,
  }))

  let activeIndex
  try {
    activeIndex = await meiliSearch.getIndex(ACTIVE_INDEX)
  } catch (error) {
    if (
      !(error instanceof MeiliSearchApiError) ||
      error.code !== 'index_not_found'
    ) {
      throw error
    }
  }
  const settings = activeIndex ? await activeIndex.getSettings() : {}
  const stagingIndex = `${ACTIVE_INDEX}_staging_${randomUUID()}`
  let phase: RebuildPhase = 'create_staging'
  let taskUid: number | undefined
  let activation: ActivationStatus = 'not_attempted'

  // The callback must persist synchronously; throwing prevents the next request.
  const reportProgress = (
    event: SearchIndexRebuildProgress['event'],
    reportedActivation = activation,
  ) => {
    onProgress?.({
      phase,
      stagingIndex,
      activation: reportedActivation,
      ...(taskUid === undefined ? {} : { taskUid }),
      event,
    })
  }

  const runTask = async (
    nextPhase: RebuildPhase,
    enqueue: () => Promise<EnqueuedTask>,
  ) => {
    phase = nextPhase
    taskUid = undefined
    // A durable intent cannot prove whether a request was sent before a crash.
    reportProgress(
      'before-enqueue',
      nextPhase === 'activate' ? 'unknown' : activation,
    )
    if (nextPhase === 'activate') activation = 'unknown'
    let queued: EnqueuedTask
    try {
      queued = await withTimeout(enqueue(), taskTimeoutMs)
    } catch (error) {
      if (
        nextPhase === 'activate' &&
        error instanceof MeiliSearchApiError &&
        error.httpStatus >= 400 &&
        error.httpStatus < 500 &&
        error.httpStatus !== 408
      ) {
        activation = 'failed'
      }
      throw error
    }
    taskUid = queued.taskUid
    reportProgress('enqueued')
    const task = await withTimeout(
      meiliSearch.waitForTask(taskUid, {
        timeOutMs: taskTimeoutMs,
        intervalMs: taskIntervalMs,
      }),
      taskTimeoutMs,
    )
    if (task.status !== 'succeeded') {
      if (
        nextPhase === 'activate' &&
        (task.status === 'failed' || task.status === 'canceled')
      ) {
        activation = 'failed'
      }
      throw new Error(
        `Meilisearch task ${taskUid} ${task.status}: ` +
          (task.error
            ? `${task.error.code}: ${task.error.message}`
            : 'terminal success was not confirmed'),
      )
    }
    if (nextPhase === 'activate') activation = 'succeeded'
    reportProgress('succeeded')
    return taskUid
  }

  try {
    await runTask('create_staging', () =>
      meiliSearch.createIndex(stagingIndex, { primaryKey: 'id' }),
    )
    const staging = meiliSearch.index(stagingIndex)
    await runTask('settings', () =>
      staging.updateSettings({
        ...settings,
        filterableAttributes: [
          ...new Set([...(settings.filterableAttributes ?? []), 'access']),
        ],
      }),
    )
    await runTask('documents', () => staging.addDocuments(documentsToIndex))

    phase = 'verify_staging'
    taskUid = undefined
    const [stats, filterableAttributes] = await Promise.all([
      staging.getStats(),
      staging.getFilterableAttributes(),
    ])
    if (
      stats.isIndexing ||
      stats.numberOfDocuments !== documentsToIndex.length ||
      !filterableAttributes.includes('access')
    ) {
      throw new Error(
        `Staging index is not ready: documents=${stats.numberOfDocuments}, ` +
          `expected=${documentsToIndex.length}, isIndexing=${stats.isIndexing}, ` +
          `accessFilter=${filterableAttributes.includes('access')}`,
      )
    }
    reportProgress('succeeded')

    // Swapping requires both indexes. Bootstrap only after staging is ready.
    if (!activeIndex) {
      await runTask('bootstrap', () =>
        meiliSearch.createIndex(ACTIVE_INDEX, { primaryKey: 'id' }),
      )
    }

    const swapTaskUid = await runTask('activate', () =>
      meiliSearch.swapIndexes([{ indexes: [ACTIVE_INDEX, stagingIndex] }]),
    )

    // Only a confirmed swap makes staging the old index and safe to remove.
    const cleanupTaskUid = await runTask('cleanup', () =>
      meiliSearch.deleteIndex(stagingIndex),
    )

    return {
      indexUid: ACTIVE_INDEX,
      documentCount: documentsToIndex.length,
      stagingIndex,
      swapTaskUid,
      cleanup: { status: 'succeeded', taskUid: cleanupTaskUid },
    }
  } catch (error) {
    // In particular, never delete staging or retry/reverse an uncertain swap.
    throw new SearchIndexRebuildError(
      stagingIndex,
      phase,
      taskUid,
      activation,
      error,
    )
  }
}

if (require.main === module) {
  indexLessons()
    .then(({ documentCount }) => {
      console.log(`Indexing complete: ${documentCount} lessons`)
    })
    .finally(() => prisma.$disconnect())
    .catch((error) => {
      console.error(error)
      process.exitCode = 1
    })
}
