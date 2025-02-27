-- CreateEnum
CREATE TYPE "VaultAccessType" AS ENUM ('PUBLIC', 'CLIENT', 'CLIENT_SITE', 'CLIENT_OWNER', 'STRICT_OWNER');

-- CreateTable
CREATE TABLE "VaultOwnership" (
    "id" TEXT NOT NULL,
    "createdOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedOn" TIMESTAMP(3) NOT NULL,
    "key" TEXT NOT NULL,
    "bucketName" TEXT,
    "accessType" "VaultAccessType" NOT NULL DEFAULT 'CLIENT_OWNER',
    "ownerId" TEXT NOT NULL DEFAULT current_setting('app.current_person_id'::text),
    "siteId" TEXT NOT NULL DEFAULT current_setting('app.current_site_id'::text),
    "clientId" TEXT NOT NULL DEFAULT current_setting('app.current_client_id'::text),

    CONSTRAINT "VaultOwnership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VaultOwnership_key_key" ON "VaultOwnership"("key");

-- AddForeignKey
ALTER TABLE "VaultOwnership" ADD CONSTRAINT "VaultOwnership_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultOwnership" ADD CONSTRAINT "VaultOwnership_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultOwnership" ADD CONSTRAINT "VaultOwnership_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- RLS
-- Enable Row Level Security
ALTER TABLE "VaultOwnership" ENABLE ROW LEVEL SECURITY;
-- Force Row Level Security for table owners
ALTER TABLE "VaultOwnership" FORCE ROW LEVEL SECURITY;
-- Create row security policies
-- policy: allow insertions only for owner
CREATE POLICY client_and_user_isolation_policy_insert ON "VaultOwnership" FOR INSERT WITH CHECK (
    validate_client("clientId") AND validate_site("siteId") AND is_owner("ownerId")
);
-- policy: allow updates only for owner
CREATE POLICY client_and_user_isolation_policy_update ON "VaultOwnership" FOR UPDATE USING (
    validate_client("clientId") AND validate_site("siteId") AND is_owner("ownerId")
);
-- policy: allow selects for owner or owner supervisors depending on access type. This allows
-- access based on the following access types:
-- - PUBLIC: anyone can access
-- - CLIENT: anyone belonging to the client can access
-- - CLIENT_SITE: anyone belonging to the client and site can access
-- - CLIENT_OWNER: owner and owner supervisors within client can access
-- - STRICT_OWNER: only the owner can access
CREATE POLICY client_and_user_isolation_policy_select ON "VaultOwnership" FOR SELECT USING (
    "accessType" = 'PUBLIC' OR (
        validate_client("clientId") AND (
            "accessType" = 'CLIENT' OR (
                validate_site("siteId") AND (
                    "accessType" = 'CLIENT_SITE' OR (
                        ("accessType" = 'CLIENT_OWNER' AND (NOT restrict_self() OR is_owner("ownerId"))) OR
                        ("accessType" = 'STRICT_OWNER' AND is_owner("ownerId"))
                    )
                )
            )
        )
    )
);
-- policy: allow deletes only for owner
CREATE POLICY client_and_user_isolation_policy_delete ON "VaultOwnership" FOR DELETE USING (
    validate_client("clientId") AND validate_site("siteId") AND is_owner("ownerId")
);

-- Create policies to bypass RLS
CREATE POLICY bypass_rls_policy ON "VaultOwnership" USING (should_bypass_rls());
