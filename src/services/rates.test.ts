import { loadRates } from './rates'

it('uses validated online exchange rates', async () => {
  const fetcher: typeof fetch = async () => new Response(JSON.stringify({ date: '2026-08-15', rates: { CNY: 7.16, EUR: 0.91 } }))
  const result = await loadRates('USD', fetcher)

  expect(result).toMatchObject({ source: '在线', asOf: '2026-08-15', rates: { CNY: 7.16 } })
})

it('uses dated fallback rates when the network fails', async () => {
  const fetcher: typeof fetch = async () => {
    throw new Error('offline')
  }
  const result = await loadRates('USD', fetcher)

  expect(result.source).toBe('离线参考')
  expect(result.asOf).toBeTruthy()
  expect(result.rates.CNY).toBeGreaterThan(0)
})
