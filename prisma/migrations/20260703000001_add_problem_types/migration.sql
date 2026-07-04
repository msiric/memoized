-- Content uses IMPLEMENT and CODE problem types (frontend implementation
-- challenges); the enum only had CODING/THEORY, so the sync would fail on them.
ALTER TYPE "ProblemType" ADD VALUE IF NOT EXISTS 'IMPLEMENT';
ALTER TYPE "ProblemType" ADD VALUE IF NOT EXISTS 'CODE';
