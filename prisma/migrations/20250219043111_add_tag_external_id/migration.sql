/*
  Warnings:

  - A unique constraint covering the columns `[externalId]` on the table `Tag` will be added. If there are existing duplicate values, this will fail.
  - The required column `externalId` was added to the `Tag` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "Tag" ADD COLUMN     "externalId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Tag_externalId_key" ON "Tag"("externalId");
