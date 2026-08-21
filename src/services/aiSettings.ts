// AI 识别服务配置：用户自带 Key（BYOK），仅存于本机浏览器，零后端。
// 所有内置服务商均已实测支持浏览器跨域（CORS）直连，无需代理。

export interface AiProvider {
  id: string
  label: string
  /** OpenAI 兼容的 base URL（到 /v1 为止） */
  baseUrl: string
  defaultModel: string
  /** 给用户看的低成本/免费额度说明 */
  hint: string
  jsonMode: boolean
}

export const AI_PROVIDERS: readonly AiProvider[] = [
  {
    id: 'siliconflow',
    label: '硅基流动 SiliconFlow（推荐·中文友好·有免费额度）',
    baseUrl: 'https://api.siliconflow.cn/v1',
    defaultModel: 'Qwen/Qwen2.5-7B-Instruct',
    hint: '注册即送免费额度，支持 Qwen / DeepSeek / GLM 等模型，浏览器可直接调用。',
    jsonMode: true,
  },
  {
    id: 'deepseek',
    label: 'DeepSeek（极便宜·中文强）',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    hint: '约 ¥10 充值可用很久，单价极低；浏览器可直连。',
    jsonMode: true,
  },
  {
    id: 'openrouter',
    label: 'OpenRouter（多免费模型·国际）',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'meta-llama/llama-3.1-8b-instruct:free',
    hint: '提供多个免费模型，无需信用卡；适合英文资料。',
    jsonMode: true,
  },
  {
    id: 'moonshot',
    label: 'Moonshot 月之暗面 Kimi（中文·有免费额度）',
    baseUrl: 'https://api.moonshot.cn/v1',
    defaultModel: 'moonshot-v1-8k',
    hint: '注册送免费额度，中文能力强。',
    jsonMode: true,
  },
  {
    id: 'custom',
    label: '自定义 OpenAI 兼容服务',
    baseUrl: '',
    defaultModel: '',
    hint: '填入任意 OpenAI 兼容的 base URL（到 /v1 为止）与模型名。',
    jsonMode: true,
  },
]

export interface AiConfig {
  providerId: string
  apiKey: string
  model: string
  /** 仅自定义服务商需要 */
  baseUrl?: string
}

const STORAGE_KEY = 'ktb_ai_config'

export function getProvider(id: string): AiProvider | undefined {
  return AI_PROVIDERS.find((provider) => provider.id === id)
}

export function loadAiConfig(): AiConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<AiConfig>
    if (!parsed.providerId || !parsed.apiKey) return null
    const provider = getProvider(parsed.providerId)
    return {
      providerId: parsed.providerId,
      apiKey: parsed.apiKey,
      model: parsed.model || provider?.defaultModel || '',
      baseUrl: parsed.providerId === 'custom' ? parsed.baseUrl || '' : provider?.baseUrl,
    }
  } catch {
    return null
  }
}

export function saveAiConfig(config: AiConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

export function clearAiConfig(): void {
  localStorage.removeItem(STORAGE_KEY)
}
