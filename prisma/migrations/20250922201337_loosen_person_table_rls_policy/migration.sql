-- Drop the existing Person table RLS policy
DROP POLICY IF EXISTS client_isolation_policy ON "Person";

-- Create new RLS policies for Person table with different rules per operation
-- SELECT: Only validate client (not site)
CREATE POLICY client_isolation_policy_select ON "Person"
    FOR SELECT
    USING (validate_client("clientId"));

-- INSERT: Validate both client and site
CREATE POLICY client_isolation_policy_insert ON "Person"
    FOR INSERT
    WITH CHECK (validate_client("clientId") AND validate_site("siteId"));

-- UPDATE: Validate both client and site
CREATE POLICY client_isolation_policy_update ON "Person"
    FOR UPDATE
    USING (validate_client("clientId") AND validate_site("siteId"))
    WITH CHECK (validate_client("clientId") AND validate_site("siteId"));

-- DELETE: Validate both client and site
CREATE POLICY client_isolation_policy_delete ON "Person"
    FOR DELETE
    USING (validate_client("clientId") AND validate_site("siteId"));