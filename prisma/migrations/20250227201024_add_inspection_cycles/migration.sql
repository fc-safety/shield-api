-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "inspectionCycle" INTEGER;

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "defaultInspectionCycle" INTEGER NOT NULL DEFAULT 30;
