-- CreateEnum
CREATE TYPE "InspectionSessionStatus" AS ENUM ('PENDING', 'COMPLETE');

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "inspectionRouteId" TEXT;

-- CreateTable
CREATE TABLE "InspectionRoute" (
    "id" TEXT NOT NULL,
    "createdOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedOn" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "siteId" TEXT NOT NULL DEFAULT current_setting('app.current_site_id'::text),
    "clientId" TEXT NOT NULL DEFAULT current_setting('app.current_client_id'::text),

    CONSTRAINT "InspectionRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionRoutePoint" (
    "id" TEXT NOT NULL,
    "createdOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedOn" TIMESTAMP(3) NOT NULL,
    "order" INTEGER NOT NULL,
    "inspectionRouteId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL DEFAULT current_setting('app.current_site_id'::text),
    "clientId" TEXT NOT NULL DEFAULT current_setting('app.current_client_id'::text),

    CONSTRAINT "InspectionRoutePoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionSession" (
    "id" TEXT NOT NULL,
    "createdOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedOn" TIMESTAMP(3) NOT NULL,
    "status" "InspectionSessionStatus" NOT NULL DEFAULT 'PENDING',
    "inspectionRouteId" TEXT NOT NULL,
    "lastCompletedRoutePointId" TEXT,
    "lastInspectorId" TEXT NOT NULL DEFAULT current_setting('app.current_person_id'::text),
    "siteId" TEXT NOT NULL DEFAULT current_setting('app.current_site_id'::text),
    "clientId" TEXT NOT NULL DEFAULT current_setting('app.current_client_id'::text),

    CONSTRAINT "InspectionSession_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "InspectionRoute" ADD CONSTRAINT "InspectionRoute_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionRoute" ADD CONSTRAINT "InspectionRoute_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionRoutePoint" ADD CONSTRAINT "InspectionRoutePoint_inspectionRouteId_fkey" FOREIGN KEY ("inspectionRouteId") REFERENCES "InspectionRoute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionRoutePoint" ADD CONSTRAINT "InspectionRoutePoint_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionRoutePoint" ADD CONSTRAINT "InspectionRoutePoint_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionRoutePoint" ADD CONSTRAINT "InspectionRoutePoint_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionSession" ADD CONSTRAINT "InspectionSession_inspectionRouteId_fkey" FOREIGN KEY ("inspectionRouteId") REFERENCES "InspectionRoute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionSession" ADD CONSTRAINT "InspectionSession_lastCompletedRoutePointId_fkey" FOREIGN KEY ("lastCompletedRoutePointId") REFERENCES "InspectionRoutePoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionSession" ADD CONSTRAINT "InspectionSession_lastInspectorId_fkey" FOREIGN KEY ("lastInspectorId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionSession" ADD CONSTRAINT "InspectionSession_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionSession" ADD CONSTRAINT "InspectionSession_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
