/*
  Warnings:

  - Made the column `originalPrompt` on table `AssetQuestionResponse` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."AssetQuestionResponse" ALTER COLUMN "originalPrompt" SET NOT NULL;
