/*
  Warnings:

  - You are about to drop the column `clientId` on the `InspectionRoutePoint` table. All the data in the column will be lost.
  - You are about to drop the column `siteId` on the `InspectionRoutePoint` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "InspectionRoutePoint" DROP CONSTRAINT "InspectionRoutePoint_clientId_fkey";

-- DropForeignKey
ALTER TABLE "InspectionRoutePoint" DROP CONSTRAINT "InspectionRoutePoint_siteId_fkey";

-- AlterTable
ALTER TABLE "InspectionRoutePoint" DROP COLUMN "clientId",
DROP COLUMN "siteId";

-- RLS
-- Enable Row Level Security
ALTER TABLE "InspectionRoute" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InspectionSession" ENABLE ROW LEVEL SECURITY;
-- Force Row Level Security for table owners
ALTER TABLE "InspectionRoute" FORCE ROW LEVEL SECURITY;
ALTER TABLE "InspectionSession" FORCE ROW LEVEL SECURITY;
-- Create row security policies
CREATE POLICY client_isolation_policy ON "InspectionRoute" USING (validate_client("clientId") AND validate_site("siteId"));
CREATE POLICY client_isolation_policy ON "InspectionSession" USING (validate_client("clientId") AND validate_site("siteId"));
-- Create policies to bypass RLS
CREATE POLICY bypass_rls_policy ON "InspectionRoute" USING (should_bypass_rls());
CREATE POLICY bypass_rls_policy ON "InspectionSession" USING (should_bypass_rls());
