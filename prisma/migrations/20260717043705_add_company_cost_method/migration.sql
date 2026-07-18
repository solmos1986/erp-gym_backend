-- CreateEnum
CREATE TYPE "CostMethod" AS ENUM ('WEIGHTED_AVERAGE', 'FIFO', 'STANDARD');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "costMethod" "CostMethod" NOT NULL DEFAULT 'WEIGHTED_AVERAGE';
