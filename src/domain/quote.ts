/**
 * Single source of truth for quotation math.
 *
 * UNIT DISCIPLINE (this is the fix for the old -7919.4% bug):
 * the previous implementation divided an order-level cost by a per-unit
 * target price. Every field below is therefore explicitly suffixed:
 *   - `*Unit*`/`unit*`  -> value for ONE piece
 *   - `*Order*`/`order*`-> value for the WHOLE order (= per-unit value x qty)
 * Never mix the two. `unit` money is CNY unless the name ends with `USD`.
 */

export type QuoteMode = 'FOB' | 'CIF'

export interface QuoteInput {
  productName: string
  /** Order quantity (pieces). Values <= 0 or NaN fall back to 1. */
  qty: number

  /* ---------- step 1: quick quote ---------- */
  /** Purchase / production cost per unit, VAT inclusive (CNY per piece). */
  unitCostTaxIncl: number
  /** Packaging cost per unit (CNY per piece). */
  unitPackaging: number
  /** Target profit margin on the quoted price (%). */
  targetMarginRate: number
  /** Customer's expected price (USD per piece). */
  customerTargetUSD: number
  /** Exchange rate USD -> CNY. */
  fxRate: number

  /* ---------- step 2: advanced fees ---------- */
  /** VAT rate used to extract the net purchase price (%). */
  vatRate: number
  /** Export rebate rate applied to the net purchase price (%). */
  rebateRate: number
  /** Domestic handling fee per unit (CNY per piece). */
  unitDomesticFee: number
  /** International freight per unit, CIF only (CNY per piece). */
  unitIntlFreight: number
  /** Domestic misc cost for the whole order (CNY per order). */
  orderDomesticMisc: number
  /** Domestic freight for the whole order (CNY per order). */
  orderDomesticFreight: number
  /** Marketplace commission (% of quoted revenue). */
  platformRate: number
  /** Payment collection fee (% of quoted revenue). */
  collectionRate: number
  /** Agent commission (% of quoted revenue). */
  commissionRate: number
  /** Insurance rate, CIF only (% of CIF value). */
  insuranceRate: number
  /** Assumed FX downside used for the stress test (%). */
  fxRiskRate: number
  mode: QuoteMode
}

export interface QuoteBreakdown {
  /** All values are CNY for the WHOLE order. */
  purchaseTaxIncl: number
  rebateDeduction: number
  packaging: number
  domesticFee: number
  intlFreight: number
  insurance: number
  orderDomesticMisc: number
  orderDomesticFreight: number
  revenueBasedFees: number
}

export interface QuoteResult {
  qty: number
  mode: QuoteMode
  fxRate: number

  /* ---------- per unit (每件) ---------- */
  /** Landed cost per unit, excluding revenue-based fees (CNY per piece). */
  unitCostCNY: number
  /** Quoted price per unit (USD per piece) - anchored on the suggested price. */
  unitPriceUSD: number
  /** Quoted price per unit (CNY per piece). */
  unitPriceCNY: number
  /** Profit per unit at the quoted price (CNY per piece). */
  unitProfitCNY: number
  /** Profit margin per unit at the quoted price (0-1). */
  unitProfitRate: number

  /* ---------- per order (整单) ---------- */
  /** Landed cost for the whole order, excluding revenue-based fees (CNY). */
  orderCostCNY: number
  /** Order amount at the quoted price (USD). */
  orderAmountUSD: number
  /** Order amount at the quoted price (CNY). */
  orderAmountCNY: number
  /** Profit for the whole order at the quoted price (CNY). */
  orderProfitCNY: number

  /* ---------- price anchors (每件) ---------- */
  /** Break-even price - zero profit (USD per piece). */
  breakEvenUSD: number
  /** Suggested price - hits the target margin (USD per piece). */
  suggestedUSD: number
  /** Customer's expected price (USD per piece). */
  targetUSD: number
  /** Target margin as configured (0-1). */
  targetMarginRate: number

  /* ---------- customer target price analysis ---------- */
  /** Profit per unit if the customer's price is accepted (CNY per piece). */
  targetUnitProfitCNY: number
  /** Profit for the whole order at the customer's price (CNY). */
  targetOrderProfitCNY: number
  /** Margin at the customer's price (0-1); negative when it loses money. */
  targetProfitRate: number
  /** customerTargetUSD - breakEvenUSD; negative means below break-even. */
  targetGapUSD: number
  /** Shortfall for the whole order (CNY) when below break-even. */
  targetShortfallOrderCNY: number
  targetBelowBreakEven: boolean

  /* ---------- FX stress test ---------- */
  fxDropRate: number
  /** Profit per unit after the FX drops by fxRiskRate (CNY per piece). */
  fxDropUnitProfitCNY: number
  /** Profit for the whole order after the FX drops (CNY). */
  fxDropOrderProfitCNY: number

  /** Cost breakdown, all CNY for the whole order. */
  breakdown: QuoteBreakdown

  /** Input combinations the math cannot solve; UI must surface these. */
  invalid: {
    /** platform + collection + commission >= 100%. */
    feeRate: boolean
    /** feeRate + target margin >= 100%. */
    margin: boolean
    /** Insurance rate >= 100%. */
    insurance: boolean
  }
}

/* ------------------------------ guards ------------------------------ */

/** NaN / Infinity / non-numbers collapse to 0 so the UI never shows NaN. */
export function safeNum(value: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

/** Money and counts can never be negative. */
export function nonNeg(value: number): number {
  return Math.max(0, safeNum(value))
}

/** Percentages are clamped below 100 so the denominators stay positive. */
export function clampPct(value: number): number {
  const n = safeNum(value)
  if (n < 0) return 0
  return Math.min(n, 99.999)
}

/** Final safety net: no Infinity may ever reach the screen. */
function fin(value: number): number {
  return Number.isFinite(value) ? value : 0
}

/* ------------------------------ defaults ------------------------------ */

export const DEFAULT_QUOTE_INPUT: QuoteInput = {
  productName: '',
  qty: 100,
  unitCostTaxIncl: 80,
  unitPackaging: 4,
  targetMarginRate: 20,
  customerTargetUSD: 19.9,
  // 仅作为接口返回前的占位值，必须与 services/rates.ts 的离线兜底一致，
  // 否则首屏未取到实时汇率时报价会明显偏离。
  fxRate: 6.7209,
  vatRate: 13,
  rebateRate: 13,
  unitDomesticFee: 2,
  unitIntlFreight: 18,
  orderDomesticMisc: 500,
  orderDomesticFreight: 300,
  platformRate: 3,
  collectionRate: 1,
  commissionRate: 0,
  insuranceRate: 0.3,
  fxRiskRate: 2,
  mode: 'FOB',
}

/* ------------------------------ the math ------------------------------ */

export function computeQuote(input: QuoteInput): QuoteResult {
  const qty = Math.max(1, safeNum(input.qty))
  const fxRaw = safeNum(input.fxRate)
  const fx = fxRaw > 0 ? fxRaw : 1
  const mode: QuoteMode = input.mode === 'CIF' ? 'CIF' : 'FOB'

  /* ---- landed cost per unit ---- */
  const unitCostTaxIncl = nonNeg(input.unitCostTaxIncl)
  const vat = clampPct(input.vatRate) / 100
  const rebate = clampPct(input.rebateRate) / 100

  // Rebate is refunded on the VAT-exclusive purchase price.
  const netPurchase = unitCostTaxIncl / (1 + vat)
  const rebatePerUnit = netPurchase * rebate
  const actualPurchasePerUnit = unitCostTaxIncl - rebatePerUnit

  const unitPackaging = nonNeg(input.unitPackaging)
  const unitDomesticFee = nonNeg(input.unitDomesticFee)
  const fobCostPerUnit = actualPurchasePerUnit + unitPackaging + unitDomesticFee

  const intlFreightPerUnit = mode === 'CIF' ? nonNeg(input.unitIntlFreight) : 0
  const insRateRaw = clampPct(input.insuranceRate) / 100
  const insRate = mode === 'CIF' ? insRateRaw : 0
  // CIF value = (FOB + freight) / (1 - rate); premium = rate x CIF value.
  // The flag uses the raw rate: clamping silently turns 100% into 99.999%,
  // which yields a finite but meaningless number instead of a warning.
  const insuranceInvalid = mode === 'CIF' && nonNeg(input.insuranceRate) >= 100
  const cifValuePerUnit = insRate < 1 ? (fobCostPerUnit + intlFreightPerUnit) / (1 - insRate) : 0
  const insurancePerUnit = mode === 'CIF' && !insuranceInvalid ? cifValuePerUnit * insRate : 0
  const baseCostPerUnit = fobCostPerUnit + intlFreightPerUnit + insurancePerUnit

  // Order-only costs are amortised across the pieces so per-unit stays comparable.
  const orderDomesticMisc = nonNeg(input.orderDomesticMisc)
  const orderDomesticFreight = nonNeg(input.orderDomesticFreight)
  const orderFixedPerUnit = (orderDomesticMisc + orderDomesticFreight) / qty

  /** 单件人民币成本 - landed cost per unit, before revenue-based fees. */
  const unitCostCNY = fin(baseCostPerUnit + orderFixedPerUnit)

  /* ---- revenue-based fees and the two anchor prices ---- */
  const feeRate = fin(
    (clampPct(input.platformRate) + clampPct(input.collectionRate) + clampPct(input.commissionRate)) / 100,
  )
  const marginRate = fin(clampPct(input.targetMarginRate) / 100)

  const feeInvalid = feeRate >= 1
  const marginInvalid = feeRate + marginRate >= 1

  // break-even: price x (1 - feeRate) = cost
  const breakEvenCNY = feeInvalid ? 0 : fin(unitCostCNY / (1 - feeRate))
  // suggested: (price - price x feeRate - cost) / price = margin
  const suggestedCNY = marginInvalid ? 0 : fin(unitCostCNY / (1 - feeRate - marginRate))

  const breakEvenUSD = fin(breakEvenCNY / fx)
  const suggestedUSD = fin(suggestedCNY / fx)
  const targetUSD = nonNeg(input.customerTargetUSD)

  /* ---- the quoted price is the suggested price ---- */
  const unitPriceCNY = suggestedCNY
  const unitPriceUSD = suggestedUSD
  const unitFeeCNY = fin(unitPriceCNY * feeRate)
  const unitProfitCNY = fin(unitPriceCNY - unitCostCNY - unitFeeCNY)
  const unitProfitRate = unitPriceCNY > 0 ? fin(unitProfitCNY / unitPriceCNY) : 0

  const orderCostCNY = fin(unitCostCNY * qty)
  const orderAmountCNY = fin(unitPriceCNY * qty)
  const orderAmountUSD = fin(unitPriceUSD * qty)
  const orderProfitCNY = fin(unitProfitCNY * qty)

  /* ---- what happens at the customer's price ---- */
  const targetUnitPriceCNY = fin(targetUSD * fx)
  const targetUnitFeeCNY = fin(targetUnitPriceCNY * feeRate)
  const targetUnitProfitCNY = fin(targetUnitPriceCNY - unitCostCNY - targetUnitFeeCNY)
  const targetOrderProfitCNY = fin(targetUnitProfitCNY * qty)
  const targetProfitRate = targetUnitPriceCNY > 0 ? fin(targetUnitProfitCNY / targetUnitPriceCNY) : 0
  const targetGapUSD = fin(targetUSD - breakEvenUSD)
  const targetBelowBreakEven = targetUSD > 0 && breakEvenUSD > 0 && targetUSD < breakEvenUSD
  const targetShortfallOrderCNY = targetBelowBreakEven ? fin(-targetUnitProfitCNY * qty) : 0

  /* ---- FX downside stress test ---- */
  const fxDropRate = fin(clampPct(input.fxRiskRate) / 100)
  const fxDropped = fx * (1 - fxDropRate)
  const fxDropUnitPriceCNY = fin(unitPriceUSD * fxDropped)
  const fxDropUnitProfitCNY = fin(fxDropUnitPriceCNY - unitCostCNY - fxDropUnitPriceCNY * feeRate)
  const fxDropOrderProfitCNY = fin(fxDropUnitProfitCNY * qty)

  const breakdown: QuoteBreakdown = {
    purchaseTaxIncl: fin(unitCostTaxIncl * qty),
    rebateDeduction: fin(rebatePerUnit * qty),
    packaging: fin(unitPackaging * qty),
    domesticFee: fin(unitDomesticFee * qty),
    intlFreight: fin(intlFreightPerUnit * qty),
    insurance: fin(insurancePerUnit * qty),
    orderDomesticMisc,
    orderDomesticFreight,
    revenueBasedFees: fin(unitFeeCNY * qty),
  }

  return {
    qty,
    mode,
    fxRate: fx,
    unitCostCNY,
    unitPriceUSD,
    unitPriceCNY,
    unitProfitCNY,
    unitProfitRate,
    orderCostCNY,
    orderAmountUSD,
    orderAmountCNY,
    orderProfitCNY,
    breakEvenUSD,
    suggestedUSD,
    targetUSD,
    targetMarginRate: marginRate,
    targetUnitProfitCNY,
    targetOrderProfitCNY,
    targetProfitRate,
    targetGapUSD,
    targetShortfallOrderCNY,
    targetBelowBreakEven,
    fxDropRate,
    fxDropUnitProfitCNY,
    fxDropOrderProfitCNY,
    breakdown,
    invalid: { feeRate: feeInvalid, margin: marginInvalid, insurance: insuranceInvalid },
  }
}

/** Advice shown when the customer's target price is below break-even. */
export function belowBreakEvenAdvice(result: QuoteResult): string {
  const gapPerUnit = Math.abs(result.targetGapUSD)
  return `客户目标价比保本价低 $${gapPerUnit.toFixed(2)}/件，按 ${result.qty} 件整单测算将亏损约 ¥${Math.round(
    result.targetShortfallOrderCNY,
  ).toLocaleString('zh-CN')}。建议先降本（换料/还供应商价/提高数量摊薄整单费用），或改报 FOB、提高数量再谈；谈不下来建议直接放弃，避免接单即亏。`
}
