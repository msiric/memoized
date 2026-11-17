/**
 * The lanes substrate (wave 3B): static figures laid out on parallel lanes,
 * for mechanisms whose answer is an order or a place rather than a shape.
 * Four panel kinds share one vocabulary (the heap graph's svg roles, mono
 * labels inside the lanes, the neutral `changed` mark, the result amber):
 *
 * - `timeline`: lanes over a time axis (Performance Optimization: one burst
 *   of calls, a trailing debounce and a leading-only throttle);
 * - `dispatch`: an event's path with a capture lane down and a bubble lane
 *   up, numbered listener badges and where `stopPropagation()` cut it
 *   (Event Handling);
 * - `sequence`: lifelines and numbered messages, the browser's lane shaded
 *   (Frontend Security: OAuth Authorization Code + PKCE);
 * - `sets`: two overlapping bands of values, cards of the members a type
 *   lets you read, and disjoint bands whose overlap is `never` (Advanced
 *   Types).
 *
 * Every mark is built from a recording (`./build.ts`); a preset adds words.
 */

// --- timeline ----------------------------------------------------------------

export type TimelineMark = {
  t: number
  /** call: a tick; ghost: a deadline that was cleared; invoke: the callback ran; drop: a call that ran nothing; release: a timer callback that ran nothing. */
  kind: 'call' | 'ghost' | 'invoke' | 'drop' | 'release'
  label?: string
}

export type TimelineRow = {
  id: string
  label: string
  marks: TimelineMark[]
  /** Spans drawn under the marks (a closed gate). */
  bands: { from: number; to: number; label?: string }[]
}

export type TimelinePanel = { kind: 'timeline'; id: string; heading: string; end: number; ticks: number[]; rows: TimelineRow[]; notes: string[] }

// --- dispatch ------------------------------------------------------------------

export type DispatchStep = { n: number; at: string; phase: 1 | 2 | 3; ran: boolean; log: string }

export type DispatchPanel = {
  kind: 'dispatch'
  id: string
  heading: string
  /** The event's path, window first, the target last. */
  path: string[]
  steps: DispatchStep[]
  /** The step whose listener (or the one right after it) called stopPropagation(). */
  cutAfter?: number
  /** Compact: only the elements with listeners, half width (a variant beside another). */
  compact?: boolean
}

// --- sequence ------------------------------------------------------------------

export type Party = 'browser' | 'app' | 'auth'

export type SequenceMessage = {
  n: number
  from: Party
  to: Party
  channel: 'front' | 'back' | 'self'
  /** What travels: the step's name, then parameter names, short. */
  title: string
  params: string[]
  /** A step the recording does not carry (the user signing in): said in words. */
  modelled?: boolean
}

export type SequencePanel = {
  kind: 'sequence'
  id: string
  heading: string
  parties: { id: Party; label: string }[]
  messages: SequenceMessage[]
  /** Per party: the values it holds by the end. */
  holds: Record<Party, string[]>
  notes: string[]
}

// --- sets ----------------------------------------------------------------------

export type SetsPanel =
  | {
      kind: 'sets'
      id: string
      heading: string
      mode: 'values'
      left: { label: string; members: string; sample: string }
      right: { label: string; members: string; sample: string }
      both: { label: string; sample: string[] }
      /** Under the bands: the union's span and the intersection's. */
      union: string
      notes: string[]
    }
  | {
      kind: 'sets'
      id: string
      heading: string
      mode: 'members'
      cards: { label: string; members: string[]; marked?: boolean }[]
      notes: string[]
    }
  | {
      kind: 'sets'
      id: string
      heading: string
      mode: 'never'
      pairs: { left: string; right: string; result: string }[]
      notes: string[]
    }

export type LanesPanel = TimelinePanel | DispatchPanel | SequencePanel | SetsPanel

export type LanesData = { panels: LanesPanel[] }
