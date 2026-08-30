-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "defaultCurrency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "simplifyDebts" BOOLEAN NOT NULL DEFAULT false;
