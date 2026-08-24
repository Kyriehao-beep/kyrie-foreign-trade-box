// Cloudflare Worker：AI 识别代理
// 作用：把前端的识别请求转发到你自己的 AI 服务（OpenAI 兼容 chat/completions），
//      密钥 AI_PROVIDER_KEY 存于 Worker 环境变量，绝不下发到前端。
//
// 前端约定：POST { system: string, user: string }
// 本代理返回：{ content: string } 或 { error: string }（带对应状态码）
//
// 配置（Cloudflare 控制台「Workers → 设置 → 变量」或 wrangler）：
//   AI_PROVIDER_URL   例如 https://api.deepseek.com/v1
//   AI_PROVIDER_KEY   你的 API Key（保密，用 secret 配置）
//   AI_MODEL          例如 deepseek-chat（可选）
//   CORS_ORIGIN       允许调用的前端域名，逗号分隔，例如 https://kyriehao-beep.github.io
//                    强烈建议设置，避免代理被他人盗用。

const DEFAULT_MODEL = 'deepseek-chat'

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin')
  const allowed = (env.CORS_ORIGIN || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const headers = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
  if (origin && allowed.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
  }
  return headers
}

function json(data, status, request, env) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(request, env) },
  })
}

export default {
  async fetch(request, env) {
    const headers = corsHeaders(request, env)

    // 预检请求（浏览器跨域 POST 前的 OPTIONS）
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers })
    }

    // 健康检查：便于你确认代理在线
    const url = new URL(request.url)
    if (request.method === 'GET' && url.pathname === '/health') {
      return json({ ok: true }, 200, request, env)
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method Not Allowed' }, 405, request, env)
    }

    // 输入校验：信任来自客户端的任何内容
    let payload
    try {
      payload = await request.json()
    } catch {
      return json({ error: '请求体不是合法 JSON' }, 400, request, env)
    }
    const system = typeof payload.system === 'string' ? payload.system : ''
    const user = typeof payload.user === 'string' ? payload.user : ''
    if (!user.trim()) {
      return json({ error: '缺少 user 字段' }, 400, request, env)
    }

    const apiKey = env.AI_PROVIDER_KEY
    const apiUrl = env.AI_PROVIDER_URL
    const model = env.AI_MODEL || DEFAULT_MODEL
    if (!apiKey || !apiUrl) {
      return json({ error: '代理未配置：缺少 AI_PROVIDER_KEY 或 AI_PROVIDER_URL' }, 500, request, env)
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
        return json({ error: `上游错误 ${upstream.status}: ${text.slice(0, 200)}` }, status, request, env)
      }

      const data = await upstream.json()
      const content = data?.choices?.[0]?.message?.content || ''
      if (!content) {
        return json({ error: '上游未返回有效内容' }, 502, request, env)
      }
      return json({ content }, 200, request, env)
    } catch {
      return json({ error: '代理请求上游失败，请稍后重试' }, 502, request, env)
    }
  },
}
