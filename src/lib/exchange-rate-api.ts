/**
 * Exchange Rate Client
 *
 * Uses the free CoinGecko-style approach: fetch BRL price of a stablecoin (USDT)
 * to get the USD/BRL rate. This is clever because CoinGecko supports vs_currency=brl.
 *
 * Alternative: use frankfurter.app (free, no auth, ECB data)
 */

export interface ExchangeRatePoint {
  date: string;
  rate: number;
}

/**
 * Fetch USD/BRL exchange rates using Frankfurter API (free, no auth, ECB data).
 * Supports historical ranges up to any length.
 */
export async function getExchangeRatesFromAPI(
  from: string,
  to: string
): Promise<ExchangeRatePoint[]> {
  // Frankfurter API — free, no auth, based on ECB reference rates
  // Supports date ranges: /from..to?to=BRL
  const url = `https://api.frankfurter.app/${from}..${to}?from=USD&to=BRL`;

  const res = await fetch(url);

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Frankfurter API ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();

  // Response format: { "start_date": "...", "end_date": "...", "rates": { "2024-01-02": { "BRL": 4.89 }, ... } }
  if (!data.rates) return [];

  const rates: ExchangeRatePoint[] = [];
  for (const [date, currencies] of Object.entries(data.rates)) {
    const brl = (currencies as any).BRL;
    if (brl && typeof brl === "number") {
      rates.push({ date, rate: brl });
    }
  }

  return rates.sort((a, b) => a.date.localeCompare(b.date));
}
