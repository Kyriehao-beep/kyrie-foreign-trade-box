import { Workbook } from 'exceljs'
import { createEmptyDraft } from '../../../domain/documents'
import { buildExcelWorkbook } from './buildExcelWorkbook'
import { buildExcelDocumentLayout } from './excelLayout'

it('creates exactly one formal quotation worksheet', () => {
  const draft = createEmptyDraft('QT')
  draft.seller.companyName = 'Kyrie公司'
  draft.buyer.companyName = '北辰户外用品有限公司'

  const workbook = buildExcelWorkbook(draft, new Workbook())
  const sheet = workbook.worksheets[0]

  expect(workbook.worksheets).toHaveLength(1)
  expect(sheet.name).toBe('报价单')
  expect(sheet.getCell('A1').value).toBe('Kyrie公司')
  expect(sheet.getCell('A2').value).toBe('报价单')
  expect(sheet.getCell('A1').fill).toMatchObject({ type: 'pattern', fgColor: { argb: 'FF124E41' } })
  expect(sheet.views[0]).toMatchObject({ showGridLines: false })
})

it('writes editable formulas with cached results and A4 print settings', () => {
  const draft = createEmptyDraft('QT')
  draft.items[0] = { ...draft.items[0], name: '硅胶徽章', quantity: 500, unitPrice: 2.8 }

  const workbook = buildExcelWorkbook(draft, new Workbook())
  const sheet = workbook.worksheets[0]

  expect(sheet.getCell('I11').value).toEqual({ formula: 'F11*H11', result: 1400 })
  expect(sheet.getCell('I12').value).toEqual({ formula: 'SUM(I11:I11)', result: 1400 })
  expect(sheet.pageSetup).toMatchObject({
    paperSize: 9,
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
  })
  expect(sheet.pageSetup.printArea).toMatch(/^A1:J\d+$/)
  expect(sheet.pageSetup.printTitlesRow).toBe('10:10')
})

it.each([
  ['QT', '报价有效期'],
  ['PI', '银行信息'],
  ['SC', '买方签章'],
  ['CI', '清关与收款资料'],
  ['PL', '总体积'],
  ['CD', '申报要素'],
] as const)('writes the %s type-specific content', (type, text) => {
  const workbook = buildExcelWorkbook(createEmptyDraft(type), new Workbook())
  expect(JSON.stringify(workbook.worksheets[0].getSheetValues())).toContain(text)
})

it.each([
  ['zh', 'modern', '报价单', 'FF124E41'],
  ['en', 'classic', 'QUOTATION', 'FF27312F'],
  ['bilingual', 'minimal', 'QUOTATION / 报价单', 'FFFFFFFF'],
] as const)('renders %s language with %s style', (language, layout, title, brandColor) => {
  const draft = createEmptyDraft('QT')
  draft.language = language
  draft.layout = layout

  const workbook = buildExcelWorkbook(draft, new Workbook())
  const sheet = workbook.worksheets[0]

  expect(sheet.getCell('A2').value).toBe(title)
  expect(sheet.getCell('A1').fill).toMatchObject({ type: 'pattern', fgColor: { argb: brandColor } })
})

it('serializes and reloads the formal worksheet', async () => {
  const workbook = buildExcelWorkbook(createEmptyDraft('PI'), new Workbook())
  const bytes = await workbook.xlsx.writeBuffer()
  const reloaded = new Workbook()
  await reloaded.xlsx.load(bytes)

  expect(reloaded.worksheets).toHaveLength(1)
  expect(reloaded.worksheets[0].name).toBe('形式发票')
  expect(reloaded.worksheets[0].getCell('A2').value).toBe('形式发票')
})

it('writes reusable party fields and complete PI shipping details', () => {
  const draft = createEmptyDraft('PI')
  draft.seller.country = '中国'
  draft.seller.taxId = '91440101TEST'
  draft.trade.portOfLoading = '深圳'
  draft.trade.portOfDestination = '洛杉矶'
  draft.settlement.transportMode = '海运'
  draft.settlement.bankAddress = '广州市天河区银行路 88 号'

  const workbook = buildExcelWorkbook(draft, new Workbook())
  const values = JSON.stringify(workbook.worksheets[0].getSheetValues())

  expect(values).toContain('国家或地区')
  expect(values).toContain('91440101TEST')
  expect(values).toContain('装运港')
  expect(values).toContain('目的港')
  expect(values).toContain('运输方式')
  expect(values).toContain('银行地址')
})

it('expands product and remarks rows instead of clipping long text', () => {
  const draft = createEmptyDraft('CD')
  draft.items[0].declarationElements = '品牌类型；材质；用途；规格；型号；'.repeat(18)
  draft.notes = '报关备注与补充说明'.repeat(30)

  const workbook = buildExcelWorkbook(draft, new Workbook())
  const sheet = workbook.worksheets[0]
  const layout = buildExcelDocumentLayout(draft)

  expect(sheet.getRow(layout.firstItemRow).height).toBeGreaterThan(30)
  expect(sheet.getRow(layout.lastContentRow).height).toBeGreaterThan(24)
})

it('writes complete CI payment details', () => {
  const draft = createEmptyDraft('CI')
  draft.settlement.accountName = '广州凯瑞进出口有限公司'
  draft.settlement.bankAddress = '广州市天河区银行路 88 号'
  draft.settlement.swift = 'KRYECN22'

  const workbook = buildExcelWorkbook(draft, new Workbook())
  const values = JSON.stringify(workbook.worksheets[0].getSheetValues())

  expect(values).toContain('账户名称')
  expect(values).toContain('银行地址')
  expect(values).toContain('SWIFT')
})
