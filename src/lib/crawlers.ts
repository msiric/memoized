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
