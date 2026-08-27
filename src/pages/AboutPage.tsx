import { MessageCircle, Wrench, Globe, Rocket, Heart, CheckCircle2, ArrowRight, Sparkles, TrendingUp, Clock, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'

/* ── 企业定制服务项（降本增效，销售导向）──────────── */
const SERVICES = [
  {
    num: '01',
    price: '¥99',
    unit: '起',
    icon: <Wrench className="h-5 w-5" />,
    title: '单据 / 流程定制',
    desc: '把你的报价模型、单据格式、客户档案做成专属小工具，浏览器打开即用，交付源码。',
    badge: '最热门',
  },
  {
    num: '02',
    price: '¥199',
    unit: '起',
    icon: <TrendingUp className="h-5 w-5" />,
    title: '企业私有工具工作台',
    desc: '一整套私有工具（报价 / 跟单 / 库存 / 客户档案），团队共享，数据留本司设备，不依赖外部 SaaS。',
    badge: '降本增效',
  },
  {
    num: '03',
    price: '面议',
    unit: '',
    icon: <Rocket className="h-5 w-5" />,
    title: '企业数字化顾问',
    desc: '先聊你最头疼的环节，给落地方案与报价。小步快跑、交付即用，后续还能迭代。',
    badge: '按需',
  },
  {
    num: '04',
    price: '免费',
    unit: '',
    icon: <Globe className="h-5 w-5" />,
    title: '工具箱使用咨询',
    desc: '已上线全部功能（单据 / 跟单 / 报价 / 汇率 / 时间）有任何问题或新功能建议，随时聊。能做的马上做，不藏着掖着。',
    badge: '随时欢迎',
  },
]

/* ── 痛点→解决方案 映射 ───────────────────────────── */
const PAIN_POINTS = [
  {
    icon: <Clock className="h-6 w-6" />,
    pain: '每天花 2 小时在"复制粘贴、对格式、算汇率"',
    solution: '单据模板 + 报价助手 + 汇率换算，自动化搞定',
  },
  {
    icon: <TrendingUp className="h-6 w-6" />,
    pain: '客户跟进靠记事本，忘了跟丢单',
    solution: '跟单助手：优先级 / 紧急度 / 时间线 / 业务建议，不再漏掉任何一个',
  },
  {
    icon: <Zap className="h-6 w-6" />,
    pain: '时区换算来回查，报价算错丢面子',
    solution: '世界时间栏常驻顶部 + 汇率实时换算 + 报价计算器，一秒出结果',
  },
  {
    icon: <Sparkles className="h-6 w-6" />,
    pain: '客户资料和产品明细散落在 Excel / 微信 / 记事本里，做单时到处找',
    solution: '买卖方资料模板 + 产品明细复用，一次录入，所有单据自动带出',
  },
]

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      {/* ════════ Hero 主区域 ════════ */}
      <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
        {/* —— 左侧：主文案 —— */}
        <section>
          {/* 标签 */}
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-4 py-1 text-sm font-semibold text-emerald-700">
            <Sparkles className="h-4 w-4" />
            做过外贸的人，才懂外贸人的痛
          </div>

          <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl">
            让工具替你干重复活
            <br />
            把时间留给真正的成交
          </h1>

          <p className="mt-4 text-lg font-medium text-brand-700">
            不是卖软件，是帮你把每天最耗时间的环节，变成"打开就用"的小工具
          </p>

          <p className="mt-4 leading-relaxed text-slate-600">
            我自己就是做外贸出身的。我知道你每天有多少时间花在这些事情上：
          </p>

          {/* 痛点列表 */}
          <div className="mt-5 space-y-4">
            {PAIN_POINTS.map((pp) => (
              <div key={pp.pain} className="flex gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  {pp.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{pp.pain}</p>
                  <p className="mt-0.5 text-sm text-brand-700">→ {pp.solution}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-5 leading-relaxed text-slate-600">
            这个工具箱就是我把自己踩过的坑、写过的模板、总结的流程，
            全部做成了<strong>打开浏览器就能用</strong>的小工具。
            数据存你自己设备上，<strong>免费试用 1 个月，之后 ¥9.9/月订阅这个工作台</strong>，不绑卡、不自动扣费。
          </p>

          {/* CTA 组 */}
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-brand-700"
            >
              <Zap className="h-4 w-4" />
              免费使用工具箱
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <MessageCircle className="h-4 w-4" />
              有定制需求？聊聊
            </Link>
          </div>
        </section>

        {/* —— 右侧：信服力卡片 —— */}
        <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:mt-4">
          <div className="mb-3">
            <span className="inline-block rounded-full bg-emerald-50 px-3 py-0.5 text-xs font-semibold text-emerald-700">
              先看成果
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">这个网站本身就是证明</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            我不是在卖 PPT 方案。你现在看到的这个工具箱——从单据生成到跟单管理、
            从报价计算到世界时区——每一行代码都是我在实际外贸工作中踩过坑后，
            一个个做出来给自己用的。<strong>能帮到我，就能帮到你。</strong>
          </p>

          <ul className="mt-4 space-y-2.5">
            {[
              '6 类外贸单据（报价单 / PI / 发票 / 装箱单 / 合同 / 报关单）',
              '跟单助手（优先级 / 紧急度 / 时间线 / 业务建议剧本）',
              '报价助手 + 实时汇率 + 世界时区栏',
              'PDF 与 Excel 一键导出，买卖方资料模板复用',
              '纯前端运行，数据存你的浏览器，隐私零风险',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-5 rounded-lg bg-slate-50 p-3 text-center text-xs text-slate-500">
            <Heart className="mr-1 inline h-3.5 w-3.5 text-rose-400" />
            纯个人开发 · 持续迭代中 · 欢迎提需求
          </div>
        </aside>
      </div>

      {/* ════════ 服务定价卡 ════════ */}
      <section className="mt-16">
        <div className="text-center">
          <span className="inline-block rounded-full bg-amber-50 px-4 py-1 text-sm font-semibold text-amber-700">
            <Rocket className="mr-1 inline h-4 w-4" />
            企业定制 · 降本增效
          </span>
          <h2 className="mt-3 text-2xl font-bold text-slate-900">
            企业想要专属工具？我帮你量身定制
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-slate-600">
            帮老板把每天最重复的活交给工具——省人、省时、省成本。
            告诉我你最头疼的那个环节，我把它做成专用工具，不搞大系统，就解决那一个问题。
          </p>
          <p className="mx-auto mt-3 text-xs font-medium text-amber-700">
            以下为企业定制服务，按项目单独报价，与上方工作台订阅（¥9.9/月 · ¥99/年 · ¥199 买断）<strong>互不相干、不随订阅赠送</strong>。
          </p>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {SERVICES.map((s) => (
            <div
              key={s.num}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              {s.badge && (
                <span className="absolute right-3 top-3 rounded-full bg-brand-50 px-2.5 py-0.5 text-[10px] font-bold text-brand-700">
                  {s.badge}
                </span>
              )}
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  {s.icon}
                </div>
                <span className="text-xs font-semibold text-slate-400">{s.num}</span>
              </div>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-slate-900">{s.price}</span>
                {s.unit && <span className="text-sm text-slate-500">{s.unit}</span>}
              </div>

              <h3 className="mt-2 font-semibold text-slate-900">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.desc}</p>

              <Link
                to="/contact"
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800"
              >
                立即咨询 <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ════════ 底部信任闭环 ════════ */}
      <section className="mt-12 grid gap-6 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-xl">🔒</div>
          <h3 className="mt-3 font-semibold text-slate-900">数据不上传</h3>
          <p className="mt-1 text-sm text-slate-500">所有数据存你本地浏览器，我不看、不存、不传。</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-xl">⚡</div>
          <h3 className="mt-3 font-semibold text-slate-900">先免费试用 1 个月</h3>
          <p className="mt-1 text-sm text-slate-500">免费试用 1 个月，所有功能开放，满意再考虑订阅或定制。</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-xl">🤝</div>
          <h3 className="mt-3 font-semibold text-slate-900">做不了会直说</h3>
          <p className="mt-1 text-sm text-slate-500">不画大饼、不推销不需要的东西。能做的承诺，做不到的不接。</p>
        </div>
      </section>

      {/* ════════ 最终 CTA ════════ */}
      <section className="mt-12 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 p-10 text-center text-white">
        <h2 className="text-2xl font-bold">现在就开始，把时间省下来做更重要的事</h2>
        <p className="mx-auto mt-3 max-w-xl text-slate-300">
          不管你是想先用免费工具箱，还是有定制需求想聊聊——都在这里。
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-6 py-3 text-sm font-bold text-white shadow hover:bg-brand-600"
          >
            免费试用工具箱 →
          </Link>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/20"
          >
            <MessageCircle className="h-4 w-4" />
            加微信聊聊
          </Link>
        </div>
      </section>
    </div>
  )
}
