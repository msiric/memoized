import { describe, expect, it, vi } from 'vitest'
import { permanentRedirect } from 'next/navigation'
import { GET } from './route'
vi.mock('next/navigation', () => ({ permanentRedirect: vi.fn() }))

describe('Legacy blog sitemap', () => {
  it('redirects to the single canonical inventory rather than emitting stale dates', () => {
    GET()
    expect(permanentRedirect).toHaveBeenCalledWith('/sitemap.xml')
  })
})
