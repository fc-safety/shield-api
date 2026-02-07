CREATE OR REPLACE FUNCTION get_current_scope() RETURNS TEXT AS $$
BEGIN
    RETURN current_setting('app.current_user_scope', TRUE)::TEXT;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION restrict_self() RETURNS BOOLEAN AS $$
DECLARE
    current_scope TEXT;
    current_visibility TEXT;
BEGIN
    -- Try scope first (new system)
    current_scope := get_current_scope();
    IF current_scope IS NOT NULL AND current_scope != '' THEN
        RETURN current_scope = 'SELF';
    END IF;

    -- Default to restricted
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql STABLE;

-- Update validate_site function to support multi-client access with new scope property
CREATE OR REPLACE FUNCTION validate_site(site_id TEXT) RETURNS BOOLEAN AS $$
DECLARE
    current_scope TEXT;
    current_visibility TEXT;
    current_client_id TEXT;
    current_site_id TEXT;
    allowed_site_ids TEXT[];
BEGIN
    current_client_id := current_setting('app.current_client_id', TRUE)::TEXT;
    current_site_id := current_setting('app.current_site_id', TRUE)::TEXT;

    -- Parse allowed_site_ids
    BEGIN
        allowed_site_ids := string_to_array(current_setting('app.allowed_site_ids', TRUE), ',')::TEXT[];
    EXCEPTION WHEN OTHERS THEN
        allowed_site_ids := '{}';
    END;

    -- Try scope first (new system)
    current_scope := get_current_scope();
    IF current_scope IS NOT NULL AND current_scope != '' THEN
        -- SYSTEM and GLOBAL can access everything, CLIENT can access any site in their client
        IF current_scope IN ('SYSTEM', 'GLOBAL', 'CLIENT') THEN
            RETURN TRUE;
        END IF;

        -- SITE_GROUP can access allowed sites
        IF current_scope = 'SITE_GROUP' THEN
            RETURN site_id = current_site_id OR site_id = ANY(allowed_site_ids);
        END IF;

        -- SITE and SELF can only access their assigned site
        IF current_scope IN ('SITE', 'SELF') THEN
            RETURN site_id = current_site_id;
        END IF;

        RETURN FALSE;
    END IF;

    -- Default: only allow assigned site
    RETURN site_id = current_site_id;
END;
$$ LANGUAGE plpgsql STABLE;


-- Fix Person RLS policy to support multi-client access
-- Previously, the Person SELECT policy only allowed visibility when Person.clientId
-- matched the current client. This broke multi-client access where a Person's primary
-- client differs from the client they have access to via PersonClientAccess.

-- Drop the existing Person SELECT policy
DROP POLICY IF EXISTS client_isolation_policy ON "Person";
DROP POLICY IF EXISTS client_isolation_policy_select ON "Person";

-- Create updated SELECT policy that allows visibility when:
-- - Person has access to the current client via PersonClientAccess
CREATE POLICY client_isolation_policy ON "Person"
    USING (
        EXISTS (
            SELECT 1 FROM "PersonClientAccess" pca
            WHERE pca."personId" = "Person"."id"
            AND validate_client(pca."clientId")
        )
    );


-- CreateEnum
CREATE TYPE "RoleScope" AS ENUM ('SYSTEM', 'GLOBAL', 'CLIENT', 'SITE_GROUP', 'SITE', 'SELF');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- DropForeignKey
ALTER TABLE "Person" DROP CONSTRAINT "Person_clientId_fkey";

-- DropForeignKey
ALTER TABLE "Person" DROP CONSTRAINT "Person_siteId_fkey";

-- DropIndex
DROP INDEX "Person_clientId_idx";

-- DropIndex
DROP INDEX "Person_clientId_siteId_idx";

-- AlterTable
ALTER TABLE "Person" DROP COLUMN "clientId",
DROP COLUMN "siteId",
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "phoneNumber" TEXT,
ADD COLUMN     "position" TEXT;

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "createdOn" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedOn" TIMESTAMPTZ NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "clientAssignable" BOOLEAN NOT NULL DEFAULT false,
    "notificationGroups" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "scope" "RoleScope" NOT NULL DEFAULT 'SITE',
    "capabilities" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonClientAccess" (
    "id" TEXT NOT NULL,
    "createdOn" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedOn" TIMESTAMPTZ NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "personId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "PersonClientAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresOn" TIMESTAMPTZ NOT NULL,
    "acceptedById" TEXT,
    "acceptedOn" TIMESTAMPTZ,
    "createdOn" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedOn" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE INDEX "PersonClientAccess_personId_idx" ON "PersonClientAccess"("personId");

-- CreateIndex
CREATE INDEX "PersonClientAccess_clientId_idx" ON "PersonClientAccess"("clientId");

-- CreateIndex
CREATE INDEX "PersonClientAccess_siteId_idx" ON "PersonClientAccess"("siteId");

-- CreateIndex
CREATE INDEX "PersonClientAccess_clientId_siteId_idx" ON "PersonClientAccess"("clientId", "siteId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonClientAccess_personId_clientId_siteId_roleId_key" ON "PersonClientAccess"("personId", "clientId", "siteId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_code_key" ON "Invitation"("code");

-- CreateIndex
CREATE INDEX "Invitation_clientId_idx" ON "Invitation"("clientId");

-- CreateIndex
CREATE INDEX "Invitation_code_idx" ON "Invitation"("code");

-- CreateIndex
CREATE INDEX "Invitation_status_idx" ON "Invitation"("status");

-- AddForeignKey
ALTER TABLE "PersonClientAccess" ADD CONSTRAINT "PersonClientAccess_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonClientAccess" ADD CONSTRAINT "PersonClientAccess_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonClientAccess" ADD CONSTRAINT "PersonClientAccess_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonClientAccess" ADD CONSTRAINT "PersonClientAccess_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- RLS policies for PersonClientAccess
-- Can only manage access for clients you belong to
CREATE POLICY client_isolation_policy ON "PersonClientAccess" USING (validate_client("clientId"));

-- Can only manage invitations for clients you belong to
CREATE POLICY client_isolation_policy ON "Invitation" USING (validate_client("clientId"));

-- Bypass RLS policies for new tables
CREATE POLICY bypass_rls_policy ON "PersonClientAccess" USING (should_bypass_rls());
CREATE POLICY bypass_rls_policy ON "Invitation" USING (should_bypass_rls());
