-- AlterTable
ALTER TABLE "ExchangeRateSnapshot" ALTER COLUMN "rates" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Expense" DROP COLUMN "splitType",
ADD COLUMN     "splitType" TEXT NOT NULL DEFAULT 'EQUAL';

-- DropEnum
DROP TYPE "SplitType";

