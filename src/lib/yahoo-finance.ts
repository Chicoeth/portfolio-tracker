/**
 * Yahoo Finance Exchange Rate Client
 *
 * Fetches USD/BRL historical data via Yahoo Finance's public CSV download endpoint.
 * Ticker: USDBRL=X
 *
 * This endpoint is unofficial but widely used and stable.
 */

const TICKER = "USDBRL%3DX"; // USDBRL=X URL-encoded

export interface ExchangeRatePoint {
  date: string; // YYYY-MM-DD
  rate: number; // USD → BRL close price
}

/**
 * Fetch USD/BRL exchange rates from Yahoo Finance.
 * @param from Start date (YYYY-MM-DD)
 * @param to End date (YYYY-MM-DD)
 */
export async function getExchangeRatesYahoo(
  from: string,
  to: string
): Promise<ExchangeRatePoint[]> {
  // Yahoo Finance uses Unix timestamps
  const period1 = Math.floor(new Date(from).getTime() / 1000);
  const period2 = Math.floor(new Date(to + "T23:59:59").getTime() / 1000);

  const url =
    `https://query1.finance.yahoo.com/v7/finance/download/${TICKER}` +
    `?period1=${period1}&period2=${period2}&interval=1d&events=history`;

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Yahoo Finance ${res.status}: ${body.slice(0, 200)}`);
  }

  const csv = await res.text();
  const lines = csv.trim().split("\n");

  // First line is header: Date,Open,High,Low,Close,Adj Close,Volume
  if (lines.length < 2) return [];

  const rates: ExchangeRatePoint[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length < 5) continue;

    const date = cols[0]; // YYYY-MM-DD
    const close = parseFloat(cols[4]); // Close price

    if (date && !isNaN(close) && close > 0) {
      rates.push({ date, rate: close });
    }
  }

  return rates.sort((a, b) => a.date.localeCompare(b.date));
}
