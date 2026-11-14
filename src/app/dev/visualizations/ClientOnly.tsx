'use client'

import type { ReactNode } from 'react'
import { useMounted } from '@/components/visualizations/primitives/useMounted'

/** Renders children only after mount: simulates a soft navigation (no server HTML). */
export function ClientOnly({ children }: { children: ReactNode }) {
  return useMounted() ? <>{children}</> : null
}
