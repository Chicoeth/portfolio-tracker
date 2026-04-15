import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { z } from "zod";

const createWalletSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  category: z.enum(["main", "thematic", "past"]),
  sortOrder: z.number().int().optional(),
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

// Create wallet
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

  // Enforce: only one "main" wallet
  if (parsed.data.category === "main") {
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

  const wallet = await prisma.wallet.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      category: parsed.data.category,
      sortOrder: parsed.data.sortOrder ?? 0,
    },
  });

  return NextResponse.json(wallet, { status: 201 });
}
