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
import { GALLERY, LESSONS, MOTION_STATES, SPECIMEN, STATES, freezeForContrast, lessonUrl, open, stateUrl } from './drive'

/**
 * Contrast gate (VIZ-H G, R1 L05): the token table (`tokens-v3.test.ts`)
 * proves every declared pair; this crawl proves the pairs that actually
 * render, from computed styles, in every state the gallery reaches, on the
 * specimen (every primitive in every forced state), and in lesson context.
 * Dark at 375, 768 and 1440, and the light print rendering. See
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

/** 375, 768 (the narrow-to-wide switch, R2 G-02) and 1440. */
const WIDTHS = [375, 768, 1440] as const

function failures(pairs: Pair[]) {
  return pairs
    .filter((p) => !p.exempt && (p.kind === 'palette' || p.ratio < p.need - 0.005))
    .map((p) =>
      p.kind === 'palette'
        ? `off-token color ${p.fg}: "${p.text}" (${p.what})`
        : `${p.kind} ${p.ratio.toFixed(2)}:1 < ${p.need}:1: ${p.fg} on ${p.bg}${p.text ? ` "${p.text}"` : ''} (${p.what})`,
    )
}

/** `palette`: also check every text color against the tokens (a rest-state rule; mid-tween colors are blends). */
async function audit(page: Page, where: string, focus = true, palette = true) {
  const pairs = await auditContrast(page, { scope: SCOPE, palette: PALETTE, codeColors: CODE_COLORS, focus })
  const exempt = pairs.filter((p) => p.exempt && p.ratio < p.need)
  if (exempt.length)
    test.info().annotations.push({
      type: 'exempt (aria-disabled)',
      description: `${where}: ${exempt.length} pairs on unavailable controls`,
    })
  expect(pairs.length, `${where}: the crawl found pairs`).toBeGreaterThan(10)
  return failures(palette ? pairs : pairs.filter((p) => p.kind !== 'palette')).map((f) => `${where}: ${f}`)
}

for (const width of WIDTHS) {
  test(`specimen @${width}: every rendered pair passes`, async ({ page }) => {
    await open(page, SPECIMEN, width)
    expect(await audit(page, `specimen @${width}`)).toEqual([])
  })

  test(`gallery states @${width}: every rendered pair passes`, async ({ page }) => {
    test.setTimeout(300_000)
    const problems: string[] = []
    for (const [name, drive] of Object.entries(STATES)) {
      await open(page, stateUrl(name), width)
      await drive(page)
      problems.push(...(await audit(page, `${name} @${width}`)))
    }
    expect(problems).toEqual([])
  })

  for (const slug of LESSONS)
    test(`lesson ${slug} @${width}: every rendered pair passes`, async ({ page }) => {
      await open(page, lessonUrl(slug), width)
      expect(await audit(page, `lesson ${slug} @${width}`)).toEqual([])
    })
}

/**
 * Full motion (R2 G-01, MOTION GB8): every designed motion with a payoff,
 * from the input that starts it, frozen at +140 and +440 ms (the beats and
 * the verdict, mid-flight) and crawled: a label whose color tweens with its
 * fill, a ground mid-relight under syntax colors, a verdict over a fading
 * tint. Fades and moves are finished first (`freezeForContrast`), so a pair
 * is judged at the colors a reader sees then, not at a partial opacity.
 * The PR tier runs 375; the full tier 375, 768 and 1440 (MOTION_WIDTHS).
 */
const MOTION_CONTRAST_WIDTHS = process.env.STRESS_TIER === 'full' ? [375, 768, 1440] : [375]
for (const width of MOTION_CONTRAST_WIDTHS)
  test(`full motion @${width}: every rendered pair passes while a reveal plays`, async ({ page }) => {
    test.setTimeout(600_000)
    const problems: string[] = []
    for (const [name, st] of Object.entries(MOTION_STATES))
      for (const ms of [140, 440]) {
        await open(page, st.url, width, 900, 'no-preference')
        await st.setup(page)
        await st.act(page)
        await page.waitForTimeout(ms)
        await freezeForContrast(page)
        problems.push(...(await audit(page, `${name} +${ms}ms @${width}`, true, false)))
      }
    expect(problems).toEqual([])
  })

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
