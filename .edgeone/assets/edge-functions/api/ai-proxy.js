// EdgeOne Edge Function：AI 识别代理（同域，国内可达）
// 前端约定：POST { system: string, user: string }
// 本函数转发到 DeepSeek chat/completions，返回 { content } 或 { error }
//
// 密钥优先取 EdgeOne 环境变量（站长在控制台设置），缺失时回退到下方 FALLBACK_KEY（路线②）。
// 前端始终零密钥。
//   AI_PROVIDER_URL   例如 https://api.deepseek.com/v1
//   AI_PROVIDER_KEY   你的 DeepSeek API Key（保密，env 优先）
//   AI_MODEL          例如 deepseek-chat（可选）
//
// 路由：/api/ai-proxy  →  POST 识别 / GET /health 健康检查
// 同域调用无需 CORS，但保留宽松 CORS 以便站长日后换域。

const DEFAULT_MODEL = 'deepseek-chat'
const DEFAULT_API_URL = 'https://api.deepseek.com/v1'
// 路线②兜底：站长在控制台/env 未配置 Key 时启用（由用户在 AI 会话提供）。
// 注意：此值会进入部署产物；终端用户前端仍零密钥，但平台侧可见。
// 若日后走"自持账号控制台配 Key"（路线③），env 优先于此兜底值。
const FALLBACK_KEY = 'sk-106c3e5691ff4c088d87bd5dec1445ea'

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export default async function onRequest(context) {
  const { request, env } = context

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204 })
  }

  const url = new URL(request.url)
  if (request.method === 'GET' && url.pathname.endsWith('/health')) {
    return json({ ok: true }, 200)
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method Not Allowed' }, 405)
  }

  let payload
  try {
    payload = await request.json()
  } catch {
    return json({ error: '请求体不是合法 JSON' }, 400)
  }
  const system = typeof payload.system === 'string' ? payload.system : ''
  const user = typeof payload.user === 'string' ? payload.user : ''
  if (!user.trim()) {
    return json({ error: '缺少 user 字段' }, 400)
  }

  const apiKey = env.AI_PROVIDER_KEY || FALLBACK_KEY
  const apiUrl = env.AI_PROVIDER_URL || DEFAULT_API_URL
  const model = env.AI_MODEL || DEFAULT_MODEL
  if (!apiKey || !apiUrl) {
    return json(
      { error: '代理未配置：站长尚未在 EdgeOne 控制台设置 AI_PROVIDER_KEY / AI_PROVIDER_URL' },
      500,
    )
  }

  try {
    const upstream = await fetch(`${apiUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    })

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '')
      const status = upstream.status === 401 ? 401 : 502
      return json({ error: `上游错误 ${upstream.status}: ${text.slice(0, 200)}` }, status)
    }

    const data = await upstream.json()
    const content = data?.choices?.[0]?.message?.content || ''
    if (!content) {
      return json({ error: '上游未返回有效内容' }, 502)
    }
    return json({ content }, 200)
  } catch {
    return json({ error: '代理请求上游失败，请稍后重试' }, 502)
  }
}
