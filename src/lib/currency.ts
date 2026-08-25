// Placeholder static exchange rates, expressed as "1 USD = X of currency".
// Swap `getRates()` for a live FX API (e.g. exchangerate.host, openexchangerates.org)
// when you're ready — everything else (convert, the balances "show in" toggle) stays
// the same. This covers the currencies people are most likely to actually log
// expenses in; ALL_CURRENCIES in currencies.ts (for dropdowns) is a much longer list —
// a currency can be picked for an expense even if it isn't convertible yet.
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

export async function getRates(): Promise<Record<string, number>> {
  // Swap this out for a live fetch + cache (e.g. revalidate every few hours) later.
  return STATIC_RATES_TO_USD;
}

export function isConvertible(rates: Record<string, number>, code: string) {
  return !!rates[code];
}

/**
 * Converts an amount between currencies. If either side has no known rate,
 * returns `null` instead of throwing — callers decide how to surface that
 * (e.g. skip it from a converted total, or show the original amount instead).
 */
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
