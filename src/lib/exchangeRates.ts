// Uses open.er-api.com — a free, keyless exchange rate API, updated daily.
// Rates are cached in localStorage per base currency for 24h so we don't
// re-fetch on every render or every page load.

interface CachedRates {
  base: string;
  rates: Record<string, number>;
  fetchedAt: string; // ISO date, YYYY-MM-DD
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function cacheKey(base: string): string {
  return `fx-rates:${base}`;
}

export async function getExchangeRates(baseCurrency: string): Promise<Record<string, number>> {
  const cached = localStorage.getItem(cacheKey(baseCurrency));
  if (cached) {
    try {
      const parsed: CachedRates = JSON.parse(cached);
      if (parsed.fetchedAt === todayKey() && parsed.base === baseCurrency) {
        return parsed.rates;
      }
    } catch {
      // fall through to re-fetch on any parse issue
    }
  }

  const response = await fetch(`https://open.er-api.com/v6/latest/${baseCurrency}`);
  if (!response.ok) {
    throw new Error(`Exchange rate fetch failed: ${response.status}`);
  }
  const data = await response.json();
  if (data.result !== 'success' || !data.rates) {
    throw new Error('Exchange rate API returned an unexpected response');
  }

  const toCache: CachedRates = { base: baseCurrency, rates: data.rates, fetchedAt: todayKey() };
  localStorage.setItem(cacheKey(baseCurrency), JSON.stringify(toCache));
  return data.rates;
}

/**
 * Converts an amount from one currency into the base currency, given a
 * rates table where rates[X] = how many units of X equal 1 unit of base.
 * (open.er-api.com's /latest/BASE endpoint returns rates FROM base TO
 * others, so converting the other direction means dividing.)
 */
export function convertToBase(amount: number, fromCurrency: string, baseCurrency: string, rates: Record<string, number>): number {
  if (fromCurrency === baseCurrency) return amount;
  const rate = rates[fromCurrency];
  if (!rate) return amount; // unknown currency code — leave unconverted rather than silently zeroing it
  return amount / rate;
}

export const COMMON_CURRENCIES = ['HKD', 'USD', 'CNY', 'TWD', 'EUR', 'GBP', 'JPY', 'SGD', 'AUD', 'CAD', 'KRW'];
