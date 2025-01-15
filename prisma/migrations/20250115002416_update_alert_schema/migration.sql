/*
  Warnings:

  - You are about to drop the column `tagId` on the `Alert` table. All the data in the column will be lost.
  - Added the required column `assetQuestionResponseId` to the `Alert` table without a default value. This is not possible if the table is not empty.
  - Added the required column `inspectionId` to the `Alert` table without a default value. This is not possible if the table is not empty.
  - Added the required column `message` to the `Alert` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Alert" DROP CONSTRAINT "Alert_tagId_fkey";

-- AlterTable
ALTER TABLE "Alert" DROP COLUMN "tagId",
ADD COLUMN     "assetQuestionResponseId" TEXT NOT NULL,
ADD COLUMN     "inspectionId" TEXT NOT NULL,
ADD COLUMN     "message" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_assetQuestionResponseId_fkey" FOREIGN KEY ("assetQuestionResponseId") REFERENCES "AssetQuestionResponse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
