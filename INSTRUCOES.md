# Instruções do Projeto: Paradigma Portfolio Tracker

## Visão Geral

Site de acompanhamento de carteiras de criptoativos da Paradigma Education. O admin monta carteiras com composição percentual (sem valor absoluto em $), e os usuários visualizam a performance histórica via gráficos interativos com chain-linking.

**URL local:** `http://localhost:3000`
**Status atual:** Funcional localmente, pronto para deploy na Vercel.

---

## Stack Técnica

- **Framework:** Next.js 15 (App Router) + TypeScript
- **ORM:** Prisma 6
- **Banco:** PostgreSQL (Neon, tier gratuito, região sa-east-1)
- **Auth:** NextAuth.js v4 (Google OAuth + JWT strategy, sem tabela de sessão)
- **Gráficos:** Recharts
- **Estilo:** Tailwind CSS 3
- **Deploy target:** Vercel
- **Cron diário:** GitHub Actions

---

## Estrutura de Arquivos

```
crypto-portfolio-tracker/
├── .env                          # Credenciais (NÃO commitado)
├── .env.example                  # Template de credenciais
├── .github/workflows/
│   └── daily-update.yml          # Cron diário (06:00 UTC)
├── prisma/
│   ├── schema.prisma             # Schema do banco (6 tabelas)
│   └── seed.ts                   # Seed com todas as carteiras reais
├── scripts/
│   ├── initial-ingest.ts         # Carga inicial de preços (CoinGecko + Paradigma fallback)
│   └── daily-update.ts           # Atualização diária de preços + câmbio
├── public/
│   └── logos/                    # Logos de corretoras/plataformas (ainda não populado)
├── src/
│   ├── app/
│   │   ├── page.tsx              # Home = Carteira Paradigma (main)
│   │   ├── layout.tsx            # Layout raiz com Sidebar + Providers
│   │   ├── globals.css           # Estilos globais + Tailwind
│   │   ├── carteira/[id]/        # Página de qualquer carteira
│   │   ├── admin/
│   │   │   ├── login/            # Tela de login Google
│   │   │   └── (protected)/      # Dashboard, CRUD de carteiras e ativos
│   │   └── api/
│   │       ├── auth/[...nextauth]/ # NextAuth endpoints
│   │       ├── wallets/           # GET: lista carteiras (público)
│   │       ├── wallets/[id]/      # GET: detalhes da carteira (público)
│   │       ├── wallets/[id]/performance/ # GET: dados do gráfico (público)
│   │       ├── wallets/[id]/debug/ # GET: debug (remover antes de produção)
│   │       ├── admin/wallets/     # CRUD carteiras (protegido)
│   │       ├── admin/assets/      # CRUD ativos (protegido)
│   │       └── debug/exchange-rates/ # Debug câmbio (remover antes de produção)
│   ├── components/
│   │   ├── Sidebar.tsx            # Navegação lateral com menu expansível
│   │   ├── WalletPage.tsx         # Layout padrão de carteira (seções A, B, C)
│   │   ├── CompositionPieChart.tsx # Gráfico de pizza (Recharts)
│   │   ├── CompositionTable.tsx   # Tabela com ROI, risco, links
│   │   ├── PerformanceChart.tsx   # Gráfico de linhas com toggles e rebalanceamento
│   │   └── Providers.tsx          # SessionProvider wrapper
│   ├── lib/
│   │   ├── prisma.ts              # Singleton do Prisma Client
│   │   ├── auth.ts                # Configuração NextAuth (Google OAuth + JWT)
│   │   ├── require-admin.ts       # Helper de verificação de admin
│   │   ├── portfolio-calc.ts      # Engine de cálculo chain-linking
│   │   ├── coingecko-api.ts       # Client CoinGecko (fonte principal de preços)
│   │   ├── paradigma-api.ts       # Client API Paradigma (fallback para >365 dias)
│   │   ├── exchange-rate-api.ts   # Client Frankfurter API (câmbio USD/BRL)
│   │   └── bcb-api.ts             # Client BCB (legado, não usado atualmente)
│   └── types/
│       └── index.ts               # Tipos TypeScript compartilhados
```

---

## Banco de Dados (6 tabelas)

### wallets
Carteiras de criptoativos. Categorias: `main` (Carteira Paradigma, única), `thematic` (temáticas ativas), `past` (encerradas).

### assets
Metadados dos ativos. A PK é o `ticker` (mesmo ID do CoinGecko, ex: "bitcoin", "solana", "hyperliquid"). Inclui links de corretoras, CoinGecko, TradingView, DeFiLlama.

### rebalance_events
Cada evento registra uma mudança de composição, com data, tipo (`initial`, `rebalance`, `swap`, `mixed`) e notas do admin.

### wallet_compositions
Relação ativo↔carteira com peso percentual, data de início e fim. Ligada a um `rebalance_event`.

### daily_prices
Preços diários em USD. PK composta: (asset_id, date). Fonte principal: CoinGecko.

### exchange_rates
Câmbio diário USD→BRL. Fonte: Frankfurter API (dados do BCE). Gaps de finais de semana são preenchidos com carry-forward no cálculo.

---

## Fontes de Dados

### Preços de Criptoativos
- **CoinGecko (principal):** Gratuito, sem API key, até 365 dias de histórico. Rate limit: ~30 req/min (usamos 2.5s entre requests).
- **Paradigma Education (fallback):** Para históricos > 365 dias. Tickers iguais ao CoinGecko (API ID). Endpoint: `https://api.paradigma.education/api/v2/coins/{ticker}/history`

### Câmbio USD/BRL
- **Frankfurter API:** Gratuito, sem auth, baseado no BCE. Endpoint: `https://api.frankfurter.app/{from}..{to}?from=USD&to=BRL`

### Ativo Especial: Stablecoins
- Ticker: `stablecoins`. Preço fixo $1 (hardcoded no seed e no daily update).
- Representa posição genérica em stablecoins (USDT, USDC, DAI, etc).
- Não é buscado nas APIs de preço — o preço é gerado localmente.

---

## Lógica de Cálculo (Chain-Linking)

### Performance do Portfólio
1. Início em base 100.
2. Para cada período de composição: `valor = Σ(peso_i × retorno_normalizado_i)`.
3. No rebalanceamento: trava o valor acumulado, aplica novos pesos sobre retornos futuros.
4. Linha contínua sem saltos — só a inclinação muda.
5. Performance passada NUNCA é recalculada.

### Denominações
- **vs USD:** preço direto em USD.
- **vs BRL:** `valor_usd × (câmbio_hoje / câmbio_dia1)`. Referência global desde o primeiro dia.
- **vs BTC:** `(crescimento_portfolio / crescimento_btc) × 100`. Referência global desde o primeiro dia.

### Ativos com dados atrasados
Se um ativo entra na carteira mas ainda não tem preço na API (ex: HYPE entrou em 16/11/2025, dados começam em 04/12/2025):
- Peso é tratado como "flat" (sem ganho/perda) até o primeiro preço disponível.
- Usa o primeiro preço disponível como referência para normalização.
- A linha individual do componente começa quando os dados de preço existem.

---

## Carteiras Atuais

### Ativas
1. **Carteira Paradigma** (main) — Início: 06/10/2024
   - Composição inicial: 70% BTC, 20% SOL, 10% Stablecoins
   - Rebalanceamento em 16/11/2025 (mixed): 50% BTC, 40% Stablecoins, 10% HYPE
   
2. **Carteira Defensiva** (thematic) — Início: 16/11/2025
   - 60% BTC, 40% Stablecoins

### Passadas (13 carteiras, da mais nova para mais velha)
1. Agentes IA (03/02/2025 → 24/07/2025)
2. Memefólio (20/05/2024 → 17/11/2025)
3. Gemas de I.A. (03/04/2024 → 24/07/2025)
4. Carteira Modular (05/02/2024 → 16/05/2024)
5. Cinco Mosqueteiras (17/11/2023 → 24/07/2025)
6. Solana Season (16/11/2023 → 24/07/2025)
7. Carteira do Urso (24/11/2022 → 25/11/2023) — stablecoins agrupadas (35%)
8. FAANG da Web3 (16/10/2021 → 25/11/2022)
9. GameFi Underdogs (02/01/2022 → 17/05/2022) — sem butterfly-protocol-2 (removido)
10. Bags do Verão 2023 (24/01/2023 → 05/07/2023)
11. Cavalos da Layer 2 (06/03/2021 → 20/10/2021)
12. Ethereum Killers (12/01/2021 → 20/10/2021)
13. Zebras de DeFi (03/01/2021 → 20/10/2021)

---

## Comandos

### Desenvolvimento
```bash
npm run dev                        # Inicia servidor local (http://localhost:3000)
```

### Banco de Dados
```bash
npx prisma migrate dev --name X    # Criar/aplicar migration
npm run db:seed                    # Recria carteiras (NÃO apaga preços)
npx prisma studio                  # Interface visual do banco
```

### Ingestão de Dados
```bash
npm run ingest:initial             # Baixa preços faltantes (inteligente, pula existentes)
npx tsx scripts/initial-ingest.ts --force  # Força re-download de tudo
npm run ingest:daily               # Atualiza últimos 3 dias (preços + câmbio)
```

### Build
```bash
npm run build                      # Build de produção
npm start                          # Inicia em modo produção
```

---

## Variáveis de Ambiente

```env
DATABASE_URL="postgresql://..."     # Connection string do Neon (com ?sslmode=require)
NEXTAUTH_URL="http://localhost:3000" # URL do site (mudar para URL da Vercel em prod)
NEXTAUTH_SECRET="..."               # Gerar com: openssl rand -base64 32
ADMIN_EMAIL="seu@email.com"         # Email Google autorizado como admin
GOOGLE_CLIENT_ID="..."              # Google Cloud Console → OAuth 2.0
GOOGLE_CLIENT_SECRET="..."          # Google Cloud Console → OAuth 2.0
```

---

## Autenticação Admin

- Google OAuth via NextAuth.js com JWT strategy (sem tabela de sessão no banco).
- Apenas o email definido em `ADMIN_EMAIL` pode logar.
- Login: `/admin/login` → redireciona para Google → callback → `/admin`
- Sessão expira em 7 dias.
- Para a Vercel: adicionar `https://SEU-DOMINIO/api/auth/callback/google` nos Authorized redirect URIs do Google Cloud Console.

---

## GitHub Actions (Cron Diário)

Arquivo: `.github/workflows/daily-update.yml`
- Roda às 06:00 UTC (03:00 BRT) todo dia.
- Pode ser disparado manualmente (workflow_dispatch).
- Atualiza últimos 3 dias de preços de todos os ativos via CoinGecko.
- Atualiza stablecoins ($1).
- Atualiza câmbio USD/BRL via Frankfurter API.
- Requer secret `DATABASE_URL` configurado no GitHub (Settings → Secrets → Actions).

---

## Logos (Pendente)

Pasta: `/public/logos/`
Formato: SVG preferido, PNG aceitável.
Arquivos esperados:
- Corretoras: `binance.svg`, `coinbase.svg`, `hyperliquid.svg`, `mercadobitcoin.svg`, `uniswap.svg`, `jupiter.svg`
- Plataformas: `coingecko.svg`, `tradingview.svg`, `defillama.svg`
- Adicionar conforme necessário para novos ativos/corretoras.

Para adicionar: colocar o arquivo na pasta, fazer commit e push. A Vercel redeploya automaticamente.

---

## Problemas Conhecidos e Decisões

1. **HYPE (Hyperliquid):** A API Paradigma não tem histórico antes de dez/2025. Preços foram baixados via CoinGecko. Para atualizações diárias, CoinGecko é usado.

2. **Butterfly Protocol (BFLY):** Removido do projeto — não existe nem no CoinGecko nem na Paradigma. GameFi Underdogs ficou com 30% RAIDER e 70% MAGIC.

3. **Stablecoins como ativo genérico:** Ticker `stablecoins` com preço fixo $1. Permite que o usuário escolha qual stablecoin usar na prática.

4. **Carteira do Urso:** As 3 stablecoins originais (USDC, USDT, LUSD) foram agrupadas como "Stablecoins" genérico (35% total).

5. **Câmbio em finais de semana:** A Frankfurter API só retorna dias úteis. O cálculo faz carry-forward (usa a última cotação conhecida para sábados/domingos).

6. **Seed não apaga preços:** O `npm run db:seed` recria apenas carteiras, composições e eventos. Preços e câmbio são preservados no banco.

7. **Ingest inteligente:** O `ingest:initial` checa o banco antes de baixar. Se um ativo já tem >30 pontos de preço, pula. Usar `--force` para re-download.

---

## Pendências / Próximos Passos

1. **Deploy na Vercel** — Projeto pronto, só falta push no GitHub e configuração na Vercel.
2. **Logos** — Adicionar SVGs/PNGs em `/public/logos/` para corretoras e plataformas.
3. **Automatizar ativos novos** — Ajustar `daily-update.ts` para detectar ativos sem preços no banco e baixar histórico automaticamente. Assim, ao adicionar uma carteira com ativo novo pelo admin, o cron do dia seguinte busca os preços.
4. **Endpoints de debug** — Remover `/api/wallets/[id]/debug` e `/api/debug/exchange-rates` antes de ir para produção (ou proteger com auth).
5. **Design** — Melhorar visual geral, adicionar responsividade mobile, animações.
6. **Carteiras não incluídas** — "Seleção Verde", "Índice do Metaverso", "Renda Passiva-Agressiva" — foram mencionadas nos prints mas não enviadas. Adicionar quando tiver os dados.
