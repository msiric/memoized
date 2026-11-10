import { beforeEach, describe, expect, it, vi } from 'vitest'

const commands = () =>
  (window.dataLayer ?? []).map((entry) => Array.from(entry as IArguments))

async function load() {
  vi.resetModules()
  return import('./google-ads')
}

beforeEach(() => {
  delete window.dataLayer
})

describe('Google Ads command queue', () => {
  it('queues a conversion reported before analytics mounts, after js/config', async () => {
    // Checkout return: PremiumModal's effect runs before SiteAnalytics'.
    const ads = await load()
    ads.gtag('event', 'conversion', { send_to: ads.GOOGLE_ADS_CONVERSION })
    ads.initGoogleAds()

    const queued = commands()
    expect(queued.map((c) => c[0])).toEqual(['js', 'config', 'event'])
    expect(queued[1]).toEqual(['config', ads.GOOGLE_ADS_ID])
    expect(queued[2]).toEqual([
      'event',
      'conversion',
      { send_to: 'AW-16659115277/bQ1KCJajgMcZEI3a14c-' },
    ])
  })

  it('pushes Arguments objects, which is what gtag.js consumes', async () => {
    const ads = await load()
    ads.initGoogleAds()
    expect(Object.prototype.toString.call(window.dataLayer![0])).toBe(
      '[object Arguments]',
    )
  })

  it('configures once', async () => {
    const ads = await load()
    ads.initGoogleAds()
    ads.initGoogleAds()
    ads.gtag('event', 'conversion', {})
    expect(commands().map((c) => c[0])).toEqual(['js', 'config', 'event'])
  })
})
