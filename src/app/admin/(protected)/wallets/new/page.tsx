"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewWalletPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "thematic" as "main" | "thematic" | "past",
    sortOrder: 0,
  });

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
      <h1 className="text-xl font-semibold text-gray-100 mb-6">Nova Carteira</h1>

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
            disabled={saving || !form.name}
            className="px-6 py-2.5 text-sm font-medium bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            {saving ? "Salvando..." : "Criar Carteira"}
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
