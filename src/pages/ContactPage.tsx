import { ArrowRight, CheckCircle2, Mail, MessageCircle, Sparkles, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { WECHAT_QR_BASE64 } from '../assets/qrCodes'
import { PRICING_SUMMARY } from '../features/membership/staticConfig'
import { AccessibleModal } from '../components/ui/AccessibleModal'
import { Button } from '../components/ui/button'

/* ── 联系信息（真实数据）──────────────────────────── */
const CONTACT = {
  wechatName: 'Kyrie',
  wechatNote: '（**阳）· 中国香港',
  email: '821625826@qq.com',
}

const SCOPE = [
  '单据与报价规则定制',
  '企业轻量工作台',
  '外贸流程自动化',
  'AI 流程定制与成本评估',
]

export default function ContactPage() {
  const [qrOpen, setQrOpen] = useState(false)

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      {/* ════════ Hero ════════ */}
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-4 py-1 text-sm font-semibold text-brand-700">
          <Sparkles className="h-4 w-4" />
          聊聊你的外贸流程
        </span>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          聊聊你最想简化的外贸流程
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-slate-600">
          无论是公司单据格式、报价规则，还是团队跟单流程，只需要告诉我你现在最重复、最容易出错的环节。
        </p>
      </div>

      {/* ════════ 主内容：微信（主）+ 邮箱（次）════════ */}
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">微信（推荐）</h2>
              <p className="text-sm text-slate-500">{CONTACT.wechatName} {CONTACT.wechatNote}</p>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            最顺手的沟通方式，支持文字、语音、图片与文件。把最耗时间的环节发我，我们先免费梳理一次。
          </p>
          <Button type="button" size="lg" className="mt-4 w-full" onClick={() => setQrOpen(true)}>
            微信发送我的问题
          </Button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">邮箱</h2>
              <a href={`mailto:${CONTACT.email}`} className="text-sm text-brand-700 hover:underline">
                {CONTACT.email}
              </a>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            适合发送详细需求文档、截图说明或非紧急事项。看到后会尽快回复。
          </p>
          <Button asChild variant="outline" size="lg" className="mt-4 w-full">
            <a href={`mailto:${CONTACT.email}`}>发邮件给我</a>
          </Button>
        </div>
      </div>

      {/* ════════ 服务范围 ════════ */}
      <div className="mt-10 rounded-2xl bg-slate-900 p-6 text-white">
        <h3 className="font-bold">我能帮你做什么</h3>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {SCOPE.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-slate-300">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* ════════ 底部 CTA ════════ */}
      <div className="mt-10 rounded-2xl bg-gradient-to-r from-brand-600 to-emerald-600 p-8 text-center text-white">
        <h2 className="text-xl font-bold">还没想好？先去试试工具箱</h2>
        <p className="mt-2 text-sm text-white/80">
          {PRICING_SUMMARY.trial}，六类单据 + 跟单助手 + 报价计算，全部打开浏览器就能用，{PRICING_SUMMARY.noAutoCharge}。
        </p>
        <Link
          to="/"
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-2.5 text-sm font-semibold text-brand-700 shadow hover:bg-slate-50"
        >
          先体验现有工具
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* ════════ 微信二维码弹窗（点击后显示）════════ */}
      <AccessibleModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        labelledBy="contact-qr-title"
        className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-pop"
      >
        <div className="flex items-start justify-between">
          <h2 id="contact-qr-title" className="text-lg font-bold text-ink">扫码加微信</h2>
          <button
            type="button"
            onClick={() => setQrOpen(false)}
            aria-label="关闭"
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 transition-colors duration-fast hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          添加好友时备注：公司或产品 + 想解决的问题，我会优先了解你的需求。
        </p>
        <div className="mt-4 rounded-xl border border-line bg-slate-50/60 p-4 text-center">
          <img
            src={WECHAT_QR_BASE64}
            alt="微信二维码"
            width={208}
            height={208}
            className="mx-auto h-52 w-52 rounded-lg object-contain"
          />
        </div>
        <p className="mt-3 text-center text-sm font-medium text-ink">
          微信：{CONTACT.wechatName} {CONTACT.wechatNote}
        </p>
      </AccessibleModal>
    </div>
  )
}
