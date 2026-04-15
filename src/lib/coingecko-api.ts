/**
 * CoinGecko API Client
 *
 * Free tier: 10-30 req/min, 365 days max history, no API key needed.
 * Tickers use CoinGecko IDs (same as Paradigma API).
 */

const BASE = "https://api.coingecko.com/api/v3";

// Rate limit: wait between requests to stay under 30/min
const RATE_LIMIT_MS = 2500; // ~24 req/min, safe margin

export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface CoinGeckoPricePoint {
  date: string; // YYYY-MM-DD
  price: number;
  marketCap: number | null;
}

/**
 * Fetch price history for a coin (max 365 days on free tier).
 */
export async function getCoinHistory(
  coinId: string,
  days: number = 365
): Promise<CoinGeckoPricePoint[]> {
  const url = `${BASE}/coins/${coinId}/market_chart?vs_currency=usd&days=${Math.min(days, 365)}`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (res.status === 429) {
    // Rate limited — wait and retry once
    console.log(`    ⏳ Rate limited, waiting 60s...`);
    await sleep(60000);
    return getCoinHistory(coinId, days);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`CoinGecko ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();

  if (!data.prices || !Array.isArray(data.prices)) {
    return [];
  }

  // Build market cap map
  const mcMap: Record<string, number> = {};
  if (data.market_caps) {
    for (const [ts, mc] of data.market_caps) {
      const date = new Date(ts).toISOString().split("T")[0];
      mcMap[date] = mc;
    }
  }

  // Deduplicate by date (keep last value per day)
  const byDate: Record<string, CoinGeckoPricePoint> = {};
  for (const [ts, price] of data.prices) {
    const date = new Date(ts).toISOString().split("T")[0];
    byDate[date] = {
      date,
      price,
      marketCap: mcMap[date] || null,
    };
  }

  return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Fetch current price and market cap for a coin.
 */
export async function getCoinPrice(
  coinId: string
): Promise<{ price: number; marketCap: number } | null> {
  const url = `${BASE}/simple/price?ids=${coinId}&vs_currencies=usd&include_market_cap=true`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) return null;

  const data = await res.json();
  if (!data[coinId]) return null;

  return {
    price: data[coinId].usd,
    marketCap: data[coinId].usd_market_cap,
  };
}
