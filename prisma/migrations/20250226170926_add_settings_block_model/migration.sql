-- CreateTable
CREATE TABLE "SettingsBlock" (
    "id" TEXT NOT NULL,
    "createdOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedOn" TIMESTAMP(3) NOT NULL,
    "friendlyId" TEXT NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "SettingsBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SettingsBlock_friendlyId_key" ON "SettingsBlock"("friendlyId");
