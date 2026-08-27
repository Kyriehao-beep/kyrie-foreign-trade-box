import { ArrowLeftRight, ArrowRight, Calculator, Check, FileSpreadsheet, Globe2, Layers, ShieldCheck, Sparkles, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader } from '../components/ui/card'
import { Reveal } from '../components/Reveal'
import { DOCUMENT_TYPES } from '../domain/documents'

const homePlans = [
  { id: 'trial', name: '体验包', amountCny: 9.9, suffix: '/次', note: '1 份单据模板个性化，改成你公司抬头+术语' },
  { id: 'standard', name: '标准包', amountCny: 99, suffix: '/套', note: '报价计算器 + 3–5 个核心工具组合 + 品牌定制' },
  { id: 'full', name: '总包（私有定制）', amountCny: 199, suffix: '/面议', note: '从你业务痛点出发，定制一整套私有工具' },
]

// 贸商工具矩阵 —— 后续新增工具只改这个数组即可（icon / 标题 / 描述 / 入口）
const homeTools = [
  { icon: Calculator, title: '外贸报价助手', desc: '上传产品图，自动测算 FOB/CIF 报价、利润与退税，一键生成 PI 与报价话术。', to: '/quote', tag: '热门' },
  { icon: ArrowLeftRight, title: '汇率换算器', desc: '在线汇率失败时自动切换带日期的离线参考数据，跨境报价不卡壳。', to: '/exchange' },
  { icon: Globe2, title: '世界时间', desc: '一眼判断海外客户是否处于工作时间，减少跨时区无效等待。', to: '/world' },
  { icon: FileSpreadsheet, title: '单据制作', desc: '六种外贸单据，一套资料持续复用，支持 PDF 与 Excel 导出。', to: '/documents' },
  { icon: Users, title: '跟单助手', desc: '把谈成的客户收进来，按洽谈→报价→下单→出货→收款跟进，做单据时一键加入。', to: '/follow-up', tag: '新' },
]

export function HomePage() {
  return (
    <main>
      {/* ───────────── Hero ───────────── */}
      <section className="relative overflow-hidden border-b border-slate-200/70 bg-white">
        <div className="absolute inset-0 bg-mesh" />
        <div className="animate-drift pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="animate-drift-2 pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-ocean/15 blur-3xl" />
        <div className="absolute inset-0 bg-dots opacity-50" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-[1.08fr_.92fr] lg:px-8 lg:py-28">
          <div>
            <Badge><Sparkles className="mr-1.5 h-3.5 w-3.5" />为中国外贸人打造的效率工作台</Badge>
            <h1 className="mt-6 max-w-3xl text-5xl font-semibold leading-[1.08] tracking-[-0.04em] text-ink sm:text-6xl">报价、单据、汇率、跨时区沟通，<br /><span className="text-brand-600">一处搞定，把时间还给成交。</span></h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">Kyrie 外贸工作台把六种外贸单据、FOB/CIF 报价测算、跟单助手、世界时间与汇率换算收进一个本地优先的工作台。新手三分钟上手，老外贸每天省下两小时。</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild size="lg"><Link to="/documents">开始制作单据<ArrowRight className="h-4 w-4" /></Link></Button>
              <Button asChild size="lg" variant="outline"><Link to="/toolbox">打开贸商工具箱</Link></Button>
            </div>
            <div className="mt-8 grid gap-2 text-sm text-slate-500">
              <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-brand-600" />单据内容仍在本地处理，不上传云端</span>
              <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-ocean" />无需注册，打开浏览器就能用</span>
              <span className="flex items-center gap-2"><FileSpreadsheet className="h-4 w-4 shrink-0 text-brand-600" />支持 PDF 与 Excel · 永久免费使用</span>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-xl">
            <div className="animate-drift absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-brand-100/60 to-sky-100/50 blur-2xl" />
            <div className="animate-float relative">
              <Card className="overflow-hidden p-3 shadow-[0_30px_80px_rgba(15,55,50,0.15)]">
                <div className="rounded-xl bg-ink p-5 text-white">
                  <div className="flex items-center justify-between"><span className="text-sm font-semibold">今日工作台</span><span className="rounded-full bg-white/10 px-2 py-1 text-xs">已自动保存</span></div>
                  <div className="mt-8 grid grid-cols-3 gap-3">{[['6','外贸单据'],['5','贸商工具'],['永久','免费使用']].map(([value, label]) => <div key={label} className="rounded-xl bg-white/8 p-3"><p className="text-2xl font-semibold">{value}</p><p className="mt-1 text-xs text-white/60">{label}</p></div>)}</div>
                </div>
                <div className="grid gap-3 p-4 sm:grid-cols-2">{DOCUMENT_TYPES.slice(0, 4).map((item, index) => <div key={item.code} className="rounded-xl border border-slate-200 p-4 transition-colors hover:border-brand-200"><div className="flex items-center justify-between"><span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-xs font-bold text-brand-700">{item.code}</span><span className="text-xs text-slate-400">{index + 1}/6</span></div><p className="mt-4 font-semibold">{item.name}</p><p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p></div>)}</div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────── 贸商工具矩阵（可扩展） ───────────── */}
      <section className="relative overflow-hidden bg-paper">
        <div className="animate-drift pointer-events-none absolute -right-24 top-10 h-64 w-64 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <Reveal>
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-semibold text-brand-600">贸商工具箱</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight">小工具持续上新，越用越值</h2>
                <p className="mt-3 max-w-2xl text-slate-600">每个工具都针对外贸日常的一个具体痛点。后续我们还会不断加入装箱计算、客户管理、开发信生成等能力。</p>
              </div>
              <Button asChild variant="ghost"><Link to="/toolbox">进入工具箱<ArrowRight className="h-4 w-4" /></Link></Button>
            </div>
          </Reveal>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {homeTools.map((tool, i) => {
              const Icon = tool.icon
              return (
                <Reveal key={tool.title} delay={i * 70}>
                  <Link to={tool.to} className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-soft">
                    <div className="flex items-center justify-between">
                      <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-700 transition-transform duration-300 group-hover:scale-110"><Icon className="h-5 w-5" /></span>
                      {tool.tag ? <span className="rounded-full bg-brand-600 px-2.5 py-1 text-xs font-medium text-white">{tool.tag}</span> : null}
                    </div>
                    <h3 className="mt-5 text-lg font-semibold group-hover:text-brand-700">{tool.title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-6 text-slate-500">{tool.desc}</p>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600">打开工具<ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" /></span>
                  </Link>
                </Reveal>
              )
            })}
            <Reveal delay={homeTools.length * 70}>
              <div className="flex h-full flex-col justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 p-5 text-center">
                <Layers className="mx-auto h-7 w-7 text-slate-300" />
                <h3 className="mt-4 text-base font-semibold text-slate-600">更多工具持续上线</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">装箱计算 · 客户管理 · 开发信生成……正在打磨中。</p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ───────────── 外贸单据中心 ───────────── */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <Reveal>
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-semibold text-brand-600">外贸单据中心</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight">六种单据，一套资料持续复用</h2>
              </div>
              <Button asChild variant="ghost"><Link to="/documents">进入单据中心<ArrowRight className="h-4 w-4" /></Link></Button>
            </div>
          </Reveal>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {DOCUMENT_TYPES.map((item, i) => (
              <Reveal key={item.code} delay={(i % 3) * 70}>
                <Link to="/documents" className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-soft">
                  <span className="text-xs font-bold text-brand-600">{item.code}</span>
                  <h3 className="mt-8 text-xl font-semibold group-hover:text-brand-700">{item.name}</h3>
                  <p className="mt-2 flex-1 text-sm leading-6 text-slate-500">{item.description}</p>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── 价值特性（暗色） ───────────── */}
      <section className="relative overflow-hidden bg-ink text-white">
        <div className="animate-drift pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="animate-drift-2 pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-5 py-20 lg:grid-cols-3 lg:px-8">
          {[
            { icon: Users, title: '跟单助手', text: '把客户收进来，按洽谈→报价→下单→出货→收款全流程跟进，优先级、紧急度、业务剧本一目了然。' },
            { icon: Globe2, title: '跨时区沟通', text: '快速判断海外客户是否处于工作时间，减少无效等待。' },
            { icon: Calculator, title: '报价与效率工具', text: 'FOB/CIF 报价测算、汇率换算，在线数据不可用时自动切换离线参考。' },
          ].map(({ icon: Icon, title, text }) => (
            <Reveal key={title}>
              <div className="h-full rounded-2xl border border-white/10 bg-white/5 p-6 transition-colors duration-300 hover:border-white/20 hover:bg-white/10">
                <Icon className="h-7 w-7 text-emerald-300 transition-transform duration-300 hover:scale-110" />
                <h3 className="mt-8 text-xl font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/65">{text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ───────────── 会员 / 价格 ───────────── */}
      <section className="relative overflow-hidden bg-paper">
        <div className="absolute inset-0 bg-dots opacity-40" />
        <div className="animate-drift pointer-events-none absolute -left-20 top-0 h-64 w-64 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <Reveal>
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-semibold text-brand-600">服务方案</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight">需要专属工具？按需求定制</h2>
                <p className="mt-3 max-w-2xl text-slate-600">工具箱本身永久免费、打开即用。如果现有工具还差你那一步，选个服务包，我帮你把痛点做成私有小工具。</p>
              </div>
              <Button asChild variant="ghost"><Link to="/about">查看定制服务<ArrowRight className="h-4 w-4" /></Link></Button>
            </div>
          </Reveal>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {homePlans.map((plan, i) => (
              <Reveal key={plan.id} delay={i * 70}>
                <Card className={`h-full bg-white ${plan.id === 'yearly' ? 'relative border-brand-500 ring-2 ring-brand-100' : ''}`}>
                  {plan.id === 'yearly' ? <Badge className="absolute -top-3 left-5 bg-brand-600 text-white">更适合长期使用</Badge> : null}
                  <CardHeader>
                    <div className="flex items-center justify-between"><h3 className="text-xl font-semibold">{plan.name}</h3></div>
                    <p className="mt-2 text-sm text-slate-500">{plan.note}</p>
                  </CardHeader>
                  <CardContent>
                    <p><span className="text-4xl font-semibold tracking-tight">¥{plan.amountCny}</span><span className="ml-1 text-sm text-slate-500">{plan.suffix}</span></p>
                    <ul className="mt-6 space-y-3 text-sm text-slate-600">{['六类外贸单据', '跟单助手（优先级/时间线/业务剧本）', 'PDF 与 Excel 导出', '贸商工具箱及后续新工具'].map((item) => <li key={item} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-brand-600" />{item}</li>)}</ul>
                    <Button asChild className="mt-7 w-full"><Link to="/about">了解{plan.name}</Link></Button>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-slate-500">定制服务按需沟通，微信确认后开工，不满意可协商。个人外贸人与小团队都能轻松起步。</p>
        </div>
      </section>

      {/* ───────────── 结尾 CTA ───────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-600 to-brand-700">
        <div className="animate-drift pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-5 py-16 text-center lg:px-8">
          <h2 className="text-3xl font-semibold tracking-tight text-white">把外贸生意里的琐碎，交给一个工作台</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/80">工具永久免费，不绑卡、不自动扣费。今天就开始，把时间留给真正的成交。</p>
          <div className="mt-7 flex justify-center">
            <Button asChild size="lg" variant="secondary"><Link to="/documents">免费开始制作单据<ArrowRight className="h-4 w-4" /></Link></Button>
          </div>
        </div>
      </section>
    </main>
  )
}
