import { hashToken } from './security.js'

export async function consumeRateLimit({ repository, scope, limit, windowMs, now }) {
  const key = `v1/rate-limits/${hashToken(scope)}.json`
  const current = await repository.getJson(key)
  const nowMs = Date.parse(now)
  const next = !current || Date.parse(current.resetsAt) <= nowMs
    ? { count: 1, resetsAt: new Date(nowMs + windowMs).toISOString() }
    : { count: current.count + 1, resetsAt: current.resetsAt }

  await repository.setJson(key, next)
  return { allowed: next.count <= limit, retryAt: next.resetsAt }
}

export async function checkRateLimit({ repository, scope, limit, now }) {
  const current = await repository.getJson(`v1/rate-limits/${hashToken(scope)}.json`)
  if (!current || Date.parse(current.resetsAt) <= Date.parse(now)) return { allowed: true }
  return { allowed: current.count < limit, retryAt: current.resetsAt }
}
