-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL,
    "createdOn" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedOn" TIMESTAMPTZ NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "assetQuestionId" TEXT,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "File_assetQuestionId_key" ON "File"("assetQuestionId");

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_assetQuestionId_fkey" FOREIGN KEY ("assetQuestionId") REFERENCES "AssetQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
