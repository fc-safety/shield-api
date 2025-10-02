-- UPDATE INDEXES

-- CreateIndex
CREATE INDEX "AssetQuestionCondition_clientId_idx" ON "public"."AssetQuestionCondition"("clientId");

-- CreateIndex
CREATE INDEX "AssetQuestionCondition_clientId_assetQuestionId_idx" ON "public"."AssetQuestionCondition"("clientId", "assetQuestionId");

-- CreateIndex
CREATE INDEX "AssetQuestionCondition_conditionType_idx" ON "public"."AssetQuestionCondition"("conditionType");

-- UPDATE RLS POLICIES

-- Update Inspection RLS policy to allow demo clients to delete inspections

-- policy: allow deletes only for owner or owner supervisors AND when inspection is not yet complete or client in demo mode
DROP POLICY IF EXISTS client_and_user_isolation_policy_insert ON "AssetQuestionResponse";
CREATE POLICY client_and_user_isolation_policy_insert ON "AssetQuestionResponse" FOR INSERT WITH CHECK (
    validate_client("clientId") AND validate_site("siteId") AND (
        is_owner("responderId")
        OR EXISTS (
            SELECT 1
            FROM "Client"
            WHERE "Client"."id" = "clientId" AND "Client"."demoMode" = TRUE
        )
    )
);

-- policy: allow deletes only for owner or owner supervisors AND when inspection is not yet complete or client in demo mode
DROP POLICY IF EXISTS client_and_user_isolation_policy_insert ON "Inspection";
CREATE POLICY client_and_user_isolation_policy_insert ON "Inspection" FOR INSERT WITH CHECK (
    validate_client("clientId") AND validate_site("siteId") AND (
        is_owner("inspectorId")
        OR EXISTS (
            SELECT 1
            FROM "Client"
            WHERE "Client"."id" = "clientId" AND "Client"."demoMode" = TRUE
        )
    )
);