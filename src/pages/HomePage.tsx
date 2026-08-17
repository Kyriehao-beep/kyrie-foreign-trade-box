import { ArrowRight, Bot, Calculator, Check, FileSpreadsheet, Globe2, ShieldCheck, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader } from '../components/ui/card'
import { DOCUMENT_TYPES } from '../domain/documents'

const homePlans = [
  { id: 'monthly', name: '月度订阅', amountCny: 29, suffix: '/30 天', note: '适合短期订单与低成本起步' },
  { id: 'yearly', name: '年度订阅', amountCny: 199, suffix: '/365 天', note: '比按月购买节省 149 元' },
  { id: 'lifetime', name: '永久买断', amountCny: 599, suffix: '/永久', note: '当前核心功能永久使用' },
]

export function HomePage() {
  return (
    <main>
      <section className="relative overflow-hidden border-b border-slate-200/70 bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(22,135,108,0.12),transparent_35%),radial-gradient(circle_at_25%_80%,rgba(36,122,167,0.10),transparent_30%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-[1.08fr_.92fr] lg:px-8 lg:py-28">
          <div>
            <Badge><Sparkles className="mr-1.5 h-3.5 w-3.5" />为中国外贸人设计的轻量工作台</Badge>
            <h1 className="mt-6 max-w-3xl text-5xl font-semibold leading-[1.08] tracking-[-0.04em] text-ink sm:text-6xl">从询盘到单据，<br /><span className="text-brand-600">少填一遍，少错一处。</span></h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">六种常用外贸单据、AI 粘贴识别、世界时间与汇率换算，集中在一个本地优先的工具里。</p>
            <div className="mt-9 flex flex-wrap gap-3"><Button asChild size="lg"><Link to="/documents">开始制作单据<ArrowRight className="h-4 w-4" /></Link></Button><Button asChild size="lg" variant="outline"><Link to="/toolbox">打开贸商工具箱</Link></Button></div>
            <div className="mt-8 grid gap-2 text-sm text-slate-500"><span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-brand-600" />单据内容仍在本地处理，不上传云端</span><span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-ocean" />账号、会员状态与付款申请保存在服务器</span><span className="flex items-center gap-2"><FileSpreadsheet className="h-4 w-4 shrink-0 text-brand-600" />支持 PDF 与 Excel · 72 小时完整试用</span></div>
          </div>
          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-brand-100/60 to-sky-100/50 blur-2xl" />
            <Card className="relative overflow-hidden p-3 shadow-[0_30px_80px_rgba(15,55,50,0.15)]">
              <div className="rounded-xl bg-ink p-5 text-white"><div className="flex items-center justify-between"><span className="text-sm font-semibold">今日工作台</span><span className="rounded-full bg-white/10 px-2 py-1 text-xs">已自动保存</span></div><div className="mt-8 grid grid-cols-3 gap-3">{[['6','单据类型'],['20','世界城市'],['3天','完整试用']].map(([value,label])=><div key={label} className="rounded-xl bg-white/8 p-3"><p className="text-2xl font-semibold">{value}</p><p className="mt-1 text-xs text-white/60">{label}</p></div>)}</div></div>
              <div className="grid gap-3 p-4 sm:grid-cols-2">{DOCUMENT_TYPES.slice(0,4).map((item, index)=><div key={item.code} className="rounded-xl border border-slate-200 p-4"><div className="flex items-center justify-between"><span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-xs font-bold text-brand-700">{item.code}</span><span className="text-xs text-slate-400">{index + 1}/6</span></div><p className="mt-4 font-semibold">{item.name}</p><p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p></div>)}</div>
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold text-brand-600">外贸单据中心</p><h2 className="mt-2 text-3xl font-semibold tracking-tight">六种单据，一套资料持续复用</h2></div><Button asChild variant="ghost"><Link to="/documents">进入单据中心<ArrowRight className="h-4 w-4" /></Link></Button></div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{DOCUMENT_TYPES.map((item)=><Link to="/documents" key={item.code} className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-1 hover:border-brand-200 hover:shadow-soft"><span className="text-xs font-bold text-brand-600">{item.code}</span><h3 className="mt-8 text-xl font-semibold group-hover:text-brand-700">{item.name}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{item.description}</p></Link>)}</div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold text-brand-600">价格方案</p><h2 className="mt-2 text-3xl font-semibold tracking-tight">先免费试用 3 天，再按需付费</h2></div><Button asChild variant="ghost"><Link to="/membership">查看会员中心<ArrowRight className="h-4 w-4" /></Link></Button></div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{homePlans.map((plan) => <Card key={plan.id} className={plan.id === 'yearly' ? 'relative border-brand-500 ring-2 ring-brand-100' : ''}>{plan.id === 'yearly' ? <Badge className="absolute -top-3 left-5 bg-brand-600 text-white">更适合长期使用</Badge> : null}<CardHeader><div className="flex items-center justify-between"><h3 className="text-xl font-semibold">{plan.name}</h3></div><p className="mt-2 text-sm text-slate-500">{plan.note}</p></CardHeader><CardContent><p><span className="text-4xl font-semibold tracking-tight">¥{plan.amountCny}</span><span className="ml-1 text-sm text-slate-500">{plan.suffix}</span></p><ul className="mt-6 space-y-3 text-sm text-slate-600">{['六类外贸单据', 'AI 识别填单', 'PDF 与 Excel 导出', '贸商工具箱'].map((item) => <li key={item} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-brand-600" />{item}</li>)}</ul><Button asChild className="mt-7 w-full"><Link to="/membership">选择{plan.name}</Link></Button></CardContent></Card>)}</div>
        <p className="mt-6 text-center text-sm text-slate-500">付款由管理员人工核对开通，无需绑定银行卡或自动扣费。</p>
      </section>

      <section className="bg-ink text-white"><div className="mx-auto grid max-w-7xl gap-8 px-5 py-20 lg:grid-cols-3 lg:px-8">{[{icon:Bot,title:'AI 粘贴识别',text:'把客户询盘或订单备注粘贴进来，示例解析器自动填入明确字段。'}, {icon:Globe2,title:'跨时区沟通',text:'快速判断海外客户是否处于工作时间，减少无效等待。'}, {icon:Calculator,title:'汇率与常用工具',text:'在线汇率失败时自动切换带日期的离线参考数据。'}].map(({icon:Icon,title,text})=><div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-6"><Icon className="h-7 w-7 text-emerald-300" /><h3 className="mt-8 text-xl font-semibold">{title}</h3><p className="mt-3 text-sm leading-6 text-white/65">{text}</p></div>)}</div></section>
    </main>
  )
}
