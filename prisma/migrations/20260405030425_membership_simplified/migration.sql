/*
  Warnings:

  - You are about to drop the column `syncedToDevice` on the `Membership` table. All the data in the column will be lost.
  - Added the required column `price` to the `Membership` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED', 'SUSPENDED');

-- AlterTable
ALTER TABLE "Membership" DROP COLUMN "syncedToDevice",
ADD COLUMN     "price" DECIMAL(10,2) NOT NULL;
