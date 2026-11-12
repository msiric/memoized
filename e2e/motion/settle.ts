import type { Page } from '@playwright/test'

/**
 * A settled-state snapshot of a frame: every glyph with its lane, position,
 * effective opacity and own transform, the visible caption copies, and any
 * animation still running. Two snapshots of the same step must be equal, and
 * a settled frame must have no running animation, no partial opacity and no
 * leftover transform.
 */
export type Snap = {
  step: string | null
  mode: string | null
  glyphs: { id: string; lane: string; x: number; y: number; eff: number; tf: string }[]
  captions: { text: string; eff: number }[]
  running: { label: string; time: number | null; duration: unknown }[]
  partial: string[]
}

export async function snap(page: Page, root: string): Promise<Snap> {
  return page.evaluate((sel) => {
    const frame = document.querySelector(sel) as HTMLElement
    const fr = frame.getBoundingClientRect()
    const eff = (el: Element | null) => {
      let o = 1
      for (let n = el; n && n !== frame.parentElement; n = n.parentElement) {
        const cs = getComputedStyle(n)
        if (cs.visibility === 'hidden') return 0
        o *= parseFloat(cs.opacity)
      }
      return Math.round(o * 1000) / 1000
    }
    const glyphs = [...frame.querySelectorAll('[data-chip], li[data-out], [data-viz-part="state-chip"], [data-row]')].map((el) => {
      const r = el.getBoundingClientRect()
      const lane = el.closest('[data-viz-region]')?.getAttribute('data-viz-region') ?? ''
      const wrap = el.closest('[data-glyph]') ?? el
      return {
        id: el.getAttribute('data-chip') ?? el.getAttribute('data-out') ?? el.getAttribute('data-row') ?? el.textContent?.trim() ?? '',
        lane,
        x: Math.round(r.left - fr.left),
        y: Math.round(r.top - fr.top),
        eff: eff(el),
        tf: getComputedStyle(wrap).transform + '|' + getComputedStyle(el.parentElement!).transform,
      }
    })
    const captions = [...frame.querySelectorAll('[data-viz-part="viz-caption"]')].map((c) => ({
      text: (c.textContent ?? '').slice(0, 40),
      eff: eff(c),
    }))
    const running = document
      .getAnimations()
      .filter((a) => a.playState === 'running' && frame.contains((a.effect as KeyframeEffect)?.target ?? null))
      .map((a) => ({
        label: ((a.effect as KeyframeEffect).target as Element).outerHTML.slice(0, 80),
        time: a.currentTime as number | null,
        duration: a.effect?.getComputedTiming().duration,
      }))
    const partial = [...frame.querySelectorAll('*')]
      .filter((el) => {
        // A deliberate resting opacity (an unavailable control's opacity-50) is not a fade.
        if (/(^|\s)opacity-\d/.test(el.getAttribute('class') ?? '')) return false
        const o = parseFloat(getComputedStyle(el).opacity)
        return o > 0.001 && o < 0.999
      })
      .map((el) => el.outerHTML.slice(0, 80))
    return {
      step: frame.getAttribute('data-viz-step'),
      mode: frame.getAttribute('data-viz-mode'),
      glyphs,
      captions,
      running,
      partial,
    }
  }, root)
}

/** Differences between two snapshots' glyphs (lane, position within 1 px, opacity). */
export function diffGlyphs(a: Snap, b: Snap): string[] {
  const out: string[] = []
  const key = (g: Snap['glyphs'][number]) => `${g.lane}/${g.id}`
  const mb = new Map(b.glyphs.map((g) => [key(g), g]))
  const ma = new Map(a.glyphs.map((g) => [key(g), g]))
  for (const [k, g] of ma) {
    const h = mb.get(k)
    if (!h) out.push(`only in actual: ${k} eff ${g.eff}`)
    else if (Math.abs(g.x - h.x) > 1 || Math.abs(g.y - h.y) > 1 || Math.abs(g.eff - h.eff) > 0.01)
      out.push(`${k}: actual (${g.x},${g.y}) eff ${g.eff} vs reference (${h.x},${h.y}) eff ${h.eff}`)
  }
  for (const k of mb.keys()) if (!ma.has(k)) out.push(`missing in actual: ${k}`)
  const visCaps = (s: Snap) => s.captions.filter((c) => c.eff > 0.01).map((c) => c.text)
  // Captions are compared only in the same dock mode (Back from a reveal lands on the plain step).
  if (a.mode === b.mode && visCaps(a).join('|') !== visCaps(b).join('|')) out.push(`captions ${visCaps(a).join('|')} vs ${visCaps(b).join('|')}`)
  return out
}
