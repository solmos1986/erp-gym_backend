/*
  Warnings:

  - You are about to drop the column `imageUrl` on the `Partner` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "CommandType" ADD VALUE 'SYNC_FACE';

-- DropIndex
DROP INDEX "Partner_companyId_document_key";

-- AlterTable
ALTER TABLE "Agent" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Partner" DROP COLUMN "imageUrl",
ALTER COLUMN "createdAt" DROP DEFAULT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(6);

-- CreateIndex
CREATE INDEX "Agent_companyId_idx" ON "Agent"("companyId");

-- CreateIndex
CREATE INDEX "Agent_branchId_idx" ON "Agent"("branchId");

-- CreateIndex
CREATE INDEX "Command_branchId_status_idx" ON "Command"("branchId", "status");
