"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import type { PerformanceData, RebalanceMarker } from "@/types";

interface Props {
  walletId: string;
  assetNames?: Record<string, string>;
}

const ASSET_COLORS = [
  "#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899", "#10b981",
  "#06b6d4", "#f97316", "#6366f1", "#14b8a6", "#e11d48",
];

type TimeRange = "30d" | "90d" | "180d" | "1y" | "all";
type Denomination = "usd" | "brl";

// ─── Helper: short asset name ───────────────────────────

function shortName(assetId: string, assetNames?: Record<string, string>): string {
  const full = assetNames?.[assetId];
  if (!full) return assetId;
  // Extract symbol from "Bitcoin (BTC)" → "BTC"
  const match = full.match(/\(([^)]+)\)/);
  return match ? match[1] : full;
}

// ─── Custom Tooltip ─────────────────────────────────────

function CustomTooltip({ active, payload, label, denomination, assetNames, markers }: any) {
  if (!active || !payload?.length) return null;

  const dateStr = new Date(label).toLocaleDateString("pt-BR");

  // Check if this date is near a rebalance date (±2 days)
  const findNearbyMarker = (date: string, markers: RebalanceMarker[]): RebalanceMarker | undefined => {
    if (!markers?.length) return undefined;
    const d = new Date(date).getTime();
    const TWO_DAYS = 2 * 86400000;
    return markers.find((m) => {
      const md = new Date(m.date).getTime();
      return Math.abs(d - md) <= TWO_DAYS;
    });
  };

  const marker = findNearbyMarker(label, markers);

  const portfolioLines = payload.filter(
    (p: any) => p.dataKey === "portfolio" || p.dataKey === "vsBtc"
  );
  const assetLines = payload.filter(
    (p: any) => p.dataKey !== "portfolio" && p.dataKey !== "vsBtc" && p.value != null
  );

  const formatPct = (value: number) => {
    const pct = (value - 100).toFixed(1);
    const sign = Number(pct) >= 0 ? "+" : "";
    return `${sign}${pct}%`;
  };

  const getLabel = (name: string) => {
    if (name === "portfolio") return `Carteira vs ${denomination.toUpperCase()}`;
    if (name === "vsBtc") return "Carteira vs BTC";
    return assetNames?.[name.replace("asset_", "")] || name.replace("asset_", "");
  };

  // Sort weights desc, return list of [symbol, pct]
  const sortedWeights = (weights: Record<string, number>) =>
    Object.entries(weights)
      .sort((a, b) => b[1] - a[1])
      .map(([assetId, weight]) => ({
        symbol: shortName(assetId, assetNames),
        pct: (weight * 100).toFixed(0),
      }));

  return (
    <div
      className="bg-surface-2 border border-surface-4 rounded-lg shadow-xl text-xs overflow-hidden"
      style={{ width: marker ? 260 : "auto", maxWidth: 320, minWidth: 200 }}
    >
      {/* Date */}
      <div className="px-3 pt-2.5 pb-1.5 text-gray-500 text-[11px]">{dateStr}</div>

      {/* Portfolio lines */}
      <div className="px-3 pb-1.5 space-y-0.5">
        {portfolioLines.map((p: any, i: number) => {
          if (p.value == null) return null;
          const pct = Number((p.value - 100).toFixed(1));
          return (
            <div key={i} className="flex justify-between items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-[3px] rounded-sm" style={{ backgroundColor: p.stroke }} />
                <span className="text-gray-300">{getLabel(p.dataKey)}</span>
              </span>
              <span className={`font-mono font-semibold ${pct >= 0 ? "text-gain" : "text-loss"}`}>
                {formatPct(p.value)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Asset lines */}
      {assetLines.length > 0 && (
        <>
          <div className="border-t border-surface-4" />
          <div className="px-3 py-1.5 space-y-0.5">
            {assetLines.map((p: any, i: number) => {
              const pct = Number((p.value - 100).toFixed(1));
              return (
                <div key={i} className="flex justify-between items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-[2px] rounded-sm opacity-60" style={{ backgroundColor: p.stroke }} />
                    <span className="text-gray-500 text-[11px]">{getLabel(p.dataKey)}</span>
                  </span>
                  <span className={`font-mono text-[11px] ${pct >= 0 ? "text-gain" : "text-loss"}`}>
                    {formatPct(p.value)}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Rebalance info — Antes → Depois (vertical layout) */}
      {marker && marker.prevWeights && marker.newWeights && (
        <>
          <div className="border-t border-violet-500/30" />
          <div className="px-3 py-2 bg-violet-500/5">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-violet-400 text-[11px] font-semibold">⟳ Rebalanceamento</span>
            </div>

            {/* Two columns with arrow */}
            <div className="flex items-center gap-2">
              {/* Antes */}
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-gray-500 font-medium mb-1 text-center">
                  Antes
                </div>
                <div className="space-y-0.5">
                  {sortedWeights(marker.prevWeights).map((w, i) => (
                    <div
                      key={i}
                      className="text-[11px] text-gray-400 font-mono text-center whitespace-nowrap"
                    >
                      {w.symbol} — {w.pct}%
                    </div>
                  ))}
                </div>
              </div>

              {/* Arrow */}
              <div className="text-violet-400/70 text-base shrink-0 self-center">
                →
              </div>

              {/* Depois */}
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-gray-500 font-medium mb-1 text-center">
                  Depois
                </div>
                <div className="space-y-0.5">
                  {sortedWeights(marker.newWeights).map((w, i) => (
                    <div
                      key={i}
                      className="text-[11px] text-gray-300 font-mono text-center whitespace-nowrap"
                    >
                      {w.symbol} — {w.pct}%
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {marker.notes && (
              <div className="text-[10px] text-gray-500 mt-2 pt-2 border-t border-violet-500/20 italic leading-relaxed break-words whitespace-normal">
                {marker.notes}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────

export function PerformanceChart({ walletId, assetNames = {} }: Props) {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [denomination, setDenomination] = useState<Denomination>("usd");
  const [showAssets, setShowAssets] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>("all");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/wallets/${walletId}/performance`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [walletId]);

  const filteredPoints = useMemo(() => {
    if (!data?.points?.length) return [];
    const now = new Date();
    let cutoff: Date | null = null;
    switch (timeRange) {
      case "30d":  cutoff = new Date(now.getTime() - 30 * 86400000); break;
      case "90d":  cutoff = new Date(now.getTime() - 90 * 86400000); break;
      case "180d": cutoff = new Date(now.getTime() - 180 * 86400000); break;
      case "1y":   cutoff = new Date(now.getTime() - 365 * 86400000); break;
      default:     cutoff = null;
    }
    if (!cutoff) return data.points;
    const cutoffStr = cutoff.toISOString().split("T")[0];
    return data.points.filter((p) => p.date >= cutoffStr);
  }, [data, timeRange]);

  const assetIds = useMemo(() => {
    if (!filteredPoints.length) return [];
    const ids = new Set<string>();
    for (const p of filteredPoints) {
      if (p.assetValues) Object.keys(p.assetValues).forEach((id) => ids.add(id));
    }
    return Array.from(ids);
  }, [filteredPoints]);

  const chartData = useMemo(() => {
    if (!filteredPoints.length) return [];
    const first = filteredPoints[0];
    const baseUsd = first.portfolioValue || 100;
    const baseBtc = first.portfolioValueBtc || 100;
    const baseBrl = first.portfolioValueBrl || first.portfolioValue || 100;
    const assetBases: Record<string, number> = {};

    return filteredPoints.map((p) => {
      const entry: Record<string, any> = {
        date: p.date,
        portfolio: denomination === "brl" && p.portfolioValueBrl
          ? (p.portfolioValueBrl / baseBrl) * 100
          : (p.portfolioValue / baseUsd) * 100,
        vsBtc: p.portfolioValueBtc ? (p.portfolioValueBtc / baseBtc) * 100 : null,
      };
      if (showAssets && p.assetValues) {
        for (const [id, val] of Object.entries(p.assetValues)) {
          if (!assetBases[id]) assetBases[id] = val;
          entry[`asset_${id}`] = (val / assetBases[id]) * 100;
        }
      }
      return entry;
    });
  }, [filteredPoints, denomination, showAssets]);

  const visibleMarkers = useMemo(() => {
    if (!data?.markers?.length || !chartData.length) return [];
    const first = chartData[0].date;
    const last = chartData[chartData.length - 1].date;
    return data.markers.filter((m) => m.date >= first && m.date <= last);
  }, [data?.markers, chartData]);

  if (loading) {
    return (
      <div className="h-[400px] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data || chartData.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center text-gray-500 text-sm">
        Sem dados de performance disponíveis
      </div>
    );
  }

  const lastPoint = chartData[chartData.length - 1];
  const portfolioReturn = lastPoint ? (lastPoint.portfolio - 100).toFixed(1) : "0";
  const btcReturn = lastPoint?.vsBtc != null ? (lastPoint.vsBtc - 100).toFixed(1) : null;

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex gap-1 bg-surface-2 rounded-lg p-0.5">
          {(["30d", "90d", "180d", "1y", "all"] as TimeRange[]).map((range) => (
            <button key={range} onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                timeRange === range ? "bg-surface-4 text-gray-100" : "text-gray-500 hover:text-gray-300"
              }`}>
              {range === "all" ? "Tudo" : range.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-surface-2 rounded-lg p-0.5">
            {(["usd", "brl"] as Denomination[]).map((d) => (
              <button key={d} onClick={() => setDenomination(d)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  denomination === d ? "bg-surface-4 text-gray-100" : "text-gray-500 hover:text-gray-300"
                }`}>
                {d.toUpperCase()}
              </button>
            ))}
          </div>
          <button onClick={() => setShowAssets(!showAssets)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              showAssets
                ? "border-brand-500 bg-brand-500/10 text-brand-400"
                : "border-surface-4 text-gray-500 hover:text-gray-300"
            }`}>
            Componentes
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="flex gap-6 mb-4">
        <div>
          <span className="text-xs text-gray-500">Carteira vs {denomination.toUpperCase()}</span>
          <p className={`text-lg font-mono font-semibold ${Number(portfolioReturn) >= 0 ? "text-gain" : "text-loss"}`}>
            {Number(portfolioReturn) >= 0 ? "+" : ""}{portfolioReturn}%
          </p>
        </div>
        {btcReturn !== null && (
          <div>
            <span className="text-xs text-gray-500">Carteira vs BTC</span>
            <p className={`text-lg font-mono font-semibold ${Number(btcReturn) >= 0 ? "text-gain" : "text-loss"}`}>
              {Number(btcReturn) >= 0 ? "+" : ""}{btcReturn}%
            </p>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6b7280" }}
              tickFormatter={(d) => { const dt = new Date(d); return `${dt.getDate()}/${dt.getMonth()+1}`; }}
              interval="preserveStartEnd" minTickGap={60} />
            <YAxis tick={{ fontSize: 11, fill: "#6b7280" }}
              tickFormatter={(v) => `${v.toFixed(0)}`} domain={["auto", "auto"]} />
            <Tooltip content={<CustomTooltip denomination={denomination} assetNames={assetNames} markers={visibleMarkers} />} />

            {/* Rebalance markers — dashed vertical lines */}
            {visibleMarkers.map((marker, i) => (
              <ReferenceLine key={`r-${i}`} x={marker.date}
                stroke="#8b5cf6" strokeDasharray="6 4" strokeWidth={1.5} strokeOpacity={0.6} />
            ))}

            <ReferenceLine y={100} stroke="#374151" strokeDasharray="2 2" />

            <Line type="monotone" dataKey="portfolio" stroke="#0c99e9" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="vsBtc" stroke="#f59e0b" strokeWidth={2} dot={false} connectNulls />

            {showAssets && assetIds.map((id, i) => (
              <Line key={id} type="monotone" dataKey={`asset_${id}`}
                stroke={ASSET_COLORS[i % ASSET_COLORS.length]}
                strokeWidth={1} strokeOpacity={0.4} dot={false} connectNulls />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend — only portfolio lines and assets, NOT rebalance */}
      <div className="flex flex-wrap gap-4 mt-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-brand-500 rounded" />
          <span className="text-gray-400">Carteira vs {denomination.toUpperCase()}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-amber-500 rounded" />
          <span className="text-gray-400">Carteira vs BTC</span>
        </div>
        {showAssets && assetIds.map((id, i) => (
          <div key={id} className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded"
              style={{ backgroundColor: ASSET_COLORS[i % ASSET_COLORS.length], opacity: 0.4 }} />
            <span className="text-gray-500">{assetNames[id] || id}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
