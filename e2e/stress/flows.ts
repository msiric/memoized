import type { Page } from '@playwright/test'
import { KEY_STRATEGIES, LIST_ACTIONS } from '../../src/components/visualizations/engines/list-keys/model'
import { LIST_OUTCOMES } from '../../src/components/visualizations/engines/list-keys/outcomes'
import { settle, type DetectOptions } from './detectors'
import { domClick, type Recorder } from './harness'

/** How a walk meets each checkpoint (H0 N4: skipping alone never shows the right and wrong states). */
export type Answer = 'right' | 'wrong' | 'skip'

/** Checkpoints per preset id: the step each is asked on and its answer (from the descriptor's logs). */
export type PresetAnswers = Record<string, { ask: number; answer: string; choices: string[] }[]>

/** Reads the answers out of a definition's presets (`{ id, log: { checkpoints } }`). */
export function answersOf(presets: readonly { id: string; log: { checkpoints: readonly { beforeStep: number; answer: string; choices: readonly { id: string }[] }[] } }[]): PresetAnswers {
  return Object.fromEntries(
    presets.map((p) => [
      p.id,
      p.log.checkpoints.map((c) => ({ ask: c.beforeStep - 1, answer: c.answer, choices: c.choices.map((x) => x.id) })),
    ]),
  )
}

/**
 * Switches preset `p` through the control that shows (H0 N3): a pointer click
 * on the visible radio, or the select when the segments fell back to it.
 */
async function switchPreset(page: Page, frame: string, p: number) {
  return page.evaluate(
    ({ f, p }) => {
      const el = document.querySelector(f)!
      const before = window.scrollY
      const shown = (e: Element | null) => !!e && (e as HTMLElement).getClientRects().length > 0 && getComputedStyle(e).visibility === 'visible'
      const radios = [...el.querySelectorAll('header [role="radio"]')].filter(shown) as HTMLElement[]
      const sel = el.querySelector('header select') as HTMLSelectElement | null
      let via = 'none'
      if (radios.length > p) {
        radios[p].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1, view: window }))
        via = 'radio'
      } else if (sel && shown(sel)) {
        const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!
        set.call(sel, String(p))
        sel.dispatchEvent(new Event('change', { bubbles: true }))
        via = 'select'
      }
      return new Promise<{ before: number; after: number; via: string }>((res) =>
        requestAnimationFrame(() => requestAnimationFrame(() => res({ before, after: window.scrollY, via }))),
      )
    },
    { f: frame, p },
  )
}

/**
 * Drives a StepThrough frame through every preset (switched with the control
 * that shows) and, per preset, one walk per answer policy (right, wrong,
 * skip) over every step, checking each state. The frame's box is compared per
 * preset (R2: a preset switch may change the frame's height, stepping never
 * does).
 */
export async function walkStepThrough(
  page: Page,
  rec: Recorder,
  scope: string,
  visual: string,
  opts: DetectOptions = {},
  answers: PresetAnswers = {},
  policies: readonly Answer[] = ['right', 'wrong', 'skip'],
) {
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
      const r = await switchPreset(page, frame, p)
      if (r.via === 'none') rec.note(visual, `preset ${p}`, 'preset-switch', 'no visible radio or select to switch presets')
      rec.scrollJump(visual, `preset ${p} (${r.via})`, r.before, r.after)
    }
    const preset = (await page.getAttribute(frame, 'data-viz-preset')) ?? String(p)
    const key = `${visual} | ${preset}`
    const cps = answers[preset] ?? []
    for (const [w, policy] of policies.entries()) {
      if (w > 0) {
        await domClick(page, `${frame} [aria-label="Restart"]`)
        await settle(page, 30)
      }
      for (let guard = 0; guard < 60; guard++) {
        const step = await page.getAttribute(frame, 'data-viz-step')
        const mode = await page.getAttribute(frame, 'data-viz-mode')
        await rec.check(page, scope, visual, `${preset} ${policy} step ${step} ${mode}`, opts, key)
        let target: string
        if (mode === 'ask') {
          const cp = cps.find((c) => c.ask === Number(step))
          const pick =
            policy === 'skip' || !cp
              ? null
              : policy === 'right'
                ? cp.answer
                : cp.choices.find((c) => c !== cp.answer) ?? null
          target =
            pick === null
              ? `${frame} [data-viz-part="viz-skip"]`
              : `${frame} [data-viz-region="dock"] [data-choice="${pick}"]:not([data-viz-part="dock-ghosts"] *)`
        } else {
          const next = `${frame} [data-viz-part="viz-next"]`
          // The last step: Next is unavailable, or it became Replay (D21).
          const done =
            (await page.getAttribute(next, 'aria-disabled')) === 'true' ||
            (await page.getAttribute(next, 'data-viz-end')) !== null
          if (done) break
          target = next
        }
        const r = await domClick(page, target)
        if (!r) rec.note(visual, `${preset} ${policy} step ${step}`, 'missing-control', `no element for ${target}`)
        else rec.scrollJump(visual, `${preset} ${policy} step ${step} ${mode} -> next`, r.before, r.after)
      }
    }
  }
  // Back to Start, so a later visual on the same page is not measured with this one's last step.
  await domClick(page, `${frame} [aria-label="Restart"]`)
  await settle(page, 30)
}

/**
 * The keyboard path (H0 N1): Enter on a focused control may scroll the page
 * only to bring the newly focused element into view, never otherwise.
 */
export async function keyActivate(page: Page, rec: Recorder, selector: string, visual: string, state: string) {
  const before = await page.evaluate((sel) => {
    ;(document.querySelector(sel) as HTMLElement | null)?.focus({ preventScroll: true })
    return window.scrollY
  }, selector)
  await page.keyboard.press('Enter')
  await settle(page, 60)
  const r = await page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null
    const b = a?.getBoundingClientRect()
    return { after: window.scrollY, inView: !!b && b.top >= 0 && b.bottom <= window.innerHeight, focus: a?.tagName ?? 'none' }
  })
  if (Math.abs(r.after - before) > 0.5 && !r.inView)
    rec.note(visual, state, 'scroll-jump', `keyboard activation scrolled ${before} -> ${r.after} and the focused ${r.focus} is not in view`)
  return r
}

/** Drives the list-keys explorable through every key x action (ask, reveal) and the wrapper scene. */
export async function walkListKeys(page: Page, rec: Recorder, scope: string, visual: string, wrapper = false) {
  const frame = `${scope} section[data-viz-frame]`
  await page.waitForSelector(`${frame}[data-viz-interactive="true"]`, { timeout: 30_000 })
  const mode = () => page.getAttribute(frame, 'data-viz-mode')
  const click = async (sel: string, label: string) => {
    const r = await domClick(page, `${frame} ${sel}`)
    if (!r) rec.note(visual, label, 'missing-control', `no element for ${sel}`)
    else rec.scrollJump(visual, label, r.before, r.after)
    await settle(page, 30)
  }
  // The action is an always-visible control (H3 R8): choosing it asks again,
  // from any phase. A hidden segment (the select fallback shows) still takes
  // a DOM click, so the flow is the same at every width.
  await rec.check(page, scope, visual, `initial ${await mode()}`)
  if (wrapper) {
    for (const action of ['type', 'class']) {
      await click(`[data-viz-focus="action-${action}"]`, `wrapper ${action}`)
      await rec.check(page, scope, visual, `wrapper ${action} ${await mode()}`)
      // The first by pointer, the second from the keyboard (N1: both paths).
      if (action === 'type') await click('[data-viz-part="viz-skip"]', `wrapper ${action} skip`)
      else await keyActivate(page, rec, `${frame} [data-viz-part="viz-skip"]`, visual, `wrapper ${action} skip (keyboard)`)
      await rec.check(page, scope, visual, `wrapper ${action} ${await mode()}`)
    }
    return
  }
  for (const [k, key] of KEY_STRATEGIES.entries()) {
    const r = await page.evaluate(
      ({ f, key }) => {
        const before = window.scrollY
        const group = document.querySelector(`${f} [role="radiogroup"][aria-label="Key strategy"]`)
        const radios = [...(group?.querySelectorAll('[role="radio"]') ?? [])] as HTMLElement[]
        const label = key === 'random' ? 'Math.random()' : key
        radios
          .find((x) => x.textContent?.trim() === label || x.getAttribute('aria-label') === label)
          ?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1, view: window }))
        return { before, after: window.scrollY, found: radios.length }
      },
      { f: frame, key },
    )
    rec.scrollJump(visual, `key ${key}`, r.before, r.after)
    for (const [a, action] of LIST_ACTIONS.entries()) {
      await click(`[data-viz-focus="action-${action}"]`, `${key}/${action}`)
      await rec.check(page, scope, visual, `${key}/${action} ${await mode()}`)
      // Answered as well as skipped (N4): the first choice, the second, or Skip, in turn.
      const policy = (k + a) % 3
      if (policy === 2) await click('[data-viz-part="viz-skip"]', `${key}/${action} skip`)
      else await click(`[data-choice-index="${policy}"]`, `${key}/${action} pick ${policy}`)
      const reused = LIST_OUTCOMES[`${key}/${action}`].reused as (number | null)[]
      await rec.check(page, scope, visual, `${key}/${action} ${['pick 0', 'pick 1', 'skip'][policy]} ${await mode()}`, { reused })
    }
  }
}
