/*
  Warnings:

  - You are about to drop the column `value_type` on the `AssetQuestion` table. All the data in the column will be lost.
  - Added the required column `valueType` to the `AssetQuestion` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AssetQuestion" DROP COLUMN "value_type",
ADD COLUMN     "valueType" "AssetQuestionResponseType" NOT NULL;

-- AlterTable
ALTER TABLE "Tag" ADD COLUMN     "assetId" TEXT;
