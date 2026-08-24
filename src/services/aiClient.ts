// 极简 OpenAI 兼容客户端：调用站点统一代理（密钥在服务端，前端零密钥）。
//
// 代理约定（见 worker/ai-proxy.js）：
//   前端 POST { system, user }
//   代理返回 { content: "..." } 或 OpenAI 兼容 { choices: [{ message: { content } }] }

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
  config: { endpoint: string },
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const endpoint = config.endpoint.trim()
  if (!endpoint) throw new AiCallError('no_config', 'AI 代理未配置，请联系站长开启。')

  let res: Response
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system: systemPrompt, user: userPrompt }),
      // 不携带 cookie；代理地址由站长配置，密钥在服务端
      credentials: 'omit',
    })
  } catch (reason) {
    if (reason instanceof TypeError) {
      throw new AiCallError('network', '网络或跨域(CORS)错误：无法连接 AI 代理服务，请稍后重试。')
    }
    throw new AiCallError('network', '请求失败，请检查网络后重试。')
  }

  if (res.status === 401) throw new AiCallError('auth', 'AI 代理鉴权失败，请检查代理配置。')
  if (res.status === 429) throw new AiCallError('rate_limit', 'AI 调用频率或额度超限，请稍后重试。')
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null
    const detail = body?.error || body?.message
    throw new AiCallError('bad_response', detail ? `AI 代理返回错误：${detail}` : `AI 代理返回错误（${res.status}）。`)
  }

  const data = (await res.json().catch(() => null)) as
    | { content?: string; choices?: { message?: { content?: string } }[] }
    | null
  const text = data?.content || data?.choices?.[0]?.message?.content || ''
  if (!text) throw new AiCallError('bad_response', 'AI 代理未返回有效内容，请重试。')
  return text
}
