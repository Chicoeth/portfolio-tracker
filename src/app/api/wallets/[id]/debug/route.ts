import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // 1. Get wallet compositions
  const wallet = await prisma.wallet.findUnique({
    where: { id },
    include: {
      compositions: {
        orderBy: { startDate: "asc" },
        include: { event: true },
      },
      rebalanceEvents: {
        orderBy: { date: "asc" },
      },
    },
  });

  if (!wallet) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // 2. Get all unique assets
  const allAssets = [...new Set(wallet.compositions.map((c) => c.assetId))];

  // 3. Check price data availability for each asset
  const priceInfo: Record<string, any> = {};
  for (const assetId of allAssets) {
    const count = await prisma.dailyPrice.count({
      where: { assetId },
    });
    const first = await prisma.dailyPrice.findFirst({
      where: { assetId },
      orderBy: { date: "asc" },
    });
    const last = await prisma.dailyPrice.findFirst({
      where: { assetId },
      orderBy: { date: "desc" },
    });
    priceInfo[assetId] = {
      totalPricePoints: count,
      firstDate: first?.date?.toISOString().split("T")[0] || null,
      lastDate: last?.date?.toISOString().split("T")[0] || null,
      firstPrice: first ? Number(first.priceUsd) : null,
      lastPrice: last ? Number(last.priceUsd) : null,
    };
  }

  // 4. Build composition periods
  const periods = wallet.rebalanceEvents.map((event, i) => {
    const comps = wallet.compositions.filter((c) => c.eventId === event.id);
    const nextEvent = wallet.rebalanceEvents[i + 1];
    return {
      eventId: event.id,
      date: event.date.toISOString().split("T")[0],
      type: event.type,
      endDate: nextEvent
        ? nextEvent.date.toISOString().split("T")[0]
        : wallet.closedAt?.toISOString().split("T")[0] || "ongoing",
      weights: Object.fromEntries(
        comps.map((c) => [c.assetId, Number(c.weight)])
      ),
      notes: event.notes,
    };
  });

  return NextResponse.json({
    walletName: wallet.name,
    status: wallet.status,
    allAssets,
    priceInfo,
    periods,
    rebalanceEvents: wallet.rebalanceEvents.map((e) => ({
      id: e.id,
      date: e.date.toISOString().split("T")[0],
      type: e.type,
    })),
  });
}
