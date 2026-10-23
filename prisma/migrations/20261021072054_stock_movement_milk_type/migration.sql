-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_milkTypeId_fkey" FOREIGN KEY ("milkTypeId") REFERENCES "MilkTypeConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
