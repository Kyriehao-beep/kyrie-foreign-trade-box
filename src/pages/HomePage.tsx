import { ArrowRight, Calculator, Check, FileText, ShieldCheck, Sparkles, TrendingUp, Users } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Reveal } from '../components/Reveal'
import { PLANS, PRICING_SUMMARY } from '../features/membership/staticConfig'
import { QuickStartDialog } from '../features/documents/QuickStartDialog'

// 价格一律取自 staticConfig，页面不重复维护一份，避免各处口径打架。
const homePlans = PLANS.map((plan) => ({ ...plan, highlight: plan.id === 'yearly' }))

// 三个核心工具卡（首页只展示最关键的三个，其余在工作台内可达）。
const coreTools = [
  { icon: Calculator, title: '外贸报价助手', desc: '填成本与费用，自动测算 FOB/CIF 保本价、建议报价、利润与退税，一键生成 PI 与报价话术。', to: '/quote', tag: '热门' },
  { icon: FileText, title: '外贸单据制作', desc: '六种外贸单据，一套资料持续复用，支持 PDF 与 Excel 导出，字段带核对提示。', to: '/documents' },
  { icon: Users, title: '跟单助手', desc: '把谈成的客户收进来，按洽谈→报价→下单→出货→收款跟进，优先级与紧急度一目了然。', to: '/follow-up', tag: '新' },
]

// 三个核心痛点（对应首屏三句话）。
const painPoints = [
  { icon: Calculator, title: '报价不亏', text: '汇率算错、退税漏算，一单可能白干。报价助手自动算保本价与利润，数字看得见。' },
  { icon: FileText, title: '单据不错', text: '字段错一个，清关被退、客户投诉。六类单据一套资料复用，导出前逐项核对。' },
  { icon: Users, title: '客户不漏跟', text: '客户一多就忘了跟进。跟单助手按阶段推进，谁该跟、什么时候跟，一屏看清。' },
]

const demoTabs = [
  { id: 'quote', label: '报价测算' },
  { id: 'doc', label: '单据制作' },
  { id: 'follow', label: '跟单跟进' },
] as const

function WorkbenchDemo() {
  const [tab, setTab] = useState<(typeof demoTabs)[number]['id']>('quote')
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-wrap gap-1 border-b border-line bg-slate-50/60 p-2" role="tablist" aria-label="工作台演示">
        {demoTabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={`min-h-[40px] rounded-xl px-4 text-sm font-medium transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${tab === item.id ? 'bg-white text-brand-700 shadow-soft' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="p-5 sm:p-6">
        {tab === 'quote' ? (
          <div>
            <p className="text-xs font-medium text-slate-500">报价测算（示意）</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {[['FOB 保本价', '$12.30'], ['CIF 建议报价', '$15.54'], ['预估毛利率', '20%']].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-line bg-slate-50/60 p-4">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="num mt-1 text-xl font-semibold text-ink">{value}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-500">填入成本、费用与汇率，保本价、利润和退税自动算出来——不用再拿计算器逐项加。</p>
          </div>
        ) : null}
        {tab === 'doc' ? (
          <div>
            <p className="text-xs font-medium text-slate-500">单据制作（示意）</p>
            <div className="mt-3 rounded-xl border border-line bg-white p-4">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <span className="text-sm font-semibold">商业发票 (CI)</span>
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">已完成 5/6 区域</span>
              </div>
              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                {[['买方', 'ABC Trading Co., Ltd.'], ['贸易术语', 'FOB Shanghai'], ['币种', 'USD'], ['总金额', '$15,540.00']].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2"><span className="text-slate-500">{k}</span><span className="num truncate font-medium text-ink">{v}</span></div>
                ))}
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-500">一套买方资料反复用，导出 PDF / Excel 直接发给客户，字段带「请核对」提示。</p>
          </div>
        ) : null}
        {tab === 'follow' ? (
          <div>
            <p className="text-xs font-medium text-slate-500">跟单跟进（示意）</p>
            <ol className="mt-3 space-y-2">
              {[['洽谈', '已完成'], ['已报价', '进行中'], ['已下单', '待开始'], ['出货', '待开始'], ['收款', '待开始']].map(([stage, status], i) => (
                <li key={stage} className="flex items-center gap-3 rounded-xl border border-line bg-white px-3 py-2.5">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-semibold text-white">{i + 1}</span>
                  <span className="flex-1 text-sm font-medium text-ink">{stage}</span>
                  <span className="text-xs text-slate-500">{status}</span>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-sm leading-6 text-slate-500">每个客户走到哪一步、下一步何时跟，列表按紧急度自动排好。</p>
          </div>
        ) : null}
      </div>
    </Card>
  )
}

function SectionHeading({ eyebrow, title, desc }: { eyebrow: string; title: string; desc?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-semibold text-brand-600">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">{title}</h2>
      {desc ? <p className="mt-3 text-slate-600">{desc}</p> : null}
    </div>
  )
}

export function HomePage() {
  const [quickStartOpen, setQuickStartOpen] = useState(false)
  return (
    <main>
      {/* ───────── 1. Hero ───────── */}
      <section className="border-b border-line/70 bg-white">
        <div className="mx-auto grid max-w-shell items-center gap-12 px-5 py-20 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-28">
          <div>
            <Badge><Sparkles className="mr-1.5 h-3.5 w-3.5" />为中国外贸人打造的效率工作台</Badge>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.1] tracking-[-0.03em] text-ink sm:text-5xl">报价不亏、单据不错、客户不漏跟</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">Kyrie的外贸盒子，把外贸业务里最重复的工作，变成打开即用的小工具。</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button size="lg" onClick={() => setQuickStartOpen(true)}>免费开始使用<ArrowRight className="h-4 w-4" /></Button>
              <Button asChild size="lg" variant="outline"><a href="#pain">看看能解决什么问题</a></Button>
            </div>
            <div className="mt-8 grid gap-2 text-sm text-slate-500">
              <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />单据与跟单数据默认保存在当前浏览器，本地功能不会主动上传业务资料</span>
              <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />打开浏览器就能用，{PRICING_SUMMARY.noAutoCharge}</span>
            </div>
          </div>
          <div className="mx-auto w-full max-w-xl">
            <WorkbenchDemo />
          </div>
        </div>
      </section>

      {/* ───────── 2. 三个核心痛点 ───────── */}
      <section id="pain" className="bg-paper">
        <div className="mx-auto max-w-shell px-5 py-20 lg:px-8">
          <Reveal>
            <SectionHeading eyebrow="能帮你解决什么" title="外贸日常最磨人的三件事" desc="下面这三件，几乎每个外贸人都反复遇到。我们把它们做成了打开即用的小工具。" />
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {painPoints.map((item, i) => {
              const Icon = item.icon
              return (
                <Reveal key={item.title} delay={i * 70}>
                  <div className="h-full rounded-card border border-line bg-white p-6 shadow-soft transition-[transform,box-shadow,border-color] duration-fast hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-700"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                    <h3 className="mt-5 text-lg font-semibold text-ink">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{item.text}</p>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ───────── 3. 三个核心工具 ───────── */}
      <section className="bg-white">
        <div className="mx-auto max-w-shell px-5 py-20 lg:px-8">
          <Reveal>
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <SectionHeading eyebrow="核心工具" title="三个最常用的小工具" />
              <Button asChild variant="ghost" className="hidden sm:inline-flex"><Link to="/quote">进入工具箱<ArrowRight className="h-4 w-4" /></Link></Button>
            </div>
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {coreTools.map((tool, i) => {
              const Icon = tool.icon
              return (
                <Reveal key={tool.title} delay={i * 70}>
                  <Link
                    to={tool.to}
                    className="group flex h-full flex-col rounded-card border border-line bg-white p-6 shadow-soft transition-[transform,box-shadow,border-color] duration-fast hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    <div className="flex items-center justify-between">
                      <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-700"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                      {tool.tag ? <span className="rounded-full bg-brand-600 px-2.5 py-1 text-xs font-medium text-white">{tool.tag}</span> : null}
                    </div>
                    <h3 className="mt-5 text-lg font-semibold text-ink group-hover:text-brand-700">{tool.title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-6 text-slate-500">{tool.desc}</p>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600">打开工具<ArrowRight className="h-4 w-4 transition-transform duration-fast group-hover:translate-x-1" /></span>
                  </Link>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ───────── 4. 会员方案 ───────── */}
      <section className="bg-paper">
        <div className="mx-auto max-w-shell px-5 py-20 lg:px-8">
          <Reveal>
            <SectionHeading eyebrow="会员方案" title="先用完整试用，再决定订阅" desc={`新用户${PRICING_SUMMARY.trial}，六类单据、跟单助手和全部工具完整开放。不按生成次数计费、${PRICING_SUMMARY.noAutoCharge}。`} />
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {homePlans.map((plan, i) => (
              <Reveal key={plan.id} delay={i * 70}>
                <Card className={`h-full bg-white ${plan.highlight ? 'relative border-brand-500 ring-2 ring-brand-100' : ''}`}>
                  {plan.highlight ? <Badge className="absolute -top-3 left-5 bg-brand-600 text-white">更划算</Badge> : null}
                  <div className="p-5 pb-3">
                    <h3 className="text-xl font-semibold text-ink">{plan.name}</h3>
                    <p className="mt-2 text-sm text-slate-500">{plan.note}</p>
                  </div>
                  <div className="p-5 pt-2">
                    <p><span className="num text-4xl font-semibold tracking-tight text-ink">¥{plan.amountCny}</span><span className="ml-1 text-sm text-slate-500">{plan.suffix}</span></p>
                    <ul className="mt-6 space-y-3 text-sm text-slate-600">
                      {['六类外贸单据', '跟单助手（优先级/时间线/业务剧本）', 'PDF 与 Excel 导出', '贸商工具箱']
                        .concat(plan.id === 'lifetime' ? [PRICING_SUMMARY.lifetimeScope] : ['订阅期内可继续使用后续上线的工具'])
                        .map((item) => <li key={item} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />{item}</li>)}
                    </ul>
                    <Button asChild className="mt-7 w-full"><Link to="/membership">了解{plan.name}</Link></Button>
                  </div>
                </Card>
              </Reveal>
            ))}
          </div>
          <p className="mt-6 text-center text-sm leading-7 text-slate-500">
            上面是<strong className="font-semibold text-slate-600">工作台的使用费</strong>（按月 / 年 / 买断任选）。
            {PRICING_SUMMARY.lifetimeScope}，{PRICING_SUMMARY.lifetimeExcludes}。
            若想为你的企业私人定制专属工具，属于另一项服务，微信聊需求后单独报价，<strong className="font-semibold text-slate-600">不包含在订阅或买断内</strong>。
          </p>
        </div>
      </section>

      {/* ───────── 5. 私人定制 CTA ───────── */}
      <section className="bg-ink text-white">
        <div className="mx-auto max-w-shell px-5 py-20 lg:px-8">
          <Reveal>
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold text-emerald-200"><TrendingUp className="h-4 w-4" aria-hidden="true" />为中小企业私人定制</span>
              <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">帮你的团队，定制一套专属工具工作台</h2>
              <p className="mt-4 text-lg leading-8 text-white/75">报价、制单、跟单、汇率换算自动化，减少重复录入和手工核对，让团队把时间留给客户和成交。不卖大系统，只解决你最头疼的那一个环节——小步快跑，交付即用。</p>
            </div>
          </Reveal>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="secondary"><Link to="/about">看看能帮你定制什么<ArrowRight className="h-4 w-4" /></Link></Button>
            <Button asChild size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10"><Link to="/contact">加微信聊需求</Link></Button>
          </div>
        </div>
      </section>

      {/* ───────── 6. 结尾 CTA ───────── */}
      <section className="bg-brand-600">
        <div className="mx-auto max-w-shell px-5 py-16 text-center lg:px-8">
          <h2 className="text-3xl font-semibold tracking-tight text-white">把外贸生意里的琐碎，交给一个工作台</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/80">{PRICING_SUMMARY.trial}，之后 {PRICING_SUMMARY.monthly}<strong className="font-semibold">订阅这个工作台</strong>，不绑卡、{PRICING_SUMMARY.noAutoCharge}。今天就开始，把时间留给真正的成交。</p>
          <div className="mt-7 flex justify-center">
            <Button asChild size="lg" variant="secondary"><Link to="/documents">{PRICING_SUMMARY.trial}，开始制作单据<ArrowRight className="h-4 w-4" /></Link></Button>
          </div>
        </div>
      </section>

      <QuickStartDialog open={quickStartOpen} onClose={() => setQuickStartOpen(false)} />
    </main>
  )
}
