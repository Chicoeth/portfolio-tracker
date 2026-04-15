import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { z } from "zod";

const updateWalletSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.enum(["main", "thematic", "past"]).optional(),
  status: z.enum(["active", "closed"]).optional(),
  closedAt: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

// Update wallet
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = updateWalletSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data: any = { ...parsed.data };

  // If closing the wallet, set closedAt and move to "past"
  if (data.status === "closed") {
    data.closedAt = data.closedAt ? new Date(data.closedAt) : new Date();
    data.category = "past";
  }

  // Enforce single "main" wallet
  if (data.category === "main") {
    const existing = await prisma.wallet.findFirst({
      where: { category: "main", id: { not: id } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Only one main wallet allowed" },
        { status: 400 }
      );
    }
  }

  const wallet = await prisma.wallet.update({
    where: { id },
    data,
  });

  return NextResponse.json(wallet);
}

// Delete wallet
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  await prisma.wallet.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
