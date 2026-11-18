-- AlterTable
ALTER TABLE "transaction" ADD COLUMN     "clientId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "transaction_userId_clientId_key" ON "transaction"("userId", "clientId");

