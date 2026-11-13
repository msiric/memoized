import { expect, test, type Page } from '@playwright/test'
import colors from 'tailwindcss/colors'
import {
  CODE_PRINT,
  CODE_PRINT_INK,
  contrastPairs,
  roles,
  type PaletteRef,
} from '../../src/components/visualizations/primitives/tokens-v3'
import { auditContrast, type Pair } from './contrast-audit'
import { GALLERY, LESSONS, SPECIMEN, STATES, lessonUrl, open } from './drive'

/**
 * Contrast gate (VIZ-H G, R1 L05): the token table (`tokens-v3.test.ts`)
 * proves every declared pair; this crawl proves the pairs that actually
 * render, from computed styles, in every state the gallery reaches, on the
 * specimen (every primitive in every forced state), and in lesson context.
 * Dark at 375 and 1440, and the light print rendering. See
 * `contrast-audit.ts` for what counts as a pair and the one exemption
 * (aria-disabled and disabled controls).
 */

const palette = colors as unknown as Record<string, Record<string, string>>
const hexOf = (ref: PaletteRef | 'white') => (ref === 'white' ? '#ffffff' : palette[ref.split('.')[0]][ref.split('.')[1]])
/** Every color the tokens declare as a foreground (text or graphic), dark and light. */
const PALETTE = [
  ...new Set(
    [...contrastPairs.flatMap((p) => [p.fg.dark, p.fg.light]), ...Object.values(roles).flatMap((r) => [r.dark, r.light])].map(hexOf),
  ),
]
const CODE_COLORS = [...Object.keys(CODE_PRINT), ...Object.values(CODE_PRINT), CODE_PRINT_INK].map((h) => h.toLowerCase())
const SCOPE = '[data-viz] section, [data-viz] figure, [data-viz-frame="system"]'

const WIDTHS = [375, 1440] as const

/**
 * OPEN DECISION, not an exemption class: the closures trace (H3 R11) dims
 * everything off the traced path to opacity 0.4 (`opacityRole.dim`), which
 * puts muted text at 2.2 to 3.5:1 and grey edges at 1.6:1 while a function is
 * hovered or focused. WCAG 1.4.3 and 1.4.11 have no exception for that; text
 * stays readable only from 0.85 and edges from 0.9. Until the lead rules
 * (keep the dim and accept it, or dim only to 0.85 to 0.9, or emphasize
 * without dimming), the crawl reports these pairs as annotations in the
 * one state that dims and still fails on anything else there. Remove this
 * when decided.
 */
const PENDING_R11_DIM = { state: 'closures-hover', alpha: 0.45 }

function failures(pairs: Pair[], state?: string) {
  const pending = (p: Pair) => state === PENDING_R11_DIM.state && p.alpha <= PENDING_R11_DIM.alpha
  const dimmed = pairs.filter((p) => !p.exempt && p.ratio < p.need - 0.005 && pending(p))
  if (dimmed.length)
    test.info().annotations.push({
      type: 'pending decision (R11 dim)',
      description: `${state}: ${dimmed.length} dimmed pairs below WCAG, lowest ${Math.min(...dimmed.map((p) => p.ratio)).toFixed(2)}:1`,
    })
  return pairs
    .filter((p) => !p.exempt && !pending(p) && (p.kind === 'palette' || p.ratio < p.need - 0.005))
    .map((p) =>
      p.kind === 'palette'
        ? `off-token color ${p.fg}: "${p.text}" (${p.what})`
        : `${p.kind} ${p.ratio.toFixed(2)}:1 < ${p.need}:1: ${p.fg} on ${p.bg}${p.text ? ` "${p.text}"` : ''} (${p.what})`,
    )
}

async function audit(page: Page, where: string, focus = true, state?: string) {
  const pairs = await auditContrast(page, { scope: SCOPE, palette: PALETTE, codeColors: CODE_COLORS, focus })
  const exempt = pairs.filter((p) => p.exempt && p.ratio < p.need)
  if (exempt.length)
    test.info().annotations.push({
      type: 'exempt (aria-disabled)',
      description: `${where}: ${exempt.length} pairs on unavailable controls`,
    })
  expect(pairs.length, `${where}: the crawl found pairs`).toBeGreaterThan(10)
  return failures(pairs, state).map((f) => `${where}: ${f}`)
}

for (const width of WIDTHS) {
  test(`specimen @${width}: every rendered pair passes`, async ({ page }) => {
    await open(page, SPECIMEN, width)
    expect(await audit(page, `specimen @${width}`)).toEqual([])
  })

  test(`gallery states @${width}: every rendered pair passes`, async ({ page }) => {
    test.setTimeout(180_000)
    const problems: string[] = []
    for (const [name, drive] of Object.entries(STATES)) {
      const url = name.startsWith('closures') ? `${GALLERY}?static=1` : GALLERY
      await open(page, url, width)
      await drive(page)
      problems.push(...(await audit(page, `${name} @${width}`, true, name)))
    }
    expect(problems).toEqual([])
  })

  for (const slug of LESSONS)
    test(`lesson ${slug} @${width}: every rendered pair passes`, async ({ page }) => {
      await open(page, lessonUrl(slug), width)
      expect(await audit(page, `lesson ${slug} @${width}`)).toEqual([])
    })
}

test('print: the light rendering passes', async ({ page }) => {
  test.setTimeout(120_000)
  const problems: string[] = []
  for (const url of [SPECIMEN, GALLERY, `${GALLERY}?static=1`]) {
    await open(page, url, 1024)
    await page.emulateMedia({ media: 'print', reducedMotion: 'reduce' })
    // Paper has no focus: forced focus rings on the specimen are not printed pairs.
    problems.push(...(await audit(page, `print ${url}`, false)))
  }
  expect(problems).toEqual([])
})
