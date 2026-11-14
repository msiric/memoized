import { describe, expect, it } from 'vitest'
import { cn } from './cn'

/** The merges the primitives rely on (drift D08: overrides used to lose to CSS order). */
describe('cn (tailwind-merge with the project theme)', () => {
  it('lets an override win over the base of the same group', () => {
    expect(cn('text-sm font-medium px-3', 'text-xs font-semibold px-0')).toBe('text-xs font-semibold px-0')
    expect(cn('rounded-full', 'rounded-lg')).toBe('rounded-lg')
    expect(cn('h-11 w-11', 'w-auto')).toBe('h-11 w-auto')
  })

  it('knows the custom text-2xs size and never confuses it with a color', () => {
    expect(cn('text-2xs text-zinc-300', 'text-xs')).toBe('text-zinc-300 text-xs')
    expect(cn('text-zinc-300 text-2xs', 'text-lime-400')).toBe('text-2xs text-lime-400')
  })

  it('treats a font size and its leading per Tailwind rules', () => {
    expect(cn('text-sm leading-7', 'leading-6')).toBe('text-sm leading-6')
  })

  it('merges variants, the press step and the vz-frame color', () => {
    expect(cn('can-hover:bg-zinc-800 active:brightness-98', 'can-hover:bg-lime-600')).toBe(
      'active:brightness-98 can-hover:bg-lime-600',
    )
    expect(cn('bg-zinc-800/40', 'bg-vz-frame')).toBe('bg-vz-frame')
    expect(cn('ring-1 ring-inset ring-zinc-800', 'ring-lime-400')).toBe('ring-1 ring-inset ring-lime-400')
    expect(cn('text-balance', 'text-pretty')).toBe('text-pretty')
  })

  it('keeps the focus ring intact', () => {
    const ring =
      'outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-500'
    expect(cn(ring)).toBe(ring)
  })
})
