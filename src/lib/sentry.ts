import { isDevelopment, isProduction } from '@/utils/helpers'


// Conditional Sentry import - only load in production to reduce development bundle size
async function getSentry() {
  if (isProduction()) {
    try {
      const Sentry = await import('@sentry/nextjs')
      return Sentry
    } catch (importError) {
      console.error('Failed to import Sentry:', importError)
      return null
    }
  }
  return null
}

export interface ErrorContext {
  userId?: string
  sessionId?: string
  feature?: string
  action?: string
  metadata?: Record<string, unknown>
  showSnackbar?: boolean
  componentStack?: string
  digest?: string
}

export interface ErrorReportingResult {
  success: boolean
  attempted: boolean
  error?: Error
}

/**
 * Core error reporting function - replaces all direct Sentry.captureException calls
 * Only sends errors in production, always logs to console in development
 * Returns success/failure information for observability
 */
export async function reportError(
  error: Error | string | unknown,
  context?: ErrorContext,
  level: 'error' | 'warning' | 'info' = 'error',
): Promise<ErrorReportingResult> {
  // Normalize error to Error object
  const normalizedError = normalizeError(error)

  // Always log to console for development debugging
  if (isDevelopment()) {
    console.error(`[${level.toUpperCase()}]`, normalizedError, context)
    return { success: true, attempted: false } // Dev mode doesn't attempt remote reporting
  }

  // Send to Sentry only in production to avoid noise in development
  if (isProduction()) {
    try {
      const Sentry = await getSentry()
      if (!Sentry) {
        console.error('Sentry not available for error reporting')
        return { success: false, attempted: true, error: new Error('Sentry not available') }
      }

      Sentry.withScope((scope) => {
        // Set user context if available
        if (context?.userId) {
          scope.setUser({ id: context.userId })
        }

        // Add session context
        if (context?.sessionId) {
          scope.setTag('sessionId', context.sessionId)
        }

        // Add feature/action tags for better categorization
        if (context?.feature) {
          scope.setTag('feature', context.feature)
        }
        if (context?.action) {
          scope.setTag('action', context.action)
        }

        // Add Next.js specific context
        if (context?.digest) {
          scope.setTag('digest', context.digest)
        }

        // Add React component stack if available
        if (context?.componentStack) {
          scope.setContext('react', {
            componentStack: context.componentStack,
          })
        }

        // Add custom metadata
        if (context?.metadata) {
          Object.entries(context.metadata).forEach(([key, value]) => {
            scope.setExtra(key, value)
          })
        }

        // Set error level
        scope.setLevel(level)

        // Capture the error
        if (typeof error === 'string') {
          Sentry.captureMessage(error, level)
        } else {
          Sentry.captureException(normalizedError)
        }
      })

      return { success: true, attempted: true }
      
    } catch (sentryError) {
      // Fallback: if Sentry fails, at least log to console
      console.error('Failed to report error to Sentry:', sentryError)
      console.error('Original error:', normalizedError)
      
      return { 
        success: false, 
        attempted: true, 
        error: sentryError instanceof Error ? sentryError : new Error(String(sentryError))
      }
    }
  }

  return { success: true, attempted: false } // Not in production, no attempt made
}

/**
 * Safe error reporting wrapper that handles failures gracefully
 * Use this for fire-and-forget error reporting where you don't want to await the result
 */
export function reportErrorSafely(
  error: Error | string | unknown,
  context?: ErrorContext,
  level: 'error' | 'warning' | 'info' = 'error'
): void {
  reportError(error, context, level).catch((reportingError) => {
    // Log the failure but don't throw - this is fire-and-forget
    console.error('Error reporting failed (this is expected in some cases):', reportingError)
  })
}

/**
 * Convert any error type to Error object with message
 */
function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error
  }

  if (typeof error === 'string') {
    return new Error(error)
  }

  return new Error(String(error))
}

/**
 * Get error message from any error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

/**
 * Enhanced ServiceError class that integrates with centralized error tracking
 */
export class ServiceError extends Error {
  constructor(
    public message: string,
    public showSnackbar: boolean = true,
    context?: Omit<ErrorContext, 'showSnackbar'>,
    cause?: unknown,
  ) {
    super(message, { cause })
    this.name = 'ServiceError'

    // Report to centralized error tracking (async, fire-and-forget)
    reportErrorSafely(this, {
      ...context,
      showSnackbar,
      feature: context?.feature || 'service',
    })
  }
}

/**
 * Custom error creation for API responses
 */
export type CustomErrorArgs = {
  message: string
  status?: number
  showSnackbar?: boolean
  error?: unknown
  context?: ErrorContext
}

export function createCustomError({
  message = 'Internal server error',
  status = 500,
  showSnackbar = false,
  error = null,
  context = {},
}: CustomErrorArgs) {
  // Report to centralized error tracking (async, fire-and-forget)
  reportErrorSafely(error ?? message, {
    ...context,
    showSnackbar,
    metadata: {
      ...context.metadata,
      status,
      apiError: true,
    },
  })

  return { success: false, message, status, showSnackbar }
}


/**
 * Reports MDX compilation/rendering failures
 */
export function reportMdxError(
  error: Error,
  context: {
    contentLength?: number
    filePath?: string
    operation: 'compilation' | 'rendering'
    componentStack?: string
  },
): void {
  reportErrorSafely(error, {
    feature: 'mdx',
    action: context.operation,
    componentStack: context.componentStack,
    metadata: {
      contentLength: context.contentLength,
      filePath: context.filePath,
      timestamp: new Date().toISOString(),
    },
  })
}

/**
 * Reports Next.js app router errors (for error.tsx and global-error.tsx)
 */
export function reportNextError(
  error: Error & { digest?: string },
  context: {
    page?: string
    global?: boolean
  },
): void {
  reportErrorSafely(error, {
    feature: 'nextjs',
    action: context.global ? 'global-error' : 'page-error',
    digest: error.digest,
    metadata: {
      page: context.page,
      timestamp: new Date().toISOString(),
    },
  })
}

/**
 * Reports React error boundary errors
 */
export function reportReactError(
  error: Error,
  context: {
    componentStack: string
    errorBoundary: string
    userId?: string
  },
): void {
  reportErrorSafely(error, {
    feature: 'react',
    action: 'error-boundary',
    userId: context.userId,
    componentStack: context.componentStack,
    metadata: {
      errorBoundary: context.errorBoundary,
      timestamp: new Date().toISOString(),
    },
  })
}

/**
 * Standard error handling types and functions for the application
 * Used throughout components and actions for consistent error handling
 */

export type CustomError = {
  success: boolean
  message: string
  status?: number
  showSnackbar?: boolean
}

/**
 * Standard error handler for snackbar notifications
 * Used throughout the application for consistent error display
 */
export function handleError(
  error: CustomError | unknown,
  enqueueSnackbar: (message: string, options: Record<string, string>) => void, // Using simple function type to avoid notistack dependency
): void {
  if (error && typeof error === 'object' && 'success' in error) {
    const customError = error as CustomError
    if (customError.showSnackbar) {
      enqueueSnackbar(customError.message, { variant: 'error' })
    } else {
      console.error('Error:', customError)
    }

    reportErrorSafely(customError.message, {
      showSnackbar: customError.showSnackbar,
      metadata: {
        status: customError.status,
        success: customError.success,
      },
    })
  } else {
    console.error('Unknown error:', error)
    reportErrorSafely(error, {
      showSnackbar: false,
    })
  }
}
