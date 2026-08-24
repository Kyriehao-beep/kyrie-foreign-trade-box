import { Check, Clock3, Moon, Settings2, Sun } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { formatCityTime, isBusinessHour, TRADE_CITIES, type TradeCity } from '../domain/time'

const STORAGE_KEY = 'ktb_worldbar_selection'
const DEFAULT_SELECTION = ['上海', '纽约', '伦敦', '迪拜']

function loadSelection(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SELECTION
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      const valid = parsed.filter((name) => TRADE_CITIES.some((city) => city.name === name))
      if (valid.length >= 2) return valid.slice(0, 5)
    }
  } catch {
    /* ignore malformed storage */
  }
  return DEFAULT_SELECTION
}

export function WorldTimeBar() {
  const location = useLocation()
  if (location.pathname === '/') return null
  return <WorldTimeBarInner />
}

function WorldTimeBarInner() {
  const [now, setNow] = useState(() => new Date())
  const [selection, setSelection] = useState<string[]>(() => loadSelection())
  const [open, setOpen] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!open) return
    function onClick(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  function persist(next: string[]) {
    setSelection(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* storage may be unavailable; keep in-memory state */
    }
  }

  function toggleCity(name: string) {
    if (selection.includes(name)) {
      if (selection.length <= 2) return
      persist(selection.filter((item) => item !== name))
    } else {
      if (selection.length >= 5) return
      persist([...selection, name])
    }
  }

  const cities = selection
    .map((name) => TRADE_CITIES.find((city) => city.name === name))
    .filter((city): city is TradeCity => Boolean(city))

  return (
    <div className="border-b border-emerald-950/10 bg-brand-600 print:hidden">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-2 lg:px-8">
        <span className="hidden shrink-0 items-center gap-1.5 text-xs font-medium text-white/80 sm:flex">
          <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />世界时间
        </span>
        <div className="flex flex-1 items-center gap-2 overflow-x-auto" aria-label="已选地区当前时间">
          {cities.map((city) => {
            const current = formatCityTime(city.timeZone, now)
            const working = isBusinessHour(city.timeZone, now)
            return (
              <div key={city.name} className="flex shrink-0 items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-white">
                <span className="text-xs text-white/70">{city.name}</span>
                <span className="text-sm font-semibold tabular-nums">{current.time}</span>
                {working
                  ? <Sun className="h-3 w-3 text-amber-200" aria-label="工作时间" />
                  : <Moon className="h-3 w-3 text-slate-300" aria-label="非工作时间" />}
              </div>
            )
          })}
        </div>
        <div className="relative shrink-0" ref={settingsRef}>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label="选择显示的国家或地区时间"
            aria-expanded={open}
            className="flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white transition hover:bg-white/25"
          >
            <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />设置
          </button>
          {open ? (
            <div className="absolute right-0 top-full z-50 mt-2 max-h-80 w-72 overflow-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
              <p className="mb-2 px-1 text-xs font-semibold text-slate-700">选择 2–5 个地区（已选 {selection.length}/5）</p>
              <div className="grid grid-cols-2 gap-1.5">
                {TRADE_CITIES.map((city) => {
                  const active = selection.includes(city.name)
                  const disabled = !active && selection.length >= 5
                  return (
                    <button
                      key={city.name}
                      type="button"
                      disabled={disabled}
                      onClick={() => toggleCity(city.name)}
                      className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left text-xs transition ${active ? 'border-brand-400 bg-brand-50 text-brand-700' : disabled ? 'border-slate-100 bg-slate-50 text-slate-300' : 'border-slate-200 text-slate-600 hover:border-brand-200'}`}
                    >
                      <span className={`grid h-4 w-4 place-items-center rounded border ${active ? 'border-brand-500 bg-brand-600 text-white' : 'border-slate-300'}`}>{active ? <Check className="h-3 w-3" /> : null}</span>
                      {city.name}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
