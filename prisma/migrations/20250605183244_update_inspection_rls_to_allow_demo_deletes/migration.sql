-- Update Inspection RLS policy to allow demo clients to delete inspections

-- policy: allow deletes only for owner or owner supervisors AND when inspection is not yet complete or client in demo mode
DROP POLICY IF EXISTS client_and_user_isolation_policy_delete ON "AssetQuestionResponse";
CREATE POLICY client_and_user_isolation_policy_delete ON "AssetQuestionResponse" FOR DELETE USING (
    validate_client("clientId") AND validate_site("siteId") AND (
        NOT restrict_self() OR is_owner("responderId")
    ) AND EXISTS (
        SELECT 1
        FROM "Inspection"
        INNER JOIN "Client" ON "Client"."id" = "Inspection"."clientId"
        WHERE "Inspection"."id" = "inspectionId" AND (
            "Inspection"."status" != 'COMPLETE'
            OR "Client"."demoMode" = TRUE
        )
    )
);

-- policy: allow deletes only for owner or owner supervisors AND when inspection is not yet complete or client in demo mode
DROP POLICY IF EXISTS client_and_user_isolation_policy_delete ON "Inspection";
CREATE POLICY client_and_user_isolation_policy_delete ON "Inspection" FOR DELETE USING (
    validate_client("clientId") AND validate_site("siteId") AND (
        NOT restrict_self() OR is_owner("inspectorId")
    ) AND ("status" != 'COMPLETE' OR EXISTS (
        SELECT 1
        FROM "Client"
        WHERE "Client"."id" = "clientId" AND "Client"."demoMode" = TRUE
    ))
);
