/*
  Warnings:

  - You are about to drop the column `logoUrl` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "logoUrl" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "logoUrl";
