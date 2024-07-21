-- CreateEnum
CREATE TYPE "BannerType" AS ENUM ('INFO', 'WARNING', 'SUCCESS');

-- CreateTable
CREATE TABLE "Banner" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "BannerType" NOT NULL,
    "linkText" TEXT,
    "linkUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
);
