import type { Page } from '@playwright/test'
import { KEY_STRATEGIES, LIST_ACTIONS } from '../../src/components/visualizations/engines/list-keys/model'
import { LIST_OUTCOMES } from '../../src/components/visualizations/engines/list-keys/outcomes'
import { settle, type DetectOptions } from './detectors'
import { domClick, type Recorder } from './harness'

/** Drives a StepThrough frame through every preset and every step (skipping each checkpoint), checking each state. */
export async function walkStepThrough(page: Page, rec: Recorder, scope: string, visual: string, opts: DetectOptions = {}) {
  const frame = `${scope} section[data-viz-frame]`
  await page.waitForSelector(`${frame}[data-viz-interactive="true"]`, { timeout: 30_000 })
  const presetCount = await page.evaluate((f) => {
    const el = document.querySelector(f)!
    const sel = el.querySelector('header select') as HTMLSelectElement | null
    if (sel) return sel.options.length
    return Math.max(1, el.querySelectorAll('header [role="radio"]').length)
  }, frame)
  for (let p = 0; p < presetCount; p++) {
    if (p > 0) {
      const r = await page.evaluate(
        ({ f, p }) => {
          const el = document.querySelector(f)!
          const before = window.scrollY
          const sel = el.querySelector('header select') as HTMLSelectElement | null
          if (sel) {
            const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!
            set.call(sel, String(p))
            sel.dispatchEvent(new Event('change', { bubbles: true }))
          } else (el.querySelectorAll('header [role="radio"]')[p] as HTMLElement).click()
          return new Promise<{ before: number; after: number }>((res) =>
            requestAnimationFrame(() => requestAnimationFrame(() => res({ before, after: window.scrollY }))),
          )
        },
        { f: frame, p },
      )
      rec.scrollJump(visual, `preset ${p}`, r.before, r.after)
    }
    const preset = await page.getAttribute(frame, 'data-viz-preset')
    for (let guard = 0; guard < 60; guard++) {
      const step = await page.getAttribute(frame, 'data-viz-step')
      const mode = await page.getAttribute(frame, 'data-viz-mode')
      await rec.check(page, scope, visual, `${preset} step ${step} ${mode}`, opts)
      let target: string
      if (mode === 'ask') target = `${frame} [data-viz-part="viz-skip"]`
      else {
        const next = `${frame} [data-viz-part="viz-next"]`
        // The last step: Next is unavailable, or it became Replay (D21).
        const done =
          (await page.getAttribute(next, 'aria-disabled')) === 'true' ||
          (await page.getAttribute(next, 'data-viz-end')) !== null
        if (done) break
        target = `${frame} [data-viz-part="viz-next"]`
      }
      const r = await domClick(page, target)
      if (r) rec.scrollJump(visual, `${preset} step ${step} ${mode} -> next`, r.before, r.after)
    }
  }
  // Back to Start, so a later visual on the same page is not measured with this one's last step.
  await domClick(page, `${frame} [aria-label="Restart"]`)
  await settle(page, 30)
}

/** Drives the list-keys explorable through every key x action (pick, ask, reveal) and the wrapper scene. */
export async function walkListKeys(page: Page, rec: Recorder, scope: string, visual: string, wrapper = false) {
  const frame = `${scope} section[data-viz-frame]`
  await page.waitForSelector(`${frame}[data-viz-interactive="true"]`, { timeout: 30_000 })
  const mode = () => page.getAttribute(frame, 'data-viz-mode')
  const click = async (sel: string, label: string) => {
    const r = await domClick(page, `${frame} ${sel}`)
    if (r) rec.scrollJump(visual, label, r.before, r.after)
    await settle(page, 30)
  }
  const toPick = async () => {
    const m = await mode()
    if (m === 'reveal') await click('[data-viz-part="viz-again"]', 'again')
    else if (m === 'ask') await click('[data-viz-part="viz-back"]', 'back')
  }
  await rec.check(page, scope, visual, `initial ${await mode()}`)
  if (wrapper) {
    for (const action of ['type', 'class']) {
      await toPick()
      await rec.check(page, scope, visual, `wrapper pick`)
      await click(`[data-viz-focus="action-${action}"]`, `wrapper ${action}`)
      await rec.check(page, scope, visual, `wrapper ${action} ${await mode()}`)
      await click('[data-viz-part="viz-skip"]', `wrapper ${action} skip`)
      await rec.check(page, scope, visual, `wrapper ${action} ${await mode()}`)
    }
    return
  }
  for (const key of KEY_STRATEGIES) {
    await toPick()
    const r = await page.evaluate(
      ({ f, key }) => {
        const before = window.scrollY
        const group = document.querySelector(`${f} [role="radiogroup"][aria-label="Key strategy"]`)
        const radios = [...(group?.querySelectorAll('[role="radio"]') ?? [])] as HTMLElement[]
        const label = key === 'random' ? 'Math.random()' : key
        radios.find((x) => x.textContent?.trim() === label || x.getAttribute('aria-label') === label)?.click()
        return { before, after: window.scrollY, found: radios.length }
      },
      { f: frame, key },
    )
    rec.scrollJump(visual, `key ${key}`, r.before, r.after)
    for (const action of LIST_ACTIONS) {
      await toPick()
      await rec.check(page, scope, visual, `${key} pick`)
      await click(`[data-viz-focus="action-${action}"]`, `${key}/${action}`)
      await rec.check(page, scope, visual, `${key}/${action} ${await mode()}`)
      await click('[data-viz-part="viz-skip"]', `${key}/${action} skip`)
      const reused = LIST_OUTCOMES[`${key}/${action}`].reused as (number | null)[]
      await rec.check(page, scope, visual, `${key}/${action} ${await mode()}`, { reused })
    }
  }
}
