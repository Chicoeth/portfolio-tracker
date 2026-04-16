"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Exchange {
  name: string;
  url: string;
}

export default function NewAssetPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    ticker: "",
    displayName: "",
    symbol: "",
    riskLevel: "medium" as "low" | "medium" | "high" | "very_high",
    description: "",
    paradigmaUrl: "",
    websiteUrl: "",
    coingeckoUrl: "",
    tradingviewUrl: "",
    defillamaUrl: "",
  });

  const [exchanges, setExchanges] = useState<Exchange[]>([
    { name: "Binance", url: "" },
  ]);

  const addExchange = () => {
    setExchanges([...exchanges, { name: "", url: "" }]);
  };

  const removeExchange = (i: number) => {
    setExchanges(exchanges.filter((_, idx) => idx !== i));
  };

  const updateExchange = (i: number, field: "name" | "url", value: string) => {
    const updated = [...exchanges];
    updated[i] = { ...updated[i], [field]: value };
    setExchanges(updated);
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);

    try {
      const payload = {
        ...form,
        paradigmaUrl: form.paradigmaUrl || null,
        websiteUrl: form.websiteUrl || null,
        coingeckoUrl: form.coingeckoUrl || null,
        tradingviewUrl: form.tradingviewUrl || null,
        defillamaUrl: form.defillamaUrl || null,
        exchanges: exchanges.filter((e) => e.name && e.url),
      };

      const res = await fetch("/api/admin/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.toString() || "Erro ao cadastrar ativo");
      }

      router.push("/admin");
    } catch (e: any) {
      setError(e.message);
      setSaving(false);
    }
  };

  const riskOptions = [
    { value: "low", label: "Low", color: "text-emerald-400" },
    { value: "medium", label: "Medium", color: "text-amber-400" },
    { value: "high", label: "High", color: "text-orange-400" },
    { value: "very_high", label: "Very High", color: "text-red-400" },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold text-gray-100 mb-6">Novo Ativo</h1>

      <div className="bg-surface-1 rounded-xl border border-surface-3 p-6 space-y-5">
        {/* Ticker + Symbol + Name */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Ticker (API)
            </label>
            <input
              type="text"
              value={form.ticker}
              onChange={(e) => setForm({ ...form, ticker: e.target.value.toLowerCase() })}
              placeholder="bitcoin"
              className="w-full bg-surface-2 border border-surface-4 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-brand-500 font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Símbolo
            </label>
            <input
              type="text"
              value={form.symbol}
              onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })}
              placeholder="BTC"
              className="w-full bg-surface-2 border border-surface-4 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-brand-500 font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Nome
            </label>
            <input
              type="text"
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              placeholder="Bitcoin"
              className="w-full bg-surface-2 border border-surface-4 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        {/* Risk Level */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            Nível de Risco
          </label>
          <div className="flex gap-2">
            {riskOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setForm({ ...form, riskLevel: opt.value as any })}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                  form.riskLevel === opt.value
                    ? `border-current bg-current/10 ${opt.color}`
                    : "border-surface-4 text-gray-500 hover:text-gray-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            Descrição
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            placeholder="Breve descrição do projeto/moeda..."
            className="w-full bg-surface-2 border border-surface-4 rounded-lg px-4 py-2.5 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-brand-500"
          />
        </div>

        {/* Links */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Links (Saiba Mais)
          </label>
          <div className="space-y-2">
            {(
              [
                { key: "paradigmaUrl", label: "Paradigma", ph: "https://paradigma.education/coins/bitcoin" },
                { key: "websiteUrl", label: "Website", ph: "https://bitcoin.org" },
                { key: "coingeckoUrl", label: "CoinGecko", ph: "https://www.coingecko.com/en/coins/bitcoin" },
                { key: "tradingviewUrl", label: "TradingView", ph: "https://www.tradingview.com/symbols/BTCUSD" },
                { key: "defillamaUrl", label: "DeFiLlama", ph: "https://defillama.com/protocol/..." },
              ] as const
            ).map(({ key, label, ph }) => (
              <div key={key} className="flex items-center gap-2">
                <span className="w-24 text-xs text-gray-500 shrink-0">{label}</span>
                <input
                  type="url"
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  placeholder={ph}
                  className="flex-1 bg-surface-2 border border-surface-4 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-brand-500"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Exchanges */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Onde Comprar (Corretoras)
          </label>
          <div className="space-y-2">
            {exchanges.map((ex, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={ex.name}
                  onChange={(e) => updateExchange(i, "name", e.target.value)}
                  placeholder="Binance"
                  className="w-36 bg-surface-2 border border-surface-4 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-brand-500"
                />
                <input
                  type="url"
                  value={ex.url}
                  onChange={(e) => updateExchange(i, "url", e.target.value)}
                  placeholder="https://www.binance.com/en/trade/BTC_USDT"
                  className="flex-1 bg-surface-2 border border-surface-4 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-brand-500"
                />
                <button
                  onClick={() => removeExchange(i)}
                  className="p-1.5 text-gray-600 hover:text-red-400"
                >
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
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
            onClick={addExchange}
            className="mt-2 text-sm text-brand-400 hover:text-brand-300"
          >
            + Adicionar corretora
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSubmit}
            disabled={saving || !form.ticker || !form.displayName || !form.symbol}
            className="px-6 py-2.5 text-sm font-medium bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            {saving ? "Salvando..." : "Cadastrar Ativo"}
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
