-- CreateTable
CREATE TABLE "ExchangeRateSnapshot" (
    "id" TEXT NOT NULL,
    "rates" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeRateSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExchangeRateSnapshot_fetchedAt_idx" ON "ExchangeRateSnapshot"("fetchedAt");
