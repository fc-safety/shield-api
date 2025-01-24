-- AlterTable
ALTER TABLE "Tag" ALTER COLUMN "siteId" SET DEFAULT current_setting('app.current_site_id'::text, TRUE),
ALTER COLUMN "clientId" SET DEFAULT current_setting('app.current_client_id'::text, TRUE);
