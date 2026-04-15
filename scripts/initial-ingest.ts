/**
 * Initial Ingestion Script
 *
 * Fetches price history for all assets that need it.
 * - CoinGecko (primary): up to 365 days, reliable
 * - Paradigma API (fallback): for assets needing >365 days history
 *
 * Smart: only fetches what's missing — if prices already exist, skips.
 *
 * Usage: npx tsx scripts/initial-ingest.ts
 *        npx tsx scripts/initial-ingest.ts --force   (re-download everything)
 */

import { PrismaClient } from "@prisma/client";
import { getCoinHistory, sleep } from "../src/lib/coingecko-api";
import { getExchangeRatesFromAPI } from "../src/lib/exchange-rate-api";

const prisma = new PrismaClient();
const SYNTHETIC_ASSETS = ["stablecoins"];
const FORCE = process.argv.includes("--force");

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

async function main() {
  console.log("🚀 Initial data ingestion\n");

  // 1. Figure out what each asset needs
  const compositions = await prisma.walletComposition.findMany({
    select: { assetId: true, startDate: true, endDate: true },
  });

  const today = new Date().toISOString().split("T")[0];
  const assetRange: Record<string, { from: string; to: string }> = {};

  for (const comp of compositions) {
    const from = comp.startDate.toISOString().split("T")[0];
    const to = comp.endDate ? comp.endDate.toISOString().split("T")[0] : today;

    if (!assetRange[comp.assetId]) {
      assetRange[comp.assetId] = { from, to };
    } else {
      if (from < assetRange[comp.assetId].from) assetRange[comp.assetId].from = from;
      if (to > assetRange[comp.assetId].to) assetRange[comp.assetId].to = to;
    }
  }

  // Always need BTC
  if (!assetRange["bitcoin"]) {
    const earliest = Object.values(assetRange).reduce((m, r) => r.from < m ? r.from : m, today);
    assetRange["bitcoin"] = { from: earliest, to: today };
  }

  // Remove synthetics
  for (const s of SYNTHETIC_ASSETS) delete assetRange[s];

  const tickers = Object.keys(assetRange);
  console.log(`📦 ${tickers.length} assets to process\n`);

  // 2. For each asset, check what we already have and fetch what's missing
  let totalInserted = 0;
  const failed: string[] = [];

  for (const ticker of tickers) {
    const range = assetRange[ticker];

    // Check existing data
    const existingCount = await prisma.dailyPrice.count({
      where: { assetId: ticker },
    });

    if (existingCount > 30 && !FORCE) {
      console.log(`  ⏭ ${ticker}: ${existingCount} points already in DB, skipping`);
      continue;
    }

    // Calculate days needed
    const fromDate = new Date(range.from);
    const toDate = new Date(range.to);
    const daysNeeded = Math.ceil((toDate.getTime() - fromDate.getTime()) / 86400000);

    console.log(`  📡 ${ticker}: fetching ~${daysNeeded} days from CoinGecko...`);

    try {
      // CoinGecko max 365 days on free tier
      const days = Math.min(daysNeeded + 7, 365); // +7 buffer
      const points = await getCoinHistory(ticker, days);

      if (points.length === 0) {
        console.log(`    ⚠️  No data from CoinGecko`);
        failed.push(ticker);
        await sleep(2500);
        continue;
      }

      // Upsert into DB
      for (const chunk of chunkArray(points, 500)) {
        await prisma.$transaction(
          chunk.map((p) =>
            prisma.dailyPrice.upsert({
              where: { assetId_date: { assetId: ticker, date: new Date(p.date) } },
              update: {
                priceUsd: p.price,
                marketCap: p.marketCap ? BigInt(Math.round(p.marketCap)) : null,
              },
              create: {
                assetId: ticker,
                date: new Date(p.date),
                priceUsd: p.price,
                marketCap: p.marketCap ? BigInt(Math.round(p.marketCap)) : null,
              },
            })
          )
        );
      }

      totalInserted += points.length;
      console.log(`    ✓ ${points.length} points (${points[0].date} → ${points[points.length - 1].date})`);

      // If we need more than 365 days, try Paradigma as fallback
      if (daysNeeded > 365) {
        console.log(`    📡 Need >365 days, trying Paradigma for older data...`);
        try {
          await fetchParadigmaHistory(ticker, range.from, points[0].date);
        } catch (err: any) {
          console.log(`    ⚠️  Paradigma fallback failed: ${err.message}`);
        }
      }

      // Rate limit
      await sleep(2500);
    } catch (err: any) {
      console.log(`    ❌ ${ticker}: ${err.message}`);
      failed.push(ticker);
      await sleep(2500);
    }
  }

  console.log(`\n✅ Total: ${totalInserted} price records inserted/updated`);

  if (failed.length > 0) {
    console.log(`⚠️  ${failed.length} failed: ${failed.join(", ")}`);
  }

  // 3. Exchange rates (USD/BRL) via Frankfurter API
  console.log("\n💱 Fetching USD/BRL exchange rates...");
  try {
    const earliest = Object.values(assetRange)
      .map((r) => r.from)
      .sort()[0] || today;

    // Check if we already have rates
    const rateCount = await prisma.exchangeRate.count();
    if (rateCount > 100 && !FORCE) {
      console.log(`  ⏭ ${rateCount} rates already in DB, skipping`);
    } else {
      // Frankfurter supports long ranges, but let's chunk by year for safety
      const years = splitYears(earliest, today);
      let totalRates = 0;

      for (const chunk of years) {
        try {
          const rates = await getExchangeRatesFromAPI(chunk.from, chunk.to);
          for (const batch of chunkArray(rates, 500)) {
            await prisma.$transaction(
              batch.map((r) =>
                prisma.exchangeRate.upsert({
                  where: { date: new Date(r.date) },
                  update: { usdBrl: r.rate },
                  create: { date: new Date(r.date), usdBrl: r.rate },
                })
              )
            );
          }
          totalRates += rates.length;
        } catch (err: any) {
          console.log(`  ⚠️  ${chunk.from}→${chunk.to}: ${err.message}`);
        }
      }
      console.log(`  ✅ ${totalRates} exchange rate records`);
    }
  } catch (err: any) {
    console.log(`  ⚠️  Exchange rates failed: ${err.message}`);
  }

  console.log("\n🎉 Ingestion complete!");
}

// ─── Paradigma fallback for >365 days ───────────────────

async function fetchParadigmaHistory(ticker: string, from: string, to: string) {
  const API_BASE = process.env.PARADIGMA_API_BASE || "https://api.paradigma.education/api/v2";
  const url = `${API_BASE}/coins/${ticker}/history?from=${from}&to=${to}&interval=1d`;
  const res = await fetch(url);

  if (!res.ok) throw new Error(`API ${res.status}`);

  const data = await res.json();
  let points: any[] = [];
  if (Array.isArray(data)) points = data;
  else if (data?.points) points = data.points;
  else if (data?.series?.[0]?.points) points = data.series[0].points;

  if (points.length === 0) return;

  for (const chunk of chunkArray(points, 500)) {
    await prisma.$transaction(
      chunk.map((p: any) =>
        prisma.dailyPrice.upsert({
          where: { assetId_date: { assetId: ticker, date: new Date(p.t.split("T")[0]) } },
          update: { priceUsd: p.price, marketCap: p.marketCap ? BigInt(Math.round(p.marketCap)) : null },
          create: { assetId: ticker, date: new Date(p.t.split("T")[0]), priceUsd: p.price, marketCap: p.marketCap ? BigInt(Math.round(p.marketCap)) : null },
        })
      )
    );
  }

  console.log(`    ✓ Paradigma: ${points.length} older points`);
}

function splitYears(from: string, to: string) {
  const chunks: { from: string; to: string }[] = [];
  let start = new Date(from);
  const end = new Date(to);
  while (start < end) {
    const chunkEnd = new Date(start);
    chunkEnd.setFullYear(chunkEnd.getFullYear() + 1);
    if (chunkEnd > end) chunkEnd.setTime(end.getTime());
    chunks.push({ from: start.toISOString().split("T")[0], to: chunkEnd.toISOString().split("T")[0] });
    start = new Date(chunkEnd);
    start.setDate(start.getDate() + 1);
  }
  return chunks;
}

main()
  .catch((e) => { console.error("❌ Failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
