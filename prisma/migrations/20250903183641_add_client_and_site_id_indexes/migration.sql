-- CreateIndex
CREATE INDEX "Alert_clientId_idx" ON "public"."Alert"("clientId");

-- CreateIndex
CREATE INDEX "Alert_clientId_siteId_idx" ON "public"."Alert"("clientId", "siteId");

-- CreateIndex
CREATE INDEX "Asset_clientId_idx" ON "public"."Asset"("clientId");

-- CreateIndex
CREATE INDEX "Asset_clientId_siteId_idx" ON "public"."Asset"("clientId", "siteId");

-- CreateIndex
CREATE INDEX "AssetQuestionResponse_clientId_idx" ON "public"."AssetQuestionResponse"("clientId");

-- CreateIndex
CREATE INDEX "AssetQuestionResponse_clientId_siteId_idx" ON "public"."AssetQuestionResponse"("clientId", "siteId");

-- CreateIndex
CREATE INDEX "ClientAssetQuestionCustomization_clientId_idx" ON "public"."ClientAssetQuestionCustomization"("clientId");

-- CreateIndex
CREATE INDEX "Consumable_clientId_idx" ON "public"."Consumable"("clientId");

-- CreateIndex
CREATE INDEX "Consumable_clientId_siteId_idx" ON "public"."Consumable"("clientId", "siteId");

-- CreateIndex
CREATE INDEX "Inspection_clientId_idx" ON "public"."Inspection"("clientId");

-- CreateIndex
CREATE INDEX "Inspection_clientId_siteId_idx" ON "public"."Inspection"("clientId", "siteId");

-- CreateIndex
CREATE INDEX "InspectionRoute_clientId_idx" ON "public"."InspectionRoute"("clientId");

-- CreateIndex
CREATE INDEX "InspectionRoute_clientId_siteId_idx" ON "public"."InspectionRoute"("clientId", "siteId");

-- CreateIndex
CREATE INDEX "InspectionSession_clientId_idx" ON "public"."InspectionSession"("clientId");

-- CreateIndex
CREATE INDEX "InspectionSession_clientId_siteId_idx" ON "public"."InspectionSession"("clientId", "siteId");

-- CreateIndex
CREATE INDEX "Person_clientId_idx" ON "public"."Person"("clientId");

-- CreateIndex
CREATE INDEX "Person_clientId_siteId_idx" ON "public"."Person"("clientId", "siteId");

-- CreateIndex
CREATE INDEX "ProductRequest_clientId_idx" ON "public"."ProductRequest"("clientId");

-- CreateIndex
CREATE INDEX "ProductRequest_clientId_siteId_idx" ON "public"."ProductRequest"("clientId", "siteId");

-- CreateIndex
CREATE INDEX "ProductRequestApproval_clientId_idx" ON "public"."ProductRequestApproval"("clientId");

-- CreateIndex
CREATE INDEX "ProductRequestApproval_clientId_siteId_idx" ON "public"."ProductRequestApproval"("clientId", "siteId");

-- CreateIndex
CREATE INDEX "ProductRequestItem_clientId_idx" ON "public"."ProductRequestItem"("clientId");

-- CreateIndex
CREATE INDEX "ProductRequestItem_clientId_siteId_idx" ON "public"."ProductRequestItem"("clientId", "siteId");

-- CreateIndex
CREATE INDEX "Site_clientId_idx" ON "public"."Site"("clientId");

-- CreateIndex
CREATE INDEX "Tag_clientId_idx" ON "public"."Tag"("clientId");

-- CreateIndex
CREATE INDEX "Tag_clientId_siteId_idx" ON "public"."Tag"("clientId", "siteId");

-- CreateIndex
CREATE INDEX "VaultOwnership_clientId_idx" ON "public"."VaultOwnership"("clientId");

-- CreateIndex
CREATE INDEX "VaultOwnership_clientId_siteId_idx" ON "public"."VaultOwnership"("clientId", "siteId");
