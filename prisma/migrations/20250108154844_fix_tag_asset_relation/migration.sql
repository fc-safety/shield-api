/*
  Warnings:

  - A unique constraint covering the columns `[tagId]` on the table `Asset` will be added. If there are existing duplicate values, this will fail.

*/

-- CreateIndex
CREATE UNIQUE INDEX "Asset_tagId_key" ON "Asset"("tagId");
