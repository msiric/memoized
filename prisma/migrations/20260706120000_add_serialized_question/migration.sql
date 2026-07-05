-- Questions can contain markdown (fenced code blocks, inline code, etc.) just
-- like answers, but were rendered as raw text. Mirror `serializedAnswer`: store
-- the question pre-serialized to MDX so it renders through the same pipeline.
ALTER TABLE "Problem" ADD COLUMN "serializedQuestion" JSONB;
