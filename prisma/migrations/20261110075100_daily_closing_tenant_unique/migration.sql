-- DropIndex
DROP INDEX "DailyClosing_businessDate_key";

-- CreateIndex
CREATE UNIQUE INDEX "DailyClosing_dairyId_businessDate_key" ON "DailyClosing"("dairyId", "businessDate");

