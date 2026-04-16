/*
  Warnings:

  - A unique constraint covering the columns `[name,companyId]` on the table `Branch` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Branch_companyId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "Branch_name_companyId_key" ON "Branch"("name", "companyId");
