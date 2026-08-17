export interface RateResult {
  base: string
  rates: Record<string, number>
  source: '在线' | '离线参考'
  asOf: string
}

const FALLBACK_DATE = '2026-08-01'
const FALLBACK_USD: Record<string, number> = {
  USD: 1,
  CNY: 7.18,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 148.2,
  HKD: 7.81,
  AUD: 1.53,
  CAD: 1.38,
  SGD: 1.34,
  AED: 3.6725,
}

export async function loadRates(base = 'USD', fetcher: typeof fetch = fetch): Promise<RateResult> {
  try {
    const response = await fetcher(`https://api.frankfurter.app/latest?from=${encodeURIComponent(base)}`)
    if (!response.ok) throw new Error('invalid response')
    const body = (await response.json()) as { date?: unknown; rates?: unknown }
    if (typeof body.date !== 'string' || !isRateMap(body.rates)) throw new Error('invalid payload')
    return { base, rates: { [base]: 1, ...body.rates }, source: '在线', asOf: body.date }
  } catch {
    return fallbackFor(base)
  }
}

function fallbackFor(base: string): RateResult {
  const baseInUsd = FALLBACK_USD[base] ?? 1
  const rates = Object.fromEntries(Object.entries(FALLBACK_USD).map(([currency, value]) => [currency, value / baseInUsd]))
  return { base, rates, source: '离线参考', asOf: FALLBACK_DATE }
}

function isRateMap(value: unknown): value is Record<string, number> {
  return Boolean(value && typeof value === 'object' && Object.values(value).every((rate) => typeof rate === 'number' && Number.isFinite(rate)))
}
