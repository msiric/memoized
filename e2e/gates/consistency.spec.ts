import { expect, test, type Locator, type Page } from '@playwright/test'
import { GALLERY, LESSONS, lessonUrl, open, settle } from './drive'

/**
 * Cross-visual consistency (R2 G-05). The visual baselines approve whatever
 * was baselined, so two drawings of one thing (two checkpoint layouts, two
 * Skip styles, a frame that bleeds beside inset code blocks) were locked in
 * as correct. This gate compares the visuals with each other and with the
 * lesson page instead:
 *
 * - equivalent elements compute identically across visuals: the choice row
 *   at rest, a locked-in pick, the correct and the other choices on the
 *   reveal, Skip, the feedback line and its lead, the checkpoint block's
 *   anatomy (text cell, then the choices with Skip as the last cell), the
 *   frame, the hairline and the `now` tint of the current code line;
 * - in a lesson, every frame's edges are the code blocks' edges at 375, 768
 *   and 1440 (Q6: no breakout, the code-block inset below 640).
 */

const EL = '[data-viz="event-loop"] section'
const LK = '[data-viz="list-keys"] section'

/** The computed properties that make two elements look the same. */
const LOOK = [
  'border-top-left-radius',
  'box-shadow',
  'border-top-width',
  'border-top-color',
  'padding-left',
  'padding-right',
  'padding-top',
  'min-height',
  'font-family',
  'font-size',
  'font-weight',
  'line-height',
  'color',
  'background-color',
  'outline-offset',
] as const

async function look(l: Locator, props: readonly string[] = LOOK) {
  await expect(l).toBeVisible()
  return l.evaluate((el, ps) => {
    const s = getComputedStyle(el)
    return Object.fromEntries(ps.map((p) => [p, s.getPropertyValue(p)]))
  }, props as string[])
}

/** The checkpoint block's anatomy: grid areas, and the Skip cell's place among the choices. */
async function anatomy(frame: Locator) {
  return frame.locator('[data-viz-part="viz-checkpoint"]').evaluate((cp) => {
    const s = getComputedStyle(cp)
    const choices = cp.querySelector('[data-vz-choices]')!
    const cells = [...choices.children]
    return {
      areas: s.gridTemplateAreas,
      skipLast: String(cells[cells.length - 1].hasAttribute("data-vz-skip")),
      rowGap: s.rowGap,
      choiceGap: getComputedStyle(choices).columnGap,
    }
  })
}

async function both(page: Page, width: number) {
  await open(page, GALLERY, width)
  return { el: page.locator(EL).first(), lk: page.locator(LK).first() }
}

for (const width of [375, 1440]) {
  test(`equivalent elements compute identically across visuals @${width}`, async ({ page }) => {
    const { el, lk } = await both(page, width)
    const diffs: string[] = []
    const same = (what: string, a: Record<string, string>, b: Record<string, string>) => {
      for (const k of Object.keys(a)) if (a[k] !== b[k]) diffs.push(`${what} ${k}: event loop ${a[k]} vs list keys ${b[k]}`)
    }
    // At rest: the open question (the event loop's Start prediction, list keys' ask).
    same('choice row', await look(el.locator('[data-viz-part="viz-checkpoint"] [role="radio"]').first()), await look(lk.locator('[data-choice-index="0"]')))
    same('choice numeral', await look(el.locator('[data-viz-part="viz-checkpoint"] [data-choice-slot]').first()), await look(lk.locator('[data-choice-index="0"] [data-choice-slot]')))
    same('Skip', await look(el.locator('[data-viz-part="viz-skip"]')), await look(lk.locator('[data-viz-part="viz-skip"]')))
    same('prompt', await look(el.locator('[data-viz-part="viz-prompt"]')), await look(lk.locator('[data-viz-part="viz-prompt"]')))
    // The anatomy follows one rule (final polish): the text beside the row
    // wherever the row fits next to it, else over it. List keys' four
    // choices stack at every width, so the beside anatomy is compared on
    // its three-choice action (Reverse), then the default action returns.
    if (width >= 768) await lk.locator('[data-viz-focus="action-reverse"]').click()
    same('checkpoint', await anatomy(el), await anatomy(lk))
    if (width >= 768) {
      await lk.locator('[data-viz-focus="action-insert-top"]').click()
      await settle(page)
    }
    const FRAME = ['border-top-left-radius', 'border-top-width', 'border-top-color', 'padding-left', 'padding-top', 'background-color', 'margin-left', 'margin-right'] as const
    same('frame', await look(el, FRAME), await look(lk, FRAME))
    // The one hairline (Q10): the frame edge and the list-keys spine are one color.
    const hairline = (await look(el, ['border-top-color']))['border-top-color']
    const spine = (await look(lk.locator('[data-lk-spine="before"]').first(), ['border-right-color']))['border-right-color']
    if (spine !== hairline) diffs.push(`hairline: frame ${hairline} vs list-keys spine ${spine}`)

    // The reveal: a wrong pick in both, so the answer, the pick and the rest show.
    // Event loop: the Start prediction locks in (no verdict yet, a pick); then a mid-run wrong answer.
    await el.locator('[data-viz-part="viz-checkpoint"] [role="radio"]').nth(1).click()
    await settle(page)
    // The first step runs a line of the script: compare the current code line.
    await el.getByRole('button', { name: 'Next' }).click()
    await settle(page)
    // The current code line (the event loop has one once it steps).
    same(
      'current code line',
      await look(el.locator('[data-viz-region="code"] li[aria-current]'), ['background-color']),
      await look(lk.locator('[data-viz-region="code"] li[aria-current]'), ['background-color']),
    )
    for (let i = 0; i < 12 && (await el.getAttribute('data-viz-mode')) !== 'ask'; i++)
      await el.getByRole('button', { name: 'Next' }).click()
    const elChoices = el.locator('[data-viz-part="viz-checkpoint"] [role="radio"]')
    for (let i = 0; i < (await elChoices.count()); i++) {
      await elChoices.nth(i).click()
      await settle(page)
      if (await el.locator('[data-choice-slot="wrong"]').count()) break
      await el.getByRole('button', { name: 'Back' }).click()
      await el.getByRole('button', { name: 'Next' }).click()
    }
    // List keys: the first choice is wrong for index keys inserting at the top ("It's lost" is not the answer either way).
    const lkChoices = lk.locator('[role="radio"][data-choice-index]')
    for (let pick = 0; pick < (await lkChoices.count()); pick++) {
      await lkChoices.nth(pick).click()
      await settle(page)
      if (await lk.locator('[data-choice-slot="wrong"]').count()) break
      await lk.locator('[data-viz-part="viz-again"]').click()
      await settle(page)
    }
    const right = (f: Locator) => f.locator('[role="radio"]:has([data-choice-slot="right"])')
    const wrong = (f: Locator) => f.locator('[role="radio"]:has([data-choice-slot="wrong"])')
    const rest = (f: Locator) => f.locator('[role="radio"]:has([data-choice-slot="key"])')
    same('correct choice', await look(right(el)), await look(right(lk)))
    same('wrong pick', await look(wrong(el)), await look(wrong(lk)))
    // A choice that is neither the answer nor the pick (the event loop's mid-run question has two choices only).
    if ((await rest(el).count()) && (await rest(lk).count())) same('other choice', await look(rest(el).first()), await look(rest(lk).first()))
    else if (await rest(lk).count()) same('other choice (as the wrong pick)', await look(wrong(el)), await look(rest(lk).first()))
    same('✓ mark', await look(right(el).locator('[data-choice-slot]')), await look(right(lk).locator('[data-choice-slot]')))
    same('× mark', await look(wrong(el).locator('[data-choice-slot]')), await look(wrong(lk).locator('[data-choice-slot]')))
    same('feedback', await look(el.locator('[data-viz-part="viz-feedback"]')), await look(lk.locator('[data-viz-part="viz-feedback"]')))
    same(
      'feedback lead',
      await look(el.locator('[data-viz-part="viz-feedback"] > :first-child')),
      await look(lk.locator('[data-viz-part="viz-feedback"] > :first-child')),
    )
    expect(diffs).toEqual([])
  })
}

/**
 * Q6: in a lesson the visual sits in the column like a code block: its
 * frame's left and right edges are a code block's edges at every width
 * (the documented exception, 320, is the full-bleed tier, ruling 1).
 */
for (const slug of LESSONS)
  test(`lesson ${slug}: frames align with the lesson's code blocks`, async ({ page }) => {
    const problems: string[] = []
    for (const width of [375, 768, 1440]) {
      await open(page, lessonUrl(slug), width)
      const edges = await page.evaluate(() => {
        const r = (el: Element) => {
          const b = el.getBoundingClientRect()
          return [Math.round(b.left * 2) / 2, Math.round(b.right * 2) / 2] as const
        }
        const frames = [...document.querySelectorAll('[data-viz] > section, [data-viz] > figure, [data-viz] > div > section, [data-viz] > div > figure')].map(r)
        // A lesson code block: the platform's `pre` panel outside any visual.
        const code = [...document.querySelectorAll('article pre, main pre')]
          .filter((p) => !p.closest('[data-viz]'))
          .map((p) => r(p.closest('[class*="rounded"]') ?? p))
        return { frames, code }
      })
      if (!edges.frames.length) problems.push(`${width}: no visual frame`)
      if (!edges.code.length) problems.push(`${width}: no code block to align with`)
      const want = edges.code[0]
      for (const f of edges.frames)
        if (want && (Math.abs(f[0] - want[0]) > 0.5 || Math.abs(f[1] - want[1]) > 0.5))
          problems.push(`${width}: frame [${f.join(', ')}] vs code block [${want.join(', ')}]`)
    }
    expect(problems).toEqual([])
  })
