/*
  Warnings:

  - You are about to drop the column `legacyGroupId` on the `Client` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Client" DROP COLUMN "legacyGroupId";

-- AlterTable
ALTER TABLE "Site" ADD COLUMN     "legacyGroupId" TEXT;

-- CreateIndex
CREATE INDEX "Site_legacyGroupId_idx" ON "Site"("legacyGroupId");
