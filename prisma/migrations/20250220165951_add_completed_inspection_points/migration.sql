/*
  Warnings:

  - You are about to drop the column `lastCompletedRoutePointId` on the `InspectionSession` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "InspectionSession" DROP CONSTRAINT "InspectionSession_lastCompletedRoutePointId_fkey";

-- AlterTable
ALTER TABLE "InspectionSession" DROP COLUMN "lastCompletedRoutePointId";

-- CreateTable
CREATE TABLE "CompletedInspectionRoutePoint" (
    "id" TEXT NOT NULL,
    "createdOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedOn" TIMESTAMP(3) NOT NULL,
    "inspectionSessionId" TEXT NOT NULL,
    "inspectionRoutePointId" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,

    CONSTRAINT "CompletedInspectionRoutePoint_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CompletedInspectionRoutePoint" ADD CONSTRAINT "CompletedInspectionRoutePoint_inspectionSessionId_fkey" FOREIGN KEY ("inspectionSessionId") REFERENCES "InspectionSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompletedInspectionRoutePoint" ADD CONSTRAINT "CompletedInspectionRoutePoint_inspectionRoutePointId_fkey" FOREIGN KEY ("inspectionRoutePointId") REFERENCES "InspectionRoutePoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompletedInspectionRoutePoint" ADD CONSTRAINT "CompletedInspectionRoutePoint_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
