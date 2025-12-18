<p align="center">
  <a href="https://www.memoized.io" target="_blank">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="public/images/brand/logo-light.svg">
      <source media="(prefers-color-scheme: light)" srcset="public/images/brand/logo-dark.svg">
      <img src="public/images/brand/logo-dark.svg" alt="Memoized" width="300" />
    </picture>
  </a>
</p>

<p align="center">
  <strong>An open-source JavaScript/TypeScript interview prep platform</strong>
</p>

<p align="center">
  <a href="https://www.memoized.io">Website</a> •
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#architecture">Architecture</a>
</p>

<p align="center">
  <img src="https://github.com/msiric/memoized/actions/workflows/production.yml/badge.svg" alt="Production" />
  <a href="https://opensource.org/licenses/MIT">
    <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" />
  </a>
</p>

---

## Features

- **Structured courses**: JavaScript and Data Structures & Algorithms tracks with progressive curriculum
- **Practice problems**: 450+ coding and theory problems linked to lessons with difficulty ratings
- **Progress tracking**: Mark lessons and problems as complete with visual analytics dashboard
- **Premium content system**: Free and premium access tiers with Stripe subscription management
- **Full-text search**: Fast, relevant search across all content powered by MeiliSearch
- **OAuth authentication**: Sign in with GitHub or Google via NextAuth.js
- **MDX content**: Rich lessons with syntax-highlighted code, interactive components and custom annotations
- **Pre-compiled content**: MDX serialized at build/sync time for fast page loads
- **Resources library**: Standalone reference materials for data structures, async patterns and more

## Quick Start

**Requirements:** Node.js 18+, Yarn, Docker Desktop

```bash
git clone https://github.com/msiric/memoized.git
cd memoized
yarn install
yarn setup:dev
yarn dev
```

Open [http://localhost:3000](http://localhost:3000)

## Architecture

```
Frontend       → Next.js 14 (App Router) + React + Tailwind CSS
API Layer      → Server Actions + Route Handlers + NextAuth.js
Services       → Course · Lesson · Problem · Resource · Subscription · User
Data           → PostgreSQL (Prisma ORM) + MeiliSearch
Integrations   → Stripe (Payments) · Resend (Email) · Sentry (Monitoring)
```

### Data Model

- **Courses** → Sections → Lessons → Problems
- **Resources**: Standalone reference content (linked to lessons optionally)
- **Users** → Accounts (OAuth) → Customers (Stripe) → Subscriptions
- **Progress**: UserLessonProgress + UserProblemProgress tracking

### Content Pipeline

1. MDX files with `_lessons.json` metadata define curriculum structure
2. `yarn sync:all` parses MDX, serializes with Shiki highlighting, stores in PostgreSQL
3. `yarn index` indexes lessons in MeiliSearch for search
4. Pre-serialized content hydrates instantly on page load

## Manual Setup

1. **Clone and install**:

   ```bash
   git clone https://github.com/msiric/memoized.git
   cd memoized
   yarn install
   ```

2. **Environment setup**:

   ```bash
   cp .env.example .env.local
   ```

   Update database URL in `.env.local`:

   ```
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"
   MEILISEARCH_HOST="http://localhost:7700"
   MEILISEARCH_MASTER_KEY="dev-master-key"
   ```

3. **Start services**:

   ```bash
   docker-compose up -d  # PostgreSQL + MeiliSearch
   ```

4. **Database setup**:

   ```bash
   yarn migrate:dev
   ```

5. **Content setup**:

   ```bash
   yarn setup:content    # Copies sample content
   yarn sync:all:dev     # Syncs all content to database
   ```

6. **Start development**:
   ```bash
   yarn dev
   ```

## Tech Stack

| Category   | Technology                                                                   |
| ---------- | ---------------------------------------------------------------------------- |
| Framework  | [Next.js 14](https://nextjs.org/) (App Router)                               |
| Language   | [TypeScript](https://www.typescriptlang.org/)                                |
| Database   | [PostgreSQL](https://www.postgresql.org/) + [Prisma](https://www.prisma.io/) |
| Search     | [MeiliSearch](https://www.meilisearch.com/)                                  |
| Styling    | [Tailwind CSS](https://tailwindcss.com/)                                     |
| Content    | [MDX](https://mdxjs.com/) + [Shiki](https://shiki.style/)                    |
| Auth       | [NextAuth.js](https://next-auth.js.org/) (GitHub, Google)                    |
| Payments   | [Stripe](https://stripe.com/)                                                |
| Email      | [Resend](https://resend.com/)                                                |
| Testing    | [Vitest](https://vitest.dev/)                                                |
| Monitoring | [Sentry](https://sentry.io/)                                                 |
| Deployment | [Vercel](https://vercel.com/)                                                |

## Project Structure

```
memoized/
├── src/
│   ├── app/              # Next.js App Router (pages, API routes)
│   ├── components/       # React components
│   ├── services/         # Business logic (course, lesson, problem, subscription)
│   ├── scripts/          # Sync, index and setup scripts
│   ├── mdx/              # MDX plugins (remark, rehype, recma)
│   ├── content/          # Working directory for course content
│   ├── samples/          # Sample content for local development
│   ├── lib/              # Prisma, Stripe, MeiliSearch, Resend clients
│   ├── hooks/            # React hooks
│   ├── contexts/         # Zustand stores (auth, progress)
│   ├── constants/        # App constants and curriculum config
│   └── types/            # TypeScript types
├── prisma/               # Database schema and migrations
├── public/               # Static assets (images, icons)
└── docker-compose.yml    # Local PostgreSQL + MeiliSearch
```

## Content System

Memoized uses a hybrid content architecture. Sample content is provided for local development:

```
src/samples/
├── js-track/
│   ├── page.mdx                   # Course overview
│   └── core-fundamentals/
│       ├── _lessons.json          # Lesson metadata + problems
│       └── variables/
│           └── page.mdx           # Lesson content
└── dsa-track/
```

### Development Workflow

1. **Setup**: `yarn setup:content` - Copy sample content
2. **Sync**: `yarn sync:all:dev` - Sync to local database
3. **Develop**: `yarn dev` - Start development server

## Contributing

Issues and PRs welcome.

## License

[MIT](LICENSE.md)
