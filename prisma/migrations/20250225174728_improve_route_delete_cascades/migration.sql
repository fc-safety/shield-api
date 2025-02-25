SELECT set_config('app.bypass_rls', 'on', TRUE);

-- DropForeignKey
ALTER TABLE "InspectionRoutePoint" DROP CONSTRAINT "InspectionRoutePoint_assetId_fkey";

-- DropForeignKey
ALTER TABLE "InspectionRoutePoint" DROP CONSTRAINT "InspectionRoutePoint_inspectionRouteId_fkey";

-- AddForeignKey
ALTER TABLE "InspectionRoutePoint" ADD CONSTRAINT "InspectionRoutePoint_inspectionRouteId_fkey" FOREIGN KEY ("inspectionRouteId") REFERENCES "InspectionRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionRoutePoint" ADD CONSTRAINT "InspectionRoutePoint_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

SELECT set_config('app.bypass_rls', 'off', TRUE);