-- TODO: RLS seems to be causing problem with invalid boolean expressions. This is probably
-- something to do with not handling values when they don't exist.

CREATE OR REPLACE FUNCTION validate_client(client_id TEXT) RETURNS BOOLEAN AS $$
DECLARE
    current_client_id TEXT;
BEGIN
    -- Retrieve the current client ID from the session
    current_client_id := current_setting('app.current_client_id')::TEXT;

    -- Perform the check
    RETURN client_id = current_client_id;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION validate_site(site_id TEXT) RETURNS BOOLEAN AS $$
DECLARE
    current_user_visibility TEXT;
    current_site_id TEXT;
    allowed_site_ids TEXT[];
BEGIN
    current_user_visibility := current_setting('app.current_user_visibility')::TEXT;
    current_site_id := current_setting('app.current_site_id')::TEXT;
    allowed_site_ids := string_to_array(current_setting('app.allowed_site_ids')::TEXT, ',');

    -- Perform the check
    RETURN (current_user_visibility IN ('single-site', 'self') AND current_site_id = site_id)
        OR current_user_visibility = 'client-sites'
        OR site_id = ANY(allowed_site_ids);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION restrict_self() RETURNS BOOLEAN AS $$
BEGIN
    RETURN current_setting('app.current_user_visibility')::TEXT = 'self';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION is_owner(person_id TEXT) RETURNS BOOLEAN AS $$
DECLARE
    current_person_id TEXT;
BEGIN
    current_person_id := current_setting('app.current_person_id')::TEXT;

    -- Perform the check
    RETURN person_id = current_person_id;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION should_bypass_rls() RETURNS BOOLEAN AS $$
DECLARE
    bypass_rls_status TEXT;
BEGIN
    -- Retrieve the BYPASS_RLS status from the session.
    bypass_rls_status := current_setting('app.bypass_rls', TRUE)::TEXT;

    -- Perform the check
    RETURN bypass_rls_status = 'on';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Enable Row Level Security
ALTER TABLE "Asset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Consumable" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Inspection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AssetQuestionResponse" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Alert" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductRequestApproval" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductRequestItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Client" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Site" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Person" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Manufacturer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;

-- Force Row Level Security for table owners
ALTER TABLE "Asset" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Consumable" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Tag" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Inspection" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AssetQuestionResponse" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Alert" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ProductRequest" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ProductRequestApproval" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ProductRequestItem" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Client" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Site" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Person" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ProductCategory" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Manufacturer" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Product" FORCE ROW LEVEL SECURITY;

-- Create row security policies
CREATE POLICY client_isolation_policy ON "Asset" USING (validate_client("clientId") AND validate_site("siteId"));
CREATE POLICY client_isolation_policy ON "Consumable" USING (validate_client("clientId") AND validate_site("siteId"));
CREATE POLICY client_isolation_policy ON "Tag" USING (validate_client("clientId") AND validate_site("siteId"));
CREATE POLICY client_isolation_policy ON "Alert" USING (validate_client("clientId") AND validate_site("siteId"));
CREATE POLICY client_isolation_policy ON "Client" USING (validate_client("id"));
CREATE POLICY client_isolation_policy ON "Site" USING (validate_client("clientId") AND validate_site("id"));
CREATE POLICY client_isolation_policy ON "Person" USING (validate_client("clientId") AND validate_site("siteId"));

-- model: "Inspection"
-- policy: allow insertions only for owner
CREATE POLICY client_and_user_isolation_policy_insert ON "Inspection" FOR INSERT WITH CHECK (
    validate_client("clientId") AND validate_site("siteId") AND is_owner("inspectorId")
);
-- policy: allow updates only for owner AND when inspection is not yet complete
CREATE POLICY client_and_user_isolation_policy_update ON "Inspection" FOR UPDATE USING (
    validate_client("clientId") AND validate_site("siteId") AND is_owner("inspectorId") AND "status" != 'COMPLETE'
) WITH CHECK (
    validate_client("clientId") AND validate_site("siteId") AND is_owner("inspectorId")
);
-- policy: allow selects for owner or owner supervisors
CREATE POLICY client_and_user_isolation_policy_select ON "Inspection" FOR SELECT USING (
    validate_client("clientId") AND validate_site("siteId") AND (NOT restrict_self() OR is_owner("inspectorId"))
);
-- policy: allow deletes only for owner or owner supervisors AND when inspection is not yet complete
CREATE POLICY client_and_user_isolation_policy_delete ON "Inspection" FOR DELETE USING (
    validate_client("clientId") AND validate_site("siteId") AND (
        NOT restrict_self() OR is_owner("inspectorId")
    ) AND "status" != 'COMPLETE'
);

-- model: "AssetQuestionResponse"
-- policy: allow insertions only for owner
CREATE POLICY client_and_user_isolation_policy_insert ON "AssetQuestionResponse" FOR INSERT WITH CHECK (
    validate_client("clientId") AND validate_site("siteId") AND is_owner("responderId")
);
-- policy: allow updates only for owner AND when inspection is not yet complete
CREATE POLICY client_and_user_isolation_policy_update ON "AssetQuestionResponse" FOR UPDATE USING (
    validate_client("clientId") AND validate_site("siteId") AND is_owner("responderId") AND EXISTS (
        SELECT 1 FROM "Inspection" WHERE "Inspection"."id" = "inspectionId" AND "Inspection"."status" != 'COMPLETE'
    )
) WITH CHECK (
    validate_client("clientId") AND validate_site("siteId") AND is_owner("responderId")
);
-- policy: allow selects for owner or owner supervisors
CREATE POLICY client_and_user_isolation_policy_select ON "AssetQuestionResponse" FOR SELECT USING (
    validate_client("clientId") AND validate_site("siteId") AND (NOT restrict_self() OR is_owner("responderId"))
);
-- policy: allow deletes only for owner or owner supervisors AND when inspection is not yet complete
CREATE POLICY client_and_user_isolation_policy_delete ON "AssetQuestionResponse" FOR DELETE USING (
    validate_client("clientId") AND validate_site("siteId") AND (
        NOT restrict_self() OR is_owner("responderId")
    ) AND EXISTS (
        SELECT 1 FROM "Inspection" WHERE "Inspection"."id" = "inspectionId" AND "Inspection"."status" != 'COMPLETE'
    )
);

-- model: "ProductRequest"
-- policy: allow insertions only for owner
CREATE POLICY client_and_user_isolation_policy_insert ON "ProductRequest" FOR INSERT WITH CHECK (
    validate_client("clientId") AND validate_site("siteId") AND is_owner("requestorId")
);
-- policy: allow updates only for owner when status is new OR site managers or global admins
CREATE POLICY client_and_user_isolation_policy_update ON "ProductRequest" FOR UPDATE USING (
    validate_client("clientId") AND validate_site("siteId") AND is_owner("requestorId") AND (
        NOT is_owner("requestorId") OR "status" = 'NEW'
    )
) WITH CHECK (
    validate_client("clientId") AND validate_site("siteId") AND (NOT is_owner("requestorId") OR "status" = 'CANCELLED')
);
-- policy: allow selects for owner or site managers
CREATE POLICY client_and_user_isolation_policy_select ON "ProductRequest" FOR SELECT USING (
    validate_client("clientId") AND validate_site("siteId") AND (NOT restrict_self() OR is_owner("requestorId"))
);
-- policy: disallow deletes
CREATE POLICY client_and_user_isolation_policy_delete ON "ProductRequest" FOR DELETE USING (1 = 0);

-- model: "ProductRequestApproval"
-- policy: allow insertions only for owner
CREATE POLICY client_and_user_isolation_policy_insert ON "ProductRequestApproval" FOR INSERT WITH CHECK (
    validate_client("clientId") AND validate_site("siteId") AND is_owner("approverId")
);
-- policy: disallow updates
CREATE POLICY client_and_user_isolation_policy_update ON "ProductRequestApproval" FOR UPDATE USING (1 = 0) WITH CHECK (1 = 0);
-- policy: allow selects for requestor or site managers
CREATE POLICY client_and_user_isolation_policy_select ON "ProductRequestApproval" FOR SELECT USING (
    validate_client("clientId") AND validate_site("siteId") AND (
        NOT restrict_self() OR EXISTS (
            SELECT 1 FROM "ProductRequest"
            WHERE "ProductRequest"."id" = "productRequestId" AND is_owner("ProductRequest"."requestorId")
        )
    )
);
-- policy: disallow deletes
CREATE POLICY client_and_user_isolation_policy_delete ON "ProductRequestApproval" FOR DELETE USING (1 = 0);

-- model: "ProductRequestItem"
-- policy: allow insertions only for owner
CREATE POLICY client_and_user_isolation_policy_insert ON "ProductRequestItem" FOR INSERT WITH CHECK (
    validate_client("clientId") AND validate_site("siteId") AND is_owner("addedById")
);
CREATE POLICY client_and_user_isolation_policy_update ON "ProductRequestItem" FOR UPDATE USING (
    validate_client("clientId") AND validate_site("siteId") AND (NOT restrict_self() OR is_owner("addedById"))
) WITH CHECK (
    validate_client("clientId") AND validate_site("siteId") AND (NOT restrict_self() OR is_owner("addedById"))
);
CREATE POLICY client_and_user_isolation_policy_select ON "ProductRequestItem" FOR SELECT USING (
    validate_client("clientId") AND validate_site("siteId") AND (NOT restrict_self() OR is_owner("addedById"))
);
CREATE POLICY client_and_user_isolation_policy_delete ON "ProductRequestItem" FOR DELETE USING (
    validate_client("clientId") AND validate_site("siteId") AND (NOT restrict_self() OR is_owner("addedById"))
);

-- For product tables, rows without a particular client id attached are readable by all.
CREATE POLICY client_isolation_policy_select ON "ProductCategory" FOR SELECT USING ("clientId" IS NULL OR validate_client("clientId"));
CREATE POLICY client_isolation_policy_select ON "Manufacturer" FOR SELECT USING ("clientId" IS NULL OR validate_client("clientId"));
CREATE POLICY client_isolation_policy_select ON "Product" FOR SELECT USING ("clientId" IS NULL OR validate_client("clientId"));
CREATE POLICY client_isolation_policy_insert ON "ProductCategory" FOR INSERT WITH CHECK (validate_client("clientId"));
CREATE POLICY client_isolation_policy_insert ON "Manufacturer" FOR INSERT WITH CHECK (validate_client("clientId"));
CREATE POLICY client_isolation_policy_insert ON "Product" FOR INSERT WITH CHECK (validate_client("clientId"));
CREATE POLICY client_isolation_policy_update ON "ProductCategory" FOR UPDATE USING (validate_client("clientId")) WITH CHECK (validate_client("clientId"));
CREATE POLICY client_isolation_policy_update ON "Manufacturer" FOR UPDATE USING (validate_client("clientId")) WITH CHECK (validate_client("clientId"));
CREATE POLICY client_isolation_policy_update ON "Product" FOR UPDATE USING (validate_client("clientId")) WITH CHECK (validate_client("clientId"));
CREATE POLICY client_isolation_policy_delete ON "ProductCategory" FOR DELETE USING (validate_client("clientId"));
CREATE POLICY client_isolation_policy_delete ON "Manufacturer" FOR DELETE USING (validate_client("clientId"));
CREATE POLICY client_isolation_policy_delete ON "Product" FOR DELETE USING (validate_client("clientId"));

-- Create policies to bypass RLS
CREATE POLICY bypass_rls_policy ON "Asset" USING (should_bypass_rls());
CREATE POLICY bypass_rls_policy ON "Consumable" USING (should_bypass_rls());
CREATE POLICY bypass_rls_policy ON "Tag" USING (should_bypass_rls());
CREATE POLICY bypass_rls_policy ON "Inspection" USING (should_bypass_rls());
CREATE POLICY bypass_rls_policy ON "AssetQuestionResponse" USING (should_bypass_rls());
CREATE POLICY bypass_rls_policy ON "Alert" USING (should_bypass_rls());
CREATE POLICY bypass_rls_policy ON "ProductRequest" USING (should_bypass_rls());
CREATE POLICY bypass_rls_policy ON "ProductRequestApproval" USING (should_bypass_rls());
CREATE POLICY bypass_rls_policy ON "ProductRequestItem" USING (should_bypass_rls());
CREATE POLICY bypass_rls_policy ON "Client" USING (should_bypass_rls());
CREATE POLICY bypass_rls_policy ON "Site" USING (should_bypass_rls());
CREATE POLICY bypass_rls_policy ON "Person" USING (should_bypass_rls());
CREATE POLICY bypass_rls_policy ON "ProductCategory" USING (should_bypass_rls());
CREATE POLICY bypass_rls_policy ON "Manufacturer" USING (should_bypass_rls());
CREATE POLICY bypass_rls_policy ON "Product" USING (should_bypass_rls());