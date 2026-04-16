/*
  Warnings:

  - A unique constraint covering the columns `[branchId,name]` on the table `Agent` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[branchId,ip]` on the table `Device` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Command" ADD COLUMN     "retryCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "Agent_branchId_name_key" ON "Agent"("branchId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Device_branchId_ip_key" ON "Device"("branchId", "ip");
