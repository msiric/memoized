import { SnackbarProvider } from 'notistack'

export type CustomResponse = {
  success: boolean
  message: string
  status?: number
  showSnackbar?: boolean
}

export function createCustomResponse({
  message = 'Success',
  status = 200,
  showSnackbar = false,
  ...data
}): CustomResponse {
  return { success: true, message, status, showSnackbar, ...data }
}

export function handleResponse(
  response: CustomResponse,
  enqueueSnackbar: SnackbarProvider['enqueueSnackbar'],
) {
  if (response.showSnackbar) {
    enqueueSnackbar(response.message, {
      variant: response.success ? 'success' : 'error',
    })
  }
}
