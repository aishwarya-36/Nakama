-- DropForeignKey
ALTER TABLE "Expense" DROP CONSTRAINT "Expense_paidById_fkey";

-- AlterTable
ALTER TABLE "Expense" DROP COLUMN "paidById";
