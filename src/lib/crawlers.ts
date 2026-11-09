// One list for robots.txt and the middleware, so the two never disagree.
// Owner decision O1 (2026-11-08) allows every other crawler, including AI
// training crawlers. These stay excluded for load: SEO-tool crawlers and
// crawlers with a history of ignoring crawl budgets, plus search engines that
// send this English-language site negligible traffic.
export const BLOCKED_CRAWLERS = [
  'bytespider',
  'petalbot',
  'semrushbot',
  'ahrefsbot',
  'mj12bot',
  'dotbot',
  'blexbot',
  'seekport',
  'megaindex',
  'yandexbot',
  'sogou',
  'baiduspider',
  'seznambot',
] as const
