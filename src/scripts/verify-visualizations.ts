/**
 * Verifies every visualization on a page against the responsive contract, in a real
 * browser, at every width we support. This is the calibration bar from the Lane B plan
 * made executable, so it is checked the same way every time instead of by eye.
 *
 * For each width and each `[data-testid="viz-frame"]` on the page it asserts:
 *   - no clipped overflow — anything wider than its box must be scrollable, not cut off;
 *   - a legible step counter — it stays on one line and never breaks character by character;
 *   - a stable stage — the frame's height must not change while stepping through, so the
 *     page never jumps under the reader (checked over a full play-through and a fast-click
 *     burst, which is how the jump regressions were originally found);
 *   - no page errors.
 *
 * Usage (the dev server must already be running):
 *   yarn verify:viz <path> [--widths=320,375,768] [--screenshots=<dir>] [--base=http://localhost:3005]
 *
 * Example:
 *   yarn verify:viz /courses/js-track/core-fundamentals/event-loop --screenshots=/tmp/viz
 *
 * Rendering uses Puppeteer's Chromium; set PUPPETEER_EXECUTABLE_PATH to use another browser.
 */
import fs from 'fs'
import path from 'path'
import puppeteer, { type Browser, type Page } from 'puppeteer'

/** 320 is the minimum supported width; the rest are the common phone/tablet/desktop breakpoints. */
const DEFAULT_WIDTHS = [320, 360, 375, 414, 768, 1024]
const DEFAULT_BASE = 'http://localhost:3005'
/** A counter taller than this has wrapped or broken apart instead of staying on one line. */
const MAX_COUNTER_HEIGHT = 32

type FrameReport = {
  index: number
  label: string
  clipped: string[]
  counterHeight: number | null
  counterText: string | null
  heights: number[]
  burstHeights: number[]
}

function parseArgs(argv: string[]) {
  const positional = argv.filter((a) => !a.startsWith('--'))
  const flag = (name: string) => argv.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=')
  const widths = flag('widths')
  return {
    urlPath: positional[0],
    base: flag('base') ?? DEFAULT_BASE,
    screenshots: flag('screenshots'),
    widths: widths ? widths.split(',').map((w) => Number(w.trim())) : DEFAULT_WIDTHS,
  }
}

/**
 * Measures every frame on the page at the current viewport. Runs in the browser, so the
 * numbers are real layout, not a simulation. Stepping is driven here (rather than through
 * the driver) to keep one round trip per frame and to make the fast-click burst genuinely
 * fast — that burst is what surfaces animation-driven height jumps.
 */
async function measure(page: Page): Promise<FrameReport[]> {
  return page.evaluate(async () => {
    // NOTE: everything inside this browser-side function must avoid NAMED function
    // bindings (`const sleep = () => ...`). tsx/esbuild rewrites those with a `__name`
    // helper that does not exist in the page, so they fail at runtime with
    // "__name is not defined". Inline anonymous arrows are fine, hence the repeated
    // `new Promise((r) => setTimeout(r, ms))` below instead of a sleep helper.
    const frames = [...document.querySelectorAll('[data-testid="viz-frame"]')]
    const reports = []

    for (const [index, frame] of frames.entries()) {
      const box = frame.getBoundingClientRect()

      // Anything whose content is wider than its box must be reachable by scrolling.
      // The element itself may scroll, or any ancestor inside the frame may scroll on its
      // behalf — a long code line inside a scrollable <pre> is fine, because the reader can
      // still get to it. Only content that no one can scroll to is actually clipped.
      const clipped: string[] = []
      for (const el of [frame, ...frame.querySelectorAll('*')]) {
        // Skip elements INSIDE an <svg>. They are laid out in viewBox coordinates, so their
        // scrollWidth/clientWidth do not describe CSS overflow (a <text> node routinely
        // reports more scrollWidth than clientWidth while being perfectly visible). The
        // outermost <svg> still gets checked, and that is the box that can actually clip.
        if (el instanceof SVGElement && el.ownerSVGElement) continue
        if (el.scrollWidth <= el.clientWidth + 1) continue
        let scrollable = false
        for (let node: Element | null = el; node && node !== frame.parentElement; node = node.parentElement) {
          const overflowX = getComputedStyle(node).overflowX
          if (overflowX === 'auto' || overflowX === 'scroll') {
            scrollable = true
            break
          }
        }
        if (scrollable) continue
        const testid = el.getAttribute('data-testid')
        clipped.push(testid ?? el.tagName.toLowerCase())
      }

      const counter = frame.querySelector('[data-testid="step-counter"]')
      const step = frame.querySelector<HTMLButtonElement>('[aria-label="Next step"]')
      const reset = frame.querySelector<HTMLButtonElement>('[aria-label="Reset"], button')

      // Step through the whole thing, recording the frame height after each step. A stable
      // stage keeps this constant; any variance is a visible jump under the reader.
      const heights = [Math.round(box.height)]
      const total = Number(counter?.textContent?.split('/')[1]?.trim() ?? 0)
      if (step) {
        for (let i = 0; i < total; i++) {
          step.click()
          await new Promise((r) => setTimeout(r, 60))
          heights.push(Math.round(frame.getBoundingClientRect().height))
        }
      }

      // Then hammer it: clicking faster than the animations settle is how the original
      // append/pop height jumps were reproduced.
      const burstHeights: number[] = []
      if (step && reset) {
        reset.click()
        await new Promise((r) => setTimeout(r, 60))
        for (let i = 0; i < total; i++) {
          step.click()
          burstHeights.push(Math.round(frame.getBoundingClientRect().height))
        }
        await new Promise((r) => setTimeout(r, 120))
        burstHeights.push(Math.round(frame.getBoundingClientRect().height))
      }

      reports.push({
        index,
        label: frame.querySelector('p')?.textContent?.trim().slice(0, 60) ?? `frame ${index}`,
        clipped: [...new Set(clipped)],
        counterHeight: counter ? Math.round(counter.getBoundingClientRect().height) : null,
        counterText: counter?.textContent?.trim() ?? null,
        heights,
        burstHeights,
      })
    }
    return reports
  })
}

function variance(values: number[]): number {
  return values.length ? Math.max(...values) - Math.min(...values) : 0
}

async function run(): Promise<number> {
  const { urlPath, base, widths, screenshots } = parseArgs(process.argv.slice(2))
  if (!urlPath) {
    console.error('❌ Usage: yarn verify:viz <path> [--widths=320,375] [--screenshots=<dir>] [--base=<url>]')
    return 1
  }
  const url = new URL(urlPath, base).toString()
  if (screenshots) fs.mkdirSync(screenshots, { recursive: true })

  let browser: Browser | undefined
  let failures = 0
  try {
    browser = await puppeteer.launch({ args: ['--no-sandbox'] })
    for (const width of widths) {
      const page = await browser.newPage()
      const pageErrors: string[] = []
      page.on('pageerror', (error: unknown) =>
        pageErrors.push(error instanceof Error ? error.message : String(error)),
      )
      await page.setViewport({ width, height: 1000, deviceScaleFactor: 2 })
      await page.goto(url, { waitUntil: 'networkidle0' })

      const reports = await measure(page)
      if (reports.length === 0) {
        console.error(`❌ ${width}px — no visualizations found on ${url}`)
        failures++
      }

      for (const report of reports) {
        const problems: string[] = []
        if (report.clipped.length) problems.push(`clipped without scroll: ${report.clipped.join(', ')}`)
        if (report.counterHeight !== null && report.counterHeight > MAX_COUNTER_HEIGHT) {
          problems.push(`step counter is ${report.counterHeight}px tall (broken onto multiple lines)`)
        }
        if (variance(report.heights) > 0) problems.push(`height jumps ${variance(report.heights)}px while stepping`)
        if (variance(report.burstHeights) > 0) {
          problems.push(`height jumps ${variance(report.burstHeights)}px under fast clicking`)
        }

        const where = `${width}px · ${report.label}`
        if (problems.length) {
          failures++
          console.error(`❌ ${where}\n     - ${problems.join('\n     - ')}`)
        } else {
          console.log(`✅ ${where} — no clipping, counter ${report.counterText}, height stable`)
        }
      }

      if (pageErrors.length) {
        failures++
        console.error(`❌ ${width}px — page errors: ${pageErrors.join(' | ')}`)
      }

      if (screenshots) {
        const file = path.join(screenshots, `${urlPath.replace(/\W+/g, '-').replace(/^-|-$/g, '')}-${width}.png`)
        await page.screenshot({ path: file as `${string}.png`, fullPage: true })
        console.log(`   📸 ${file}`)
      }
      await page.close()
    }
  } finally {
    await browser?.close()
  }

  console.log(failures === 0 ? '\n🎉 All visualizations pass at every width.' : `\n❌ ${failures} check(s) failed.`)
  return failures === 0 ? 0 : 1
}

run()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error('❌ Verification failed to run:', error)
    process.exit(1)
  })
