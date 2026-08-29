export interface RateResult {
  base: string
  rates: Record<string, number>
  source: '在线' | '离线参考'
  asOf: string
}

// frankfurter 已把接口迁到 api.frankfurter.dev；旧域名 api.frankfurter.app 现在返回 301，
// 而 301 响应本身不带 CORS 头，浏览器会在跟随跳转之前就被拦截，导致永远走离线兜底。
const RATES_ENDPOINT = 'https://api.frankfurter.dev/v1/latest'

// 离线兜底快照：只在网络不可用时展示，页面必须标注「离线参考 + 日期」，
// 避免被当成实时汇率拿去报价。数值需定期人工刷新，偏差过大会直接算错报价。
const FALLBACK_DATE = '2026-08-28'
const FALLBACK_USD: Record<string, number> = {
  USD: 1,
  CNY: 6.7209,
  EUR: 0.85889,
  GBP: 0.73624,
  JPY: 159.68,
  HKD: 7.8396,
  AUD: 1.3899,
  CAD: 1.3854,
  SGD: 1.2713,
  AED: 3.6725,
}

export async function loadRates(base = 'USD', fetcher: typeof fetch = fetch): Promise<RateResult> {
  try {
    const response = await fetcher(`${RATES_ENDPOINT}?from=${encodeURIComponent(base)}`)
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
