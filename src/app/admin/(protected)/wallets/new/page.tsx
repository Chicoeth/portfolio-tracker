"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface AssetOption {
  ticker: string;
  displayName: string;
  symbol: string;
}

interface CompositionEntry {
  assetId: string;
  weight: number; // 0-100 for display
}

export default function NewWalletPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);

  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "thematic" as "main" | "thematic" | "past",
    sortOrder: 0,
  });

  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [compositions, setCompositions] = useState<CompositionEntry[]>([]);

  // Load available assets
  useEffect(() => {
    fetch("/api/admin/assets")
      .then((r) => r.json())
      .then((data) => {
        setAssets(data);
        setLoadingAssets(false);
      })
      .catch(() => setLoadingAssets(false));
  }, []);

  const totalWeight = compositions.reduce((sum, c) => sum + c.weight, 0);
  const usedTickers = new Set(compositions.map((c) => c.assetId));

  const addAsset = () => {
    const available = assets.find((a) => !usedTickers.has(a.ticker));
    if (available) {
      setCompositions([
        ...compositions,
        { assetId: available.ticker, weight: 0 },
      ]);
    }
  };

  const removeAsset = (index: number) => {
    setCompositions(compositions.filter((_, i) => i !== index));
  };

  const updateWeight = (index: number, weight: number) => {
    const updated = [...compositions];
    updated[index] = { ...updated[index], weight };
    setCompositions(updated);
  };

  const updateAssetId = (index: number, assetId: string) => {
    const updated = [...compositions];
    updated[index] = { ...updated[index], assetId };
    setCompositions(updated);
  };

  const handleSubmit = async () => {
    if (!form.name) {
      setError("Nome é obrigatório.");
      return;
    }

    if (compositions.length === 0) {
      setError("Adicione pelo menos um ativo à composição inicial.");
      return;
    }

    if (Math.abs(totalWeight - 100) > 0.1) {
      setError("Os pesos devem somar exatamente 100%.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          startDate,
          compositions: compositions.map((c) => ({
            assetId: c.assetId,
            weight: c.weight / 100,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.toString() || "Erro ao criar carteira");
      }

      const wallet = await res.json();
      router.push(`/admin/wallets/${wallet.id}`);
    } catch (e: any) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold text-gray-100 mb-6">
        Nova Carteira
      </h1>

      <div className="bg-surface-1 rounded-xl border border-surface-3 p-6 space-y-5">
        {/* Name */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            Nome
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ex: Carteira DeFi"
            className="w-full bg-surface-2 border border-surface-4 rounded-lg px-4 py-2.5 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-brand-500"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            Categoria
          </label>
          <div className="flex gap-2">
            {(["main", "thematic"] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setForm({ ...form, category: cat })}
                className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                  form.category === cat
                    ? "border-brand-500 bg-brand-500/10 text-brand-400"
                    : "border-surface-4 text-gray-500 hover:text-gray-300"
                }`}
              >
                {cat === "main" ? "Principal" : "Temática"}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            Descrição / Racional (Markdown)
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={8}
            placeholder="Descreva a tese e o racional da carteira..."
            className="w-full bg-surface-2 border border-surface-4 rounded-lg px-4 py-2.5 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-brand-500 font-mono"
          />
        </div>

        {/* Sort order */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            Ordem de exibição
          </label>
          <input
            type="number"
            value={form.sortOrder}
            onChange={(e) =>
              setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })
            }
            className="w-24 bg-surface-2 border border-surface-4 rounded-lg px-4 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>

      {/* ── Initial Composition ── */}
      <div className="bg-surface-1 rounded-xl border border-surface-3 p-6 space-y-5 mt-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-100 mb-1">
            Composição Inicial
          </h2>
          <p className="text-xs text-gray-500">
            Defina os ativos e pesos que a carteira terá desde o início.
          </p>
        </div>

        {/* Start date */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            Data de início
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-surface-2 border border-surface-4 rounded-lg px-4 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-brand-500"
          />
        </div>

        {/* Asset list */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Ativos
            </label>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-mono ${
                  Math.abs(totalWeight - 100) <= 0.1
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                Total: {totalWeight.toFixed(0)}%
              </span>
            </div>
          </div>

          {loadingAssets ? (
            <div className="flex items-center justify-center py-6">
              <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {compositions.map((comp, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 bg-surface-2 rounded-lg p-2"
                  >
                    {/* Asset selector */}
                    <select
                      value={comp.assetId}
                      onChange={(e) => updateAssetId(i, e.target.value)}
                      className="flex-1 bg-surface-3 border border-surface-4 rounded-md px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-brand-500"
                    >
                      {assets.map((a) => (
                        <option
                          key={a.ticker}
                          value={a.ticker}
                          disabled={
                            usedTickers.has(a.ticker) &&
                            a.ticker !== comp.assetId
                          }
                        >
                          {a.symbol} — {a.displayName}
                        </option>
                      ))}
                    </select>

                    {/* Weight input */}
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={comp.weight}
                        onChange={(e) =>
                          updateWeight(i, parseFloat(e.target.value) || 0)
                        }
                        className="w-20 bg-surface-3 border border-surface-4 rounded-md px-3 py-2 text-sm text-gray-100 text-right font-mono focus:outline-none focus:border-brand-500"
                      />
                      <span className="text-xs text-gray-500">%</span>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => removeAsset(i)}
                      className="p-1.5 text-gray-600 hover:text-red-400 transition-colors"
                    >
                      <svg
                        className="w-4 h-4"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={addAsset}
                className="mt-2 w-full py-2.5 border border-dashed border-surface-4 rounded-lg text-sm text-gray-500 hover:text-gray-300 hover:border-surface-3 transition-colors"
              >
                + Adicionar Ativo
              </button>
            </>
          )}
        </div>

        {/* Weight bar visualization */}
        {compositions.length > 0 && (
          <div className="h-3 rounded-full overflow-hidden flex bg-surface-3">
            {compositions.map((comp, i) => (
              <div
                key={i}
                className="h-full transition-all duration-300"
                style={{
                  width: `${comp.weight}%`,
                  backgroundColor: [
                    "#f59e0b",
                    "#3b82f6",
                    "#8b5cf6",
                    "#ec4899",
                    "#10b981",
                    "#06b6d4",
                    "#f97316",
                    "#6366f1",
                  ][i % 8],
                }}
                title={`${
                  assets.find((a) => a.ticker === comp.assetId)?.symbol
                }: ${comp.weight}%`}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Error + Actions ── */}
      <div className="mt-6 space-y-4">
        {error && (
          <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={handleSubmit}
            disabled={
              saving ||
              !form.name ||
              compositions.length === 0 ||
              Math.abs(totalWeight - 100) > 0.1
            }
            className="px-6 py-2.5 text-sm font-medium bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            {saving ? "Criando..." : "Criar Carteira"}
          </button>
          <button
            onClick={() => router.back()}
            className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
