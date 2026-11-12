import { expect, test } from '@playwright/test'
import { BASE, Recorder, activeConfigs, domClick, goto, markScope, openContext } from './harness'

/**
 * Legacy visuals: the v1 components still on the gallery (ArrayVisualizer,
 * SequenceStepper, StructureVisualizer) stepped to the end, and the Mermaid
 * promise-lifecycle SVG inside an <img> as a lesson renders it (text size
 * after scaling, against the 12 px floor of spec §3.1).
 */

const strict = process.env.STRESS_STRICT === '1'
const V1 = ['ArrayVisualizer', 'SequenceStepper', 'StructureVisualizer']

for (const c of activeConfigs()) {
  test(`legacy @ ${c.name}`, async ({ browser }) => {
    const { ctx, page } = await openContext(browser, c)
    const rec = new Recorder(c, 'legacy')
    try {
      await goto(page, c, `${BASE}/dev/visualizations`)
      for (const [i, name] of V1.entries()) {
        const scope = await page.evaluate(
          ([name, i]) => {
            const h = [...document.querySelectorAll('h2')].find((x) => x.textContent?.trim() === name)
            const sec = h?.closest('section')
            if (!sec) return null
            sec.setAttribute('data-stress-scope', `v1-${i}`)
            return `[data-stress-scope="v1-${i}"]`
          },
          [name, i] as const,
        )
        if (!scope) continue
        await page.locator(scope).scrollIntoViewIfNeeded()
        for (let k = 0; k < 40; k++) {
          await rec.check(page, scope, `v1 ${name}`, `step ${k}`, { skip: ['region-overflow'] })
          const next = `${scope} button[aria-label="Next step"]`
          const disabled = await page.evaluate((s) => (document.querySelector(s) as HTMLButtonElement | null)?.disabled ?? true, next)
          if (disabled) break
          const r = await domClick(page, next)
          if (r) rec.scrollJump(`v1 ${name}`, `step ${k}`, r.before, r.after)
        }
      }

      // Mermaid inside an <img>, as in a lesson.
      await goto(page, c, `${BASE}/dev/visualizations/stress?f=mermaid`)
      const scope = await markScope(page, '[data-stress-fixture="mermaid"]', 0, 'mermaid')
      await page.waitForFunction(() => {
        const img = document.querySelector('[data-stress-fixture="mermaid"] img') as HTMLImageElement | null
        return img?.complete && img.naturalWidth > 0
      })
      const m = await page.evaluate(() => {
        const img = document.querySelector('[data-stress-fixture="mermaid"] img') as HTMLImageElement
        const r = img.getBoundingClientRect()
        const de = document.documentElement
        return { w: r.width, h: r.height, natural: img.naturalWidth, x: r.x, right: r.right, vw: de.clientWidth, sw: de.scrollWidth }
      })
      const viewBoxW = 722.7
      const scale = m.w / viewBoxW
      const fontPx = 15 * scale
      if (fontPx < 12)
        rec.note('mermaid promise-lifecycle', 'img', 'text-floor', `labels render at ${fontPx.toFixed(1)}px (15px x ${scale.toFixed(3)} scale; img ${m.w.toFixed(0)}px wide for a ${viewBoxW}px viewBox) < 12px floor`, { fontPx, scale, imgW: m.w })
      if (m.right > m.vw + 1 || m.sw > m.vw + 1)
        rec.note('mermaid promise-lifecycle', 'img', 'page-overflow', `img right ${m.right} / scrollWidth ${m.sw} > viewport ${m.vw}`)
      await rec.check(page, scope!, 'mermaid promise-lifecycle', 'img', { skip: ['region-overflow'] })
    } finally {
      rec.write()
      await ctx.close()
    }
    if (strict) expect(rec.rows).toEqual([])
  })
}

test('mermaid labels fit their foreignObject boxes (standalone, natural size)', async ({ browser }) => {
  const c = { name: 'mermaid-standalone', width: 1024, height: 600 }
  const { ctx, page } = await openContext(browser, c)
  const rec = new Recorder(c, 'mermaid-standalone')
  await page.goto(`${BASE}/images/visualizations/promise-lifecycle.svg`)
  const res = await page.evaluate(() => {
    const out: { text: string; w: number; sw: number; h: number; sh: number }[] = []
    for (const fo of document.querySelectorAll('foreignObject')) {
      const inner = fo.firstElementChild as HTMLElement | null
      if (!inner) continue
      const fr = fo.getBoundingClientRect()
      const ir = inner.getBoundingClientRect()
      out.push({ text: (fo.textContent ?? '').trim(), w: fr.width, sw: ir.width, h: fr.height, sh: ir.height })
    }
    const texts = [...document.querySelectorAll('text')].map((t) => (t.textContent ?? '').trim()).filter(Boolean)
    return { out, texts }
  })
  for (const r of res.out)
    if (r.sw > r.w + 1 || r.sh > r.h + 1)
      rec.note('mermaid standalone', 'natural', 'text-clip', `"${r.text}" content ${r.sw.toFixed(1)}x${r.sh.toFixed(1)} > foreignObject ${r.w.toFixed(1)}x${r.h.toFixed(1)}`)
  rec.note('mermaid standalone', 'natural', 'info', `foreignObject labels: ${res.out.length}; svg <text> labels: ${res.texts.length}`, { labels: res.out.map((r) => r.text) })
  rec.write()
  await ctx.close()
})
