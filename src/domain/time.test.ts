import { isBusinessHour, TRADE_CITIES } from './time'

it('includes twenty major foreign-trade cities', () => {
  expect(TRADE_CITIES).toHaveLength(20)
  expect(TRADE_CITIES.map((city) => city.name)).toEqual(expect.arrayContaining(['上海', '迪拜', '伦敦', '纽约', '洛杉矶', '东京', '新加坡', '悉尼']))
})

it('marks a Shanghai weekday morning as business hours', () => {
  expect(isBusinessHour('Asia/Shanghai', new Date('2026-08-17T02:00:00.000Z'))).toBe(true)
})

it('marks a Shanghai weekend as non-working hours', () => {
  expect(isBusinessHour('Asia/Shanghai', new Date('2026-08-16T02:00:00.000Z'))).toBe(false)
})
