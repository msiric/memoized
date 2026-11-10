// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN ?? '',

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  replaysOnErrorSampleRate: 1.0,

  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // Session Replay is added after load (below), not here: bundling it costs
  // every page ~116 KB of JavaScript before anything is interactive.
  integrations: [],
})

// Error reporting starts immediately; the replay recorder is fetched from
// Sentry's CDN once the browser is idle, then uses the sample rates above.
// Errors thrown before it arrives are still reported, just without a replay.
function loadReplay() {
  Sentry.lazyLoadIntegration('replayIntegration')
    .then((replayIntegration) =>
      Sentry.addIntegration(
        replayIntegration({ maskAllText: true, blockAllMedia: true }),
      ),
    )
    .catch(() => {
      // Blocked by an ad blocker or offline: run without replay.
    })
}

if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_SENTRY_DSN) {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(loadReplay, { timeout: 5000 })
  } else {
    setTimeout(loadReplay, 3000)
  }
}
