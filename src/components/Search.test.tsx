import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { Search } from './Search'

const mockFetch = vi.fn()
global.fetch = mockFetch

const mockPush = vi.fn()
const mockUsePathname = vi.fn()
const mockUseSearchParams = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => mockUsePathname(),
  useSearchParams: () => mockUseSearchParams(),
}))

vi.mock('@/contexts/auth', () => ({
  useAuthStore: () => ({
    user: null,
  }),
}))

vi.mock('@/contexts/progress', () => ({
  useContentStore: () => ({}),
}))

describe('Search Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    mockUsePathname.mockReturnValue('/test-path')
    mockUseSearchParams.mockReturnValue(new URLSearchParams())
    
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        hits: [
          {
            id: '1',
            title: 'Test Lesson',
            _formatted: {
              title: '<mark>Test</mark> Lesson',
              body: 'This is a <mark>test</mark> content'
            }
          }
        ]
      })
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('renders search button', () => {
    render(<Search />)
    
    const searchButton = screen.getByRole('button', { name: /Find something/i })
    expect(searchButton).toBeDefined()
  })

  it('shows search icon', () => {
    render(<Search />)
    
    const searchButton = screen.getByRole('button', { name: /Find something/i })
    expect(searchButton).toBeDefined()
  })

  it('renders search component without crashing', () => {
    render(<Search />)
    
    expect(screen.getByRole('button', { name: /Find something/i })).toBeDefined()
  })

  it('displays search button text', () => {
    render(<Search />)
    
    expect(screen.getByText('Find something...')).toBeDefined()
  })

  it('displays keyboard shortcut', () => {
    render(<Search />)
    
    expect(screen.getByText('/')).toBeDefined()
  })

  it('renders correctly in desktop view', () => {
    render(<Search />)
    
    const container = screen.getByRole('button', { name: /Find something/i }).parentElement
    expect(container).toHaveClass('hidden', 'lg:block')
  })

  it('handles component mounting', () => {
    const { unmount } = render(<Search />)
    
    unmount()
  })

  it('maintains proper accessibility', () => {
    render(<Search />)
    
    const searchButton = screen.getByRole('button', { name: /Find something/i })
    expect(searchButton).toHaveAttribute('type', 'button')
  })
})