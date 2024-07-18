import { SnackbarProvider } from 'notistack'

export type CustomError = {
  success: boolean
  message: string
  status?: number
  showSnackbar?: boolean
}

export function createCustomError({
  message = 'Internal server error',
  status = 500,
  showSnackbar = false,
}): CustomError {
  return { success: false, message, status, showSnackbar }
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

export class ServiceError extends Error {
  constructor(
    public message: string,
    public showSnackbar: boolean = true,
  ) {
    super(message)
    this.name = 'ServiceError'
  }
}
