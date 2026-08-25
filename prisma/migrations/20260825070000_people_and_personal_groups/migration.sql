-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "isPersonal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "personalKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Group_personalKey_key" ON "Group"("personalKey");
