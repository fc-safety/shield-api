-- AlterTable
ALTER TABLE "Alert" ADD COLUMN     "legacyAlertId" TEXT;

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "legacyAssetId" TEXT;

-- AlterTable
ALTER TABLE "AssetQuestion" ADD COLUMN     "legacyQuestionId" TEXT;

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "legacyClientId" TEXT,
ADD COLUMN     "legacyGroupId" TEXT;

-- AlterTable
ALTER TABLE "Consumable" ADD COLUMN     "legacyInventoryId" TEXT;

-- AlterTable
ALTER TABLE "Inspection" ADD COLUMN     "legacyLogId" TEXT;

-- AlterTable
ALTER TABLE "Manufacturer" ADD COLUMN     "legacyManufacturerId" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "legacyConsumableId" TEXT,
ADD COLUMN     "legacyProductId" TEXT;

-- AlterTable
ALTER TABLE "ProductCategory" ADD COLUMN     "legacyCategoryId" TEXT;

-- AlterTable
ALTER TABLE "ProductRequest" ADD COLUMN     "legacyRequestId" TEXT;

-- AlterTable
ALTER TABLE "ProductRequestItem" ADD COLUMN     "legacyRequestItemId" TEXT;

-- AlterTable
ALTER TABLE "Site" ADD COLUMN     "legacySiteId" TEXT;

-- CreateIndex
CREATE INDEX "Alert_legacyAlertId_idx" ON "Alert"("legacyAlertId");

-- CreateIndex
CREATE INDEX "Asset_legacyAssetId_idx" ON "Asset"("legacyAssetId");

-- CreateIndex
CREATE INDEX "AssetQuestion_legacyQuestionId_idx" ON "AssetQuestion"("legacyQuestionId");

-- CreateIndex
CREATE INDEX "Client_legacyClientId_idx" ON "Client"("legacyClientId");

-- CreateIndex
CREATE INDEX "Consumable_legacyInventoryId_idx" ON "Consumable"("legacyInventoryId");

-- CreateIndex
CREATE INDEX "Inspection_legacyLogId_idx" ON "Inspection"("legacyLogId");

-- CreateIndex
CREATE INDEX "Manufacturer_legacyManufacturerId_idx" ON "Manufacturer"("legacyManufacturerId");

-- CreateIndex
CREATE INDEX "Product_legacyProductId_idx" ON "Product"("legacyProductId");

-- CreateIndex
CREATE INDEX "Product_legacyConsumableId_idx" ON "Product"("legacyConsumableId");

-- CreateIndex
CREATE INDEX "ProductCategory_legacyCategoryId_idx" ON "ProductCategory"("legacyCategoryId");

-- CreateIndex
CREATE INDEX "ProductRequest_legacyRequestId_idx" ON "ProductRequest"("legacyRequestId");

-- CreateIndex
CREATE INDEX "ProductRequestItem_legacyRequestItemId_idx" ON "ProductRequestItem"("legacyRequestItemId");

-- CreateIndex
CREATE INDEX "Site_legacySiteId_idx" ON "Site"("legacySiteId");
