/*
  Warnings:

  - You are about to drop the `UserBranch` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[name]` on the table `Company` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `branchId` to the `User` table without a default value. This is not possible if the table is not empty.
  - Made the column `companyId` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_companyId_fkey";

-- DropForeignKey
ALTER TABLE "UserBranch" DROP CONSTRAINT "UserBranch_branchId_fkey";

-- DropForeignKey
ALTER TABLE "UserBranch" DROP CONSTRAINT "UserBranch_userId_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "branchId" TEXT NOT NULL,
ALTER COLUMN "companyId" SET NOT NULL;

-- DropTable
DROP TABLE "UserBranch";

-- CreateIndex
CREATE UNIQUE INDEX "Company_name_key" ON "Company"("name");

-- CreateIndex
CREATE INDEX "User_branchId_idx" ON "User"("branchId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
