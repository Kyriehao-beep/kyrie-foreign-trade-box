import { applyConfirmedOrder } from './entitlements.js'

export function confirmedOrderKey(userId, orderId) {
  return `v1/confirmed-orders-by-user/${userId}/${orderId}.json`
}

export async function confirmedForUser(repository, userId) {
  const keys = await repository.list(`v1/confirmed-orders-by-user/${userId}/`)
  const currentEvents = await Promise.all(keys.map((key) => repository.getJson(key)))
  const migrationKey = `v1/migrations/confirmed-orders-by-user/${userId}.json`
  const migrated = await repository.getJson(migrationKey)
  let legacyEvents = []
  if (!migrated) {
    const legacyKeys = await repository.list('v1/confirmed-orders/')
    legacyEvents = (await Promise.all(legacyKeys.map((key) => repository.getJson(key)))).filter((event) => event?.userId === userId)
    await Promise.all(legacyEvents.map(async (event) => {
      try {
        await repository.setJson(confirmedOrderKey(userId, event.orderId), event, { onlyIfNew: true })
      } catch (error) {
        if (error?.code !== 'ALREADY_EXISTS') throw error
      }
    }))
    await repository.setJson(migrationKey, { migratedAt: new Date().toISOString() })
  }
  const byOrderId = new Map([...currentEvents, ...legacyEvents].filter(Boolean).map((event) => [event.orderId, event]))
  const events = [...byOrderId.values()].sort((left, right) => left.confirmedAt.localeCompare(right.confirmedAt))
  const decisionMigrationKey = `v1/migrations/order-decisions-by-user/${userId}.json`
  if (!await repository.getJson(decisionMigrationKey)) {
    await Promise.all(events.map(async (event) => {
      try {
        await repository.setJson(`v1/order-decisions/${event.orderId}.json`, {
          orderId: event.orderId,
          userId: event.userId,
          type: 'confirmed',
          decidedAt: event.confirmedAt,
          decidedBy: event.confirmedBy ?? 'legacy-system',
          decidedByUsername: event.confirmedByUsername ?? '历史管理员',
          adminNote: '',
        }, { onlyIfNew: true })
      } catch (error) {
        if (error?.code !== 'ALREADY_EXISTS') throw error
      }
    }))
    await repository.setJson(decisionMigrationKey, { migratedAt: new Date().toISOString() })
  }
  return events
}

export async function paidEntitlementForUser(repository, userId) {
  const events = await confirmedForUser(repository, userId)
  if (events.length === 0) {
    const legacyCache = await repository.getJson(`v1/entitlements/${userId}.json`)
    if (legacyCache) return legacyCache.paid ?? legacyCache
  }
  return events.reduce(
    (current, event) => applyConfirmedOrder({ current, order: event, confirmedAt: event.confirmedAt }),
    null,
  )
}
