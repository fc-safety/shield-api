-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "email" TEXT,
    "roleId" TEXT,
    "siteId" TEXT,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresOn" TIMESTAMPTZ NOT NULL,
    "acceptedById" TEXT,
    "acceptedOn" TIMESTAMPTZ,
    "createdOn" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedOn" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_code_key" ON "Invitation"("code");

-- CreateIndex
CREATE INDEX "Invitation_clientId_idx" ON "Invitation"("clientId");

-- CreateIndex
CREATE INDEX "Invitation_code_idx" ON "Invitation"("code");

-- CreateIndex
CREATE INDEX "Invitation_status_idx" ON "Invitation"("status");

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;
