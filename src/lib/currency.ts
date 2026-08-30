import { prisma } from "./db";

// Fallback rates for currencies frankfurter.dev doesn't cover, and the
// baseline getRates() merges live rates over.
const STATIC_RATES_TO_USD: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.78,
  JPY: 149.5,
  CNY: 7.24,
  INR: 83.5,
  AUD: 1.5,
  CAD: 1.36,
  CHF: 0.88,
  HKD: 7.82,
  SGD: 1.34,
  SEK: 10.4,
  NOK: 10.6,
  DKK: 6.86,
  NZD: 1.64,
  KRW: 1330,
  MXN: 17.1,
  BRL: 5.4,
  ZAR: 18.6,
  AED: 3.67,
  SAR: 3.75,
  THB: 35.8,
  MYR: 4.7,
  IDR: 15700,
  PHP: 56.8,
  VND: 24600,
  PLN: 4.0,
  TRY: 32.7,
  RUB: 92.5,
  ILS: 3.7,
  EGP: 48.5,
  NGN: 1550,
  PKR: 278,
  BDT: 118,
  CZK: 23.2,
  HUF: 356,
  RON: 4.58,
  ARS: 890,
  CLP: 950,
  COP: 3950,
  PEN: 3.75,
  TWD: 31.9,
  QAR: 3.64,
  KWD: 0.31,
};

export const SUPPORTED_CURRENCIES = Object.keys(STATIC_RATES_TO_USD);

async function fetchLiveRates(): Promise<Record<string, number>> {
  const res = await fetch("https://api.frankfurter.dev/v1/latest?base=USD");
  if (!res.ok) throw new Error("Failed to fetch exchange rates");
  const data: { rates: Record<string, number> } = await res.json();
  return { USD: 1, ...data.rates };
}

export async function getLatestSnapshot() {
  return prisma.exchangeRateSnapshot.findFirst({ orderBy: { fetchedAt: "desc" } });
}

export async function refreshRates() {
  const live = await fetchLiveRates();
  const rates = { ...STATIC_RATES_TO_USD, ...live };
  return prisma.exchangeRateSnapshot.create({ data: { rates: JSON.stringify(rates) } });
}

function isNewCalendarMonth(fetchedAt: Date): boolean {
  const now = new Date();
  return (
    fetchedAt.getUTCFullYear() !== now.getUTCFullYear() || fetchedAt.getUTCMonth() !== now.getUTCMonth()
  );
}

export async function getRates(): Promise<Record<string, number>> {
  const snapshot = await getLatestSnapshot();
  if (!snapshot || isNewCalendarMonth(snapshot.fetchedAt)) {
    try {
      const fresh = await refreshRates();
      return JSON.parse(fresh.rates);
    } catch {
      // Network hiccup — fall back to whatever we have rather than breaking conversions.
      return snapshot ? JSON.parse(snapshot.rates) : STATIC_RATES_TO_USD;
    }
  }
  return JSON.parse(snapshot.rates);
}

export function isConvertible(rates: Record<string, number>, code: string) {
  return !!rates[code];
}

// Returns null (not a throw) if either side has no known rate.
export async function convert(
  amount: number,
  from: string,
  to: string
): Promise<number | null> {
  if (from === to) return amount;
  const rates = await getRates();
  const fromRate = rates[from];
  const toRate = rates[to];
  if (!fromRate || !toRate) return null;
  const amountInUsd = amount / fromRate;
  return amountInUsd * toRate;
}
