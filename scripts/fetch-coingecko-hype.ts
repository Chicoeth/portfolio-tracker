/**
 * Fetch Hyperliquid (HYPE) price history from CoinGecko
 * and insert into daily_prices table.
 *
 * CoinGecko free API: no key needed, but rate limited (10-30 req/min).
 *
 * Usage: npx tsx scripts/fetch-coingecko-hype.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const COINGECKO_ID = "hyperliquid";
const ASSET_ID = "hyperliquid"; // our ticker in the DB

async function main() {
  console.log("🔄 Fetching HYPE price history from CoinGecko...\n");

  // CoinGecko /coins/{id}/market_chart/range gives us daily prices
  // max range for free tier: use "days" endpoint instead
  // /coins/{id}/market_chart?vs_currency=usd&days=max gives all available history

  // First, let's get the data using the "days" param (simpler)
  // days=365 should cover from HYPE launch (~Nov 2024) to now
  const url = `https://api.coingecko.com/api/v3/coins/${COINGECKO_ID}/market_chart?vs_currency=usd&days=365`;

  console.log(`📡 Fetching: ${url}\n`);

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`CoinGecko API error ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = await res.json();

  if (!data.prices || !Array.isArray(data.prices)) {
    throw new Error("Unexpected response format");
  }

  console.log(`📊 Got ${data.prices.length} price points`);
  console.log(`📊 Got ${data.market_caps?.length || 0} market cap points\n`);

  // data.prices is [[timestamp_ms, price], ...]
  // data.market_caps is [[timestamp_ms, market_cap], ...]

  // Build a map of market caps by date
  const mcMap: Record<string, number> = {};
  if (data.market_caps) {
    for (const [ts, mc] of data.market_caps) {
      const date = new Date(ts).toISOString().split("T")[0];
      mcMap[date] = mc;
    }
  }

  // Deduplicate by date (CoinGecko sometimes returns multiple points per day)
  const byDate: Record<string, { price: number; marketCap: number | null }> = {};
  for (const [ts, price] of data.prices) {
    const date = new Date(ts).toISOString().split("T")[0];
    byDate[date] = {
      price,
      marketCap: mcMap[date] || null,
    };
  }

  const entries = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b));
  console.log(`📅 ${entries.length} unique days: ${entries[0][0]} → ${entries[entries.length - 1][0]}\n`);

  // Delete existing HYPE prices to avoid conflicts
  const deleted = await prisma.dailyPrice.deleteMany({
    where: { assetId: ASSET_ID },
  });
  console.log(`🗑️  Deleted ${deleted.count} existing HYPE price records`);

  // Insert in chunks
  const chunkSize = 500;
  let inserted = 0;

  for (let i = 0; i < entries.length; i += chunkSize) {
    const chunk = entries.slice(i, i + chunkSize);
    await prisma.$transaction(
      chunk.map(([date, { price, marketCap }]) =>
        prisma.dailyPrice.create({
          data: {
            assetId: ASSET_ID,
            date: new Date(date),
            priceUsd: price,
            marketCap: marketCap ? BigInt(Math.round(marketCap)) : null,
          },
        })
      )
    );
    inserted += chunk.length;
  }

  console.log(`✅ Inserted ${inserted} HYPE price records`);

  // Show first and last prices for verification
  const first = entries[0];
  const last = entries[entries.length - 1];
  console.log(`\n📈 First: ${first[0]} → $${first[1].price.toFixed(2)}`);
  console.log(`📈 Last:  ${last[0]} → $${last[1].price.toFixed(2)}`);

  console.log("\n🎉 Done! HYPE prices updated from CoinGecko.");
}

main()
  .catch((e) => {
    console.error("❌ Failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
