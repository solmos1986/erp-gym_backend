/*
  Warnings:

  - You are about to drop the column `saleId` on the `Payment` table. All the data in the column will be lost.
  - Added the required column `description` to the `PurchaseDetail` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unitCost` to the `SaleDetail` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "InventoryMovementType" ADD VALUE 'PURCHASE_CANCEL';

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_saleId_fkey";

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "saleId";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "minStock" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "PurchaseDetail" ADD COLUMN     "code" TEXT,
ADD COLUMN     "description" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "SaleDetail" ADD COLUMN     "unitCost" DECIMAL(10,2) NOT NULL;

-- CreateIndex
CREATE INDEX "Purchase_companyId_idx" ON "Purchase"("companyId");

-- CreateIndex
CREATE INDEX "Purchase_branchId_idx" ON "Purchase"("branchId");

-- CreateIndex
CREATE INDEX "Purchase_supplierId_idx" ON "Purchase"("supplierId");

-- CreateIndex
CREATE INDEX "Purchase_purchaseDate_idx" ON "Purchase"("purchaseDate");

-- CreateIndex
CREATE INDEX "Purchase_status_idx" ON "Purchase"("status");

-- CreateIndex
CREATE INDEX "PurchaseDetail_purchaseId_idx" ON "PurchaseDetail"("purchaseId");

-- CreateIndex
CREATE INDEX "PurchaseDetail_productId_idx" ON "PurchaseDetail"("productId");

-- CreateIndex
CREATE INDEX "Sale_status_idx" ON "Sale"("status");
