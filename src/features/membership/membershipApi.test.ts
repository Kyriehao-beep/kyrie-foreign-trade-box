import { membershipApi, redeemCode } from './membershipApi'
import { PLANS, TRIAL_DAYS } from './staticConfig'
import { newCode } from './codes'

beforeEach(() => window.localStorage.clear())

it('starts the trial on the first visit and keeps the same deadline afterwards', async () => {
  const first = await membershipApi.me()
  expect(first.entitlement.phase).toBe('trialing')
  expect(first.entitlement.hasAccess).toBe(true)

  const deadline = Date.parse(first.entitlement.trialEndsAt!)
  expect(deadline - Date.now()).toBeGreaterThan((TRIAL_DAYS - 1) * 86_400_000)
  expect(deadline - Date.now()).toBeLessThanOrEqual(TRIAL_DAYS * 86_400_000)

  const second = await membershipApi.me()
  expect(second.entitlement.trialEndsAt).toBe(first.entitlement.trialEndsAt)
})

it('reports the approved plans from the single source of truth', async () => {
  await expect(membershipApi.getPlans()).resolves.toEqual(PLANS)
})

it('registers an account and rejects a wrong password on the next login', async () => {
  await membershipApi.register({ username: 'buyer_one', password: 'password88', contact: 'wx-888' })
  await expect(membershipApi.login({ username: 'buyer_one', password: 'password88' })).resolves.toMatchObject({
    user: { username: 'buyer_one', contact: 'wx-888' },
  })
  await expect(membershipApi.login({ username: 'buyer_one', password: 'wrong-one' })).rejects.toThrow('用户名或密码错误')
})

it('refuses to log in before an account exists', async () => {
  await expect(membershipApi.login({ username: 'nobody', password: 'password88' })).rejects.toThrow('账号不存在，请先注册')
})

it('grants lifetime access without an expiry when a buyout code is redeemed', async () => {
  const code = newCode('lifetime')
  await expect(redeemCode(code)).resolves.toEqual({ plan: 'lifetime' })

  const snapshot = await membershipApi.me()
  expect(snapshot.entitlement.phase).toBe('active_lifetime')
  expect(snapshot.entitlement.expiresAt).toBeNull()
  expect(snapshot.entitlement.hasAccess).toBe(true)
})

it('rejects a tampered unlock code', async () => {
  await expect(redeemCode('KTB-NOT-A-REAL-CODE')).rejects.toThrow('解锁码无效，请检查后重试')
})
