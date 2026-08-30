import { describe, it, expect } from 'vitest'
import {
  calculateCartonCbm,
  computeCartonCount,
  computeCartonVolumeM3,
  computeChargeableWeightKg,
  computeContainerUtilization,
  computeDimensionalWeightKg,
  validateCartonCbmInput,
  CONTAINER_CBM,
  type CartonCbmInput,
} from './cartonCbm'

const base: CartonCbmInput = {
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

describe('computeCartonCount（箱数向上取整）', () => {
  it('整除时等于商', () => {
    expect(computeCartonCount(2400, 50)).toBe(48)
  })
  it('不能整除时向上取整', () => {
    expect(computeCartonCount(2401, 50)).toBe(49)
    expect(computeCartonCount(100, 30)).toBe(4)
  })
  it('每箱装量为 0 或数量为 0 时不报错、返回 0', () => {
    expect(computeCartonCount(0, 50)).toBe(0)
    expect(computeCartonCount(2400, 0)).toBe(0)
  })
})

describe('computeCartonVolumeM3（单箱体积）', () => {
  it('60×40×30 cm = 0.072 m³', () => {
    expect(computeCartonVolumeM3(60, 40, 30)).toBeCloseTo(0.072, 9)
  })
  it('空值/0 不产生 NaN', () => {
    expect(computeCartonVolumeM3(0, 0, 0)).toBe(0)
    expect(Number.isFinite(computeCartonVolumeM3(NaN, 40, 30))).toBe(true)
  })
})

describe('体积重与计费重量', () => {
  it('快递 1 CBM ≈ 200 kg', () => {
    expect(computeDimensionalWeightKg(3.456, 'express')).toBeCloseTo(691.2, 6)
  })
  it('空运 1 CBM ≈ 167 kg', () => {
    expect(computeDimensionalWeightKg(3.456, 'air')).toBeCloseTo(577.152, 6)
  })
  it('海运不计体积重，返回 0', () => {
    expect(computeDimensionalWeightKg(3.456, 'sea')).toBe(0)
  })
  it('计费重量 = max(实重, 体积重)', () => {
    expect(computeChargeableWeightKg(864, 691.2)).toBe(864)
    expect(computeChargeableWeightKg(500, 577.152)).toBeCloseTo(577.152, 6)
  })
})

describe('calculateCartonCbm 海运', () => {
  it('汇总各项并计费重量取毛重、体积重为 null', () => {
    const { ok, result, errors } = calculateCartonCbm(base)
    expect(ok).toBe(true)
    expect(errors).toEqual([])
    expect(result!.cartonCount).toBe(48)
    expect(result!.cartonVolumeM3).toBeCloseTo(0.072, 9)
    expect(result!.totalCBM).toBeCloseTo(3.456, 9)
    expect(result!.totalGrossKg).toBeCloseTo(864, 6)
    expect(result!.totalNetKg).toBeCloseTo(768, 6)
    expect(result!.dimensionalWeightKg).toBeNull()
    expect(result!.chargeableWeightKg).toBeCloseTo(864, 6)
  })
})

describe('calculateCartonCbm 快递/空运', () => {
  it('快递：计费重量取实重与体积重较大者', () => {
    const r = calculateCartonCbm({ ...base, method: 'express' }).result!
    expect(r.dimensionalWeightKg).toBeCloseTo(691.2, 6)
    expect(r.chargeableWeightKg).toBeCloseTo(864, 6)
  })
  it('空运且体积重大于实重时取体积重', () => {
    const r = calculateCartonCbm({ ...base, method: 'air', grossWeightPerCartonKg: 10, netWeightPerCartonKg: 8 }).result!
    expect(r.totalGrossKg).toBeCloseTo(480, 6)
    expect(r.chargeableWeightKg).toBeCloseTo(577.152, 6)
  })
})

describe('零值与空值不出 NaN / Infinity', () => {
  it('全 0 输入返回有限数值', () => {
    const r = calculateCartonCbm({
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
    }).result!
    for (const v of [
      r.cartonCount,
      r.totalCBM,
      r.totalGrossKg,
      r.totalNetKg,
      r.chargeableWeightKg,
      r.avgFreightPerUnitCNY,
      r.perPieceNetKg,
    ]) {
      expect(Number.isFinite(v)).toBe(true)
    }
    expect(r.totalCBM).toBe(0)
  })
  it('NaN 被安全塌缩为 0', () => {
    const r = calculateCartonCbm({ ...base, productQty: NaN, cartonLengthCm: NaN }).result!
    expect(Number.isFinite(r.totalCBM)).toBe(true)
  })
})

describe('超大数量', () => {
  it('1000 万件不产生 Infinity', () => {
    const r = calculateCartonCbm({ ...base, productQty: 10_000_000 }).result!
    expect(r.cartonCount).toBe(200_000)
    expect(r.totalCBM).toBeCloseTo(14400, 0)
    expect(Number.isFinite(r.chargeableWeightKg)).toBe(true)
  })
})

describe('集装箱利用率', () => {
  it('3.456 CBM 对应各柜型利用率正确', () => {
    const u = computeContainerUtilization(3.456)
    expect(u['20GP']).toBeCloseTo(3.456 / CONTAINER_CBM['20GP'], 9)
    expect(u['40GP']).toBeCloseTo(3.456 / CONTAINER_CBM['40GP'], 9)
    expect(u['40HQ']).toBeCloseTo(3.456 / CONTAINER_CBM['40HQ'], 9)
  })
  it('超柜体积时利用率 > 1（仅估算，不报错）', () => {
    const u = computeContainerUtilization(100)
    expect(u['20GP']).toBeGreaterThan(1)
  })
})

describe('平均运费 / 件', () => {
  it('总运费 10000 元 / 2400 件', () => {
    const r = calculateCartonCbm({ ...base, estimatedFreightCNY: 10000 }).result!
    expect(r.avgFreightPerUnitCNY).toBeCloseTo(10000 / 2400, 9)
  })
  it('未填运费时为 0', () => {
    const r = calculateCartonCbm(base).result!
    expect(r.avgFreightPerUnitCNY).toBe(0)
  })
})

describe('不能整除的尾箱说明', () => {
  it('2400/50 整除：尾箱=每箱装量', () => {
    const r = calculateCartonCbm(base).result!
    expect(r.remainderUnits).toBe(0)
    expect(r.lastCartonUnits).toBe(50)
  })
  it('2401/50 不整除：尾箱=1 件', () => {
    const r = calculateCartonCbm({ ...base, productQty: 2401 }).result!
    expect(r.remainderUnits).toBe(1)
    expect(r.lastCartonUnits).toBe(1)
  })
})

describe('校验', () => {
  it('负数被拦截', () => {
    const errors = validateCartonCbmInput({ ...base, cartonLengthCm: -5 })
    expect(errors.length).toBeGreaterThan(0)
    expect(errors.some((e) => e.includes('纸箱长'))).toBe(true)
    const calc = calculateCartonCbm({ ...base, cartonLengthCm: -5 })
    expect(calc.ok).toBe(false)
    expect(calc.result).toBeNull()
  })
  it('净重不能大于毛重', () => {
    const errors = validateCartonCbmInput({ ...base, netWeightPerCartonKg: 20, grossWeightPerCartonKg: 18 })
    expect(errors.some((e) => e.includes('净重'))).toBe(true)
  })
  it('托盘数量为正但尺寸为负被拦截', () => {
    const errors = validateCartonCbmInput({ ...base, palletQty: 10, palletLengthCm: -1 })
    expect(errors.some((e) => e.includes('托盘长'))).toBe(true)
  })
})
