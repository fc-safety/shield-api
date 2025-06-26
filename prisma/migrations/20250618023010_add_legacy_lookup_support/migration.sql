-- AlterEnum
ALTER TYPE "ClientStatus" ADD VALUE 'LEGACY';

-- AlterTable
ALTER TABLE "Person" ADD COLUMN     "legacyUsername" TEXT;

-- AlterTable
ALTER TABLE "Tag" ADD COLUMN     "legacyTagId" TEXT;

-- CreateIndex
CREATE INDEX "Person_legacyUsername_idx" ON "Person"("legacyUsername");

-- CreateIndex
CREATE INDEX "Tag_serialNumber_idx" ON "Tag"("serialNumber");

-- CreateIndex
CREATE INDEX "Tag_legacyTagId_idx" ON "Tag"("legacyTagId");
