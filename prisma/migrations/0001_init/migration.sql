-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('RAW_MATERIAL', 'FINISHED_PRODUCT', 'SERVICE');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('PURCHASE', 'PRODUCTION', 'BOTH');

-- CreateEnum
CREATE TYPE "Unit" AS ENUM ('UNIT', 'KG', 'GRAM', 'LITER', 'ML', 'BOX', 'PACKAGE', 'BOTTLE', 'METER', 'CM', 'MM', 'PAIR', 'ROLL', 'DOZEN');

-- CreateEnum
CREATE TYPE "AccountingClass" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "AccountNature" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SaleItemType" AS ENUM ('MEMBERSHIP_PLAN', 'PRODUCT', 'SERVICE');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CashRegisterStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "CashMovementType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "CashMovementStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'QR', 'CARD', 'TRANSFER', 'DEPOSIT');

-- CreateEnum
CREATE TYPE "CashReferenceType" AS ENUM ('MANUAL', 'MEMBERSHIP_SALE', 'PRODUCT_SALE', 'PURCHASE', 'CASH_OPENING', 'CASH_CLOSING', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "RoleScope" AS ENUM ('SYSTEM', 'TENANT');

-- CreateEnum
CREATE TYPE "PartnerType" AS ENUM ('CUSTOMER', 'SUPPLIER');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'ANNULLED');

-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('ACCESS_CONTROL', 'CAMERA', 'BIOMETRIC');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('CONNECTED', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "CommandStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'ERROR');

-- CreateEnum
CREATE TYPE "CommandType" AS ENUM ('SYNC_MEMBERSHIP', 'DELETE_USER', 'SYNC_FACE', 'SYNC_USER_FULL');

-- CreateEnum
CREATE TYPE "InventoryMovementType" AS ENUM ('INITIAL_STOCK', 'PURCHASE', 'PURCHASE_CANCEL', 'SALE', 'SALE_CANCEL', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'TRANSFER_IN', 'TRANSFER_OUT');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "logoUrl" TEXT,
    "businessTemplateId" TEXT,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "branchId" TEXT NOT NULL,
    "isOwner" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scope" "RoleScope" NOT NULL,
    "companyId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "roleTemplateId" TEXT,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "scope" "RoleScope" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyPermission" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "companyId" TEXT,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "PartnerType" NOT NULL,
    "name" TEXT NOT NULL,
    "document" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "imageUrl" TEXT,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "port" INTEGER,
    "username" TEXT,
    "password" TEXT,
    "deviceType" "DeviceType" NOT NULL,
    "brand" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "companyId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "agentId" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastConnectionAt" TIMESTAMP(3),
    "status" "DeviceStatus" NOT NULL DEFAULT 'DISCONNECTED',

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(65,30) NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipSale" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "price" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "saleDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "branchId" TEXT,
    "saleId" TEXT,

    CONSTRAINT "MembershipSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerMembership" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "hikvisionUserId" TEXT,
    "deletedFromDevice" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "branchId" TEXT NOT NULL,

    CONSTRAINT "CustomerMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "agentKey" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publicIp" TEXT,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Command" (
    "id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "companyId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executedAt" TIMESTAMP(3),
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "type" "CommandType" NOT NULL,
    "status" "CommandStatus" NOT NULL DEFAULT 'PENDING',
    "membershipSaleId" TEXT,

    CONSTRAINT "Command_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "branchId" TEXT,
    "productCategoryId" TEXT,
    "code" TEXT,
    "barcode" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "productType" "ProductType" NOT NULL DEFAULT 'FINISHED_PRODUCT',
    "sourceType" "SourceType" NOT NULL DEFAULT 'PURCHASE',
    "inventoryControl" BOOLEAN NOT NULL DEFAULT true,
    "unit" "Unit" NOT NULL DEFAULT 'UNIT',
    "currentStock" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "costPrice" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "salePrice" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "minStock" DECIMAL(18,2),
    "maxStock" DECIMAL(18,2),
    "reorderPoint" DECIMAL(18,2),
    "isForSale" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCategory" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryMovement" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "movementType" "InventoryMovementType" NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashRegister" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "openedById" TEXT NOT NULL,
    "closedById" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "openingAmount" DECIMAL(12,2) NOT NULL,
    "expectedAmount" DECIMAL(12,2),
    "countedAmount" DECIMAL(12,2),
    "difference" DECIMAL(12,2),
    "notes" TEXT,
    "status" "CashRegisterStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashRegister_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashMovement" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "cashRegisterId" TEXT NOT NULL,
    "type" "CashMovementType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "CashMovementStatus" NOT NULL DEFAULT 'ACTIVE',
    "description" TEXT,
    "referenceType" "CashReferenceType" NOT NULL,
    "referenceId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),
    "cancelledById" TEXT,

    CONSTRAINT "CashMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "cashMovementId" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "branchId" TEXT,
    "userId" TEXT,
    "saleNumber" INTEGER,
    "customerId" TEXT,
    "saleDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subtotal" DECIMAL(18,2) NOT NULL,
    "discount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,2) NOT NULL,
    "status" "SaleStatus" NOT NULL DEFAULT 'CONFIRMED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cancelledById" TEXT,
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleDetail" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "itemType" "SaleItemType" NOT NULL,
    "itemId" TEXT,
    "code" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(18,2) NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "unitCost" DECIMAL(10,2) NOT NULL,
    "discount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaleDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "userId" TEXT,
    "purchaseNumber" INTEGER,
    "supplierId" TEXT NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subtotal" DECIMAL(18,2) NOT NULL,
    "discount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,2) NOT NULL,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'CONFIRMED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cancelledById" TEXT,
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseDetail" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(18,2) NOT NULL,
    "unitCost" DECIMAL(18,2) NOT NULL,
    "total" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "PurchaseDetail_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "RoleTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "businessTemplateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleTemplatePermission" (
    "id" TEXT NOT NULL,
    "roleTemplateId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "RoleTemplatePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountTemplate" (
    "id" TEXT NOT NULL,
    "businessTemplateId" TEXT,
    "parentId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountingClass" "AccountingClass" NOT NULL,
    "nature" "AccountNature" NOT NULL,
    "allowMovements" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_name_key" ON "Company"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_companyId_idx" ON "User"("companyId");

-- CreateIndex
CREATE INDEX "User_branchId_idx" ON "User"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_scope_companyId_key" ON "Role"("name", "scope", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON "RolePermission"("roleId", "permissionId");

-- CreateIndex
CREATE INDEX "CompanyPermission_companyId_idx" ON "CompanyPermission"("companyId");

-- CreateIndex
CREATE INDEX "CompanyPermission_permissionId_idx" ON "CompanyPermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyPermission_companyId_permissionId_key" ON "CompanyPermission"("companyId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_roleId_companyId_key" ON "UserRole"("userId", "roleId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_name_companyId_key" ON "Branch"("name", "companyId");

-- CreateIndex
CREATE INDEX "Partner_companyId_idx" ON "Partner"("companyId");

-- CreateIndex
CREATE INDEX "Device_companyId_idx" ON "Device"("companyId");

-- CreateIndex
CREATE INDEX "Device_branchId_idx" ON "Device"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "Device_branchId_ip_key" ON "Device"("branchId", "ip");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_name_companyId_key" ON "Plan"("name", "companyId");

-- CreateIndex
CREATE INDEX "MembershipSale_partnerId_idx" ON "MembershipSale"("partnerId");

-- CreateIndex
CREATE INDEX "MembershipSale_endDate_idx" ON "MembershipSale"("endDate");

-- CreateIndex
CREATE INDEX "MembershipSale_saleId_idx" ON "MembershipSale"("saleId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerMembership_customerId_key" ON "CustomerMembership"("customerId");

-- CreateIndex
CREATE INDEX "CustomerMembership_endDate_idx" ON "CustomerMembership"("endDate");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_agentKey_key" ON "Agent"("agentKey");

-- CreateIndex
CREATE INDEX "Agent_companyId_idx" ON "Agent"("companyId");

-- CreateIndex
CREATE INDEX "Agent_branchId_idx" ON "Agent"("branchId");

-- CreateIndex
CREATE INDEX "Agent_publicIp_idx" ON "Agent"("publicIp");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_branchId_name_key" ON "Agent"("branchId", "name");

-- CreateIndex
CREATE INDEX "Command_companyId_idx" ON "Command"("companyId");

-- CreateIndex
CREATE INDEX "Command_branchId_idx" ON "Command"("branchId");

-- CreateIndex
CREATE INDEX "Command_status_idx" ON "Command"("status");

-- CreateIndex
CREATE INDEX "Command_branchId_status_idx" ON "Command"("branchId", "status");

-- CreateIndex
CREATE INDEX "Command_membershipSaleId_idx" ON "Command"("membershipSaleId");

-- CreateIndex
CREATE INDEX "Product_companyId_idx" ON "Product"("companyId");

-- CreateIndex
CREATE INDEX "Product_branchId_idx" ON "Product"("branchId");

-- CreateIndex
CREATE INDEX "Product_productCategoryId_idx" ON "Product"("productCategoryId");

-- CreateIndex
CREATE INDEX "Product_code_idx" ON "Product"("code");

-- CreateIndex
CREATE INDEX "Product_barcode_idx" ON "Product"("barcode");

-- CreateIndex
CREATE INDEX "Product_name_idx" ON "Product"("name");

-- CreateIndex
CREATE INDEX "ProductCategory_companyId_idx" ON "ProductCategory"("companyId");

-- CreateIndex
CREATE INDEX "InventoryMovement_companyId_idx" ON "InventoryMovement"("companyId");

-- CreateIndex
CREATE INDEX "InventoryMovement_branchId_idx" ON "InventoryMovement"("branchId");

-- CreateIndex
CREATE INDEX "InventoryMovement_productId_idx" ON "InventoryMovement"("productId");

-- CreateIndex
CREATE INDEX "InventoryMovement_createdAt_idx" ON "InventoryMovement"("createdAt");

-- CreateIndex
CREATE INDEX "CashRegister_companyId_idx" ON "CashRegister"("companyId");

-- CreateIndex
CREATE INDEX "CashRegister_branchId_idx" ON "CashRegister"("branchId");

-- CreateIndex
CREATE INDEX "CashRegister_openedById_idx" ON "CashRegister"("openedById");

-- CreateIndex
CREATE INDEX "CashRegister_closedById_idx" ON "CashRegister"("closedById");

-- CreateIndex
CREATE INDEX "CashRegister_status_idx" ON "CashRegister"("status");

-- CreateIndex
CREATE INDEX "CashRegister_companyId_branchId_status_idx" ON "CashRegister"("companyId", "branchId", "status");

-- CreateIndex
CREATE INDEX "CashMovement_companyId_idx" ON "CashMovement"("companyId");

-- CreateIndex
CREATE INDEX "CashMovement_branchId_idx" ON "CashMovement"("branchId");

-- CreateIndex
CREATE INDEX "CashMovement_cashRegisterId_idx" ON "CashMovement"("cashRegisterId");

-- CreateIndex
CREATE INDEX "CashMovement_createdById_idx" ON "CashMovement"("createdById");

-- CreateIndex
CREATE INDEX "CashMovement_referenceType_idx" ON "CashMovement"("referenceType");

-- CreateIndex
CREATE INDEX "CashMovement_createdAt_idx" ON "CashMovement"("createdAt");

-- CreateIndex
CREATE INDEX "Payment_companyId_idx" ON "Payment"("companyId");

-- CreateIndex
CREATE INDEX "Payment_branchId_idx" ON "Payment"("branchId");

-- CreateIndex
CREATE INDEX "Payment_cashMovementId_idx" ON "Payment"("cashMovementId");

-- CreateIndex
CREATE INDEX "Payment_method_idx" ON "Payment"("method");

-- CreateIndex
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");

-- CreateIndex
CREATE INDEX "Sale_companyId_idx" ON "Sale"("companyId");

-- CreateIndex
CREATE INDEX "Sale_branchId_idx" ON "Sale"("branchId");

-- CreateIndex
CREATE INDEX "Sale_customerId_idx" ON "Sale"("customerId");

-- CreateIndex
CREATE INDEX "Sale_saleDate_idx" ON "Sale"("saleDate");

-- CreateIndex
CREATE INDEX "Sale_status_idx" ON "Sale"("status");

-- CreateIndex
CREATE INDEX "Sale_userId_idx" ON "Sale"("userId");

-- CreateIndex
CREATE INDEX "SaleDetail_saleId_idx" ON "SaleDetail"("saleId");

-- CreateIndex
CREATE INDEX "SaleDetail_itemType_idx" ON "SaleDetail"("itemType");

-- CreateIndex
CREATE INDEX "Purchase_companyId_idx" ON "Purchase"("companyId");

-- CreateIndex
CREATE INDEX "Purchase_branchId_idx" ON "Purchase"("branchId");

-- CreateIndex
CREATE INDEX "Purchase_supplierId_idx" ON "Purchase"("supplierId");

-- CreateIndex
CREATE INDEX "Purchase_purchaseDate_idx" ON "Purchase"("purchaseDate");

-- CreateIndex
CREATE INDEX "Purchase_status_idx" ON "Purchase"("status");

-- CreateIndex
CREATE INDEX "Purchase_userId_idx" ON "Purchase"("userId");

-- CreateIndex
CREATE INDEX "PurchaseDetail_purchaseId_idx" ON "PurchaseDetail"("purchaseId");

-- CreateIndex
CREATE INDEX "PurchaseDetail_productId_idx" ON "PurchaseDetail"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessTemplate_code_key" ON "BusinessTemplate"("code");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessTemplatePermission_businessTemplateId_permissionId_key" ON "BusinessTemplatePermission"("businessTemplateId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "RoleTemplate_businessTemplateId_name_key" ON "RoleTemplate"("businessTemplateId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "RoleTemplatePermission_roleTemplateId_permissionId_key" ON "RoleTemplatePermission"("roleTemplateId", "permissionId");

-- CreateIndex
CREATE INDEX "AccountTemplate_businessTemplateId_idx" ON "AccountTemplate"("businessTemplateId");

-- CreateIndex
CREATE INDEX "AccountTemplate_parentId_idx" ON "AccountTemplate"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountTemplate_businessTemplateId_code_key" ON "AccountTemplate"("businessTemplateId", "code");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_businessTemplateId_fkey" FOREIGN KEY ("businessTemplateId") REFERENCES "BusinessTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_roleTemplateId_fkey" FOREIGN KEY ("roleTemplateId") REFERENCES "RoleTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyPermission" ADD CONSTRAINT "CompanyPermission_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyPermission" ADD CONSTRAINT "CompanyPermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipSale" ADD CONSTRAINT "MembershipSale_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipSale" ADD CONSTRAINT "MembershipSale_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipSale" ADD CONSTRAINT "MembershipSale_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipSale" ADD CONSTRAINT "MembershipSale_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipSale" ADD CONSTRAINT "MembershipSale_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipSale" ADD CONSTRAINT "MembershipSale_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerMembership" ADD CONSTRAINT "CustomerMembership_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerMembership" ADD CONSTRAINT "CustomerMembership_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerMembership" ADD CONSTRAINT "CustomerMembership_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Command" ADD CONSTRAINT "Command_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Command" ADD CONSTRAINT "Command_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Command" ADD CONSTRAINT "Command_membershipSaleId_fkey" FOREIGN KEY ("membershipSaleId") REFERENCES "MembershipSale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_productCategoryId_fkey" FOREIGN KEY ("productCategoryId") REFERENCES "ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashRegister" ADD CONSTRAINT "CashRegister_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashRegister" ADD CONSTRAINT "CashRegister_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashRegister" ADD CONSTRAINT "CashRegister_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashRegister" ADD CONSTRAINT "CashRegister_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_cashRegisterId_fkey" FOREIGN KEY ("cashRegisterId") REFERENCES "CashRegister"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_cashMovementId_fkey" FOREIGN KEY ("cashMovementId") REFERENCES "CashMovement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleDetail" ADD CONSTRAINT "SaleDetail_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseDetail" ADD CONSTRAINT "PurchaseDetail_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseDetail" ADD CONSTRAINT "PurchaseDetail_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessTemplatePermission" ADD CONSTRAINT "BusinessTemplatePermission_businessTemplateId_fkey" FOREIGN KEY ("businessTemplateId") REFERENCES "BusinessTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessTemplatePermission" ADD CONSTRAINT "BusinessTemplatePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleTemplate" ADD CONSTRAINT "RoleTemplate_businessTemplateId_fkey" FOREIGN KEY ("businessTemplateId") REFERENCES "BusinessTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleTemplatePermission" ADD CONSTRAINT "RoleTemplatePermission_roleTemplateId_fkey" FOREIGN KEY ("roleTemplateId") REFERENCES "RoleTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleTemplatePermission" ADD CONSTRAINT "RoleTemplatePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountTemplate" ADD CONSTRAINT "AccountTemplate_businessTemplateId_fkey" FOREIGN KEY ("businessTemplateId") REFERENCES "BusinessTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountTemplate" ADD CONSTRAINT "AccountTemplate_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "AccountTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

