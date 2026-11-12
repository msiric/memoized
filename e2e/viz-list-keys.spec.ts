import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'
import { VIZ_TABLE } from '../src/components/visualizations/entry-table'
import {
  ITEMS,
  KEY_STRATEGIES,
  LIST_ACTIONS,
  afterRows,
  type KeyStrategy,
  type ListAction,
} from '../src/components/visualizations/engines/list-keys/model'
import { LIST_OUTCOMES } from '../src/components/visualizations/engines/list-keys/outcomes'

/**
 * The list-keys explorable on /dev/visualizations, through the real `<Viz>`
 * mount (VIZ-01 spec §7): what the page shows equals React's recorded
 * outcome, keyboard-only use, touch targets, reduced motion, layout stability
 * across every combination, overflow at 5 widths, axe, and screenshots.
 */

const GALLERY = '/dev/visualizations'
const WIDTHS = [320, 375, 768, 1024, 1440] as const
const [, NARROW, WIDE] = VIZ_TABLE['list-keys']

const mount = (page: Page) => page.locator('[data-viz="list-keys"]')
const frame = (page: Page) => mount(page).locator('section')
const mode = (page: Page) => frame(page).getAttribute('data-viz-mode')

let errors: string[] = []
test.beforeEach(({ page }) => {
  errors = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  page.on('pageerror', (e) => errors.push(e.message))
})
test.afterEach(() => {
  expect(errors, 'no console errors or hydration warnings').toEqual([])
})

async function open(page: Page, width: number, query = '', height = 1000) {
  await page.setViewportSize({ width, height })
  await page.goto(GALLERY + query)
  await mount(page).scrollIntoViewIfNeeded()
  await expect(
    mount(page).locator('[data-viz-interactive="true"]'),
  ).toBeVisible()
}

const keyRadio = (page: Page, k: KeyStrategy) =>
  frame(page)
    .getByRole('radiogroup', { name: 'Key strategy' })
    .getByRole('radio', {
      name: k === 'random' ? 'Math.random()' : k,
      exact: true,
    })

async function setKey(page: Page, k: KeyStrategy) {
  await keyRadio(page, k).click()
}

/** From any phase: go to pick, apply the action, skip the prediction. */
async function reveal(page: Page, action: ListAction | 'type' | 'class') {
  const f = frame(page)
  if ((await mode(page)) !== 'pick') {
    if ((await mode(page)) === 'reveal')
      await f.getByTestId('viz-again').click()
    else await f.getByTestId('viz-back').click()
  }
  await f.locator(`[data-viz-focus="action-${action}"]`).click()
  await f.getByTestId('viz-skip').click()
  await expect(f).toHaveAttribute('data-viz-mode', 'reveal')
}

async function layoutSnapshot(page: Page) {
  return page.evaluate(() => {
    const root = document.querySelector('[data-viz="list-keys"]')!
    const els: [string, Element | null][] = [
      ['frame', root.querySelector('section')],
      ...['stage', 'keyrow', 'code', 'columns', 'status', 'dock'].map(
        (r) =>
          [r, root.querySelector(`[data-viz-region="${r}"]`)] as [
            string,
            Element | null,
          ],
      ),
      ['after', root.nextElementSibling],
    ]
    return Object.fromEntries(
      els.map(([k, el]) => {
        const r = el!.getBoundingClientRect()
        return [
          k,
          [
            Math.round(r.x),
            Math.round(r.y + window.scrollY),
            Math.round(r.width),
            Math.round(r.height),
          ],
        ]
      }),
    )
  })
}

test('shows exactly what React did, for every key and action (P6)', async ({
  page,
}) => {
  await open(page, 1024)
  const f = frame(page)
  for (const key of KEY_STRATEGIES) {
    await setKey(page, key)
    for (const action of LIST_ACTIONS) {
      await reveal(page, action)
      const expected = afterRows(
        key,
        action,
        LIST_OUTCOMES[`${key}/${action}`],
        { milk: true, dog: false },
      )
      const rows = f.locator('[data-viz-part="after"] li[data-row]')
      await expect(rows).toHaveCount(expected.length)
      for (const [i, r] of expected.entries()) {
        const row = rows.nth(i)
        await expect(row, `${key}/${action} row ${i}`).toContainText(
          ITEMS[r.item].text,
        )
        await expect(row).toHaveAttribute('data-instance', r.instance)
        await expect(row).toHaveAttribute('data-checked', String(r.checked))
        await expect(row).toHaveAttribute('data-status', r.status ?? '')
      }
    }
  }
})

test('the wrapper scene shows the recorded remount and the kept count', async ({
  page,
}) => {
  await open(page, 1024, '?lk=parent-type-change')
  const f = frame(page)
  await f.getByRole('button', { name: /count 7, add 1/ }).click()
  await reveal(page, 'type')
  await expect(
    f.locator('[data-viz-part="after"] [data-count]'),
  ).toHaveAttribute('data-count', '0')
  await reveal(page, 'class')
  await expect(
    f.locator('[data-viz-part="after"] [data-count]'),
  ).toHaveAttribute('data-count', '8')
})

test('predict, then reveal: the answer is checked against React (§5.4)', async ({
  page,
}) => {
  await open(page, 375)
  const f = frame(page)
  await expect(f).toHaveAttribute('data-viz-mode', 'ask')
  await expect(f.getByTestId('viz-prompt')).toHaveText(
    'Where does Buy milk’s check end up?',
  )
  await expect(
    f.locator('[data-viz-part="after"] li[data-row]').first(),
  ).not.toHaveAttribute('data-checked')
  await f.locator('[data-choice="milk"]').click()
  await expect(f.getByTestId('viz-feedback')).toContainText(
    'Not quite: you picked Buy milk.',
  )
  await expect(f.getByTestId('viz-feedback')).toContainText(
    'Instance A now renders Wake up',
  )
  await f.getByTestId('viz-again').click()
  await f.locator('[data-viz-focus="action-insert-top"]').click()
  await f.locator('[data-choice="wake"]').click()
  await expect(f.getByTestId('viz-feedback')).toContainText('Right.')
})

test('keyboard only: every control, focus never lost (§5.2)', async ({
  page,
}) => {
  await open(page, 1024)
  const f = frame(page)
  const active = () =>
    page.evaluate(() => {
      const a = document.activeElement as HTMLElement | null
      return a && a.closest('[data-viz="list-keys"]')
        ? (a.getAttribute('data-viz-focus') ??
            a.getAttribute('role') ??
            a.tagName)
        : 'outside'
    })
  // Into the frame: scene switcher, then the key strategy.
  await f
    .getByRole('radiogroup', { name: 'Scene' })
    .getByRole('radio', { checked: true })
    .focus()
  await page.keyboard.press('Tab')
  await expect(keyRadio(page, 'index')).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(f).toHaveAttribute('data-viz-key', 'id')
  await expect(keyRadio(page, 'id')).toBeFocused()
  // The Before checkboxes.
  await page.keyboard.press('Tab')
  expect(await active()).toBe('check-milk')
  await page.keyboard.press('Tab')
  expect(await active()).toBe('check-dog')
  await page.keyboard.press('Space')
  await expect(f.locator('[data-viz-focus="check-dog"]')).toBeChecked()
  await page.keyboard.press('Space')
  // Into the dock: the choices (one stop, arrows move), then Skip.
  await page.keyboard.press('Tab')
  expect(await active()).toBe('choice-0')
  await page.keyboard.press('Tab')
  expect(await active()).toBe('skip')
  await page.keyboard.press('Shift+Tab')
  expect(await active()).toBe('choice-0')
  await page.keyboard.press('ArrowRight')
  expect(await active()).toBe('choice-1')
  await page.keyboard.press('Enter')
  await expect(f).toHaveAttribute('data-viz-mode', 'reveal')
  expect(
    await active(),
    'focus moves to the control that replaced the choice',
  ).toBe('again')
  await page.keyboard.press('Enter')
  await expect(f).toHaveAttribute('data-viz-mode', 'pick')
  expect(await active()).toBe('action-insert-top')
  await page.keyboard.press('Tab')
  expect(await active()).toBe('action-delete-first')
  await page.keyboard.press('Enter')
  expect(await active()).toBe('choice-0')
  await page.keyboard.press('Escape')
  await expect(f).toHaveAttribute('data-viz-mode', 'pick')
  expect(await active()).toBe('action-delete-first')
  await page.keyboard.press('Enter')
  await page.keyboard.press('1')
  await expect(f).toHaveAttribute('data-viz-mode', 'reveal')
  expect(await active()).toBe('again')
  // The scene switcher by arrows.
  await f
    .getByRole('radiogroup', { name: 'Scene' })
    .getByRole('radio', { checked: true })
    .focus()
  await page.keyboard.press('ArrowRight')
  await expect(f).toHaveAttribute('data-viz-scene', 'wrapper')
  // The text alternative opens from the keyboard.
  await f.locator('summary').focus()
  await page.keyboard.press('Enter')
  await expect(f.locator('details')).toHaveAttribute('open', '')
})

test('touch targets are at least 44×44 with 8 px between them (A5)', async ({
  page,
}) => {
  for (const width of [320, 375, 1024]) {
    await open(page, width)
    const check = async (where: string) => {
      const targets = frame(page).locator('button, summary, label')
      const boxes: {
        name: string
        x: number
        y: number
        w: number
        h: number
      }[] = []
      for (const t of await targets.all()) {
        if (!(await t.isVisible())) continue
        const b = (await t.boundingBox())!
        const name =
          (await t.getAttribute('aria-label')) ??
          (await t.innerText()).replace(/\s+/g, ' ')
        expect(
          b.width,
          `${where} ${width}: ${name} width`,
        ).toBeGreaterThanOrEqual(44)
        expect(
          b.height,
          `${where} ${width}: ${name} height`,
        ).toBeGreaterThanOrEqual(44)
        boxes.push({ name, x: b.x, y: b.y, w: b.width, h: b.height })
      }
      for (const a of boxes)
        for (const b of boxes) {
          if (a === b) continue
          const dx = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w))
          const dy = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h))
          expect(
            Math.max(dx, dy),
            `${where} ${width}: ${a.name} / ${b.name} spacing`,
          ).toBeGreaterThanOrEqual(7.5)
        }
    }
    await check('ask')
    await frame(page).getByTestId('viz-skip').click()
    await check('reveal')
    await frame(page).getByTestId('viz-again').click()
    await check('pick')
    await frame(page).getByRole('radio', { name: 'Wrapper type' }).click()
    await check('wrapper pick')
  }
})

test('reduced motion: lines and state chip land instantly, information unchanged (A4)', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await open(page, 1024)
  const f = frame(page)
  await f.getByTestId('viz-skip').click()
  await page.waitForTimeout(20)
  const sample = await f.evaluate((el) => {
    const chip = el.querySelector(
      '[data-viz-part="state-chip"]',
    )!.parentElement!
    const path = el.querySelector('[data-link="reused"] path')!
    return {
      transform: getComputedStyle(chip).transform,
      dash: getComputedStyle(path).strokeDasharray,
    }
  })
  await page.waitForTimeout(400)
  const settled = await f.evaluate((el) => {
    const chip = el.querySelector(
      '[data-viz-part="state-chip"]',
    )!.parentElement!
    const path = el.querySelector('[data-link="reused"] path')!
    return {
      transform: getComputedStyle(chip).transform,
      dash: getComputedStyle(path).strokeDasharray,
    }
  })
  expect(sample, 'already at the end state on the first frame').toEqual(settled)
  await expect(f.locator('[data-focus]')).toHaveCount(1)
  await expect(f.locator('[data-status="foreign"]')).toHaveCount(1)
})

test('full motion: the reveal draws and the chip moves, then settles', async ({
  page,
}) => {
  await open(page, 1024)
  const f = frame(page)
  await page.waitForTimeout(300)
  await f.getByTestId('viz-skip').click()
  await page.waitForTimeout(30)
  const early = await f.evaluate(
    (el) =>
      getComputedStyle(
        el.querySelector('[data-viz-part="state-chip"]')!.parentElement!,
      ).transform,
  )
  await page.waitForTimeout(400)
  const late = await f.evaluate(
    (el) =>
      getComputedStyle(
        el.querySelector('[data-viz-part="state-chip"]')!.parentElement!,
      ).transform,
  )
  expect(early).not.toEqual(late)
})

test('layout stability: nothing moves across every scene, key, action and phase', async ({
  page,
}) => {
  for (const width of [375, 1024]) {
    await open(page, width)
    const f = frame(page)
    const base = await layoutSnapshot(page)
    expect(base.frame[3], 'frame height equals the reserved footprint').toBe(
      width < 768 ? NARROW : WIDE,
    )
    const same = async (label: string) =>
      expect(await layoutSnapshot(page), `${label} at ${width}`).toEqual(base)
    for (const key of KEY_STRATEGIES) {
      await setKey(page, key)
      await same(`key ${key}`)
      for (const action of LIST_ACTIONS) {
        await reveal(page, action)
        await same(`${key}/${action} reveal`)
        await f.getByTestId('viz-again').click()
        await same(`${key}/${action} pick`)
        await f.locator(`[data-viz-focus="action-${action}"]`).click()
        await same(`${key}/${action} ask`)
      }
    }
    // No checks: the prompt changes to the no-state message.
    await f.locator('[data-viz-focus="check-milk"]').click()
    await same('nothing checked')
    // A 10-click burst.
    for (let i = 0; i < 10; i++)
      await f.locator('[data-viz-focus="check-dog"]').click()
    await same('burst')
    await f.getByRole('radio', { name: 'Wrapper type' }).click()
    const wrapper = { ...base }
    const w = await layoutSnapshot(page)
    // The key row holds the setup sentence in this scene; the outer regions hold still.
    for (const k of ['frame', 'stage', 'status', 'dock', 'after'] as const)
      expect(w[k], `wrapper ${k}`).toEqual(wrapper[k])
    for (const a of ['type', 'class'] as const) {
      await reveal(page, a)
      const r = await layoutSnapshot(page)
      for (const k of ['frame', 'stage', 'status', 'dock', 'after'] as const)
        expect(r[k], `wrapper ${a} ${k}`).toEqual(wrapper[k])
    }
  }
})

test('no overflow or clipped text at 5 widths, in every phase and scene', async ({
  page,
}) => {
  for (const width of WIDTHS) {
    await open(page, width)
    const check = async (where: string) => {
      const problems = await frame(page).evaluate((root) => {
        const out: string[] = []
        const fr = root.getBoundingClientRect()
        if (document.documentElement.scrollWidth > window.innerWidth)
          out.push('page scrolls horizontally')
        for (const el of root.querySelectorAll<HTMLElement>('*')) {
          if (
            el.closest('details:not([open])') ||
            el.closest('.sr-only') ||
            el.closest('[data-viz-region="code"]')
          )
            continue
          const r = el.getBoundingClientRect()
          if (!r.width || getComputedStyle(el).visibility === 'hidden') continue
          if (r.right > fr.right + 0.5 || r.left < fr.left - 0.5)
            out.push(`outside frame: ${el.tagName} ${el.className}`)
          if (
            getComputedStyle(el).textOverflow === 'ellipsis' &&
            el.scrollWidth > el.clientWidth + 1
          )
            out.push(`truncated: "${el.textContent}"`)
        }
        for (const reg of root.querySelectorAll<HTMLElement>(
          '[data-viz-region]',
        )) {
          if (reg.scrollHeight > reg.clientHeight + 1)
            out.push(`region overflows: ${reg.dataset.vizRegion}`)
        }
        return out
      })
      expect(problems, `${where} at ${width}`).toEqual([])
    }
    const f = frame(page)
    await check('ask')
    for (const key of KEY_STRATEGIES) {
      await setKey(page, key)
      for (const action of LIST_ACTIONS) {
        await reveal(page, action)
        await check(`${key}/${action}`)
      }
    }
    await f.getByTestId('viz-again').click()
    await check('pick')
    await f.getByRole('radio', { name: 'Wrapper type' }).click()
    await check('wrapper pick')
    for (const a of ['type', 'class'] as const) {
      await reveal(page, a)
      await check(`wrapper ${a}`)
    }
  }
})

test('zero axe violations in every phase (§7)', async ({ page }) => {
  for (const width of [375, 1024]) {
    await open(page, width)
    const scan = async (label: string) => {
      await page.waitForTimeout(350)
      const result = await new AxeBuilder({ page })
        .include('[data-viz="list-keys"]')
        .withTags([
          'wcag2a',
          'wcag2aa',
          'wcag21a',
          'wcag21aa',
          'wcag22aa',
          'best-practice',
        ])
        .analyze()
      expect(
        result.violations.map(
          (v) =>
            `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
        ),
        `${label} at ${width}`,
      ).toEqual([])
    }
    const f = frame(page)
    await scan('ask')
    await f.getByTestId('viz-skip').click()
    await scan('reveal')
    await f.getByTestId('viz-again').click()
    await scan('pick')
    await f.getByRole('radio', { name: 'Wrapper type' }).click()
    await reveal(page, 'type')
    await scan('wrapper reveal')
    await f.locator('summary').click()
    await scan('outcomes as text open')
  }
})

test('without JavaScript: the start frame and the full text alternative', async ({
  browser,
}) => {
  const ctx = await browser.newContext({
    javaScriptEnabled: false,
    colorScheme: 'dark',
  })
  const page = await ctx.newPage()
  await page.goto(GALLERY)
  const f = page.locator('[data-viz="list-keys"] section')
  await expect(f).toHaveAttribute('data-viz-interactive', 'false')
  await f.locator('summary').click()
  await expect(f.locator('details')).toContainText(
    'moves to Wake up (wrong item)',
  )
  await ctx.close()
})

test('screenshots at 320, 375, 768, 1024 and 1440', async ({
  page,
}, testInfo) => {
  const shot = async (locator: Locator, name: string) => {
    const path = testInfo.outputPath(`${name}.png`)
    await locator.screenshot({ path, animations: 'disabled' })
    await testInfo.attach(name, { path, contentType: 'image/png' })
  }
  for (const width of WIDTHS) {
    await open(page, width)
    const f = frame(page)
    await shot(f, `lk-${width}-ask`)
    await f.locator('[data-choice="milk"]').click()
    await page.waitForTimeout(400)
    await shot(f, `lk-${width}-reveal-index`)
    await setKey(page, 'id')
    await f.getByTestId('viz-skip').click()
    await page.waitForTimeout(400)
    await shot(f, `lk-${width}-reveal-id`)
    await setKey(page, 'random')
    await f.getByTestId('viz-skip').click()
    await page.waitForTimeout(400)
    await shot(f, `lk-${width}-reveal-random`)
    await f.getByTestId('viz-again').click()
    await shot(f, `lk-${width}-pick`)
    await f.getByRole('radio', { name: 'Wrapper type' }).click()
    await reveal(page, 'type')
    await page.waitForTimeout(400)
    await shot(f, `lk-${width}-wrapper-type`)
  }
})
