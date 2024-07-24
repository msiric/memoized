import * as Sentry from '@sentry/nextjs'
import { SnackbarProvider } from 'notistack'
import { isProduction } from './helpers'

export type CustomErrorArgs = {
  message: string
  status?: number
  showSnackbar?: boolean
  error?: ServiceError | null | unknown
}

export function createCustomError({
  message = 'Internal server error',
  status = 500,
  showSnackbar = false,
  error = null,
}: CustomErrorArgs) {
  if (isProduction()) {
    Sentry.captureException(error ?? message)
  }

  return { success: false, message, status, showSnackbar }
}

export type CustomError = {
  success: boolean
  message: string
  status?: number
  showSnackbar?: boolean
}

export function handleError(
  error: CustomError,
  enqueueSnackbar: SnackbarProvider['enqueueSnackbar'],
) {
  if (error.showSnackbar) {
    enqueueSnackbar(error.message, { variant: 'error' })
  } else {
    console.error('Unknown error:', error)
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

export class ServiceError extends Error {
  constructor(
    public message: string,
    public showSnackbar: boolean = true,
  ) {
    super(message)
    this.name = 'ServiceError'
    if (isProduction()) {
      Sentry.captureException(this)
    }
  }
}
