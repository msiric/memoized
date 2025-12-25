import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'
import { MeiliSearch } from 'meilisearch'

vi.mock('meilisearch', () => ({
  MeiliSearch: vi.fn().mockImplementation((config) => ({
    config,

    getIndexes: vi.fn(),
    createIndex: vi.fn(),
    index: vi.fn((indexUid) => ({
      uid: indexUid,
      search: vi.fn(),
      addDocuments: vi.fn(),
      updateDocuments: vi.fn(),
      deleteDocument: vi.fn(),
      deleteAllDocuments: vi.fn(),
      getSettings: vi.fn(),
      updateSettings: vi.fn(),
    })),
    health: vi.fn(),
    isHealthy: vi.fn(),
    getVersion: vi.fn(),
    getKeys: vi.fn(),
    createKey: vi.fn(),
  })),
}))

describe('MeiliSearch Library', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()

    process.env = { ...originalEnv }

    vi.resetModules()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('MeiliSearch Client Instantiation', () => {
    it('should create MeiliSearch instance with environment variables', async () => {
      process.env.MEILISEARCH_HOST = 'http://localhost:7700'
      process.env.MEILISEARCH_MASTER_KEY = 'test-master-key'

      const { meiliSearch } = await import('@/lib/meili')

      expect(MeiliSearch).toHaveBeenCalledWith({
        host: 'http://localhost:7700',
        apiKey: 'test-master-key',
      })
      expect(meiliSearch).toBeDefined()
    })

    it('should create MeiliSearch instance with empty strings when env vars are missing', async () => {
      delete process.env.MEILISEARCH_HOST
      delete process.env.MEILISEARCH_MASTER_KEY

      const { meiliSearch } = await import('@/lib/meili')

      expect(MeiliSearch).toHaveBeenCalledWith({
        host: '',
        apiKey: '',
      })
      expect(meiliSearch).toBeDefined()
    })

    it('should handle partial environment variables', async () => {
      process.env.MEILISEARCH_HOST = 'http://localhost:7700'
      delete process.env.MEILISEARCH_MASTER_KEY

      await import('@/lib/meili')

      expect(MeiliSearch).toHaveBeenCalledWith({
        host: 'http://localhost:7700',
        apiKey: '',
      })
    })
  })

  describe('Client Configuration', () => {
    it('should use production MeiliSearch host', async () => {
      process.env.MEILISEARCH_HOST = 'https://ms-abc123-456.fra.meilisearch.io'
      process.env.MEILISEARCH_MASTER_KEY = 'prod-master-key-xyz789'

      await import('@/lib/meili')

      expect(MeiliSearch).toHaveBeenCalledWith({
        host: 'https://ms-abc123-456.fra.meilisearch.io',
        apiKey: 'prod-master-key-xyz789',
      })
    })

    it('should use development MeiliSearch host', async () => {
      process.env.MEILISEARCH_HOST = 'http://localhost:7700'
      process.env.MEILISEARCH_MASTER_KEY = 'dev-key'

      await import('@/lib/meili')

      expect(MeiliSearch).toHaveBeenCalledWith({
        host: 'http://localhost:7700',
        apiKey: 'dev-key',
      })
    })

    it('should handle custom port configurations', async () => {
      process.env.MEILISEARCH_HOST = 'http://localhost:8080'
      process.env.MEILISEARCH_MASTER_KEY = 'custom-port-key'

      await import('@/lib/meili')

      expect(MeiliSearch).toHaveBeenCalledWith({
        host: 'http://localhost:8080',
        apiKey: 'custom-port-key',
      })
    })
  })

  describe('Client Methods and Properties', () => {
    it('should have expected MeiliSearch methods', async () => {
      process.env.MEILISEARCH_HOST = 'http://localhost:7700'
      process.env.MEILISEARCH_MASTER_KEY = 'test-key'

      const { meiliSearch } = await import('@/lib/meili')

      expect(meiliSearch.getIndexes).toBeDefined()
      expect(meiliSearch.createIndex).toBeDefined()
      expect(meiliSearch.index).toBeDefined()
      expect(meiliSearch.health).toBeDefined()
      expect(meiliSearch.isHealthy).toBeDefined()
      expect(meiliSearch.getVersion).toBeDefined()
      expect(typeof meiliSearch.getIndexes).toBe('function')
      expect(typeof meiliSearch.createIndex).toBe('function')
      expect(typeof meiliSearch.index).toBe('function')
    })

    it('should create index instances with expected methods', async () => {
      process.env.MEILISEARCH_HOST = 'http://localhost:7700'
      process.env.MEILISEARCH_MASTER_KEY = 'test-key'

      const { meiliSearch } = await import('@/lib/meili')
      const index = meiliSearch.index('test-index')

      expect(index).toBeDefined()
      expect(index.uid).toBe('test-index')
      expect(index.search).toBeDefined()
      expect(index.addDocuments).toBeDefined()
      expect(index.updateDocuments).toBeDefined()
      expect(index.deleteDocument).toBeDefined()
      expect(index.getSettings).toBeDefined()
      expect(typeof index.search).toBe('function')
      expect(typeof index.addDocuments).toBe('function')
    })
  })

  describe('Environment Variable Edge Cases', () => {
    it('should handle undefined environment variables', async () => {
      process.env.MEILISEARCH_HOST = undefined as any
      process.env.MEILISEARCH_MASTER_KEY = undefined as any

      await import('@/lib/meili')

      expect(MeiliSearch).toHaveBeenCalledWith({
        host: '',
        apiKey: '',
      })
    })

    it('should handle empty string environment variables', async () => {
      process.env.MEILISEARCH_HOST = ''
      process.env.MEILISEARCH_MASTER_KEY = ''

      await import('@/lib/meili')

      expect(MeiliSearch).toHaveBeenCalledWith({
        host: '',
        apiKey: '',
      })
    })

    it('should handle whitespace in environment variables', async () => {
      process.env.MEILISEARCH_HOST = '  http://localhost:7700  '
      process.env.MEILISEARCH_MASTER_KEY = '  test-key  '

      await import('@/lib/meili')

      expect(MeiliSearch).toHaveBeenCalledWith({
        host: '  http://localhost:7700  ',
        apiKey: '  test-key  ',
      })
    })
  })

  describe('Configuration Validation', () => {
    it('should pass configuration object correctly', async () => {
      process.env.MEILISEARCH_HOST = 'https://search.example.com'
      process.env.MEILISEARCH_MASTER_KEY = 'super-secret-key'

      await import('@/lib/meili')

      const MockedMeiliSearch = vi.mocked(MeiliSearch)
      const callArgs = MockedMeiliSearch.mock.calls[0][0]

      expect(callArgs).toEqual({
        host: 'https://search.example.com',
        apiKey: 'super-secret-key',
      })
      expect(callArgs.host).toBe('https://search.example.com')
      expect(callArgs.apiKey).toBe('super-secret-key')
    })

    it('should only pass host and apiKey properties', async () => {
      process.env.MEILISEARCH_HOST = 'http://localhost:7700'
      process.env.MEILISEARCH_MASTER_KEY = 'test-key'

      await import('@/lib/meili')

      const MockedMeiliSearch = vi.mocked(MeiliSearch)
      const callArgs = MockedMeiliSearch.mock.calls[0][0]

      expect(Object.keys(callArgs)).toEqual(['host', 'apiKey'])
      expect(Object.keys(callArgs)).toHaveLength(2)
    })
  })

  describe('Error Handling', () => {
    it('should handle MeiliSearch constructor errors', async () => {
      process.env.MEILISEARCH_HOST = 'invalid-url'
      process.env.MEILISEARCH_MASTER_KEY = 'test-key'

      const MockedMeiliSearch = vi.mocked(MeiliSearch)
      MockedMeiliSearch.mockImplementationOnce(() => {
        throw new Error('Invalid MeiliSearch configuration')
      })

      await expect(async () => {
        await import('@/lib/meili')
      }).rejects.toThrow('Invalid MeiliSearch configuration')
    })

    it('should propagate network-related errors from constructor', async () => {
      process.env.MEILISEARCH_HOST = 'http://nonexistent.domain:7700'
      process.env.MEILISEARCH_MASTER_KEY = 'test-key'

      const MockedMeiliSearch = vi.mocked(MeiliSearch)
      MockedMeiliSearch.mockImplementationOnce(() => {
        throw new Error('Network Error: Cannot connect to MeiliSearch')
      })

      await expect(async () => {
        await import('@/lib/meili')
      }).rejects.toThrow('Network Error: Cannot connect to MeiliSearch')
    })
  })

  describe('Export Validation', () => {
    it('should export meiliSearch as named export', async () => {
      process.env.MEILISEARCH_HOST = 'http://localhost:7700'
      process.env.MEILISEARCH_MASTER_KEY = 'test-key'

      const { meiliSearch } = await import('@/lib/meili')

      expect(meiliSearch).toBeDefined()
      expect(typeof meiliSearch).toBe('object')
    })

    it('should not export as default export', async () => {
      process.env.MEILISEARCH_HOST = 'http://localhost:7700'
      process.env.MEILISEARCH_MASTER_KEY = 'test-key'

      const importedModule = await import('@/lib/meili')

      expect(
        Object.prototype.hasOwnProperty.call(importedModule, 'default'),
      ).toBe(false)
    })

    it('should export the same instance on multiple imports', async () => {
      process.env.MEILISEARCH_HOST = 'http://localhost:7700'
      process.env.MEILISEARCH_MASTER_KEY = 'test-key'

      const { meiliSearch: instance1 } = await import('@/lib/meili')
      const { meiliSearch: instance2 } = await import('@/lib/meili')

      expect(instance1).toBe(instance2)
      expect(MeiliSearch).toHaveBeenCalledTimes(1)
    })
  })

  describe('Real-world Usage Scenarios', () => {
    it('should handle Docker environment configuration', async () => {
      process.env.MEILISEARCH_HOST = 'http://meilisearch:7700'
      process.env.MEILISEARCH_MASTER_KEY = 'docker-master-key'

      await import('@/lib/meili')

      expect(MeiliSearch).toHaveBeenCalledWith({
        host: 'http://meilisearch:7700',
        apiKey: 'docker-master-key',
      })
    })

    it('should handle Kubernetes environment configuration', async () => {
      process.env.MEILISEARCH_HOST =
        'http://meilisearch-service.default.svc.cluster.local:7700'
      process.env.MEILISEARCH_MASTER_KEY = 'k8s-secret-key'

      await import('@/lib/meili')

      expect(MeiliSearch).toHaveBeenCalledWith({
        host: 'http://meilisearch-service.default.svc.cluster.local:7700',
        apiKey: 'k8s-secret-key',
      })
    })

    it('should handle cloud MeiliSearch configuration', async () => {
      process.env.MEILISEARCH_HOST =
        'https://ms-abc123def-456.usc.meilisearch.io'
      process.env.MEILISEARCH_MASTER_KEY = 'msc_xyz789abc456def'

      await import('@/lib/meili')

      expect(MeiliSearch).toHaveBeenCalledWith({
        host: 'https://ms-abc123def-456.usc.meilisearch.io',
        apiKey: 'msc_xyz789abc456def',
      })
    })
  })
})
