/*
  Warnings:

  - You are about to drop the column `costPrice` on the `ProductBranch` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ProductBranch" DROP COLUMN "costPrice",
ADD COLUMN     "unitCost" DECIMAL(18,6) NOT NULL DEFAULT 0;
