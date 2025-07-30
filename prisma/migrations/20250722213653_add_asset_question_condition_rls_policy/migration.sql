-- Enable Row Level Security
ALTER TABLE "AssetQuestionCondition" ENABLE ROW LEVEL SECURITY;

-- Force Row Level Security for table owners
ALTER TABLE "AssetQuestionCondition" FORCE ROW LEVEL SECURITY;

-- Create row security policies for AssetQuestionCondition
-- Similar to Product, ProductCategory, and Manufacturer:
CREATE POLICY client_isolation_policy_select ON "AssetQuestionCondition" FOR SELECT USING ("clientId" IS NULL OR validate_client("clientId"));
CREATE POLICY client_isolation_policy_insert ON "AssetQuestionCondition" FOR INSERT WITH CHECK (validate_client("clientId"));
CREATE POLICY client_isolation_policy_update ON "AssetQuestionCondition" FOR UPDATE USING (validate_client("clientId")) WITH CHECK (validate_client("clientId"));
CREATE POLICY client_isolation_policy_delete ON "AssetQuestionCondition" FOR DELETE USING (validate_client("clientId"));

-- Create bypass RLS policy
CREATE POLICY bypass_rls_policy ON "AssetQuestionCondition" USING (should_bypass_rls());
