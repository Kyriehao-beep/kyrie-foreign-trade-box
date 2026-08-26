import { QuoteAssistant } from '../features/toolbox/QuoteAssistant'
import { QuoteCalculator } from '../features/toolbox/QuoteCalculator'

export function QuotePage() {
  return (
    <main className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold text-brand-600">报价助手</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">算清报价、利润与退税</h1>
        <p className="mt-4 leading-7 text-slate-600">输入成本与贸易条款，自动测算 FOB/CIF 报价、利润与退税，并给出还价话术。</p>
      </div>
      <div className="mt-10"><QuoteCalculator /></div>
      <div className="mt-14"><QuoteAssistant /></div>
    </main>
  )
}
