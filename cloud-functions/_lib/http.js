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
  const expected = new URL(request.url).origin
  if (request.headers.get('origin') !== expected) {
    throw new HttpError(403, 'INVALID_ORIGIN', '请求来源无效，请刷新页面后重试')
  }
}

export function errorResponse(error) {
  if (error instanceof HttpError) {
    return jsonResponse({ error: error.code, message: error.message }, error.status)
  }
  return jsonResponse({ error: 'INTERNAL_ERROR', message: '服务暂时不可用，请稍后重试' }, 500)
}
