-- CreateEnum
CREATE TYPE "AssetQuestionConditionType" AS ENUM ('REGION', 'MANUFACTURER', 'PRODUCT_CATEGORY', 'PRODUCT_SUBCATEGORY', 'PRODUCT');

-- AlterTable
ALTER TABLE "AssetQuestion" ADD COLUMN     "parentQuestionId" TEXT;

-- CreateTable
CREATE TABLE "AssetQuestionCondition" (
    "id" TEXT NOT NULL,
    "createdOn" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedOn" TIMESTAMPTZ NOT NULL,
    "assetQuestionId" TEXT NOT NULL,
    "conditionType" "AssetQuestionConditionType" NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "clientId" TEXT,

    CONSTRAINT "AssetQuestionCondition_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AssetQuestion" ADD CONSTRAINT "AssetQuestion_parentQuestionId_fkey" FOREIGN KEY ("parentQuestionId") REFERENCES "AssetQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetQuestionCondition" ADD CONSTRAINT "AssetQuestionCondition_assetQuestionId_fkey" FOREIGN KEY ("assetQuestionId") REFERENCES "AssetQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetQuestionCondition" ADD CONSTRAINT "AssetQuestionCondition_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
