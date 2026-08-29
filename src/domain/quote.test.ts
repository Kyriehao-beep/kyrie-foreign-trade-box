import { DEFAULT_QUOTE_INPUT, belowBreakEvenAdvice, computeQuote, type QuoteInput } from './quote'

/** Build an input on top of the defaults. */
const input = (overrides: Partial<QuoteInput> = {}): QuoteInput => ({ ...DEFAULT_QUOTE_INPUT, ...overrides })

/** Every number that reaches the screen must be finite. */
function expectAllFinite(result: ReturnType<typeof computeQuote>) {
  const numbers: Array<[string, number]> = [
    ['unitCostCNY', result.unitCostCNY],
    ['unitPriceUSD', result.unitPriceUSD],
    ['unitPriceCNY', result.unitPriceCNY],
    ['unitProfitCNY', result.unitProfitCNY],
    ['unitProfitRate', result.unitProfitRate],
    ['orderCostCNY', result.orderCostCNY],
    ['orderAmountUSD', result.orderAmountUSD],
    ['orderAmountCNY', result.orderAmountCNY],
    ['orderProfitCNY', result.orderProfitCNY],
    ['breakEvenUSD', result.breakEvenUSD],
    ['suggestedUSD', result.suggestedUSD],
    ['targetUnitProfitCNY', result.targetUnitProfitCNY],
    ['targetOrderProfitCNY', result.targetOrderProfitCNY],
    ['targetProfitRate', result.targetProfitRate],
    ['targetGapUSD', result.targetGapUSD],
    ['fxDropUnitProfitCNY', result.fxDropUnitProfitCNY],
    ['fxDropOrderProfitCNY', result.fxDropOrderProfitCNY],
  ]
  for (const [name, value] of numbers) {
    expect(Number.isFinite(value), `${name} should be finite`).toBe(true)
  }
  for (const [name, value] of Object.entries(result.breakdown)) {
    expect(Number.isFinite(value), `breakdown.${name} should be finite`).toBe(true)
  }
}

/* ------------------------------ quantity: 1 vs 1000 ------------------------------ */

it('qty 1: order totals equal the per-unit values', () => {
  const r = computeQuote(input({ qty: 1 }))
  expectAllFinite(r)
  expect(r.qty).toBe(1)
  expect(r.orderCostCNY).toBeCloseTo(r.unitCostCNY, 6)
  expect(r.orderAmountUSD).toBeCloseTo(r.unitPriceUSD, 6)
  expect(r.orderProfitCNY).toBeCloseTo(r.unitProfitCNY, 6)
})

it('qty 1000: order totals are exactly 1000x the per-unit values', () => {
  const r = computeQuote(input({ qty: 1000 }))
  expectAllFinite(r)
  expect(r.orderCostCNY).toBeCloseTo(r.unitCostCNY * 1000, 6)
  expect(r.orderAmountUSD).toBeCloseTo(r.unitPriceUSD * 1000, 6)
  expect(r.orderProfitCNY).toBeCloseTo(r.unitProfitCNY * 1000, 6)
})

it('qty 1000: order-only fees are amortised so the per-unit cost drops', () => {
  const small = computeQuote(input({ qty: 100 }))
  const large = computeQuote(input({ qty: 1000 }))
  // 800 CNY of order-only cost -> 8.00/unit at 100 pcs vs 0.80/unit at 1000 pcs
  expect(small.unitCostCNY - large.unitCostCNY).toBeCloseTo(8 - 0.8, 6)
  expect(large.unitCostCNY).toBeLessThan(small.unitCostCNY)
  expect(large.orderCostCNY).toBeGreaterThan(small.orderCostCNY)
})

/* ------------------------------ fees = 0 ------------------------------ */

it('zero revenue-based fees: break-even equals the landed unit cost converted to USD', () => {
  const r = computeQuote(input({ platformRate: 0, collectionRate: 0, commissionRate: 0 }))
  expectAllFinite(r)
  expect(r.breakEvenUSD).toBeCloseTo(r.unitCostCNY / r.fxRate, 8)
})

it('zero fees and zero margin: suggested price equals break-even and profit is zero', () => {
  const r = computeQuote(
    input({ platformRate: 0, collectionRate: 0, commissionRate: 0, targetMarginRate: 0 }),
  )
  expectAllFinite(r)
  expect(r.suggestedUSD).toBeCloseTo(r.breakEvenUSD, 8)
  expect(r.unitProfitCNY).toBeCloseTo(0, 8)
  expect(r.unitProfitRate).toBeCloseTo(0, 8)
  expect(r.orderProfitCNY).toBeCloseTo(0, 8)
})

it('zero fees with 20% margin: the realised margin is exactly 20%', () => {
  const r = computeQuote(input({ platformRate: 0, collectionRate: 0, commissionRate: 0, targetMarginRate: 20 }))
  expectAllFinite(r)
  expect(r.unitProfitRate).toBeCloseTo(0.2, 10)
})

/* ------------------------------ margin 0% vs 20% ------------------------------ */

it('margin 0%: break-even and suggested price collapse to the same number', () => {
  const r = computeQuote(input({ targetMarginRate: 0 }))
  expectAllFinite(r)
  expect(r.suggestedUSD).toBeCloseTo(r.breakEvenUSD, 8)
})

it('margin 20%: suggested price is strictly above break-even and hits the 20% target', () => {
  const r = computeQuote(input({ targetMarginRate: 20 }))
  expectAllFinite(r)
  expect(r.suggestedUSD).toBeGreaterThan(r.breakEvenUSD)
  // Margin is measured on the quoted price, net of revenue-based fees.
  expect(r.unitProfitRate).toBeCloseTo(0.2, 10)
  expect(r.unitProfitCNY).toBeGreaterThan(0)
})

it('raising the margin raises the suggested price but never the cost', () => {
  const low = computeQuote(input({ targetMarginRate: 10 }))
  const high = computeQuote(input({ targetMarginRate: 30 }))
  expect(high.suggestedUSD).toBeGreaterThan(low.suggestedUSD)
  expect(high.unitCostCNY).toBeCloseTo(low.unitCostCNY, 10)
})

/* ------------------------------ customer target vs break-even ------------------------------ */

it('customer target below break-even flags the loss and reports the gap', () => {
  const r = computeQuote(input({ customerTargetUSD: 5 }))
  expectAllFinite(r)
  expect(r.targetBelowBreakEven).toBe(true)
  expect(r.targetGapUSD).toBeLessThan(0)
  expect(r.targetGapUSD).toBeCloseTo(5 - r.breakEvenUSD, 8)
  expect(r.targetUnitProfitCNY).toBeLessThan(0)
  expect(r.targetOrderProfitCNY).toBeLessThan(0)
  expect(r.targetShortfallOrderCNY).toBeGreaterThan(0)
  expect(r.targetShortfallOrderCNY).toBeCloseTo(-r.targetOrderProfitCNY, 6)
})

it('the below-break-even advice is Chinese and contains the per-unit gap', () => {
  const r = computeQuote(input({ customerTargetUSD: 5 }))
  const advice = belowBreakEvenAdvice(r)
  expect(advice).toContain('客户目标价')
  expect(advice).toContain('保本价')
  expect(advice).toContain(Math.abs(r.targetGapUSD).toFixed(2))
})

it('customer target above break-even is not flagged and earns a positive margin', () => {
  const r = computeQuote(input({ customerTargetUSD: 19.9 }))
  expectAllFinite(r)
  expect(r.targetBelowBreakEven).toBe(false)
  expect(r.targetUnitProfitCNY).toBeGreaterThan(0)
  expect(r.targetOrderProfitCNY).toBeGreaterThan(0)
  expect(r.targetShortfallOrderCNY).toBe(0)
})

it('customer target of 0 is never treated as a below-break-even sale', () => {
  const r = computeQuote(input({ customerTargetUSD: 0 }))
  expectAllFinite(r)
  expect(r.targetBelowBreakEven).toBe(false)
  expect(r.targetProfitRate).toBe(0)
})

/* ------------------------------ FX movement ------------------------------ */

it('an FX drop reduces profit by exactly the expected amount', () => {
  const r = computeQuote(input({ fxRate: 7.18, fxRiskRate: 5 }))
  expectAllFinite(r)
  const droppedFx = 7.18 * 0.95
  const expectedUnitProfit = r.unitPriceUSD * droppedFx * (1 - 0.04) - r.unitCostCNY
  expect(r.fxDropUnitProfitCNY).toBeCloseTo(expectedUnitProfit, 6)
  expect(r.fxDropUnitProfitCNY).toBeLessThan(r.unitProfitCNY)
  expect(r.fxDropOrderProfitCNY).toBeCloseTo(r.fxDropUnitProfitCNY * r.qty, 6)
})

it('a 0% FX buffer leaves the profit unchanged', () => {
  const r = computeQuote(input({ fxRiskRate: 0 }))
  expectAllFinite(r)
  expect(r.fxDropUnitProfitCNY).toBeCloseTo(r.unitProfitCNY, 8)
})

it('a stronger FX buffer can turn a profitable quote into a loss', () => {
  const r = computeQuote(input({ targetMarginRate: 5, fxRiskRate: 20 }))
  expectAllFinite(r)
  expect(r.unitProfitCNY).toBeGreaterThan(0)
  expect(r.fxDropUnitProfitCNY).toBeLessThan(r.unitProfitCNY)
})

/* ------------------------------ unit vs order discipline ------------------------------ */

it('per-unit and per-order figures are never confused', () => {
  const r = computeQuote(input({ qty: 250 }))
  expectAllFinite(r)
  expect(r.orderCostCNY).toBeCloseTo(r.unitCostCNY * 250, 6)
  expect(r.orderProfitCNY).toBeCloseTo(r.unitProfitCNY * 250, 6)
  expect(r.orderAmountCNY).toBeCloseTo(r.unitPriceCNY * 250, 6)
  expect(r.orderAmountUSD).toBeCloseTo(r.unitPriceUSD * 250, 6)
  // The order amount must NOT be the per-unit price (the old $1,994.84 bug).
  expect(r.orderAmountUSD).not.toBeCloseTo(r.unitPriceUSD, 2)
  // With sane costs a per-unit price stays in the tens of dollars, not thousands.
  expect(r.unitPriceUSD).toBeGreaterThan(0)
  expect(r.unitPriceUSD).toBeLessThan(100)
})

it('the default parameters produce a sane quote instead of the old broken values', () => {
  const r = computeQuote(DEFAULT_QUOTE_INPUT)
  expectAllFinite(r)
  // fx 6.7209（与离线兜底汇率一致），20% 目标利润率
  expect(r.unitPriceUSD).toBeCloseTo(16.6011, 3)
  expect(r.breakEvenUSD).toBeCloseTo(13.1425, 3)
  expect(r.unitProfitRate).toBeCloseTo(0.2, 8)
  // Old buggy output: unit price $1,994.84 and margin -7919.4%.
  expect(r.unitPriceUSD).not.toBeCloseTo(1994.84, 1)
  expect(r.unitProfitRate).toBeGreaterThan(0)
})

it('the default FX rate matches the offline fallback so a slow network cannot skew the quote', async () => {
  // 报价助手首屏在拿到实时汇率前会先用默认值计算，两者若不一致，
  // 用户会在网络慢时看到一个明显偏离的报价（旧默认 7.18 vs 真实 6.72）。
  const { loadRates } = await import('../services/rates')
  const offline = await loadRates('USD', async () => {
    throw new Error('offline')
  })
  expect(DEFAULT_QUOTE_INPUT.fxRate).toBeCloseTo(offline.rates.CNY, 6)
})

/* ------------------------------ tax, rebate and CIF ------------------------------ */

it('a higher rebate rate lowers the landed cost', () => {
  const none = computeQuote(input({ rebateRate: 0 }))
  const full = computeQuote(input({ rebateRate: 13 }))
  expect(full.unitCostCNY).toBeLessThan(none.unitCostCNY)
  expect(full.breakEvenUSD).toBeLessThan(none.breakEvenUSD)
})

it('the rebate is applied to the VAT-exclusive purchase price', () => {
  const r = computeQuote(input({ unitCostTaxIncl: 113, vatRate: 13, rebateRate: 13, qty: 1 }))
  // net = 100, rebate = 13 -> actual purchase = 100
  expect(r.breakdown.purchaseTaxIncl).toBeCloseTo(113, 8)
  expect(r.breakdown.rebateDeduction).toBeCloseTo(13, 8)
})

it('CIF adds freight and insurance, so it costs more than FOB', () => {
  const fob = computeQuote(input({ mode: 'FOB', unitIntlFreight: 18 }))
  const cif = computeQuote(input({ mode: 'CIF', unitIntlFreight: 18, insuranceRate: 0.3 }))
  expect(fob.breakdown.intlFreight).toBe(0)
  expect(cif.breakdown.intlFreight).toBeGreaterThan(0)
  expect(cif.breakdown.insurance).toBeGreaterThan(0)
  expect(cif.unitCostCNY).toBeGreaterThan(fob.unitCostCNY)
  expect(cif.suggestedUSD).toBeGreaterThan(fob.suggestedUSD)
})

it('insurance is charged on the CIF value, not on the FOB cost', () => {
  const r = computeQuote(
    input({ mode: 'CIF', qty: 1, unitCostTaxIncl: 100, vatRate: 0, rebateRate: 0, unitPackaging: 0, unitDomesticFee: 0, unitIntlFreight: 10, insuranceRate: 10, orderDomesticMisc: 0, orderDomesticFreight: 0 }),
  )
  // FOB cost 100 + freight 10 -> CIF value = 110 / 0.9 = 122.22 -> premium = 12.22
  expect(r.breakdown.insurance).toBeCloseTo(110 / 0.9 * 0.1, 6)
})

/* ------------------------------ empty, negative and extreme inputs ------------------------------ */

it('clamps a non-positive or missing quantity to 1', () => {
  expect(computeQuote(input({ qty: 0 })).qty).toBe(1)
  expect(computeQuote(input({ qty: -500 })).qty).toBe(1)
  expect(computeQuote(input({ qty: Number.NaN })).qty).toBe(1)
})

it('falls back to an FX rate of 1 when the rate is missing or non-positive', () => {
  expect(computeQuote(input({ fxRate: 0 })).fxRate).toBe(1)
  expect(computeQuote(input({ fxRate: -7 })).fxRate).toBe(1)
  expect(computeQuote(input({ fxRate: Number.NaN })).fxRate).toBe(1)
})

it('treats negative money as zero instead of producing a negative cost', () => {
  const r = computeQuote(
    input({ unitCostTaxIncl: -100, unitPackaging: -20, orderDomesticMisc: -999, customerTargetUSD: -5 }),
  )
  expectAllFinite(r)
  expect(r.breakdown.purchaseTaxIncl).toBe(0)
  expect(r.breakdown.orderDomesticMisc).toBe(0)
  expect(r.targetUSD).toBe(0)
  expect(r.unitCostCNY).toBeGreaterThanOrEqual(0)
})

it('survives NaN and Infinity inputs without leaking them into the result', () => {
  const r = computeQuote(
    input({
      qty: Number.NaN,
      unitCostTaxIncl: Number.NaN,
      fxRate: Number.POSITIVE_INFINITY,
      targetMarginRate: Number.NaN,
      platformRate: Number.NaN,
    }),
  )
  expectAllFinite(r)
  expect(r.qty).toBe(1)
})

it('clamps percentages so the denominators stay positive', () => {
  const r = computeQuote(input({ platformRate: 80, collectionRate: 40, targetMarginRate: 20 }))
  expectAllFinite(r)
  expect(r.invalid.feeRate).toBe(true)
  expect(r.invalid.margin).toBe(true)
  expect(r.breakEvenUSD).toBe(0)
  expect(r.suggestedUSD).toBe(0)
})

it('flags an unsolvable margin and never returns Infinity', () => {
  const r = computeQuote(input({ platformRate: 50, targetMarginRate: 60 }))
  expectAllFinite(r)
  expect(r.invalid.margin).toBe(true)
  expect(r.suggestedUSD).toBe(0)
})

it('flags an impossible insurance rate on CIF', () => {
  const r = computeQuote(input({ mode: 'CIF', insuranceRate: 150 }))
  expectAllFinite(r)
  expect(r.invalid.insurance).toBe(true)
  expect(r.breakdown.insurance).toBe(0)
})

it('handles extreme but valid magnitudes', () => {
  const tiny = computeQuote(input({ qty: 1, unitCostTaxIncl: 0.01, customerTargetUSD: 0.01, fxRate: 0.0001 }))
  const huge = computeQuote(input({ qty: 1_000_000, unitCostTaxIncl: 999_999, fxRate: 1000 }))
  expectAllFinite(tiny)
  expectAllFinite(huge)
  expect(huge.orderCostCNY).toBeGreaterThan(tiny.orderCostCNY)
})

it('a zero-cost product quotes a zero price instead of NaN', () => {
  const r = computeQuote(
    input({ unitCostTaxIncl: 0, unitPackaging: 0, unitDomesticFee: 0, orderDomesticMisc: 0, orderDomesticFreight: 0 }),
  )
  expectAllFinite(r)
  expect(r.unitCostCNY).toBe(0)
  expect(r.breakEvenUSD).toBe(0)
  expect(r.suggestedUSD).toBe(0)
})
