import { createLineItem, type LineItem, type Party, type TradeTerms } from '../domain/documents'

export interface ParseResult {
  patch: {
    buyer?: Partial<Party>
    seller?: Partial<Party>
    items?: LineItem[]
    trade?: Partial<TradeTerms>
  }
  reviewFields: string[]
  summary: string
}

const SAMPLE_COMPANY = /客户[：:]\s*([^，,。\n]+)/
const SAMPLE_PRODUCT = /(\d+)\s*(?:个|件|套|箱)\s*([^，,。\n]+?)(?:，|,|。)/
const SAMPLE_PRICE = /单价\s*([\d.]+)\s*(美元|人民币|欧元|英镑)?/

export async function parseTradeText(text: string, delayMs = 700): Promise<ParseResult> {
  await delay(delayMs)
  const company = text.match(SAMPLE_COMPANY)?.[1]?.trim()
  const product = text.match(SAMPLE_PRODUCT)
  const price = text.match(SAMPLE_PRICE)
  const hasIncoterm = /FOB\s*深圳/i.test(text)
  const hasPayment = text.includes('见提单副本付清')

  const patch: ParseResult['patch'] = {}
  if (company) patch.buyer = { companyName: company }
  if (product && price) {
    patch.items = [
      {
        ...createLineItem(),
        quantity: Number(product[1]),
        name: product[2].trim(),
        unitPrice: Number(price[1]),
        unit: '件',
      },
    ]
  }
  if (hasIncoterm || hasPayment) {
    patch.trade = {
      ...(hasIncoterm ? { incoterm: 'FOB 深圳' } : {}),
      ...(hasPayment ? { paymentTerm: '见提单副本付清' } : {}),
      ...(price?.[2] ? { currency: price[2] } : {}),
    }
  }

  const reviewFields = [
    ...(company ? [] : ['买方公司名称']),
    ...(patch.items ? [] : ['产品明细']),
    ...(patch.trade ? [] : ['贸易条款']),
    '买方地址',
    '目的港',
  ]

  return {
    patch,
    reviewFields,
    summary: Object.keys(patch).length > 0 ? '已识别可用信息，请核对标记字段。' : '未发现足够明确的信息，请继续手工填写。',
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, milliseconds))
}
