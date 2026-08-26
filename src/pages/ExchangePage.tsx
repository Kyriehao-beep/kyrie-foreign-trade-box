import { ExchangeConverter } from '../features/toolbox/ExchangeConverter'

export function ExchangePage() {
  return (
    <main className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold text-brand-600">汇率换算</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">在线汇率不可用时自动切换离线参考</h1>
        <p className="mt-4 leading-7 text-slate-600">跨境报价不卡壳，明确标注数据来源与日期。</p>
      </div>
      <div className="mt-10"><ExchangeConverter /></div>
    </main>
  )
}
