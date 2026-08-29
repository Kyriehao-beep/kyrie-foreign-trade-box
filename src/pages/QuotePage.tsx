import { QuoteAssistant } from '../features/toolbox/QuoteAssistant'

export function QuotePage() {
  return (
    <main className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold text-brand-600">报价助手</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">算清报价、利润与退税</h1>
        <p className="mt-4 leading-7 text-slate-600">
          三步走：先填成本与数量，再补税费与运费，最后看保本价、建议报价和整单利润。全部指标都标明「每件」还是「整单」，避免算错口径。
        </p>
      </div>
      <div className="mt-10">
        <QuoteAssistant />
      </div>
    </main>
  )
}
