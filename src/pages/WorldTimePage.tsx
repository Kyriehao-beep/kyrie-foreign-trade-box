import { WorldClockPanel } from '../features/toolbox/WorldClockPanel'

export function WorldTimePage() {
  return (
    <main className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold text-brand-600">世界时间</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">一眼判断海外客户是否处于工作时间</h1>
        <p className="mt-4 leading-7 text-slate-600">减少跨时区无效等待，提高跟进效率。</p>
      </div>
      <div className="mt-10"><WorldClockPanel /></div>
    </main>
  )
}
