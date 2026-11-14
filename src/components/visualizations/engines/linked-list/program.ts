/**
 * A lesson program the linked-list visuals draw, and where its pointer
 * states are recorded. React-free and Node-free: presets, the recorder and
 * the truth test share it.
 */

/** A line of the snippet, named by its trimmed text (and which match, when the text repeats). */
export type LineRef = { text: string; nth?: number }

export type Probe = {
  /** Names the probe in the recording and the preset. */
  id: string
  /** The probe runs right after this line, every time it runs. */
  after: LineRef
  /** The first line of the statements this probe closes (a step may show two lines). */
  from?: LineRef
  /** The pointer variables in scope after `after`, in lane order (a name in its TDZ would throw). */
  vars: readonly string[]
}

export type PointerProgram = {
  id: string
  /** Exactly the program that was run: the lesson's code, verbatim, plus any harness named in `harness`. */
  snippet: string
  lang: 'js' | 'ts'
  runtime: string
  /** sha256 of `snippet`. */
  sha256: string
  /** What the plain (uninstrumented) program prints, line by line. */
  observed: readonly string[]
  /** The class whose instances are the list's nodes, and the field drawn as each node's value. */
  nodeClass: string
  valueField: string
  /** The class declaration's last line: node registration is inserted after it. */
  classEnd: LineRef
  /** The lines the reader sees (the lesson function): first and last, inclusive. */
  shown: { first: LineRef; last: LineRef }
  /**
   * Lines of `snippet` that are not the lesson's (the test harness that
   * builds the input and prints the result), so the provenance can say so.
   */
  harness?: string
  probes: readonly Probe[]
}

/** One probe hit: the pointer values (node index or null) and every node's `next`. */
export type ProbeHit = {
  probe: string
  vars: Record<string, number | null>
  next: (number | null)[]
}

export type PointerRecording = {
  sha256: string
  /** The program's own output (stdout), unchanged by the probes. */
  observed: string[]
  /** Node values in creation order (the drawing's left-to-right order). */
  labels: string[]
  hits: ProbeHit[]
}

/** The 0-based line index `ref` names in `lines`; throws unless it names exactly one line. */
export function resolveLine(lines: readonly string[], ref: LineRef, where = ''): number {
  const hits = lines.flatMap((l, i) => (l.trim() === ref.text ? [i] : []))
  const nth = ref.nth ?? 1
  if (ref.nth === undefined && hits.length !== 1)
    throw new Error(`${where}"${ref.text}" matches ${hits.length} lines; name the match with nth`)
  if (hits.length < nth) throw new Error(`${where}"${ref.text}" has no match ${nth}`)
  return hits[nth - 1]
}

/** The lines the reader sees, as they are in the snippet. */
export function shownLines(p: PointerProgram): string[] {
  const lines = p.snippet.split('\n')
  return lines.slice(resolveLine(lines, p.shown.first, `${p.id}: `), resolveLine(lines, p.shown.last, `${p.id}: `) + 1)
}

/**
 * Maps every non-blank snippet line of the shown block to the display
 * lines (1-based) that spell it, when `display` is the same code reflowed
 * to fit the pane (only whitespace differs). Throws when it is not.
 */
export function reflowMap(source: readonly string[], display: readonly string[]): Map<number, [number, number]> {
  const src = source.join('\n').replace(/\s+/g, '')
  const dst = display.join('\n').replace(/\s+/g, '')
  if (src !== dst) {
    let k = 0
    while (k < src.length && src[k] === dst[k]) k++
    throw new Error(`the display code differs from the lesson code beyond whitespace at "${src.slice(k, k + 24)}" vs "${dst.slice(k, k + 24)}"`)
  }
  // Character offsets (whitespace removed) where each line starts and ends.
  const spans = (lines: readonly string[]) => {
    let at = 0
    return lines.map((l) => {
      const n = l.replace(/\s+/g, '').length
      const s = [at, at + n] as const
      at += n
      return s
    })
  }
  const s = spans(source)
  const d = spans(display)
  const out = new Map<number, [number, number]>()
  s.forEach(([a, b], i) => {
    if (a === b) return
    const covering = d.flatMap(([x, y], j) => (x < b && y > a ? [j + 1] : []))
    out.set(i, [covering[0], covering[covering.length - 1]])
  })
  return out
}
