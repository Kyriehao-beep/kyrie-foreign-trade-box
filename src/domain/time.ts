export interface TradeCity {
  name: string
  region: string
  timeZone: string
}

export const TRADE_CITIES: TradeCity[] = [
  { name: '上海', region: '中国', timeZone: 'Asia/Shanghai' },
  { name: '深圳', region: '中国', timeZone: 'Asia/Shanghai' },
  { name: '迪拜', region: '阿联酋', timeZone: 'Asia/Dubai' },
  { name: '伦敦', region: '英国', timeZone: 'Europe/London' },
  { name: '巴黎', region: '法国', timeZone: 'Europe/Paris' },
  { name: '柏林', region: '德国', timeZone: 'Europe/Berlin' },
  { name: '莫斯科', region: '俄罗斯', timeZone: 'Europe/Moscow' },
  { name: '纽约', region: '美国', timeZone: 'America/New_York' },
  { name: '洛杉矶', region: '美国', timeZone: 'America/Los_Angeles' },
  { name: '芝加哥', region: '美国', timeZone: 'America/Chicago' },
  { name: '多伦多', region: '加拿大', timeZone: 'America/Toronto' },
  { name: '墨西哥城', region: '墨西哥', timeZone: 'America/Mexico_City' },
  { name: '圣保罗', region: '巴西', timeZone: 'America/Sao_Paulo' },
  { name: '东京', region: '日本', timeZone: 'Asia/Tokyo' },
  { name: '首尔', region: '韩国', timeZone: 'Asia/Seoul' },
  { name: '新加坡', region: '新加坡', timeZone: 'Asia/Singapore' },
  { name: '曼谷', region: '泰国', timeZone: 'Asia/Bangkok' },
  { name: '孟买', region: '印度', timeZone: 'Asia/Kolkata' },
  { name: '悉尼', region: '澳大利亚', timeZone: 'Australia/Sydney' },
  { name: '奥克兰', region: '新西兰', timeZone: 'Pacific/Auckland' },
]

export function isBusinessHour(timeZone: string, now = new Date()): boolean {
  const values = getTimeParts(timeZone, now)
  return !['Sat', 'Sun'].includes(values.weekday) && values.hour >= 9 && values.hour < 18
}

export function formatCityTime(timeZone: string, now = new Date()): { time: string; date: string } {
  return {
    time: new Intl.DateTimeFormat('zh-CN', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now),
    date: new Intl.DateTimeFormat('zh-CN', { timeZone, month: '2-digit', day: '2-digit', weekday: 'short' }).format(now),
  }
}

function getTimeParts(timeZone: string, now: Date): { weekday: string; hour: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const weekday = parts.find((part) => part.type === 'weekday')?.value ?? ''
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0)
  return { weekday, hour }
}
