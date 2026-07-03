-- CreateTable
CREATE TABLE "BlogPost" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "serializedBody" JSONB,
    "coverImage" TEXT,
    "author" TEXT NOT NULL DEFAULT 'Mario Siric',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "readingTime" INTEGER NOT NULL DEFAULT 5,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlogPost_slug_key" ON "BlogPost"("slug");

-- CreateIndex
CREATE INDEX "blog_post_published_idx" ON "BlogPost"("published", "publishedAt" DESC);

-- CreateIndex
CREATE INDEX "blog_post_slug_idx" ON "BlogPost"("slug");
