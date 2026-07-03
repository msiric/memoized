import { render, screen, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import UnsubscribePage from './page'

const searchParamsMock = vi.fn()
vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParamsMock(),
}))

function withParams(query: string) {
  searchParamsMock.mockReturnValue(new URLSearchParams(query))
}

describe('Blog unsubscribe page', () => {
  afterEach(() => cleanup())

  it('confirms success when status=success', () => {
    withParams('status=success')

    render(<UnsubscribePage />)

    expect(screen.getByText("You've been unsubscribed")).toBeInTheDocument()
  })

  it('shows a friendly message for a known error reason', () => {
    withParams('status=error&reason=expired-link')

    render(<UnsubscribePage />)

    expect(screen.getByText('Link Expired')).toBeInTheDocument()
  })

  it('falls back to the generic error copy for an unknown reason', () => {
    withParams('status=error&reason=totally-unknown')

    render(<UnsubscribePage />)

    expect(screen.getByText('Something Went Wrong')).toBeInTheDocument()
  })

  it('shows the default prompt when there is no status', () => {
    withParams('')

    render(<UnsubscribePage />)

    expect(screen.getByText('Unsubscribe from Newsletter')).toBeInTheDocument()
  })

  it('always offers a link back to the blog', () => {
    withParams('status=success')

    render(<UnsubscribePage />)

    expect(screen.getByRole('link', { name: 'Back to Blog' })).toHaveAttribute('href', '/blog')
  })
})
