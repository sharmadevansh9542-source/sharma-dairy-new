-- CreateEnum
CREATE TYPE "MilkEntryStatus" AS ENUM ('PENDING_VERIFICATION', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "MilkEntry" (
    "id" TEXT NOT NULL,
    "entryCode" TEXT NOT NULL,
    "dairyId" TEXT NOT NULL,
    "farmerId" TEXT,
    "customerId" TEXT,
    "submitterType" "LedgerPartyType" NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "session" "Shift" NOT NULL,
    "milkType" "MilkType" NOT NULL,
    "submittedQuantity" DECIMAL(12,3) NOT NULL,
    "currentQuantity" DECIMAL(12,3) NOT NULL,
    "fatPercent" DECIMAL(5,2),
    "snfPercent" DECIMAL(5,2),
    "remarks" TEXT,
    "status" "MilkEntryStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "isEditedByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdCollectionId" TEXT,
    "createdSaleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MilkEntry_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MilkEntry_single_owner_check" CHECK (
        ("farmerId" IS NOT NULL AND "customerId" IS NULL AND "submitterType" = 'FARMER')
        OR
        ("customerId" IS NOT NULL AND "farmerId" IS NULL AND "submitterType" = 'CUSTOMER')
    )
);

-- CreateTable
CREATE TABLE "AdminEditHistory" (
    "id" TEXT NOT NULL,
    "dairyId" TEXT NOT NULL,
    "recordType" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "reason" TEXT NOT NULL,
    "performedById" TEXT NOT NULL,
    "performedByName" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminEditHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MilkEntry_entryCode_key" ON "MilkEntry"("entryCode");

-- CreateIndex
CREATE INDEX "MilkEntry_dairyId_status_entryDate_idx" ON "MilkEntry"("dairyId", "status", "entryDate");

-- CreateIndex
CREATE INDEX "MilkEntry_dairyId_isEditedByAdmin_entryDate_idx" ON "MilkEntry"("dairyId", "isEditedByAdmin", "entryDate");

-- CreateIndex
CREATE INDEX "MilkEntry_farmerId_entryDate_idx" ON "MilkEntry"("farmerId", "entryDate");

-- CreateIndex
CREATE INDEX "MilkEntry_customerId_entryDate_idx" ON "MilkEntry"("customerId", "entryDate");

-- CreateIndex
CREATE INDEX "AdminEditHistory_dairyId_recordType_recordId_performedAt_idx" ON "AdminEditHistory"("dairyId", "recordType", "recordId", "performedAt");

-- CreateIndex
CREATE INDEX "AdminEditHistory_dairyId_performedAt_idx" ON "AdminEditHistory"("dairyId", "performedAt");

-- AddForeignKey
ALTER TABLE "MilkEntry" ADD CONSTRAINT "MilkEntry_dairyId_fkey" FOREIGN KEY ("dairyId") REFERENCES "Dairy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilkEntry" ADD CONSTRAINT "MilkEntry_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "FarmerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilkEntry" ADD CONSTRAINT "MilkEntry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilkEntry" ADD CONSTRAINT "MilkEntry_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminEditHistory" ADD CONSTRAINT "AdminEditHistory_dairyId_fkey" FOREIGN KEY ("dairyId") REFERENCES "Dairy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminEditHistory" ADD CONSTRAINT "AdminEditHistory_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

