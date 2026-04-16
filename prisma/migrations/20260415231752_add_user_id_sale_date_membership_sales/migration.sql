-- AlterTable
ALTER TABLE "MembershipSale" ADD COLUMN     "saleDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "userId" TEXT;

-- AddForeignKey
ALTER TABLE "MembershipSale" ADD CONSTRAINT "MembershipSale_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
