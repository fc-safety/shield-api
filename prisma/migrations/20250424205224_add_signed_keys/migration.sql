-- CreateTable
CREATE TABLE "SigningKey" (
    "id" TEXT NOT NULL,
    "createdOn" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "keyId" TEXT NOT NULL,
    "keySecret" TEXT NOT NULL,
    "expiredOn" TIMESTAMPTZ,

    CONSTRAINT "SigningKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SigningKey_keyId_key" ON "SigningKey"("keyId");

-- CreateIndex
CREATE UNIQUE INDEX "SigningKey_keySecret_key" ON "SigningKey"("keySecret");
