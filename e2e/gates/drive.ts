import { expect, type Page } from '@playwright/test'

/**
 * Shared page setup and state drivers for the design gates (contrast crawl,
 * visual regression). Deterministic: reduced motion, fonts loaded, no
 * caret, the Next.js dev indicator hidden, every state reached by the same
 * keyboard and pointer paths a reader uses.
 */

export const GALLERY = '/dev/visualizations'
export const SPECIMEN = '/dev/visualizations/system'
export const LESSONS = ['event-loop', 'closures'] as const
export const lessonUrl = (slug: string) => `/dev/visualizations/lesson/${slug}`

/** Hides the dev-mode overlay and build indicator, which are not the product. */
export const HIDE_DEV_CHROME = 'nextjs-portal, [data-nextjs-toast], #__next-build-watcher { display: none !important; }'

export async function open(page: Page, url: string, width: number, height = 900) {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' })
  await page.setViewportSize({ width, height })
  await page.goto(url, { waitUntil: 'load' })
  await page.addStyleTag({ content: HIDE_DEV_CHROME })
  await page.evaluate(() => document.fonts.ready)
  // Every lazy step-through and explorable on the page swaps in its engine.
  for (const el of await page.locator('[data-viz]').all()) {
    await el.scrollIntoViewIfNeeded()
    if (await el.locator('section').count())
      await expect(el.locator('section[data-viz-interactive="true"]').first()).toBeVisible({ timeout: 30_000 })
  }
  await page.evaluate(() => window.scrollTo(0, 0))
  await settle(page)
}

/** Animations finished and two frames painted. */
export async function settle(page: Page) {
  await page.evaluate(async () => {
    await Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined)))
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  })
}

const EL = '[data-viz="event-loop"] section'
const LK = '[data-viz="list-keys"] section'

/** The event loop's Start prediction, answered with choice `pick` (1-based). */
async function answerStart(page: Page, pick: number) {
  const f = page.locator(EL).first()
  if ((await f.getAttribute('data-viz-mode')) === 'ask')
    await f.locator('[data-viz-region="dock"] [role="radio"]').nth(pick - 1).click()
  await settle(page)
}

/** Named states of the gallery's visuals, reached through the real controls. */
export const STATES: Record<string, (page: Page) => Promise<void>> = {
  'el-start': async () => {},
  'el-step-4': async (page) => {
    await answerStart(page, 2)
    const f = page.locator(EL).first()
    for (let i = 0; i < 4; i++) await f.getByRole('button', { name: 'Next' }).click()
    await settle(page)
  },
  'el-checkpoint-wrong': async (page) => {
    await answerStart(page, 2)
    const f = page.locator(EL).first()
    for (let i = 0; i < 12 && (await f.getAttribute('data-viz-mode')) !== 'ask'; i++)
      await f.getByRole('button', { name: 'Next' }).click()
    const choices = f.locator('[data-viz-region="dock"] [data-choice]')
    // The first choice that is not the answer: the feedback says "Not quite."
    for (let i = 0; i < (await choices.count()); i++) {
      await choices.nth(i).click()
      await settle(page)
      if (/Not quite/.test((await f.locator('[data-viz-part="viz-feedback"]').textContent()) ?? '')) return
      // Right by chance: go back one step and forward again to re-ask.
      await f.getByRole('button', { name: 'Back' }).click()
      await f.getByRole('button', { name: 'Next' }).click()
    }
  },
  'el-finale': async (page) => {
    await answerStart(page, 2)
    const f = page.locator(EL).first()
    await f.getByRole('slider').focus()
    await page.keyboard.press('End')
    await page.waitForTimeout(1200)
    await settle(page)
  },
  // G ruling 2: after Restart the Start question names the earlier answer under the prompt.
  'el-last-time': async (page) => {
    await answerStart(page, 2)
    const f = page.locator(EL).first()
    await f.getByRole('slider').focus()
    await page.keyboard.press('End')
    await page.keyboard.press('Home')
    // The step tooltip lingers after a key press; let it go so the shot is stable.
    await page.waitForTimeout(1200)
    await settle(page)
    await expect(f.locator('[data-viz-part="viz-last-time"]')).toBeVisible()
  },
  'lk-ask': async () => {},
  'lk-reveal': async (page) => {
    const f = page.locator(LK).first()
    await f.locator('[data-viz-part="viz-skip"]').click()
    await settle(page)
  },
  'lk-answered': async (page) => {
    const f = page.locator(LK).first()
    await f.locator('[data-choice-index="0"]').click()
    await settle(page)
  },
  'closures-hover': async (page) => {
    // The figure draws one svg per layout width; hover the one on screen.
    const fn = page.locator('[data-viz="environment-records"] svg [tabindex="0"] >> visible=true').first()
    await fn.scrollIntoViewIfNeeded()
    await fn.hover()
    await settle(page)
  },
}
