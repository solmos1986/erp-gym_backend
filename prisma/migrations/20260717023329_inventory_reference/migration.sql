-- CreateEnum
CREATE TYPE "InventoryReferenceType" AS ENUM ('INITIAL_STOCK', 'PURCHASE', 'SALE', 'PRODUCTION_ORDER', 'ADJUSTMENT', 'TRANSFER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InventoryMovementType" ADD VALUE 'PRODUCTION_IN';
ALTER TYPE "InventoryMovementType" ADD VALUE 'PRODUCTION_OUT';

-- AlterTable
ALTER TABLE "InventoryMovement" ADD COLUMN     "referenceId" TEXT,
ADD COLUMN     "referenceType" "InventoryReferenceType";

-- CreateIndex
CREATE INDEX "InventoryMovement_referenceType_referenceId_idx" ON "InventoryMovement"("referenceType", "referenceId");
