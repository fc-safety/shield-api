/*
  Warnings:

  - The values [PRODUCT_SUBCATEGORY] on the enum `AssetQuestionConditionType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `productSubcategoryId` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the `ProductSubcategory` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."AssetQuestionConditionType_new" AS ENUM ('REGION', 'MANUFACTURER', 'PRODUCT_CATEGORY', 'PRODUCT', 'METADATA');
ALTER TABLE "public"."AssetQuestionCondition" ALTER COLUMN "conditionType" TYPE "public"."AssetQuestionConditionType_new" USING ("conditionType"::text::"public"."AssetQuestionConditionType_new");
ALTER TYPE "public"."AssetQuestionConditionType" RENAME TO "AssetQuestionConditionType_old";
ALTER TYPE "public"."AssetQuestionConditionType_new" RENAME TO "AssetQuestionConditionType";
DROP TYPE "public"."AssetQuestionConditionType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."Product" DROP CONSTRAINT "Product_productSubcategoryId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ProductSubcategory" DROP CONSTRAINT "ProductSubcategory_clientId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ProductSubcategory" DROP CONSTRAINT "ProductSubcategory_productCategoryId_fkey";

-- AlterTable
ALTER TABLE "public"."Product" DROP COLUMN "productSubcategoryId";

-- DropTable
DROP TABLE "public"."ProductSubcategory";
