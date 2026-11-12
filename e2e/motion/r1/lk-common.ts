import { type Page } from '@playwright/test'
import { LK } from './common'

export const LK_PROBE = `(root) => {
  const fr = root.getBoundingClientRect()
  const box = (el) => { const r = el.getBoundingClientRect(); return { l: r.left - fr.left, t: r.top - fr.top, r: r.right - fr.left, b: r.bottom - fr.top } }
  const inter = (a, b) => Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t))
  const texts = []
  for (const row of root.querySelectorAll('[data-row]')) {
    const sp = row.querySelectorAll('span.truncate')
    sp.forEach((s, i) => { const r = s.getBoundingClientRect(); if (r.width) { const range = document.createRange(); range.selectNodeContents(s); const rr = range.getBoundingClientRect(); texts.push({ row: row.getAttribute('data-row'), which: i ? 'key' : 'label', ...box({ getBoundingClientRect: () => rr }) }) } })
  }
  const riders = [...root.querySelectorAll('[data-viz-reveal="rider"]')].map((n) => {
    const b = box(n)
    const cs = getComputedStyle(n)
    const tick = n.querySelector('svg')
    const hits = texts.filter((t) => inter(b, t) > 1).map((t) => t.row + ':' + t.which + ':' + Math.round(inter(b, t)))
    return { from: n.getAttribute('data-from'), to: n.getAttribute('data-to'), cx: +((b.l + b.r) / 2).toFixed(1), cy: +((b.t + b.b) / 2).toFixed(1), op: cs.opacity, tick: tick ? getComputedStyle(tick).opacity : null, shadow: cs.boxShadow === 'none' ? 0 : 1, hits }
  })
  const src = [...root.querySelectorAll('[data-row^="before-"]')].map((row) => {
    const i = row.querySelector('input[type=checkbox]')
    const svg = row.querySelector('input + svg')
    const b = box(i)
    return { row: row.getAttribute('data-row'), checked: i.checked, tickShown: svg ? getComputedStyle(svg).display !== 'none' : false, cx: +((b.l + b.r) / 2).toFixed(1), cy: +((b.t + b.b) / 2).toFixed(1) }
  })
  const dest = [...root.querySelectorAll('[data-row^="after-"]')].map((row) => {
    const c = row.querySelector('[data-check]')
    const p = c && c.querySelector('path')
    const b = c ? box(c) : null
    const badge = row.querySelector('.ml-auto.flex')
    return { row: row.getAttribute('data-row'), check: c ? (getComputedStyle(c).backgroundColor) : 'none', tick: p ? (p.getAttribute('stroke-dasharray') || 'full') : null, cx: b ? +((b.l + b.r) / 2).toFixed(1) : null, cy: b ? +((b.t + b.b) / 2).toFixed(1) : null, focus: row.getAttribute('data-focus'), border: getComputedStyle(row).borderColor, badge: badge ? getComputedStyle(badge).opacity : null }
  })
  const lines = [...root.querySelectorAll('[data-link="reused"] path')].map((p) => p.getAttribute('stroke-dasharray') || 'full')
  const stubs = root.querySelectorAll('[data-link="unmounted"],[data-link="mounted"]').length
  const verdict = [...root.querySelectorAll('[data-viz-part="dock-reveal"] p, [data-viz-part="dock-reveal"] [data-viz-part]')].map((n) => getComputedStyle(n).opacity + ':' + (n.textContent || '').slice(0, 30)).slice(0, 3)
  return { mode: root.getAttribute('data-viz-mode'), riders, src, dest, lines, stubs, verdict }
}`

export async function toAsk(page: Page, key: string, action: string, both: boolean) {
  const f = page.locator(LK)
  if ((await f.getAttribute('data-viz-mode')) === 'ask') await f.locator('[data-viz-part="viz-back"]').click()
  if ((await f.getAttribute('data-viz-mode')) === 'reveal') await f.locator('[data-viz-part="viz-again"]').click()
  await page.waitForTimeout(300)
  const second = f.locator('input[type="checkbox"]').nth(1)
  if (both !== (await second.isChecked())) await second.click()
  const first = f.locator('input[type="checkbox"]').nth(0)
  if (!(await first.isChecked())) await first.click()
  await f.getByRole('radiogroup', { name: 'Key strategy' }).getByRole('radio', { name: key }).click()
  await page.waitForTimeout(300)
  await f.getByRole('button', { name: action, exact: true }).click()
  await page.waitForTimeout(400)
}

