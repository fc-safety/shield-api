-- DropForeignKey
ALTER TABLE "Site" DROP CONSTRAINT "Site_clientId_fkey";

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
