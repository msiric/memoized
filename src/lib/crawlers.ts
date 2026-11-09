// One list for robots.txt and the middleware, so the two never disagree.
// Owner decisions (2026-11-08/09): every search engine and AI crawler may
// crawl. Only SEO-tool crawlers and Bytespider stay excluded: they add load
// without sending visitors.
export const BLOCKED_CRAWLERS = [
  'bytespider',
  'semrushbot',
  'ahrefsbot',
  'mj12bot',
  'dotbot',
  'blexbot',
  'seekport',
  'megaindex',
] as const

// Staged part of the allow-all decision (robots.txt only; these crawlers obey
// it). High-volume AI training crawlers fetch every page repeatedly, and each
// uncached lesson render costs ~0.7 s of CPU against the Hobby plan's 4 h/month
// cap (3h40m already used in Oct 10 - Nov 9 2026). Vercel's firewall cannot
// rate-limit them below that budget, so they wait until lesson pages are
// served from cache (PERF-COST-01). Remove this list then.
// Google-Extended and Applebot-Extended are usage tokens, not crawlers, so
// allowing them costs nothing and they are not listed.
export const DEFERRED_AI_TRAINING_CRAWLERS = [
  'GPTBot',
  'ClaudeBot',
  'CCBot',
  'meta-externalagent',
  'Amazonbot',
] as const
