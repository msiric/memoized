// Google Ads tag (AW-16659115277). This is an Ads conversion destination,
// not a GA4 property.
//
// The command queue (window.dataLayer) is set up by whichever runs first:
// SiteAnalytics after hydration, or a conversion report. gtag.js itself
// (~480 KB unminified) loads only after the page has finished loading
// (SiteAnalytics, strategy="lazyOnload") and then replays the queue in
// order, so a conversion reported before it arrives is still sent.
export const GOOGLE_ADS_ID = 'AW-16659115277'
export const GOOGLE_ADS_CONVERSION = `${GOOGLE_ADS_ID}/bQ1KCJajgMcZEI3a14c-`
export const GOOGLE_ADS_SCRIPT_SRC = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`

declare global {
  interface Window {
    dataLayer?: unknown[]
  }
}

let configured = false

// Same contract as Google's gtag(): the queue only accepts Arguments objects.
function push(..._args: unknown[]) {
  window.dataLayer = window.dataLayer || []
  // eslint-disable-next-line prefer-rest-params
  window.dataLayer.push(arguments)
}

/** Queue the 'js' and 'config' commands once; they must precede any event. */
export function initGoogleAds() {
  if (typeof window === 'undefined' || configured) return
  configured = true
  push('js', new Date())
  push('config', GOOGLE_ADS_ID)
}

export function gtag(...args: unknown[]) {
  if (typeof window === 'undefined') return
  initGoogleAds()
  push(...args)
}
