import { cn } from './cn'
import { ink, type as typeScale } from './tokens-v3'

/**
 * Provenance line: one wording template for every visual (drift X13),
 * 12/20 sans in zinc-400 (P: typography.ts:209-214, figcaption tone). On the
 * footer row from 768 (beside the disclosure), under it below 768.
 *
 *   Recorded from a real run in Node 24.x
 *   Recorded from real runs in React 18.3.1 and 19.3.1
 */
export function provenanceText(runtimes: readonly string[]): string {
  const list =
    runtimes.length <= 1
      ? (runtimes[0] ?? '')
      : `${runtimes.slice(0, -1).join(', ')} and ${runtimes[runtimes.length - 1]}`
  return runtimes.length > 1 ? `Recorded from real runs in ${list}` : `Recorded from a real run in ${list}`
}

export const PROVENANCE_LINE = typeScale.provenance.line

export function Provenance({ runtimes, className }: { runtimes: readonly string[]; className?: string }) {
  return (
    <p
      data-viz-part="viz-provenance"
      className={cn(
        'm-0 vz-wide:absolute vz-wide:right-0 vz-wide:top-0 vz-wide:flex vz-wide:h-11 vz-wide:items-center',
        typeScale.provenance.cls,
        ink.muted,
        className,
      )}
    >
      {provenanceText(runtimes)}
    </p>
  )
}
