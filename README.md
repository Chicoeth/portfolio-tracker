# Paradigma Portfolio Tracker

Tracker de carteiras de criptoativos com composição percentual, performance via chain-linking, e painel admin.

## Stack

- **Framework:** Next.js 15 (App Router) + TypeScript
- **ORM:** Prisma + PostgreSQL (Supabase/Neon)
- **Auth:** NextAuth.js (Google OAuth + JWT)
- **Gráficos:** Recharts
- **Estilo:** Tailwind CSS
- **Deploy:** Vercel
- **Cron:** GitHub Actions (atualização diária de preços)

## Setup Local

### 1. Clone e instale

```bash
git clone <repo-url>
cd crypto-portfolio-tracker
npm install
```

### 2. Configure o `.env`

```bash
cp .env.example .env
```

Preencha:
- `DATABASE_URL` — sua connection string do Supabase ou Neon
- `NEXTAUTH_SECRET` — gere com `openssl rand -base64 32`
- `ADMIN_EMAIL` — seu email Google (para login admin)
- `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` — [Console Google](https://console.cloud.google.com/apis/credentials)

### 3. Crie o banco

```bash
npx prisma migrate dev --name init
```

### 4. Seed (dados de exemplo)

```bash
npm run db:seed
```

### 5. Ingestão inicial de preços

```bash
npm run ingest:initial
```

### 6. Rode o dev server

```bash
npm run dev
```

Acesse `http://localhost:3000`.

## Deploy na Vercel

1. Push para o GitHub
2. Importe o repo na Vercel
3. Configure as environment variables
4. Deploy

### GitHub Actions (cron diário)

Adicione o secret `DATABASE_URL` no repositório GitHub (Settings → Secrets → Actions). O workflow `.github/workflows/daily-update.yml` roda automaticamente às 06:00 UTC.

## Estrutura do Projeto

```
src/
├── app/
│   ├── page.tsx                    # Home = Carteira Paradigma
│   ├── carteira/[id]/page.tsx      # Página de qualquer carteira
│   ├── admin/
│   │   ├── login/page.tsx          # Login do admin
│   │   └── (protected)/
│   │       ├── page.tsx            # Dashboard admin
│   │       ├── wallets/new/        # Criar carteira
│   │       ├── wallets/[id]/       # Editar carteira
│   │       └── assets/new/         # Cadastrar ativo
│   └── api/
│       ├── auth/[...nextauth]/     # NextAuth
│       ├── wallets/                # Listagem pública
│       ├── wallets/[id]/           # Detalhes da carteira
│       ├── wallets/[id]/performance/ # Dados do gráfico
│       └── admin/                  # CRUD protegido
├── components/
│   ├── Sidebar.tsx                 # Navegação lateral
│   ├── WalletPage.tsx              # Layout padrão da carteira
│   ├── CompositionPieChart.tsx     # Gráfico de pizza
│   ├── CompositionTable.tsx        # Tabela de composição
│   └── PerformanceChart.tsx        # Gráfico de performance
├── lib/
│   ├── prisma.ts                   # Prisma client
│   ├── auth.ts                     # NextAuth config
│   ├── portfolio-calc.ts           # Engine de chain-linking
│   ├── paradigma-api.ts            # Client da API Paradigma
│   └── bcb-api.ts                  # Client do Banco Central
└── types/
    └── index.ts                    # TypeScript types
```

## Fluxo Admin

1. **Login:** `/admin/login` → Google OAuth
2. **Dashboard:** `/admin` → ver carteiras e ativos
3. **Criar ativo:** cadastre ticker, símbolo, risco, links
4. **Criar carteira:** nome, descrição, categoria
5. **Rebalancear:** defina composição (pesos = 100%), adicione notas
6. **Encerrar:** mova para "Carteiras Passadas"

## Logos

Coloque os logos das corretoras e plataformas em `/public/logos/`:
- `binance.svg`, `coinbase.svg`, `hyperliquid.svg`, `mercadobitcoin.svg`
- `uniswap.svg`, `jupiter.svg`
- `coingecko.svg`, `tradingview.svg`, `defillama.svg`
