-- AlterTable
ALTER TABLE "AssetQuestion" ADD COLUMN "clientId" TEXT;

-- AddForeignKey
ALTER TABLE "AssetQuestion" ADD CONSTRAINT "AssetQuestion_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RLS
-- Enable Row Level Security
ALTER TABLE "AssetQuestion" ENABLE ROW LEVEL SECURITY;
-- Force Row Level Security for table owners
ALTER TABLE "AssetQuestion" FORCE ROW LEVEL SECURITY;
-- Create row security policies
-- Rows without a particular client id attached are readable by all.
CREATE POLICY client_isolation_policy_select ON "AssetQuestion" FOR SELECT USING ("clientId" IS NULL OR validate_client("clientId"));
CREATE POLICY client_isolation_policy_insert ON "AssetQuestion" FOR INSERT WITH CHECK (validate_client("clientId"));
CREATE POLICY client_isolation_policy_update ON "AssetQuestion" FOR UPDATE USING (validate_client("clientId")) WITH CHECK (validate_client("clientId"));
CREATE POLICY client_isolation_policy_delete ON "AssetQuestion" FOR DELETE USING (validate_client("clientId"));
-- Create policies to bypass RLS
CREATE POLICY bypass_rls_policy ON "AssetQuestion" USING (should_bypass_rls());
