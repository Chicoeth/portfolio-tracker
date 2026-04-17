import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const wallet = await prisma.wallet.findUnique({
    where: { id },
    include: {
      compositions: {
        include: {
          asset: true,
        },
        orderBy: { startDate: "asc" },
      },
      rebalanceEvents: {
        orderBy: { date: "asc" },
      },
    },
  });

  if (!wallet) {
    return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
  }

  let currentComposition: typeof wallet.compositions;

  if (wallet.status === "closed") {
    const lastEvent = wallet.rebalanceEvents[wallet.rebalanceEvents.length - 1];
    if (lastEvent) {
      currentComposition = wallet.compositions.filter((c) => c.eventId === lastEvent.id);
    } else {
      currentComposition = wallet.compositions;
    }
  } else {
    currentComposition = wallet.compositions.filter((c) => c.endDate === null);
  }

  const currentAssetIds = currentComposition.map((c) => c.assetId);
  const isClosed = wallet.status === "closed" && wallet.closedAt;

  let exitPrices: { assetId: string; priceUsd: any; marketCap: bigint | null }[];

  if (isClosed) {
    const closedDate = new Date(wallet.closedAt!);
    exitPrices = await prisma.dailyPrice.findMany({
      where: {
        assetId: { in: currentAssetIds },
        date: { lte: closedDate },
      },
      orderBy: { date: "desc" },
      distinct: ["assetId"],
    });
  } else {
    exitPrices = await prisma.dailyPrice.findMany({
      where: {
        assetId: { in: currentAssetIds },
      },
      orderBy: { date: "desc" },
      distinct: ["assetId"],
    });
  }

  const priceMap = Object.fromEntries(
    exitPrices.map((p) => [p.assetId, { priceUsd: Number(p.priceUsd), marketCap: p.marketCap?.toString() }])
  );

  const entryPrices: Record<string, number> = {};
  for (const comp of currentComposition) {
    const entryPrice = await prisma.dailyPrice.findFirst({
      where: {
        assetId: comp.assetId,
        date: { gte: comp.startDate },
      },
      orderBy: { date: "asc" },
    });
    if (entryPrice) {
      entryPrices[comp.assetId] = Number(entryPrice.priceUsd);
    }
  }

  return NextResponse.json({
    wallet: {
      id: wallet.id,
      name: wallet.name,
      description: wallet.description,
      category: wallet.category,
      status: wallet.status,
      closedAt: wallet.closedAt,
      createdAt: wallet.createdAt,
    },
    currentComposition: currentComposition.map((c) => ({
      assetId: c.assetId,
      weight: Number(c.weight),
      startDate: c.startDate,
      asset: {
        ticker: c.asset.ticker,
        displayName: c.asset.displayName,
        symbol: c.asset.symbol,
        riskLevel: c.asset.riskLevel,
        riskDescription: c.asset.riskDescription,
        description: c.asset.description,
        iconUrl: c.asset.iconUrl,
        paradigmaUrl: c.asset.paradigmaUrl,
        websiteUrl: c.asset.websiteUrl,
        coingeckoUrl: c.asset.coingeckoUrl,
        tradingviewUrl: c.asset.tradingviewUrl,
        defillamaUrl: c.asset.defillamaUrl,
        exchanges: c.asset.exchanges,
      },
      currentPrice: priceMap[c.assetId]?.priceUsd ?? null,
      marketCap: priceMap[c.assetId]?.marketCap ?? null,
      entryPrice: entryPrices[c.assetId] ?? null,
      roi:
        priceMap[c.assetId]?.priceUsd && entryPrices[c.assetId]
          ? ((priceMap[c.assetId].priceUsd - entryPrices[c.assetId]) /
              entryPrices[c.assetId]) *
            100
          : null,
    })),
    rebalanceEvents: wallet.rebalanceEvents.map((e) => ({
      id: e.id,
      date: e.date,
      type: e.type,
      notes: e.notes,
      portfolioValue: Number(e.portfolioValue),
    })),
    allCompositions: wallet.compositions.map((c) => ({
      id: c.id,
      assetId: c.assetId,
      weight: Number(c.weight),
      startDate: c.startDate,
      endDate: c.endDate,
      eventId: c.eventId,
      displayName: c.asset.displayName,
      symbol: c.asset.symbol,
    })),
  });
}
