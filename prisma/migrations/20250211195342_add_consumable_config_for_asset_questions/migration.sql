-- CreateEnum
CREATE TYPE "ConsumableMappingType" AS ENUM ('EXPIRATION_DATE');

-- AlterTable
ALTER TABLE "AssetQuestion" ADD COLUMN     "consumableConfigId" TEXT;

-- CreateTable
CREATE TABLE "ConsumableQuestionConfig" (
    "id" TEXT NOT NULL,
    "createdOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedOn" TIMESTAMP(3) NOT NULL,
    "consumableProductId" TEXT NOT NULL,
    "mappingType" "ConsumableMappingType" NOT NULL,

    CONSTRAINT "ConsumableQuestionConfig_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AssetQuestion" ADD CONSTRAINT "AssetQuestion_consumableConfigId_fkey" FOREIGN KEY ("consumableConfigId") REFERENCES "ConsumableQuestionConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumableQuestionConfig" ADD CONSTRAINT "ConsumableQuestionConfig_consumableProductId_fkey" FOREIGN KEY ("consumableProductId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
