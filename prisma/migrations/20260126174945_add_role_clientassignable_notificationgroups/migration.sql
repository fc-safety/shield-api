-- AlterTable
ALTER TABLE "Role" ADD COLUMN     "clientAssignable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notificationGroups" TEXT[] DEFAULT ARRAY[]::TEXT[];
