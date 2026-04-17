"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

interface Exchange {
  name: string;
  url: string;
}

export default function EditAssetPage() {
  const router = useRouter();
  const params = useParams();
  const ticker = params.ticker as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    displayName: "",
    symbol: "",
    riskLevel: "medium" as "low" | "medium" | "high" | "very_high",
    riskDescription: "",
    description: "",
    paradigmaUrl: "",
    websiteUrl: "",
    coingeckoUrl: "",
    tradingviewUrl: "",
    defillamaUrl: "",
  });

  const [exchanges, setExchanges] = useState<Exchange[]>([]);

  useEffect(() => {
    fetch(`/api/admin/assets/${ticker}`)
      .then((r) => {
        if (!r.ok) throw new Error("Asset not found");
        return r.json();
      })
      .then((data) => {
        setForm({
          displayName: data.displayName || "",
          symbol: data.symbol || "",
          riskLevel: data.riskLevel || "medium",
          riskDescription: data.riskDescription || "",
          description: data.description || "",
          paradigmaUrl: data.paradigmaUrl || "",
          websiteUrl: data.websiteUrl || "",
          coingeckoUrl: data.coingeckoUrl || "",
          tradingviewUrl: data.tradingviewUrl || "",
          defillamaUrl: data.defillamaUrl || "",
        });
        const exArr = Array.isArray(data.exchanges) ? data.exchanges : [];
        setExchanges(exArr.length > 0 ? exArr : [{ name: "", url: "" }]);
        setLoading(false);
      })
      .catch(() => {
        setError("Ativo não encontrado.");
        setLoading(false);
      });
  }, [ticker]);

  const addExchange = () => setExchanges([...exchanges, { name: "", url: "" }]);
  const removeExchange = (i: number) => setExchanges(exchanges.filter((_, idx) => idx !== i));
  const updateExchange = (i: number, field: "name" | "url", value: string) => {
    const updated = [...exchanges];
    updated[i] = { ...updated[i], [field]: value };
    setExchanges(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        ticker,
        ...form,
        riskDescription: form.riskDescription || null,
        paradigmaUrl: form.paradigmaUrl || null,
        websiteUrl: form.websiteUrl || null,
        coingeckoUrl: form.coingeckoUrl || null,
        tradingviewUrl: form.tradingviewUrl || null,
        defillamaUrl: form.defillamaUrl || null,
        exchanges: exchanges.filter((e) => e.name && e.url),
      };

      const res = await fetch("/api/admin/assets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.toString() || "Erro ao salvar ativo");
      }

      setSuccess("Ativo atualizado com sucesso!");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const riskOptions = [
    { value: "low", label: "Baixo", color: "text-emerald-400" },
    { value: "medium", label: "Médio", color: "text-amber-400" },
    { value: "high", label: "Alto", color: "text-orange-400" },
    { value: "very_high", label: "Muito Alto", color: "text-red-400" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold text-gray-100 mb-1">Editar Ativo</h1>
      <p className="text-sm text-gray-500 mb-6 font-mono">{ticker}</p>

      <div className="bg-surface-1 rounded-xl border border-surface-3 p-6 space-y-5">
        {/* Symbol + Display Name */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Símbolo
            </label>
            <input
              type="text"
              value={form.symbol}
              onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })}
              className="w-full bg-surface-2 border border-surface-4 rounded-lg px-3 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-brand-500 font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Nome de exibição
            </label>
            <input
              type="text"
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              className="w-full bg-surface-2 border border-surface-4 rounded-lg px-3 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-brand-500"
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

        {/* Risk Description (tooltip) */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            Descrição do Risco <span className="text-gray-600 normal-case">(tooltip ao passar o mouse)</span>
          </label>
          <input
            type="text"
            value={form.riskDescription}
            onChange={(e) => setForm({ ...form, riskDescription: e.target.value })}
            placeholder="Ex: Ativo consolidado com alta liquidez e histórico longo."
            className="w-full bg-surface-2 border border-surface-4 rounded-lg px-4 py-2.5 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-brand-500"
          />
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
            className="w-full bg-surface-2 border border-surface-4 rounded-lg px-4 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-brand-500"
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
                <button onClick={() => removeExchange(i)} className="p-1.5 text-gray-600 hover:text-red-400 transition-colors">
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <button onClick={addExchange} className="mt-2 w-full py-2.5 border border-dashed border-surface-4 rounded-lg text-sm text-gray-500 hover:text-gray-300 hover:border-surface-3 transition-colors">
            + Adicionar Corretora
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">{error}</div>
        )}
        {success && (
          <div className="px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm text-emerald-400">{success}</div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 text-sm font-medium bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg transition-colors">
            {saving ? "Salvando..." : "Salvar"}
          </button>
          <button onClick={() => router.back()} className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-300 transition-colors">
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
}
