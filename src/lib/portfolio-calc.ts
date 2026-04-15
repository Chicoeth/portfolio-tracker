// ─── Types ──────────────────────────────────────────────

export interface PricePoint {
  date: string;
  priceUsd: number;
  marketCap?: number;
}

export interface CompositionPeriod {
  startDate: string;
  endDate: string | null; // exclusive — this date belongs to the NEXT period
  weights: Record<string, number>;
  eventId: string;
  portfolioValueAtStart: number;
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

// ─── Calculation ────────────────────────────────────────

export function calculatePerformance(
  compositions: CompositionPeriod[],
  prices: Record<string, PricePoint[]>,
  exchangeRates: Record<string, number>,
  btcPrices: Record<string, number>
): { points: PerformancePoint[]; markers: RebalanceMarker[] } {
  if (compositions.length === 0) return { points: [], markers: [] };

  const sortedComps = [...compositions].sort(
    (a, b) => a.startDate.localeCompare(b.startDate)
  );

  const allPoints: PerformancePoint[] = [];
  let accumulatedValue = 100;

  // Global first-day references (set once, never reset)
  let firstBtcPrice: number | null = null;
  let firstExchangeRate: number | null = null;

  // Track individual asset lines
  const assetEntryPrices: Record<string, number> = {};
  const assetExitDates: Record<string, string> = {};
  // Track ALL assets ever in portfolio for the component lines
  const allAssetsSeen = new Set<string>();

  for (let ci = 0; ci < sortedComps.length; ci++) {
    const comp = sortedComps[ci];
    const nextComp = sortedComps[ci + 1];

    // Period runs from startDate (inclusive) to the day BEFORE the next period starts
    // If no next period: run to endDate or today
    let periodEndDate: string;
    if (nextComp) {
      // End the day before the next period starts
      const d = new Date(nextComp.startDate);
      d.setDate(d.getDate() - 1);
      periodEndDate = d.toISOString().split("T")[0];
    } else if (comp.endDate) {
      periodEndDate = comp.endDate;
    } else {
      periodEndDate = getToday();
    }

    const dates = getDatesInRange(comp.startDate, periodEndDate);
    if (dates.length === 0) continue;

    // Register all assets in this period
    for (const assetId of Object.keys(comp.weights)) {
      allAssetsSeen.add(assetId);
    }

    // Track assets removed at this transition
    if (ci > 0) {
      const prevComp = sortedComps[ci - 1];
      for (const assetId of Object.keys(prevComp.weights)) {
        if (!(assetId in comp.weights)) {
          // Asset exited — mark the last day of the previous period
          assetExitDates[assetId] = comp.startDate;
        }
      }
    }

    // Normalize prices at the start of this period
    // If no price exists at or before startDate, use the first available price after it
    const startPrices: Record<string, number> = {};
    const assetActualStartDate: Record<string, string> = {};
    for (const assetId of Object.keys(comp.weights)) {
      const priceList = prices[assetId] || [];
      let p = findPriceOnDate(priceList, comp.startDate);

      if (p === null && priceList.length > 0) {
        // No price at or before startDate — find the first price after it
        const firstAfter = priceList.find((pt) => pt.date >= comp.startDate);
        if (firstAfter) {
          p = firstAfter.priceUsd;
          assetActualStartDate[assetId] = firstAfter.date;
        }
      }

      if (p !== null) {
        startPrices[assetId] = p;
        if (!(assetId in assetEntryPrices)) {
          assetEntryPrices[assetId] = p;
        }
      }
    }

    const baseValue = ci === 0 ? 100 : accumulatedValue;

    for (const date of dates) {
      // Portfolio value via weighted returns
      let dayReturn = 0;
      let totalWeightWithData = 0;

      for (const [assetId, weight] of Object.entries(comp.weights)) {
        const priceList = prices[assetId] || [];
        const currentPrice = findPriceOnDate(priceList, date);
        const startPrice = startPrices[assetId];

        if (currentPrice !== null && startPrice) {
          dayReturn += weight * (currentPrice / startPrice);
          totalWeightWithData += weight;
        } else if (startPrice && currentPrice === null) {
          // Asset is in the portfolio but has no price data yet (e.g., HYPE before Dec 2025)
          // Treat as flat (no gain/no loss) until price data becomes available
          dayReturn += weight * 1;
          totalWeightWithData += weight;
        }
      }

      // If we have no price data at all, skip this day
      if (totalWeightWithData === 0) continue;

      // Scale up if some assets are missing data (assume they stayed flat)
      if (totalWeightWithData < 0.999) {
        const missingWeight = 1 - totalWeightWithData;
        dayReturn += missingWeight; // flat = 1x return for missing assets
      }

      const portfolioValue = baseValue * dayReturn;

      // Individual asset lines (base 100 from their entry into the portfolio)
      const assetValues: Record<string, number> = {};
      for (const assetId of allAssetsSeen) {
        if (!(assetId in assetEntryPrices)) continue;
        if (assetExitDates[assetId] && date >= assetExitDates[assetId]) continue;

        const priceList = prices[assetId] || [];
        const currentPrice = findPriceOnDate(priceList, date);
        if (currentPrice !== null) {
          assetValues[assetId] = (currentPrice / assetEntryPrices[assetId]) * 100;
        }
      }

      const point: PerformancePoint = {
        date,
        portfolioValue,
        assetValues,
      };

      // vs BTC — continuous from day 1
      if (firstBtcPrice === null && btcPrices[date]) {
        firstBtcPrice = btcPrices[date];
      }
      if (firstBtcPrice && btcPrices[date]) {
        const portfolioGrowth = portfolioValue / 100;
        const btcGrowth = btcPrices[date] / firstBtcPrice;
        point.portfolioValueBtc = (portfolioGrowth / btcGrowth) * 100;
      }

      // vs BRL
      if (firstExchangeRate === null && exchangeRates[date]) {
        firstExchangeRate = exchangeRates[date];
      }
      if (firstExchangeRate && exchangeRates[date]) {
        point.portfolioValueBrl = portfolioValue * (exchangeRates[date] / firstExchangeRate);
      }

      allPoints.push(point);
      accumulatedValue = portfolioValue;
    }
  }

  // Build rebalance markers
  const markers: RebalanceMarker[] = [];
  for (let ci = 1; ci < sortedComps.length; ci++) {
    const prev = sortedComps[ci - 1];
    const curr = sortedComps[ci];

    const prevAssets = new Set(Object.keys(prev.weights));
    const currAssets = new Set(Object.keys(curr.weights));

    const added = [...currAssets].filter((a) => !prevAssets.has(a));
    const removed = [...prevAssets].filter((a) => !currAssets.has(a));
    const weightChanges: { assetId: string; from: number; to: number }[] = [];

    for (const assetId of currAssets) {
      if (prevAssets.has(assetId) && prev.weights[assetId] !== curr.weights[assetId]) {
        weightChanges.push({
          assetId,
          from: prev.weights[assetId],
          to: curr.weights[assetId],
        });
      }
    }

    // Find the portfolio value at this point from the calculated data
    const rebalPoint = allPoints.find((p) => p.date === curr.startDate);

    markers.push({
      date: curr.startDate,
      type: curr.eventId,
      notes: null,
      portfolioValue: rebalPoint ? rebalPoint.portfolioValue : curr.portfolioValueAtStart,
      prevWeights: { ...prev.weights },
      newWeights: { ...curr.weights },
      changes: { added, removed, weightChanges },
    });
  }

  return { points: allPoints, markers };
}

// ─── Helpers ────────────────────────────────────────────

function findPriceOnDate(prices: PricePoint[], date: string): number | null {
  let lo = 0;
  let hi = prices.length - 1;
  let best: number | null = null;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (prices[mid].date <= date) {
      best = prices[mid].priceUsd;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  return best;
}

function getDatesInRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = new Date(start);
  const endDate = new Date(end);

  while (current <= endDate) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

export function calculateAssetROI(entryPrice: number, currentPrice: number): number {
  return ((currentPrice - entryPrice) / entryPrice) * 100;
}
