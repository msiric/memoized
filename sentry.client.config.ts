// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN ?? '',

  // Errors only, no performance tracing: nothing used Sentry's tracing data, and
  // Vercel Speed Insights covers page speed. Each trace was also an extra
  // request through the /monitoring tunnel, i.e. a Vercel function invocation.
  tracesSampleRate: 0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Replays only for sessions with an error. Random 10% sampling used the
  // free plan's 50 replays/month (mostly on bots), so error replays were dropped.
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0,

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
