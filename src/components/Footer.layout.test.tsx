import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CONTENT_COLUMN_CLASSES } from '@/constants/content-layout'
import { Footer } from './Footer'

vi.mock('@/hooks/usePages', () => ({
  usePages: () => ({
    previousPage: { title: 'Previous lesson', href: '/previous' },
    currentPage: { access: 'FREE' },
    nextPage: { title: 'A long next lesson title that must wrap', href: '/next' },
  }),
}))
vi.mock('@/hooks/useAccess', () => ({ useAccess: () => true }))
vi.mock('@/contexts/auth', () => ({
  useAuthStore: (selector: (state: { user: null }) => unknown) => selector({ user: null }),
}))

describe('reader footer layout', () => {
  afterEach(cleanup)

  it('uses the same prose column without adding another horizontal inset', () => {
    const { container } = render(<Footer width="prose" />)
    expect(container.querySelector('footer')?.className).toContain(CONTENT_COLUMN_CLASSES)
    expect(container.querySelector('footer')).not.toHaveClass('sm:px-6', 'lg:px-8')
  })

  it('keeps both navigation columns shrinkable and long titles wrappable', () => {
    render(<Footer width="prose" />)
    const navigation = screen.getByRole('navigation', { name: 'Page navigation' })
    expect(navigation).toHaveClass('grid', 'grid-cols-2')
    expect([...navigation.children].every(child => child.classList.contains('min-w-0'))).toBe(true)
    expect(screen.getByText('A long next lesson title that must wrap')).toHaveClass('break-words', 'max-w-full')
    expect(screen.getByRole('link', { name: 'Previous: Previous lesson' })).toHaveAttribute('href', '/previous')
  })

  it('preserves the default full-width footer for non-reader pages', () => {
    const { container } = render(<Footer />)
    expect(container.querySelector('footer')).toHaveClass('sm:px-6', 'lg:px-8')
  })
})
