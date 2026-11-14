import { test } from '@playwright/test'
import { SHOTS, activeInfo, open, save } from './common'
import path from 'node:path'

/** R1-C: closures hover and focus path at 375 and 1440, mouse, keyboard and touch. */

const ENV = '[data-viz="environment-records"]'

const STATE = `(fig) => {
  const all = [...fig.querySelectorAll('.vz-s')].filter((s) => s.getBoundingClientRect().width > 0)
  return all.map((svg) => ({
    lit: [...svg.querySelectorAll('[data-node],[data-edge]')].filter((n) => getComputedStyle(n).opacity === '1').map((n) => n.getAttribute('data-node') ? 'N:' + n.getAttribute('data-node') : 'E:' + n.getAttribute('data-edge')),
    dim: [...svg.querySelectorAll('[data-node],[data-edge]')].filter((n) => getComputedStyle(n).opacity !== '1').map((n) => (n.getAttribute('data-node') ? 'N:' + n.getAttribute('data-node') : 'E:' + n.getAttribute('data-edge')) + '@' + getComputedStyle(n).opacity),
    edges: [...svg.querySelectorAll('[data-edge]')].map((n) => n.getAttribute('data-edge')),
    nodes: [...svg.querySelectorAll('[data-node]')].map((n) => n.getAttribute('data-node')),
  }))
}`

for (const width of [375, 1440])
  test(`closures path @${width}`, async ({ page }) => {
    test.setTimeout(120_000)
    await open(page, { width, height: width === 375 ? 667 : 900 })
    const out: Record<string, unknown> = {}
    const figs = page.locator(ENV)
    const n = await figs.count()
    for (let i = 0; i < n; i++) {
      const fig = figs.nth(i)
      await fig.scrollIntoViewIfNeeded()
      const preset = await fig.evaluate((el) => el.querySelector('[data-viz-preset]')?.getAttribute('data-viz-preset') ?? el.getAttribute('data-viz-preset') ?? 'fig')
      const fns = fig.locator('.vz-s [tabindex]:visible')
      const k = await fns.count()
      const rec: Record<string, unknown> = { rest: (await fig.evaluate(new Function('fig', `return (${STATE})(fig)`) as never)) }
      for (let j = 0; j < k; j++) {
        const fn = fns.nth(j)
        const id = (await fn.getAttribute('data-node')) ?? `fn${j}`
        const label = await fn.getAttribute('aria-label')
        await fn.hover()
        // Timing of the dim (120 ms transition): sample a far edge opacity per frame.
        await page.waitForTimeout(250)
        const hover = await fig.evaluate(new Function('fig', `return (${STATE})(fig)`) as never)
        await page.screenshot({ path: path.join(SHOTS, `CL-hover-${preset}-${id}-${width}.png`), clip: (await fig.boundingBox())! })
        await page.mouse.move(0, 0)
        await page.waitForTimeout(250)
        // Keyboard focus.
        await fn.focus()
        await page.waitForTimeout(250)
        const focus = await fig.evaluate(new Function('fig', `return (${STATE})(fig)`) as never)
        const fi = await activeInfo(page)
        rec[id] = { label, hover, focus, focusInfo: fi }
        await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
      }
      // Sticky: click fn 0 with the mouse, then hover fn 1.
      if (k >= 2) {
        await fns.nth(0).click()
        await page.waitForTimeout(200)
        await fns.nth(1).hover()
        await page.waitForTimeout(250)
        rec.clickThenHoverOther = await fig.evaluate(new Function('fig', `return (${STATE})(fig)`) as never)
        await page.screenshot({ path: path.join(SHOTS, `CL-click0-hover1-${preset}-${width}.png`), clip: (await fig.boundingBox())! })
        await page.mouse.move(0, 0)
        await page.waitForTimeout(250)
        rec.clickThenLeave = await fig.evaluate(new Function('fig', `return (${STATE})(fig)`) as never)
        rec.clickFocusVisible = await activeInfo(page)
        await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
      }
      // Tab order through the figure.
      await fig.evaluate((el) => (el.querySelector('summary, [tabindex]') as HTMLElement | null)?.blur())
      out[`${preset}-${i}`] = rec
    }
    save(`closures-${width}.json`, out)
  })

test('closures touch @375', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true, colorScheme: 'dark', baseURL: 'http://localhost:3100' })
  const page = await ctx.newPage()
  await page.goto('/dev/visualizations')
  const fig = page.locator(ENV).last()
  await fig.scrollIntoViewIfNeeded()
  await page.waitForTimeout(1500)
  const fns = fig.locator('.vz-s [tabindex]:visible')
  const res: Record<string, unknown> = { count: await fns.count() }
  if ((await fns.count()) >= 2) {
    await fns.nth(0).tap()
    await page.waitForTimeout(300)
    res.afterTap0 = await fig.evaluate(new Function('fig', `return (${STATE})(fig)`) as never)
    res.focus0 = await activeInfo(page)
    await page.screenshot({ path: path.join(SHOTS, 'CL-touch-tap0-375.png'), clip: (await fig.boundingBox())! })
    await fns.nth(1).tap()
    await page.waitForTimeout(300)
    res.afterTap1 = await fig.evaluate(new Function('fig', `return (${STATE})(fig)`) as never)
    // Tap on empty figure space: does the path clear?
    const b = (await fig.boundingBox())!
    await page.touchscreen.tap(b.x + 4, b.y + 4)
    await page.waitForTimeout(300)
    res.afterTapEmpty = await fig.evaluate(new Function('fig', `return (${STATE})(fig)`) as never)
  }
  save('closures-touch-375.json', res)
  await ctx.close()
})
