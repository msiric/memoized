import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { setTimeout as pause } from 'node:timers/promises'
import puppeteer from 'puppeteer'

type Config = {
  baseUrl: string
  outputDirectory: string
  widths: number[]
  routes: string[]
  roles: { name: string; token?: string }[]
  screenshotRoutes?: string[]
  executablePath?: string
  allowPublic?: boolean
}

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function assertConfig(value: unknown): asserts value is Config {
  assert(object(value), 'Expected a layout-check configuration')
  assert(typeof value.baseUrl === 'string' && typeof value.outputDirectory === 'string')
  assert(Array.isArray(value.widths) && value.widths.length > 0 &&
    value.widths.every(width => Number.isInteger(width) && width >= 320 && width <= 3840))
  assert(Array.isArray(value.routes) && value.routes.length > 0 &&
    value.routes.every(route => typeof route === 'string' && /^\/(?:courses|resources)(?:\/|$)/.test(route) && !route.startsWith('//')))
  assert(Array.isArray(value.roles) && value.roles.length > 0 && value.roles.every(role =>
    object(role) && typeof role.name === 'string' && /^[a-z-]+$/.test(role.name) &&
    (role.token === undefined || typeof role.token === 'string')))
  assert(value.screenshotRoutes === undefined || (Array.isArray(value.screenshotRoutes) &&
    value.screenshotRoutes.every(route => typeof route === 'string')))
  assert(value.executablePath === undefined || typeof value.executablePath === 'string')
  assert(value.allowPublic === undefined || typeof value.allowPublic === 'boolean')
}

async function main() {
  assert(process.argv.length === 3, 'Usage: node --import tsx src/scripts/check-reader-layout.ts <config.json>')
  const config: unknown = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
  assertConfig(config)
  const base = new URL(config.baseUrl)
  assert(!base.username && !base.password && base.pathname === '/' && !base.search && !base.hash)
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname) || base.hostname.endsWith('.localhost')
  assert(local ? base.protocol === 'http:' : config.allowPublic === true &&
    base.protocol === 'https:' && ['memoized.io', 'www.memoized.io'].includes(base.hostname))
  assert(local || config.roles.every(role => !role.token), 'Synthetic credentials must never be sent to production')
  fs.mkdirSync(config.outputDirectory, { recursive: true })
  const report = {
    startedAt: new Date().toISOString(), baseUrl: base.origin, complete: false,
    cases: [] as { route: string; role: string; width: number; metrics?: unknown; error?: string }[],
  }
  const reportPath = path.join(config.outputDirectory, 'reader-layout.json')
  const save = () => fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 })
  const browser = await puppeteer.launch({
    headless: true,
    ...(config.executablePath ? { executablePath: config.executablePath } : {}),
    ...(process.env.CI ? { args: ['--no-sandbox'] } : {}),
  })
  try {
    for (const role of config.roles) {
      const context = await browser.createBrowserContext()
      try {
        if (role.token) await context.setCookie({
          name: 'next-auth.session-token', value: role.token, domain: base.hostname,
          path: '/', httpOnly: true, sameSite: 'Lax',
        })
        for (const width of config.widths) {
          for (const route of config.routes) {
            const page = await context.newPage()
            const errors: string[] = []
            page.on('pageerror', error => errors.push(String(error)))
            await page.setViewport({ width, height: 1000 })
            await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
            await page.setRequestInterception(true)
            page.on('request', request => {
              const url = new URL(request.url())
              if (['GET', 'HEAD'].includes(request.method()) &&
                  (url.origin === base.origin || ['data:', 'blob:'].includes(url.protocol))) {
                void request.continue()
              } else void request.abort()
            })
            try {
              let loaded = false
              for (let attempt = 0; attempt < 4; attempt++) {
                const response = await page.goto(new URL(route, base).href, { waitUntil: 'networkidle0' })
                assert(response, 'Expected a document navigation')
                if (response.status() !== 429) {
                  assert.equal(response.status(), 200, 'Reader response')
                  loaded = true
                  break
                }
                const retry = response.headers()['retry-after']
                assert(/^\d+$/.test(retry ?? '') && Number(retry) <= 120, 'Unsupported rate-limit response')
                await pause((Number(retry) + 1) * 1000)
              }
              assert(loaded, 'Repeated rate limiting after honoring Retry-After')
              await page.waitForSelector('main h1')
              const metrics = await page.evaluate(() => {
                const main = document.querySelector('main')!
                const article = main.querySelector('article')!
                const title = main.querySelector('h1')!
                const footer = main.parentElement!.querySelector(':scope > footer')!
                const prose = article?.querySelector(':scope > .prose')
                const practice = article?.querySelector('#practice-problems')
                const directory = [...main.querySelectorAll(':scope > section[aria-label]')].at(-1)
                const [mainBox, articleBox, titleBox, footerBox, breadcrumbBox, lastBodyBox,
                  practiceBox, lastCardBox, statusBox, directoryBox] = [
                  main, article, title, footer, main.querySelector('[aria-label="Breadcrumb"]'),
                  prose?.lastElementChild, practice, practice?.nextElementSibling?.lastElementChild,
                  article?.querySelector(':scope > footer'), directory,
                ].map(element => {
                  if (!element) return null
                  const rect = element.getBoundingClientRect()
                  return { x: rect.x, top: rect.top + scrollY, bottom: rect.bottom + scrollY, width: rect.width }
                })
                return {
                  overflow: document.documentElement.scrollWidth - innerWidth,
                  main: mainBox, article: articleBox, title: titleBox, footer: footerBox,
                  breadcrumb: breadcrumbBox, lastBody: lastBodyBox, practice: practiceBox,
                  lastCard: lastCardBox, status: statusBox, directory: directoryBox,
                }
              })
              assert(metrics.overflow <= 1, `Document overflow: ${metrics.overflow}px`)
              assert(metrics.main && metrics.title && metrics.footer, 'Missing reader or footer')
              assert(metrics.footer.top >= metrics.main.bottom - 1, 'Footer overlaps main content')
              if (metrics.article) assert(metrics.main.bottom >= metrics.article.bottom - 1, 'Article overflows main')
              assert(Math.abs(metrics.footer.x - metrics.title.x) <= 1, 'Footer and title columns differ')
              if (metrics.breadcrumb) {
                assert(Math.abs(metrics.breadcrumb.x - metrics.title.x) <= 1, 'Breadcrumb and title columns differ')
                const gap = metrics.title.top - metrics.breadcrumb.bottom
                assert(gap >= 16 && gap <= 72, `Breadcrumb/title gap: ${gap}px`)
              }
              if (metrics.practice && metrics.lastBody) {
                const gap = metrics.practice.top - metrics.lastBody.bottom
                assert(gap >= 24 && gap <= 48, `Body/practice gap: ${gap}px`)
              }
              if (metrics.status && metrics.lastCard) {
                const gap = metrics.status.top - metrics.lastCard.bottom
                assert(gap >= 24 && gap <= 48, `Practice/status gap: ${gap}px`)
                assert(Math.abs(metrics.status.x - metrics.title.x) <= 1, 'Status and title columns differ')
              }
              if (metrics.directory) {
                assert(Math.abs(metrics.directory.x - metrics.title.x) <= 1, 'Related directory and title columns differ')
                assert(metrics.directory.bottom <= metrics.footer.top + 1, 'Related directory overlaps footer')
              }
              assert.equal(errors.length, 0, `Browser errors: ${errors.join('; ')}`)
              if (config.screenshotRoutes?.includes(route)) {
                const name = `${role.name}-${width}-${route.replaceAll('/', '_')}`
                await page.screenshot({ path: path.join(config.outputDirectory, `${name}-top.png`) })
                await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight))
                await page.screenshot({ path: path.join(config.outputDirectory, `${name}-end.png`) })
              }
              report.cases.push({ route, role: role.name, width, metrics })
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error)
              report.cases.push({ route, role: role.name, width, error: message })
              await page.screenshot({
                path: path.join(config.outputDirectory, `failure-${report.cases.length}.png`),
              })
            } finally {
              await page.close()
              save()
            }
            if (report.cases.length % 25 === 0) console.log(`Reader layouts: ${report.cases.length} cases`)
          }
        }
      } finally { await context.close() }
    }
    report.complete = !report.cases.some(result => result.error)
    if (!report.complete) process.exitCode = 1
  } finally {
    await browser.close()
    save()
    console.log(JSON.stringify({
      report: reportPath, complete: report.complete, cases: report.cases.length,
      failures: report.cases.filter(result => result.error).map(({ route, role, width, error }) => ({ route, role, width, error })),
    }))
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
