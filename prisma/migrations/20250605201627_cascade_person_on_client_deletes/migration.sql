-- DropForeignKey
ALTER TABLE "Person" DROP CONSTRAINT "Person_clientId_fkey";

-- DropForeignKey
ALTER TABLE "Person" DROP CONSTRAINT "Person_siteId_fkey";

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
