-- DropForeignKey
ALTER TABLE "Alert" DROP CONSTRAINT "Alert_inspectionId_fkey";

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
