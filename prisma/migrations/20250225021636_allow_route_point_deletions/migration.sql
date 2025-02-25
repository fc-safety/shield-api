SELECT set_config('app.bypass_rls', 'on', TRUE);

-- DropForeignKey
ALTER TABLE "CompletedInspectionRoutePoint" DROP CONSTRAINT "CompletedInspectionRoutePoint_inspectionId_fkey";

-- DropForeignKey
ALTER TABLE "CompletedInspectionRoutePoint" DROP CONSTRAINT "CompletedInspectionRoutePoint_inspectionRoutePointId_fkey";

-- DropForeignKey
ALTER TABLE "CompletedInspectionRoutePoint" DROP CONSTRAINT "CompletedInspectionRoutePoint_inspectionSessionId_fkey";

-- AddForeignKey
ALTER TABLE "CompletedInspectionRoutePoint" ADD CONSTRAINT "CompletedInspectionRoutePoint_inspectionSessionId_fkey" FOREIGN KEY ("inspectionSessionId") REFERENCES "InspectionSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompletedInspectionRoutePoint" ADD CONSTRAINT "CompletedInspectionRoutePoint_inspectionRoutePointId_fkey" FOREIGN KEY ("inspectionRoutePointId") REFERENCES "InspectionRoutePoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompletedInspectionRoutePoint" ADD CONSTRAINT "CompletedInspectionRoutePoint_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

SELECT set_config('app.bypass_rls', 'off', TRUE);