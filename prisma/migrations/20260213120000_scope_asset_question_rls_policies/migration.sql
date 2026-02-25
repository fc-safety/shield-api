-- ============================================================
-- AssetQuestion
-- ============================================================
DROP POLICY IF EXISTS client_isolation_policy_select ON "AssetQuestion";
DROP POLICY IF EXISTS client_isolation_policy_insert ON "AssetQuestion";
DROP POLICY IF EXISTS client_isolation_policy_update ON "AssetQuestion";
DROP POLICY IF EXISTS client_isolation_policy_delete ON "AssetQuestion";
DROP POLICY IF EXISTS bypass_rls_policy ON "AssetQuestion";

CREATE POLICY client_isolation_policy_select ON "AssetQuestion" FOR SELECT
    USING ("clientId" IS NULL OR validate_client("clientId"));

CREATE POLICY client_isolation_policy_insert ON "AssetQuestion" FOR INSERT
    WITH CHECK (
        validate_client("clientId")
        OR (get_current_scope() IN ('SYSTEM', 'GLOBAL') AND "clientId" IS NULL)
    );

CREATE POLICY client_isolation_policy_update ON "AssetQuestion" FOR UPDATE
    USING (
        validate_client("clientId")
        OR (get_current_scope() IN ('SYSTEM', 'GLOBAL') AND "clientId" IS NULL)
    )
    WITH CHECK (
        validate_client("clientId")
        OR (get_current_scope() IN ('SYSTEM', 'GLOBAL') AND "clientId" IS NULL)
    );

CREATE POLICY client_isolation_policy_delete ON "AssetQuestion" FOR DELETE
    USING (
        validate_client("clientId")
        OR (get_current_scope() IN ('SYSTEM', 'GLOBAL') AND "clientId" IS NULL)
    );

CREATE POLICY bypass_rls_policy ON "AssetQuestion"
    USING (should_bypass_rls());

-- ============================================================
-- AssetQuestionCondition
-- ============================================================
DROP POLICY IF EXISTS client_isolation_policy_select ON "AssetQuestionCondition";
DROP POLICY IF EXISTS client_isolation_policy_insert ON "AssetQuestionCondition";
DROP POLICY IF EXISTS client_isolation_policy_update ON "AssetQuestionCondition";
DROP POLICY IF EXISTS client_isolation_policy_delete ON "AssetQuestionCondition";
DROP POLICY IF EXISTS bypass_rls_policy ON "AssetQuestionCondition";

CREATE POLICY client_isolation_policy_select ON "AssetQuestionCondition" FOR SELECT
    USING ("clientId" IS NULL OR validate_client("clientId"));

CREATE POLICY client_isolation_policy_insert ON "AssetQuestionCondition" FOR INSERT
    WITH CHECK (
        validate_client("clientId")
        OR (get_current_scope() IN ('SYSTEM', 'GLOBAL') AND "clientId" IS NULL)
    );

CREATE POLICY client_isolation_policy_update ON "AssetQuestionCondition" FOR UPDATE
    USING (
        validate_client("clientId")
        OR (get_current_scope() IN ('SYSTEM', 'GLOBAL') AND "clientId" IS NULL)
    )
    WITH CHECK (
        validate_client("clientId")
        OR (get_current_scope() IN ('SYSTEM', 'GLOBAL') AND "clientId" IS NULL)
    );

CREATE POLICY client_isolation_policy_delete ON "AssetQuestionCondition" FOR DELETE
    USING (
        validate_client("clientId")
        OR (get_current_scope() IN ('SYSTEM', 'GLOBAL') AND "clientId" IS NULL)
    );

CREATE POLICY bypass_rls_policy ON "AssetQuestionCondition"
    USING (should_bypass_rls());

-- ============================================================
-- Product
-- ============================================================
DROP POLICY IF EXISTS client_isolation_policy_select ON "Product";
DROP POLICY IF EXISTS client_isolation_policy_insert ON "Product";
DROP POLICY IF EXISTS client_isolation_policy_update ON "Product";
DROP POLICY IF EXISTS client_isolation_policy_delete ON "Product";
DROP POLICY IF EXISTS bypass_rls_policy ON "Product";

CREATE POLICY client_isolation_policy_select ON "Product" FOR SELECT
    USING ("clientId" IS NULL OR validate_client("clientId"));

CREATE POLICY client_isolation_policy_insert ON "Product" FOR INSERT
    WITH CHECK (
        validate_client("clientId")
        OR (get_current_scope() IN ('SYSTEM', 'GLOBAL') AND "clientId" IS NULL)
    );

CREATE POLICY client_isolation_policy_update ON "Product" FOR UPDATE
    USING (
        validate_client("clientId")
        OR (get_current_scope() IN ('SYSTEM', 'GLOBAL') AND "clientId" IS NULL)
    )
    WITH CHECK (
        validate_client("clientId")
        OR (get_current_scope() IN ('SYSTEM', 'GLOBAL') AND "clientId" IS NULL)
    );

CREATE POLICY client_isolation_policy_delete ON "Product" FOR DELETE
    USING (
        validate_client("clientId")
        OR (get_current_scope() IN ('SYSTEM', 'GLOBAL') AND "clientId" IS NULL)
    );

CREATE POLICY bypass_rls_policy ON "Product"
    USING (should_bypass_rls());

-- ============================================================
-- Manufacturer
-- ============================================================
DROP POLICY IF EXISTS client_isolation_policy_select ON "Manufacturer";
DROP POLICY IF EXISTS client_isolation_policy_insert ON "Manufacturer";
DROP POLICY IF EXISTS client_isolation_policy_update ON "Manufacturer";
DROP POLICY IF EXISTS client_isolation_policy_delete ON "Manufacturer";
DROP POLICY IF EXISTS bypass_rls_policy ON "Manufacturer";

CREATE POLICY client_isolation_policy_select ON "Manufacturer" FOR SELECT
    USING ("clientId" IS NULL OR validate_client("clientId"));

CREATE POLICY client_isolation_policy_insert ON "Manufacturer" FOR INSERT
    WITH CHECK (
        validate_client("clientId")
        OR (get_current_scope() IN ('SYSTEM', 'GLOBAL') AND "clientId" IS NULL)
    );

CREATE POLICY client_isolation_policy_update ON "Manufacturer" FOR UPDATE
    USING (
        validate_client("clientId")
        OR (get_current_scope() IN ('SYSTEM', 'GLOBAL') AND "clientId" IS NULL)
    )
    WITH CHECK (
        validate_client("clientId")
        OR (get_current_scope() IN ('SYSTEM', 'GLOBAL') AND "clientId" IS NULL)
    );

CREATE POLICY client_isolation_policy_delete ON "Manufacturer" FOR DELETE
    USING (
        validate_client("clientId")
        OR (get_current_scope() IN ('SYSTEM', 'GLOBAL') AND "clientId" IS NULL)
    );

CREATE POLICY bypass_rls_policy ON "Manufacturer"
    USING (should_bypass_rls());

-- ============================================================
-- ProductCategory
-- ============================================================
DROP POLICY IF EXISTS client_isolation_policy_select ON "ProductCategory";
DROP POLICY IF EXISTS client_isolation_policy_insert ON "ProductCategory";
DROP POLICY IF EXISTS client_isolation_policy_update ON "ProductCategory";
DROP POLICY IF EXISTS client_isolation_policy_delete ON "ProductCategory";
DROP POLICY IF EXISTS bypass_rls_policy ON "ProductCategory";

CREATE POLICY client_isolation_policy_select ON "ProductCategory" FOR SELECT
    USING ("clientId" IS NULL OR validate_client("clientId"));

CREATE POLICY client_isolation_policy_insert ON "ProductCategory" FOR INSERT
    WITH CHECK (
        validate_client("clientId")
        OR (get_current_scope() IN ('SYSTEM', 'GLOBAL') AND "clientId" IS NULL)
    );

CREATE POLICY client_isolation_policy_update ON "ProductCategory" FOR UPDATE
    USING (
        validate_client("clientId")
        OR (get_current_scope() IN ('SYSTEM', 'GLOBAL') AND "clientId" IS NULL)
    )
    WITH CHECK (
        validate_client("clientId")
        OR (get_current_scope() IN ('SYSTEM', 'GLOBAL') AND "clientId" IS NULL)
    );

CREATE POLICY client_isolation_policy_delete ON "ProductCategory" FOR DELETE
    USING (
        validate_client("clientId")
        OR (get_current_scope() IN ('SYSTEM', 'GLOBAL') AND "clientId" IS NULL)
    );

CREATE POLICY bypass_rls_policy ON "ProductCategory"
    USING (should_bypass_rls());
