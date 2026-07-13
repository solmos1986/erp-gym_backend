-- CreateTable
CREATE TABLE "ProductBom" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductBom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductBomItem" (
    "id" TEXT NOT NULL,
    "bomId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "wastePercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductBomItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductBom_companyId_idx" ON "ProductBom"("companyId");

-- CreateIndex
CREATE INDEX "ProductBom_productId_idx" ON "ProductBom"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductBom_productId_version_key" ON "ProductBom"("productId", "version");

-- CreateIndex
CREATE INDEX "ProductBomItem_bomId_idx" ON "ProductBomItem"("bomId");

-- CreateIndex
CREATE INDEX "ProductBomItem_materialId_idx" ON "ProductBomItem"("materialId");

-- AddForeignKey
ALTER TABLE "ProductBom" ADD CONSTRAINT "ProductBom_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductBom" ADD CONSTRAINT "ProductBom_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductBomItem" ADD CONSTRAINT "ProductBomItem_bomId_fkey" FOREIGN KEY ("bomId") REFERENCES "ProductBom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductBomItem" ADD CONSTRAINT "ProductBomItem_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
