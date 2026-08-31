import { Check, Factory, Users } from 'lucide-react'
import { Button } from '../../components/ui/button'

// 客户开发与供应商寻源 · 定制服务推广段。
// 注意：本段是「定制服务」推广，不是公共工具箱功能；不实现任何真实搜索 / 抓取 / API / AI。
// 面板使用固定深绿（#0f3a31），内部文字使用固定浅色与白色卡片，确保在亮/暗两种主题下都清晰可读
// （dark.css 只覆盖中性/品牌 token，不会覆盖这里的任意值类与 emerald-* 类）。

const SCENARIO_A_TYPES = ['当地零售店', '经销商', '批发商', '进口商', '品牌商', '工程项目客户']
const SCENARIO_B_TYPES = ['生产工厂', '原材料供应商', '配件供应商', 'OEM / ODM 厂商', '包装供应商', '物流服务商']
const CAPABILITIES = [
  '多国家、多城市搜索路径',
  '中英文与当地语言关键词组合',
  '企业类型分类',
  '重复线索合并',
  '官网与联系方式整理',
  '客户或供应商标签',
  'Excel 线索表导出',
  '对接现有跟单流程',
  '目标企业匹配评分',
  'AI 辅助分析（按需评估）',
]

const SECTION_NOTE =
  '添加好友时备注：产品 + 目标国家 + 想找的企业类型，我会优先了解你的需求。'

export function CustomerSourcingSection({
  onOpenWeChat,
  onScrollToServices,
}: {
  onOpenWeChat: (note: string) => void
  onScrollToServices: () => void
}) {
  return (
    <section className="py-9 lg:py-12">
      <div className="mx-auto max-w-shell px-5 lg:px-8">
        <div className="overflow-hidden rounded-3xl bg-[#0f3a31] p-6 text-white sm:p-9">
          {/* eyebrow + 可见徽标：明确是定制服务、当前不是公共工具 */}
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-semibold text-emerald-300">客户开发与供应商寻源 · 定制服务</p>
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white">
              定制服务 · 当前不是公共工具
            </span>
          </div>

          <h2 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            还在一个个网站里找客户和供应商？
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-emerald-50/90">
            根据你的产品、目标国家和企业类型，定制专属的搜索、整理与筛选工作台。把零散的搜索步骤变成一套可以持续复用的开发流程。
          </p>

          {/* 两个业务场景：桌面并排、移动垂直堆叠 */}
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {/* 场景 A：目标客户开发 */}
            <div className="rounded-2xl bg-white p-5">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-[#0f3a31]" aria-hidden="true" />
                <h3 className="text-lg font-semibold text-[#0f3a31]">目标客户开发</h3>
              </div>
              <p className="mt-2 text-sm leading-6 text-[#374151]">面向出口业务，帮助团队寻找和整理潜在买家。</p>
              <ul className="mt-3 space-y-1.5">
                {SCENARIO_A_TYPES.map((t) => (
                  <li key={t} className="flex items-center gap-2 text-sm text-[#374151]">
                    <Check className="h-4 w-4 shrink-0 text-[#0f3a31]" aria-hidden="true" />
                    {t}
                  </li>
                ))}
              </ul>
              <p className="mt-3 rounded-lg bg-[#f1f5f4] p-3 text-xs leading-5 text-[#4b5563]">
                根据产品关键词、国家、城市与客户类型，设计搜索渠道、线索整理、去重、筛选和跟进流程。
              </p>
            </div>

            {/* 场景 B：供应商与工厂寻源 */}
            <div className="rounded-2xl bg-white p-5">
              <div className="flex items-center gap-2">
                <Factory className="h-5 w-5 text-[#0f3a31]" aria-hidden="true" />
                <h3 className="text-lg font-semibold text-[#0f3a31]">供应商与工厂寻源</h3>
              </div>
              <p className="mt-2 text-sm leading-6 text-[#374151]">面向采购与供应链需求，帮助团队整理潜在工厂和供应商。</p>
              <ul className="mt-3 space-y-1.5">
                {SCENARIO_B_TYPES.map((t) => (
                  <li key={t} className="flex items-center gap-2 text-sm text-[#374151]">
                    <Check className="h-4 w-4 shrink-0 text-[#0f3a31]" aria-hidden="true" />
                    {t}
                  </li>
                ))}
              </ul>
              <p className="mt-3 rounded-lg bg-[#f1f5f4] p-3 text-xs leading-5 text-[#4b5563]">
                根据产品、产地、生产能力与合作要求，设计供应商搜索、对比、核验和询价流程。
              </p>
            </div>
          </div>

          {/* 可定制能力（紧凑标签，移动端自动换行，不进窄多列） */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-emerald-200">可以根据你的业务定制</h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {CAPABILITIES.map((c) => (
                <li key={c} className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-emerald-50">
                  {c}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs leading-5 text-emerald-100/80">
              具体功能取决于数据来源、目标国家和使用方式。涉及第三方数据、API 或 AI 服务时，会提前说明可行性、使用限制和实际成本。
            </p>
          </div>

          {/* 诚实信任声明（无需 tooltip / 弹窗即可见） */}
          <p className="mt-5 rounded-xl border border-white/15 bg-white/5 p-4 text-sm leading-6 text-emerald-50">
            这不是出售现成客户名单，也不承诺‘一键找到所有客户’。我们会先梳理你现在的找客或寻源流程，再确认哪些步骤适合做成工具。
          </p>

          {/* 转化 CTA */}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              type="button"
              size="lg"
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => onOpenWeChat(SECTION_NOTE)}
            >
              免费梳理我的找客流程
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="w-full border-white/30 bg-transparent text-white hover:bg-white/10 sm:w-auto"
              onClick={onScrollToServices}
            >
              看看其他定制服务
            </Button>
          </div>

          <p className="mt-3 text-xs text-emerald-100/70">
            咨询前可以先准备：产品英文名称、目标国家、希望寻找的企业类型，以及目前使用的搜索方式。
          </p>
        </div>
      </div>
    </section>
  )
}
