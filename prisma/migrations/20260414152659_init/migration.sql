-- CreateEnum
CREATE TYPE "WalletCategory" AS ENUM ('main', 'thematic', 'past');

-- CreateEnum
CREATE TYPE "WalletStatus" AS ENUM ('active', 'closed');

-- CreateEnum
CREATE TYPE "RebalanceType" AS ENUM ('initial', 'rebalance', 'swap', 'mixed');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('low', 'medium', 'high', 'very_high');

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "WalletCategory" NOT NULL,
    "status" "WalletStatus" NOT NULL DEFAULT 'active',
    "closed_at" TIMESTAMP(3),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "ticker" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "risk_level" "RiskLevel" NOT NULL,
    "description" TEXT NOT NULL,
    "website_url" TEXT,
    "coingecko_url" TEXT,
    "tradingview_url" TEXT,
    "defillama_url" TEXT,
    "exchanges" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "assets_pkey" PRIMARY KEY ("ticker")
);

-- CreateTable
CREATE TABLE "rebalance_events" (
    "id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "type" "RebalanceType" NOT NULL,
    "notes" TEXT,
    "portfolio_value" DECIMAL(18,6) NOT NULL DEFAULT 100,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rebalance_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_compositions" (
    "id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "weight" DECIMAL(5,4) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,

    CONSTRAINT "wallet_compositions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_prices" (
    "asset_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "price_usd" DECIMAL(18,6) NOT NULL,
    "market_cap" BIGINT,

    CONSTRAINT "daily_prices_pkey" PRIMARY KEY ("asset_id","date")
);

-- CreateTable
CREATE TABLE "exchange_rates" (
    "date" DATE NOT NULL,
    "usd_brl" DECIMAL(10,4) NOT NULL,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("date")
);

-- CreateIndex
CREATE UNIQUE INDEX "rebalance_events_wallet_id_date_key" ON "rebalance_events"("wallet_id", "date");

-- CreateIndex
CREATE INDEX "wallet_compositions_wallet_id_end_date_idx" ON "wallet_compositions"("wallet_id", "end_date");

-- CreateIndex
CREATE INDEX "wallet_compositions_wallet_id_asset_id_idx" ON "wallet_compositions"("wallet_id", "asset_id");

-- AddForeignKey
ALTER TABLE "rebalance_events" ADD CONSTRAINT "rebalance_events_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_compositions" ADD CONSTRAINT "wallet_compositions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_compositions" ADD CONSTRAINT "wallet_compositions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "rebalance_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_compositions" ADD CONSTRAINT "wallet_compositions_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("ticker") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_prices" ADD CONSTRAINT "daily_prices_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("ticker") ON DELETE RESTRICT ON UPDATE CASCADE;
