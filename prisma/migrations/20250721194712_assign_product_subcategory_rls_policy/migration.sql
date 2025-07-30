-- Enable Row Level Security
ALTER TABLE "ProductSubcategory" ENABLE ROW LEVEL SECURITY;

-- Force Row Level Security for table owners
ALTER TABLE "ProductSubcategory" FORCE ROW LEVEL SECURITY;

-- For product tables, rows without a particular client id attached are readable by all.
CREATE POLICY client_isolation_policy_select ON "ProductSubcategory" FOR SELECT USING ("clientId" IS NULL OR validate_client("clientId"));
CREATE POLICY client_isolation_policy_insert ON "ProductSubcategory" FOR INSERT WITH CHECK (validate_client("clientId"));
CREATE POLICY client_isolation_policy_update ON "ProductSubcategory" FOR UPDATE USING (validate_client("clientId")) WITH CHECK (validate_client("clientId"));

-- Create policies to bypass RLS
CREATE POLICY bypass_rls_policy ON "ProductSubcategory" USING (should_bypass_rls());
