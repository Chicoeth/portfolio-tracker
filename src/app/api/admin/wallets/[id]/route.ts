import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { z } from "zod";
import * as fs from "fs/promises";
import * as path from "path";

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

// Delete wallet — also deletes orphan assets and their icon files
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

  // 1. Identifica os ativos usados nesta carteira ANTES de deletar
  const compsInWallet = await prisma.walletComposition.findMany({
    where: { walletId: id },
    select: { assetId: true },
  });
  const assetIdsInWallet = Array.from(new Set(compsInWallet.map((c) => c.assetId)));

  // 2. Deleta a carteira (cascade limpa rebalance_events e wallet_compositions)
  await prisma.wallet.delete({ where: { id } });

  // 3. Pra cada ativo que estava nesta carteira, verifica se ficou órfão
  const orphanedAssets: { ticker: string; iconUrl: string | null }[] = [];

  for (const assetId of assetIdsInWallet) {
    const stillUsed = await prisma.walletComposition.findFirst({
      where: { assetId },
      select: { id: true },
    });

    if (!stillUsed) {
      // Ativo órfão — buscar info para deletar arquivo de ícone
      const asset = await prisma.asset.findUnique({
        where: { ticker: assetId },
        select: { ticker: true, iconUrl: true },
      });

      if (asset) {
        orphanedAssets.push(asset);
      }
    }
  }

  // 4. Deleta os ativos órfãos do banco e seus arquivos de ícone
  const deletedAssets: string[] = [];
  const failedDeletes: string[] = [];

  for (const orphan of orphanedAssets) {
    try {
      // Deleta também os daily_prices relacionados (FK RESTRICT, então tem que ir antes)
      await prisma.dailyPrice.deleteMany({
        where: { assetId: orphan.ticker },
      });

      await prisma.asset.delete({ where: { ticker: orphan.ticker } });

      // Tenta deletar o arquivo de ícone (se existir)
      if (orphan.iconUrl) {
        const iconPath = path.join(process.cwd(), "public", orphan.iconUrl);
        try {
          await fs.unlink(iconPath);
        } catch (err: any) {
          // Ignora se o arquivo não existe
          if (err.code !== "ENOENT") {
            console.warn(`Falha ao deletar ícone ${iconPath}:`, err.message);
          }
        }
      }

      deletedAssets.push(orphan.ticker);
    } catch (err: any) {
      console.warn(`Falha ao deletar ativo órfão ${orphan.ticker}:`, err.message);
      failedDeletes.push(orphan.ticker);
    }
  }

  return NextResponse.json({
    ok: true,
    deletedOrphanAssets: deletedAssets,
    failedDeletes,
  });
}
