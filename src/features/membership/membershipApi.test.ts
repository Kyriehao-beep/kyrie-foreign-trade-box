import { membershipApi } from './membershipApi'

afterEach(() => vi.restoreAllMocks())

it('rejects a successful response that is not a membership snapshot', async () => {
  vi.spyOn(window, 'fetch').mockResolvedValue(new Response('<!doctype html>', {
    status: 200,
    headers: { 'content-type': 'text/html' },
  }))

  await expect(membershipApi.me()).rejects.toThrow('服务器返回的数据格式无效')
})
