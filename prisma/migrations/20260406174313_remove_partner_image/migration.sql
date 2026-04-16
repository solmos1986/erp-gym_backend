/*
  Warnings:

  - You are about to drop the `PartnerImage` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "PartnerImage" DROP CONSTRAINT "PartnerImage_partnerId_fkey";

-- AlterTable
ALTER TABLE "Partner" ADD COLUMN     "imageUrl" TEXT;

-- DropTable
DROP TABLE "PartnerImage";
