-- AlterTable
ALTER TABLE "AnsiCategory" ADD COLUMN     "color" TEXT,
ALTER COLUMN "description" DROP NOT NULL;
