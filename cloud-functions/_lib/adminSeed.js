import { hashPassword } from './security.js'
import { markFreshUserPartitions, normalizeUsername, userKey } from './authService.js'

const BOOTSTRAP_PASSWORD_MS = 7 * 24 * 60 * 60 * 1000

export async function seedAdmins({ repository, env, now, uuid }) {
  for (let index = 1; index <= 3; index += 1) {
    const username = env[`ADMIN_${index}_USERNAME`]
    const password = env[`ADMIN_${index}_PASSWORD`]
    const displayName = env[`ADMIN_${index}_DISPLAY_NAME`]
    if (!username || !password) continue

    const usernameNormalized = normalizeUsername(username)
    const key = userKey(usernameNormalized)
    if (await repository.getJson(key)) continue

    const admin = {
      id: uuid(),
      username: username.trim(),
      usernameNormalized,
      displayName: displayName?.trim() || `管理员${index}`,
      contact: '',
      passwordHash: await hashPassword(password),
      role: 'admin',
      status: 'active',
      passwordResetRequired: true,
      temporaryPasswordExpiresAt: new Date(Date.parse(now()) + BOOTSTRAP_PASSWORD_MS).toISOString(),
      createdAt: now(),
      trialEndsAt: null,
    }

    try {
      await repository.setJson(key, admin, { onlyIfNew: true })
    } catch (error) {
      if (error?.code !== 'ALREADY_EXISTS') throw error
      continue
    }
    try {
      await markFreshUserPartitions(repository, admin.id, admin.createdAt)
    } catch {
      // Partition markers are an optimization; entitlement reads remain correct without them.
    }
  }
}
