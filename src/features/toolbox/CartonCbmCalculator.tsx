import {
  AlertTriangle,
  Boxes,
  Check,
  Copy,
  FileText,
  Info,
  PackageCheck,
  Plane,
  Printer,
  RotateCcw,
  Ship,
  Truck,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { createEmptyDraft, createLineItem, type DocumentDraft, type LineItem } from '../../domain/documents'
import { loadDraft, saveDraft } from '../../services/storage'
import {
  calculateCartonCbm,
  CONTAINER_CBM,
  DEFAULT_CARTON_CBM_INPUT,
  SAMPLE_CARTON_CBM_INPUT,
  type CartonCbmInput,
  type ContainerType,
  type ShippingMethod,
} from './cartonCbm'

const STORAGE_KEY = 'ktb_carton_cbm'

const METHOD_OPTIONS: { value: ShippingMethod; label: string; icon: typeof Truck }[] = [
  { value: 'express', label: '国际快递', icon: Truck },
  { value: 'air', label: '空运', icon: Plane },
  { value: 'sea', label: '海运', icon: Ship },
]

const CONTAINER_ORDER: ContainerType[] = ['20GP', '40GP', '40HQ']

/* ------------------------------ 格式化 ------------------------------ */

const fmt = (n: number, digits = 2): string =>
  (Number.isFinite(n) ? n : 0).toLocaleString('zh-CN', { maximumFractionDigits: digits, minimumFractionDigits: 0 })

/* ------------------------------ 局部输入控件 ------------------------------ */

function NumField({
  label,
  value,
  onChange,
  suffix,
  hint,
  scope,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  suffix?: string
  hint?: string
  scope?: string
}) {
  return (
    <label className="block text-xs font-medium text-slate-600">
      <span className="flex flex-wrap items-center gap-1">
        {label}
        {scope ? (
          <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-normal text-slate-500">
            {scope}
          </Badge>
        ) : null}
        {suffix ? <span className="text-slate-400">/ {suffix}</span> : null}
      </span>
      {hint ? <span className="ml-1 text-[10px] text-slate-400">（{hint}）</span> : null}
      <Input
        className="mt-1.5"
        type="number"
        step="any"
        min={0}
        value={Number.isFinite(value) ? value : ''}
        aria-label={label}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
      />
    </label>
  )
}

function Metric({ label, value, unit, sub, scope }: { label: string; value: string; unit: string; sub?: string; scope?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      <p className="flex items-center gap-1 text-[11px] text-slate-500">
        {label}
        {scope ? <span className="rounded bg-white px-1 text-[9px] text-slate-400">{scope}</span> : null}
      </p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums text-ink">
        {value}
        <span className="ml-1 text-xs font-normal text-slate-400">{unit}</span>
      </p>
      {sub ? <p className="mt-0.5 text-[10px] text-slate-400">{sub}</p> : null}
    </div>
  )
}

/* ------------------------------ 主组件 ------------------------------ */

export function CartonCbmCalculator() {
  const navigate = useNavigate()
  const [input, setInput] = useState<CartonCbmInput>(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<CartonCbmInput>
        return { ...DEFAULT_CARTON_CBM_INPUT, ...parsed }
      }
    } catch {
      /* 忽略损坏的本地数据，回退默认 */
    }
    return DEFAULT_CARTON_CBM_INPUT
  })
  const [writeStatus, setWriteStatus] = useState<{ ok: boolean; msg: string } | null>(null)

  const calc = useMemo(() => calculateCartonCbm(input), [input])

  // 本地持久化（仅本工具使用的独立键，不触碰其它草稿）。
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(input))
    } catch {
      /* 存储不可用时静默 */
    }
  }, [input])

  const set = <K extends keyof CartonCbmInput>(key: K) => (value: CartonCbmInput[K]) =>
    setInput((prev) => ({ ...prev, [key]: value }))

  const loadSample = () => {
    setInput(SAMPLE_CARTON_CBM_INPUT)
    setWriteStatus(null)
  }

  const clearAll = () => {
    if (!window.confirm('确定要清空所有输入并恢复默认吗？此操作不可撤销。')) return
    setInput(DEFAULT_CARTON_CBM_INPUT)
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
    setWriteStatus(null)
  }

  const printSummary = () => window.print()

  const writeToPackingList = () => {
    if (!calc.result) return
    const r = calc.result
    const existing = loadDraft('PL').value
    const base: DocumentDraft = existing ?? createEmptyDraft('PL')
    const items: LineItem[] = base.items.length ? base.items : [createLineItem()]
    const first: LineItem = { ...items[0] }
    first.quantity = input.productQty
    first.cartons = r.cartonCount
    first.netWeight = r.perPieceNetKg
    first.grossWeight = r.perPieceGrossKg
    first.volume = r.perPieceVolumeM3
    const updated: DocumentDraft = {
      ...base,
      items: [first, ...items.slice(1)],
      updatedAt: new Date().toISOString(),
    }
    const res = saveDraft(updated)
    if (res.ok) {
      setWriteStatus({ ok: true, msg: '已写入装箱单草稿（首行）。到单据中心选择「装箱单(PL)」即可查看。' })
    } else {
      setWriteStatus({ ok: false, msg: '写入失败：当前浏览器无法保存草稿。' })
    }
  }

  const bringToQuote = () => {
    if (!calc.result || calc.result.avgFreightPerUnitCNY <= 0) return
    navigate(`/quote?freight=${encodeURIComponent(calc.result.avgFreightPerUnitCNY.toFixed(4))}`)
  }

  const r = calc.result
  const hasPallet = input.palletQty > 0

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* ==================== 左：输入 ==================== */}
      <Card className="p-0 print:hidden">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-brand-50 to-white px-5 py-4 dark:from-[#0f3a31] dark:to-[#15231f]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-brand-600">装箱、CBM 与计费重量</p>
              <p className="text-xs text-slate-500">算箱数、体积与计费重量，辅助报价与订舱</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={loadSample}>加载示例</Button>
            <Button size="sm" variant="ghost" onClick={clearAll}>清空</Button>
          </div>
        </div>

        <div className="space-y-5 p-5">
          <section>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">产品与装箱</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <NumField label="产品数量" value={input.productQty} onChange={set('productQty')} suffix="件" scope="件" />
              <NumField label="每箱装量" value={input.unitsPerCarton} onChange={set('unitsPerCarton')} suffix="件/箱" />
            </div>
          </section>

          <section>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">纸箱尺寸（每箱）</p>
            <div className="grid grid-cols-3 gap-x-4 gap-y-3">
              <NumField label="长" value={input.cartonLengthCm} onChange={set('cartonLengthCm')} suffix="cm" scope="每箱" />
              <NumField label="宽" value={input.cartonWidthCm} onChange={set('cartonWidthCm')} suffix="cm" scope="每箱" />
              <NumField label="高" value={input.cartonHeightCm} onChange={set('cartonHeightCm')} suffix="cm" scope="每箱" />
            </div>
          </section>

          <section>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">每箱重量</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <NumField label="每箱毛重" value={input.grossWeightPerCartonKg} onChange={set('grossWeightPerCartonKg')} suffix="kg" scope="每箱" />
              <NumField label="每箱净重" value={input.netWeightPerCartonKg} onChange={set('netWeightPerCartonKg')} suffix="kg" scope="每箱" />
            </div>
          </section>

          <section>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">托盘（可选，不栈板可留空）</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
              <NumField label="托盘数量" value={input.palletQty} onChange={set('palletQty')} suffix="个" />
              <NumField label="长" value={input.palletLengthCm} onChange={set('palletLengthCm')} suffix="cm" />
              <NumField label="宽" value={input.palletWidthCm} onChange={set('palletWidthCm')} suffix="cm" />
              <NumField label="高" value={input.palletHeightCm} onChange={set('palletHeightCm')} suffix="cm" />
            </div>
          </section>

          <section>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">运输方式</p>
            <div className="flex flex-wrap gap-2">
              {METHOD_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => set('method')(value)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                    input.method === value
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              快递按 1 CBM ≈ 200 kg、空运按 1 CBM ≈ 167 kg 计体积重；海运不计体积重，计费重量取实际毛重。
            </p>
          </section>

          <section>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">预计运费（可选）</p>
            <NumField
              label="预计总运费"
              value={input.estimatedFreightCNY}
              onChange={set('estimatedFreightCNY')}
              suffix="元"
              scope="整单"
              hint="用于折算平均运费/件"
            />
          </section>
        </div>
      </Card>

      {/* ==================== 右：结果 ==================== */}
      <div className="space-y-6">
        {/* 打印专用抬头（仅打印可见） */}
        <div className="hidden rounded-xl border border-slate-200 bg-white p-4 print:block">
          <p className="text-sm font-semibold text-ink">装箱 / CBM / 计费重量 计算摘要</p>
          <p className="text-xs text-slate-500">生成时间：{new Date().toLocaleString('zh-CN')}</p>
        </div>

        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <p className="text-sm font-semibold text-ink">计算结果</p>
            <Button size="sm" variant="ghost" onClick={printSummary}>
              <Printer className="mr-1.5 h-4 w-4" />
              打印摘要
            </Button>
          </div>

          <div className="p-5">
            {!calc.ok ? (
              <div className="rounded-lg bg-red-50 px-3 py-3 text-xs leading-relaxed text-red-700">
                <p className="font-medium">请修正以下输入：</p>
                <ul className="mt-1 list-disc pl-5">
                  {calc.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            ) : r ? (
              <>
                {/* 总箱数 */}
                <div className="rounded-2xl bg-gradient-to-br from-ocean to-blue-700 p-5 text-white">
                  <p className="text-[11px] text-white/60">总箱数</p>
                  <p className="mt-0.5 text-3xl font-semibold tabular-nums">{fmt(r.cartonCount, 0)} 箱</p>
                  {r.remainderUnits > 0 ? (
                    <p className="mt-1 text-[11px] text-white/70">
                      数量不能被每箱装量整除：除 {fmt(Math.floor(input.productQty / Math.max(1, input.unitsPerCarton)), 0)} 个满箱外，还多出 1 个不满箱（尾箱 {fmt(r.lastCartonUnits, 0)} 件）。
                    </p>
                  ) : (
                    <p className="mt-1 text-[11px] text-white/70">数量恰好装满，无不满箱。</p>
                  )}
                </div>

                {/* 指标网格 */}
                <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
                  <Metric label="单箱体积" value={fmt(r.cartonVolumeM3, 4)} unit="m³" scope="每箱" sub={`${fmt(input.cartonLengthCm, 0)}×${fmt(input.cartonWidthCm, 0)}×${fmt(input.cartonHeightCm, 0)} cm`} />
                  <Metric label="合计体积" value={fmt(r.totalCBM, 3)} unit="m³" scope="整单" />
                  <Metric label="合计毛重" value={fmt(r.totalGrossKg, 1)} unit="kg" scope="整单" />
                  <Metric label="合计净重" value={fmt(r.totalNetKg, 1)} unit="kg" scope="整单" />
                  <Metric
                    label="体积重"
                    value={r.dimensionalWeightKg == null ? '不适用' : fmt(r.dimensionalWeightKg, 1)}
                    unit={r.dimensionalWeightKg == null ? '' : 'kg'}
                    scope="整单"
                    sub={r.dimensionalWeightKg == null ? '海运按实际重量' : `1 CBM ≈ ${input.method === 'air' ? '167' : '200'} kg`}
                  />
                  <Metric label="计费重量" value={fmt(r.chargeableWeightKg, 1)} unit="kg" scope="整单" sub="= max(实重, 体积重)" />
                </div>

                {/* 托盘信息 */}
                {hasPallet ? (
                  <div className="mt-3 rounded-xl bg-slate-50/60 p-3 text-xs text-slate-600">
                    托盘：{fmt(input.palletQty, 0)} 个，单托体积 {fmt(r.palletVolumeM3, 4)} m³，托盘合计体积 {fmt(r.totalPalletCBM, 3)} m³。
                  </div>
                ) : null}

                {/* 柜型装载估算 */}
                <div className="mt-4">
                  <p className="text-xs font-semibold text-ink">柜型装载估算（按体积）</p>
                  <div className="mt-2 space-y-2">
                    {CONTAINER_ORDER.map((c) => {
                      const pct = r.containerUtilization[c]
                      const widthPct = Math.min(pct, 1) * 100
                      const over = pct > 1
                      return (
                        <div key={c} className="flex items-center gap-3">
                          <span className="w-12 shrink-0 text-xs font-medium text-slate-600">{c}</span>
                          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${over ? 'bg-amber-500' : 'bg-brand-500'}`}
                              style={{ width: `${widthPct}%` }}
                            />
                          </div>
                          <span className={`w-16 shrink-0 text-right text-xs tabular-nums ${over ? 'text-amber-600' : 'text-slate-600'}`}>
                            {(pct * 100).toFixed(1)}%
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-400">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>
                      柜型容量为经验值（20GP≈33 / 40GP≈67 / 40HQ≈76 m³）。以上仅为体积利用率估算，实际装载还受限重、货物形状、托盘与绑扎方式影响，请以船公司或承运人的最终确认为准。
                    </span>
                  </p>
                </div>

                {/* 平均运费 */}
                {r.avgFreightPerUnitCNY > 0 ? (
                  <div className="mt-3 rounded-xl bg-brand-50 px-3 py-2 text-xs text-brand-700">
                    平均运费 ≈ ¥{fmt(r.avgFreightPerUnitCNY, 3)} / 件（按预计总运费 {fmt(input.estimatedFreightCNY, 0)} 元 ÷ {fmt(input.productQty, 0)} 件）。
                  </div>
                ) : null}

                {/* 联动操作 */}
                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  <Button size="sm" onClick={writeToPackingList}>
                    <PackageCheck className="mr-1.5 h-4 w-4" />
                    写入装箱单
                  </Button>
                  <Button size="sm" variant="outline" onClick={bringToQuote} disabled={r.avgFreightPerUnitCNY <= 0}>
                    <FileText className="mr-1.5 h-4 w-4" />
                    带入报价助手
                  </Button>
                </div>
                {r.avgFreightPerUnitCNY <= 0 ? (
                  <p className="mt-2 text-[11px] text-slate-400">填写「预计总运费」后，可一键把平均运费/件带入报价助手。</p>
                ) : null}

                {writeStatus ? (
                  <p
                    className={`mt-3 rounded-lg px-3 py-2 text-xs ${writeStatus.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}
                  >
                    {writeStatus.ok ? <Check className="mr-1 inline h-3.5 w-3.5" /> : null}
                    {writeStatus.msg}
                    {writeStatus.ok ? (
                      <a href="/documents" className="ml-1 font-medium underline">
                        前往单据中心
                      </a>
                    ) : null}
                  </p>
                ) : null}
              </>
            ) : null}
          </div>
        </Card>

        {/* 隐私 / 估算说明 */}
        <p className="flex items-start gap-1.5 px-1 text-[11px] leading-relaxed text-slate-400 print:hidden">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>所有计算只在你的浏览器本地完成，输入不会上传服务器；结果会暂存在本机（独立键 ktb_carton_cbm），刷新不丢失。本工具不做实时运价查询，运费需你自行向承运人或货代确认。</span>
        </p>
      </div>
    </div>
  )
}
