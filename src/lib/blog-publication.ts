/** A published flag must not expose a post whose publication date is still ahead. */
export function publishedBlogWhere(now = new Date()) {
  return {
    published: true,
    OR: [{ publishedAt: null }, { publishedAt: { lte: now } }],
  }
}
