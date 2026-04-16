/*
  Warnings:

  - You are about to drop the column `retryCount` on the `Command` table. All the data in the column will be lost.
  - The `status` column on the `Command` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `type` on the `Command` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('CONNECTED', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "CommandStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'ERROR');

-- CreateEnum
CREATE TYPE "CommandType" AS ENUM ('SYNC_MEMBERSHIP', 'DELETE_USER');

-- AlterTable
ALTER TABLE "Command" DROP COLUMN "retryCount",
ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
DROP COLUMN "type",
ADD COLUMN     "type" "CommandType" NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "CommandStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Device" ADD COLUMN     "lastConnectionAt" TIMESTAMP(3),
ADD COLUMN     "status" "DeviceStatus" NOT NULL DEFAULT 'DISCONNECTED';

-- CreateIndex
CREATE INDEX "Command_status_idx" ON "Command"("status");
