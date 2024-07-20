# Memoized

## Architecture Overview

This project is a Next.js application with a PostgreSQL database hosted on Neon. It uses Prisma as an ORM and is deployed to Vercel.

### Key Components:

1. **Frontend**: Next.js
2. **Database**: PostgreSQL (hosted on Neon)
3. **ORM**: Prisma
4. **Deployment Platform**: Vercel
5. **CI/CD**: GitHub Actions

## Deployment Process

The deployment process is automated using GitHub Actions and involves the following steps:

1. **Code Push**: Pushing to the main branch triggers the deployment workflow.

2. **GitHub Actions Workflow**:

   - Installs dependencies
   - Runs tests and type checks
   - Generates Prisma client
   - Runs database migrations
   - Syncs content (seeds the database)
   - Deploys to Vercel

3. **Database Updates**: Prisma handles database migrations and seeding.

4. **Vercel Deployment**: The application is deployed to Vercel after all checks and updates are successful.

## Local Development

1. Clone the repository
2. Install dependencies: `yarn install`
3. Set up environment variables (see `.env.example`)
4. Run database migrations: `yarn migrate:dev`
5. Start the development server: `yarn dev`

## Important Scripts

- `yarn dev`: Start development server
- `yarn build`: Build the application
- `yarn start`: Start production server
- `yarn migrate`: Run database migrations
- `yarn sync`: Sync content (seed database)
- `yarn test`: Run tests

## Deployment Configuration

- Vercel auto-deployments are disabled.
- All deployments are triggered via GitHub Actions.
- Ensure all necessary secrets are set in GitHub repository settings.

## Database Management

- Database hosted on Neon
- Migrations are run automatically during deployment
- Content syncing (seeding) is part of the deployment process
