-- DropIndex
DROP INDEX "Alert_assetAlertCriterionId_key";

-- AlterTable
ALTER TABLE "Alert" ADD COLUMN     "resolvedOn" TIMESTAMP(3);
