// 会员/后台 API 选择器：根据是否配置后端（VITE_API_BASE）决定用本地实现还是后端实现。
// 本地模式：纯 localStorage，SPA 零后端即可运行（免费试用演示）。
// 后端模式：客户账号与会员校验全部走 Cloudflare Worker，站长后台服务端鉴权。
import { membershipApi } from './membershipApi'
import { adminApi } from './adminApi'
import { backendMembershipApi } from './backendMembershipApi'
import { backendAdminApi } from './backendAdminApi'
import { isBackendEnabled } from '../../services/apiClient'

export function getMembershipApi() {
  return isBackendEnabled() ? backendMembershipApi : membershipApi
}

export function getAdminApi() {
  return isBackendEnabled() ? backendAdminApi : adminApi
}
