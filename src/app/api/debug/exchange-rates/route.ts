import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const from = url.searchParams.get("from") || "2024-10-01";
  const to = url.searchParams.get("to") || new Date().toISOString().split("T")[0];

  const rates = await prisma.exchangeRate.findMany({
    where: {
      date: { gte: new Date(from), lte: new Date(to) },
    },
    orderBy: { date: "asc" },
  });

  const data = rates.map((r) => ({
    date: r.date.toISOString().split("T")[0],
    usdBrl: Number(r.usdBrl),
  }));

  return NextResponse.json({
    count: data.length,
    from: data[0]?.date || null,
    to: data[data.length - 1]?.date || null,
    first5: data.slice(0, 5),
    last5: data.slice(-5),
  });
}
