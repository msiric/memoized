import { expect, test, type Locator, type Page } from '@playwright/test'
import { urlLocalOnly } from '../premium'
import { FR, GALLERY, LESSONS, SW, atUrl, frUrl, fxFrame, fxUrl, jsUrl, dsaUrl, lessonUrl, open, settle, swUrl, DP, dpUrl } from './drive'

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
 * The frontier (wave 2A) is a step-through like the event loop: the same
 * shell, so its frame, question, choices, Skip, current code line, reveal
 * marks and lane panel compute as the event loop's do.
 */
for (const width of [375, 1440])
  test(`the frontier draws the shell and its regions like the event loop @${width}`, async ({ page }) => {
    // Its lesson group includes a practice answer: local-only without the content checkout (CI).
    test.skip(urlLocalOnly(frUrl('bfs-levels')) !== null, urlLocalOnly(frUrl('bfs-levels')) ?? '')
    const diffs: string[] = []
    const looks: Record<string, Record<string, string>>[] = []
    const PANEL = ['background-color', 'border-top-left-radius', 'padding-left', 'padding-top'] as const
    const FRAME = ['border-top-left-radius', 'border-top-width', 'border-top-color', 'padding-left', 'padding-top', 'background-color', 'margin-left', 'margin-right'] as const
    for (const [url, sel] of [
      [GALLERY, EL],
      [frUrl('bfs-levels'), FR],
    ] as const) {
      await open(page, url, width)
      const f = page.locator(sel).first()
      const out: Record<string, Record<string, string>> = {}
      out.frame = await look(f, FRAME)
      out.lane = await look(f.locator('[data-viz-region="micro"], [data-viz-region="queue"]').first(), PANEL)
      // To the first question (the event loop asks at Start; answer it and step once for a code line).
      if ((await f.getAttribute('data-viz-mode')) === 'ask') {
        await f.locator('[data-viz-part="viz-checkpoint"] [role="radio"]').nth(1).click()
        await settle(page)
      }
      await f.getByRole('button', { name: 'Next' }).click()
      await settle(page)
      out['current code line'] = await look(f.locator('[data-viz-region="code"] li[aria-current]'), ['background-color'])
      for (let i = 0; i < 14 && (await f.getAttribute('data-viz-mode')) !== 'ask'; i++) await f.getByRole('button', { name: 'Next' }).click()
      await settle(page)
      out['choice row'] = await look(f.locator('[data-viz-part="viz-checkpoint"] [role="radio"]').first())
      out.prompt = await look(f.locator('[data-viz-part="viz-prompt"]'))
      out.Skip = await look(f.locator('[data-viz-part="viz-skip"]'))
      // A wrong pick: the event loop's mid-run answer is its second choice, the frontier's first.
      await f.locator('[data-viz-part="viz-checkpoint"] [role="radio"]').nth(sel === EL ? 0 : 1).click()
      await settle(page)
      out['correct choice'] = await look(f.locator('[role="radio"]:has([data-choice-slot="right"])'))
      out['wrong pick'] = await look(f.locator('[role="radio"]:has([data-choice-slot="wrong"])'))
      out.feedback = await look(f.locator('[data-viz-part="viz-feedback"]'))
      looks.push(out)
    }
    const [a, b] = looks
    for (const what of Object.keys(a))
      for (const k of Object.keys(a[what])) if (a[what][k] !== b[what][k]) diffs.push(`${what} ${k}: event loop ${a[what][k]} vs frontier ${b[what][k]}`)
    expect(diffs).toEqual([])
  })

/**
 * The static figures (wave 1B): a scope-chain figure's running call is the
 * closures figure's function object (box, title, touch band and focus), at
 * rest and traced, and its records and links are the same glyphs.
 */
const SVG_LOOK = ['fill', 'stroke', 'stroke-width', 'font-family', 'font-size', 'font-weight', 'color', 'cursor'] as const
for (const width of [375, 1440])
  test(`static figures draw a traced call like a traced function @${width}`, async ({ page }) => {
    await open(page, `${GALLERY}?static=1`, width)
    const figs = page.locator('[data-viz="environment-records"] figure')
    const svgOf = (i: number) => figs.nth(i).locator('svg >> visible=true').first()
    const closures = svgOf(0)
    const scope = svgOf(2)
    const fn = closures.locator('[tabindex="0"]').first()
    const call = scope.locator('[tabindex="0"]').first()
    const diffs: string[] = []
    // A straight link has a zero-width box (Playwright calls it hidden): read its style as is.
    const styleOf = (l: Locator) =>
      l.evaluate((el, ps) => Object.fromEntries(ps.map((p) => [p, getComputedStyle(el).getPropertyValue(p)])), SVG_LOOK as unknown as string[])
    const same = async (what: string, a: Locator, b: Locator) => {
      const [x, y] = [await styleOf(a), await styleOf(b)]
      for (const k of Object.keys(x)) if (x[k] !== y[k]) diffs.push(`${what} ${k}: closures ${x[k]} vs scope chain ${y[k]}`)
    }
    const parts = async (when: string) => {
      await same(`${when} box`, fn.locator('rect.vz-fb'), call.locator('rect.vz-fb'))
      await same(`${when} title`, fn.locator('text'), call.locator('text'))
    }
    await parts('rest')
    await same('record header', closures.locator('.vz-t').first(), scope.locator('[data-node="module"] .vz-t').first())
    await same('link', closures.locator('[data-edge^="outer:"] .vz-e, [data-edge^="env:"] .vz-e').first(), scope.locator('[data-edge^="outer:"] .vz-e').first())
    // Traced: hover each (one path at a time per figure).
    await fn.scrollIntoViewIfNeeded()
    await fn.hover()
    await settle(page)
    const litFn = await look(fn.locator('rect.vz-fb'), SVG_LOOK)
    await call.scrollIntoViewIfNeeded()
    await call.hover()
    await settle(page)
    const litCall = await look(call.locator('rect.vz-fb'), SVG_LOOK)
    for (const k of Object.keys(litFn)) if (litFn[k] !== litCall[k]) diffs.push(`traced box ${k}: closures ${litFn[k]} vs scope chain ${litCall[k]}`)
    expect(diffs).toEqual([])
  })

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

/**
 * The static figures speak one vocabulary (closures and the heap graph):
 * the frame, the hint, the panel heading, the glyph fill and outline, the
 * header and value type, the hairline, a link at rest and traced, the
 * arrowhead, the output role, the focusable glyph at rest and lit, and its
 * focus ring. A drift in either figure fails here, whatever its baseline says.
 */
for (const width of [375, 1440])
  test(`static figures compute identically: closures and heap graph @${width}`, async ({ page }) => {
    await open(page, `${GALLERY}?static=1`, width)
    const er = page.locator('figure[data-viz-preset="factory-calls-vs-aliases"]')
    const hg = page.locator('figure[data-viz-preset="identity-alias-rebind-spread"]')
    const diffs: string[] = []
    const same = (what: string, a: Record<string, string>, b: Record<string, string>) => {
      for (const k of Object.keys(a)) if (a[k] !== b[k]) diffs.push(`${what} ${k}: closures ${a[k]} vs heap graph ${b[k]}`)
    }
    const vis = (root: Locator, sel: string) => root.locator(`${sel}:visible`).first()
    /** Computed style of the first `sel` inside an svg on screen (a straight link has a zero-width box, so no visibility check). */
    const inSvg = (root: Locator, sel: string, props: readonly string[] = SVG) =>
      root.evaluate(
        (f, [q, ps]) => {
          const el = [...f.querySelectorAll('svg')]
            .filter((x) => x.getBoundingClientRect().width > 0)
            .map((x) => x.querySelector(q as string))
            .find(Boolean)
          if (!el) throw new Error(`nothing matches ${q}`)
          const cs = getComputedStyle(el)
          return Object.fromEntries((ps as string[]).map((k) => [k, cs.getPropertyValue(k)]))
        },
        [sel, props] as const,
      )
    const SVG = ['fill', 'stroke', 'stroke-width', 'font-family', 'font-size', 'font-weight', 'color'] as const
    const FRAME = ['border-top-left-radius', 'border-top-width', 'border-top-color', 'padding-left', 'padding-top', 'background-color'] as const
    same('frame', await look(er, FRAME), await look(hg, FRAME))
    // Text regions reserve the lines their own copy needs (min-height): compare the type, not the reserve.
    const TEXT = LOOK.filter((k) => k !== 'min-height')
    same('title', await look(er.locator('p').first(), TEXT), await look(hg.locator('p').first(), TEXT))
    same('hint', await look(vis(er, '[data-viz-part="hint"]'), TEXT), await look(vis(hg, '[data-viz-part="hint"]'), TEXT))
    same('panel heading', await look(vis(er, '[data-viz-section] > p'), TEXT), await look(vis(hg, '[data-viz-section] > p'), TEXT))
    same('caption', await look(er.locator('figcaption'), TEXT), await look(hg.locator('figcaption'), TEXT))
    same('glyph', await inSvg(er, 'svg .vz-g'), await inSvg(hg, 'svg .vz-g'))
    same('header', await inSvg(er, 'svg .vz-t'), await inSvg(hg, 'svg .vz-t'))
    same('hairline', await inSvg(er, 'svg .vz-hl'), await inSvg(hg, 'svg .vz-hl'))
    same('link at rest', await inSvg(er, 'svg [data-edge^="ref:"] .vz-e'), await inSvg(hg, 'svg [data-edge^="bind:"]:not([data-changed]) .vz-e'))
    same('arrowhead', await inSvg(er, 'svg [data-edge^="ref:"] .vz-ah'), await inSvg(hg, 'svg [data-edge^="bind:"]:not([data-changed]) .vz-ah'))
    same('focusable glyph at rest', await inSvg(er, 'svg [tabindex] .vz-fb'), await inSvg(hg, 'svg [tabindex] .vz-fb'))
    // Output: the closures `› value` under a function, the heap graph's result line.
    same('output', await inSvg(page.locator('figure[data-viz-preset="var-vs-let-loop"]'), '.vz-r'), await inSvg(hg, 'svg .vz-r'))
    // Traced: hover one focusable glyph in each, compare the lit glyph and its link.
    const erFn = vis(er, 'svg [data-node="deposit"]')
    await erFn.scrollIntoViewIfNeeded()
    await erFn.hover()
    await settle(page)
    const erLitGlyph = await inSvg(er, '[data-node="deposit"] .vz-fb')
    const erLitEdge = await inSvg(er, '[data-edge="env:deposit"] .vz-e')
    const hgName = vis(hg, '[data-viz-section="spread"] svg [data-node="v-copy"]')
    await hgName.scrollIntoViewIfNeeded()
    await hgName.hover()
    await settle(page)
    same('traced glyph', erLitGlyph, await inSvg(hg, '[data-viz-section="spread"] [data-node="v-copy"] .vz-fb'))
    same('traced link', erLitEdge, await inSvg(hg, '[data-viz-section="spread"] svg [data-edge="bind:v-copy"] .vz-e'))
    // The focus ring: the one offset ring (D5).
    const RING = ['outline-style', 'outline-width', 'outline-color', 'outline-offset'] as const
    await page.mouse.move(0, 0)
    await erFn.focus()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    const erRing = await look(page.locator(':focus > .vz-fb'), RING)
    await hgName.focus()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    same('focus ring', erRing, await look(page.locator(':focus > .vz-fb'), RING))
    expect(diffs).toEqual([])
  })

/**
 * The pointer-rewiring visuals (wave 2B) speak the static figures'
 * vocabulary: a node is the heap graph's glyph, an arrow its link and head,
 * the one rest mark its changed glyph, and the frames' title
 * and caption are the heap graph's. The step-through's stage uses the same
 * glyphs as its static frames.
 */
for (const width of [375, 1440])
  test(`pointer-rewiring glyphs compute like the heap graph's @${width}`, async ({ page }) => {
    const SVG = ['fill', 'stroke', 'stroke-width', 'font-family', 'font-size', 'font-weight', 'color'] as const
    const TEXT = LOOK.filter((k) => k !== 'min-height')
    const FRAME = ['border-top-left-radius', 'border-top-width', 'border-top-color', 'padding-left', 'padding-top', 'background-color'] as const
    const inSvg = (root: Locator, sel: string) =>
      root.evaluate(
        (f, [q, ps]) => {
          const el = [...f.querySelectorAll('svg')]
            .filter((x) => x.getBoundingClientRect().width > 0)
            .map((x) => x.querySelector(q as string))
            .find(Boolean)
          if (!el) throw new Error(`nothing matches ${q}`)
          const cs = getComputedStyle(el)
          return Object.fromEntries((ps as unknown as string[]).map((k) => [k, cs.getPropertyValue(k)]))
        },
        [sel, SVG] as const,
      )
    const diffs: string[] = []
    const same = (what: string, a: Record<string, string>, b: Record<string, string>) => {
      for (const k of Object.keys(a)) if (a[k] !== b[k]) diffs.push(`${what} ${k}: heap graph ${a[k]} vs pointer rewiring ${b[k]}`)
    }
    await open(page, `${GALLERY}?static=1`, width)
    const hg = page.locator('figure[data-viz-preset="identity-alias-rebind-spread"]')
    const heap = {
      frame: await look(hg, FRAME),
      title: await look(hg.locator('p').first(), TEXT),
      caption: await look(hg.locator('figcaption'), TEXT),
      glyph: await inSvg(hg, 'svg [data-node] .vz-g'),
      link: await inSvg(hg, 'svg [data-edge^="bind:"]:not([data-changed]) .vz-e'),
      head: await inSvg(hg, 'svg [data-edge^="bind:"]:not([data-changed]) .vz-ah'),
      changed: await inSvg(hg, 'svg .vz-ch'),
    }
    await open(page, `${GALLERY}?ll=static`, width)
    const rho = page.locator('figure[data-viz-preset="floyd-rho"]')
    same('frame', heap.frame, await look(rho, FRAME))
    same('title', heap.title, await look(rho.locator('p').first(), TEXT))
    same('caption', heap.caption, await look(rho.locator('figcaption'), TEXT))
    same('node glyph', heap.glyph, await inSvg(rho, 'svg [data-node] .vz-g'))
    same('link', heap.link, await inSvg(rho, 'svg [data-edge] .vz-e'))
    same('arrowhead', heap.head, await inSvg(rho, 'svg [data-edge] .vz-ah'))
    same('changed mark', heap.changed, await inSvg(rho, 'svg [data-node] .vz-ch'))
    await open(page, `${GALLERY}?ll=reverse-between-m2-n4`, width)
    const step = page.locator('[data-viz="linked-list-pointer-rewiring"] section')
    same('stage node glyph', heap.glyph, await inSvg(step, 'svg [data-node] .vz-g'))
    same('stage link', heap.link, await inSvg(step, 'svg [data-edge] .vz-e'))
    same('stage arrowhead', heap.head, await inSvg(step, 'svg [data-edge] .vz-ah'))
    expect(diffs).toEqual([])
  })

/**
 * The sliding window (wave 2C) is a step-through like the event loop: the
 * same shell, so its frame, store lane, current code line, question,
 * choices, Skip, reveal marks and feedback compute as the event loop's do.
 * Its strip draws the pointer-rewiring glyphs: a cell is a node box, an
 * edge tag a pointer tag, and the step's change the same neutral mark.
 */
for (const width of [375, 1440])
  test(`the sliding window draws the shell and its regions like the event loop @${width}`, async ({ page }) => {
    const diffs: string[] = []
    const looks: Record<string, Record<string, string>>[] = []
    const PANEL = ['background-color', 'border-top-left-radius', 'padding-left', 'padding-top'] as const
    const FRAME = ['border-top-left-radius', 'border-top-width', 'border-top-color', 'padding-left', 'padding-top', 'background-color', 'margin-left', 'margin-right'] as const
    for (const [url, sel] of [
      [GALLERY, EL],
      [swUrl('araaci-k2'), SW],
    ] as const) {
      await open(page, url, width)
      const f = page.locator(sel).first()
      const out: Record<string, Record<string, string>> = {}
      out.frame = await look(f, FRAME)
      out.lane = await look(f.locator('[data-viz-region="micro"], [data-viz-region="store"]').first(), PANEL)
      if ((await f.getAttribute('data-viz-mode')) === 'ask') {
        await f.locator('[data-viz-part="viz-checkpoint"] [role="radio"]').nth(1).click()
        await settle(page)
      }
      await f.getByRole('button', { name: 'Next' }).click()
      await settle(page)
      out['current code line'] = await look(f.locator('[data-viz-region="code"] li[aria-current]').first(), ['background-color'])
      for (let i = 0; i < 14 && (await f.getAttribute('data-viz-mode')) !== 'ask'; i++) await f.getByRole('button', { name: 'Next' }).click()
      await settle(page)
      out['choice row'] = await look(f.locator('[data-viz-part="viz-checkpoint"] [role="radio"]').first())
      out.prompt = await look(f.locator('[data-viz-part="viz-prompt"]'))
      out.Skip = await look(f.locator('[data-viz-part="viz-skip"]'))
      out.anatomy = await anatomy(f)
      // A wrong pick: the event loop's mid-run answer is its second choice, the sliding window's first.
      await f.locator('[data-viz-part="viz-checkpoint"] [role="radio"]').nth(sel === EL ? 0 : 1).click()
      await settle(page)
      out['correct choice'] = await look(f.locator('[role="radio"]:has([data-choice-slot="right"])'))
      out['wrong pick'] = await look(f.locator('[role="radio"]:has([data-choice-slot="wrong"])'))
      out.feedback = await look(f.locator('[data-viz-part="viz-feedback"]'))
      looks.push(out)
    }
    const [a, b] = looks
    for (const what of Object.keys(a))
      for (const k of Object.keys(a[what])) if (a[what][k] !== b[what][k]) diffs.push(`${what} ${k}: event loop ${a[what][k]} vs sliding window ${b[what][k]}`)
    expect(diffs).toEqual([])
  })

for (const width of [375, 1440])
  test(`sliding-window glyphs compute like pointer rewiring's @${width}`, async ({ page }) => {
    const SVG = ['fill', 'stroke', 'stroke-width', 'font-family', 'font-size', 'font-weight', 'color'] as const
    const svgLook = (root: Locator, sel: string) =>
      root.locator(sel).first().evaluate((el, ps) => {
        const cs = getComputedStyle(el)
        return Object.fromEntries((ps as string[]).map((k) => [k, cs.getPropertyValue(k)]))
      }, SVG as unknown as string[])
    const diffs: string[] = []
    const same = (what: string, a: Record<string, string>, b: Record<string, string>) => {
      for (const k of Object.keys(a)) if (a[k] !== b[k]) diffs.push(`${what} ${k}: pointer rewiring ${a[k]} vs sliding window ${b[k]}`)
    }
    // Pointer rewiring after its third step: a moved tag carries the changed mark.
    await open(page, `${GALLERY}?ll=reverse-between-m2-n4`, width)
    const ll = page.locator('[data-viz="linked-list-pointer-rewiring"] section')
    await ll.getByRole('button', { name: 'Next' }).click()
    await ll.getByRole('button', { name: 'Next' }).click()
    await settle(page)
    const ref = {
      glyph: await svgLook(ll, 'svg [data-node] .vz-g'),
      label: await svgLook(ll, 'svg [data-node] text'),
      tag: await svgLook(ll, 'svg [data-tag] rect:not(.vz-ch)'),
      tagText: await svgLook(ll, 'svg [data-tag] text'),
      changed: await svgLook(ll, 'svg [data-tag] .vz-ch'),
    }
    // Two steps in: cell 0 sits in the window unchanged, cell 1 and the right edge carry the changed mark.
    await open(page, swUrl('araaci-k2'), width)
    const sw = page.locator(SW)
    await sw.getByRole('button', { name: 'Next' }).click()
    await sw.getByRole('button', { name: 'Next' }).click()
    await settle(page)
    same('cell glyph', ref.glyph, await svgLook(sw, 'svg [data-cell][data-in] .vz-g'))
    same('cell label', ref.label, await svgLook(sw, 'svg [data-cell][data-in] text'))
    same('edge tag', ref.tag, await svgLook(sw, 'svg [data-tag] rect:not(.vz-ch)'))
    same('edge tag text', ref.tagText, await svgLook(sw, 'svg [data-tag] text'))
    same('changed mark', ref.changed, await svgLook(sw, 'svg [data-tag] .vz-ch'))
    expect(diffs).toEqual([])
  })

/**
 * The annotated trees (wave 2D) speak the static figures' vocabulary: a
 * node is the heap graph's glyph, an edge its link at rest, the one rest
 * mark its changed glyph and changed link, the panel heading the pointer
 * frames' heading, and the frame, title and caption the heap graph's. Each
 * preset is checked, so the three panel kinds agree with each other too.
 */
for (const width of [375, 1440])
  test(`annotated-tree glyphs compute like the heap graph's @${width}`, async ({ page }) => {
    const SVG = ['fill', 'stroke', 'stroke-width', 'font-family', 'font-size', 'font-weight', 'color'] as const
    const TEXT = LOOK.filter((k) => k !== 'min-height')
    const FRAME = ['border-top-left-radius', 'border-top-width', 'border-top-color', 'padding-left', 'padding-top', 'background-color'] as const
    const inSvg = (root: Locator, sel: string) =>
      root.evaluate(
        (f, [q, ps]) => {
          const el = [...f.querySelectorAll('svg')]
            .filter((x) => x.getBoundingClientRect().width > 0)
            .map((x) => x.querySelector(q as string))
            .find(Boolean)
          if (!el) throw new Error(`nothing matches ${q}`)
          const cs = getComputedStyle(el)
          return Object.fromEntries((ps as unknown as string[]).map((k) => [k, cs.getPropertyValue(k)]))
        },
        [sel, SVG] as const,
      )
    const diffs: string[] = []
    const same = (what: string, a: Record<string, string>, b: Record<string, string>) => {
      for (const k of Object.keys(a)) if (a[k] !== b[k]) diffs.push(`${what} ${k}: heap graph ${a[k]} vs annotated tree ${b[k]}`)
    }
    await open(page, `${GALLERY}?static=1`, width)
    const hg = page.locator('figure[data-viz-preset="identity-alias-rebind-spread"]')
    const heap = {
      frame: await look(hg, FRAME),
      title: await look(hg.locator('p').first(), TEXT),
      caption: await look(hg.locator('figcaption'), TEXT),
      glyph: await inSvg(hg, 'svg [data-node] .vz-g'),
      link: await inSvg(hg, 'svg [data-edge^="bind:"]:not([data-changed]) .vz-e'),
      changedLink: await inSvg(hg, 'svg [data-edge][data-changed] .vz-e'),
      changed: await inSvg(hg, 'svg .vz-ch'),
    }
    await open(page, `${GALLERY}?ll=static`, width)
    const heading = await inSvg(page.locator('figure[data-viz-preset="floyd-rho"]'), 'svg [data-viz-part="panel-heading"]')
    await open(page, atUrl, width)
    for (const preset of ['max-path-gain-vs-through', 'trie-end-markers', 'suffix-tree-banana']) {
      const at = page.locator(`figure[data-viz-preset="${preset}"]`)
      same(`${preset} frame`, heap.frame, await look(at, FRAME))
      same(`${preset} title`, heap.title, await look(at.locator('p').first(), TEXT))
      same(`${preset} caption`, heap.caption, await look(at.locator('figcaption'), TEXT))
      same(`${preset} panel heading`, heading, await inSvg(at, 'svg [data-viz-part="panel-heading"]'))
      same(`${preset} node glyph`, heap.glyph, await inSvg(at, 'svg [data-node] .vz-g'))
      same(`${preset} link`, heap.link, await inSvg(at, 'svg [data-edge]:not([data-changed]) .vz-e'))
      same(`${preset} changed link`, heap.changedLink, await inSvg(at, 'svg [data-edge][data-changed] .vz-e'))
      same(`${preset} changed mark`, heap.changed, await inSvg(at, 'svg .vz-ch'))
    }
    // Wave 3A: the call tree, the spanning tree and the push forest, each with the parts it draws.
    const W3: Record<string, { node: string; link: string; lit?: string; mark?: string }> = {
      'combination-sum-take-skip': { node: 'svg [data-node]:not([data-end]) .vz-g', link: 'svg [data-edge] .vz-e', mark: 'svg .vz-ch' },
      'water-wells-virtual-source': { node: 'svg [data-node] .vz-g', link: 'svg [data-edge]:not([data-changed]):not([data-well]) .vz-e', lit: 'svg [data-edge][data-changed] .vz-e' },
      'k-pairs-lazy-grid': { node: 'svg [data-cell]:not([data-changed]) .vz-g', link: 'svg [data-edge]:not([data-changed]) .vz-e', lit: 'svg [data-edge][data-changed] .vz-e', mark: 'svg .vz-ch' },
    }
    for (const [preset, q] of Object.entries(W3)) {
      const at = page.locator(`figure[data-viz-preset="${preset}"]`)
      same(`${preset} frame`, heap.frame, await look(at, FRAME))
      same(`${preset} title`, heap.title, await look(at.locator('p').first(), TEXT))
      same(`${preset} caption`, heap.caption, await look(at.locator('figcaption'), TEXT))
      same(`${preset} panel heading`, heading, await inSvg(at, 'svg [data-viz-part="panel-heading"]'))
      same(`${preset} node glyph`, heap.glyph, await inSvg(at, q.node))
      same(`${preset} link`, heap.link, await inSvg(at, q.link))
      if (q.lit) same(`${preset} changed link`, heap.changedLink, await inSvg(at, q.lit))
      if (q.mark) same(`${preset} changed mark`, heap.changed, await inSvg(at, q.mark))
    }
    expect(diffs).toEqual([])
  })

/**
 * The dp table (wave 3A) draws the sliding window's strip glyphs: a cell is
 * a strip cell, an index tag an edge tag, the written cell and the moved tag
 * the same neutral changed mark; the dependency arrow is the changed-role
 * connector the static figures mark edges with. Local-only (a practice
 * answer): skipped where the content checkout lacks it.
 */
for (const width of [375, 1440])
  test(`dp-table glyphs compute like the sliding window's @${width}`, async ({ page }) => {
    const skip = urlLocalOnly(dpUrl('knapsack-1d-asc'))
    test.skip(Boolean(skip), skip ?? '')
    const SVG = ['fill', 'stroke', 'stroke-width', 'font-family', 'font-size', 'font-weight', 'color'] as const
    const svgLook = (root: Locator, sel: string) =>
      root
        .locator(sel)
        .first()
        .evaluate((el, ps) => {
          const cs = getComputedStyle(el)
          return Object.fromEntries((ps as string[]).map((k) => [k, cs.getPropertyValue(k)]))
        }, SVG as unknown as string[])
    const diffs: string[] = []
    const same = (what: string, a: Record<string, string>, b: Record<string, string>) => {
      for (const k of Object.keys(a)) if (a[k] !== b[k]) diffs.push(`${what} ${k}: sliding window ${a[k]} vs dp table ${b[k]}`)
    }
    // The sliding window two steps in: a cell in the window, a changed cell, the right edge's changed tag.
    await open(page, swUrl('araaci-k2'), width)
    const sw = page.locator(SW)
    await sw.getByRole('button', { name: 'Next' }).click()
    await sw.getByRole('button', { name: 'Next' }).click()
    await settle(page)
    const ref = {
      glyph: await svgLook(sw, 'svg [data-cell]:not([data-changed]) .vz-g'),
      label: await svgLook(sw, 'svg [data-cell][data-in] text'),
      changedCell: await svgLook(sw, 'svg [data-cell][data-changed] .vz-ch'),
      tag: await svgLook(sw, 'svg [data-tag] rect:not(.vz-ch)'),
      tagText: await svgLook(sw, 'svg [data-tag] text'),
      changed: await svgLook(sw, 'svg [data-tag] .vz-ch'),
      index: await svgLook(sw, 'svg [data-indices] text'),
    }
    // The dp table counting up, two writes in: f[2] written from f[1].
    await open(page, dpUrl('knapsack-1d-asc'), width)
    const dp = page.locator(DP)
    await dp.getByRole('button', { name: 'Next' }).click()
    await settle(page)
    same('cell glyph', ref.glyph, await svgLook(dp, 'svg [data-cell]:not([data-changed]) .vz-g'))
    same('cell label', ref.label, await svgLook(dp, 'svg [data-cell][data-value="true"] text'))
    same('changed cell', ref.changedCell, await svgLook(dp, 'svg [data-cell][data-changed] .vz-ch'))
    same('index tag', ref.tag, await svgLook(dp, 'svg [data-tag] rect:not(.vz-ch)'))
    same('index tag text', ref.tagText, await svgLook(dp, 'svg [data-tag] text'))
    same('changed tag', ref.changed, await svgLook(dp, 'svg [data-tag] .vz-ch'))
    same('index', ref.index, await svgLook(dp, 'svg [data-indices] text'))
    expect(diffs).toEqual([])
  })

/**
 * The wave 3B JavaScript-track figures speak the same vocabulary: each
 * figure's frame, title, caption and panel heading compute like the heap
 * graph's and the pointer frames', its glyphs like the heap graph's glyph,
 * its links at rest like the heap graph's links, and every rest mark it has
 * like the heap graph's changed mark and changed link (never lime).
 */
for (const width of [375, 1440])
  test(`wave 3B and 4A figures compute like the heap graph @${width}`, async ({ page }) => {
    const SVG = ['fill', 'stroke', 'stroke-width', 'font-family', 'font-size', 'font-weight', 'color'] as const
    const TEXT = LOOK.filter((k) => k !== 'min-height')
    const FRAME = ['border-top-left-radius', 'border-top-width', 'border-top-color', 'padding-left', 'padding-top', 'background-color'] as const
    const inSvg = (root: Locator, sel: string, optional = false) =>
      root.evaluate(
        (f, [q, ps, opt]) => {
          const el = [...f.querySelectorAll('svg')]
            .filter((x) => x.getBoundingClientRect().width > 0)
            .map((x) => x.querySelector(q as string))
            .find(Boolean)
          if (!el) {
            if (opt) return null
            throw new Error(`nothing matches ${q}`)
          }
          const cs = getComputedStyle(el)
          return Object.fromEntries((ps as unknown as string[]).map((k) => [k, cs.getPropertyValue(k)]))
        },
        [sel, SVG, optional] as const,
      )
    const diffs: string[] = []
    const same = (what: string, a: Record<string, string> | null, b: Record<string, string> | null) => {
      if (!a || !b) return
      for (const k of Object.keys(a)) if (a[k] !== b[k]) diffs.push(`${what} ${k}: heap graph ${a[k]} vs ${b[k]}`)
    }
    await open(page, `${GALLERY}?static=1`, width)
    const hg = page.locator('figure[data-viz-preset="identity-alias-rebind-spread"]')
    const heap = {
      frame: await look(hg, FRAME),
      title: await look(hg.locator('p').first(), TEXT),
      caption: await look(hg.locator('figcaption'), TEXT),
      glyph: await inSvg(hg, 'svg [data-node] .vz-g'),
      link: await inSvg(hg, 'svg [data-edge^="bind:"]:not([data-changed]) .vz-e'),
      changedLink: await inSvg(hg, 'svg [data-edge][data-changed] .vz-e'),
      changed: await inSvg(hg, 'svg .vz-ch'),
    }
    await open(page, `${GALLERY}?ll=static`, width)
    const heading = await inSvg(page.locator('figure[data-viz-preset="floyd-rho"]'), 'svg [data-viz-part="panel-heading"]')
    await open(page, jsUrl, width)
    for (const preset of ['lookup-and-shadowing', 'constructor-fix', 'hidden-class-transitions', 'debounce-vs-throttle', 'event-dispatch-path', 'oauth-pkce-channels', 'union-vs-intersection']) {
      const f = page.locator(`figure[data-viz-preset="${preset}"]`)
      same(`${preset} frame`, heap.frame, await look(f, FRAME))
      same(`${preset} title`, heap.title, await look(f.locator('p').first(), TEXT))
      same(`${preset} caption`, heap.caption, await look(f.locator('figcaption'), TEXT))
      same(`${preset} panel heading`, heading, await inSvg(f, 'svg [data-viz-part="panel-heading"]'))
      same(`${preset} glyph`, heap.glyph, await inSvg(f, 'svg [data-node] > .vz-g', true))
      same(`${preset} link`, heap.link, await inSvg(f, 'svg [data-edge]:not([data-changed]):not([data-kind="constructor"]) > .vz-e', true))
      same(`${preset} changed link`, heap.changedLink, await inSvg(f, 'svg [data-edge][data-changed] > .vz-e', true))
      same(`${preset} changed mark`, heap.changed, await inSvg(f, 'svg rect.vz-ch', true))
    }
    // The wave 4A DSA-track figures: the same frame, heading, glyph, link and changed roles.
    await open(page, dsaUrl, width)
    for (const preset of ['segment-tree-query-cover', 'dsu-parent-forest', 'insert-4-10-3-5-1-then-extract', 'fib5', 'lps-interval-triangle']) {
      const f = page.locator(`figure[data-viz-preset="${preset}"]`)
      same(`${preset} frame`, heap.frame, await look(f, FRAME))
      same(`${preset} title`, heap.title, await look(f.locator('p').first(), TEXT))
      same(`${preset} caption`, heap.caption, await look(f.locator('figcaption'), TEXT))
      same(`${preset} panel heading`, heading, await inSvg(f, 'svg [data-viz-part="panel-heading"]'))
      same(`${preset} glyph`, heap.glyph, await inSvg(f, 'svg [data-node]:not([data-changed]) > .vz-g, svg [data-cell]:not([data-changed]) > .vz-g'))
      same(`${preset} link`, heap.link, await inSvg(f, 'svg [data-edge]:not([data-changed]) > .vz-e', true))
      same(`${preset} changed link`, heap.changedLink, await inSvg(f, 'svg [data-edge][data-changed] > .vz-e', true))
      same(`${preset} changed mark`, heap.changed, await inSvg(f, 'svg rect.vz-ch', true))
    }
    expect(diffs).toEqual([])
  })

/**
 * The frames visuals (wave 3C) are step-throughs like the event loop: the
 * same shell and the shared `Lane`, so the frame, a lane panel and its chip,
 * the changed mark, the current code line, the question, choices, Skip,
 * reveal marks and feedback compute as the event loop's do. Local-only (the
 * frames show practice answers).
 */
for (const width of [375, 1440])
  test(`the frames draw the shell and their lanes like the event loop @${width}`, async ({ page }) => {
    const url = fxUrl('refill-on-settle')
    test.skip(urlLocalOnly(url) !== null, urlLocalOnly(url) ?? '')
    const diffs: string[] = []
    const looks: Record<string, Record<string, string>>[] = []
    const PANEL = ['background-color', 'border-top-left-radius', 'padding-left', 'padding-top'] as const
    // Geometry and type: the fill is the step's (a changed chip takes its lane's tint).
    const CHIP = ['height', 'border-top-left-radius', 'border-top-width', 'font-family', 'font-size'] as const
    const FRAME = ['border-top-left-radius', 'border-top-width', 'border-top-color', 'padding-left', 'padding-top', 'background-color', 'margin-left', 'margin-right'] as const
    for (const [u, sel] of [
      [GALLERY, EL],
      [url, fxFrame('worker-pool')],
    ] as const) {
      await open(page, u, width)
      const f = page.locator(sel).first()
      const out: Record<string, Record<string, string>> = {}
      out.frame = await look(f, FRAME)
      if ((await f.getAttribute('data-viz-mode')) === 'ask') {
        await f.locator('[data-viz-part="viz-checkpoint"] [role="radio"]').nth(1).click()
        await settle(page)
      }
      await f.getByRole('button', { name: 'Next' }).click()
      await settle(page)
      out.lane = await look(f.locator('[data-viz-region="stack"], [data-viz-region^="fx-"]').first(), PANEL)
      out.chip = await look(f.locator('[data-viz-region="stack"] [data-chip], [data-viz-region^="fx-"] [data-chip]').first(), CHIP)
      out['current code line'] = await look(f.locator('[data-viz-region="code"] li[aria-current]').first(), ['background-color'])
      for (let i = 0; i < 14 && (await f.getAttribute('data-viz-mode')) !== 'ask'; i++) await f.getByRole('button', { name: 'Next' }).click()
      await settle(page)
      out['choice row'] = await look(f.locator('[data-viz-part="viz-checkpoint"] [role="radio"]').first())
      out.prompt = await look(f.locator('[data-viz-part="viz-prompt"]'))
      out.Skip = await look(f.locator('[data-viz-part="viz-skip"]'))
      out.anatomy = await anatomy(f)
      // A wrong pick: the event loop's mid-run answer is its second choice, the pool's first.
      await f.locator('[data-viz-part="viz-checkpoint"] [role="radio"]').nth(sel === EL ? 0 : 1).click()
      await settle(page)
      out['correct choice'] = await look(f.locator('[role="radio"]:has([data-choice-slot="right"])'))
      out['wrong pick'] = await look(f.locator('[role="radio"]:has([data-choice-slot="wrong"])'))
      out.feedback = await look(f.locator('[data-viz-part="viz-feedback"]'))
      looks.push(out)
    }
    const [a, b] = looks
    for (const what of Object.keys(a))
      for (const k of Object.keys(a[what])) if (a[what][k] !== b[what][k]) diffs.push(`${what} ${k}: event loop ${a[what][k]} vs frames ${b[what][k]}`)
    expect(diffs).toEqual([])
  })
