/*
  Warnings:

  - Added the required column `currentPeriodEnd` to the `Subscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `currentPeriodStart` to the `Subscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `priceId` to the `Subscription` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "cancelAt" TIMESTAMP(3),
ADD COLUMN     "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canceledAt" TIMESTAMP(3),
ADD COLUMN     "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "currentPeriodStart" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "priceId" TEXT NOT NULL;
