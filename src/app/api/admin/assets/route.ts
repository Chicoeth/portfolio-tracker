import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { z } from "zod";

const createAssetSchema = z.object({
  ticker: z.string().min(1).toLowerCase(),
  displayName: z.string().min(1),
  symbol: z.string().min(1).toUpperCase(),
  riskLevel: z.enum(["low", "medium", "high", "very_high"]),
  riskDescription: z.string().optional().nullable(),
  description: z.string(),
  paradigmaUrl: z.string().url().optional().nullable(),
  websiteUrl: z.string().url().optional().nullable(),
  coingeckoUrl: z.string().url().optional().nullable(),
  tradingviewUrl: z.string().url().optional().nullable(),
  defillamaUrl: z.string().url().optional().nullable(),
  exchanges: z
    .array(z.object({ name: z.string(), url: z.string().url() }))
    .optional(),
});

// List all assets
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const assets = await prisma.asset.findMany({
    orderBy: { displayName: "asc" },
  });

  return NextResponse.json(assets);
}

// Create asset
export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createAssetSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { exchanges, ...rest } = parsed.data;

  const asset = await prisma.asset.create({
    data: {
      ...rest,
      exchanges: exchanges ?? [],
    },
  });

  return NextResponse.json(asset, { status: 201 });
}

// Update asset
export async function PATCH(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { ticker, ...data } = body;

  if (!ticker) {
    return NextResponse.json({ error: "Ticker required" }, { status: 400 });
  }

  const asset = await prisma.asset.update({
    where: { ticker },
    data,
  });

  return NextResponse.json(asset);
}
