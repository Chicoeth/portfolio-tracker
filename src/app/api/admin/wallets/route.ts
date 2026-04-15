import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { z } from "zod";

const compositionSchema = z.object({
  assetId: z.string().min(1),
  weight: z.number().min(0).max(1),
});

const createWalletSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  category: z.enum(["main", "thematic", "past"]),
  sortOrder: z.number().int().optional(),
  startDate: z.string().min(1, "Data de início é obrigatória"),
  compositions: z
    .array(compositionSchema)
    .min(1, "Pelo menos um ativo é necessário"),
});

// List all wallets (admin view)
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const wallets = await prisma.wallet.findMany({
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    include: {
      _count: { select: { compositions: true, rebalanceEvents: true } },
    },
  });

  return NextResponse.json(wallets);
}

// Create wallet with initial composition
export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createWalletSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, description, category, sortOrder, startDate, compositions } =
    parsed.data;

  // Validate weights sum to ~1
  const totalWeight = compositions.reduce((sum, c) => sum + c.weight, 0);
  if (Math.abs(totalWeight - 1) > 0.001) {
    return NextResponse.json(
      { error: "Os pesos devem somar 100%" },
      { status: 400 }
    );
  }

  // Enforce: only one "main" wallet
  if (category === "main") {
    const existing = await prisma.wallet.findFirst({
      where: { category: "main" },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Only one main wallet allowed" },
        { status: 400 }
      );
    }
  }

  // Verify all assets exist
  const assetIds = compositions.map((c) => c.assetId);
  const existingAssets = await prisma.asset.findMany({
    where: { ticker: { in: assetIds } },
    select: { ticker: true },
  });
  const existingTickers = new Set(existingAssets.map((a) => a.ticker));
  const missing = assetIds.filter((id) => !existingTickers.has(id));
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Ativos não encontrados: ${missing.join(", ")}` },
      { status: 400 }
    );
  }

  const rebalanceDate = new Date(startDate);

  // Transaction: create wallet + initial event + compositions
  const wallet = await prisma.$transaction(async (tx) => {
    const newWallet = await tx.wallet.create({
      data: {
        name,
        description,
        category,
        sortOrder: sortOrder ?? 0,
      },
    });

    const event = await tx.rebalanceEvent.create({
      data: {
        walletId: newWallet.id,
        date: rebalanceDate,
        type: "initial",
        portfolioValue: 100,
      },
    });

    await Promise.all(
      compositions.map((c) =>
        tx.walletComposition.create({
          data: {
            walletId: newWallet.id,
            eventId: event.id,
            assetId: c.assetId,
            weight: c.weight,
            startDate: rebalanceDate,
          },
        })
      )
    );

    return newWallet;
  });

  return NextResponse.json(wallet, { status: 201 });
}
