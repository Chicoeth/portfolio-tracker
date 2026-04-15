const BCB_BASE =
  process.env.BCB_API_BASE ||
  "https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata";

/**
 * Fetch USD/BRL exchange rates from Brazil's Central Bank API.
 * Returns daily closing rates.
 */
export async function getExchangeRates(
  from: string,
  to: string
): Promise<{ date: string; rate: number }[]> {
  // BCB API date format: MM-DD-YYYY
  const fromDate = formatBCBDate(from);
  const toDate = formatBCBDate(to);

  const url =
    `${BCB_BASE}/CotacaoDolarPeriodo(dataInicial=@di,dataFinalCotacao=@df)?` +
    `@di='${fromDate}'&@df='${toDate}'&` +
    `$select=cotacaoVenda,dataHoraCotacao&$format=json&$orderby=dataHoraCotacao`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`BCB API error: ${res.status}`);
  }

  const data = await res.json();
  const rates: { date: string; rate: number }[] = [];
  const seen = new Set<string>();

  for (const item of data.value || []) {
    const date = item.dataHoraCotacao.split("T")[0];
    // Keep only the last rate per day (closing)
    if (!seen.has(date)) {
      seen.add(date);
    }
    // Overwrite to get the last one
    const existing = rates.find((r) => r.date === date);
    if (existing) {
      existing.rate = item.cotacaoVenda;
    } else {
      rates.push({ date, rate: item.cotacaoVenda });
    }
  }

  return rates;
}

function formatBCBDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${month}-${day}-${year}`;
}
