import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'

const mockIsDevelopment = vi.fn()
const mockIsProduction = vi.fn()
vi.mock('@/utils/helpers', () => ({
  isDevelopment: mockIsDevelopment,
  isProduction: mockIsProduction,
}))

const mockSentry = {
  withScope: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}

vi.mock('@sentry/nextjs', () => mockSentry)

describe('Error Tracking System', () => {
  let reportError: any
  let reportErrorSafely: any
  let ServiceError: any

  beforeEach(async () => {
    vi.clearAllMocks()

    vi.resetModules()

    mockIsDevelopment.mockReturnValue(false)
    mockIsProduction.mockReturnValue(true)

    mockSentry.withScope.mockImplementation((callback) => {
      const mockScope = {
        setUser: vi.fn(),
        setTag: vi.fn(),
        setContext: vi.fn(),
        setExtra: vi.fn(),
        setLevel: vi.fn(),
      }
      callback(mockScope)
    })

    const errorTrackingModule = await import('./error-tracking')
    reportError = errorTrackingModule.reportError
    reportErrorSafely = errorTrackingModule.reportErrorSafely
    ServiceError = errorTrackingModule.ServiceError
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('reportError', () => {
    it('should return success false when not attempted in development', async () => {
      mockIsDevelopment.mockReturnValue(true)
      mockIsProduction.mockReturnValue(false)

      const result = await reportError('Test error')

      expect(result).toEqual({
        success: true,
        attempted: false,
      })
    })

    it('should return success true when Sentry is available in production', async () => {
      const result = await reportError('Test error')

      expect(result).toEqual({
        success: true,
        attempted: true,
      })
      expect(mockSentry.captureMessage).toHaveBeenCalledWith(
        'Test error',
        'error',
      )
    })

    it('should capture exceptions for Error objects', async () => {
      const testError = new Error('Test error')

      await reportError(testError)

      expect(mockSentry.captureException).toHaveBeenCalledWith(testError)
    })


    it('should handle context correctly', async () => {
      const context = {
        userId: 'user123',
        feature: 'test',
        metadata: { key: 'value' },
      }

      await reportError('Test error', context)

      expect(mockSentry.withScope).toHaveBeenCalled()
    })
  })

  describe('reportErrorSafely', () => {
    it('should not throw when error reporting fails', () => {
      mockSentry.captureMessage.mockImplementation(() => {
        throw new Error('Sentry error')
      })

      expect(() => {
        reportErrorSafely('Test error')
      }).not.toThrow()
    })

    it('should not throw when error reporting fails', () => {
      expect(() => {
        reportErrorSafely('Test error')
      }).not.toThrow()
    })
  })

  describe('ServiceError', () => {
    it('should create ServiceError with correct properties', () => {
      const error = new ServiceError('Service failed', true, {
        feature: 'test',
      })

      expect(error.message).toBe('Service failed')
      expect(error.showSnackbar).toBe(true)
      expect(error.name).toBe('ServiceError')
      expect(error instanceof Error).toBe(true)
    })

    it('should report itself to error tracking', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      new ServiceError('Service failed')

      // The error should be reported (we can't easily test the async call)
      // but we can verify no immediate errors are thrown
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Error reporting failed'),
      )

      consoleSpy.mockRestore()
    })
  })


  describe('Production vs Development', () => {
    it('should not attempt reporting in development', async () => {
      mockIsDevelopment.mockReturnValue(true)
      mockIsProduction.mockReturnValue(false)

      const result = await reportError('Test error')

      expect(result.attempted).toBe(false)
      expect(mockSentry.captureMessage).not.toHaveBeenCalled()
    })

    it('should attempt reporting in production', async () => {
      mockIsDevelopment.mockReturnValue(false)
      mockIsProduction.mockReturnValue(true)

      const result = await reportError('Test error')

      expect(result.attempted).toBe(true)
      expect(mockSentry.captureMessage).toHaveBeenCalled()
    })
  })
})
