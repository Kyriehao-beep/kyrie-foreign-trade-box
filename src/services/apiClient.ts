// 后端 API 客户端（零依赖）。
// 后端态由构建注入的 VITE_API_BASE 决定：有值 → 走 Cloudflare Worker 后端；
// 无值 → 前端退回本地 localStorage 模式（SPA 照常可用，Worker 上线后启用后端校验）。

const TOKEN_KEY = 'ktb_auth_token' // 客户登录 token
const ADMIN_TOKEN_KEY = 'ktb_admin_token' // 站长后台 token
const OVERRIDE_KEY = 'ktb_api_base_override' // 本地联调/测试用运行时覆盖

function readEnvBase(): string {
  const fromEnv = (import.meta.env as Record<string, unknown>).VITE_API_BASE
  return typeof fromEnv === 'string' ? fromEnv.trim() : ''
}

/** 后端基地址（运行时不带尾斜杠）。 */
export function getApiBase(): string {
  try {
    const override = localStorage.getItem(OVERRIDE_KEY)
    if (override && override.trim()) return override.trim().replace(/\/$/, '')
  } catch {
    /* ignore */
  }
  return readEnvBase().replace(/\/$/, '')
}

/** 是否启用后端校验（配了 VITE_API_BASE 即为 true）。 */
export function isBackendEnabled(): boolean {
  return getApiBase() !== ''
}

export function getToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) || ''
  } catch {
    return ''
  }
}
export function setToken(t: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, t)
  } catch {
    /* ignore */
  }
}
export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

export function getAdminToken(): string {
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY) || ''
  } catch {
    return ''
  }
}
export function setAdminToken(t: string): void {
  try {
    localStorage.setItem(ADMIN_TOKEN_KEY, t)
  } catch {
    /* ignore */
  }
}
export function clearAdminToken(): void {
  try {
    localStorage.removeItem(ADMIN_TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

export interface ApiError extends Error {
  code: string
  status: number
}

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  /** 是否附带鉴权 token（默认 true）。设为 false 用于登录/注册等免鉴权接口 */
  auth?: boolean
  /** 使用站长后台 token 而非客户 token */
  admin?: boolean
}

/**
 * 统一请求封装：
 * - 自动附加 Bearer token（客户或站长）
 * - 非 2xx 抛出带 code/message 的错误
 * - 后端未启用时直接抛 no_backend，供上层降级
 */
export async function apiFetch<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const base = getApiBase()
  if (!base) {
    const err = new Error('后端未启用') as ApiError
    err.code = 'no_backend'
    err.status = 0
    throw err
  }
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (options.auth !== false) {
    const token = options.admin ? getAdminToken() : getToken()
    if (token) headers['Authorization'] = 'Bearer ' + token
  }
  const res = await fetch(base + path, {
    method: options.method || 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })
  let data: unknown = null
  try {
    data = await res.json()
  } catch {
    /* 无响应体 */
  }
  if (!res.ok) {
    const obj = (data ?? {}) as { error?: string; message?: string }
    const err = new Error(obj.message || `请求失败（${res.status}）`) as ApiError
    err.code = obj.error || 'error'
    err.status = res.status
    throw err
  }
  return data as T
}
