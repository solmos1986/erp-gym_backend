-- AlterTable
ALTER TABLE "Command" ADD COLUMN     "membershipSaleId" TEXT;

-- CreateIndex
CREATE INDEX "Command_membershipSaleId_idx" ON "Command"("membershipSaleId");

-- AddForeignKey
ALTER TABLE "Command" ADD CONSTRAINT "Command_membershipSaleId_fkey" FOREIGN KEY ("membershipSaleId") REFERENCES "MembershipSale"("id") ON DELETE SET NULL ON UPDATE CASCADE;
