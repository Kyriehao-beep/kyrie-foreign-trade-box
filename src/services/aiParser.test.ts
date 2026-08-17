import { parseTradeText } from './aiParser'

it('extracts structured fields from the sample Chinese inquiry', async () => {
  const sample = '客户：北辰户外用品有限公司，500个硅胶徽章，单价2.80美元，FOB深圳，见提单副本付清。'
  const result = await parseTradeText(sample, 0)

  expect(result.patch.buyer?.companyName).toBe('北辰户外用品有限公司')
  expect(result.patch.items?.[0]).toMatchObject({ name: '硅胶徽章', quantity: 500, unitPrice: 2.8 })
  expect(result.patch.trade).toMatchObject({ incoterm: 'FOB 深圳', paymentTerm: '见提单副本付清' })
})

it('does not invent fields for unknown text', async () => {
  const result = await parseTradeText('请尽快回复。', 0)

  expect(result.patch.items).toBeUndefined()
  expect(result.reviewFields).toEqual(expect.arrayContaining(['买方公司名称', '产品明细', '贸易条款']))
})
