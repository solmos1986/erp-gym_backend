/*
  Warnings:

  - You are about to drop the column `branchId` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `costPrice` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `currentStock` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `maxStock` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `minStock` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `reorderPoint` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `salePrice` on the `Product` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_branchId_fkey";

-- DropIndex
DROP INDEX "Product_branchId_idx";

-- AlterTable
ALTER TABLE "InventoryMovement" ADD COLUMN     "totalCost" DECIMAL(18,6) NOT NULL DEFAULT 0,
ADD COLUMN     "unitCost" DECIMAL(18,6) NOT NULL DEFAULT 0,
ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(18,6);

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "branchId",
DROP COLUMN "costPrice",
DROP COLUMN "currentStock",
DROP COLUMN "maxStock",
DROP COLUMN "minStock",
DROP COLUMN "reorderPoint",
DROP COLUMN "salePrice";

-- CreateTable
CREATE TABLE "ProductBranch" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "currentStock" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "costPrice" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "salePrice" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "minStock" DECIMAL(18,6),
    "maxStock" DECIMAL(18,6),
    "reorderPoint" DECIMAL(18,6),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductBranch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductBranch_companyId_idx" ON "ProductBranch"("companyId");

-- CreateIndex
CREATE INDEX "ProductBranch_branchId_idx" ON "ProductBranch"("branchId");

-- CreateIndex
CREATE INDEX "ProductBranch_productId_idx" ON "ProductBranch"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductBranch_branchId_productId_key" ON "ProductBranch"("branchId", "productId");

-- AddForeignKey
ALTER TABLE "ProductBranch" ADD CONSTRAINT "ProductBranch_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductBranch" ADD CONSTRAINT "ProductBranch_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductBranch" ADD CONSTRAINT "ProductBranch_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
