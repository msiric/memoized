import { test, type Page } from '@playwright/test'
import { EL, LK, activeInfo, hydrateLK, lastStep, liveText, open, sampleAfter, save, walkEL } from './common'
import { LK_PROBE, toAsk } from './lk-common'

/** R1-C: interruption matrix over the two reveals. */

const EL_PROBE = `(root) => {
  const outs = [...root.querySelectorAll('li[data-out] [data-viz-reveal="out"]')].filter((n) => n.getBoundingClientRect().width).map((n) => +parseFloat(getComputedStyle(n).opacity).toFixed(3))
  const caps = [...root.querySelectorAll('[data-viz-part="viz-caption"]')].map((c) => +parseFloat(getComputedStyle(c).opacity).toFixed(3) + ':' + (c.textContent || '').slice(0, 30))
  const running = document.getAnimations().filter((a) => a.playState === 'running' && root.contains(a.effect && a.effect.target)).length
  const nx = root.querySelector('[data-viz-part="viz-next"]')
  return { step: root.getAttribute('data-viz-step'), mode: root.getAttribute('data-viz-mode'), outs, caps, running, next: nx && nx.getAttribute('aria-label') }
}`

async function hide(page: Page, hidden: boolean) {
  await page.evaluate((h) => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => h })
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') })
    document.dispatchEvent(new Event('visibilitychange'))
  }, hidden)
}

/** Half-faded leftovers and running animations once settled. */
const settled = (page: Page, root: string) =>
  page.locator(root).evaluate((el) => ({
    running: document.getAnimations().filter((a) => a.playState === 'running' && el.contains((a.effect as KeyframeEffect)?.target ?? null)).map((a) => (a.effect as KeyframeEffect).target!.outerHTML.slice(0, 70)),
    partial: [...el.querySelectorAll('*')]
      .filter((n) => !/(^|\s)opacity-\d/.test(n.getAttribute('class') ?? '') && n.getBoundingClientRect().width)
      .filter((n) => { const o = parseFloat(getComputedStyle(n).opacity); return o > 0.001 && o < 0.999 })
      .map((n) => n.outerHTML.slice(0, 70)),
    riders: el.querySelectorAll('[data-viz-reveal="rider"]').length,
  }))

test('event-loop reveal interruptions @1440', async ({ page }) => {
  test.setTimeout(400_000)
  await open(page, { width: 1440 })
  const f = page.locator(EL)
  await f.scrollIntoViewIfNeeded()
  const last = await lastStep(page)
  const out: Record<string, unknown> = {}
  const toReveal = async () => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await f.getByRole('radio', { name: 'Basics' }).click()
    await page.waitForTimeout(300)
    await walkEL(page, last - 1, '2')
    await f.evaluate((el) => el.scrollIntoView({ block: 'end' }))
    await page.waitForTimeout(250)
  }
  const scen: [string, () => Promise<void>][] = [
    ['back', () => page.keyboard.press('ArrowLeft')],
    ['scrub-to-start', async () => {
      const b = (await f.getByRole('slider').boundingBox())!
      await page.mouse.click(b.x + 6, b.y + b.height / 2)
    }],
    ['resize-to-375', () => page.setViewportSize({ width: 375, height: 900 })],
    ['esc', () => page.keyboard.press('Escape')],
    ['tab-hidden', () => hide(page, true)],
    // Forced: the control is aria-disabled during the reveal (H3 R1M-11, 12), and
    // an unforced click would wait for it and press after the reveal instead.
    ['replay-click-at-100', () => f.locator('[data-viz-part="viz-next"]').click({ force: true })],
    ['home-key', () => page.keyboard.press('Home')],
    ['space', () => page.keyboard.press(' ')],
    ['preset-switch', () => f.getByRole('radio', { name: 'Drain' }).click()],
  ]
  for (const [name, act] of scen) {
    await toReveal()
    await page.getByRole('slider').first().focus()
    const samples = await sampleAfter(
      page,
      EL,
      EL_PROBE,
      async () => {
        await page.keyboard.press('ArrowRight')
        await page.waitForTimeout(100)
        await page.evaluate(() => ((window as any).__r1.mark = Math.round(performance.now() - (window as any).__r1.t0)))
        await act()
      },
      900,
    )
    const markAt = await page.evaluate(() => (window as any).__r1.mark)
    out[name] = { markAt, samples, settled: await settled(page, EL), focus: await activeInfo(page), live: await liveText(page, EL) }
    if (name === 'tab-hidden') await hide(page, false)
  }
  // Replay double tap: two clicks on Next 120 ms apart, from last-1.
  for (const gap of [60, 180, 300, 450]) {
    await toReveal()
    const samples = await sampleAfter(
      page,
      EL,
      EL_PROBE,
      async () => {
        await f.locator('[data-viz-part="viz-next"]').click()
        await page.waitForTimeout(gap)
        await f.locator('[data-viz-part="viz-next"]').click({ force: true })
      },
      800,
    )
    out[`double-tap-${gap}`] = { samples: samples.filter((_, i) => i % 3 === 0), endStep: await f.getAttribute('data-viz-step') }
  }
  save('interrupt-el.json', out)
})

test.skip('list-keys ride interruptions @1440', async ({ page }) => {
  test.setTimeout(300_000)
  await open(page, { width: 1440 })
  await hydrateLK(page)
  const f = page.locator(LK)
  const out: Record<string, unknown> = {}
  const scen: [string, () => Promise<void>][] = [
    ['again', () => f.locator('[data-viz-part="viz-again"]').click()],
    ['key-switch', () => f.getByRole('radiogroup', { name: 'Key strategy' }).getByRole('radio', { name: 'Index' }).click()],
    ['uncheck-source', () => f.locator('input[type="checkbox"]').nth(0).click()],
    ['resize-to-375', () => page.setViewportSize({ width: 375, height: 900 })],
    ['esc', () => page.keyboard.press('Escape')],
    ['tab-hidden', () => hide(page, true)],
  ]
  for (const [name, act] of scen) {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.waitForTimeout(300)
    await toAsk(page, 'Id', 'Reverse', true)
    await f.evaluate((el) => el.scrollIntoView({ block: 'center' }))
    const samples = await sampleAfter(
      page,
      LK,
      LK_PROBE,
      async () => {
        await f.locator('[data-choice-index="0"]').click()
        await page.waitForTimeout(150)
        await act()
      },
      1000,
    )
    out[name] = {
      samples: samples.map((s) => ({ t: s.t, mode: s.v.mode, riders: s.v.riders.map((r: any) => `${r.from}>${r.to}@${r.cx},${r.cy}`), dest: s.v.dest.map((d: any) => `${d.row}:${d.tick}`) })),
      settled: await settled(page, LK),
      focus: await activeInfo(page),
      live: await liveText(page, LK),
      mode: await f.getAttribute('data-viz-mode'),
    }
    if (name === 'tab-hidden') await hide(page, false)
  }
  save('interrupt-lk.json', out)
})
