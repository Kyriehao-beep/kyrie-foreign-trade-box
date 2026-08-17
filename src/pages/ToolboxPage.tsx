import { ExchangeConverter } from '../features/toolbox/ExchangeConverter'
import { ToolShortcuts } from '../features/toolbox/ToolShortcuts'
import { WorldClockPanel } from '../features/toolbox/WorldClockPanel'

export function ToolboxPage() {
  return <main className="mx-auto max-w-7xl px-5 py-12 lg:px-8"><div className="max-w-2xl"><p className="text-sm font-semibold text-brand-600">贸商工具箱</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">跨时区、跨币种，也能快速判断</h1><p className="mt-4 leading-7 text-slate-600">把每天都会查的世界时间、汇率与外贸入口放在一起。在线数据不可用时，明确切换为离线参考。</p></div><div className="mt-10"><ExchangeConverter /></div><div className="mt-14"><WorldClockPanel /></div><ToolShortcuts /></main>
}
