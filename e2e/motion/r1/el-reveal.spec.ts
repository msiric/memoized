import { test } from '@playwright/test'
import { EL, burstShots, lastStep, open, sampleAfter, save, strip, walkEL, activeInfo, liveText } from './common'

/** R1-C: frame-sample the event-loop reveal (playback, recap, Replay) at 375 and 1440. */

const PROBE = `(root) => {
  const eff = (el) => { let o = 1; for (let n = el; n && n !== document; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.display === 'none' || cs.visibility === 'hidden') return 0; o *= parseFloat(cs.opacity) } return Math.round(o * 1000) / 1000 }
  const fr = root.getBoundingClientRect()
  const outs = [...root.querySelectorAll('li[data-out]')].filter((li) => li.offsetParent).map((li) => {
    const t = li.querySelector('[data-viz-reveal="out"]')
    const r = li.getBoundingClientRect()
    return { k: li.getAttribute('data-out'), tint: t ? Math.round(parseFloat(getComputedStyle(t).opacity) * 1000) / 1000 : null, eff: eff(li), tf: getComputedStyle(li).transform, x: Math.round(r.left - fr.left), y: Math.round(r.top - fr.top) }
  })
  const caps = [...root.querySelectorAll('[data-viz-part="viz-caption"]')].map((c) => ({ text: (c.textContent || '').slice(0, 50), eff: eff(c) }))
  const fb = [...root.querySelectorAll('[data-viz-part="viz-feedback"]')].filter((c) => eff(c) > 0).map((c) => (c.textContent || '').slice(0, 40))
  const nx = root.querySelector('[data-viz-part="viz-next"]')
  const span = nx && nx.querySelector('span')
  return { step: root.getAttribute('data-viz-step'), mode: root.getAttribute('data-viz-mode'), outs, caps, fb, next: nx ? (nx.getAttribute('aria-label') + ' ' + (span ? getComputedStyle(span).opacity : '')) : null, live: (root.querySelector('[role=status]')?.textContent || '').slice(0, 80) }
}`

for (const width of [375, 1440])
  for (const preset of ['basic-ordering', 'microtask-queued-during-drain'])
    test(`event-loop reveal ${preset} @${width}`, async ({ page, context }) => {
      test.setTimeout(180_000)
      await open(page, { width, height: width === 375 ? 667 : 900, query: `?preset=${preset}` })
      const f = page.locator(EL)
      await f.scrollIntoViewIfNeeded()
      const last = await lastStep(page)
      await walkEL(page, last - 1, '2')
      // Bring the whole frame to the viewport bottom so stage plus dock are visible.
      await f.evaluate((el) => el.scrollIntoView({ block: 'end' }))
      await page.waitForTimeout(300)
      const samples = await sampleAfter(page, EL, PROBE, () => page.keyboard.press('ArrowRight'), 1100)
      const focusAfter = await activeInfo(page)
      await page.waitForTimeout(400)
      const live = await liveText(page, EL)
      save(`el-reveal-${preset}-${width}.json`, { samples, focusAfter, live })

      // Real-time frame strip of the reveal (CDP captures, no slowdown).
      await walkEL(page, last - 1, '2')
      await f.evaluate((el) => el.scrollIntoView({ block: 'end' }))
      await page.waitForTimeout(300)
      const shots = await burstShots(page, EL, () => page.keyboard.press('ArrowRight'), 900)
      await strip(context, `EL-reveal-${preset}-${width}`, shots.slice(0, 18), `Event-loop reveal ${preset} @${width}, real-time CDP captures after Next onto the last step`, width === 375 ? 6 : 3)

      // Replay: press immediately (inside the guard), then after.
      const t0 = Date.now()
      await walkEL(page, last - 1, '2')
      await f.evaluate((el) => el.scrollIntoView({ block: 'end' }))
      await page.waitForTimeout(300)
      await page.keyboard.press('ArrowRight')
      await page.waitForTimeout(120)
      // Forced: the control is aria-disabled while the reveal plays (H3 R1M-11,
      // R1M-12), and the probe measures that an early press is ignored.
      await f.locator('[data-viz-part="viz-next"]').click({ force: true })
      await page.waitForTimeout(50)
      const afterEarly = await f.getAttribute('data-viz-step')
      await page.waitForTimeout(400)
      const replay = await sampleAfter(page, EL, PROBE, () => f.locator('[data-viz-part="viz-next"]').click(), 500)
      const focusReplay = await activeInfo(page)
      await page.waitForTimeout(400)
      save(`el-replay-${preset}-${width}.json`, { earlyPressStep: afterEarly, replay, focusReplay, live: await liveText(page, EL), ms: Date.now() - t0 })
    })
