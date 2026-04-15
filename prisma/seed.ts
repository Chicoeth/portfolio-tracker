/**
 * Seed Script — Todas as carteiras (dados reais)
 * Run: npx tsx prisma/seed.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── Helper ─────────────────────────────────────────────
function d(dateStr: string) {
  return new Date(dateStr);
}

async function seedStablecoinPrices(from: string, to: string) {
  const prices: { assetId: string; date: Date; priceUsd: number; marketCap: bigint | null }[] = [];
  const current = new Date(from);
  const end = new Date(to);
  while (current <= end) {
    prices.push({ assetId: "stablecoins", date: new Date(current), priceUsd: 1.0, marketCap: null });
    current.setDate(current.getDate() + 1);
  }
  for (let i = 0; i < prices.length; i += 500) {
    const chunk = prices.slice(i, i + 500);
    await prisma.$transaction(
      chunk.map((p) =>
        prisma.dailyPrice.upsert({
          where: { assetId_date: { assetId: p.assetId, date: p.date } },
          update: { priceUsd: p.priceUsd },
          create: p,
        })
      )
    );
  }
  return prices.length;
}

async function createPastWallet(data: {
  name: string;
  description: string;
  sortOrder: number;
  startDate: string;
  closedAt: string;
  compositions: { assetId: string; weight: number }[];
}) {
  const wallet = await prisma.wallet.create({
    data: {
      name: data.name,
      description: data.description,
      category: "past",
      status: "closed",
      closedAt: d(data.closedAt),
      sortOrder: data.sortOrder,
    },
  });

  const event = await prisma.rebalanceEvent.create({
    data: {
      walletId: wallet.id,
      date: d(data.startDate),
      type: "initial",
      portfolioValue: 100,
    },
  });

  for (const comp of data.compositions) {
    await prisma.walletComposition.create({
      data: {
        walletId: wallet.id,
        eventId: event.id,
        assetId: comp.assetId,
        weight: comp.weight,
        startDate: d(data.startDate),
        endDate: d(data.closedAt),
      },
    });
  }

  const comps = data.compositions.map((c) => `${(c.weight * 100).toFixed(0)}% ${c.assetId}`).join(", ");
  console.log(`  ✓ [Passada] ${data.name}: ${comps}`);
  return wallet;
}

// ─── Main ───────────────────────────────────────────────
async function main() {
  console.log("🌱 Seeding database...\n");

  // ─── Clear ────────────────────────────────────────────
  console.log("🗑️  Limpando dados anteriores (preservando preços)...");
  await prisma.walletComposition.deleteMany();
  await prisma.rebalanceEvent.deleteMany();
  await prisma.wallet.deleteMany();
  // NÃO apagar daily_prices nem exchange_rates — esses dados demoram pra baixar
  // Assets: upsert em vez de delete+create

  // ─── Assets ───────────────────────────────────────────
  console.log("\n📦 Cadastrando ativos...");

  const assets: Parameters<typeof prisma.asset.create>[0]["data"][] = [
    // === Core assets ===
    {
      ticker: "bitcoin", displayName: "Bitcoin", symbol: "BTC", riskLevel: "low",
      description: "A primeira e maior criptomoeda por capitalização de mercado. Reserva de valor digital descentralizada.",
      websiteUrl: "https://bitcoin.org", coingeckoUrl: "https://www.coingecko.com/en/coins/bitcoin",
      tradingviewUrl: "https://www.tradingview.com/symbols/BTCUSD/",
      exchanges: [
        { name: "Binance", url: "https://www.binance.com/en/trade/BTC_USDT" },
        { name: "Coinbase", url: "https://www.coinbase.com/price/bitcoin" },
        { name: "MercadoBitcoin", url: "https://www.mercadobitcoin.com.br/plataforma/clue/?pair=BTCBRL" },
      ],
    },
    {
      ticker: "ethereum", displayName: "Ethereum", symbol: "ETH", riskLevel: "medium",
      description: "Plataforma de contratos inteligentes líder. Base para DeFi, NFTs e aplicações descentralizadas.",
      websiteUrl: "https://ethereum.org", coingeckoUrl: "https://www.coingecko.com/en/coins/ethereum",
      tradingviewUrl: "https://www.tradingview.com/symbols/ETHUSD/",
      defillamaUrl: "https://defillama.com/chain/Ethereum",
      exchanges: [
        { name: "Binance", url: "https://www.binance.com/en/trade/ETH_USDT" },
        { name: "Coinbase", url: "https://www.coinbase.com/price/ethereum" },
        { name: "MercadoBitcoin", url: "https://www.mercadobitcoin.com.br/plataforma/clue/?pair=ETHBRL" },
      ],
    },
    {
      ticker: "solana", displayName: "Solana", symbol: "SOL", riskLevel: "high",
      description: "Blockchain de alta performance focada em escalabilidade e baixo custo de transação.",
      websiteUrl: "https://solana.com", coingeckoUrl: "https://www.coingecko.com/en/coins/solana",
      tradingviewUrl: "https://www.tradingview.com/symbols/SOLUSD/",
      defillamaUrl: "https://defillama.com/chain/Solana",
      exchanges: [
        { name: "Binance", url: "https://www.binance.com/en/trade/SOL_USDT" },
        { name: "Coinbase", url: "https://www.coinbase.com/price/solana" },
        { name: "Jupiter", url: "https://jup.ag/" },
      ],
    },
    {
      ticker: "stablecoins", displayName: "Stablecoins", symbol: "STABLE", riskLevel: "low",
      description: "Posição em stablecoins (USDT, USDC, DAI, etc). Valor atrelado ao dólar americano. O investidor pode escolher a stablecoin de sua preferência.",
      exchanges: [
        { name: "Binance", url: "https://www.binance.com/en/trade/USDT_BRL" },
        { name: "Coinbase", url: "https://www.coinbase.com/price/usdc" },
        { name: "MercadoBitcoin", url: "https://www.mercadobitcoin.com.br/plataforma/clue/?pair=USDTBRL" },
      ],
    },
    {
      ticker: "hyperliquid", displayName: "Hyperliquid", symbol: "HYPE", riskLevel: "very_high",
      description: "DEX de derivativos de alta performance com orderbook on-chain.",
      websiteUrl: "https://hyperliquid.xyz", coingeckoUrl: "https://www.coingecko.com/en/coins/hyperliquid",
      exchanges: [
        { name: "Hyperliquid", url: "https://app.hyperliquid.xyz/trade/HYPE" },
        { name: "Binance", url: "https://www.binance.com/en/trade/HYPE_USDT" },
      ],
    },
    // === Carteira do Urso (stablecoins agrupadas) — BTC e ETH já estão acima ===

    // === FAANG da Web3 ===
    {
      ticker: "helium", displayName: "Helium", symbol: "HNT", riskLevel: "high",
      description: "Rede descentralizada de telecomunicações IoT.",
      coingeckoUrl: "https://www.coingecko.com/en/coins/helium",
      exchanges: [],
    },
    {
      ticker: "arweave", displayName: "Arweave", symbol: "AR", riskLevel: "medium",
      description: "Protocolo de armazenamento permanente e descentralizado de dados.",
      coingeckoUrl: "https://www.coingecko.com/en/coins/arweave",
      exchanges: [],
    },
    {
      ticker: "the-graph", displayName: "The Graph", symbol: "GRT", riskLevel: "medium",
      description: "Protocolo de indexação para consultar dados de blockchains.",
      coingeckoUrl: "https://www.coingecko.com/en/coins/the-graph",
      exchanges: [],
    },

    // === Ethereum Killers ===
    {
      ticker: "polkadot", displayName: "Polkadot", symbol: "DOT", riskLevel: "medium",
      description: "Protocolo multi-chain que conecta blockchains especializadas.",
      coingeckoUrl: "https://www.coingecko.com/en/coins/polkadot",
      exchanges: [],
    },

    // === Cavalos da Layer 2 ===
    {
      ticker: "havven", displayName: "Synthetix", symbol: "SNX", riskLevel: "high",
      description: "Protocolo de ativos sintéticos em DeFi.",
      coingeckoUrl: "https://www.coingecko.com/en/coins/havven",
      exchanges: [],
    },
    {
      ticker: "balancer", displayName: "Balancer", symbol: "BAL", riskLevel: "high",
      description: "Protocolo de liquidez descentralizado e AMM.",
      coingeckoUrl: "https://www.coingecko.com/en/coins/balancer",
      exchanges: [],
    },
    {
      ticker: "matic-network", displayName: "Polygon", symbol: "POL", riskLevel: "medium",
      description: "Solução de escalabilidade Layer 2 para Ethereum.",
      coingeckoUrl: "https://www.coingecko.com/en/coins/polygon",
      exchanges: [],
    },

    // === Zebras de DeFi ===
    {
      ticker: "sushi", displayName: "SushiSwap", symbol: "SUSHI", riskLevel: "very_high",
      description: "DEX e protocolo DeFi multi-chain.",
      coingeckoUrl: "https://www.coingecko.com/en/coins/sushi",
      exchanges: [],
    },
    {
      ticker: "alpha-finance", displayName: "Alpha Finance", symbol: "ALPHA", riskLevel: "very_high",
      description: "Ecossistema DeFi com produtos de yield farming alavancado.",
      coingeckoUrl: "https://www.coingecko.com/en/coins/alpha-finance",
      exchanges: [],
    },

    // === Bags do Verão 2023 ===
    {
      ticker: "lido-dao", displayName: "Lido DAO", symbol: "LDO", riskLevel: "medium",
      description: "Protocolo líder de liquid staking para Ethereum.",
      coingeckoUrl: "https://www.coingecko.com/en/coins/lido-dao",
      exchanges: [],
    },
    {
      ticker: "aptos", displayName: "Aptos", symbol: "APT", riskLevel: "high",
      description: "Blockchain Layer 1 focada em segurança e escalabilidade.",
      coingeckoUrl: "https://www.coingecko.com/en/coins/aptos",
      exchanges: [],
    },
    {
      ticker: "canto", displayName: "Canto", symbol: "CANTO", riskLevel: "very_high",
      description: "Blockchain Layer 1 com DeFi nativo e gratuito.",
      coingeckoUrl: "https://www.coingecko.com/en/coins/canto",
      exchanges: [],
    },

    // === GameFi Underdogs ===
    {
      ticker: "crypto-raiders", displayName: "Crypto Raiders", symbol: "RAIDER", riskLevel: "very_high",
      description: "RPG play-to-earn baseado em blockchain.",
      coingeckoUrl: "https://www.coingecko.com/en/coins/crypto-raiders",
      exchanges: [],
    },
    {
      ticker: "magic", displayName: "Treasure", symbol: "MAGIC", riskLevel: "very_high",
      description: "Ecossistema de gaming descentralizado no Arbitrum.",
      coingeckoUrl: "https://www.coingecko.com/en/coins/magic",
      exchanges: [],
    },

    // === Solana Season ===
    {
      ticker: "render-token", displayName: "Render", symbol: "RENDER", riskLevel: "high",
      description: "Rede descentralizada de renderização de GPU.",
      coingeckoUrl: "https://www.coingecko.com/en/coins/render-token",
      exchanges: [],
    },
    {
      ticker: "nosana", displayName: "Nosana", symbol: "NOS", riskLevel: "very_high",
      description: "Marketplace descentralizado de computação GPU na Solana.",
      coingeckoUrl: "https://www.coingecko.com/en/coins/nosana",
      exchanges: [],
    },
    {
      ticker: "genesysgo-shadow", displayName: "Shadow Token", symbol: "SHDW", riskLevel: "very_high",
      description: "Armazenamento descentralizado no ecossistema Solana.",
      coingeckoUrl: "https://www.coingecko.com/en/coins/genesysgo-shadow",
      exchanges: [],
    },
    {
      ticker: "bonk", displayName: "Bonk", symbol: "BONK", riskLevel: "very_high",
      description: "Memecoin do ecossistema Solana.",
      coingeckoUrl: "https://www.coingecko.com/en/coins/bonk",
      exchanges: [],
    },

    // === Cinco Mosqueteiras ===
    {
      ticker: "geodnet", displayName: "GEODNET", symbol: "GEOD", riskLevel: "very_high",
      description: "Rede descentralizada de estações GNSS para posicionamento de precisão.",
      coingeckoUrl: "https://www.coingecko.com/en/coins/geodnet",
      exchanges: [],
    },
    {
      ticker: "pyth-network", displayName: "Pyth Network", symbol: "PYTH", riskLevel: "very_high",
      description: "Oracle de dados financeiros de alta fidelidade para DeFi.",
      coingeckoUrl: "https://www.coingecko.com/en/coins/pyth-network",
      exchanges: [],
    },
    {
      ticker: "bittensor", displayName: "Bittensor", symbol: "TAO", riskLevel: "very_high",
      description: "Rede descentralizada de machine learning e inteligência artificial.",
      coingeckoUrl: "https://www.coingecko.com/en/coins/bittensor",
      exchanges: [],
    },
    {
      ticker: "pepe", displayName: "Pepe", symbol: "PEPE", riskLevel: "very_high",
      description: "Memecoin inspirada no meme Pepe the Frog.",
      coingeckoUrl: "https://www.coingecko.com/en/coins/pepe",
      exchanges: [],
    },

    // === Carteira Modular ===
    {
      ticker: "celestia", displayName: "Celestia", symbol: "TIA", riskLevel: "high",
      description: "Rede modular de disponibilidade de dados para blockchains.",
      coingeckoUrl: "https://www.coingecko.com/en/coins/celestia",
      exchanges: [],
    },
    {
      ticker: "altlayer", displayName: "AltLayer", symbol: "ALT", riskLevel: "very_high",
      description: "Protocolo de rollups-as-a-service para blockchains modulares.",
      coingeckoUrl: "https://www.coingecko.com/en/coins/altlayer",
      exchanges: [],
    },
    {
      ticker: "dymension", displayName: "Dymension", symbol: "DYM", riskLevel: "very_high",
      description: "Hub de RollApps modulares no ecossistema Cosmos.",
      coingeckoUrl: "https://www.coingecko.com/en/coins/dymension",
      exchanges: [],
    },

    // === Gemas de I.A. ===
    {
      ticker: "synesis-one", displayName: "Synesis One", symbol: "SNS", riskLevel: "very_high",
      description: "Plataforma de train-to-earn para treinar modelos de IA.",
      coingeckoUrl: "https://www.coingecko.com/en/coins/synesis-one",
      exchanges: [],
    },
    {
      ticker: "fluence-2", displayName: "Fluence", symbol: "FLT", riskLevel: "high",
      description: "Plataforma de computação descentralizada peer-to-peer.",
      coingeckoUrl: "https://www.coingecko.com/en/coins/fluence-2",
      exchanges: [],
    },
    {
      ticker: "numbers-protocol", displayName: "Numbers Protocol", symbol: "NUM", riskLevel: "very_high",
      description: "Protocolo de proveniência e autenticidade de conteúdo digital.",
      coingeckoUrl: "https://www.coingecko.com/en/coins/numbers-protocol",
      exchanges: [],
    },
    {
      ticker: "echelon-prime", displayName: "Echelon Prime", symbol: "PRIME", riskLevel: "high",
      description: "Token do ecossistema de gaming Web3 da Echelon Prime Foundation.",
      coingeckoUrl: "https://www.coingecko.com/en/coins/echelon-prime",
      exchanges: [],
    },

    // === Memefólio ===
    {
      ticker: "michicoin", displayName: "Michi", symbol: "MICHI", riskLevel: "very_high",
      description: "Memecoin baseada em gatos no ecossistema Solana.",
      coingeckoUrl: "https://www.coingecko.com/en/coins/michicoin",
      exchanges: [],
    },
    {
      ticker: "toshi", displayName: "Toshi", symbol: "TOSHI", riskLevel: "very_high",
      description: "Memecoin no ecossistema Base.",
      coingeckoUrl: "https://www.coingecko.com/en/coins/toshi",
      exchanges: [],
    },
    {
      ticker: "mog-coin", displayName: "Mog Coin", symbol: "MOG", riskLevel: "very_high",
      description: "Memecoin cultural inspirada na internet.",
      coingeckoUrl: "https://www.coingecko.com/en/coins/mog-coin",
      exchanges: [],
    },
    {
      ticker: "billion-dollar-cat-runes", displayName: "Billion Dollar Cat", symbol: "1CAT", riskLevel: "very_high",
      description: "Memecoin baseada em Runes no Bitcoin.",
      coingeckoUrl: "https://www.coingecko.com/en/coins/billion-dollar-cat-runes",
      exchanges: [],
    },
    {
      ticker: "popcat", displayName: "Popcat", symbol: "POPCAT", riskLevel: "very_high",
      description: "Memecoin inspirada no meme viral do gato.",
      coingeckoUrl: "https://www.coingecko.com/en/coins/popcat",
      exchanges: [],
    },
    {
      ticker: "dogwifcoin", displayName: "dogwifhat", symbol: "WIF", riskLevel: "very_high",
      description: "Memecoin icônica do ecossistema Solana.",
      coingeckoUrl: "https://www.coingecko.com/en/coins/dogwifcoin",
      exchanges: [],
    },

    // === Agentes IA ===
    {
      ticker: "ai16z", displayName: "ai16z", symbol: "AI16Z", riskLevel: "very_high",
      description: "DAO de investimento gerenciada por agentes de IA.",
      coingeckoUrl: "https://www.coingecko.com/en/coins/ai16z",
      exchanges: [],
    },
    {
      ticker: "aixbt", displayName: "AIXBT", symbol: "AIXBT", riskLevel: "very_high",
      description: "Agente de IA influenciador de mercado cripto.",
      coingeckoUrl: "https://www.coingecko.com/en/coins/aixbt",
      exchanges: [],
    },
    {
      ticker: "fartcoin", displayName: "Fartcoin", symbol: "FARTCOIN", riskLevel: "very_high",
      description: "Memecoin de agentes de IA.",
      coingeckoUrl: "https://www.coingecko.com/en/coins/fartcoin",
      exchanges: [],
    },
    {
      ticker: "virtual-protocol", displayName: "Virtuals Protocol", symbol: "VIRTUAL", riskLevel: "very_high",
      description: "Plataforma para criar e monetizar agentes de IA autônomos.",
      coingeckoUrl: "https://www.coingecko.com/en/coins/virtual-protocol",
      exchanges: [],
    },
    {
      ticker: "ai-rig-complex", displayName: "ARC", symbol: "ARC", riskLevel: "very_high",
      description: "Framework para construção de agentes de IA on-chain.",
      coingeckoUrl: "https://www.coingecko.com/en/coins/ai-rig-complex",
      exchanges: [],
    },
    {
      ticker: "griffain", displayName: "Griffain", symbol: "GRIFFAIN", riskLevel: "very_high",
      description: "Agente de IA para automação de tarefas em DeFi.",
      coingeckoUrl: "https://www.coingecko.com/en/coins/griffain",
      exchanges: [],
    },

    // === Seleção Verde (placeholder - precisa confirmar tickers) ===
    // === Índice do Metaverso (placeholder) ===
    // === Renda Passiva-Agressiva (placeholder) ===
  ];

  for (const asset of assets) {
    await prisma.asset.upsert({
      where: { ticker: asset.ticker },
      update: asset,
      create: asset,
    });
    console.log(`  ✓ ${asset.symbol} (${asset.ticker})`);
  }

  // ─── Stablecoin prices ────────────────────────────────
  console.log("\n💵 Gerando preços fixos para stablecoins...");
  // Earliest wallet start date is 2021-01-03
  const count = await seedStablecoinPrices("2021-01-03", new Date().toISOString().split("T")[0]);
  console.log(`  ✓ ${count} dias de preço`);

  // ═══════════════════════════════════════════════════════
  // CARTEIRAS ATIVAS
  // ═══════════════════════════════════════════════════════
  console.log("\n📦 Criando carteiras ativas...");

  // ─── Carteira Paradigma (main) ────────────────────────
  const paradigma = await prisma.wallet.create({
    data: {
      name: "Carteira Paradigma",
      description: "Carteira que segue o método da B.A.S.E, com rebalanceamentos de acordo com o ciclo do mercado.",
      category: "main",
      sortOrder: 0,
    },
  });

  const pEvent1 = await prisma.rebalanceEvent.create({
    data: {
      walletId: paradigma.id, date: d("2024-10-06"), type: "initial",
      notes: "Composição inicial da carteira seguindo o método B.A.S.E.",
      portfolioValue: 100,
    },
  });

  for (const comp of [
    { assetId: "bitcoin", weight: 0.7 },
    { assetId: "solana", weight: 0.2 },
    { assetId: "stablecoins", weight: 0.1 },
  ]) {
    await prisma.walletComposition.create({
      data: {
        walletId: paradigma.id, eventId: pEvent1.id,
        assetId: comp.assetId, weight: comp.weight,
        startDate: d("2024-10-06"), endDate: d("2025-11-16"),
      },
    });
  }

  const pEvent2 = await prisma.rebalanceEvent.create({
    data: {
      walletId: paradigma.id, date: d("2025-11-16"), type: "mixed",
      notes: "Redução de risco por estarmos próximos de um possível topo de mercado. Aumento da fatia de stablecoins e adição de HYPE por estar performando acima da média do mercado.",
      portfolioValue: 100,
    },
  });

  for (const comp of [
    { assetId: "bitcoin", weight: 0.5 },
    { assetId: "stablecoins", weight: 0.4 },
    { assetId: "hyperliquid", weight: 0.1 },
  ]) {
    await prisma.walletComposition.create({
      data: {
        walletId: paradigma.id, eventId: pEvent2.id,
        assetId: comp.assetId, weight: comp.weight,
        startDate: d("2025-11-16"),
      },
    });
  }

  console.log("  ✓ Carteira Paradigma (70% BTC/20% SOL/10% STABLE → 50% BTC/50% STABLE → 50% BTC/40% STABLE/10% HYPE)");

  // ─── Carteira Defensiva (thematic) ────────────────────
  const defensiva = await prisma.wallet.create({
    data: {
      name: "Carteira Defensiva",
      description: "Carteira para atravessar um mercado de baixa. Posição majoritária em BTC. Renda em dólar através de stablecoins, que podem ser usadas futuramente para fazer DCA em BTC.",
      category: "thematic",
      sortOrder: 1,
    },
  });

  const dEvent = await prisma.rebalanceEvent.create({
    data: {
      walletId: defensiva.id, date: d("2025-11-16"), type: "initial",
      portfolioValue: 100,
    },
  });

  for (const comp of [
    { assetId: "bitcoin", weight: 0.6 },
    { assetId: "stablecoins", weight: 0.4 },
  ]) {
    await prisma.walletComposition.create({
      data: {
        walletId: defensiva.id, eventId: dEvent.id,
        assetId: comp.assetId, weight: comp.weight,
        startDate: d("2025-11-16"),
      },
    });
  }

  console.log("  ✓ Carteira Defensiva (60% BTC, 40% STABLE)");

  // ═══════════════════════════════════════════════════════
  // CARTEIRAS PASSADAS (mais nova → mais velha)
  // ═══════════════════════════════════════════════════════
  console.log("\n📦 Criando carteiras passadas...");

  // 1. Agentes IA
  await createPastWallet({
    name: "Agentes IA",
    description: 'Os agentes autônomos baseados em inteligência artificial surgiram como um meme e, em pouco tempo, se tornaram a categoria com mais atenção do mercado. A intenção desta carteira é dar exposição às líderes em seus respectivos subsetores. $VIRTUAL e $AI16Z são as principais estruturas utilizadas. $GRIFFAIN é a maior quando o assunto é DeFAI - mistura de IA com DeFi. $AIXBT é o maior influenciador AI do momento. $FARTCOIN, a memecoin líder relacionada a inteligência artificial.',
    sortOrder: 1, startDate: "2025-02-03", closedAt: "2025-07-24",
    compositions: [
      { assetId: "ai16z", weight: 0.15 },
      { assetId: "aixbt", weight: 0.20 },
      { assetId: "fartcoin", weight: 0.20 },
      { assetId: "virtual-protocol", weight: 0.15 },
      { assetId: "ai-rig-complex", weight: 0.10 },
      { assetId: "griffain", weight: 0.20 },
    ],
  });

  // 2. Memefólio
  await createPastWallet({
    name: "Memefólio",
    description: 'Moedas meméticas tem sido a categoria que mais performou nesse início de ciclo. Seja isso devido a uma repulsa pelas moedas tradicionais, onde participantes mais sofisticados do mercado lucram em cima do varejo; ou um sintoma de certo niilismo financeiro observado nas gerações mais novas - o fato é que essa categoria tem sobreperformado em relação ao mercado. Essa é uma seleção de moedas meméticas que julgamos ter alto potencial de propagação, replicabilidade e entendimento. As moedas não tem nenhum "fundamento". Podem ir a zero, literalmente, a qualquer momento. Só aloque o que pode perder. Horizonte de tempo: 3 a 12 meses.',
    sortOrder: 2, startDate: "2024-05-20", closedAt: "2025-11-17",
    compositions: [
      { assetId: "michicoin", weight: 0.10 },
      { assetId: "toshi", weight: 0.10 },
      { assetId: "pepe", weight: 0.25 },
      { assetId: "mog-coin", weight: 0.10 },
      { assetId: "billion-dollar-cat-runes", weight: 0.10 },
      { assetId: "popcat", weight: 0.10 },
      { assetId: "dogwifcoin", weight: 0.25 },
    ],
  });

  // 3. Gemas de I.A.
  await createPastWallet({
    name: "Gemas de I.A.",
    description: 'Estudamos 100+ moedas de I.A. quentes, e selecionamos as 6 em que vemos mais potencial. Estão diversificadas, tanto entre blockchains, quanto entre categorias: rede de GPUs descentralizadas; IA para gaming; crowdsourcing para IA e redes para inferência distribuída. A tese aqui é a de que "IA" é a buzzword motriz deste ciclo de afrouxamento monetário; assim como "metaverso" foi a 4 anos atrás. E a de que estes ativos representam uma forma otimizada de se expôr a essa narrativa. O intuito é que essa seleção entre na porção de "Altcoins" da sua carteira.',
    sortOrder: 3, startDate: "2024-04-03", closedAt: "2025-07-24",
    compositions: [
      { assetId: "synesis-one", weight: 0.20 },
      { assetId: "fluence-2", weight: 0.30 },
      { assetId: "numbers-protocol", weight: 0.20 },
      { assetId: "echelon-prime", weight: 0.30 },
    ],
  });

  // 4. Carteira Modular
  await createPastWallet({
    name: "Carteira Modular",
    description: 'Uma seleção de 3 altcoins que misturam duas narrativas importantes deste ciclo: Redes Modulares e Restaking. As moedas têm uma característica em comum: baixo fornecimento circulante. Isso em tese possibilita maior apreciação, enquanto boa parte da oferta está fora do mercado. A seleção é adequada para a parte de sua carteira dedicada a "Altcoins" ou "Experimentos". Todas as moedas dessa carteira podem ser colocadas em stake para possivelmente receber airdrops. O horizonte de tempo é de ~3-12 meses.',
    sortOrder: 4, startDate: "2024-02-05", closedAt: "2024-05-16",
    compositions: [
      { assetId: "celestia", weight: 0.30 },
      { assetId: "altlayer", weight: 0.25 },
      { assetId: "dymension", weight: 0.45 },
    ],
  });

  // 5. Cinco Mosqueteiras
  await createPastWallet({
    name: "Cinco Mosqueteiras",
    description: 'Esta seleção é adequada para aquela porcentagem da sua carteira dedicada a "altcoins" e/ou "experimentos". Junta as líderes de algumas categorias em que vemos mais potencial para este novo ciclo: primeiras camadas alternativas; redes de GPUs para IAs; infraestrutura física distribuída (DePIN) e memecoins. O horizonte aqui é de ~6-12 meses.',
    sortOrder: 5, startDate: "2023-11-17", closedAt: "2025-07-24",
    compositions: [
      { assetId: "geodnet", weight: 0.10 },
      { assetId: "pyth-network", weight: 0.15 },
      { assetId: "bittensor", weight: 0.20 },
      { assetId: "solana", weight: 0.40 },
      { assetId: "pepe", weight: 0.15 },
    ],
  });

  // 6. Solana Season
  await createPastWallet({
    name: "Solana Season",
    description: 'Uma seleção de alto risco, com moedas do ecossistema da Solana, em categorias diferentes (AI, memecoin, armazenagem distribuída). Elas devem oferecer mais volatilidade que SOL, tanto pra cima, quanto pra baixo. O horizonte aqui é de ~6-12 meses. A tese é de que, se a tendência de alta persistir, e Solana continuar sobreperformando em relação a ETH e BTC, estas moedas podem entregar ainda mais sobreperformance.',
    sortOrder: 6, startDate: "2023-11-16", closedAt: "2025-07-24",
    compositions: [
      { assetId: "render-token", weight: 0.30 },
      { assetId: "nosana", weight: 0.25 },
      { assetId: "genesysgo-shadow", weight: 0.25 },
      { assetId: "bonk", weight: 0.20 },
    ],
  });

  // 7. Carteira do Urso (stablecoins agrupadas = 35%)
  await createPastWallet({
    name: "Carteira do Urso",
    description: 'Está é uma carteira balanceada pra se proteger no Bear Market, mas seguir acumulando BTC e ETH com aportes recorrentes. A proporção de stablecoins pode diminuir quando houver sinais de que um novo ciclo de alta está começando.',
    sortOrder: 7, startDate: "2022-11-24", closedAt: "2023-11-25",
    compositions: [
      { assetId: "bitcoin", weight: 0.50 },
      { assetId: "ethereum", weight: 0.15 },
      { assetId: "stablecoins", weight: 0.35 },
    ],
  });

  // 8. FAANG da Web3
  await createPastWallet({
    name: "FAANG da Web3",
    description: 'Provedoras de infra descentralizada de fato usadas por apps populares na "Web3".',
    sortOrder: 8, startDate: "2021-10-16", closedAt: "2022-11-25",
    compositions: [
      { assetId: "helium", weight: 0.33 },
      { assetId: "arweave", weight: 0.33 },
      { assetId: "the-graph", weight: 0.34 },
    ],
  });

  // 9. GameFi Underdogs
  await createPastWallet({
    name: "GameFi Underdogs",
    description: 'Uma seleção de altíssimo risco com tokens incipientes na convergência entre games e DeFi.',
    sortOrder: 9, startDate: "2022-01-02", closedAt: "2022-05-17",
    compositions: [
      { assetId: "crypto-raiders", weight: 0.30 },
      { assetId: "magic", weight: 0.70 },
    ],
  });

  // 10. Bags do Verão 2023
  await createPastWallet({
    name: "Bags do Verão 2023",
    description: 'Uma seleção de ativos de alto e altíssimo risco pra tentar capturar o upside de uma eventual extensão do rally de alta no começo de 2023.',
    sortOrder: 10, startDate: "2023-01-24", closedAt: "2023-07-05",
    compositions: [
      { assetId: "lido-dao", weight: 0.35 },
      { assetId: "aptos", weight: 0.30 },
      { assetId: "canto", weight: 0.35 },
    ],
  });

  // 11. Cavalos da Layer 2
  await createPastWallet({
    name: "Cavalos da Layer 2",
    description: 'Os tokens mais preparados pra capitalizar sobre uma nova onda de atenção em soluções de escalabilidade (Optimism, Arbitrum, Polygon).',
    sortOrder: 11, startDate: "2021-03-06", closedAt: "2021-10-20",
    compositions: [
      { assetId: "havven", weight: 0.33 },
      { assetId: "balancer", weight: 0.34 },
      { assetId: "matic-network", weight: 0.33 },
    ],
  });

  // 12. Ethereum Killers
  await createPastWallet({
    name: "Ethereum Killers",
    description: 'Uma seleção das principais proponentes ao posto de vice-rainha dos smart contracts.',
    sortOrder: 12, startDate: "2021-01-12", closedAt: "2021-10-20",
    compositions: [
      { assetId: "solana", weight: 0.50 },
      { assetId: "polkadot", weight: 0.50 },
    ],
  });

  // 13. Zebras de DeFi
  await createPastWallet({
    name: "Zebras de DeFi",
    description: 'Uma seleção de zebras com risco-retorno atraente pra se expôr a uma recuperação do fôlego em DeFi.',
    sortOrder: 13, startDate: "2021-01-03", closedAt: "2021-10-20",
    compositions: [
      { assetId: "sushi", weight: 0.50 },
      { assetId: "alpha-finance", weight: 0.50 },
    ],
  });

  // ═══════════════════════════════════════════════════════
  console.log("\n🎉 Seeding complete!");
  console.log("\n📝 Próximos passos:");
  console.log("   1. Rode: npm run ingest:initial");
  console.log("      (para baixar preços históricos da API Paradigma)");
  console.log("   2. Rode: npm run dev");
  console.log("      (para ver o site com dados reais)");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
