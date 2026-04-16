/**
 * Daily Update Script
 *
 * Runs daily via GitHub Actions. Fetches last 3 days of prices
 * from CoinGecko for all assets, plus stablecoin fixed prices,
 * exchange rates, and auto-downloads missing asset icons.
 *
 * Usage: npx tsx scripts/daily-update.ts
 */

import { PrismaClient } from "@prisma/client";
import { getCoinHistory, sleep } from "../src/lib/coingecko-api";
import { getExchangeRatesFromAPI } from "../src/lib/exchange-rate-api";
import * as fs from "fs/promises";
import * as path from "path";

const prisma = new PrismaClient();
const SYNTHETIC_ASSETS = ["stablecoins"];
const ICONS_DIR = path.join(process.cwd(), "public", "logos", "assets");
const PUBLIC_PATH_PREFIX = "/logos/assets";
const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

async function main() {
  console.log("🔄 Daily price update\n");

  // 1. Get all assets
  const assets = await prisma.asset.findMany({ select: { ticker: true, iconUrl: true } });
  const tickers = assets
    .map((a) => a.ticker)
    .filter((t) => !SYNTHETIC_ASSETS.includes(t));

  console.log(`📦 ${tickers.length} assets to update\n`);

  // 2. Fetch last 3 days from CoinGecko for each asset
  let updated = 0;
  const failed: string[] = [];

  for (const ticker of tickers) {
    try {
      const points = await getCoinHistory(ticker, 3);

      if (points.length === 0) {
        failed.push(ticker);
        await sleep(2500);
        continue;
      }

      for (const p of points) {
        await prisma.dailyPrice.upsert({
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
        });
      }

      updated += points.length;
      console.log(`  ✓ ${ticker}: ${points.length} points`);

      await sleep(2500); // rate limit
    } catch (err: any) {
      console.log(`  ❌ ${ticker}: ${err.message}`);
      failed.push(ticker);
      await sleep(2500);
    }
  }

  // 3. Stablecoins — always $1
  const stableExists = await prisma.asset.findUnique({ where: { ticker: "stablecoins" } });
  if (stableExists) {
    const today = new Date();
    for (let i = 0; i < 3; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      await prisma.dailyPrice.upsert({
        where: { assetId_date: { assetId: "stablecoins", date: d } },
        update: { priceUsd: 1.0 },
        create: { assetId: "stablecoins", date: d, priceUsd: 1.0, marketCap: null },
      });
    }
    console.log("  ✓ stablecoins: $1 (3 days)");
  }

  console.log(`\n✅ Updated ${updated} price records`);

  if (failed.length > 0) {
    console.log(`⚠️  ${failed.length} failed: ${failed.join(", ")}`);
  }

  // 4. Exchange rates (last 5 days)
  console.log("\n💱 Updating exchange rates...");
  try {
    const today = new Date().toISOString().split("T")[0];
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    const from = fiveDaysAgo.toISOString().split("T")[0];

    const rates = await getExchangeRatesFromAPI(from, today);
    for (const r of rates) {
      await prisma.exchangeRate.upsert({
        where: { date: new Date(r.date) },
        update: { usdBrl: r.rate },
        create: { date: new Date(r.date), usdBrl: r.rate },
      });
    }
    console.log(`  ✅ ${rates.length} exchange rate records`);
  } catch (err: any) {
    console.log(`  ⚠️  Exchange rates failed: ${err.message}`);
  }

  // 5. Auto-download missing asset icons
  console.log("\n🎨 Checking for missing asset icons...");
  await downloadMissingIcons(assets);

  console.log("\n🎉 Daily update complete!");
}

/**
 * Downloads icons from CoinGecko for assets that don't have iconUrl set.
 * Skips synthetic assets (stablecoins) — those need manual icons.
 */
async function downloadMissingIcons(
  assets: { ticker: string; iconUrl: string | null }[]
) {
  // Ensure icons directory exists
  await fs.mkdir(ICONS_DIR, { recursive: true });

  const missing = assets.filter(
    (a) => !a.iconUrl && !SYNTHETIC_ASSETS.includes(a.ticker)
  );

  if (missing.length === 0) {
    console.log("  ✅ All assets have icons");
    return;
  }

  console.log(`  📦 ${missing.length} assets missing icons: ${missing.map((a) => a.ticker).join(", ")}`);

  let downloaded = 0;

  for (const asset of missing) {
    try {
      // Fetch coin metadata to get image URL
      const url = `${COINGECKO_BASE}/coins/${asset.ticker}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false`;

      const res = await fetch(url, { headers: { Accept: "application/json" } });

      if (res.status === 429) {
        console.log(`    ⏳ Rate limited, waiting 60s...`);
        await sleep(60000);
        continue; // will retry next daily run
      }

      if (res.status === 404) {
        console.log(`    ⚠️  ${asset.ticker}: not found on CoinGecko`);
        await sleep(2500);
        continue;
      }

      if (!res.ok) {
        console.log(`    ❌ ${asset.ticker}: CoinGecko ${res.status}`);
        await sleep(2500);
        continue;
      }

      const data = await res.json();
      const imageUrl = data?.image?.small || data?.image?.thumb || data?.image?.large;

      if (!imageUrl) {
        console.log(`    ⚠️  ${asset.ticker}: no image available`);
        await sleep(2500);
        continue;
      }

      // Download image
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) {
        console.log(`    ❌ ${asset.ticker}: image download failed`);
        await sleep(2500);
        continue;
      }

      const buffer = Buffer.from(await imgRes.arrayBuffer());
      const filename = `${asset.ticker}.png`;
      const destPath = path.join(ICONS_DIR, filename);
      const publicPath = `${PUBLIC_PATH_PREFIX}/${filename}`;

      await fs.writeFile(destPath, buffer);

      // Update database
      await prisma.asset.update({
        where: { ticker: asset.ticker },
        data: { iconUrl: publicPath },
      });

      console.log(`    ✓ ${asset.ticker}: saved to ${publicPath}`);
      downloaded++;

      await sleep(2500); // rate limit
    } catch (err: any) {
      console.log(`    ❌ ${asset.ticker}: ${err.message}`);
      await sleep(2500);
    }
  }

  if (downloaded > 0) {
    console.log(`  ✅ Downloaded ${downloaded} new icons`);
    console.log("  ⚠️  Remember: icons downloaded by the cron need to be committed to Git for production");
  }
}

main()
  .catch((e) => { console.error("❌ Failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
