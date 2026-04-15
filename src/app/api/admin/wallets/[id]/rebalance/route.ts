import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { z } from "zod";

const rebalanceSchema = z.object({
  date: z.string(), // YYYY-MM-DD
  notes: z.string().optional(),
  compositions: z.array(
    z.object({
      assetId: z.string(),
      weight: z.number().min(0).max(1),
    })
  ),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: walletId } = await params;
  const body = await req.json();
  const parsed = rebalanceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { date, notes, compositions } = parsed.data;

  // Validate weights sum to 1
  const totalWeight = compositions.reduce((sum, c) => sum + c.weight, 0);
  if (Math.abs(totalWeight - 1) > 0.001) {
    return NextResponse.json(
      { error: `Weights must sum to 100%. Current sum: ${(totalWeight * 100).toFixed(1)}%` },
      { status: 400 }
    );
  }

  // Verify wallet exists
  const wallet = await prisma.wallet.findUnique({ where: { id: walletId } });
  if (!wallet) {
    return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
  }

  // Get previous composition to determine event type
  const prevComps = await prisma.walletComposition.findMany({
    where: { walletId, endDate: null },
  });

  const prevAssets = new Set(prevComps.map((c) => c.assetId));
  const newAssets = new Set(compositions.map((c) => c.assetId));

  const added = compositions.filter((c) => !prevAssets.has(c.assetId));
  const removed = prevComps.filter((c) => !newAssets.has(c.assetId));

  const hasSwaps = added.length > 0 || removed.length > 0;
  const hasWeightChanges = compositions.some((c) => {
    const prev = prevComps.find((p) => p.assetId === c.assetId);
    return prev && Math.abs(Number(prev.weight) - c.weight) > 0.0001;
  });

  let eventType: "initial" | "rebalance" | "swap" | "mixed";
  if (prevComps.length === 0) {
    eventType = "initial";
  } else if (hasSwaps && hasWeightChanges) {
    eventType = "mixed";
  } else if (hasSwaps) {
    eventType = "swap";
  } else {
    eventType = "rebalance";
  }

  // Calculate portfolio value at this point (for non-initial events)
  let portfolioValue = 100;
  if (eventType !== "initial") {
    // TODO: Calculate actual accumulated value via chain-linking
    // For now, this will be set manually or calculated by a separate process
    const lastEvent = await prisma.rebalanceEvent.findFirst({
      where: { walletId },
      orderBy: { date: "desc" },
    });
    if (lastEvent) {
      portfolioValue = Number(lastEvent.portfolioValue);
    }
  }

  const rebalanceDate = new Date(date);

  // Transaction: create event + close old compositions + create new ones
  const result = await prisma.$transaction(async (tx) => {
    // Check for existing event on same date
    const existingEvent = await tx.rebalanceEvent.findUnique({
      where: { walletId_date: { walletId, date: rebalanceDate } },
    });

    if (existingEvent) {
      // Delete old compositions for this event and update it
      await tx.walletComposition.deleteMany({
        where: { eventId: existingEvent.id },
      });

      await tx.rebalanceEvent.update({
        where: { id: existingEvent.id },
        data: { type: eventType, notes, portfolioValue },
      });

      // Create new compositions
      const newComps = await Promise.all(
        compositions.map((c) =>
          tx.walletComposition.create({
            data: {
              walletId,
              eventId: existingEvent.id,
              assetId: c.assetId,
              weight: c.weight,
              startDate: rebalanceDate,
            },
          })
        )
      );

      return { event: existingEvent, compositions: newComps };
    }

    // Close previous compositions
    if (prevComps.length > 0) {
      await tx.walletComposition.updateMany({
        where: { walletId, endDate: null },
        data: { endDate: rebalanceDate },
      });
    }

    // Create rebalance event
    const event = await tx.rebalanceEvent.create({
      data: {
        walletId,
        date: rebalanceDate,
        type: eventType,
        notes: notes || null,
        portfolioValue,
      },
    });

    // Create new compositions
    const newComps = await Promise.all(
      compositions.map((c) =>
        tx.walletComposition.create({
          data: {
            walletId,
            eventId: event.id,
            assetId: c.assetId,
            weight: c.weight,
            startDate: rebalanceDate,
          },
        })
      )
    );

    return { event, compositions: newComps };
  });

  return NextResponse.json(result, { status: 201 });
}
