-- AlterTable
ALTER TABLE "MembershipSale" ADD COLUMN     "branchId" TEXT;

-- AddForeignKey
ALTER TABLE "MembershipSale" ADD CONSTRAINT "MembershipSale_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
