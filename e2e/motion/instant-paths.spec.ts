import { test } from '@playwright/test'
import { tracks } from './analyze'
import { EL, LK, animated, animsOf, hydrateListKeys, openGallery, recordAction, save, strictCheck } from './helpers'

/**
 * Spec §4 rule 3: scrubbing, Home/End (Restart, End), preset changes and
 * bursts must render instantly. Records each instant path from a settled
 * step and lists anything that still tweened, with its Web Animation timing.
 *
 * Asserts D7 (unless MOTION_STRICT=0): after each instant command nothing
 * on the frame tweens opacity or translate (glyphs entering, leaving or
 * moving, caption, code line, scrubber thumb), and no transform or opacity
 * Web Animation with a duration runs. Mount and hydration never animate.
 *
 * A drag is a run of instant seeks, so values legitimately step through many
 * states. Its exemption is scoped (G8): only the pointer-driven thumb and its
 * tooltip may translate, and every opacity stays at a rest value (0, 1, or
 * the unavailable 0.5): a fractional opacity is a fade, a translate anywhere
 * else is a tween.
 */

/** G8: in a drag, any opacity off its rest values, or a translate outside the thumb. */
function dragTweens(cap: Parameters<typeof tracks>[0], at: number): string[] {
  const out: string[] = []
  for (const t of tracks(cap, at).values()) {
    const thumb = /scrubber-(thumb|tip)/.test(t.label)
    const ops = (t.series.op ?? []).map((s) => Number(s.v)).filter((v) => ![0, 0.5, 1].includes(v))
    if (ops.length) out.push(`${t.label.slice(0, 60)}: opacity passes ${[...new Set(ops)].slice(0, 4).join(', ')}`)
    if (!thumb)
      for (const p of ['tx', 'ty'] as const)
        if (new Set((t.series[p] ?? []).map((s) => s.v)).size > 1) out.push(`${t.label.slice(0, 60)}: ${p} moves`)
  }
  return out
}

test('instant paths render without tweens', async ({ page }) => {
  test.setTimeout(200_000)
  await openGallery(page, { query: '?preset=basic-ordering' })
  const f = page.locator(EL)
  await f.scrollIntoViewIfNeeded()
  const slider = page.getByRole('slider').first()
  const out: Record<string, unknown> = {}
  const to = async (n: number) => {
    await slider.focus()
    await page.keyboard.press('Home')
    await page.waitForTimeout(350)
    for (let i = 0; i < n; i++) {
      const mode = await f.getAttribute('data-viz-mode')
      await page.keyboard.press(mode === 'ask' ? '1' : 'ArrowRight')
      await page.waitForTimeout(400)
    }
    await page.waitForTimeout(300)
  }
  const run = async (name: string, act: () => Promise<unknown>) => {
    const r = await recordAction(page, EL, act, 500)
    const tweened = animated(r.motions).map(
      (e) => `${e.label.slice(0, 60)} | ${e.props.map((p) => `${p.prop} ${p.start}->${p.end} ${p.duration}ms`).join('; ')}`,
    )
    const anims = animsOf(r.cap).filter((a) => a.duration !== 0)
    out[name] = { step: await f.getAttribute('data-viz-step'), tweened, anims }
    // A drag is a run of instant seeks: its frames step, they do not tween (G8: scoped).
    if (name.startsWith('drag')) strictCheck(`${name}: only the thumb follows the pointer (D7, G8)`, dragTweens(r.cap, r.at))
    else strictCheck(`${name}: nothing tweens (D7)`, tweened)
    strictCheck(
      `${name}: no transform or opacity animation runs (D7)`,
      anims
        .filter((a) => a.name === 'viz-move' || /transform|opacity|translate/.test(String(a.name)) || 'opacity' in a.to || 'transform' in a.to)
        .map((a) => `${a.label} ${a.name} ${a.duration}`),
    )
  }
  await to(3)
  await run('scrub-3-to-0', async () => {
    const b = (await slider.boundingBox())!
    await page.mouse.click(b.x + 14, b.y + b.height / 2)
  })
  await to(3)
  await run('home-from-3', () => page.keyboard.press('Home'))
  await to(3)
  await run('restart-button-from-3', () => f.getByRole('button', { name: 'Restart' }).click())
  await to(3)
  await run('end-from-3', () => page.keyboard.press('End'))
  await to(7)
  await run('preset-switch-from-7', () => f.getByRole('radio', { name: 'Drain' }).click())
  await f.getByRole('radio', { name: 'Basics' }).click()
  await page.waitForTimeout(300)
  await to(4)
  await run('scrub-4-to-8', async () => {
    const b = (await slider.boundingBox())!
    await page.mouse.click(b.x + b.width - 14, b.y + b.height / 2)
  })
  // Instant drag across all steps.
  await to(0)
  await run('drag-0-to-8', async () => {
    const b = (await slider.boundingBox())!
    await page.mouse.move(b.x + 14, b.y + b.height / 2)
    await page.mouse.down()
    for (let i = 1; i <= 16; i++) {
      await page.mouse.move(b.x + 14 + ((b.width - 28) * i) / 16, b.y + b.height / 2)
      await page.waitForTimeout(16)
    }
    await page.mouse.up()
  })
  // Mount: the swap from server HTML to the live engine must not animate.
  save('instant-paths.json', out)
})

test('mount and hydration swap do not animate', async ({ page }) => {
  test.setTimeout(120_000)
  const { RECORDER } = await import('./recorder')
  await page.addInitScript(RECORDER)
  // Start recording as soon as the server markup exists, before the engine chunk swaps in.
  await page.addInitScript(() => {
    const go = () => {
      const el = document.querySelector('[data-viz="event-loop"]')
      if (el && (window as any).__vizRec) (window as any).__vizRec.start('[data-viz="event-loop"]')
      else requestAnimationFrame(go)
    }
    document.addEventListener('DOMContentLoaded', go)
  })
  await page.setViewportSize({ width: 1024, height: 900 })
  await page.goto('/dev/visualizations')
  await page.locator(`${EL}[data-viz-interactive="true"]`).waitFor()
  await page.waitForTimeout(600)
  const cap = await page.evaluate(() => (window as any).__vizRec.stop())
  const { motionsAfter } = await import('./analyze')
  const ms = animated(motionsAfter(cap, 0))
  strictCheck('mount: nothing tweens', ms.map((e) => e.label))
  save('mount.json', {
    tweened: ms.map((e) => `${e.label.slice(0, 60)} | ${e.props.map((p) => `${p.prop} ${p.start}->${p.end} ${p.duration}ms`).join('; ')}`),
    anims: cap.anims.filter((a: any) => a.duration !== 0).map((a: any) => `${a.kind} ${a.name} ${a.duration} ${a.label.slice(0, 60)}`),
  })
  // List keys: hydrate by scrolling, record the swap.
  await page.evaluate(() => {
    const el = document.querySelector('[data-viz="list-keys"]')!
    ;(window as any).__vizRec.start('[data-viz="list-keys"]')
    el.scrollIntoView()
  })
  await hydrateListKeys(page)
  await page.waitForTimeout(600)
  const cap2 = await page.evaluate(() => (window as any).__vizRec.stop())
  const ms2 = animated(motionsAfter(cap2, 0))
  save('mount-list-keys.json', {
    tweened: ms2.map((e) => `${e.label.slice(0, 60)} | ${e.props.map((p) => `${p.prop} ${p.start}->${p.end} ${p.duration}ms`).join('; ')}`),
    anims: cap2.anims.filter((a: any) => a.duration !== 0).map((a: any) => `${a.kind} ${a.name} ${a.duration} ${a.label.slice(0, 60)}`),
  })
  void LK
})
