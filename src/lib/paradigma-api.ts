const BASE_URL =
  process.env.PARADIGMA_API_BASE || "https://api.paradigma.education/api/v2";

// ─── Types ──────────────────────────────────────────────

export interface CoinHistoryPoint {
  t: string;
  price: number;
  marketCap: number;
}

export interface CoinStats {
  ticker: string;
  price: number;
  marketCap: number;
  ageDays: number;
}

export interface BatchHistoryResponse {
  from: string;
  to: string;
  interval: string;
  series: {
    ticker: string;
    points: CoinHistoryPoint[];
  }[];
}

// ─── API Functions ──────────────────────────────────────

/**
 * Fetch price history for a single coin.
 */
export async function getCoinHistory(
  ticker: string,
  options?: { from?: string; to?: string; interval?: "1d" | "1w" | "1M" }
): Promise<CoinHistoryPoint[]> {
  const params = new URLSearchParams();
  if (options?.from) params.set("from", options.from);
  if (options?.to) params.set("to", options.to);
  if (options?.interval) params.set("interval", options.interval);

  const url = `${BASE_URL}/coins/${ticker.toLowerCase()}/history?${params}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Paradigma API error: ${res.status} for ${ticker}`);
  }

  return res.json();
}

/**
 * Fetch current stats for a coin.
 */
export async function getCoinStats(ticker: string): Promise<CoinStats> {
  const url = `${BASE_URL}/coins/${ticker.toLowerCase()}/stats`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Paradigma API error: ${res.status} for ${ticker}`);
  }

  return res.json();
}

/**
 * Fetch price history for multiple coins in a single request (max 20).
 */
export async function getBatchHistory(
  tickers: string[],
  options?: { from?: string; to?: string; interval?: "1d" | "1w" | "1M" }
): Promise<BatchHistoryResponse> {
  if (tickers.length > 20) {
    throw new Error("Maximum 20 tickers per batch request");
  }

  const params = new URLSearchParams();
  params.set("tickers", tickers.map((t) => t.toLowerCase()).join(","));
  if (options?.from) params.set("from", options.from);
  if (options?.to) params.set("to", options.to);
  if (options?.interval) params.set("interval", options.interval);

  const url = `${BASE_URL}/coins/history?${params}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Paradigma API batch error: ${res.status}`);
  }

  return res.json();
}

/**
 * Fetch batch history in chunks of 20 tickers.
 */
export async function getBatchHistoryAll(
  tickers: string[],
  options?: { from?: string; to?: string; interval?: "1d" | "1w" | "1M" }
): Promise<BatchHistoryResponse["series"]> {
  const chunks: string[][] = [];
  for (let i = 0; i < tickers.length; i += 20) {
    chunks.push(tickers.slice(i, i + 20));
  }

  const results: BatchHistoryResponse["series"] = [];

  for (const chunk of chunks) {
    const response = await getBatchHistory(chunk, options);
    results.push(...response.series);
  }

  return results;
}
