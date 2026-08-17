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

// ---------------------------------------------------------------------------
// Step 1: generate a precise extraction prompt the user sends to their own
// free LLM (Doubao / Kimi / DeepSeek web). Zero backend, zero key exposure.
// ---------------------------------------------------------------------------
const FIELD_GUIDE = `请从中提取下列字段（没有就省略该字段，不要编造）：
- buyer.companyName 买方公司名
- buyer.contact 买方联系人
- buyer.address 买方地址
- buyer.country 买方国家
- buyer.email / buyer.phone 联系方式
- seller.companyName 卖方公司名（若提及）
- items[] 产品明细，每项含 name 品名、specification 规格、quantity 数量(数字)、unit 单位(如 件/套/箱/个)、unitPrice 单价(数字)、currency 币种(如 美元/USD)
- trade.incoterm 贸易术语(如 FOB 深圳 / CIF 纽约)
- trade.paymentTerm 付款方式(如 见提单副本付清 / T/T 30%定金)
- trade.portOfDestination 目的港
- trade.portOfLoading 起运港
- trade.deliveryTime 交货期
- trade.currency 结算币种`

export function buildExtractionPrompt(source: string): string {
  return [
    '你是外贸制单助手。下面是一段外贸资料或客户询盘。',
    '只输出一个 JSON 对象，不要任何解释、前后缀或 markdown 代码块标记。',
    'JSON 结构如下：',
    '{',
    '  "buyer": { "companyName": "", "contact": "", "address": "", "country": "", "email": "", "phone": "" },',
    '  "seller": { "companyName": "" },',
    '  "items": [ { "name": "", "specification": "", "quantity": 0, "unit": "件", "unitPrice": 0, "currency": "美元" } ],',
    '  "trade": { "incoterm": "", "paymentTerm": "", "portOfLoading": "", "portOfDestination": "", "deliveryTime": "", "currency": "美元" }',
    '}',
    FIELD_GUIDE,
    '',
    '=== 待提取资料 ===',
    source.trim(),
  ].join('\n')
}

// ---------------------------------------------------------------------------
// Step 2: parse the LLM's returned text (may contain prose + JSON) into a
// ParseResult the form can apply. Falls back to a light local regex when the
// user pastes plain Chinese text instead of JSON.
// ---------------------------------------------------------------------------
function extractJsonObject(text: string): Record<string, unknown> | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced ? fenced[1] : text
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as Record<string, unknown>
  } catch {
    return null
  }
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value)
}

function num(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(String(value ?? '').replace(/[, ]/g, ''))
  return Number.isFinite(n) ? n : 0
}

function mapParty(raw: unknown): Partial<Party> | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const o = raw as Record<string, unknown>
  const party: Partial<Party> = {}
  for (const key of ['companyName', 'address', 'contact', 'phone', 'email', 'taxId', 'country'] as const) {
    const v = str(o[key])
    if (v) party[key] = v
  }
  return Object.keys(party).length ? party : undefined
}

function mapItems(raw: unknown): LineItem[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined
  const items: LineItem[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const o = entry as Record<string, unknown>
    const name = str(o.name)
    if (!name) continue
    const item = createLineItem()
    item.name = name
    item.specification = str(o.specification)
    item.quantity = num(o.quantity)
    item.unit = str(o.unit) || '件'
    item.unitPrice = num(o.unitPrice)
    items.push(item)
  }
  return items.length ? items : undefined
}

function mapTrade(raw: unknown): Partial<TradeTerms> | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const o = raw as Record<string, unknown>
  const trade: Partial<TradeTerms> = {}
  for (const key of ['country', 'incoterm', 'paymentTerm', 'currency', 'deliveryTime', 'portOfLoading', 'portOfDestination', 'validity'] as const) {
    const v = str(o[key])
    if (v) trade[key] = v
  }
  return Object.keys(trade).length ? trade : undefined
}

const SAMPLE_COMPANY = /客户[：:]\s*([^，,。\n]+)/
const SAMPLE_PRODUCT = /(\d+)\s*(?:个|件|套|箱)\s*([^，,。\n]+?)(?:，|,|。)/
const SAMPLE_PRICE = /单价\s*([\d.]+)\s*(美元|人民币|欧元|英镑)?/

// Robust entry point: try LLM JSON first, fall back to local regex stub.
export async function parseTradeText(text: string, delayMs = 0): Promise<ParseResult> {
  if (delayMs > 0) await new Promise((resolve) => globalThis.setTimeout(resolve, delayMs))

  const source = text.trim()
  const json = extractJsonObject(source)
  if (json) return fromJson(json)

  const company = source.match(SAMPLE_COMPANY)?.[1]?.trim()
  const product = source.match(SAMPLE_PRODUCT)
  const price = source.match(SAMPLE_PRICE)
  const hasIncoterm = /FOB\s*深圳/i.test(source)
  const hasPayment = source.includes('见提单副本付清')

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

  return finalize(patch, Object.keys(patch).length > 0 ? '已用本地规则识别少量信息，建议改用 AI 提示词获取完整字段。' : '未发现足够明确的信息，请用上方「生成提示词」发给 AI 后粘贴结果。')
}

function fromJson(json: Record<string, unknown>): ParseResult {
  const patch: ParseResult['patch'] = {}
  const buyer = mapParty(json.buyer)
  const seller = mapParty(json.seller)
  const items = mapItems(json.items)
  const trade = mapTrade(json.trade)
  if (buyer) patch.buyer = buyer
  if (seller) patch.seller = seller
  if (items) patch.items = items
  if (trade) patch.trade = trade
  return finalize(patch, '已识别 AI 返回的信息，请核对标记字段。')
}

function finalize(patch: ParseResult['patch'], summary: string): ParseResult {
  const reviewFields: string[] = []
  if (!patch.buyer?.companyName) reviewFields.push('买方公司名称')
  if (!patch.items?.length) reviewFields.push('产品明细')
  if (!patch.trade?.incoterm && !patch.trade?.paymentTerm) reviewFields.push('贸易条款')
  if (!patch.buyer?.address) reviewFields.push('买方地址')
  if (!patch.trade?.portOfDestination) reviewFields.push('目的港')
  return { patch, reviewFields, summary }
}

// Dedicated entry for the pasteback flow: require a JSON result from the user's
// own LLM. Throws a clear message when no JSON can be found, so the UI can tell
// the user to paste the AI's JSON output (not free text).
export function parseLLMResult(text: string): ParseResult {
  const json = extractJsonObject(text.trim())
  if (!json) throw new Error('没有在内容中找到 JSON，请确认粘贴的是 AI 返回的 JSON 结果（可包含解释文字）。')
  return fromJson(json)
}
