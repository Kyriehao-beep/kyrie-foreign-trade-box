import { Clock3, Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Badge } from '../../components/ui/badge'
import { Card } from '../../components/ui/card'
import { formatCityTime, isBusinessHour, TRADE_CITIES } from '../../domain/time'

export function WorldClockPanel() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <section>
      <div className="flex items-end justify-between gap-4"><div><p className="text-sm font-semibold text-brand-600">世界时间</p><h2 className="mt-1 text-2xl font-semibold">客户现在方便联系吗？</h2></div><Clock3 className="h-6 w-6 text-slate-400" /></div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{TRADE_CITIES.map((city) => { const current = formatCityTime(city.timeZone, now); const working = isBusinessHour(city.timeZone, now); return <Card key={city.name} className="p-4 shadow-none"><div className="flex items-start justify-between"><div><p className="text-sm font-semibold">{city.name}</p><p className="text-xs text-slate-400">{city.region}</p></div><Badge className={working ? '' : 'bg-slate-100 text-slate-500'}>{working ? <Sun className="mr-1 h-3 w-3" /> : <Moon className="mr-1 h-3 w-3" />}{working ? '工作时间' : '非工作时间'}</Badge></div><p className="mt-5 text-2xl font-semibold tabular-nums">{current.time}</p><p className="mt-1 text-xs text-slate-500">{current.date}</p></Card> })}</div>
    </section>
  )
}
