-- AlterTable
ALTER TABLE "ExpenseHistory" ADD COLUMN     "actorUserId" TEXT;

-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "Settlement" ADD COLUMN     "recordedById" TEXT;
