import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Calculator, FileText, MessageCircle, Sparkles, Users, Workflow, X } from 'lucide-react'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Reveal } from '../components/Reveal'
import { WECHAT_QR_BASE64 } from '../assets/qrCodes'

// 微信联系信息（真实数据，与联系页保持一致）。
const WECHAT = { name: 'Kyrie', note: '（**阳）· 中国香港' }

/* ── 三个痛点 → 改造结果 ───────────────────────────── */
const PAIN_POINTS = [
  { icon: Calculator, pain: '报价规则复杂，只有老业务员会算', result: '做成统一的报价与利润模型' },
  { icon: FileText, pain: '公司单据格式特殊，每次都要手工调整', result: '做成专属单据模板和导出工具' },
  { icon: Users, pain: '客户、订单和跟进信息分散', result: '做成轻量团队工作台' },
]

/* ── 三类服务（均为付费 / 按项目报价，不与免费咨询混在同一组）──────────── */
const SERVICES = [
  {
    icon: FileText,
    title: '单据与报价规则定制',
    price: '¥999',
    unit: '起',
    desc: '把你的报价模型、单据格式做成专属小工具，浏览器打开即用，交付源码。',
  },
  {
    icon: Users,
    title: '企业轻量工作台',
    price: '¥2999',
    unit: '起',
    desc: '报价 / 跟单 / 客户档案一整套私有工具，团队共享，数据留你司设备。',
  },
  {
    icon: Sparkles,
    title: 'AI 流程定制',
    price: '诊断后报价',
    unit: '',
    desc: '先用工具跑通流程，需要 AI 自动化的环节单独评估。',
    note: 'AI 功能涉及模型或第三方接口时，会提前说明实际调用成本，不使用「永久免费 AI」吸引成交。',
  },
]

/* ── 合作过程 ───────────────────────────── */
const PROCESS = [
  '提交最耗时间的流程',
  '免费梳理需求和边界',
  '确认原型、报价和交付范围',
  '验收后投入使用',
]

/* ── 微信二维码弹窗（仅在点击咨询后显示，减少首屏干扰）──────────── */
function WeChatModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="presentation">
      <div className="absolute inset-0 bg-slate-900/50" aria-hidden="true" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="wechat-modal-title"
        className="relative z-10 w-full max-w-sm rounded-t-2xl bg-white p-6 shadow-pop sm:rounded-2xl"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="关闭"
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-lg text-slate-400 transition-colors duration-fast hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 id="wechat-modal-title" className="text-lg font-bold text-ink">扫码加微信</h2>
        <p className="mt-1 text-sm text-slate-500">免费梳理一次流程，或聊聊你的定制需求</p>

        <div className="mt-4 rounded-xl border border-line bg-slate-50/60 p-4 text-center">
          <img
            src={WECHAT_QR_BASE64}
            alt="微信二维码"
            className="mx-auto h-52 w-52 rounded-lg object-contain"
          />
        </div>

        <p className="mt-3 text-center text-sm font-medium text-ink">微信：{WECHAT.name} {WECHAT.note}</p>
        <p className="mt-1 text-center text-xs text-slate-500">加好友备注「公司 + 想做的工具」，我优先通过</p>
      </div>
    </div>
  )
}

export default function AboutPage() {
  const [wechatOpen, setWechatOpen] = useState(false)

  return (
    <main>
      {/* ───────── 1. Hero（首屏直接看到结果、服务方向、咨询按钮）───────── */}
      <section className="border-b border-line/70 bg-white">
        <div className="mx-auto grid max-w-shell items-center gap-8 px-5 py-9 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-14">
          <div>
            <Badge><Sparkles className="mr-1.5 h-3.5 w-3.5" />外贸流程定制 · 把重复活变成工具</Badge>

            <h1 className="mt-4 text-2xl font-bold leading-tight tracking-tight text-ink sm:text-3xl lg:text-4xl">
              把你每天重复两小时的外贸流程，<br className="hidden sm:block" />做成一个专属工具
            </h1>

            <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
              不做大而全的软件。从报价、制单、跟单中的一个具体问题开始，先梳理流程，再做成团队打开就能使用的工具。
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button size="lg" onClick={() => setWechatOpen(true)}>
                <MessageCircle className="h-4 w-4" />
                免费梳理一次流程
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/">
                  先体验现有工具
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          {/* 右栏：结果示例，让首屏直接看到「做成之后长什么样」 */}
          <Card className="overflow-hidden p-0">
            <div className="flex items-center gap-2 border-b border-line bg-brand-50/60 px-5 py-3">
              <Workflow className="h-4 w-4 text-brand-600" />
              <span className="text-xs font-semibold text-brand-700">改造前 / 改造后（示例）</span>
            </div>
            <div className="grid grid-cols-2 divide-x divide-line">
              <div className="p-4">
                <p className="text-xs font-medium text-slate-400">改造前</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">每天 2 小时手工对格式、算汇率、记跟进，出错靠返工</p>
              </div>
              <div className="p-4">
                <p className="text-xs font-medium text-brand-600">改造后</p>
                <p className="mt-2 text-sm leading-6 text-ink">一套资料可以持续复用到报价、单据和跟进流程</p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* ───────── 2. 三个痛点与结果 ───────── */}
      <section className="py-9 lg:py-12">
        <div className="mx-auto max-w-shell px-5 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold text-brand-600">最耗时间的环节，就是最该做成工具的地方</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">三个常见痛点，对应的结果</h2>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PAIN_POINTS.map((pp, i) => {
              const Icon = pp.icon
              return (
                <Reveal key={pp.pain} delay={i * 80} as="article">
                  <Card className="flex h-full flex-col p-4 transition-[transform,box-shadow,border-color] duration-fast hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-3 font-semibold text-ink">{pp.pain}</h3>
                    <p className="mt-2 text-sm font-medium text-brand-700">→ {pp.result}</p>
                  </Card>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ───────── 3. 三类服务 ───────── */}
      <section className="border-y border-line/70 bg-slate-50/50 py-9 lg:py-12">
        <div className="mx-auto max-w-shell px-5 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold text-brand-600">按要解决的具体问题报价</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">三类服务</h2>
            <p className="mt-3 text-slate-600">不卖大系统，只解决你最重复、最容易出错的那件事。</p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((s, i) => {
              const Icon = s.icon
              return (
                <Reveal key={s.title} delay={i * 80} as="article">
                  <Card className="flex h-full flex-col p-4 transition-[transform,box-shadow,border-color] duration-fast hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-3 font-semibold text-ink">{s.title}</h3>

                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-ink">{s.price}</span>
                      {s.unit && <span className="text-sm text-slate-500">{s.unit}</span>}
                    </div>

                    <p className="mt-3 text-sm leading-relaxed text-slate-600">{s.desc}</p>

                    {s.note ? (
                      <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                        {s.note}
                      </p>
                    ) : null}
                  </Card>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ───────── 4. 合作过程 ───────── */}
      <section className="py-9 lg:py-12">
        <div className="mx-auto max-w-shell px-5 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold text-brand-600">一步一步来，不跳步</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">合作过程</h2>
          </div>

          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PROCESS.map((step, i) => (
              <li key={step}>
                <Card className="flex h-full items-start gap-3 p-4">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-medium text-ink">{step}</p>
                    {i === 1 ? <p className="mt-1 text-xs text-slate-500">需求和边界聊清楚，再谈报价</p> : null}
                  </div>
                </Card>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ───────── 5. 最终 CTA ───────── */}
      <section className="pb-10">
        <div className="mx-auto max-w-shell px-5 lg:px-8">
          <Card className="overflow-hidden bg-brand-600 p-6 text-center text-white sm:p-10">
            <h2 className="text-xl font-bold sm:text-3xl">不用先想清楚要做什么系统</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-white/85">
              只需要告诉我：你和团队每天最重复、最容易出错的工作是什么。
            </p>
            <div className="mt-6 flex justify-center">
              <Button
                size="lg"
                variant="secondary"
                onClick={() => setWechatOpen(true)}
              >
                <MessageCircle className="h-4 w-4" />
                微信发送我的问题
              </Button>
            </div>
          </Card>
        </div>
      </section>

      <WeChatModal open={wechatOpen} onClose={() => setWechatOpen(false)} />
    </main>
  )
}
