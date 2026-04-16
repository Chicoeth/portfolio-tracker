/**
 * Asset Icons Download Script
 *
 * Para cada ativo no banco (exceto sintéticos como `stablecoins`),
 * busca a URL do ícone no CoinGecko e baixa o PNG (small ~64x64) para
 * /public/logos/assets/{ticker}.png. Atualiza o campo `iconUrl` no banco.
 *
 * Inteligente: pula ativos que já têm `iconUrl` setado e arquivo no disco.
 *
 * Usage:
 *   npx tsx scripts/download-asset-icons.ts             # baixa apenas faltantes
 *   npx tsx scripts/download-asset-icons.ts --force     # re-baixa todos
 *
 * Rate limit: 2.5s entre requests (mesmo padrão do resto do projeto).
 */

import { PrismaClient } from "@prisma/client";
import { sleep } from "../src/lib/coingecko-api";
import * as fs from "fs/promises";
import * as path from "path";

const prisma = new PrismaClient();
const FORCE = process.argv.includes("--force");

const SYNTHETIC_ASSETS = ["stablecoins"]; // ícone fornecido manualmente
const ICONS_DIR = path.join(process.cwd(), "public", "logos", "assets");
const PUBLIC_PATH_PREFIX = "/logos/assets"; // o que vai no banco

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function fileExists(filepath: string): Promise<boolean> {
  try {
    await fs.access(filepath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Busca metadata do coin no CoinGecko e retorna a URL da imagem small.
 */
async function fetchIconUrl(coinId: string): Promise<string | null> {
  // localization=false e tickers=false reduzem payload drasticamente
  const url = `${COINGECKO_BASE}/coins/${coinId}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false`;

  const res = await fetch(url, { headers: { Accept: "application/json" } });

  if (res.status === 429) {
    console.log(`    ⏳ Rate limited, esperando 60s...`);
    await sleep(60000);
    return fetchIconUrl(coinId);
  }

  if (res.status === 404) {
    console.log(`    ⚠️  Ativo não encontrado no CoinGecko`);
    return null;
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`CoinGecko ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();

  // Preferência: small (64x64). Fallback: thumb, depois large.
  const imageUrl = data?.image?.small || data?.image?.thumb || data?.image?.large;

  if (!imageUrl || typeof imageUrl !== "string") return null;

  return imageUrl;
}

/**
 * Baixa a imagem da URL e salva no caminho destino.
 */
async function downloadImage(url: string, destPath: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Download falhou (${res.status}) para ${url}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(destPath, buffer);
}

async function main() {
  console.log("🎨 Download de ícones de ativos\n");

  await ensureDir(ICONS_DIR);

  // Lista de ativos a processar
  const assets = await prisma.asset.findMany({
    select: { ticker: true, displayName: true, iconUrl: true },
    orderBy: { ticker: "asc" },
  });

  const toProcess = assets.filter((a) => !SYNTHETIC_ASSETS.includes(a.ticker));

  console.log(`📦 ${toProcess.length} ativos no banco (excluindo sintéticos)\n`);

  let downloaded = 0;
  let skipped = 0;
  const failed: string[] = [];

  for (const asset of toProcess) {
    const filename = `${asset.ticker}.png`;
    const destPath = path.join(ICONS_DIR, filename);
    const publicPath = `${PUBLIC_PATH_PREFIX}/${filename}`;

    // Skip se já existe (a menos que --force)
    if (!FORCE) {
      const hasFile = await fileExists(destPath);
      const hasUrl = asset.iconUrl === publicPath;

      if (hasFile && hasUrl) {
        console.log(`  ⏭️  ${asset.ticker}: já existe`);
        skipped++;
        continue;
      }
    }

    try {
      console.log(`  🔍 ${asset.ticker} (${asset.displayName})...`);

      const iconUrl = await fetchIconUrl(asset.ticker);

      if (!iconUrl) {
        console.log(`    ❌ Sem imagem disponível`);
        failed.push(asset.ticker);
        await sleep(2500);
        continue;
      }

      await downloadImage(iconUrl, destPath);

      await prisma.asset.update({
        where: { ticker: asset.ticker },
        data: { iconUrl: publicPath },
      });

      console.log(`    ✓ Salvo em ${publicPath}`);
      downloaded++;

      await sleep(2500); // rate limit
    } catch (err: any) {
      console.log(`    ❌ Erro: ${err.message}`);
      failed.push(asset.ticker);
      await sleep(2500);
    }
  }

  // Aviso sobre sintéticos
  console.log("");
  for (const synth of SYNTHETIC_ASSETS) {
    const exists = assets.find((a) => a.ticker === synth);
    if (!exists) continue;

    const synthPath = path.join(ICONS_DIR, `${synth}.png`);
    const synthExists = await fileExists(synthPath);

    if (synthExists) {
      // Atualiza URL no banco se ainda não está setada
      const expectedUrl = `${PUBLIC_PATH_PREFIX}/${synth}.png`;
      if (exists.iconUrl !== expectedUrl) {
        await prisma.asset.update({
          where: { ticker: synth },
          data: { iconUrl: expectedUrl },
        });
        console.log(`  ✓ ${synth}: arquivo manual encontrado, iconUrl atualizado`);
      } else {
        console.log(`  ⏭️  ${synth}: já configurado`);
      }
    } else {
      console.log(
        `  ⚠️  ${synth}: ícone manual ainda não existe em ${synthPath}`
      );
    }
  }

  console.log(`\n✅ ${downloaded} baixados, ${skipped} pulados`);

  if (failed.length > 0) {
    console.log(`⚠️  ${failed.length} falharam: ${failed.join(", ")}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
