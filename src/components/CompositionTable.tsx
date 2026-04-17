"use client";

import { useState, useRef, useEffect } from "react";
import type { CompositionItem } from "@/types";

interface Props {
  compositions: CompositionItem[];
  isClosed?: boolean;
}

const RISK_LABELS: Record<string, { label: string; color: string }> = {
  low: { label: "Baixo", color: "text-emerald-400" },
  medium: { label: "Médio", color: "text-amber-400" },
  high: { label: "Alto", color: "text-orange-400" },
  very_high: { label: "Muito Alto", color: "text-red-400" },
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

function formatPrice(price: number | null): string {
  if (price === null) return "—";
  if (price >= 1) return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  if (price >= 0.0001) return `$${price.toFixed(6)}`;
  return `$${price.toFixed(8)}`;
}

// Map exchange/platform names to logo filenames (in /public/logos/)
const LOGO_MAP: Record<string, string> = {
  Binance: "binance.png",
  Coinbase: "coinbase.png",
  Hyperliquid: "hyperliquid.png",
  MercadoBitcoin: "mercadobitcoin.png",
  Uniswap: "uniswap.png",
  Jupiter: "jupiter.png",
  CoinGecko: "coingecko.png",
  TradingView: "tradingview.png",
  DeFiLlama: "defillama.png",
  Paradigma: "paradigma.png",
  Website: "",
};

/**
 * Generic hover tooltip — uses fixed positioning to escape any overflow container.
 * Opens above the element.
 */
function Tooltip({
  children,
  content,
}: {
  children: React.ReactNode;
  content: React.ReactNode;
}) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  const handleEnter = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
      });
    }
    setShow(true);
  };

  return (
    <div
      className="inline-flex"
      ref={triggerRef}
      onMouseEnter={handleEnter}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{ top: pos.top, left: pos.left, transform: "translate(-50%, -100%)" }}
        >
          <div className="bg-surface-2 border border-surface-4 rounded-lg shadow-2xl px-3.5 py-2.5 text-xs text-gray-300 max-w-[340px] w-max">
            <div className="whitespace-normal">{content}</div>
          </div>
          <div className="w-2 h-2 bg-surface-2 border-r border-b border-surface-4 rotate-45 mx-auto -mt-1" />
        </div>
      )}
    </div>
  );
}

function ExternalLinkIcon({
  name,
  url,
  isParadigma = false,
}: {
  name: string;
  url: string;
  isParadigma?: boolean;
}) {
  const logo = LOGO_MAP[name];

  if (isParadigma) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={name}
        className="inline-flex items-center justify-center w-8 h-8 rounded-full overflow-hidden shadow-[0_0_0_1.5px_#c9a227,0_0_6px_rgba(201,162,39,0.2)] hover:shadow-[0_0_0_1.5px_#d4af37,0_0_10px_rgba(201,162,39,0.35)] transition-all"
      >
        <img
          src={`/logos/${logo}`}
          alt={name}
          className="w-full h-full object-cover scale-110"
          loading="lazy"
        />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={name}
      className="inline-flex items-center justify-center w-7 h-7 rounded-full overflow-hidden hover:ring-2 hover:ring-surface-4 transition-all"
    >
      {logo ? (
        <img
          src={`/logos/${logo}`}
          alt={name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <span className="w-full h-full flex items-center justify-center bg-surface-3 text-gray-400">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
        </span>
      )}
    </a>
  );
}

/**
 * Overflow button: shows "+N" and reveals a dropdown with the remaining links.
 */
function OverflowLinks({
  links,
}: {
  links: { name: string; url: string; isParadigma?: boolean }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-surface-3 hover:bg-surface-4 transition-colors text-[10px] font-semibold text-gray-400"
      >
        +{links.length}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 bg-surface-2 border border-surface-4 rounded-lg shadow-xl py-1.5 min-w-[160px]">
          {links.map((link) => {
            const logo = LOGO_MAP[link.name];
            return (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-surface-3 transition-colors"
              >
                {logo ? (
                  <img
                    src={`/logos/${logo}`}
                    alt={link.name}
                    className="w-5 h-5 rounded-full object-cover"
                  />
                ) : (
                  <span className="w-5 h-5 rounded-full bg-surface-4 flex items-center justify-center text-gray-400">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M2 12h20" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                  </span>
                )}
                <span className="text-xs text-gray-300">{link.name}</span>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Renders a row of link icons, limited to MAX_VISIBLE.
 */
const MAX_VISIBLE = 3;

function LinkIcons({
  links,
}: {
  links: { name: string; url: string; isParadigma?: boolean }[];
}) {
  if (links.length === 0) {
    return <span className="text-xs text-gray-600">—</span>;
  }

  if (links.length <= MAX_VISIBLE) {
    return (
      <div className="flex items-center justify-center gap-1.5">
        {links.map((link) => (
          <ExternalLinkIcon
            key={link.name}
            name={link.name}
            url={link.url}
            isParadigma={link.isParadigma}
          />
        ))}
      </div>
    );
  }

  const visible = links.slice(0, MAX_VISIBLE - 1);
  const overflow = links.slice(MAX_VISIBLE - 1);

  return (
    <div className="flex items-center justify-center gap-1.5">
      {visible.map((link) => (
        <ExternalLinkIcon
          key={link.name}
          name={link.name}
          url={link.url}
          isParadigma={link.isParadigma}
        />
      ))}
      <OverflowLinks links={overflow} />
    </div>
  );
}

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

export function CompositionTable({ compositions, isClosed = false }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-3">
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Ativo
            </th>
            <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Alocação
            </th>
            <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">
              Market Cap
            </th>
            <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
              Risco
            </th>
            <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
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
            const isStablecoin = c.assetId === "stablecoins";
            const roi = formatROI(isStablecoin ? null : c.roi);
            const exchanges = (c.asset.exchanges as { name: string; url: string }[]) || [];

            const exchangeLinks = exchanges.map((ex) => ({
              name: ex.name,
              url: ex.url,
            }));

            const infoLinks: { name: string; url: string; isParadigma?: boolean }[] = [];
            if (c.asset.paradigmaUrl) {
              infoLinks.push({ name: "Paradigma", url: c.asset.paradigmaUrl, isParadigma: true });
            }
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
                        {c.asset.symbol}
                      </p>
                      <p className="text-xs text-gray-500">{c.asset.displayName}</p>
                    </div>
                  </div>
                </td>

                {/* Allocation */}
                <td className="py-3 px-4 text-center">
                  <span className="font-mono font-medium text-gray-200">
                    {(c.weight * 100).toFixed(0)}%
                  </span>
                </td>

                {/* Market Cap */}
                <td className="py-3 px-4 text-center hidden sm:table-cell">
                  <span className="font-mono text-gray-400">
                    {formatMarketCap(c.marketCap)}
                  </span>
                </td>

                {/* Risk — with tooltip */}
                <td className="py-3 px-4 text-center hidden md:table-cell">
                  {c.asset.riskDescription ? (
                    <Tooltip
                      content={c.asset.riskDescription}
                    >
                      <span className={`text-xs font-medium ${risk.color} cursor-help border-b border-dotted border-current`}>
                        {risk.label}
                      </span>
                    </Tooltip>
                  ) : (
                    <span className={`text-xs font-medium ${risk.color}`}>
                      {risk.label}
                    </span>
                  )}
                </td>

                {/* ROI — with tooltip showing entry/current price */}
                <td className="py-3 px-4 text-center">
                  {!isStablecoin && c.entryPrice !== null && c.currentPrice !== null ? (
                    <Tooltip
                      content={
                        <div className="space-y-1">
                          <div className="flex justify-between gap-4">
                            <span className="text-gray-500">Entrada:</span>
                            <span className="font-mono">{formatPrice(c.entryPrice)}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-gray-500">{isClosed ? "Saída:" : "Atual:"}</span>
                            <span className="font-mono">{formatPrice(c.currentPrice)}</span>
                          </div>
                        </div>
                      }
                    >
                      <span className={`font-mono font-medium ${roi.color} cursor-help border-b border-dotted border-current`}>
                        {roi.text}
                      </span>
                    </Tooltip>
                  ) : (
                    <span className={`font-mono font-medium ${roi.color}`}>
                      {roi.text}
                    </span>
                  )}
                </td>

                {/* Exchanges */}
                <td className="py-3 px-4 text-center hidden lg:table-cell">
                  <LinkIcons links={exchangeLinks} />
                </td>

                {/* Info Links */}
                <td className="py-3 px-4 text-center hidden lg:table-cell">
                  <LinkIcons links={infoLinks} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
