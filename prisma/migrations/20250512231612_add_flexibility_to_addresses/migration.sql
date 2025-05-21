-- AlterTable
ALTER TABLE "Address" ADD COLUMN     "country" TEXT,
ADD COLUMN     "county" TEXT,
ALTER COLUMN "state" DROP NOT NULL,
ALTER COLUMN "zip" DROP NOT NULL;
