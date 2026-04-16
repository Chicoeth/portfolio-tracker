"use client";

import type { CompositionItem } from "@/types";

interface Props {
  compositions: CompositionItem[];
}

const RISK_LABELS: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "text-emerald-400" },
  medium: { label: "Medium", color: "text-amber-400" },
  high: { label: "High", color: "text-orange-400" },
  very_high: { label: "Very High", color: "text-red-400" },
};

function formatMarketCap(mc: string | null): string {
  if (!mc) return "—";
  const n = Number(mc);
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}

function formatROI(roi: number | null): { text: string; color: string } {
  if (roi === null) return { text: "—", color: "text-gray-500" };
  const sign = roi >= 0 ? "+" : "";
  return {
    text: `${sign}${roi.toFixed(1)}%`,
    color: roi >= 0 ? "text-gain" : "text-loss",
  };
}

// Map exchange/platform names to logo filenames
const LOGO_MAP: Record<string, string> = {
  Binance: "binance.svg",
  Coinbase: "coinbase.svg",
  Hyperliquid: "hyperliquid.svg",
  MercadoBitcoin: "mercadobitcoin.svg",
  Uniswap: "uniswap.svg",
  Jupiter: "jupiter.svg",
  CoinGecko: "coingecko.svg",
  TradingView: "tradingview.svg",
  DeFiLlama: "defillama.svg",
};

function ExternalLinkIcon({
  name,
  url,
}: {
  name: string;
  url: string;
}) {
  const logo = LOGO_MAP[name];

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={name}
      className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-surface-3 hover:bg-surface-4 transition-colors"
    >
      {logo ? (
        <img
          src={`/logos/${logo}`}
          alt={name}
          className="w-4 h-4 object-contain"
        />
      ) : (
        <span className="text-[10px] text-gray-400 font-medium">
          {name.slice(0, 2)}
        </span>
      )}
    </a>
  );
}

/**
 * Renderiza o ícone do ativo: usa iconUrl se disponível,
 * senão cai no fallback do símbolo em texto.
 */
function AssetIcon({
  iconUrl,
  symbol,
  displayName,
}: {
  iconUrl: string | null;
  symbol: string;
  displayName: string;
}) {
  if (iconUrl) {
    return (
      <div className="w-8 h-8 rounded-full bg-surface-3 flex items-center justify-center shrink-0 overflow-hidden">
        <img
          src={iconUrl}
          alt={displayName}
          className="w-8 h-8 object-contain"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className="w-8 h-8 rounded-full bg-surface-3 flex items-center justify-center text-xs font-bold text-gray-300 shrink-0">
      {symbol.slice(0, 3)}
    </div>
  );
}

export function CompositionTable({ compositions }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-3">
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Ativo
            </th>
            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Alocação
            </th>
            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">
              Market Cap
            </th>
            <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
              Risco
            </th>
            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              ROI
            </th>
            <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">
              Onde Comprar
            </th>
            <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">
              Saiba Mais
            </th>
          </tr>
        </thead>
        <tbody>
          {compositions.map((c) => {
            const risk = RISK_LABELS[c.asset.riskLevel];
            const roi = formatROI(c.roi);
            const exchanges = (c.asset.exchanges as { name: string; url: string }[]) || [];

            const infoLinks: { name: string; url: string }[] = [];
            if (c.asset.websiteUrl) infoLinks.push({ name: "Website", url: c.asset.websiteUrl });
            if (c.asset.coingeckoUrl) infoLinks.push({ name: "CoinGecko", url: c.asset.coingeckoUrl });
            if (c.asset.tradingviewUrl) infoLinks.push({ name: "TradingView", url: c.asset.tradingviewUrl });
            if (c.asset.defillamaUrl) infoLinks.push({ name: "DeFiLlama", url: c.asset.defillamaUrl });

            return (
              <tr
                key={c.assetId}
                className="border-b border-surface-3/50 hover:bg-surface-2/50 transition-colors"
              >
                {/* Asset */}
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <AssetIcon
                      iconUrl={c.asset.iconUrl}
                      symbol={c.asset.symbol}
                      displayName={c.asset.displayName}
                    />
                    <div>
                      <p className="font-medium text-gray-100">
                        {c.asset.displayName}
                      </p>
                      <p className="text-xs text-gray-500">{c.asset.symbol}</p>
                    </div>
                  </div>
                </td>

                {/* Allocation */}
                <td className="py-3 px-4 text-right">
                  <span className="font-mono font-medium text-gray-200">
                    {(c.weight * 100).toFixed(0)}%
                  </span>
                </td>

                {/* Market Cap */}
                <td className="py-3 px-4 text-right hidden sm:table-cell">
                  <span className="font-mono text-gray-400">
                    {formatMarketCap(c.marketCap)}
                  </span>
                </td>

                {/* Risk */}
                <td className="py-3 px-4 text-center hidden md:table-cell">
                  <span className={`text-xs font-medium ${risk.color}`}>
                    {risk.label}
                  </span>
                </td>

                {/* ROI */}
                <td className="py-3 px-4 text-right">
                  <span className={`font-mono font-medium ${roi.color}`}>
                    {roi.text}
                  </span>
                </td>

                {/* Exchanges */}
                <td className="py-3 px-4 hidden lg:table-cell">
                  <div className="flex items-center justify-center gap-1">
                    {exchanges.map((ex) => (
                      <ExternalLinkIcon key={ex.name} name={ex.name} url={ex.url} />
                    ))}
                    {exchanges.length === 0 && (
                      <span className="text-xs text-gray-600">—</span>
                    )}
                  </div>
                </td>

                {/* Info Links */}
                <td className="py-3 px-4 hidden lg:table-cell">
                  <div className="flex items-center justify-center gap-1">
                    {infoLinks.map((link) => (
                      <ExternalLinkIcon key={link.name} name={link.name} url={link.url} />
                    ))}
                    {infoLinks.length === 0 && (
                      <span className="text-xs text-gray-600">—</span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
