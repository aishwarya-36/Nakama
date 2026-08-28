-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "shareToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Contact_shareToken_key" ON "Contact"("shareToken");
