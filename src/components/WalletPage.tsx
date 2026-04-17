"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import type { WalletDetail } from "@/types";
import { CompositionPieChart } from "./CompositionPieChart";
import { CompositionTable } from "./CompositionTable";
import { PerformanceChart } from "./PerformanceChart";

interface Props {
  walletId: string;
}

export function WalletPage({ walletId }: Props) {
  const [data, setData] = useState<WalletDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/wallets/${walletId}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [walletId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Carregando carteira...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Carteira não encontrada.</p>
      </div>
    );
  }

  const { wallet, currentComposition } = data;
  const isClosed = wallet.status === "closed";

  // Build asset name map for the chart
  const assetNames: Record<string, string> = {};
  for (const comp of data.allCompositions) {
    assetNames[comp.assetId] = `${comp.displayName} (${comp.symbol})`;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      {/* ─── Section A: Header & Rationale ─── */}
      <section className="mb-10">
        <div className="flex items-start gap-3 mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-100 tracking-tight">
            {wallet.name}
          </h1>
          {isClosed && wallet.closedAt && (
            <span className="shrink-0 mt-1 px-2.5 py-1 text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 rounded-full">
              Encerrada em{" "}
              {new Date(wallet.closedAt).toLocaleDateString("pt-BR")}
            </span>
          )}
        </div>

        {wallet.description && (
          <div className="prose-wallet bg-surface-1 rounded-xl border border-surface-3 p-5 sm:p-6">
            <ReactMarkdown>{wallet.description}</ReactMarkdown>
          </div>
        )}
      </section>

      {/* ─── Section B: Composition ─── */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-brand-400" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 4.06A6 6 0 014.06 9H9V4.06z" />
          </svg>
          {isClosed ? "Composição Final" : "Composição Atual"}
        </h2>

        <div className="bg-surface-1 rounded-xl border border-surface-3">
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] divide-y lg:divide-y-0 lg:divide-x divide-surface-3">
            {/* Pie Chart */}
            <div className="p-4 flex items-center justify-center">
              <CompositionPieChart compositions={currentComposition} />
            </div>

            {/* Table */}
            <div className="overflow-x-auto overflow-y-visible">
              <CompositionTable compositions={currentComposition} isClosed={isClosed} />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Section C: Performance Chart ─── */}
      <section>
        <h2 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-brand-400" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11 4a1 1 0 10-2 0v4a1 1 0 102 0V7zm-3 2a1 1 0 10-2 0v2a1 1 0 102 0V9zM8 8a1 1 0 00-2 0v4a1 1 0 102 0V8z"
              clipRule="evenodd"
            />
          </svg>
          Performance
        </h2>

        <div className="bg-surface-1 rounded-xl border border-surface-3 p-4 sm:p-6">
          <PerformanceChart walletId={wallet.id} assetNames={assetNames} />
        </div>
      </section>
    </div>
  );
}
