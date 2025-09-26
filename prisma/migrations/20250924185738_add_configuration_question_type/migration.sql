-- AlterEnum
ALTER TYPE "public"."AssetQuestionType" ADD VALUE 'CONFIGURATION';

-- AlterTable
ALTER TABLE "public"."Asset" ADD COLUMN     "configured" BOOLEAN NOT NULL DEFAULT true;
