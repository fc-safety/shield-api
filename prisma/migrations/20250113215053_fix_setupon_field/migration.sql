/*
  Warnings:

  - You are about to drop the column `assetId` on the `Tag` table. All the data in the column will be lost.
  - You are about to drop the column `setupOn` on the `Tag` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "setupOn" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Tag" DROP COLUMN "assetId",
DROP COLUMN "setupOn";
