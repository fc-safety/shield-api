-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "createdOn" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedOn" TIMESTAMPTZ NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "clientId" TEXT,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "createdOn" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "permission" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE INDEX "Role_clientId_idx" ON "Role"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_clientId_key" ON "Role"("name", "clientId");

-- CreateIndex
CREATE INDEX "RolePermission_roleId_idx" ON "RolePermission"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_permission_key" ON "RolePermission"("roleId", "permission");

-- CreateIndex
CREATE INDEX "PersonClientAccess_personId_idx" ON "PersonClientAccess"("personId");

-- CreateIndex
CREATE INDEX "PersonClientAccess_clientId_idx" ON "PersonClientAccess"("clientId");

-- CreateIndex
CREATE INDEX "PersonClientAccess_siteId_idx" ON "PersonClientAccess"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonClientAccess_personId_clientId_key" ON "PersonClientAccess"("personId", "clientId");

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonClientAccess" ADD CONSTRAINT "PersonClientAccess_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonClientAccess" ADD CONSTRAINT "PersonClientAccess_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonClientAccess" ADD CONSTRAINT "PersonClientAccess_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonClientAccess" ADD CONSTRAINT "PersonClientAccess_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Enable Row Level Security on new tables
ALTER TABLE "Role" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RolePermission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PersonClientAccess" ENABLE ROW LEVEL SECURITY;

-- Force Row Level Security for table owners
ALTER TABLE "Role" FORCE ROW LEVEL SECURITY;
ALTER TABLE "RolePermission" FORCE ROW LEVEL SECURITY;
ALTER TABLE "PersonClientAccess" FORCE ROW LEVEL SECURITY;

-- RLS policies for Role
-- Global roles (clientId IS NULL) are readable by all, client-specific roles only by that client
CREATE POLICY client_isolation_policy_select ON "Role" FOR SELECT USING (
    "clientId" IS NULL OR validate_client("clientId")
);
CREATE POLICY client_isolation_policy_insert ON "Role" FOR INSERT WITH CHECK (
    validate_client("clientId")
);
CREATE POLICY client_isolation_policy_update ON "Role" FOR UPDATE USING (
    validate_client("clientId")
) WITH CHECK (
    validate_client("clientId")
);
CREATE POLICY client_isolation_policy_delete ON "Role" FOR DELETE USING (
    validate_client("clientId") AND "isSystem" = false
);

-- RLS policies for RolePermission (follows Role access)
CREATE POLICY client_isolation_policy_select ON "RolePermission" FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM "Role" WHERE "Role"."id" = "roleId" AND ("Role"."clientId" IS NULL OR validate_client("Role"."clientId"))
    )
);
CREATE POLICY client_isolation_policy_insert ON "RolePermission" FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM "Role" WHERE "Role"."id" = "roleId" AND validate_client("Role"."clientId")
    )
);
CREATE POLICY client_isolation_policy_update ON "RolePermission" FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM "Role" WHERE "Role"."id" = "roleId" AND validate_client("Role"."clientId")
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM "Role" WHERE "Role"."id" = "roleId" AND validate_client("Role"."clientId")
    )
);
CREATE POLICY client_isolation_policy_delete ON "RolePermission" FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM "Role" WHERE "Role"."id" = "roleId" AND validate_client("Role"."clientId")
    )
);

-- RLS policies for PersonClientAccess
-- Can only manage access for clients you belong to
CREATE POLICY client_isolation_policy_select ON "PersonClientAccess" FOR SELECT USING (
    validate_client("clientId")
);
CREATE POLICY client_isolation_policy_insert ON "PersonClientAccess" FOR INSERT WITH CHECK (
    validate_client("clientId")
);
CREATE POLICY client_isolation_policy_update ON "PersonClientAccess" FOR UPDATE USING (
    validate_client("clientId")
) WITH CHECK (
    validate_client("clientId")
);
CREATE POLICY client_isolation_policy_delete ON "PersonClientAccess" FOR DELETE USING (
    validate_client("clientId")
);

-- Bypass RLS policies for new tables
CREATE POLICY bypass_rls_policy ON "Role" USING (should_bypass_rls());
CREATE POLICY bypass_rls_policy ON "RolePermission" USING (should_bypass_rls());
CREATE POLICY bypass_rls_policy ON "PersonClientAccess" USING (should_bypass_rls());
