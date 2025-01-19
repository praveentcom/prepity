/*
  Warnings:

  - A unique constraint covering the columns `[requestSlug]` on the table `Request` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `requestSlug` to the `Request` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "RequestStatus" ADD VALUE 'FAILED';

-- AlterTable
ALTER TABLE "Request" ADD COLUMN "requestSlug" TEXT;

-- Update existing rows with a unique UUID for requestSlug
UPDATE "Request" SET "requestSlug" = gen_random_uuid() WHERE "requestSlug" IS NULL;

-- AlterTable to set requestSlug as NOT NULL
ALTER TABLE "Request" ALTER COLUMN "requestSlug" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Request_requestSlug_key" ON "Request"("requestSlug");
