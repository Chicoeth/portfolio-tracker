import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  calculatePerformance,
  type CompositionPeriod,
  type PricePoint,
} from "@/lib/portfolio-calc";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(req.url);
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");

  // 1. Get wallet with compositions and events
  const wallet = await prisma.wallet.findUnique({
    where: { id },
    include: {
      compositions: {
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

  if (wallet.compositions.length === 0) {
    return NextResponse.json({ points: [], markers: [] });
  }

  // 2. Determine date range
  const firstDate = wallet.compositions[0].startDate;
  const from = fromParam ? new Date(fromParam) : firstDate;
  const to = toParam ? new Date(toParam) : new Date();

  // 3. Build composition periods grouped by event
  const eventMap = new Map<string, typeof wallet.compositions>();
  for (const comp of wallet.compositions) {
    const key = comp.eventId;
    if (!eventMap.has(key)) eventMap.set(key, []);
    eventMap.get(key)!.push(comp);
  }

  // Build periods from events
  const events = wallet.rebalanceEvents;
  const periods: CompositionPeriod[] = [];

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const comps = eventMap.get(event.id) || [];
    const nextEvent = events[i + 1];

    const weights: Record<string, number> = {};
    for (const c of comps) {
      weights[c.assetId] = Number(c.weight);
    }

    periods.push({
      startDate: event.date.toISOString().split("T")[0],
      endDate: nextEvent
        ? nextEvent.date.toISOString().split("T")[0]
        : wallet.status === "closed" && wallet.closedAt
        ? wallet.closedAt.toISOString().split("T")[0]
        : null,
      weights,
      eventId: event.id,
      portfolioValueAtStart: Number(event.portfolioValue),
    });
  }

  // 4. Get all unique asset tickers
  const allAssets = new Set<string>();
  for (const comp of wallet.compositions) {
    allAssets.add(comp.assetId);
  }
  // Always include BTC for the vs-BTC line
  allAssets.add("bitcoin");

  // 5. Fetch prices
  const priceRecords = await prisma.dailyPrice.findMany({
    where: {
      assetId: { in: Array.from(allAssets) },
      date: { gte: from, lte: to },
    },
    orderBy: { date: "asc" },
  });

  // Group by asset
  const prices: Record<string, PricePoint[]> = {};
  const btcPrices: Record<string, number> = {};

  for (const p of priceRecords) {
    const dateStr = p.date.toISOString().split("T")[0];
    const priceUsd = Number(p.priceUsd);

    if (p.assetId === "bitcoin") {
      btcPrices[dateStr] = priceUsd;
    }

    if (!prices[p.assetId]) prices[p.assetId] = [];
    prices[p.assetId].push({
      date: dateStr,
      priceUsd,
      marketCap: p.marketCap ? Number(p.marketCap) : undefined,
    });
  }

  // 6. Fetch exchange rates and fill gaps (weekends/holidays use last known rate)
  const exchangeRecords = await prisma.exchangeRate.findMany({
    where: { date: { gte: from, lte: to } },
    orderBy: { date: "asc" },
  });

  const rawRates: Record<string, number> = {};
  for (const r of exchangeRecords) {
    rawRates[r.date.toISOString().split("T")[0]] = Number(r.usdBrl);
  }

  // Fill gaps: for every calendar day, carry forward the last known rate
  const exchangeRates: Record<string, number> = {};
  const startDay = new Date(from);
  const endDay = new Date(to);
  let lastRate: number | null = null;

  // Try to get a rate from before the range as seed
  if (Object.keys(rawRates).length > 0) {
    const sortedDates = Object.keys(rawRates).sort();
    lastRate = rawRates[sortedDates[0]];
  } else {
    // Fallback: try to find the most recent rate before our range
    const prevRate = await prisma.exchangeRate.findFirst({
      where: { date: { lt: from } },
      orderBy: { date: "desc" },
    });
    if (prevRate) lastRate = Number(prevRate.usdBrl);
  }

  const cursor = new Date(startDay);
  while (cursor <= endDay) {
    const dateStr = cursor.toISOString().split("T")[0];
    if (rawRates[dateStr]) {
      lastRate = rawRates[dateStr];
    }
    if (lastRate !== null) {
      exchangeRates[dateStr] = lastRate;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  // 7. Calculate performance
  const result = calculatePerformance(periods, prices, exchangeRates, btcPrices);

  // 8. Enrich rebalance markers with event details
  const enrichedMarkers = result.markers.map((marker) => {
    const event = events.find(
      (e) => e.date.toISOString().split("T")[0] === marker.date
    );
    return {
      ...marker,
      type: event?.type || marker.type,
      notes: event?.notes || null,
      portfolioValue: event ? Number(event.portfolioValue) : marker.portfolioValue,
    };
  });

  return NextResponse.json({
    points: result.points,
    markers: enrichedMarkers,
  });
}
