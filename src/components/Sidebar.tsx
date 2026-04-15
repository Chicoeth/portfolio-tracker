"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { WalletListItem } from "@/types";

export function Sidebar() {
  const pathname = usePathname();
  const [wallets, setWallets] = useState<WalletListItem[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    thematic: true,
    past: false,
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    fetch("/api/wallets")
      .then((r) => r.json())
      .then(setWallets)
      .catch(console.error);
  }, []);

  const mainWallet = wallets.find((w) => w.category === "main");
  const thematicWallets = wallets.filter((w) => w.category === "thematic");
  const pastWallets = wallets.filter((w) => w.category === "past");

  const isActive = (id: string) => pathname === `/carteira/${id}` || (pathname === "/" && mainWallet?.id === id);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const navContent = (
    <nav className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-surface-3">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">P</span>
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-100 tracking-tight">
              Portfolio Tracker
            </span>
            <span className="block text-[10px] text-gray-500 uppercase tracking-widest">
              Paradigma
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {/* Main Wallet */}
        {mainWallet && (
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              isActive(mainWallet.id)
                ? "bg-brand-600/20 text-brand-400"
                : "text-gray-300 hover:bg-surface-2 hover:text-gray-100"
            }`}
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1l2 3h5l-4 3.5 1.5 4.5L8 9.5 3.5 12 5 7.5 1 4h5z" />
            </svg>
            <span className="font-medium">{mainWallet.name}</span>
          </Link>
        )}

        {/* Thematic Wallets */}
        {thematicWallets.length > 0 && (
          <div className="pt-3">
            <button
              onClick={() => toggleSection("thematic")}
              className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-400 transition-colors"
            >
              <span>Carteiras Temáticas</span>
              <svg
                className={`w-3.5 h-3.5 transition-transform ${
                  expandedSections.thematic ? "rotate-90" : ""
                }`}
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M6 3l5 5-5 5V3z" />
              </svg>
            </button>

            {expandedSections.thematic && (
              <div className="mt-1 space-y-0.5">
                {thematicWallets.map((w) => (
                  <Link
                    key={w.id}
                    href={`/carteira/${w.id}`}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive(w.id)
                        ? "bg-brand-600/20 text-brand-400"
                        : "text-gray-400 hover:bg-surface-2 hover:text-gray-100"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                    <span>{w.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Past Wallets */}
        {pastWallets.length > 0 && (
          <div className="pt-3">
            <button
              onClick={() => toggleSection("past")}
              className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-400 transition-colors"
            >
              <span>Carteiras Passadas</span>
              <svg
                className={`w-3.5 h-3.5 transition-transform ${
                  expandedSections.past ? "rotate-90" : ""
                }`}
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M6 3l5 5-5 5V3z" />
              </svg>
            </button>

            {expandedSections.past && (
              <div className="mt-1 space-y-0.5">
                {pastWallets.map((w) => (
                  <Link
                    key={w.id}
                    href={`/carteira/${w.id}`}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive(w.id)
                        ? "bg-brand-600/20 text-brand-400"
                        : "text-gray-500 hover:bg-surface-2 hover:text-gray-400"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0 opacity-50" />
                    <span className="opacity-70">{w.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-surface-3">
        <p className="text-[10px] text-gray-600 text-center">
          Dados de preço via Paradigma Education
        </p>
      </div>
    </nav>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-surface-2 rounded-lg border border-surface-4"
      >
        <svg className="w-5 h-5 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — desktop */}
      <aside className="hidden lg:block w-64 shrink-0 bg-surface-1 border-r border-surface-3 h-screen sticky top-0">
        {navContent}
      </aside>

      {/* Sidebar — mobile */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-surface-1 border-r border-surface-3 transform transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {navContent}
      </aside>
    </>
  );
}
