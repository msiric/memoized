'use client'

import { useEffect, useState } from 'react'

/**
 * True only after the component has mounted on the client.
 *
 * Visualizations use framer-motion, which injects animation inline-styles that
 * can differ between the server render and the first client render (especially
 * with reduced-motion). Gating motion behind this flag makes the server render
 * and the first client render identical and static, so hydration always
 * matches. Animation turns on immediately after, with no visible flash because
 * the mounted state starts at the same first frame.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted
}
