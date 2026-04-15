import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const wallets = await prisma.wallet.findMany({
    orderBy: [
      { category: "asc" }, // main first, then thematic, then past
      { sortOrder: "asc" },
      { createdAt: "asc" },
    ],
    select: {
      id: true,
      name: true,
      category: true,
      status: true,
      closedAt: true,
      sortOrder: true,
    },
  });

  return NextResponse.json(wallets);
}
