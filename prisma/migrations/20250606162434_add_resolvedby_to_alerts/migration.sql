-- AlterTable
ALTER TABLE "Alert" ADD COLUMN     "resolvedById" TEXT;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
