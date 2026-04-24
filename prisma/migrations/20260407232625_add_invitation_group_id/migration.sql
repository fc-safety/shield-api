-- AlterTable
ALTER TABLE "Invitation" ADD COLUMN     "groupId" TEXT;

-- CreateIndex
CREATE INDEX "Invitation_groupId_idx" ON "Invitation"("groupId");
