'use client'

import { usePathname } from 'next/navigation'

// Signed-out lessons are rendered (and cached) under the internal /public tree
// and served at their canonical /courses/... URL via a middleware rewrite.
// During that render usePathname() reports /public/...; strip it so server
// HTML and the hydrated client agree on the canonical path.
export const toSitePath = (pathname: string) =>
  pathname === '/public' ? '/' : pathname.startsWith('/public/') ? pathname.slice('/public'.length) : pathname

export function useSitePathname(): string {
  return toSitePath(usePathname() ?? '')
}
