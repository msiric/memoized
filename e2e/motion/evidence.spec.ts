import { test, type BrowserContext, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { EL, LK, hydrateListKeys, openGallery } from './helpers'

/**
 * Frame strips for the H0-C findings. Web Animations (FLIP moves, accelerated
 * opacity) are slowed 10x through the CDP Animation domain so a screenshot
 * series can catch them; framer-motion's JS-driven x/y are not slowed, so
 * strips that need those use rapid screenshots instead. Each strip is a row
 * of labelled frames, composed in a blank page (no image tooling needed).
 * Output: SHOTS (default e2e/motion/out/shots).
 */

const SHOTS = process.env.SHOTS ?? path.join('e2e', 'motion', 'out', 'shots')

async function strip(ctx: BrowserContext, name: string, frames: { label: string; png: Buffer }[], title: string) {
  fs.mkdirSync(SHOTS, { recursive: true })
  const p = await ctx.newPage()
  const imgs = frames
    .map(
      (f) =>
        `<figure><img src="data:image/png;base64,${f.png.toString('base64')}"><figcaption>${f.label}</figcaption></figure>`,
    )
    .join('')
  await p.setContent(
    `<html><body style="margin:0;background:#111;color:#ddd;font:13px system-ui"><h3 style="margin:8px">${title}</h3><div style="display:flex;gap:6px;padding:0 8px 8px">${imgs}</div><style>figure{margin:0}img{display:block;max-width:none}figcaption{padding:4px 0}</style></body></html>`,
  )
  await p.setViewportSize({ width: 200, height: 200 })
  await p.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true })
  await p.close()
}

async function slow(page: Page, rate: number) {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Animation.enable')
  await cdp.send('Animation.setPlaybackRate', { playbackRate: rate })
  return cdp
}

async function walkTo(page: Page, step: number) {
  const f = page.locator(EL)
  await f.getByRole('slider').focus()
  await page.keyboard.press('Home')
  await page.waitForTimeout(300)
  for (let i = 0; i < step; i++) {
    const mode = await f.getAttribute('data-viz-mode')
    await page.keyboard.press(mode === 'ask' ? '1' : 'ArrowRight')
    await page.waitForTimeout(450)
  }
  await page.waitForTimeout(300)
}

async function series(page: Page, clipSel: string, act: () => Promise<unknown>, times: number[]) {
  const clip = (await page.locator(clipSel).boundingBox())!
  const shots: { label: string; png: Buffer }[] = []
  shots.push({ label: 'before', png: await page.screenshot({ clip }) })
  const t0 = Date.now()
  await act()
  for (const t of times) {
    const wait = t - (Date.now() - t0)
    if (wait > 0) await page.waitForTimeout(wait)
    shots.push({ label: `+${Date.now() - t0} ms`, png: await page.screenshot({ clip }) })
  }
  return shots
}

test('strips: event-loop', async ({ page, context }) => {
  test.setTimeout(300_000)
  await openGallery(page, { query: '?preset=basic-ordering' })
  await page.locator(EL).scrollIntoViewIfNeeded()
  const stage = `${EL} [data-viz-region="stage"]`

  // 1. Restart (instant by spec) still fades and drifts glyphs out. Slowed 10x.
  await walkTo(page, 3)
  const cdp = await slow(page, 0.1)
  let s = await series(page, stage, () => page.keyboard.press('Home'), [100, 500, 900, 1400, 2000])
  await strip(context, 'M-instant-exit-restart', s, 'Home (Restart) from step 3, Web Animations slowed 10x: glyphs fade out over 160 ms (1.6 s here) instead of snapping')
  await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 })

  // 2. Upward move tasks -> stack (step 6 -> 7): chip passes under later lanes.
  await walkTo(page, 6)
  await cdp.send('Animation.setPlaybackRate', { playbackRate: 0.08 })
  s = await series(page, stage, () => page.keyboard.press('ArrowRight'), [80, 600, 1200, 1800, 2500, 3200, 4200])
  await strip(context, 'M-flip-up-under-lanes-6-7', s, 'Step 6 -> 7, move slowed 12.5x: the Timeout chip rises from Tasks to the stack drawn as a stack bar, under the Microtasks and Host panels')
  await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 })

  // 3. Downward move host -> tasks (step 4 -> 5) for comparison.
  await walkTo(page, 4)
  await cdp.send('Animation.setPlaybackRate', { playbackRate: 0.08 })
  s = await series(page, stage, () => page.keyboard.press('ArrowRight'), [80, 800, 1600, 2400, 3400])
  await strip(context, 'M-flip-down-4-5', s, 'Step 4 -> 5, move slowed 12.5x: Timeout chip drops from Host to Tasks, drawn over the panels it crosses')
  await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 })

  // 4. Preset switch mid-transition: old glyphs keep moving over the new preset.
  await walkTo(page, 6)
  await cdp.send('Animation.setPlaybackRate', { playbackRate: 0.1 })
  s = await series(
    page,
    stage,
    async () => {
      await page.keyboard.press('ArrowRight')
      await page.waitForTimeout(60)
      await page.locator(EL).getByRole('radio', { name: 'Drain' }).click()
    },
    [200, 700, 1300, 2000, 2800],
  )
  await strip(context, 'M-preset-mid-transition', s, 'Next then Drain 60 ms later, slowed 10x: the old preset\'s chips keep sliding and fading over the new Start frame')
  await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 })
  await page.locator(EL).getByRole('radio', { name: 'Basics' }).click()

  // 5. Resize at rest, then Next: unchanged chips slide from stale positions.
  await walkTo(page, 2)
  await page.setViewportSize({ width: 700, height: 900 })
  await page.waitForTimeout(600)
  await page.locator(EL).scrollIntoViewIfNeeded()
  await cdp.send('Animation.setPlaybackRate', { playbackRate: 0.1 })
  await page.locator(EL).getByRole('slider').focus()
  s = await series(page, stage, () => page.keyboard.press('ArrowRight'), [80, 700, 1500, 2400])
  await strip(context, 'M-flip-stale-after-resize', s, 'Resize 1024 -> 700 at rest, then Next (slowed 10x): script and timer chips, which did not change, slide in from their pre-resize positions')
  await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 })
  void cdp
})

test('strips: list-keys', async ({ page, context }) => {
  test.setTimeout(200_000)
  await openGallery(page)
  await hydrateListKeys(page)
  const f = page.locator(LK)
  const cols = `${LK} [data-viz-region="columns"]`

  // 6. Id + reverse with both rows checked: the two state chips land on the same point.
  await f.locator('input[type="checkbox"]').nth(1).check()
  await page.waitForTimeout(300)
  await f.getByRole('radio', { name: 'Id' }).click()
  await f.locator('[data-viz-part="viz-back"]').click()
  await f.getByRole('button', { name: 'Reverse', exact: true }).click()
  await page.waitForTimeout(300)
  let s = await series(page, cols, () => f.locator('[data-choice-index="0"]').click(), [40, 90, 140, 200, 400])
  await strip(context, 'M-lk-chips-overlap-id-reverse', s, 'Id keys, Reverse, both rows checked: both state chips travel to the crossing point (16, 74) and sit on top of each other')

  // 7. Resize after a settled reveal: lines snap, the chip glides for 220 ms.
  await f.locator('[data-viz-part="viz-again"]').click()
  await f.getByRole('button', { name: 'Insert at top', exact: true }).click()
  await f.locator('input[type="checkbox"]').nth(1).uncheck()
  await page.waitForTimeout(200)
  await f.locator('[data-viz-part="viz-back"]').click()
  await f.getByRole('button', { name: 'Insert at top', exact: true }).click()
  await page.waitForTimeout(300)
  await f.locator('[data-choice-index="0"]').click()
  await page.waitForTimeout(600)
  await page.setViewportSize({ width: 700, height: 900 })
  await page.waitForTimeout(500)
  await f.scrollIntoViewIfNeeded()
  s = await series(page, cols, () => page.setViewportSize({ width: 1024, height: 900 }), [30, 80, 130, 180, 400])
  await strip(context, 'M-lk-chip-lags-on-resize', s, 'Id, insert at top, revealed; window 700 -> 1024: match lines snap, the state chip slides 220 ms behind them, off its line')
})
