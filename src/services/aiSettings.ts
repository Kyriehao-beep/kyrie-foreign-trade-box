// AI 识别统一走站点代理：密钥由站长持有并存于代理服务端（环境变量），
// 前端只保存一个代理地址（endpoint），绝不接触任何 API Key。
// 这样终端用户打开就能用、零配置，也不需要懂 API。
//
// 代理地址优先级：管理员后台运行时设置（localStorage） > 构建时注入的环境变量 VITE_AI_PROXY_ENDPOINT。

export interface AiConfig {
  endpoint: string
}

const STORAGE_KEY = 'ktb_ai_endpoint'

function readEnvEndpoint(): string {
  try {
    const env = import.meta.env as Record<string, string | undefined>
    const value = env.VITE_AI_PROXY_ENDPOINT
    return typeof value === 'string' ? value.trim() : ''
  } catch {
    return ''
  }
}

export function getAiEndpoint(): string {
  try {
    const local = localStorage.getItem(STORAGE_KEY)
    if (local && local.trim()) return local.trim()
  } catch {
    /* ignore */
  }
  return readEnvEndpoint()
}

export function saveAiEndpoint(endpoint: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, endpoint.trim())
  } catch {
    /* ignore */
  }
}

export function clearAiEndpoint(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function loadAiConfig(): AiConfig | null {
  const endpoint = getAiEndpoint()
  return endpoint ? { endpoint } : null
}
