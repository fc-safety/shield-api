-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "AssetQuestion" ADD COLUMN     "clientAssetQuestionCustomizationId" TEXT;

-- CreateTable
CREATE TABLE "ClientAssetQuestionCustomization" (
    "id" TEXT NOT NULL,
    "createdOn" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedOn" TIMESTAMPTZ NOT NULL,
    "assetQuestionId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "clientId" TEXT NOT NULL DEFAULT current_setting('app.current_client_id'::text),
    "siteId" TEXT,

    CONSTRAINT "ClientAssetQuestionCustomization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SetAssetMetadataConfig" (
    "id" TEXT NOT NULL,
    "createdOn" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedOn" TIMESTAMPTZ NOT NULL,
    "assetQuestionId" TEXT,
    "metadata" JSONB NOT NULL,

    CONSTRAINT "SetAssetMetadataConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientAssetQuestionCustomization_assetQuestionId_key" ON "ClientAssetQuestionCustomization"("assetQuestionId");

-- CreateIndex
CREATE UNIQUE INDEX "SetAssetMetadataConfig_assetQuestionId_key" ON "SetAssetMetadataConfig"("assetQuestionId");

-- AddForeignKey
ALTER TABLE "ClientAssetQuestionCustomization" ADD CONSTRAINT "ClientAssetQuestionCustomization_assetQuestionId_fkey" FOREIGN KEY ("assetQuestionId") REFERENCES "AssetQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAssetQuestionCustomization" ADD CONSTRAINT "ClientAssetQuestionCustomization_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAssetQuestionCustomization" ADD CONSTRAINT "ClientAssetQuestionCustomization_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetAssetMetadataConfig" ADD CONSTRAINT "SetAssetMetadataConfig_assetQuestionId_fkey" FOREIGN KEY ("assetQuestionId") REFERENCES "AssetQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS Policies
ALTER TABLE "ClientAssetQuestionCustomization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClientAssetQuestionCustomization" FORCE ROW LEVEL SECURITY;
CREATE POLICY client_isolation_policy ON "ClientAssetQuestionCustomization" USING (validate_client("clientId") AND "siteId" IS NULL OR validate_site("siteId"));
CREATE POLICY bypass_rls_policy ON "ClientAssetQuestionCustomization" USING (should_bypass_rls());
