-- AlterEnum
ALTER TYPE "public"."AssetQuestionResponseType" ADD VALUE 'SELECT';

-- AlterTable
ALTER TABLE "public"."AssetQuestion" ADD COLUMN     "selectOptions" JSONB;

-- CreateTable
CREATE TABLE "public"."RegulatoryCode" (
    "id" TEXT NOT NULL,
    "createdOn" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedOn" TIMESTAMPTZ NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "codeIdentifier" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "section" TEXT,
    "governingBody" TEXT NOT NULL,
    "jurisdiction" TEXT,
    "description" TEXT,
    "requirements" TEXT,
    "sourceUrl" TEXT,
    "documentVersion" TEXT,
    "effectiveDate" TIMESTAMP(3),
    "supersededDate" TIMESTAMP(3),
    "inspectionFrequency" TEXT,
    "complianceNotes" TEXT,

    CONSTRAINT "RegulatoryCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_AssetQuestionToRegulatoryCode" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AssetQuestionToRegulatoryCode_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "RegulatoryCode_governingBody_idx" ON "public"."RegulatoryCode"("governingBody");

-- CreateIndex
CREATE INDEX "RegulatoryCode_active_idx" ON "public"."RegulatoryCode"("active");

-- CreateIndex
CREATE UNIQUE INDEX "RegulatoryCode_codeIdentifier_section_key" ON "public"."RegulatoryCode"("codeIdentifier", "section");

-- CreateIndex
CREATE INDEX "_AssetQuestionToRegulatoryCode_B_index" ON "public"."_AssetQuestionToRegulatoryCode"("B");

-- AddForeignKey
ALTER TABLE "public"."_AssetQuestionToRegulatoryCode" ADD CONSTRAINT "_AssetQuestionToRegulatoryCode_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."AssetQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_AssetQuestionToRegulatoryCode" ADD CONSTRAINT "_AssetQuestionToRegulatoryCode_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."RegulatoryCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
