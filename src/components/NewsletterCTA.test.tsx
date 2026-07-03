import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NewsletterCTA } from './NewsletterCTA'

// Mock GridPattern component
vi.mock('@/components/GridPattern', () => ({
  GridPattern: () => <div data-testid="grid-pattern" />,
}))

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('NewsletterCTA', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  describe('Rendering', () => {
    it('renders email input', () => {
      render(<NewsletterCTA />)

      expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument()
    })

    it('renders subscribe button', () => {
      render(<NewsletterCTA />)

      expect(screen.getByRole('button', { name: /subscribe/i })).toBeInTheDocument()
    })

    it('renders with idle state initially', () => {
      render(<NewsletterCTA />)

      expect(screen.getByRole('button', { name: /subscribe/i })).toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('renders heading and description', () => {
      render(<NewsletterCTA />)

      expect(screen.getByText('Stay in the loop')).toBeInTheDocument()
      expect(screen.getByText(/Get notified when I publish new posts/)).toBeInTheDocument()
    })

    it('renders email icon', () => {
      render(<NewsletterCTA />)

      // Check for the SVG with email path
      expect(document.querySelector('svg')).toBeInTheDocument()
    })
  })

  describe('Validation', () => {
    it('shows error for empty submission', async () => {
      render(<NewsletterCTA />)

      const form = document.querySelector('form')!

      // Submit the form directly (bypasses HTML5 validation)
      fireEvent.submit(form)

      // Check for error message
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Email is required')
      })
    })

    it('shows error for invalid email format', async () => {
      const user = userEvent.setup()
      render(<NewsletterCTA />)

      const input = screen.getByPlaceholderText('you@example.com')
      const form = document.querySelector('form')!

      await user.type(input, 'notanemail')
      fireEvent.submit(form)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Please enter a valid email address')
      })
    })

    it('shows error for email without domain', async () => {
      const user = userEvent.setup()
      render(<NewsletterCTA />)

      const input = screen.getByPlaceholderText('you@example.com')
      const form = document.querySelector('form')!

      await user.type(input, 'test@')
      fireEvent.submit(form)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Please enter a valid email address')
      })
    })

    it('shows error for email > 254 chars', async () => {
      const user = userEvent.setup()
      render(<NewsletterCTA />)

      const input = screen.getByPlaceholderText('you@example.com')
      const form = document.querySelector('form')!
      const longEmail = 'a'.repeat(250) + '@test.com'

      await user.type(input, longEmail)
      fireEvent.submit(form)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Email address is too long')
      })
    })

    it('clears error when user types', async () => {
      const user = userEvent.setup()
      render(<NewsletterCTA />)

      const input = screen.getByPlaceholderText('you@example.com')
      const form = document.querySelector('form')!

      // Cause an error
      await user.type(input, 'invalid')
      fireEvent.submit(form)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })

      // Start typing again - error should clear
      await user.type(input, 'a')

      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      })
    })

    it('accepts valid email format', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Thank you for subscribing!' }),
      })

      render(<NewsletterCTA />)

      const input = screen.getByPlaceholderText('you@example.com')

      await user.type(input, 'valid@example.com')
      await user.type(input, '{enter}')

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })
    })
  })

  describe('Submission', () => {
    it('shows loading state during submission', async () => {
      const user = userEvent.setup()
      // Never resolve to keep loading state
      mockFetch.mockImplementation(() => new Promise(() => {}))

      render(<NewsletterCTA />)

      const input = screen.getByPlaceholderText('you@example.com')

      await user.type(input, 'test@example.com')
      await user.type(input, '{enter}')

      await waitFor(() => {
        expect(screen.getByText('Subscribing...')).toBeInTheDocument()
      })
    })

    it('disables button during loading', async () => {
      const user = userEvent.setup()
      mockFetch.mockImplementation(() => new Promise(() => {}))

      render(<NewsletterCTA />)

      const input = screen.getByPlaceholderText('you@example.com')
      const button = screen.getByRole('button', { name: /subscribe/i })

      await user.type(input, 'test@example.com')
      await user.type(input, '{enter}')

      await waitFor(() => {
        expect(button).toBeDisabled()
      })
    })

    it('disables input during loading', async () => {
      const user = userEvent.setup()
      mockFetch.mockImplementation(() => new Promise(() => {}))

      render(<NewsletterCTA />)

      const input = screen.getByPlaceholderText('you@example.com')

      await user.type(input, 'test@example.com')
      await user.type(input, '{enter}')

      await waitFor(() => {
        expect(input).toBeDisabled()
      })
    })

    it('shows success state on successful subscription', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Thank you for subscribing!' }),
      })

      render(<NewsletterCTA />)

      const input = screen.getByPlaceholderText('you@example.com')

      await user.type(input, 'test@example.com')
      await user.type(input, '{enter}')

      await waitFor(() => {
        expect(screen.getByText('Thank you for subscribing!')).toBeInTheDocument()
        expect(screen.getByText('🎉')).toBeInTheDocument()
        expect(screen.getByText(/Check your inbox/)).toBeInTheDocument()
      })
    })

    it('does not show check inbox message for already subscribed users', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: "You're already subscribed!" }),
      })

      render(<NewsletterCTA />)

      const input = screen.getByPlaceholderText('you@example.com')

      await user.type(input, 'existing@example.com')
      await user.type(input, '{enter}')

      await waitFor(() => {
        expect(screen.getByText("You're already subscribed!")).toBeInTheDocument()
        expect(screen.getByText('🎉')).toBeInTheDocument()
        // Should show different message since no welcome email was sent
        expect(screen.queryByText(/Check your inbox/)).not.toBeInTheDocument()
        expect(screen.getByText(/You'll receive an email when a new post is published/)).toBeInTheDocument()
      })
    })

    it('shows error state on API error', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Server error' }),
      })

      render(<NewsletterCTA />)

      const input = screen.getByPlaceholderText('you@example.com')

      await user.type(input, 'test@example.com')
      await user.type(input, '{enter}')

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Server error')
      })
    })

    it('shows error state on network error', async () => {
      const user = userEvent.setup()
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      render(<NewsletterCTA />)

      const input = screen.getByPlaceholderText('you@example.com')

      await user.type(input, 'test@example.com')
      await user.type(input, '{enter}')

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Network error')
      })
    })

    it('sends correct request body', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Success' }),
      })

      render(<NewsletterCTA />)

      const input = screen.getByPlaceholderText('you@example.com')

      await user.type(input, '  Test@EXAMPLE.com  ')
      await user.type(input, '{enter}')

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/newsletter/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test@example.com' }),
        })
      })
    })

    it('clears email field on success', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Success' }),
      })

      render(<NewsletterCTA />)

      const input = screen.getByPlaceholderText('you@example.com')

      await user.type(input, 'test@example.com')
      await user.type(input, '{enter}')

      // After success, the form is replaced with success message
      // So the input should no longer exist
      await waitFor(() => {
        expect(screen.queryByPlaceholderText('you@example.com')).not.toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('has aria-label on input', () => {
      render(<NewsletterCTA />)

      const input = screen.getByPlaceholderText('you@example.com')
      expect(input).toHaveAttribute('aria-label', 'Email address')
    })

    it('has role="alert" on error message', async () => {
      const user = userEvent.setup()
      render(<NewsletterCTA />)

      const input = screen.getByPlaceholderText('you@example.com')
      const form = document.querySelector('form')!

      await user.type(input, 'invalid')
      fireEvent.submit(form)

      await waitFor(() => {
        const alert = screen.getByRole('alert')
        expect(alert).toBeInTheDocument()
      })
    })

    it('has aria-live="polite" on error message', async () => {
      const user = userEvent.setup()
      render(<NewsletterCTA />)

      const input = screen.getByPlaceholderText('you@example.com')
      const form = document.querySelector('form')!

      await user.type(input, 'invalid')
      fireEvent.submit(form)

      await waitFor(() => {
        const alert = screen.getByRole('alert')
        expect(alert).toHaveAttribute('aria-live', 'polite')
      })
    })

    it('input has type="email"', () => {
      render(<NewsletterCTA />)

      const input = screen.getByPlaceholderText('you@example.com')
      expect(input).toHaveAttribute('type', 'email')
    })

    it('button is initially disabled when email is empty', () => {
      render(<NewsletterCTA />)

      const button = screen.getByRole('button', { name: /subscribe/i })
      expect(button).toBeDisabled()
    })

    it('button is enabled when email has value', async () => {
      const user = userEvent.setup()
      render(<NewsletterCTA />)

      const input = screen.getByPlaceholderText('you@example.com')
      const button = screen.getByRole('button', { name: /subscribe/i })

      await user.type(input, 'a')

      expect(button).not.toBeDisabled()
    })
  })

  describe('Edge Cases', () => {
    it('prevents double submission', async () => {
      const user = userEvent.setup()
      let resolvePromise: (value: unknown) => void
      const promise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockFetch.mockImplementation(() => promise)

      render(<NewsletterCTA />)

      const input = screen.getByPlaceholderText('you@example.com')
      const button = screen.getByRole('button', { name: /subscribe/i })

      await user.type(input, 'test@example.com')
      
      // Click submit button twice quickly
      await user.click(button)
      await user.click(button)

      // Should only have been called once
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Resolve the promise to clean up
      resolvePromise!({
        ok: true,
        json: async () => ({ message: 'Success' }),
      })
    })

    it('trims whitespace from email', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Success' }),
      })

      render(<NewsletterCTA />)

      const input = screen.getByPlaceholderText('you@example.com')

      await user.type(input, '   test@example.com   ')
      await user.type(input, '{enter}')

      await waitFor(() => {
        const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
        expect(callBody.email).toBe('test@example.com')
      })
    })

    it('converts email to lowercase', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Success' }),
      })

      render(<NewsletterCTA />)

      const input = screen.getByPlaceholderText('you@example.com')

      await user.type(input, 'TEST@EXAMPLE.COM')
      await user.type(input, '{enter}')

      await waitFor(() => {
        const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
        expect(callBody.email).toBe('test@example.com')
      })
    })

    it('handles API response without message field', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}), // No message field
      })

      render(<NewsletterCTA />)

      const input = screen.getByPlaceholderText('you@example.com')

      await user.type(input, 'test@example.com')
      await user.type(input, '{enter}')

      await waitFor(() => {
        // Should use default success message
        expect(screen.getByText('Thank you for subscribing!')).toBeInTheDocument()
      })
    })

    it('handles API error response without error field', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}), // No error field
      })

      render(<NewsletterCTA />)

      const input = screen.getByPlaceholderText('you@example.com')

      await user.type(input, 'test@example.com')
      await user.type(input, '{enter}')

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Failed to subscribe')
      })
    })
  })
})
