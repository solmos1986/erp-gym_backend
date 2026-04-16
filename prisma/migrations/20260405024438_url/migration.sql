/*
  Warnings:

  - The primary key for the `Partner` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "Membership" DROP CONSTRAINT "Membership_partnerId_fkey";

-- AlterTable
ALTER TABLE "Membership" ALTER COLUMN "partnerId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Partner" DROP CONSTRAINT "Partner_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Partner_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Partner_id_seq";

-- CreateTable
CREATE TABLE "PartnerImage" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "url" TEXT,
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PartnerImage_partnerId_idx" ON "PartnerImage"("partnerId");

-- AddForeignKey
ALTER TABLE "PartnerImage" ADD CONSTRAINT "PartnerImage_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
