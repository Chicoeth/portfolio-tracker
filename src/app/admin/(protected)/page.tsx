"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface WalletAdmin {
  id: string;
  name: string;
  category: string;
  status: string;
  closedAt: string | null;
  sortOrder: number;
  _count: { compositions: number; rebalanceEvents: number };
}

interface AssetAdmin {
  ticker: string;
  displayName: string;
  symbol: string;
  riskLevel: string;
}

export default function AdminDashboard() {
  const [wallets, setWallets] = useState<WalletAdmin[]>([]);
  const [assets, setAssets] = useState<AssetAdmin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/wallets").then((r) => r.json()),
      fetch("/api/admin/assets").then((r) => r.json()),
    ])
      .then(([w, a]) => {
        setWallets(w);
        setAssets(a);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const categoryLabel: Record<string, string> = {
    main: "Principal",
    thematic: "Temática",
    past: "Passada",
  };

  const categoryColor: Record<string, string> = {
    main: "bg-brand-500/10 text-brand-400 border-brand-500/20",
    thematic: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    past: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* ─── Wallets ─── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-100">Carteiras</h2>
          <Link
            href="/admin/wallets/new"
            className="px-4 py-2 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors"
          >
            + Nova Carteira
          </Link>
        </div>

        <div className="bg-surface-1 rounded-xl border border-surface-3 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-3">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                  Nome
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                  Categoria
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">
                  Ativos
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">
                  Rebalanceamentos
                </th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {wallets.map((w) => (
                <tr
                  key={w.id}
                  className="border-b border-surface-3/50 hover:bg-surface-2/50 transition-colors"
                >
                  <td className="py-3 px-4">
                    <span className="font-medium text-gray-200">{w.name}</span>
                    {w.status === "closed" && (
                      <span className="ml-2 text-[10px] text-red-400">(Encerrada)</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                        categoryColor[w.category] || ""
                      }`}
                    >
                      {categoryLabel[w.category] || w.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center hidden sm:table-cell">
                    <span className="font-mono text-gray-400">
                      {w._count.compositions}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center hidden sm:table-cell">
                    <span className="font-mono text-gray-400">
                      {w._count.rebalanceEvents}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/wallets/${w.id}`}
                        className="text-xs text-brand-400 hover:text-brand-300"
                      >
                        Editar
                      </Link>
                      <Link
                        href={`/admin/wallets/${w.id}/rebalance`}
                        className="text-xs text-violet-400 hover:text-violet-300"
                      >
                        Rebalancear
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {wallets.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500 text-sm">
                    Nenhuma carteira criada ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── Assets ─── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-100">Ativos Cadastrados</h2>
          <Link
            href="/admin/assets/new"
            className="px-4 py-2 text-sm font-medium bg-surface-3 hover:bg-surface-4 text-gray-200 rounded-lg transition-colors"
          >
            + Novo Ativo
          </Link>
        </div>

        <div className="bg-surface-1 rounded-xl border border-surface-3 overflow-hidden">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-px bg-surface-3">
            {assets.map((a) => (
              <Link
                key={a.ticker}
                href={`/admin/assets/${a.ticker}`}
                className="bg-surface-1 p-4 hover:bg-surface-2 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-full bg-surface-3 flex items-center justify-center text-[10px] font-bold text-gray-300">
                    {a.symbol.slice(0, 3)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-200">{a.symbol}</p>
                    <p className="text-[10px] text-gray-500">{a.displayName}</p>
                  </div>
                </div>
              </Link>
            ))}
            {assets.length === 0 && (
              <div className="col-span-full bg-surface-1 py-8 text-center text-gray-500 text-sm">
                Nenhum ativo cadastrado ainda.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
