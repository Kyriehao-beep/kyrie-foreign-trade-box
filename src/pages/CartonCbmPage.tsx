import { CartonCbmCalculator } from '../features/toolbox/CartonCbmCalculator'

export function CartonCbmPage() {
  return (
    <main className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold text-brand-600">装箱 CBM 计算器</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">算清箱数、体积与计费重量</h1>
        <p className="mt-4 leading-7 text-slate-600">
          输入产品数量、每箱装量与纸箱尺寸，立即得到总箱数、合计 CBM、毛/净重、体积重与计费重量，并估算 20GP / 40GP / 40HQ 的装载率。所有数值都标注「每箱 / 每件 / 合计」，避免口径混淆。结果可一键写入装箱单或带入报价助手。
        </p>
      </div>
      <div className="mt-10">
        <CartonCbmCalculator />
      </div>
    </main>
  )
}
