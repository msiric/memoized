# Search entry-page contract

SEO changes must improve the reader's destination, not only metadata. Public
URLs should have one consistent canonical, useful server-rendered content,
crawlable links and accurate access expectations.

## Page policy

- Index home, active course/section directories, free lessons, useful premium
  lesson previews with existing free practice, free references and published blogs.
- Premium reference stubs remain self-canonical and `noindex, follow` until a
  useful standalone public reference is authored. Keep them out of the sitemap.
- `/resources/intro` and legacy security names redirect to their canonical pages.
- Exclude utility actions, missing content, drafts/future posts and deployment
  previews appropriately. Do not use robots.txt blocking to canonicalize pages.
- Never send paid lesson/reference bodies in anonymous HTML or RSC props.
  Free practice remains free. Do not introduce a Googlebot-only content bypass.

## Signals and measurement

Use the shared metadata and JSON-LD helpers. Mark up only facts represented by
the page; no invented ratings, FAQ sections, search endpoints or outcomes.
Do not fake lastmod: current catalog sync timestamps are not reliable editorial
modification dates. Published blog dates may be included when reliable.
Blog detail routes render at request time so a pre-publication 404 cannot remain
cached after the scheduled time passes. Catalog sitemap refresh is bounded to
one hour; there is no automated Google indexing submission.

Preserve one topic owner. A blog post must solve a different reader task rather
than duplicate a lesson for a keyword variant.

Action events must describe what happened (opened/revealed/self-marked/intent).
Do not call a page view a purchase, signup or mastered skill. Never send emails,
user IDs, answer text or query strings. Development/preview traffic is excluded.
The Umami tracker excludes URL search/hash values. This privacy choice also means
raw campaign query strings are not collected; introduce an explicit reviewed
campaign-parameter allowlist before relying on campaign-level attribution.
Catalog directory links do not prefetch entire lesson payloads on sight.
Dense sidebar and MDX cross-reference links follow the same policy. A section
visit must not speculatively download dozens of lessons and exhaust the normal
document rate budget.

## Content integrity

`next-mdx-remote-client/serialize` can return an error object instead of throwing.
Every sync path must call `assertCompiledMdx` before persisting non-empty content;
published blog content must be compiled. Renderers must surface hydration errors
rather than emit an empty success-shaped page.

Use one annotation object per code fence, for example:

````md
```javascript {{ title: 'Questions', exec: false }}
1 + 1
```
````

Audit/MDX compilation tests alone are insufficient: run the application's actual
serialization pipeline and inspect the server-rendered page.

## Runtime and dependency boundaries

- Stripe plan lookups live in `lib/stripe-plans.ts`, not shared client utilities.
- Server highlighting calls `lib/shiki.ts` directly. Optional homepage animation
  loads the highlighter lazily and does not run on small/reduced-motion displays.
- Sharp is a production dependency; the 0.33.5 patch supports this repository's
  Yarn 1 setup without bypassing engine checks.
- Public static assets must not consume the document rate-limit budget. This is
  especially important for Next's internal image-optimizer requests. Protected
  paths, application APIs and blocked-bot handling remain unchanged.

## Release gate

The SEO-only release leaves the deployed visualization foundation unchanged.
Unfinished lesson diagrams, visualization wrappers and new attempt controls stay
on their feature branches. Existing free question/reveal/progress interactions
remain available; measurement does not infer an attempt from viewing a question.

Run targeted Vitest, typecheck/lint and the existing production build against an
isolated review database. Never let `prebuild` migrations target an unintended DB.
Check real HTTP status, canonical/title/robots, sitemap coverage, structured data,
anonymous and paid behavior, and mobile rendering at 320px.

Local checks cannot establish a ranking lift. Deployment and sitemap submission
require approval. After release, verify live behavior and follow indexing weekly
and comparable 28-day query/landing-page windows. Private analytics and credentials
must stay outside this repository.

The app deployment workflow syncs blogs, while the private content repository
owns curriculum/resource sync. Deploy a compatible app/assets revision before
publishing new content tags. Verify both revisions together and keep rollback refs.

An isolated full-content build may need a bounded Prisma pool in its review
connection string (`connection_limit=2&pool_timeout=30`). This is a local review
setting, not a global production pool-size prescription.
