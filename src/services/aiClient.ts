// 极简 OpenAI 兼容客户端：浏览器直接调用，零后端。
// 调用方负责传入已配置好的 AiConfig（来自 aiSettings）。

import { type AiConfig, getProvider } from './aiSettings'

export type AiErrorCode = 'auth' | 'rate_limit' | 'network' | 'bad_response' | 'no_config'

export class AiCallError extends Error {
  code: AiErrorCode
  constructor(code: AiErrorCode, message: string) {
    super(message)
    this.code = code
    this.name = 'AiCallError'
  }
}

export async function callChatCompletion(
  config: AiConfig,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const provider = getProvider(config.providerId)
  const baseUrl = config.providerId === 'custom' ? config.baseUrl : provider?.baseUrl
  if (!baseUrl) throw new AiCallError('bad_response', '未配置有效的 API 地址，请检查服务商选择。')
  if (!config.apiKey) throw new AiCallError('no_config', '缺少 API Key。')
  if (!config.model) throw new AiCallError('bad_response', '未配置模型名称。')

  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`
  const body: Record<string, unknown> = {
    model: config.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.1,
  }
  if (provider?.jsonMode ?? true) {
    body.response_format = { type: 'json_object' }
  }

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
      // 不携带 cookie，密钥仅通过 Authorization 头发送
      credentials: 'omit',
    })
  } catch (reason) {
    if (reason instanceof TypeError) {
      throw new AiCallError(
        'network',
        '网络或跨域(CORS)错误：该服务可能不支持浏览器直接调用，或当前网络不可达。',
      )
    }
    throw new AiCallError('network', '请求失败，请检查网络后重试。')
  }

  if (res.status === 401) throw new AiCallError('auth', 'API Key 无效或权限不足，请检查密钥。')
  if (res.status === 429) throw new AiCallError('rate_limit', '调用频率或额度超限，请稍后重试或检查账户余额。')
  if (!res.ok) throw new AiCallError('bad_response', `服务返回错误（${res.status}），请确认模型名与地址。`)

  const data = (await res.json().catch(() => null)) as
    | { choices?: { message?: { content?: string } }[] }
    | null
  const text = data?.choices?.[0]?.message?.content
  if (!text) throw new AiCallError('bad_response', '接口未返回有效内容，请重试。')
  return text
}
