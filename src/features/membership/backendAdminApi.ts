// 后端版站长后台 API：服务端真实鉴权（密码走 Worker 环境变量，不进前端）。
// 与本地 adminApi（解锁码）不同，这里按用户名直接发放/吊销会员，更干净也不可伪造。
import { apiFetch, getAdminToken, setAdminToken, clearAdminToken } from '../../services/apiClient'

export interface AdminMemberRow {
  username: string
  plan: string | null
  status: string
  createdAt: string
  memberUntil: number | null
  hasAccess: boolean
  phase: string
  orders: number
}

interface AdminAuthResponse {
  token: string
  admin: { username: string }
}

export const backendAdminApi = {
  /** 站长登录（服务端校验），成功写入 admin token。 */
  async login(input: { username: string; password: string }): Promise<boolean> {
    try {
      const data = await apiFetch<AdminAuthResponse>('/api/admin/login', {
        method: 'POST',
        body: input,
        auth: false,
      })
      setAdminToken(data.token)
      return true
    } catch {
      return false
    }
  },
  /** 是否已登录（用 admin token 探测会员列表接口）。 */
  async isLoggedIn(): Promise<boolean> {
    if (!getAdminToken()) return false
    try {
      await apiFetch('/api/admin/members', { auth: true, admin: true })
      return true
    } catch {
      return false
    }
  },
  logout(): void {
    clearAdminToken()
  },
  async listMembers(): Promise<AdminMemberRow[]> {
    const data = await apiFetch<{ members: AdminMemberRow[] }>('/api/admin/members', {
      auth: true,
      admin: true,
    })
    return data.members
  },
  async grant(input: { username: string; plan: string; days?: number }): Promise<void> {
    await apiFetch('/api/admin/grant', { method: 'POST', body: input, auth: true, admin: true })
  },
  async revoke(username: string): Promise<void> {
    await apiFetch('/api/admin/revoke', { method: 'POST', body: { username }, auth: true, admin: true })
  },
}
