-- CreateEnum
CREATE TYPE "DairyStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "SubscriptionPlanStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'EXPIRED', 'CANCELLED', 'SUSPENDED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'SUPER_ADMIN';

-- DropIndex
DROP INDEX "MilkCollection_collectionAt_shift_idx";

-- DropIndex
DROP INDEX "Sale_saleAt_status_idx";

-- DropIndex
DROP INDEX "StaffInvitation_email_idx";

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "dairyId" TEXT;

-- AlterTable
ALTER TABLE "CustomerPayment" ADD COLUMN     "dairyId" TEXT;

-- AlterTable
ALTER TABLE "CustomerProfile" ADD COLUMN     "dairyId" TEXT;

-- AlterTable
ALTER TABLE "DailyClosing" ADD COLUMN     "dairyId" TEXT;

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "dairyId" TEXT;

-- AlterTable
ALTER TABLE "FarmerPayment" ADD COLUMN     "dairyId" TEXT;

-- AlterTable
ALTER TABLE "FarmerProfile" ADD COLUMN     "dairyId" TEXT;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "dairyId" TEXT;

-- AlterTable
ALTER TABLE "LedgerEntry" ADD COLUMN     "dairyId" TEXT;

-- AlterTable
ALTER TABLE "MilkCollection" ADD COLUMN     "dairyId" TEXT;

-- AlterTable
ALTER TABLE "MilkRate" ADD COLUMN     "dairyId" TEXT;

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "dairyId" TEXT;

-- AlterTable
ALTER TABLE "StaffInvitation" ADD COLUMN     "dairyId" TEXT;

-- AlterTable
ALTER TABLE "StaffProfile" ADD COLUMN     "dairyId" TEXT;

-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "dairyId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dairyId" TEXT;

-- CreateTable
CREATE TABLE "Dairy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "logoUrl" TEXT,
    "businessType" TEXT DEFAULT 'DAIRY',
    "description" TEXT,
    "status" "DairyStatus" NOT NULL DEFAULT 'APPROVED',
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dairy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DairyMembership" (
    "id" TEXT NOT NULL,
    "dairyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DairyMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DairyRegistrationRequest" (
    "id" TEXT NOT NULL,
    "dairyName" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "businessEmail" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "logoUrl" TEXT,
    "businessType" TEXT DEFAULT 'DAIRY',
    "description" TEXT,
    "adminFullName" TEXT NOT NULL,
    "adminEmail" TEXT NOT NULL,
    "adminPhone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "status" "DairyStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdDairyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DairyRegistrationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "priceMonthly" DECIMAL(10,2) NOT NULL,
    "priceYearly" DECIMAL(10,2) NOT NULL,
    "trialDays" INTEGER NOT NULL DEFAULT 14,
    "maxFarmers" INTEGER NOT NULL DEFAULT 50,
    "maxCustomers" INTEGER NOT NULL DEFAULT 100,
    "maxStaff" INTEGER NOT NULL DEFAULT 5,
    "features" JSONB,
    "status" "SubscriptionPlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "dairyId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "trialEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPayment" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "dairyId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "method" "PaymentMethod" NOT NULL DEFAULT 'UPI',
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "transactionRef" TEXT,
    "invoiceNumber" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformNotification" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformAuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "dairyId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "dairyId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "unit" TEXT NOT NULL DEFAULT 'KG',
    "purchasePrice" DECIMAL(10,2) NOT NULL,
    "sellingPrice" DECIMAL(10,2) NOT NULL,
    "currentStock" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "minStockAlert" DECIMAL(12,3) NOT NULL DEFAULT 5,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "dairyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "gstin" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "dairyId" TEXT NOT NULL,
    "purchaseCode" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalAmount" DECIMAL(14,2) NOT NULL,
    "paidAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PAID',
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseItem" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "PurchaseItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MilkSubscription" (
    "id" TEXT NOT NULL,
    "dairyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "milkType" "MilkType" NOT NULL DEFAULT 'COW',
    "dailyQuantity" DECIMAL(10,3) NOT NULL,
    "ratePerLitre" DECIMAL(10,2) NOT NULL,
    "deliveryShift" "Shift" NOT NULL DEFAULT 'MORNING',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MilkSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyDelivery" (
    "id" TEXT NOT NULL,
    "dairyId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "customerId" TEXT NOT NULL,
    "deliveryDate" TIMESTAMP(3) NOT NULL,
    "shift" "Shift" NOT NULL DEFAULT 'MORNING',
    "quantityLitres" DECIMAL(10,3) NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'DELIVERED',
    "deliveredAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdById" TEXT,

    CONSTRAINT "DailyDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Dairy_code_key" ON "Dairy"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Dairy_slug_key" ON "Dairy"("slug");

-- CreateIndex
CREATE INDEX "Dairy_status_createdAt_idx" ON "Dairy"("status", "createdAt");

-- CreateIndex
CREATE INDEX "DairyMembership_userId_isActive_idx" ON "DairyMembership"("userId", "isActive");

-- CreateIndex
CREATE INDEX "DairyMembership_dairyId_role_idx" ON "DairyMembership"("dairyId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "DairyMembership_dairyId_userId_key" ON "DairyMembership"("dairyId", "userId");

-- CreateIndex
CREATE INDEX "DairyRegistrationRequest_status_createdAt_idx" ON "DairyRegistrationRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "DairyRegistrationRequest_businessEmail_idx" ON "DairyRegistrationRequest"("businessEmail");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_name_key" ON "SubscriptionPlan"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_code_key" ON "SubscriptionPlan"("code");

-- CreateIndex
CREATE INDEX "Subscription_dairyId_status_idx" ON "Subscription"("dairyId", "status");

-- CreateIndex
CREATE INDEX "Subscription_status_currentPeriodEnd_idx" ON "Subscription"("status", "currentPeriodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPayment_invoiceNumber_key" ON "SubscriptionPayment"("invoiceNumber");

-- CreateIndex
CREATE INDEX "SubscriptionPayment_dairyId_paidAt_idx" ON "SubscriptionPayment"("dairyId", "paidAt");

-- CreateIndex
CREATE INDEX "PlatformNotification_isRead_createdAt_idx" ON "PlatformNotification"("isRead", "createdAt");

-- CreateIndex
CREATE INDEX "PlatformAuditLog_entityType_entityId_createdAt_idx" ON "PlatformAuditLog"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "PlatformAuditLog_dairyId_createdAt_idx" ON "PlatformAuditLog"("dairyId", "createdAt");

-- CreateIndex
CREATE INDEX "Product_dairyId_category_isActive_idx" ON "Product"("dairyId", "category", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Product_dairyId_sku_key" ON "Product"("dairyId", "sku");

-- CreateIndex
CREATE INDEX "Supplier_dairyId_isActive_idx" ON "Supplier"("dairyId", "isActive");

-- CreateIndex
CREATE INDEX "Purchase_dairyId_purchaseDate_idx" ON "Purchase"("dairyId", "purchaseDate");

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_dairyId_purchaseCode_key" ON "Purchase"("dairyId", "purchaseCode");

-- CreateIndex
CREATE INDEX "MilkSubscription_dairyId_customerId_status_idx" ON "MilkSubscription"("dairyId", "customerId", "status");

-- CreateIndex
CREATE INDEX "DailyDelivery_dairyId_deliveryDate_shift_idx" ON "DailyDelivery"("dairyId", "deliveryDate", "shift");

-- CreateIndex
CREATE INDEX "DailyDelivery_customerId_deliveryDate_idx" ON "DailyDelivery"("customerId", "deliveryDate");

-- CreateIndex
CREATE INDEX "AuditLog_dairyId_createdAt_idx" ON "AuditLog"("dairyId", "createdAt");

-- CreateIndex
CREATE INDEX "CustomerPayment_dairyId_paidAt_idx" ON "CustomerPayment"("dairyId", "paidAt");

-- CreateIndex
CREATE INDEX "CustomerProfile_dairyId_isActive_idx" ON "CustomerProfile"("dairyId", "isActive");

-- CreateIndex
CREATE INDEX "DailyClosing_dairyId_businessDate_idx" ON "DailyClosing"("dairyId", "businessDate");

-- CreateIndex
CREATE INDEX "Expense_dairyId_expenseAt_idx" ON "Expense"("dairyId", "expenseAt");

-- CreateIndex
CREATE INDEX "FarmerPayment_dairyId_paidAt_idx" ON "FarmerPayment"("dairyId", "paidAt");

-- CreateIndex
CREATE INDEX "FarmerProfile_dairyId_isActive_idx" ON "FarmerProfile"("dairyId", "isActive");

-- CreateIndex
CREATE INDEX "Invoice_dairyId_status_idx" ON "Invoice"("dairyId", "status");

-- CreateIndex
CREATE INDEX "LedgerEntry_dairyId_entryAt_idx" ON "LedgerEntry"("dairyId", "entryAt");

-- CreateIndex
CREATE INDEX "MilkCollection_dairyId_collectionAt_shift_idx" ON "MilkCollection"("dairyId", "collectionAt", "shift");

-- CreateIndex
CREATE INDEX "MilkRate_dairyId_milkTypeId_effectiveFrom_idx" ON "MilkRate"("dairyId", "milkTypeId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "Sale_dairyId_saleAt_status_idx" ON "Sale"("dairyId", "saleAt", "status");

-- CreateIndex
CREATE INDEX "StaffInvitation_dairyId_email_idx" ON "StaffInvitation"("dairyId", "email");

-- CreateIndex
CREATE INDEX "StaffProfile_dairyId_idx" ON "StaffProfile"("dairyId");

-- CreateIndex
CREATE INDEX "StockMovement_dairyId_movementAt_idx" ON "StockMovement"("dairyId", "movementAt");

-- CreateIndex
CREATE INDEX "User_dairyId_role_idx" ON "User"("dairyId", "role");

-- AddForeignKey
ALTER TABLE "DairyMembership" ADD CONSTRAINT "DairyMembership_dairyId_fkey" FOREIGN KEY ("dairyId") REFERENCES "Dairy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DairyMembership" ADD CONSTRAINT "DairyMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_dairyId_fkey" FOREIGN KEY ("dairyId") REFERENCES "Dairy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_dairyId_fkey" FOREIGN KEY ("dairyId") REFERENCES "Dairy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FarmerProfile" ADD CONSTRAINT "FarmerProfile_dairyId_fkey" FOREIGN KEY ("dairyId") REFERENCES "Dairy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerProfile" ADD CONSTRAINT "CustomerProfile_dairyId_fkey" FOREIGN KEY ("dairyId") REFERENCES "Dairy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffProfile" ADD CONSTRAINT "StaffProfile_dairyId_fkey" FOREIGN KEY ("dairyId") REFERENCES "Dairy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffInvitation" ADD CONSTRAINT "StaffInvitation_dairyId_fkey" FOREIGN KEY ("dairyId") REFERENCES "Dairy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilkRate" ADD CONSTRAINT "MilkRate_dairyId_fkey" FOREIGN KEY ("dairyId") REFERENCES "Dairy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilkCollection" ADD CONSTRAINT "MilkCollection_dairyId_fkey" FOREIGN KEY ("dairyId") REFERENCES "Dairy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_dairyId_fkey" FOREIGN KEY ("dairyId") REFERENCES "Dairy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FarmerPayment" ADD CONSTRAINT "FarmerPayment_dairyId_fkey" FOREIGN KEY ("dairyId") REFERENCES "Dairy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPayment" ADD CONSTRAINT "CustomerPayment_dairyId_fkey" FOREIGN KEY ("dairyId") REFERENCES "Dairy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_dairyId_fkey" FOREIGN KEY ("dairyId") REFERENCES "Dairy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_dairyId_fkey" FOREIGN KEY ("dairyId") REFERENCES "Dairy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_dairyId_fkey" FOREIGN KEY ("dairyId") REFERENCES "Dairy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_dairyId_fkey" FOREIGN KEY ("dairyId") REFERENCES "Dairy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyClosing" ADD CONSTRAINT "DailyClosing_dairyId_fkey" FOREIGN KEY ("dairyId") REFERENCES "Dairy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_dairyId_fkey" FOREIGN KEY ("dairyId") REFERENCES "Dairy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_dairyId_fkey" FOREIGN KEY ("dairyId") REFERENCES "Dairy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_dairyId_fkey" FOREIGN KEY ("dairyId") REFERENCES "Dairy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_dairyId_fkey" FOREIGN KEY ("dairyId") REFERENCES "Dairy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilkSubscription" ADD CONSTRAINT "MilkSubscription_dairyId_fkey" FOREIGN KEY ("dairyId") REFERENCES "Dairy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilkSubscription" ADD CONSTRAINT "MilkSubscription_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyDelivery" ADD CONSTRAINT "DailyDelivery_dairyId_fkey" FOREIGN KEY ("dairyId") REFERENCES "Dairy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyDelivery" ADD CONSTRAINT "DailyDelivery_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyDelivery" ADD CONSTRAINT "DailyDelivery_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "MilkSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
