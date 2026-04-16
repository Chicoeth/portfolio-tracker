// ─── API Response Types ─────────────────────────────────

export interface WalletListItem {
  id: string;
  name: string;
  category: "main" | "thematic" | "past";
  status: "active" | "closed";
  closedAt: string | null;
  sortOrder: number;
}

export interface AssetInfo {
  ticker: string;
  displayName: string;
  symbol: string;
  riskLevel: "low" | "medium" | "high" | "very_high";
  description: string;
  iconUrl: string | null;
  paradigmaUrl: string | null;
  websiteUrl: string | null;
  coingeckoUrl: string | null;
  tradingviewUrl: string | null;
  defillamaUrl: string | null;
  exchanges: { name: string; url: string }[];
}

export interface CompositionItem {
  assetId: string;
  weight: number;
  startDate: string;
  asset: AssetInfo;
  currentPrice: number | null;
  marketCap: string | null;
  entryPrice: number | null;
  roi: number | null;
}

export interface RebalanceEventInfo {
  id: string;
  date: string;
  type: "initial" | "rebalance" | "swap" | "mixed";
  notes: string | null;
  portfolioValue: number;
}

export interface WalletDetail {
  wallet: {
    id: string;
    name: string;
    description: string;
    category: "main" | "thematic" | "past";
    status: "active" | "closed";
    closedAt: string | null;
    createdAt: string;
  };
  currentComposition: CompositionItem[];
  rebalanceEvents: RebalanceEventInfo[];
  allCompositions: {
    id: string;
    assetId: string;
    weight: number;
    startDate: string;
    endDate: string | null;
    eventId: string;
    displayName: string;
    symbol: string;
  }[];
}

export interface PerformancePoint {
  date: string;
  portfolioValue: number;
  portfolioValueBrl?: number;
  portfolioValueBtc?: number;
  assetValues?: Record<string, number>;
}

export interface RebalanceMarker {
  date: string;
  type: string;
  notes: string | null;
  portfolioValue: number;
  prevWeights: Record<string, number>;
  newWeights: Record<string, number>;
  changes: {
    added: string[];
    removed: string[];
    weightChanges: { assetId: string; from: number; to: number }[];
  };
}

export interface PerformanceData {
  points: PerformancePoint[];
  markers: RebalanceMarker[];
}
