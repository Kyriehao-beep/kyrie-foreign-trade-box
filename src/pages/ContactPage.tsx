import { Mail, Phone, MessageCircle, QrCode, Heart, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { WECHAT_QR_BASE64, WECHAT_PAY_BASE64 } from '../assets/qrCodes'

/* ── 联系信息（真实数据）──────────────────────────── */
const CONTACT = {
  wechatName: 'Kyrie',
  wechatNote: '(**阳) · 中国香港',
  email: '821625826@qq.com',
  phone: '13713149025',
}

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      {/* ════════ Hero ════════ */}
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-4 py-1 text-sm font-semibold text-brand-700">
          <Sparkles className="h-4 w-4" />
          找到对的人，问题就解决了一半
        </span>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          联系我，聊聊你的需求
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-slate-600">
          无论是工具使用问题、定制需求、还是单纯想聊聊外贸数字化——微信随时在线，看到就会回。
        </p>
      </div>

      {/* ════════ 主内容：联系方式 + 二维码 ════════ */}
      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_300px]">
        {/* —— 左侧：联系渠道 —— */}
        <div className="space-y-6">
          {/* 微信（主 CTA） */}
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
              扫右侧二维码添加好友，或搜索微信号。响应最快，沟通最方便——支持文字/语音/图片/文件，
              外贸人最熟悉的沟通方式。
            </p>
          </div>

          {/* 邮箱 */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">邮箱</h2>
                <a
                  href={`mailto:${CONTACT.email}`}
                  className="text-sm text-brand-700 hover:underline"
                >
                  {CONTACT.email}
                </a>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              适合发详细需求文档、截图说明、或非紧急事项。24 小时内回复。
            </p>
          </div>

          {CONTACT.phone ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900">电话</h2>
                  <a href={`tel:${CONTACT.phone}`} className="text-sm text-brand-700 hover:underline">
                    {CONTACT.phone}
                  </a>
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-600">工作日 9:00–18:00，紧急事项可直拨。</p>
            </div>
          ) : null}

          {/* 我能帮你做什么（信任铺垫） */}
          <div className="rounded-2xl bg-slate-900 p-6 text-white">
            <h3 className="font-bold">不只是客服，我是做外贸的工具人</h3>
            <ul className="mt-3 space-y-2">
              {[
                '工具箱功能咨询 / 使用指导 / Bug 反馈',
                '企业定制需求评估（单据格式 / AI 规则 / 私有工具）',
                '外贸流程数字化建议（不推销，只给适合你的方案）',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-slate-300">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* —— 右侧：二维码区 —— */}
        <aside className="space-y-5">
          {/* 微信联系人 */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">微信扫码加好友</p>
            <img
              src={WECHAT_QR_BASE64}
              alt="微信二维码 - Kyrie"
              className="mx-auto mt-3 h-56 w-56 rounded-lg object-contain"
            />
            <p className="mt-2 text-xs text-slate-500">扫一扫，添加我为微信好友</p>
          </div>

          {/* 微信收款码 */}
          <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
              <Heart className="mr-1 inline h-3.5 w-3.5" />
              打赏支持（可选）
            </p>
            <img
              src={WECHAT_PAY_BASE64}
              alt="微信收款码 - Kyrie"
              className="mx-auto mt-3 h-56 w-56 rounded-lg object-contain"
            />
            <p className="mt-2 text-xs text-emerald-700">觉得好用？请我喝杯咖啡 ☕</p>
          </div>
        </aside>
      </div>

      {/* ════════ 底部 CTA ════════ */}
      <div className="mt-12 rounded-2xl bg-gradient-to-r from-brand-600 to-emerald-600 p-8 text-center text-white">
        <h2 className="text-xl font-bold">还没想好？先去试试工具箱</h2>
        <p className="mt-2 text-sm text-white/80">
          15 天免费试用，6 类单据 + AI 识别 + 跟单助手 + 报价计算，全部打开浏览器就能用。
        </p>
        <Link
          to="/"
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-2.5 text-sm font-semibold text-brand-700 shadow hover:bg-slate-50"
        >
          去试试工具箱 <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
