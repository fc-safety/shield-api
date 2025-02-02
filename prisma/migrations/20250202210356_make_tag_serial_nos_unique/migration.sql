/*
  Warnings:

  - A unique constraint covering the columns `[serialNumber]` on the table `Tag` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Tag_serialNumber_key" ON "Tag"("serialNumber");
