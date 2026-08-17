export class HttpError extends Error {
  constructor(status, code, message) {
    super(message)
    this.status = status
    this.code = code
  }
}

export function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'cache-control': 'no-store',
      'content-type': 'application/json; charset=utf-8',
      ...headers,
    },
  })
}

export function emptyResponse(status = 204, headers = {}) {
  return new Response(null, {
    status,
    headers: { 'cache-control': 'no-store', ...headers },
  })
}

export async function readJson(request) {
  try {
    const value = await request.json()
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected an object')
    return value
  } catch {
    throw new HttpError(400, 'INVALID_JSON', '请求内容格式错误')
  }
}

export function requireSameOrigin(request) {
  // Trust the Host header (set by EdgeOne to the public domain) instead of
  // request.url, whose origin can be an internal address at the edge.
  const host = request.headers.get('host')
  if (!host) return // no host context; cannot validate, fall through
  const origin = request.headers.get('origin')
  if (origin) {
    let originHost
    try {
      originHost = new URL(origin).host
    } catch {
      throw new HttpError(403, 'INVALID_ORIGIN', '请求来源无效，请刷新页面后重试')
    }
    if (originHost !== host) {
      throw new HttpError(403, 'INVALID_ORIGIN', '请求来源无效，请刷新页面后重试')
    }
    return
  }
  // Fallback: check Referer host when Origin is absent (browsers sometimes omit Origin for same-origin requests)
  const referer = request.headers.get('referer')
  if (referer) {
    let refererHost
    try {
      refererHost = new URL(referer).host
    } catch {
      throw new HttpError(403, 'INVALID_ORIGIN', '请求来源无效，请刷新页面后重试')
    }
    if (refererHost !== host) {
      throw new HttpError(403, 'INVALID_ORIGIN', '请求来源无效，请刷新页面后重试')
    }
  }
  // No Origin nor Referer — allow (same-origin browser requests may omit both)
}

export function errorResponse(error) {
  if (error instanceof HttpError) {
    return jsonResponse({ error: error.code, message: error.message }, error.status)
  }
  return jsonResponse({ error: 'INTERNAL_ERROR', message: '服务暂时不可用，请稍后重试' }, 500)
}
