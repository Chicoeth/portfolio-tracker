"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

interface WalletData {
  id: string;
  name: string;
  description: string;
  category: string;
  status: string;
  closedAt: string | null;
  sortOrder: number;
}

export default function EditWalletPage() {
  const router = useRouter();
  const params = useParams();
  const walletId = params.id as string;

  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/wallets/${walletId}`)
      .then((r) => r.json())
      .then((data) => {
        setWallet(data.wallet);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [walletId]);

  const handleSave = async () => {
    if (!wallet) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/admin/wallets/${walletId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: wallet.name,
          description: wallet.description,
          category: wallet.category,
          sortOrder: wallet.sortOrder,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.toString() || "Erro ao salvar");
      }

      setSuccess("Carteira atualizada com sucesso!");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = async () => {
    if (!confirm("Tem certeza que deseja encerrar esta carteira? Ela será movida para Carteiras Passadas.")) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/wallets/${walletId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "closed" }),
      });

      if (!res.ok) throw new Error("Erro ao encerrar carteira");

      router.push("/admin");
    } catch (e: any) {
      setError(e.message);
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("ATENÇÃO: Isso vai deletar permanentemente esta carteira e todos os dados associados. Continuar?")) return;

    try {
      const res = await fetch(`/api/admin/wallets/${walletId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Erro ao deletar");

      router.push("/admin");
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (loading || !wallet) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-100">Editar Carteira</h1>
        <a
          href={`/admin/wallets/${walletId}/rebalance`}
          className="px-4 py-2 text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
        >
          Rebalancear
        </a>
      </div>

      <div className="bg-surface-1 rounded-xl border border-surface-3 p-6 space-y-5">
        {/* Name */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            Nome
          </label>
          <input
            type="text"
            value={wallet.name}
            onChange={(e) => setWallet({ ...wallet, name: e.target.value })}
            className="w-full bg-surface-2 border border-surface-4 rounded-lg px-4 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-brand-500"
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
                onClick={() => setWallet({ ...wallet, category: cat })}
                className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                  wallet.category === cat
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
            value={wallet.description}
            onChange={(e) => setWallet({ ...wallet, description: e.target.value })}
            rows={10}
            className="w-full bg-surface-2 border border-surface-4 rounded-lg px-4 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-brand-500 font-mono"
          />
        </div>

        {/* Sort order */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            Ordem de exibição
          </label>
          <input
            type="number"
            value={wallet.sortOrder}
            onChange={(e) =>
              setWallet({ ...wallet, sortOrder: parseInt(e.target.value) || 0 })
            }
            className="w-24 bg-surface-2 border border-surface-4 rounded-lg px-4 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-brand-500"
          />
        </div>

        {/* Messages */}
        {error && (
          <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm text-emerald-400">
            {success}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 text-sm font-medium bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
            <button
              onClick={() => router.back()}
              className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              Voltar
            </button>
          </div>

          <div className="flex items-center gap-2">
            {wallet.status === "active" && (
              <button
                onClick={handleClose}
                className="px-4 py-2 text-xs font-medium text-amber-400 border border-amber-500/30 rounded-lg hover:bg-amber-500/10 transition-colors"
              >
                Encerrar Carteira
              </button>
            )}
            <button
              onClick={handleDelete}
              className="px-4 py-2 text-xs font-medium text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors"
            >
              Deletar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
