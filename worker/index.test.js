// @vitest-environment node

import { describe, expect, it } from 'vitest'

import worker from './index.js'

describe('static site worker', () => {
  it('serves index.html when the site root is requested', async () => {
    const requestedPaths = []
    const env = {
      ASSETS: {
        async fetch(request) {
          const path = new URL(request.url).pathname
          requestedPaths.push(path)

          if (path === '/index.html') {
            return new Response('<main>Kyrie的外贸盒子</main>', { status: 200 })
          }

          return new Response('未找到页面', { status: 404 })
        },
      },
    }

    const response = await worker.fetch(new Request('https://example.com/'), env)

    expect(response.status).toBe(200)
    expect(await response.text()).toContain('Kyrie的外贸盒子')
    expect(requestedPaths).toEqual(['/', '/index.html'])
  })
})
