/*
  Warnings:

  - You are about to drop the column `type` on the `InventoryMovement` table. All the data in the column will be lost.
  - Added the required column `movementType` to the `InventoryMovement` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InventoryMovementType" ADD VALUE 'TRANSFER_IN';
ALTER TYPE "InventoryMovementType" ADD VALUE 'TRANSFER_OUT';

-- AlterTable
ALTER TABLE "InventoryMovement"
DROP COLUMN "type";

ALTER TABLE "InventoryMovement"
ADD COLUMN "createdById" TEXT;

ALTER TABLE "InventoryMovement"
ADD COLUMN "movementType" "InventoryMovementType";

-- CreateIndex
CREATE INDEX "InventoryMovement_createdAt_idx" ON "InventoryMovement"("createdAt");

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
