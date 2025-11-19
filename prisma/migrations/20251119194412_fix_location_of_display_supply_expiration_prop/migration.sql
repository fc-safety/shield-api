/*
  Warnings:

  - You are about to drop the column `displayExpirationDate` on the `Consumable` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Consumable" DROP COLUMN "displayExpirationDate";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "displayExpirationDate" BOOLEAN NOT NULL DEFAULT false;
