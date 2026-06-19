-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "businessTemplateId" TEXT;

-- CreateTable
CREATE TABLE "BusinessTemplate" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessTemplatePermission" (
    "id" TEXT NOT NULL,
    "businessTemplateId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "BusinessTemplatePermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessTemplate_code_key" ON "BusinessTemplate"("code");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessTemplatePermission_businessTemplateId_permissionId_key" ON "BusinessTemplatePermission"("businessTemplateId", "permissionId");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_businessTemplateId_fkey" FOREIGN KEY ("businessTemplateId") REFERENCES "BusinessTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessTemplatePermission" ADD CONSTRAINT "BusinessTemplatePermission_businessTemplateId_fkey" FOREIGN KEY ("businessTemplateId") REFERENCES "BusinessTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessTemplatePermission" ADD CONSTRAINT "BusinessTemplatePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
