import { test, type Page } from '@playwright/test'
import { motionsAfter } from './analyze'
import { EL, LK, animated, hydrateListKeys, mark, openGallery, save, startRec, stopRec } from './helpers'
import { diffGlyphs, snap } from './settle'

/**
 * H0-C task 2: interruption. Each scenario drives input mid-transition, then
 * checks that the settled frame equals a slow, uninterrupted walk to the same
 * step (glyph lanes, positions, opacity, captions), that nothing is left
 * running or half-faded, and which elements still tweened after the
 * interrupting command (spec §4 rule 3: they must snap).
 */

const results: Record<string, unknown> = {}
test.afterAll(() => save('interruption.json', results))

async function walkTo(page: Page, step: number) {
  const f = page.locator(EL)
  await page.getByRole('slider').first().focus()
  await page.keyboard.press('Home')
  await page.waitForTimeout(400)
  for (let guard = 0; guard < 30; guard++) {
    const s = Number(await f.getAttribute('data-viz-step'))
    if (s >= step) break
    const mode = await f.getAttribute('data-viz-mode')
    await page.keyboard.press(mode === 'ask' ? '1' : 'ArrowRight')
    await page.waitForTimeout(450)
  }
  await page.waitForTimeout(400)
}

async function reference(page: Page, step: number) {
  await walkTo(page, step)
  return snap(page, EL)
}

/** Runs `act` while recording; returns tweens that started after the mark named `after`. */
async function scenario(page: Page, name: string, act: (m: (label: string) => Promise<void>) => Promise<void>, refStep?: number | (() => Promise<number>)) {
  const marks: Record<string, number> = {}
  await startRec(page, EL)
  await page.waitForTimeout(50)
  await act(async (label) => {
    marks[label] = await mark(page)
  })
  await page.waitForTimeout(900)
  const cap = await stopRec(page)
  const settled = await snap(page, EL)
  const tweensAfter: Record<string, unknown> = {}
  for (const [label, at] of Object.entries(marks)) {
    const ms = animated(motionsAfter(cap, at)).filter((e) => e.props.some((p) => p.delay < 60 + 0))
    tweensAfter[label] = ms.map((e) => `${e.label.slice(0, 60)} ${e.props.map((p) => `${p.prop}:${p.duration}ms@${p.delay}`).join(',')}`)
  }
  let diff: string[] | undefined
  if (refStep !== undefined) {
    const step = typeof refStep === 'number' ? refStep : await refStep()
    const ref = await reference(page, step)
    diff = diffGlyphs(settled, ref)
  }
  results[name] = {
    settledStep: settled.step,
    mode: settled.mode,
    running: settled.running,
    partialOpacity: settled.partial.filter((p) => !p.includes('opacity-')),
    tweensAfter,
    diffVsSlowWalk: diff,
  }
  return results[name]
}

test.describe.configure({ mode: 'serial' })

test('event-loop interruptions', async ({ page }) => {
  test.setTimeout(400_000)
  await openGallery(page, { query: '?preset=basic-ordering' })
  await page.locator(EL).scrollIntoViewIfNeeded()
  const f = page.locator(EL)
  const slider = page.getByRole('slider').first()

  // 1. Five Next presses inside 200 ms.
  await walkTo(page, 0)
  await scenario(page, 'burst-5-in-200ms', async (m) => {
    for (let i = 0; i < 5; i++) {
      await m(`press${i}`)
      await page.keyboard.press('ArrowRight')
      await page.waitForTimeout(40)
    }
  }, async () => Number(await f.getAttribute('data-viz-step')))

  // 2. Key repeat (held ArrowRight, repeat events every 33 ms).
  await walkTo(page, 0)
  await scenario(page, 'key-repeat', async (m) => {
    for (let i = 0; i < 6; i++) {
      await m(`repeat${i}`)
      await page.keyboard.down('ArrowRight')
      await page.waitForTimeout(33)
    }
    await page.keyboard.up('ArrowRight')
  }, async () => Number(await f.getAttribute('data-viz-step')))

  // 3. Back 100 ms into the move transition 6 -> 7.
  await walkTo(page, 6)
  await scenario(page, 'back-mid-move-6-7', async (m) => {
    await m('next')
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(100)
    await m('back')
    await page.keyboard.press('ArrowLeft')
  }, 6)

  // 3b. Back after 320 ms (outside the burst window but the 300 ms move is just ending).
  await walkTo(page, 6)
  await scenario(page, 'back-after-320ms', async (m) => {
    await m('next')
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(320)
    await m('back')
    await page.keyboard.press('ArrowLeft')
  }, 6)

  // 4. Scrub to step 2 80 ms into a transition.
  await walkTo(page, 6)
  await scenario(page, 'scrub-mid-transition', async (m) => {
    await m('next')
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(80)
    const box = (await slider.boundingBox())!
    const x = box.x + 14 + ((box.width - 28) * 2) / 8
    await m('scrub')
    await page.mouse.click(x, box.y + box.height / 2)
  }, 2)

  // 5. Preset switch 80 ms into a transition.
  await walkTo(page, 6)
  await scenario(page, 'preset-mid-transition', async (m) => {
    await m('next')
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(80)
    await m('preset')
    await f.getByRole('radio', { name: 'Drain' }).click()
  })
  results['preset-mid-transition-after'] = { preset: await f.getAttribute('data-viz-preset'), step: await f.getAttribute('data-viz-step') }
  await f.getByRole('radio', { name: 'Basics' }).click()
  await page.waitForTimeout(300)

  // 6. Play, one tick, then manual input.
  await walkTo(page, 0)
  await slider.focus()
  await page.keyboard.press(' ')
  await page.waitForTimeout(1750)
  const afterTick = await f.getAttribute('data-viz-step')
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(2000)
  results['play-then-manual'] = {
    afterTick,
    afterManualPlus2s: await f.getAttribute('data-viz-step'),
    playLabel: await f.locator('button[aria-keyshortcuts="Space K"]').getAttribute('aria-label'),
  }

  // 7. Hidden tab during Play.
  await walkTo(page, 0)
  await slider.focus()
  await page.keyboard.press(' ')
  await page.waitForTimeout(300)
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await page.waitForTimeout(2000)
  results['hidden-during-play'] = {
    step: await f.getAttribute('data-viz-step'),
    playLabel: await f.locator('button[aria-keyshortcuts="Space K"]').getAttribute('aria-label'),
  }
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
  })

  // 8. Scrolled mostly out of view during Play.
  await walkTo(page, 0)
  await slider.focus()
  await page.keyboard.press(' ')
  await page.waitForTimeout(200)
  await page.evaluate(() => {
    const r = document.querySelector('[data-viz="event-loop"] section')!.getBoundingClientRect()
    window.scrollBy(0, r.top + r.height * 0.7)
  })
  await page.waitForTimeout(2000)
  results['scrolled-away-during-play'] = {
    step: await f.getAttribute('data-viz-step'),
    playLabel: await f.locator('button[aria-keyshortcuts="Space K"]').getAttribute('aria-label'),
  }
  await page.keyboard.press('Escape')
  await f.scrollIntoViewIfNeeded()
})

test('event-loop resize', async ({ page }) => {
  test.setTimeout(300_000)
  await openGallery(page, { query: '?preset=basic-ordering' })
  await page.locator(EL).scrollIntoViewIfNeeded()

  // 9. Resize across the 768 breakpoint 80 ms into a move.
  await walkTo(page, 6)
  await scenario(page, 'resize-mid-move', async (m) => {
    await m('next')
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(80)
    await m('resize')
    await page.setViewportSize({ width: 700, height: 900 })
  }, 7)

  // 10. Resize at rest, then one Next: only the glyphs that change should animate.
  await page.setViewportSize({ width: 1024, height: 900 })
  await walkTo(page, 2)
  await page.setViewportSize({ width: 700, height: 900 })
  await page.waitForTimeout(500)
  await scenario(page, 'resize-at-rest-then-next', async (m) => {
    await m('next')
    await page.keyboard.press('ArrowRight')
  })
})

test('list-keys interruptions', async ({ page }) => {
  test.setTimeout(300_000)
  await openGallery(page)
  await hydrateListKeys(page)
  const f = page.locator(LK)
  const rec = async (name: string, act: (m: (l: string) => Promise<void>) => Promise<void>) => {
    const marks: Record<string, number> = {}
    await startRec(page, LK)
    await page.waitForTimeout(50)
    await act(async (l) => {
      marks[l] = await mark(page)
    })
    await page.waitForTimeout(900)
    const cap = await stopRec(page)
    const settled = await snap(page, LK)
    const tweensAfter: Record<string, string[]> = {}
    for (const [l, at] of Object.entries(marks))
      tweensAfter[l] = animated(motionsAfter(cap, at)).map(
        (e) => `${e.label.slice(0, 50)} ${e.props.map((p) => `${p.prop}:${JSON.stringify(p.start)}->${JSON.stringify(p.end)} ${p.duration}ms@${p.delay}`).join(',')}`,
      )
    results[name] = {
      mode: await f.getAttribute('data-viz-mode'),
      key: await f.getAttribute('data-viz-key'),
      running: settled.running,
      partial: settled.partial,
      tweensAfter,
      stateChips: settled.glyphs.filter((g) => g.lane === 'columns' && /✓|\d/.test(g.id)),
    }
  }

  // Id + insert at top so the state chip travels.
  await f.getByRole('radio', { name: 'Id' }).click()
  await page.waitForTimeout(300)

  // a. Change key 80 ms into the reveal.
  await rec('lk-key-mid-reveal', async (m) => {
    await m('answer')
    await f.locator('[data-choice-index="0"]').click()
    await page.waitForTimeout(80)
    await m('key')
    await f.getByRole('radio', { name: 'Index' }).click()
  })
  await f.getByRole('radio', { name: 'Id' }).click()
  await page.waitForTimeout(300)

  // b. Answer, then "Try another action" and an action within 250 ms.
  await rec('lk-burst-after-reveal', async (m) => {
    await m('answer')
    await f.locator('[data-choice-index="0"]').click()
    await page.waitForTimeout(60)
    await m('again')
    await f.locator('[data-viz-part="viz-again"]').click()
    await m('action')
    await f.getByRole('button', { name: 'Insert at top', exact: true }).click()
  })

  // c. Resize across 768 80 ms into the reveal.
  await rec('lk-resize-mid-reveal', async (m) => {
    await m('answer')
    await f.locator('[data-choice-index="0"]').click()
    await page.waitForTimeout(80)
    await m('resize')
    await page.setViewportSize({ width: 700, height: 900 })
  })

  // d. Resize after the reveal settled: the line geometry snaps, does the chip lag?
  await rec('lk-resize-after-reveal', async (m) => {
    await m('resize')
    await page.setViewportSize({ width: 1024, height: 900 })
  })
})
