import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MeiliSearchApiError } from 'meilisearch'
import {
  indexLessons,
  SearchIndexRebuildError,
  type SearchIndexRebuildProgress,
} from './index-search'

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  disconnect: vi.fn(),
  getIndex: vi.fn(),
  getSettings: vi.fn(),
  createIndex: vi.fn(),
  index: vi.fn(),
  updateSettings: vi.fn(),
  addDocuments: vi.fn(),
  getStats: vi.fn(),
  getFilterableAttributes: vi.fn(),
  waitForTask: vi.fn(),
  swapIndexes: vi.fn(),
  deleteIndex: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  default: {
    lesson: { findMany: mocks.findMany },
    $disconnect: mocks.disconnect,
  },
}))

vi.mock('@/lib/meili', () => ({
  meiliSearch: {
    getIndex: mocks.getIndex,
    createIndex: mocks.createIndex,
    index: mocks.index,
    waitForTask: mocks.waitForTask,
    swapIndexes: mocks.swapIndexes,
    deleteIndex: mocks.deleteIndex,
  },
}))

const lessons = [
  {
    id: 'lesson-1',
    title: 'Introduction to JavaScript',
    description: 'Learn the basics of JavaScript',
    body: 'JavaScript is a programming language...',
    access: 'FREE',
    slug: 'intro-javascript',
    section: {
      title: 'JavaScript Fundamentals',
      slug: 'js-fundamentals',
      course: { slug: 'web-development' },
    },
  },
  {
    id: 'lesson-2',
    title: 'Advanced Functions',
    description: null,
    body: '',
    access: 'PREMIUM',
    slug: 'advanced-functions',
    section: {
      title: 'Advanced Concepts',
      slug: 'advanced-concepts',
      course: { slug: 'javascript-mastery' },
    },
  },
]

function apiError(code: string, status: number) {
  return new MeiliSearchApiError(
    { code, message: code, type: 'invalid_request', link: '' },
    status,
  )
}

function stagingUid() {
  return mocks.createIndex.mock.calls[0][0] as string
}

function expectNoActivationOrCleanup() {
  expect(mocks.swapIndexes).not.toHaveBeenCalled()
  expect(mocks.deleteIndex).not.toHaveBeenCalled()
  expect(mocks.createIndex).not.toHaveBeenCalledWith(
    'lessons',
    expect.anything(),
  )
}

describe('indexLessons', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.findMany.mockResolvedValue(lessons)
    mocks.getIndex.mockResolvedValue({ getSettings: mocks.getSettings })
    mocks.getSettings.mockResolvedValue({
      filterableAttributes: ['sectionTitle'],
    })
    mocks.createIndex.mockImplementation(async (uid: string) => ({
      taskUid: uid === 'lessons' ? 4 : 1,
    }))
    mocks.index.mockReturnValue({
      updateSettings: mocks.updateSettings,
      addDocuments: mocks.addDocuments,
      getStats: mocks.getStats,
      getFilterableAttributes: mocks.getFilterableAttributes,
    })
    mocks.updateSettings.mockResolvedValue({ taskUid: 2 })
    mocks.addDocuments.mockResolvedValue({ taskUid: 3 })
    mocks.getStats.mockResolvedValue({
      numberOfDocuments: 2,
      isIndexing: false,
    })
    mocks.getFilterableAttributes.mockResolvedValue(['sectionTitle', 'access'])
    mocks.waitForTask.mockResolvedValue({ status: 'succeeded' })
    mocks.swapIndexes.mockResolvedValue({ taskUid: 5 })
    mocks.deleteIndex.mockResolvedValue({ taskUid: 6 })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not run the CLI or disconnect Prisma when imported', async () => {
    vi.resetModules()
    await import('./index-search')
    expect(mocks.findMany).not.toHaveBeenCalled()
    expect(mocks.disconnect).not.toHaveBeenCalled()
    await indexLessons()
    expect(mocks.disconnect).not.toHaveBeenCalled()
  })

  it('indexes the real document mapping without changing URLs or access', async () => {
    await indexLessons()

    expect(mocks.findMany).toHaveBeenCalledWith({
      select: {
        id: true,
        title: true,
        description: true,
        body: true,
        access: true,
        slug: true,
        section: {
          select: {
            course: { select: { slug: true } },
            title: true,
            slug: true,
          },
        },
      },
    })
    expect(mocks.addDocuments).toHaveBeenCalledWith([
      {
        id: 'lesson-1',
        title: 'Introduction to JavaScript',
        description: 'Learn the basics of JavaScript',
        body: 'JavaScript is a programming language...',
        access: 'FREE',
        sectionTitle: 'JavaScript Fundamentals',
        href: '/courses/web-development/js-fundamentals/intro-javascript',
      },
      {
        id: 'lesson-2',
        title: 'Advanced Functions',
        description: null,
        body: '',
        access: 'PREMIUM',
        sectionTitle: 'Advanced Concepts',
        href: '/courses/javascript-mastery/advanced-concepts/advanced-functions',
      },
    ])
    expect(mocks.index.mock.calls).toEqual([[stagingUid()]])
  })

  it.each([
    { filterableAttributes: ['sectionTitle'] },
    { filterableAttributes: ['access', 'sectionTitle'] },
    { filterableAttributes: null },
  ])(
    'preserves active settings while ensuring access filtering: %j',
    async ({ filterableAttributes }) => {
      const settings = {
        filterableAttributes,
        searchableAttributes: ['title', 'body'],
        displayedAttributes: ['id', 'title', 'href', 'access'],
        sortableAttributes: ['title'],
        rankingRules: [
          'words',
          'typo',
          'proximity',
          'attribute',
          'sort',
          'exactness',
        ],
        synonyms: { js: ['javascript'] },
        stopWords: ['the'],
        typoTolerance: { enabled: false },
        pagination: { maxTotalHits: 2000 },
      }
      mocks.getSettings.mockResolvedValue(settings)

      await indexLessons()

      expect(mocks.updateSettings).toHaveBeenCalledTimes(1)
      expect(mocks.updateSettings).toHaveBeenCalledWith({
        ...settings,
        filterableAttributes: filterableAttributes?.includes('access')
          ? filterableAttributes
          : [...(filterableAttributes ?? []), 'access'],
      })
      expect(settings.filterableAttributes).toBe(filterableAttributes)
    },
  )

  it('awaits every terminal task, verifies staging, swaps, then cleans up only staging', async () => {
    const events: string[] = []
    mocks.waitForTask.mockImplementation(async (uid: number) => {
      events.push(`succeeded:${uid}`)
      return { status: 'succeeded' }
    })
    mocks.getStats.mockImplementation(async () => {
      events.push('verify')
      return { numberOfDocuments: 2, isIndexing: false }
    })
    mocks.swapIndexes.mockImplementation(async () => {
      events.push('swap')
      return { taskUid: 5 }
    })
    mocks.deleteIndex.mockImplementation(async () => {
      events.push('cleanup')
      return { taskUid: 6 }
    })

    const result = await indexLessons()

    expect(result).toEqual({
      indexUid: 'lessons',
      documentCount: 2,
      stagingIndex: stagingUid(),
      swapTaskUid: 5,
      cleanup: { status: 'succeeded', taskUid: 6 },
    })

    expect(events).toEqual([
      'succeeded:1',
      'succeeded:2',
      'succeeded:3',
      'verify',
      'swap',
      'succeeded:5',
      'cleanup',
      'succeeded:6',
    ])
    expect(mocks.waitForTask.mock.calls).toEqual(
      [1, 2, 3, 5, 6].map((uid) => [
        uid,
        { timeOutMs: 300_000, intervalMs: 250 },
      ]),
    )
    expect(stagingUid()).toMatch(/^lessons_staging_[a-f0-9-]{36}$/)
    expect(mocks.createIndex.mock.calls).toEqual([
      [stagingUid(), { primaryKey: 'id' }],
    ])
    expect(mocks.swapIndexes).toHaveBeenCalledTimes(1)
    expect(mocks.swapIndexes).toHaveBeenCalledWith([
      { indexes: ['lessons', stagingUid()] },
    ])
    expect(mocks.deleteIndex.mock.calls).toEqual([[stagingUid()]])
  })

  it('uses a different staging identity for each rebuild', async () => {
    await indexLessons()
    await indexLessons()
    expect(mocks.createIndex.mock.calls[0][0]).not.toBe(
      mocks.createIndex.mock.calls[1][0],
    )
  })

  describe('durable progress', () => {
    it('reports metadata before each mutation, on receipt, and after terminal success', async () => {
      const progress: SearchIndexRebuildProgress[] = []
      const mutations = [
        ['create_staging', mocks.createIndex, 1],
        ['settings', mocks.updateSettings, 2],
        ['documents', mocks.addDocuments, 3],
        ['activate', mocks.swapIndexes, 5],
        ['cleanup', mocks.deleteIndex, 6],
      ] as const
      for (const [phase, mutation, uid] of mutations) {
        mutation.mockImplementation(async () => {
          expect(progress.at(-1)).toEqual({
            phase,
            event: 'before-enqueue',
            stagingIndex: expect.stringMatching(
              /^lessons_staging_[a-f0-9-]{36}$/,
            ),
            activation:
              phase === 'activate'
                ? 'unknown'
                : phase === 'cleanup'
                  ? 'succeeded'
                  : 'not_attempted',
          })
          return { taskUid: uid }
        })
      }
      mocks.waitForTask.mockImplementation(async (taskUid: number) => {
        expect(progress.at(-1)).toMatchObject({ taskUid, event: 'enqueued' })
        return { status: 'succeeded' }
      })

      const result = await indexLessons({
        onProgress: (event) => {
          progress.push(event)
        },
      })

      expect(
        progress.map(({ phase, event, activation, taskUid }) => [
          phase,
          event,
          activation,
          taskUid,
        ]),
      ).toEqual([
        ['create_staging', 'before-enqueue', 'not_attempted', undefined],
        ['create_staging', 'enqueued', 'not_attempted', 1],
        ['create_staging', 'succeeded', 'not_attempted', 1],
        ['settings', 'before-enqueue', 'not_attempted', undefined],
        ['settings', 'enqueued', 'not_attempted', 2],
        ['settings', 'succeeded', 'not_attempted', 2],
        ['documents', 'before-enqueue', 'not_attempted', undefined],
        ['documents', 'enqueued', 'not_attempted', 3],
        ['documents', 'succeeded', 'not_attempted', 3],
        ['verify_staging', 'succeeded', 'not_attempted', undefined],
        ['activate', 'before-enqueue', 'unknown', undefined],
        ['activate', 'enqueued', 'unknown', 5],
        ['activate', 'succeeded', 'succeeded', 5],
        ['cleanup', 'before-enqueue', 'succeeded', undefined],
        ['cleanup', 'enqueued', 'succeeded', 6],
        ['cleanup', 'succeeded', 'succeeded', 6],
      ])
      for (const event of progress) {
        expect(event.stagingIndex).toBe(result.stagingIndex)
        expect(Object.keys(event).sort()).toEqual(
          [
            'phase',
            'stagingIndex',
            'activation',
            'event',
            ...(event.taskUid === undefined ? [] : ['taskUid']),
          ].sort(),
        )
      }
    })

    it.each([
      { phase: 'create_staging', counts: [0, 0, 0, 0, 0] },
      { phase: 'settings', counts: [1, 0, 0, 0, 0] },
      { phase: 'documents', counts: [1, 1, 0, 0, 0] },
      { phase: 'activate', counts: [1, 1, 1, 0, 0] },
      { phase: 'cleanup', counts: [1, 1, 1, 1, 0] },
      { phase: 'bootstrap', counts: [1, 1, 1, 0, 0] },
    ])(
      'stops before $phase when its intent cannot be journaled',
      async ({ phase, counts }) => {
        const cause = new Error('Journal write failed')
        const progress: SearchIndexRebuildProgress[] = []
        if (phase === 'bootstrap') {
          mocks.getIndex.mockRejectedValue(apiError('index_not_found', 404))
        }

        const failure = await indexLessons({
          onProgress: (event) => {
            progress.push(event)
            if (event.phase === phase && event.event === 'before-enqueue') {
              throw cause
            }
          },
        }).catch((error) => error)

        expect(failure).toBeInstanceOf(SearchIndexRebuildError)
        expect(failure).toMatchObject({
          cause,
          phase,
          stagingIndex: progress[0].stagingIndex,
          taskUid: undefined,
          activation: phase === 'cleanup' ? 'succeeded' : 'not_attempted',
        })
        expect(progress.at(-1)).toMatchObject({
          phase,
          event: 'before-enqueue',
        })
        expect(
          [
            mocks.createIndex,
            mocks.updateSettings,
            mocks.addDocuments,
            mocks.swapIndexes,
            mocks.deleteIndex,
          ].map((mutation) => mutation.mock.calls.length),
        ).toEqual(counts)
        expect(mocks.createIndex).not.toHaveBeenCalledWith(
          'lessons',
          expect.anything(),
        )
      },
    )

    it('journals bootstrap task identity before swapping an initially missing index', async () => {
      mocks.getIndex.mockRejectedValue(apiError('index_not_found', 404))
      const progress: SearchIndexRebuildProgress[] = []
      mocks.swapIndexes.mockImplementation(async () => {
        expect(progress.at(-2)).toMatchObject({
          phase: 'bootstrap',
          event: 'succeeded',
          taskUid: 4,
        })
        return { taskUid: 5 }
      })

      await indexLessons({
        onProgress: (event) => {
          progress.push(event)
        },
      })

      expect(progress.filter(({ phase }) => phase === 'bootstrap')).toEqual([
        {
          phase: 'bootstrap',
          stagingIndex: stagingUid(),
          activation: 'not_attempted',
          event: 'before-enqueue',
        },
        {
          phase: 'bootstrap',
          stagingIndex: stagingUid(),
          activation: 'not_attempted',
          event: 'enqueued',
          taskUid: 4,
        },
        {
          phase: 'bootstrap',
          stagingIndex: stagingUid(),
          activation: 'not_attempted',
          event: 'succeeded',
          taskUid: 4,
        },
      ])
    })

    it.each(['create_staging', 'verify_staging'])(
      'stops subsequent mutations if journaling %s success fails',
      async (phase) => {
        const cause = new Error('Journal write failed')
        await expect(
          indexLessons({
            onProgress: (event) => {
              if (event.phase === phase && event.event === 'succeeded')
                throw cause
            },
          }),
        ).rejects.toMatchObject({
          cause,
          phase,
          activation: 'not_attempted',
          taskUid: phase === 'create_staging' ? 1 : undefined,
        })
        if (phase === 'create_staging') {
          expect(mocks.updateSettings).not.toHaveBeenCalled()
        }
        expectNoActivationOrCleanup()
      },
    )

    it('retains the known swap task and unknown outcome if journaling its receipt fails', async () => {
      const cause = new Error('Journal write failed')
      await expect(
        indexLessons({
          onProgress: (event) => {
            if (event.phase === 'activate' && event.event === 'enqueued')
              throw cause
          },
        }),
      ).rejects.toMatchObject({
        cause,
        phase: 'activate',
        taskUid: 5,
        activation: 'unknown',
        stagingIndex: expect.stringMatching(/^lessons_staging_/),
      })
      expect(mocks.waitForTask).not.toHaveBeenCalledWith(5, expect.anything())
      expect(mocks.swapIndexes).toHaveBeenCalledTimes(1)
      expect(mocks.deleteIndex).not.toHaveBeenCalled()
    })

    it('keeps confirmed activation successful if journaling that success fails', async () => {
      const cause = new Error('Journal write failed')
      const onProgress = vi.fn((event: SearchIndexRebuildProgress) => {
        if (event.phase === 'activate' && event.event === 'succeeded')
          throw cause
      })

      await expect(indexLessons({ onProgress })).rejects.toMatchObject({
        cause,
        phase: 'activate',
        taskUid: 5,
        activation: 'succeeded',
        stagingIndex: expect.stringMatching(/^lessons_staging_/),
      })
      expect(onProgress).toHaveBeenLastCalledWith({
        phase: 'activate',
        stagingIndex: stagingUid(),
        activation: 'succeeded',
        event: 'succeeded',
        taskUid: 5,
      })
      expect(mocks.swapIndexes).toHaveBeenCalledTimes(1)
      expect(mocks.deleteIndex).not.toHaveBeenCalled()
    })

    it.each(['enqueue', 'poll'])(
      'leaves durable inspection metadata when a swap %s request fails',
      async (request) => {
        const cause = new Error('Connection lost')
        const onProgress = vi.fn()
        if (request === 'enqueue') {
          mocks.swapIndexes.mockRejectedValue(cause)
        } else {
          mocks.waitForTask.mockImplementation(async (uid: number) => {
            if (uid === 5) throw cause
            return { status: 'succeeded' }
          })
        }

        await expect(indexLessons({ onProgress })).rejects.toMatchObject({
          cause,
          phase: 'activate',
          activation: 'unknown',
          taskUid: request === 'enqueue' ? undefined : 5,
        })
        expect(onProgress).toHaveBeenLastCalledWith({
          phase: 'activate',
          stagingIndex: stagingUid(),
          activation: 'unknown',
          event: request === 'enqueue' ? 'before-enqueue' : 'enqueued',
          ...(request === 'enqueue' ? {} : { taskUid: 5 }),
        })
        expect(mocks.swapIndexes).toHaveBeenCalledTimes(1)
        expect(mocks.deleteIndex).not.toHaveBeenCalled()
      },
    )
  })

  it.each([
    [1, 'create_staging'],
    [2, 'settings'],
    [3, 'documents'],
  ])(
    'leaves active search untouched when task %i fails',
    async (uid, phase) => {
      mocks.waitForTask.mockImplementation(async (taskUid: number) =>
        taskUid === uid
          ? {
              status: 'failed',
              error: {
                code: 'invalid_document',
                message: 'Rejected by engine',
              },
            }
          : { status: 'succeeded' },
      )

      const failure = await indexLessons().catch((error) => error)

      expect(failure).toBeInstanceOf(SearchIndexRebuildError)
      expect(failure).toMatchObject({
        phase,
        taskUid: uid,
        activation: 'not_attempted',
        stagingIndex: stagingUid(),
      })
      expect(failure.message).toContain('invalid_document: Rejected by engine')
      expectNoActivationOrCleanup()
      if (uid === 1) expect(mocks.updateSettings).not.toHaveBeenCalled()
      if (uid <= 2) expect(mocks.addDocuments).not.toHaveBeenCalled()
      expect(mocks.getStats).not.toHaveBeenCalled()
    },
  )

  it('does not advance past a canceled task', async () => {
    mocks.waitForTask.mockResolvedValueOnce({ status: 'canceled' })
    await expect(indexLessons()).rejects.toMatchObject({
      phase: 'create_staging',
      taskUid: 1,
      activation: 'not_attempted',
    })
    expectNoActivationOrCleanup()
  })

  it('retains staging when a build request fails without a task receipt', async () => {
    const cause = new Error('connection lost')
    mocks.addDocuments.mockRejectedValue(cause)

    await expect(indexLessons()).rejects.toMatchObject({
      cause,
      phase: 'documents',
      taskUid: undefined,
      activation: 'not_attempted',
    })
    expectNoActivationOrCleanup()
  })

  it.each([
    { numberOfDocuments: 0, isIndexing: false },
    { numberOfDocuments: 1, isIndexing: false },
    { numberOfDocuments: 3, isIndexing: false },
    { numberOfDocuments: 2, isIndexing: true },
  ])('rejects staging that is not ready: %j', async (stats) => {
    mocks.getStats.mockResolvedValue(stats)
    await expect(indexLessons()).rejects.toMatchObject({
      phase: 'verify_staging',
      activation: 'not_attempted',
    })
    expectNoActivationOrCleanup()
  })

  it('requires confirmed access filtering before activation', async () => {
    mocks.getFilterableAttributes.mockResolvedValue(['sectionTitle'])
    await expect(indexLessons()).rejects.toMatchObject({
      phase: 'verify_staging',
      activation: 'not_attempted',
    })
    expectNoActivationOrCleanup()
  })

  it.each(['failed', 'canceled'])(
    'retains both indexes on a terminal %s swap',
    async (status) => {
      mocks.waitForTask.mockImplementation(async (uid: number) => ({
        status: uid === 5 ? status : 'succeeded',
      }))

      await expect(indexLessons()).rejects.toMatchObject({
        phase: 'activate',
        taskUid: 5,
        activation: 'failed',
      })
      expect(mocks.swapIndexes).toHaveBeenCalledTimes(1)
      expect(mocks.deleteIndex).not.toHaveBeenCalled()
    },
  )

  it.each(['timeout', 'network failure'])(
    'reports an unknown swap outcome on %s without cleanup or reverse swap',
    async (message) => {
      const cause = new Error(message)
      mocks.waitForTask.mockImplementation(async (uid: number) => {
        if (uid === 5) throw cause
        return { status: 'succeeded' }
      })

      const failure = await indexLessons().catch((error) => error)

      expect(failure).toMatchObject({
        cause,
        stagingIndex: stagingUid(),
        phase: 'activate',
        taskUid: 5,
        activation: 'unknown',
      })
      expect(failure.message).toContain(stagingUid())
      expect(failure.message).toContain('task=5')
      expect(mocks.swapIndexes).toHaveBeenCalledTimes(1)
      expect(mocks.deleteIndex).not.toHaveBeenCalled()
    },
  )

  it('reports an unknown swap task when the enqueue response is lost', async () => {
    mocks.swapIndexes.mockRejectedValue(new Error('connection reset'))
    await expect(indexLessons()).rejects.toMatchObject({
      phase: 'activate',
      taskUid: undefined,
      activation: 'unknown',
    })
    expect(mocks.swapIndexes).toHaveBeenCalledTimes(1)
    expect(mocks.deleteIndex).not.toHaveBeenCalled()
  })

  it('distinguishes a rejected swap request from an unknown task outcome', async () => {
    const cause = apiError('invalid_api_key', 403)
    mocks.swapIndexes.mockRejectedValue(cause)
    await expect(indexLessons()).rejects.toMatchObject({
      cause,
      phase: 'activate',
      taskUid: undefined,
      activation: 'failed',
    })
    expect(mocks.swapIndexes).toHaveBeenCalledTimes(1)
    expect(mocks.deleteIndex).not.toHaveBeenCalled()
  })

  it('does not infer swap failure when permission to poll its task is denied', async () => {
    const cause = apiError('invalid_api_key', 403)
    mocks.waitForTask.mockImplementation(async (uid: number) => {
      if (uid === 5) throw cause
      return { status: 'succeeded' }
    })
    await expect(indexLessons()).rejects.toMatchObject({
      cause,
      phase: 'activate',
      taskUid: 5,
      activation: 'unknown',
    })
    expect(mocks.deleteIndex).not.toHaveBeenCalled()
  })

  it.each([408, 500, 503])(
    'does not infer swap failure from HTTP %i',
    async (status) => {
      mocks.swapIndexes.mockRejectedValue(apiError('internal', status))
      await expect(indexLessons()).rejects.toMatchObject({
        phase: 'activate',
        taskUid: undefined,
        activation: 'unknown',
      })
      expect(mocks.deleteIndex).not.toHaveBeenCalled()
    },
  )

  it.each(['enqueue', 'poll'])(
    'bounds a stalled activation %s request without unsafe cleanup',
    async (request) => {
      vi.useFakeTimers()
      if (request === 'enqueue') {
        mocks.swapIndexes.mockImplementation(() => new Promise(() => {}))
      } else {
        mocks.waitForTask.mockImplementation(async (uid: number) =>
          uid === 5 ? new Promise(() => {}) : { status: 'succeeded' },
        )
      }

      const outcome = indexLessons({
        taskTimeoutMs: 100,
        taskIntervalMs: 10,
      }).catch((error) => error)
      await vi.advanceTimersByTimeAsync(100)

      expect(await outcome).toMatchObject({
        phase: 'activate',
        taskUid: request === 'enqueue' ? undefined : 5,
        activation: 'unknown',
      })
      expect(mocks.waitForTask).toHaveBeenCalledWith(1, {
        timeOutMs: 100,
        intervalMs: 10,
      })
      expect(mocks.swapIndexes).toHaveBeenCalledTimes(1)
      expect(mocks.deleteIndex).not.toHaveBeenCalled()
    },
  )

  it('does not treat a nonterminal response as successful activation', async () => {
    mocks.waitForTask.mockImplementation(async (uid: number) => ({
      status: uid === 5 ? 'processing' : 'succeeded',
    }))
    await expect(indexLessons()).rejects.toMatchObject({
      phase: 'activate',
      taskUid: 5,
      activation: 'unknown',
    })
    expect(mocks.deleteIndex).not.toHaveBeenCalled()
  })

  it.each(['failed', 'timeout', 'enqueue failure'])(
    'reports successful activation but incomplete cleanup on %s',
    async (failure) => {
      if (failure === 'enqueue failure') {
        mocks.deleteIndex.mockRejectedValue(new Error('network failure'))
      } else {
        mocks.waitForTask.mockImplementation(async (uid: number) => {
          if (uid === 6 && failure === 'timeout') throw new Error('timeout')
          return { status: uid === 6 ? 'failed' : 'succeeded' }
        })
      }

      await expect(indexLessons()).rejects.toMatchObject({
        phase: 'cleanup',
        activation: 'succeeded',
        taskUid: failure === 'enqueue failure' ? undefined : 6,
      })
      expect(mocks.swapIndexes).toHaveBeenCalledTimes(1)
      expect(mocks.deleteIndex.mock.calls).toEqual([[stagingUid()]])
    },
  )

  it('bootstraps a missing active index only after staging is verified', async () => {
    mocks.getIndex.mockRejectedValue(apiError('index_not_found', 404))
    await indexLessons()

    expect(mocks.getSettings).not.toHaveBeenCalled()
    expect(mocks.updateSettings).toHaveBeenCalledWith({
      filterableAttributes: ['access'],
    })
    expect(mocks.createIndex.mock.calls).toEqual([
      [stagingUid(), { primaryKey: 'id' }],
      ['lessons', { primaryKey: 'id' }],
    ])
    expect(mocks.createIndex.mock.invocationCallOrder[1]).toBeGreaterThan(
      mocks.getStats.mock.invocationCallOrder[0],
    )
    expect(mocks.waitForTask.mock.calls.map(([uid]) => uid)).toEqual([
      1, 2, 3, 4, 5, 6,
    ])
    expect(mocks.deleteIndex.mock.calls).toEqual([[stagingUid()]])
  })

  it('does not bootstrap when staging fails', async () => {
    mocks.getIndex.mockRejectedValue(apiError('index_not_found', 404))
    mocks.waitForTask.mockResolvedValueOnce({ status: 'failed' })
    await expect(indexLessons()).rejects.toMatchObject({
      activation: 'not_attempted',
    })
    expectNoActivationOrCleanup()
  })

  it('does not swap or delete a concurrently created active index on bootstrap failure', async () => {
    mocks.getIndex.mockRejectedValue(apiError('index_not_found', 404))
    mocks.waitForTask.mockImplementation(async (uid: number) =>
      uid === 4
        ? {
            status: 'failed',
            error: { code: 'index_already_exists', message: 'Already exists' },
          }
        : { status: 'succeeded' },
    )
    await expect(indexLessons()).rejects.toMatchObject({
      phase: 'bootstrap',
      activation: 'not_attempted',
      taskUid: 4,
    })
    expect(mocks.swapIndexes).not.toHaveBeenCalled()
    expect(mocks.deleteIndex).not.toHaveBeenCalled()
  })

  it.each([
    apiError('invalid_api_key', 403),
    apiError('not_found', 404),
    new Error('network unavailable'),
    { code: 'index_not_found' },
  ])('does not mistake a lookup error for index absence: %j', async (cause) => {
    mocks.getIndex.mockRejectedValue(cause)
    await expect(indexLessons()).rejects.toBe(cause)
    expect(mocks.createIndex).not.toHaveBeenCalled()
    expectNoActivationOrCleanup()
  })

  it('propagates settings-read failures rather than publishing defaults', async () => {
    const cause = apiError('index_not_found', 404)
    mocks.getSettings.mockRejectedValue(cause)
    await expect(indexLessons()).rejects.toBe(cause)
    expect(mocks.createIndex).not.toHaveBeenCalled()
    expectNoActivationOrCleanup()
  })

  it.each(['empty', 'database failure', 'transformation failure'])(
    'performs no search mutations on %s source data',
    async (failure) => {
      if (failure === 'empty') mocks.findMany.mockResolvedValue([])
      if (failure === 'database failure') {
        mocks.findMany.mockRejectedValue(new Error('Database unavailable'))
      }
      if (failure === 'transformation failure') {
        mocks.findMany.mockResolvedValue([{ ...lessons[0], section: null }])
      }

      await expect(indexLessons()).rejects.toThrow()
      expect(mocks.getIndex).not.toHaveBeenCalled()
      expect(mocks.createIndex).not.toHaveBeenCalled()
      expectNoActivationOrCleanup()
    },
  )

  it('rejects invalid task deadlines before making service calls', async () => {
    await expect(indexLessons({ taskTimeoutMs: Infinity })).rejects.toThrow()
    expect(mocks.findMany).not.toHaveBeenCalled()
    expect(mocks.createIndex).not.toHaveBeenCalled()
  })
})
