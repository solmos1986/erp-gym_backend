-- AlterTable
ALTER TABLE "Role" ADD COLUMN     "roleTemplateId" TEXT;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_roleTemplateId_fkey" FOREIGN KEY ("roleTemplateId") REFERENCES "RoleTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
