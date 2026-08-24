import { Box, Calculator, Container, ExternalLink, PackageSearch, ShipWheel } from 'lucide-react'
import { Card } from '../../components/ui/card'

const tools = [
  { icon: ShipWheel, name: '常用贸易术语', note: '快速查看常见责任与费用边界', href: 'https://iccwbo.org/business-solutions/incoterms-rules/' },
  { icon: PackageSearch, name: 'HS 编码查询', note: '前往海关公共查询服务核对编码', href: 'http://online.customs.gov.cn/' },
  { icon: Container, name: '集装箱尺寸参考', note: '查看常用柜型装载尺寸提示', href: 'https://www.maersk.com/support/faqs/container-dimensions' },
  { icon: Box, name: '国际快递查询', note: '前往通用物流轨迹查询入口', href: 'https://www.17track.net/zh-cn' },
  { icon: Calculator, name: '外贸报价计算器', note: '算清 FOB/CIF 报价、利润与退税', href: '/toolbox' },
]

export function ToolShortcuts() {
  return <section className="mt-14"><p className="text-sm font-semibold text-brand-600">常用入口</p><h2 className="mt-1 text-2xl font-semibold">少找网页，直接开始</h2><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{tools.map(({ icon: Icon, ...tool }) => <a key={tool.name} href={tool.href} target={tool.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="group"><Card className="h-full p-4 shadow-none transition group-hover:-translate-y-1 group-hover:border-brand-200 group-hover:shadow-soft"><div className="flex items-center justify-between"><Icon className="h-5 w-5 text-brand-600" /><ExternalLink className="h-3.5 w-3.5 text-slate-300" /></div><h3 className="mt-7 font-semibold">{tool.name}</h3><p className="mt-2 text-xs leading-5 text-slate-500">{tool.note}</p>{tool.href.startsWith('http') ? <p className="mt-3 text-[10px] text-slate-400">将打开第三方网站</p> : null}</Card></a>)}</div></section>
}
