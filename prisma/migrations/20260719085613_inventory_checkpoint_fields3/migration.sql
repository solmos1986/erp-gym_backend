-- CreateEnum
CREATE TYPE "InventoryMovementStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'INFO');

-- AlterTable
ALTER TABLE "InventoryMovement" ADD COLUMN     "status" "InventoryMovementStatus" NOT NULL DEFAULT 'ACTIVE';
