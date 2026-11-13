import { expect, test, type Page } from '@playwright/test'
import { reveal as REVEAL_TOKEN } from '../../src/components/visualizations/primitives/tokens-v3'
import { motionsAfter, type ElementMotion } from './analyze'
import {
  EL,
  LK,
  REVEAL,
  WIDTHS,
  animated,
  hydrateListKeys,
  lkChoose,
  mark,
  openGallery,
  overlapProblems,
  recordAction,
  save,
  startRec,
  stopRec,
  strictCheck,
} from './helpers'

/**
 * VIZ-H D21: each visual's one designed reveal, the single explicit exception
 * to the two-glyph budget and the 300 ms cap. Asserts (unless
 * MOTION_STRICT=0), at 375, 1024 and 1440 (MOTION_WIDTHS overrides):
 *
 * - it plays the right elements, in the right order, and ends within 800 ms;
 * - G1: nothing it moves or fades prints over other text (a rider over row
 *   text, an output over a label);
 * - under reduced motion it is a crossfade (no movement, at most ~150 ms,
 *   everything at once) or nothing;
 * - it never plays on load or after an instant command;
 * - an interruption (Back, Restart, leaving the reveal, a resize) lands it
 *   at once: nothing of it is still moving or half-faded a frame later.
 */

type Part = { kind: string; label: string; start: number; end: number; props: ElementMotion['props'] }

/** Reveal elements that tweened after the command: when each started and ended (ms). */
function revealParts(ms: ElementMotion[]): Part[] {
  return animated(ms)
    .filter((e) => REVEAL.test(e.label))
    .map((e) => {
      const kind = e.label.match(REVEAL)![1]
      const start = Math.min(...e.props.map((p) => p.delay))
      const end = Math.max(...e.props.map((p) => p.delay + p.duration))
      return { kind, label: e.label, start, end, props: e.props }
    })
}

const report: Record<string, unknown> = {}
test.afterAll(() => save('reveal.json', report))

async function toEventLoopEnd(page: Page, answer: string) {
  const f = page.locator(EL)
  await f.scrollIntoViewIfNeeded()
  await page.getByRole('slider').first().focus()
  const last = Number(await page.getByRole('slider').first().getAttribute('aria-valuemax'))
  for (let g = 0; g < 30; g++) {
    const step = Number(await f.getAttribute('data-viz-step'))
    const mode = await f.getAttribute('data-viz-mode')
    if (step === last - 1 && mode !== 'ask') break
    await page.keyboard.press(mode === 'ask' ? answer : 'ArrowRight')
    await page.waitForTimeout(350)
  }
  await page.waitForTimeout(400)
}

/** Output index of a reveal tint (its li carries `data-out`). */
const outIndexes = (page: Page) =>
  page.locator(EL).evaluate((el) =>
    [...el.querySelectorAll('li[data-out]')].map((li) => Number(li.getAttribute('data-out'))),
  )

for (const width of WIDTHS)
for (const preset of ['basic-ordering', 'microtask-queued-during-drain'])
  test(`event-loop ${preset} @${width}: the console plays back, then the recap (D21)`, async ({ page }) => {
    await openGallery(page, { width, query: `?preset=${preset}` })
    await toEventLoopEnd(page, '2')
    const r = await recordAction(page, EL, () => page.keyboard.press('ArrowRight'), 1000)
    const parts = revealParts(r.motions)
    report[`el-${preset}-${width}`] = parts
    strictCheck(`${preset}@${width}: no text crosses text in the reveal (G1)`, overlapProblems(r.cap, r.at))
    const outs = parts.filter((p) => p.kind === 'out')
    const lines = parts.filter((p) => p.kind === 'line')
    const recap = parts.filter((p) => p.kind === 'recap')
    const n = (await outIndexes(page)).length
    const problems: string[] = []
    // Every output resolves in turn, the newest included (R5: it restarts from 0).
    if (outs.length !== n) problems.push(`expected ${n} outputs to resolve, got ${outs.length}`)
    // R7: the code line that printed each output relights with it.
    if (lines.length !== n) problems.push(`expected ${n} code lines to relight, got ${lines.length}`)
    for (const l of lines) {
      const op = l.props.find((p) => p.prop === 'op')
      if (!op || op.end !== 1) problems.push(`${l.label} does not end lit`)
    }
    const lineStarts = [...lines.map((l) => l.start)].sort((a, b) => a - b)
    const outStarts = [...outs.map((o) => o.start)].sort((a, b) => a - b)
    lineStarts.forEach((t, i) => {
      if (outStarts[i] !== undefined && Math.abs(t - outStarts[i]) > 34) problems.push(`line ${i} starts at ${t} ms, its output at ${outStarts[i]} ms`)
    })
    for (const o of outs) {
      if (o.props.some((p) => p.prop !== 'op' && p.prop !== 'eff')) problems.push(`${o.label} moves`)
      const op = o.props.find((p) => p.prop === 'op')
      if (!op || op.start !== 0 || op.end !== 1) problems.push(`${o.label} does not resolve 0 -> 1`)
    }
    // Left to right: the order of the start times is the order on screen.
    const xs = await page.locator(EL).evaluate((el) =>
      [...el.querySelectorAll('[data-viz-reveal="out"]')].map((n) => n.getBoundingClientRect().left),
    )
    const starts = outs.map((o) => o.start)
    for (let i = 1; i < starts.length; i++)
      if (!(starts[i] > starts[i - 1])) problems.push(`output ${i} starts at ${starts[i]} ms, not after ${starts[i - 1]} ms`)
    for (let i = 1; i < xs.length; i++) if (!(xs[i] > xs[i - 1])) problems.push('outputs are not left to right')
    if (recap.length !== 1) problems.push(`expected the recap caption to fade in once, got ${recap.length}`)
    // R5: the recap lands once the playback has resolved, not before.
    else if (outs.length && recap[0].start < Math.max(...outs.map((o) => o.end)) - 34)
      problems.push(`the recap lands at ${recap[0].start} ms, before the playback ends`)
    const end = Math.max(...parts.map((p) => p.end))
    if (end > REVEAL_TOKEN.maxMs) problems.push(`the reveal ends at ${end} ms`)
    strictCheck(`${preset}@${width}: reveal sequence`, problems)
    await expect(page.locator(EL).getByRole('button', { name: 'Replay' })).toBeVisible()
    // Choice 2 at each question: B (right) and C (right); micro 2 (wrong) and micro 2 (right).
    await expect(page.locator(EL).locator('[data-viz-part="viz-recap"]')).toHaveText(
      preset === 'basic-ordering'
        ? 'B logs last, as you said. C ran next, as you predicted.'
        : 'You said micro 2 logs last; it was timeout. micro 2 ran next, as you predicted.',
    )
  })

test('event-loop reveal under reduced motion: one crossfade, no movement', async ({ page }) => {
  await openGallery(page, { reduced: true })
  await toEventLoopEnd(page, '1')
  const r = await recordAction(page, EL, () => page.keyboard.press('ArrowRight'), 800)
  const parts = revealParts(r.motions)
  report['el-reduced'] = parts
  const problems: string[] = []
  for (const p of parts) {
    if (p.props.some((x) => !['op', 'eff'].includes(x.prop))) problems.push(`${p.label} moves`)
    if (p.end - p.start > 150) problems.push(`${p.label} fades for ${p.end - p.start} ms`)
  }
  const starts = parts.map((p) => p.start)
  if (starts.length && Math.max(...starts) - Math.min(...starts) > 34) problems.push(`not at once: ${starts.join(', ')} ms`)
  strictCheck('reduced reveal', problems)
  await expect(page.locator(EL).locator('[data-viz-part="viz-recap"]')).toHaveText(
    'You said A logs last; it was B. You predicted B next; it was C.',
  )
})

test('event-loop reveal never plays on load or after an instant command, and snaps when interrupted', async ({
  page,
}) => {
  await openGallery(page)
  const f = page.locator(EL)
  await f.scrollIntoViewIfNeeded()
  await page.getByRole('slider').first().focus()
  const problems: string[] = []
  // End (instant): the last step lands with no reveal.
  const end = await recordAction(page, EL, () => page.keyboard.press('End'), 600)
  if (revealParts(end.motions).length) problems.push('End played the reveal')
  // Back mid-reveal: every tint lands in the frame after Back.
  await page.keyboard.press('ArrowLeft')
  await page.waitForTimeout(400)
  await startRec(page, EL)
  await page.waitForTimeout(60)
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(110)
  const atBack = await mark(page)
  await page.keyboard.press('ArrowLeft')
  await page.waitForTimeout(600)
  const cap = await stopRec(page)
  const after = revealParts(motionsAfter(cap, atBack + 34))
  if (after.length) problems.push(`still resolving after Back: ${after.map((p) => p.label).join('; ')}`)
  const half = await f.evaluate((el) =>
    [...el.querySelectorAll('li[data-out] > span > span[aria-hidden]')]
      .map((n) => getComputedStyle(n).opacity)
      .filter((o) => o !== '0' && o !== '1'),
  )
  if (half.length) problems.push(`half-resolved tints after Back: ${half.join(', ')}`)
  // Replay restarts at once and keeps the answers (no reveal on the way).
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(900)
  const replay = await recordAction(page, EL, () => f.getByRole('button', { name: 'Replay' }).click(), 500)
  if (revealParts(replay.motions).length) problems.push('Replay played a reveal')
  if ((await f.getAttribute('data-viz-step')) !== '0') problems.push('Replay did not return to Start')
  report['el-instant'] = problems
  strictCheck('reveal: never on load or instant; snaps on Back', problems)
})

// ---------------------------------------------------------------------------
// List keys: the checkbox rides its match line and ticks on landing.
// ---------------------------------------------------------------------------

async function toAsk(page: Page, key: string, action: string, both = false) {
  // H3 R8: the key and the action are always-visible controls.
  await lkChoose(page, { both, key, action })
}

/** Each rider's last recorded box centre (frame coordinates) and its destination checkbox centre after landing. */
async function landing(page: Page, cap: Awaited<ReturnType<typeof stopRec>>) {
  const dest = await page.locator(LK).evaluate((el) => {
    const fr = el.getBoundingClientRect()
    return Object.fromEntries(
      [...el.querySelectorAll('[data-row^="after-"]')].map((row) => {
        const r = row.querySelector('[data-check]')!.getBoundingClientRect()
        return [row.getAttribute('data-row')!, { x: r.left - fr.left + r.width / 2, y: r.top - fr.top + r.height / 2 }]
      }),
    )
  })
  const last = new Map<number, { x: number; y: number; w: number; h: number; tx: number; ty: number }>()
  for (const f of cap.frames)
    for (const [id, s] of f.rows) if (/viz-reveal=rider/.test(cap.labels[id] ?? '')) last.set(id, { ...(last.get(id) ?? {}), ...s } as never)
  return { dest, riders: [...last.entries()].map(([id, s]) => ({ label: cap.labels[id], ...s })) }
}

for (const width of WIDTHS)
for (const [key, action, both, expectRides] of [
  ['Id', 'Insert at top', false, [['before-0', 'after-1']]],
  ['Index', 'Insert at top', false, [['before-0', 'after-0']]],
  ['Id', 'Reverse', true, [['before-0', 'after-1'], ['before-1', 'after-0']]],
] as const)
  test(`list-keys ${key} ${action}${both ? ' (two checks)' : ''} @${width}: the checkbox rides its line (D21)`, async ({ page }) => {
    await openGallery(page, { width })
    await hydrateListKeys(page)
    await toAsk(page, key, action, both)
    const f = page.locator(LK)
    // The riders exist from the first frame, so read them as the reveal starts.
    const seen = page.evaluate(
      () =>
        new Promise<string[]>((res) => {
          const out = new Set<string>()
          const obs = new MutationObserver(() => {
            for (const n of document.querySelectorAll('[data-viz-reveal="rider"]'))
              out.add(`${n.getAttribute('data-from')}>${n.getAttribute('data-to')}`)
          })
          obs.observe(document.body, { subtree: true, childList: true })
          setTimeout(() => {
            obs.disconnect()
            res([...out])
          }, 900)
        }),
    )
    const r = await recordAction(page, LK, () => f.locator('[data-choice-index="0"]').click(), 1000)
    const rides = await seen
    const parts = revealParts(r.motions)
    const { dest, riders } = await landing(page, r.cap)
    report[`lk-${key}-${action}-${both}-${width}`] = { rides, parts, riders }
    const problems: string[] = [...overlapProblems(r.cap, r.at)]
    const want = expectRides.map(([a, b]) => `${a}>${b}`)
    if (JSON.stringify(rides) !== JSON.stringify(want)) problems.push(`rides ${rides.join(', ')}; expected ${want.join(', ')}`)
    const moving = parts.filter((p) => p.kind === 'rider')
    if (moving.length !== want.length) problems.push(`${moving.length} riders moved, expected ${want.length}`)
    // The tracked checkbox leaves first.
    if (moving.length === 2 && !(moving[0].start < moving[1].start || /before-0/.test(moving[0].label)))
      problems.push('the tracked checkbox does not leave first')
    // Each lands exactly on its destination checkbox.
    for (const [i, rd] of riders.entries()) {
      const to = expectRides[i]?.[1]
      const d = to ? dest[to] : undefined
      if (!d) continue
      const c = { x: rd.x + rd.w / 2, y: rd.y + rd.h / 2 }
      if (Math.hypot(c.x - d.x, c.y - d.y) > 1.5)
        problems.push(`rider ${i} rests at (${c.x.toFixed(1)}, ${c.y.toFixed(1)}), its checkbox is at (${d.x.toFixed(1)}, ${d.y.toFixed(1)})`)
    }
    // H3 R6: the tick rides at full strength and never redraws on landing
    // (no fade and redraw, R1M-05); the landing is the rider's own settle.
    const ticks = parts.filter((p) => p.kind === 'tick')
    if (ticks.length) problems.push(`${ticks.length} ticks redrew on landing`)
    // H3 R5: the verdict fades in only after the last rider has landed.
    const verdict = parts.filter((p) => p.kind === 'verdict')
    const lastLanding = Math.max(...moving.map((m) => m.end))
    if (verdict.length !== 1) problems.push(`${verdict.length} verdict fades, expected 1`)
    for (const v of verdict)
      if (v.start < lastLanding - 34) problems.push(`the verdict starts at ${v.start} ms, before the landing at ${lastLanding} ms`)
    const end = Math.max(...parts.map((p) => p.end))
    if (end > REVEAL_TOKEN.maxMs) problems.push(`the reveal ends at ${end} ms`)
    await expect(f.locator('[data-viz-reveal="rider"]')).toHaveCount(0)
    for (const [, to] of expectRides) await expect(f.locator(`[data-row="${to}"]`)).toHaveAttribute('data-checked', 'true')
    strictCheck(`list-keys ${key} ${action}: ride`, problems)
  })

test('list-keys reveal under reduced motion: no ride, the state is simply there', async ({ page }) => {
  await openGallery(page, { reduced: true })
  await hydrateListKeys(page)
  await toAsk(page, 'Id', 'Insert at top')
  const f = page.locator(LK)
  const r = await recordAction(page, LK, () => f.locator('[data-choice-index="0"]').click(), 600)
  const parts = revealParts(r.motions)
  report['lk-reduced'] = parts
  strictCheck(
    'reduced: no ride, no tween',
    [
      ...parts.map((p) => `${p.label} tweens`),
      ...(Object.keys(r.cap.labels).some((id) => /viz-reveal=rider/.test(r.cap.labels[id])) ? ['a rider appeared'] : []),
    ],
  )
  await expect(f.locator('[data-row="after-1"]')).toHaveAttribute('data-checked', 'true')
})

test('list-keys ride snaps when interrupted (leaving the reveal, a resize)', async ({ page }) => {
  await openGallery(page)
  await hydrateListKeys(page)
  const f = page.locator(LK)
  const problems: string[] = []
  // Leave the reveal 150 ms into the ride: the rider is gone at once.
  await toAsk(page, 'Id', 'Insert at top')
  await f.locator('[data-choice-index="0"]').click()
  await page.waitForTimeout(150)
  await f.locator('[data-viz-part="viz-again"]').click()
  await page.waitForTimeout(20)
  if (await f.locator('[data-viz-reveal="rider"]').count()) problems.push('a rider outlived the reveal')
  // Resize 150 ms into the ride: every rider lands at once.
  await toAsk(page, 'Id', 'Insert at top')
  await startRec(page, LK)
  await page.waitForTimeout(50)
  await f.locator('[data-choice-index="0"]').click()
  await page.waitForTimeout(150)
  const at = await mark(page)
  await page.setViewportSize({ width: 700, height: 900 })
  await page.waitForTimeout(500)
  const cap = await stopRec(page)
  const late = revealParts(motionsAfter(cap, at + 100)).filter((p) => p.kind === 'rider')
  if (late.length) problems.push(`riders still moving after the resize: ${late.map((p) => p.label).join('; ')}`)
  if (await f.locator('[data-viz-reveal="rider"]').count()) problems.push('a rider survived the resize')
  await expect(f.locator('[data-row="after-1"] [data-check] path')).toHaveCount(1)
  // The verdict lands with it, without a fade (R1M-17).
  await expect(f).toHaveAttribute('data-viz-landed', 'true')
  report['lk-interrupt'] = problems
  strictCheck('list-keys ride interruptions', problems)
})
