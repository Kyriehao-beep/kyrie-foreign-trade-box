/**
 * 装箱、CBM 与计费重量计算器 —— 纯计算层（无 UI、无副作用、可单测）。
 *
 * 设计原则：
 * 1. 所有重量/体积严格区分「每箱 / 每件 / 合计」，UI 必须逐字标注单位，禁止混用。
 * 2. 任何字段为空或 0 都不会产生 NaN / Infinity；负数会被校验拦截。
 * 3. 集装箱可用容积、体积重折算系数均为行业常用经验值（见下方常量），仅作估算。
 */

/* ------------------------------ 常量 ------------------------------ */

/** 常见柜型内部可用容积（立方米 CBM），行业常用经验值，仅作装载估算。 */
export const CONTAINER_CBM = {
  '20GP': 33,
  '40GP': 67,
  '40HQ': 76,
} as const

export type ContainerType = keyof typeof CONTAINER_CBM

/** 运输方式。 */
export type ShippingMethod = 'express' | 'air' | 'sea'

/**
 * 体积重折算系数：每 1 CBM 相当于多少千克。
 * - 快递：1 CBM ≈ 200 kg（等价于单件 L×W×H / 5000，kg）
 * - 空运：1 CBM ≈ 167 kg（等价于单件 L×W×H / 6000，kg）
 * - 海运：按实际重量计费，不计体积重
 */
export const DIM_WEIGHT_PER_CBM: Record<ShippingMethod, number | null> = {
  express: 200,
  air: 167,
  sea: null,
}

export const SHIPPING_METHOD_LABEL: Record<ShippingMethod, string> = {
  express: '国际快递',
  air: '空运',
  sea: '海运',
}

/* ------------------------------ 输入 / 输出类型 ------------------------------ */

export interface CartonCbmInput {
  /** 产品总数量（件）。 */
  productQty: number
  /** 每箱装量（件/箱）。 */
  unitsPerCarton: number
  /** 纸箱长（cm）。 */
  cartonLengthCm: number
  /** 纸箱宽（cm）。 */
  cartonWidthCm: number
  /** 纸箱高（cm）。 */
  cartonHeightCm: number
  /** 每箱毛重（kg/箱）。 */
  grossWeightPerCartonKg: number
  /** 每箱净重（kg/箱）。 */
  netWeightPerCartonKg: number
  /** 托盘数量（个）；0 表示不栈板化。 */
  palletQty: number
  /** 托盘长（cm）。 */
  palletLengthCm: number
  /** 托盘宽（cm）。 */
  palletWidthCm: number
  /** 托盘高（cm）。 */
  palletHeightCm: number
  /** 运输方式。 */
  method: ShippingMethod
  /** 预计总运费（元，整单）；0 表示未填写。 */
  estimatedFreightCNY: number
}

export interface CartonCbmResult {
  /** 总箱数（向上取整）。 */
  cartonCount: number
  /** 最后一箱的实际件数；整除时等于每箱装量，不能整除时小于每箱装量。 */
  lastCartonUnits: number
  /** 除箱后剩余件数（productQty % unitsPerCarton）。 */
  remainderUnits: number
  /** 单箱体积（立方米）。 */
  cartonVolumeM3: number
  /** 合计体积 / 总 CBM（立方米）。 */
  totalCBM: number
  /** 合计毛重（kg）。 */
  totalGrossKg: number
  /** 合计净重（kg）。 */
  totalNetKg: number
  /** 体积重（kg）；海运为 null（不适用）。 */
  dimensionalWeightKg: number | null
  /** 计费重量（kg）= max(实重, 体积重)；海运等于毛重。 */
  chargeableWeightKg: number
  /** 单托盘体积（立方米）。 */
  palletVolumeM3: number
  /** 托盘合计体积（立方米）。 */
  totalPalletCBM: number
  /** 各柜型利用率（小数，0.42 = 42%）。 */
  containerUtilization: Record<ContainerType, number>
  /** 平均运费 / 件（元/件）；未填运费时为 0。 */
  avgFreightPerUnitCNY: number
  /** 写入装箱单用的每件派生值（与现有 LineItem 语义一致：重量/体积均按件计）。 */
  perPieceNetKg: number
  perPieceGrossKg: number
  perPieceVolumeM3: number
}

export interface CartonCbmCalc {
  ok: boolean
  result: CartonCbmResult | null
  errors: string[]
}

/* ------------------------------ 安全数值工具 ------------------------------ */

/** NaN / Infinity / 非数字一律塌缩为 0，保证 UI 永不出 NaN。 */
export function safeNum(value: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

/* ------------------------------ 纯函数 ------------------------------ */

/** 箱数 = ceil(数量 / 每箱装量)；任一为非正时返回 0（不会抛错或 NaN）。 */
export function computeCartonCount(qty: number, unitsPerCarton: number): number {
  const q = Math.max(0, safeNum(qty))
  const u = Math.max(0, safeNum(unitsPerCarton))
  if (u <= 0 || q <= 0) return 0
  return Math.ceil(q / u)
}

/** 单箱体积（m³）= 长×宽×高(cm) / 1_000_000。 */
export function computeCartonVolumeM3(lengthCm: number, widthCm: number, heightCm: number): number {
  const v = (safeNum(lengthCm) * safeNum(widthCm) * safeNum(heightCm)) / 1_000_000
  return safeNum(v)
}

/** 体积重（kg）= 总 CBM × 系数；海运系数为 null，返回 0。 */
export function computeDimensionalWeightKg(totalCBM: number, method: ShippingMethod): number {
  const per = DIM_WEIGHT_PER_CBM[method]
  if (per == null) return 0
  return safeNum(totalCBM) * per
}

/** 计费重量 = max(实际毛重, 体积重)，并兜底 0。 */
export function computeChargeableWeightKg(grossKg: number, dimKg: number): number {
  return Math.max(safeNum(grossKg), safeNum(dimKg))
}

/** 各柜型利用率（小数）。 */
export function computeContainerUtilization(totalCBM: number): Record<ContainerType, number> {
  const cbm = safeNum(totalCBM)
  return {
    '20GP': cbm / CONTAINER_CBM['20GP'],
    '40GP': cbm / CONTAINER_CBM['40GP'],
    '40HQ': cbm / CONTAINER_CBM['40HQ'],
  }
}

/* ------------------------------ 校验 ------------------------------ */

/** 仅拦截负数与明显矛盾（净重>毛重）；返回中文错误提示数组（空=通过）。 */
export function validateCartonCbmInput(input: CartonCbmInput): string[] {
  const errors: string[] = []
  const nonNegChecks: [string, number][] = [
    ['产品数量', input.productQty],
    ['每箱装量', input.unitsPerCarton],
    ['纸箱长', input.cartonLengthCm],
    ['纸箱宽', input.cartonWidthCm],
    ['纸箱高', input.cartonHeightCm],
    ['每箱毛重', input.grossWeightPerCartonKg],
    ['每箱净重', input.netWeightPerCartonKg],
  ]
  for (const [name, value] of nonNegChecks) {
    if (Number.isFinite(value) && value < 0) errors.push(`${name}不能为负数`)
  }
  if (Number.isFinite(input.netWeightPerCartonKg) && Number.isFinite(input.grossWeightPerCartonKg)) {
    if (input.netWeightPerCartonKg > input.grossWeightPerCartonKg) {
      errors.push('每箱净重不能大于每箱毛重')
    }
  }
  if (Number.isFinite(input.palletQty) && input.palletQty > 0) {
    const palletChecks: [string, number][] = [
      ['托盘长', input.palletLengthCm],
      ['托盘宽', input.palletWidthCm],
      ['托盘高', input.palletHeightCm],
    ]
    for (const [name, value] of palletChecks) {
      if (Number.isFinite(value) && value < 0) errors.push(`${name}不能为负数`)
    }
  }
  if (Number.isFinite(input.estimatedFreightCNY) && input.estimatedFreightCNY < 0) {
    errors.push('预计总运费不能为负数')
  }
  return errors
}

/* ------------------------------ 顶层计算 ------------------------------ */

export function calculateCartonCbm(input: CartonCbmInput): CartonCbmCalc {
  const errors = validateCartonCbmInput(input)
  if (errors.length > 0) return { ok: false, result: null, errors }

  const qty = safeNum(input.productQty)
  const units = safeNum(input.unitsPerCarton)

  const cartonCount = computeCartonCount(qty, units)
  const remainder = units > 0 ? qty % units : 0
  const lastCartonUnits = remainder === 0 ? units : remainder

  const cartonVolumeM3 = computeCartonVolumeM3(input.cartonLengthCm, input.cartonWidthCm, input.cartonHeightCm)
  const totalCBM = cartonVolumeM3 * cartonCount
  const totalGrossKg = safeNum(input.grossWeightPerCartonKg) * cartonCount
  const totalNetKg = safeNum(input.netWeightPerCartonKg) * cartonCount

  const dimKg = computeDimensionalWeightKg(totalCBM, input.method)
  const chargeableWeightKg = input.method === 'sea' ? totalGrossKg : computeChargeableWeightKg(totalGrossKg, dimKg)

  const palletVolumeM3 = computeCartonVolumeM3(input.palletLengthCm, input.palletWidthCm, input.palletHeightCm)
  const totalPalletCBM = palletVolumeM3 * safeNum(input.palletQty)

  const containerUtilization = computeContainerUtilization(totalCBM)

  const avgFreightPerUnitCNY =
    safeNum(input.estimatedFreightCNY) > 0 && qty > 0 ? safeNum(input.estimatedFreightCNY) / qty : 0

  const perPieceNetKg = qty > 0 ? totalNetKg / qty : 0
  const perPieceGrossKg = qty > 0 ? totalGrossKg / qty : 0
  const perPieceVolumeM3 = qty > 0 ? totalCBM / qty : 0

  const result: CartonCbmResult = {
    cartonCount,
    lastCartonUnits,
    remainderUnits: remainder,
    cartonVolumeM3,
    totalCBM,
    totalGrossKg,
    totalNetKg,
    dimensionalWeightKg: input.method === 'sea' ? null : dimKg,
    chargeableWeightKg,
    palletVolumeM3,
    totalPalletCBM,
    containerUtilization,
    avgFreightPerUnitCNY,
    perPieceNetKg,
    perPieceGrossKg,
    perPieceVolumeM3,
  }

  return { ok: true, result, errors: [] }
}

export const DEFAULT_CARTON_CBM_INPUT: CartonCbmInput = {
  productQty: 0,
  unitsPerCarton: 0,
  cartonLengthCm: 0,
  cartonWidthCm: 0,
  cartonHeightCm: 0,
  grossWeightPerCartonKg: 0,
  netWeightPerCartonKg: 0,
  palletQty: 0,
  palletLengthCm: 120,
  palletWidthCm: 100,
  palletHeightCm: 15,
  method: 'sea',
  estimatedFreightCNY: 0,
}

export const SAMPLE_CARTON_CBM_INPUT: CartonCbmInput = {
  productQty: 2400,
  unitsPerCarton: 50,
  cartonLengthCm: 60,
  cartonWidthCm: 40,
  cartonHeightCm: 30,
  grossWeightPerCartonKg: 18,
  netWeightPerCartonKg: 16,
  palletQty: 0,
  palletLengthCm: 120,
  palletWidthCm: 100,
  palletHeightCm: 15,
  method: 'sea',
  estimatedFreightCNY: 0,
}
