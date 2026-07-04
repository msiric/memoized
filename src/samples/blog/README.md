# Blog posts

Each blog post is a folder containing a single `page.mdx` file. The sync
(`yarn sync:blog`) reads every folder here (in production, from the private
content repo) and upserts it into the database.

```
blog/
  welcome-to-memoized-blog/
    page.mdx
  2026-01-19-hidden-classes-explained/   # optional date prefix (see below)
    page.mdx
    cover.png
```

## The folder name is the slug — and the slug is permanent

The post's **slug is its folder name**, with an optional `YYYY-MM-DD-` prefix
stripped off:

| Folder                              | Slug (URL)                |
| ----------------------------------- | ------------------------- |
| `hidden-classes-explained`          | `/blog/hidden-classes-explained` |
| `2026-01-19-hidden-classes-explained` | `/blog/hidden-classes-explained` |

The slug is the post's **permanent public identity**. It is the URL, the RSS
`guid`, the canonical/OpenGraph URL, the sitemap entry, and the
[Giscus](https://giscus.app) comment-thread key.

**Renaming a published folder = a brand-new post.** The old URL 404s, its
comments and social shares are orphaned, SEO/backlinks break, and the old row is
removed on the next sync. So:

- **Choose the folder name carefully at creation and treat it as immutable.**
- Need chronological file ordering? Prefix the folder with a date
  (`2026-01-19-...`) — the date is stripped from the slug, so you can reorder on
  disk without changing the URL.
- Genuinely need to change a live URL? That's a deliberate migration (add a
  redirect from the old slug), not a rename.

> Blog posts intentionally have no `contentId` (unlike courses/lessons/problems).
> The folder name already gives each post a stable, author-controlled identity
> that is decoupled from the title, and blog posts carry no user progress that a
> rename could strand — so a second identity would add nothing.

## Frontmatter

Metadata is a plain `export const metadata` object at the top of `page.mdx`:

```mdx
export const metadata = {
  title: "Hidden Classes Explained",           // required
  description: "How V8 optimizes object shape access.", // required
  author: "Mario Siric",                        // optional (defaults to Mario Siric)
  tags: ["v8", "performance"],                  // optional
  published: true,                              // optional (defaults to false — drafts are synced but never served)
  publishedAt: "2026-01-19",                    // optional (YYYY-MM-DD)
  coverImage: "cover.png",                      // optional; resolved to /blog/<slug>/cover.png
}

Your MDX content goes here...
```

- `published: false` (or omitted) marks a **draft**: it is still synced to the
  database, but never served — it is hidden from all listings, the RSS feed and
  the sitemap, and its URL returns 404.
- `coverImage` is resolved relative to the post folder and served from
  `/blog/<slug>/<coverImage>`.
- Reading time is computed automatically from the content.
