import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'

vi.mock('notistack', () => ({
  SnackbarProvider: vi.fn(),
}))

describe('Custom Response Utilities', () => {
  let createCustomResponse: any
  let handleResponse: any

  const mockEnqueueSnackbar = vi.fn()

  beforeEach(async () => {
    vi.clearAllMocks()

    const responseModule = await import('@/utils/response')
    createCustomResponse = responseModule.createCustomResponse
    handleResponse = responseModule.handleResponse
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createCustomResponse', () => {
    it('should create response with default values', () => {
      const result = createCustomResponse({})

      expect(result).toEqual({
        success: true,
        message: 'Success',
        status: 200,
        showSnackbar: false,
      })
    })

    it('should create response with custom message', () => {
      const result = createCustomResponse({
        message: 'Operation completed successfully',
      })

      expect(result).toEqual({
        success: true,
        message: 'Operation completed successfully',
        status: 200,
        showSnackbar: false,
      })
    })

    it('should create response with custom status', () => {
      const result = createCustomResponse({
        message: 'Resource created',
        status: 201,
      })

      expect(result).toEqual({
        success: true,
        message: 'Resource created',
        status: 201,
        showSnackbar: false,
      })
    })

    it('should create response with showSnackbar enabled', () => {
      const result = createCustomResponse({
        message: 'Success with notification',
        showSnackbar: true,
      })

      expect(result).toEqual({
        success: true,
        message: 'Success with notification',
        status: 200,
        showSnackbar: true,
      })
    })

    it('should create response with all custom values', () => {
      const result = createCustomResponse({
        message: 'Custom success',
        status: 202,
        showSnackbar: true,
      })

      expect(result).toEqual({
        success: true,
        message: 'Custom success',
        status: 202,
        showSnackbar: true,
      })
    })

    it('should spread additional data into response', () => {
      const result = createCustomResponse({
        message: 'User created',
        userId: 123,
        email: 'test@example.com',
      } as any)

      expect(result).toEqual({
        success: true,
        message: 'User created',
        status: 200,
        showSnackbar: false,
        userId: 123,
        email: 'test@example.com',
      })
    })

    it('should spread complex additional data', () => {
      const result = createCustomResponse({
        message: 'Data loaded',
        data: { users: [1, 2, 3], total: 3 },
        metadata: { timestamp: '2024-01-01' },
        pagination: { page: 1, limit: 10 },
      } as any)

      expect(result).toEqual({
        success: true,
        message: 'Data loaded',
        status: 200,
        showSnackbar: false,
        data: { users: [1, 2, 3], total: 3 },
        metadata: { timestamp: '2024-01-01' },
        pagination: { page: 1, limit: 10 },
      })
    })

    it('should override defaults with spread data', () => {
      const result = createCustomResponse({
        status: 404,
        customStatus: 201,
      } as any)

      expect(result).toEqual({
        success: true,
        message: 'Success',
        status: 404,
        showSnackbar: false,
        customStatus: 201,
      })
    })

    it('should handle empty spread data', () => {
      const result = createCustomResponse({
        message: 'Empty spread',
      })

      expect(result).toEqual({
        success: true,
        message: 'Empty spread',
        status: 200,
        showSnackbar: false,
      })
    })

    it('should have success: true by default but can be overridden by spread', () => {
      const normalResult = createCustomResponse({
        message: 'Normal usage',
      })
      expect(normalResult.success).toBe(true)

      const overriddenResult = createCustomResponse({
        message: 'Overridden usage',
        success: false,
      } as any)
      expect(overriddenResult.success).toBe(false)

      const multiOverrideResult = createCustomResponse({
        status: 201,
        showSnackbar: true,
        success: false,
        customProp: 'custom value',
      } as any)
      expect(multiOverrideResult.success).toBe(false)
      expect(multiOverrideResult.status).toBe(201)
      expect(multiOverrideResult.showSnackbar).toBe(true)
      expect(multiOverrideResult.customProp).toBe('custom value')
    })
  })

  describe('handleResponse', () => {
    it('should show success snackbar when showSnackbar is true and success is true', () => {
      const response = {
        success: true,
        message: 'Operation successful',
        showSnackbar: true,
      }

      handleResponse(response, mockEnqueueSnackbar)

      expect(mockEnqueueSnackbar).toHaveBeenCalledWith('Operation successful', {
        variant: 'success',
      })
    })

    it('should show error snackbar when showSnackbar is true and success is false', () => {
      const response = {
        success: false,
        message: 'Operation failed',
        showSnackbar: true,
      }

      handleResponse(response, mockEnqueueSnackbar)

      expect(mockEnqueueSnackbar).toHaveBeenCalledWith('Operation failed', {
        variant: 'error',
      })
    })

    it('should not show snackbar when showSnackbar is false', () => {
      const response = {
        success: true,
        message: 'Silent success',
        showSnackbar: false,
      }

      handleResponse(response, mockEnqueueSnackbar)

      expect(mockEnqueueSnackbar).not.toHaveBeenCalled()
    })

    it('should not show snackbar when showSnackbar is undefined', () => {
      const response = {
        success: true,
        message: 'No snackbar property',
      }

      handleResponse(response, mockEnqueueSnackbar)

      expect(mockEnqueueSnackbar).not.toHaveBeenCalled()
    })

    it('should handle response with additional properties', () => {
      const response = {
        success: true,
        message: 'User created successfully',
        showSnackbar: true,
        userId: 123,
        data: { name: 'John Doe' },
      }

      handleResponse(response, mockEnqueueSnackbar)

      expect(mockEnqueueSnackbar).toHaveBeenCalledWith(
        'User created successfully',
        {
          variant: 'success',
        },
      )
    })

    it('should handle response with status property', () => {
      const response = {
        success: true,
        message: 'Resource created',
        status: 201,
        showSnackbar: true,
      }

      handleResponse(response, mockEnqueueSnackbar)

      expect(mockEnqueueSnackbar).toHaveBeenCalledWith('Resource created', {
        variant: 'success',
      })
    })
  })

  describe('Integration Tests', () => {
    it('should work together - create response and handle with snackbar', () => {
      const response = createCustomResponse({
        message: 'Integration test success',
        showSnackbar: true,
      })

      handleResponse(response, mockEnqueueSnackbar)

      expect(mockEnqueueSnackbar).toHaveBeenCalledWith(
        'Integration test success',
        {
          variant: 'success',
        },
      )
    })

    it('should work together - create response and handle without snackbar', () => {
      const response = createCustomResponse({
        message: 'Silent integration test',
        showSnackbar: false,
      })

      handleResponse(response, mockEnqueueSnackbar)

      expect(mockEnqueueSnackbar).not.toHaveBeenCalled()
    })

    it('should work together with additional data', () => {
      const response = createCustomResponse({
        message: 'User profile updated',
        showSnackbar: true,
        user: { id: 1, name: 'John' },
        timestamp: new Date().toISOString(),
      } as any)

      handleResponse(response, mockEnqueueSnackbar)

      expect(response.success).toBe(true)
      expect(response.user).toEqual({ id: 1, name: 'John' })
      expect(mockEnqueueSnackbar).toHaveBeenCalledWith('User profile updated', {
        variant: 'success',
      })
    })
  })

  describe('Type Safety', () => {
    it('should have correct CustomResponse type structure', () => {
      const response = createCustomResponse({
        message: 'Type test',
      })

      expect(typeof response.success).toBe('boolean')
      expect(typeof response.message).toBe('string')
      expect(typeof response.status).toBe('number')
      expect(typeof response.showSnackbar).toBe('boolean')
      expect(response.success).toBe(true)
    })

    it('should handle partial parameters correctly', () => {
      const minimal = createCustomResponse({})
      const withMessage = createCustomResponse({
        message: 'Custom message',
      })
      const withStatus = createCustomResponse({
        message: 'Custom message',
        status: 201,
      })

      expect(minimal.message).toBe('Success')
      expect(withMessage.message).toBe('Custom message')
      expect(withStatus.status).toBe(201)
    })

    it('should maintain type safety with spread operator', () => {
      interface UserResponse {
        message: string
        showSnackbar?: boolean
        user: { id: number; name: string }
        roles: string[]
      }

      const userResponse = createCustomResponse({
        message: 'User loaded',
        showSnackbar: true,
        user: { id: 1, name: 'John' },
        roles: ['admin', 'user'],
      } as UserResponse)

      expect(userResponse.success).toBe(true)
      expect(userResponse.user.id).toBe(1)
      expect(userResponse.roles).toEqual(['admin', 'user'])
    })
  })

  describe('Real-world Usage Scenarios', () => {
    it('should handle API success response', () => {
      const response = createCustomResponse({
        message: 'Data retrieved successfully',
        data: { items: [1, 2, 3], total: 3 },
        pagination: { page: 1, hasMore: false },
      } as any)

      expect(response).toMatchObject({
        success: true,
        message: 'Data retrieved successfully',
        status: 200,
        showSnackbar: false,
        data: { items: [1, 2, 3], total: 3 },
        pagination: { page: 1, hasMore: false },
      })
    })

    it('should handle form submission success', () => {
      const response = createCustomResponse({
        message: 'Form submitted successfully',
        status: 201,
        showSnackbar: true,
        formId: 'contact-form',
        submissionId: 'sub_123',
      } as any)

      handleResponse(response, mockEnqueueSnackbar)

      expect(mockEnqueueSnackbar).toHaveBeenCalledWith(
        'Form submitted successfully',
        {
          variant: 'success',
        },
      )
      expect(response.formId).toBe('contact-form')
    })

    it('should handle file upload success', () => {
      const response = createCustomResponse({
        message: 'File uploaded successfully',
        showSnackbar: true,
        fileUrl: 'https://example.com/file.jpg',
        fileSize: 1024,
        mimeType: 'image/jpeg',
      } as any)

      expect(response.fileUrl).toBe('https://example.com/file.jpg')
      expect(response.fileSize).toBe(1024)
      expect(response.success).toBe(true)
    })

    it('should handle authentication success', () => {
      const response = createCustomResponse({
        message: 'Login successful',
        showSnackbar: true,
        token: 'jwt_token_here',
        user: { id: 1, email: 'user@example.com' },
        expiresIn: 3600,
      } as any)

      handleResponse(response, mockEnqueueSnackbar)

      expect(response.token).toBe('jwt_token_here')
      expect(response.user.email).toBe('user@example.com')
      expect(mockEnqueueSnackbar).toHaveBeenCalledWith('Login successful', {
        variant: 'success',
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty message', () => {
      const response = createCustomResponse({
        message: '',
      })

      expect(response.message).toBe('')
      expect(response.success).toBe(true)
    })

    it('should handle very long message', () => {
      const longMessage = 'A'.repeat(1000)
      const response = createCustomResponse({
        message: longMessage,
        showSnackbar: true,
      })

      handleResponse(response, mockEnqueueSnackbar)

      expect(mockEnqueueSnackbar).toHaveBeenCalledWith(longMessage, {
        variant: 'success',
      })
    })

    it('should handle special characters in message', () => {
      const specialMessage = 'Success! 🎉 with émojis & spéciål chars 100%'
      const response = createCustomResponse({
        message: specialMessage,
        showSnackbar: true,
      })

      handleResponse(response, mockEnqueueSnackbar)

      expect(mockEnqueueSnackbar).toHaveBeenCalledWith(specialMessage, {
        variant: 'success',
      })
    })

    it('should handle null/undefined values in spread data', () => {
      const response = createCustomResponse({
        message: 'Success with nulls',
        nullValue: null,
        undefinedValue: undefined,
        emptyString: '',
        zeroNumber: 0,
        falseBool: false,
      } as any)

      expect(response.nullValue).toBe(null)
      expect(response.undefinedValue).toBe(undefined)
      expect(response.emptyString).toBe('')
      expect(response.zeroNumber).toBe(0)
      expect(response.falseBool).toBe(false)
    })

    it('should handle nested objects in spread data', () => {
      const response = createCustomResponse({
        message: 'Complex data structure',
        nested: {
          level1: {
            level2: {
              value: 'deep',
            },
          },
        },
        arrays: [1, [2, [3]]],
      } as any)

      expect(response.nested.level1.level2.value).toBe('deep')
      expect(response.arrays[1][1][0]).toBe(3)
    })

    it('should handle status codes edge cases', () => {
      const testCases = [0, 100, 200, 201, 204, 300, 400, 401, 403, 404, 500]

      testCases.forEach((status) => {
        const response = createCustomResponse({
          message: `Status ${status}`,
          status,
        })

        expect(response.status).toBe(status)
        expect(response.success).toBe(true)
      })
    })
  })
})
