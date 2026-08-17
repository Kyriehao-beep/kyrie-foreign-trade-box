import type { Cell, FillPattern, Workbook, Worksheet } from 'exceljs'
import {
  calculateLineAmount,
  calculateTotals,
  createLineItem,
  type DocumentDraft,
  type LineItem,
} from '../../../domain/documents'
import {
  getDocumentExportDefinition,
  getDocumentExportTitle,
  getExportLabel,
  type ExportColumnKey,
  type LocalizedLabel,
} from '../export/documentExportModel'
import {
  buildExcelDocumentLayout,
  estimateExcelRowHeight,
  type ExcelDocumentLayout,
  type ExcelTableColumn,
} from './excelLayout'

const BORDER_COLOR = 'FF9AADA6'
const TEXT_COLOR = 'FF1F2D29'
const MUTED_COLOR = 'FF63736D'

interface ThemeColors {
  brand: string
  accent: string
  light: string
  brandText: string
}

export function buildExcelWorkbook(draft: DocumentDraft, workbook: Workbook): Workbook {
  const layout = buildExcelDocumentLayout(draft)
  const sheet = workbook.addWorksheet(layout.sheetName, {
    views: [{ showGridLines: false }],
    pageSetup: {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
      printArea: layout.printArea,
      printTitlesRow: `${layout.tableHeaderRow}:${layout.tableHeaderRow}`,
      margins: { left: 0.25, right: 0.25, top: 0.35, bottom: 0.35, header: 0.15, footer: 0.15 },
    },
  })

  workbook.creator = 'Kyrie的外贸盒子'
  workbook.created = new Date()
  workbook.calcProperties.fullCalcOnLoad = true
  sheet.headerFooter.oddFooter = `&C${getExcelPageFooter(draft)}`
  sheet.properties.defaultRowHeight = 20

  setColumnWidths(sheet)
  renderBrandHeader(sheet, draft)
  renderDocumentHeading(sheet, draft)
  renderPartyBlocks(sheet, draft)
  renderProductTable(sheet, draft, layout)
  renderSummary(sheet, draft, layout)
  renderDocumentFooter(sheet, draft, layout)
  return workbook
}

function renderBrandHeader(sheet: Worksheet, draft: DocumentDraft) {
  const theme = themeFor(draft)
  sheet.getRow(1).height = 34
  const cell = mergeAndSet(sheet, 1, 1, 1, 10, draft.seller.companyName || 'Kyrie的外贸盒子')
  styleRange(sheet, 1, 1, 1, 10, {
    fill: solidFill(theme.brand),
    font: { name: 'Microsoft YaHei', size: 18, bold: true, color: { argb: theme.brandText } },
    alignment: { horizontal: 'center', vertical: 'middle' },
  })
  cell.alignment = { horizontal: 'center', vertical: 'middle' }
}

function renderDocumentHeading(sheet: Worksheet, draft: DocumentDraft) {
  const definition = getDocumentExportDefinition(draft.type)
  const theme = themeFor(draft)
  sheet.getRow(2).height = 28
  sheet.getRow(3).height = 20
  sheet.getRow(4).height = 9

  const title = mergeAndSet(sheet, 2, 1, 2, 8, getDocumentExportTitle(definition, draft.language))
  title.font = { name: 'Microsoft YaHei', size: 15, bold: true, color: { argb: theme.accent } }
  title.alignment = { horizontal: 'center', vertical: 'middle' }

  const number = mergeAndSet(sheet, 2, 9, 2, 10, `${label(draft, '单据编号', 'NO.')} ${draft.documentNumber || '--'}`)
  number.font = { name: 'Microsoft YaHei', size: 9, bold: true, color: { argb: TEXT_COLOR } }
  number.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true }

  const date = mergeAndSet(sheet, 3, 9, 3, 10, `${label(draft, '开具日期', 'DATE')} ${draft.issueDate || '--'}`)
  date.font = { name: 'Microsoft YaHei', size: 8, color: { argb: MUTED_COLOR } }
  date.alignment = { horizontal: 'right', vertical: 'middle' }
}

function renderPartyBlocks(sheet: Worksheet, draft: DocumentDraft) {
  renderPartyBlock(sheet, draft, 1, 5, { zh: '卖方资料', en: 'SELLER' }, draft.seller)
  renderPartyBlock(sheet, draft, 6, 10, { zh: '买方资料', en: 'BUYER' }, draft.buyer)
}

function renderPartyBlock(
  sheet: Worksheet,
  draft: DocumentDraft,
  startColumn: number,
  endColumn: number,
  heading: LocalizedLabel,
  party: DocumentDraft['seller'],
) {
  const theme = themeFor(draft)
  const midpoint = startColumn + 2
  sheet.getRow(5).height = 22
  sheet.getRow(6).height = Math.max(sheet.getRow(6).height ?? 0, estimateExcelRowHeight([
    { text: party.companyName, charactersPerLine: 36 },
  ], 24))
  sheet.getRow(7).height = Math.max(sheet.getRow(7).height ?? 0, estimateExcelRowHeight([
    { text: `${party.country} ${party.address}`, charactersPerLine: 36 },
  ], 22))
  sheet.getRow(8).height = Math.max(sheet.getRow(8).height ?? 0, estimateExcelRowHeight([
    { text: party.contact, charactersPerLine: 18 },
    { text: party.phone, charactersPerLine: 18 },
  ], 22))
  sheet.getRow(9).height = Math.max(sheet.getRow(9).height ?? 0, estimateExcelRowHeight([
    { text: party.email, charactersPerLine: 22 },
    { text: party.taxId, charactersPerLine: 18 },
  ], 22))

  mergeAndSet(sheet, 5, startColumn, 5, endColumn, getExportLabel(heading, draft.language))
  mergeAndSet(sheet, 6, startColumn, 6, endColumn, party.companyName || '--')
  mergeAndSet(sheet, 7, startColumn, 7, endColumn, `${label(draft, '国家或地区', 'COUNTRY / REGION')}：${party.country || '--'} · ${label(draft, '地址', 'ADDRESS')}：${party.address || '--'}`)
  mergeAndSet(sheet, 8, startColumn, 8, midpoint, `${label(draft, '联系人', 'CONTACT')}：${party.contact || '--'}`)
  mergeAndSet(sheet, 8, midpoint + 1, 8, endColumn, `${label(draft, '电话', 'PHONE')}：${party.phone || '--'}`)
  mergeAndSet(sheet, 9, startColumn, 9, midpoint, `${label(draft, '邮箱', 'EMAIL')}：${party.email || '--'}`)
  mergeAndSet(sheet, 9, midpoint + 1, 9, endColumn, `${label(draft, '税号', 'TAX ID')}：${party.taxId || '--'}`)

  styleRange(sheet, 5, startColumn, 5, endColumn, {
    fill: solidFill(theme.light),
    font: { name: 'Microsoft YaHei', size: 10, bold: true, color: { argb: theme.accent } },
    alignment: { horizontal: 'left', vertical: 'middle' },
  })
  styleRange(sheet, 6, startColumn, 9, endColumn, {
    font: { name: 'Microsoft YaHei', size: 9, color: { argb: TEXT_COLOR } },
    alignment: { horizontal: 'left', vertical: 'middle', wrapText: true },
  })
  borderRange(sheet, 5, startColumn, 9, endColumn)
}

function renderProductTable(sheet: Worksheet, draft: DocumentDraft, layout: ExcelDocumentLayout) {
  const theme = themeFor(draft)
  const definition = getDocumentExportDefinition(draft.type)
  const definitionColumns = new Map(definition.columns.map((column) => [column.key, column]))
  sheet.getRow(layout.tableHeaderRow).height = 34

  for (const column of layout.tableColumns) {
    const heading = column.key === 'sequence'
      ? '#'
      : getExportLabel(definitionColumns.get(column.key)!.labels, draft.language)
    mergeAndSet(sheet, layout.tableHeaderRow, column.startColumn, layout.tableHeaderRow, column.endColumn, heading)
    styleRange(sheet, layout.tableHeaderRow, column.startColumn, layout.tableHeaderRow, column.endColumn, {
      fill: solidFill(theme.accent),
      font: { name: 'Microsoft YaHei', size: 9, bold: true, color: { argb: 'FFFFFFFF' } },
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    })
  }

  const items = draft.items.length > 0 ? draft.items : [createLineItem()]
  items.forEach((item, index) => renderProductRow(sheet, draft, layout, item, layout.firstItemRow + index, index))
}

function renderProductRow(
  sheet: Worksheet,
  draft: DocumentDraft,
  layout: ExcelDocumentLayout,
  item: LineItem,
  rowNumber: number,
  index: number,
) {
  sheet.getRow(rowNumber).height = estimateExcelRowHeight([
    { text: item.name, charactersPerLine: 22 },
    { text: item.specification, charactersPerLine: 18 },
    { text: item.declarationElements, charactersPerLine: 24 },
  ], 30)
  for (const column of layout.tableColumns) {
    const cell = mergeAndSet(sheet, rowNumber, column.startColumn, rowNumber, column.endColumn, null)
    if (column.key === 'sequence') cell.value = index + 1
    else if (column.key === 'description') cell.value = item.name || '--'
    else if (column.key === 'specification') cell.value = item.specification || '--'
    else if (column.key === 'amount') {
      cell.value = { formula: layout.formulas.itemAmounts[index], result: calculateLineAmount(item) }
    } else {
      cell.value = item[column.key]
    }
    cell.numFmt = column.numberFormat ?? 'General'
    cell.font = { name: 'Microsoft YaHei', size: 9, color: { argb: TEXT_COLOR } }
    cell.alignment = {
      horizontal: numericColumn(column.key) ? 'right' : column.key === 'unit' || column.key === 'hsCode' ? 'center' : 'left',
      vertical: 'middle',
      wrapText: true,
    }
  }
  borderRange(sheet, rowNumber, 1, rowNumber, 10)
}

function renderSummary(sheet: Worksheet, draft: DocumentDraft, layout: ExcelDocumentLayout) {
  const totals = calculateTotals(draft.items)
  const theme = themeFor(draft)
  sheet.getRow(layout.summaryRow).height = 27

  if (draft.type === 'PL') {
    const values: Array<[number, string, string | undefined, number]> = [
      [1, label(draft, '总数量', 'TOTAL QTY'), layout.formulas.quantityTotal, totals.quantity],
      [3, label(draft, '总箱数', 'TOTAL CARTONS'), layout.formulas.cartonsTotal, totals.cartons],
      [5, label(draft, '总净重', 'TOTAL N.W.'), layout.formulas.netWeightTotal, totals.netWeight],
      [7, label(draft, '总毛重', 'TOTAL G.W.'), layout.formulas.grossWeightTotal, totals.grossWeight],
      [9, label(draft, '总体积', 'TOTAL CBM'), layout.formulas.volumeTotal, totals.volume],
    ]
    for (const [column, text, formula, result] of values) {
      sheet.getCell(layout.summaryRow, column).value = text
      sheet.getCell(layout.summaryRow, column + 1).value = { formula: formula!, result }
      sheet.getCell(layout.summaryRow, column + 1).numFmt = '#,##0.00'
    }
  } else if (draft.type === 'CD') {
    mergeAndSet(sheet, layout.summaryRow, 1, layout.summaryRow, 8, label(draft, '总数量', 'TOTAL QTY'))
    const total = mergeAndSet(sheet, layout.summaryRow, 9, layout.summaryRow, 10, null)
    total.value = { formula: layout.formulas.quantityTotal, result: totals.quantity }
    total.numFmt = '#,##0.##'
  } else {
    const amountStart = draft.type === 'CI' ? 8 : 9
    mergeAndSet(sheet, layout.summaryRow, 1, layout.summaryRow, amountStart - 1, label(draft, '合计', 'TOTAL'))
    const total = mergeAndSet(sheet, layout.summaryRow, amountStart, layout.summaryRow, 10, null)
    total.value = { formula: layout.formulas.amountTotal!, result: totals.amount }
    total.numFmt = `"${currencyCode(draft.trade.currency)}" #,##0.00`
  }

  styleRange(sheet, layout.summaryRow, 1, layout.summaryRow, 10, {
    fill: solidFill(theme.light),
    font: { name: 'Microsoft YaHei', size: 10, bold: true, color: { argb: theme.accent } },
    alignment: { horizontal: 'right', vertical: 'middle', wrapText: true },
  })
  borderRange(sheet, layout.summaryRow, 1, layout.summaryRow, 10)
}

function renderDocumentFooter(sheet: Worksheet, draft: DocumentDraft, layout: ExcelDocumentLayout) {
  if (layout.footerKind === 'quotationTerms') {
    renderInfoRows(sheet, draft, layout, { zh: '贸易条款', en: 'TRADE TERMS' }, [
      [{ zh: '报价有效期', en: 'VALIDITY' }, draft.trade.validity],
      [{ zh: '贸易术语', en: 'INCOTERM' }, draft.trade.incoterm],
      [{ zh: '付款方式', en: 'PAYMENT' }, draft.trade.paymentTerm],
      [{ zh: '交期', en: 'DELIVERY' }, draft.trade.deliveryTime],
      [{ zh: '备注', en: 'REMARKS' }, draft.notes],
    ])
    return
  }
  if (layout.footerKind === 'bankInformation') {
    renderInfoRows(sheet, draft, layout, { zh: '银行信息', en: 'BANK INFORMATION' }, [
      [{ zh: '贸易术语', en: 'INCOTERM' }, draft.trade.incoterm],
      [{ zh: '付款方式', en: 'PAYMENT' }, draft.trade.paymentTerm],
      [{ zh: '装运港', en: 'PORT OF LOADING' }, draft.trade.portOfLoading],
      [{ zh: '目的港', en: 'DESTINATION' }, draft.trade.portOfDestination],
      [{ zh: '运输方式', en: 'TRANSPORT' }, draft.settlement.transportMode],
      [{ zh: '开户行', en: 'BANK' }, draft.settlement.bankName],
      [{ zh: '银行地址', en: 'BANK ADDRESS' }, draft.settlement.bankAddress],
      [{ zh: '账户名称', en: 'ACCOUNT NAME' }, draft.settlement.accountName],
      [{ zh: '银行账号', en: 'ACCOUNT NO.' }, draft.settlement.accountNumber],
      [{ zh: 'SWIFT', en: 'SWIFT' }, draft.settlement.swift],
    ])
    return
  }
  if (layout.footerKind === 'signatures') {
    renderInfoRows(sheet, draft, layout, { zh: '合同条款', en: 'CONTRACT TERMS' }, [
      [{ zh: '贸易术语', en: 'INCOTERM' }, draft.trade.incoterm],
      [{ zh: '付款方式', en: 'PAYMENT' }, draft.trade.paymentTerm],
      [{ zh: '交期', en: 'DELIVERY' }, draft.trade.deliveryTime],
      [{ zh: '备注', en: 'REMARKS' }, draft.notes],
    ])
    const signatureStart = layout.footerStartRow + 6
    mergeAndSet(sheet, signatureStart, 1, signatureStart + 2, 5, label(draft, '卖方签章', 'SELLER SIGNATURE'))
    mergeAndSet(sheet, signatureStart, 6, signatureStart + 2, 10, label(draft, '买方签章', 'BUYER SIGNATURE'))
    styleRange(sheet, signatureStart, 1, signatureStart + 2, 10, {
      font: { name: 'Microsoft YaHei', size: 9, bold: true, color: { argb: MUTED_COLOR } },
      alignment: { horizontal: 'left', vertical: 'top' },
    })
    borderRange(sheet, signatureStart, 1, signatureStart + 2, 10)
    return
  }
  if (layout.footerKind === 'customsPayment') {
    renderInfoRows(sheet, draft, layout, { zh: '清关与收款资料', en: 'CUSTOMS & PAYMENT' }, [
      [{ zh: '贸易国', en: 'TRADE COUNTRY' }, draft.trade.country],
      [{ zh: '运输方式', en: 'TRANSPORT' }, draft.settlement.transportMode],
      [{ zh: '装运港', en: 'PORT OF LOADING' }, draft.trade.portOfLoading],
      [{ zh: '目的港', en: 'DESTINATION' }, draft.trade.portOfDestination],
      [{ zh: '开户行', en: 'BANK' }, draft.settlement.bankName],
      [{ zh: '银行地址', en: 'BANK ADDRESS' }, draft.settlement.bankAddress],
      [{ zh: '账户名称', en: 'ACCOUNT NAME' }, draft.settlement.accountName],
      [{ zh: '银行账号', en: 'ACCOUNT NO.' }, draft.settlement.accountNumber],
      [{ zh: 'SWIFT', en: 'SWIFT' }, draft.settlement.swift],
    ])
    return
  }
  if (layout.footerKind === 'packingTotals') {
    renderInfoRows(sheet, draft, layout, { zh: '装箱补充资料', en: 'PACKING DETAILS' }, [
      [{ zh: '唛头', en: 'MARKS' }, draft.settlement.marks],
      [{ zh: '运输方式', en: 'TRANSPORT' }, draft.settlement.transportMode],
      [{ zh: '备注', en: 'REMARKS' }, draft.notes],
    ])
    return
  }
  renderInfoRows(sheet, draft, layout, { zh: '报关资料', en: 'CUSTOMS DETAILS' }, [
    [{ zh: '贸易国', en: 'TRADE COUNTRY' }, draft.trade.country],
    [{ zh: '成交方式', en: 'TRANSACTION' }, draft.trade.incoterm],
    [{ zh: '运输方式', en: 'TRANSPORT' }, draft.settlement.transportMode],
    [{ zh: '报关口岸', en: 'CUSTOMS PORT' }, draft.settlement.customsPort],
    [{ zh: '备注', en: 'REMARKS' }, draft.notes],
  ])
}

function renderInfoRows(
  sheet: Worksheet,
  draft: DocumentDraft,
  layout: ExcelDocumentLayout,
  title: LocalizedLabel,
  rows: Array<[LocalizedLabel, string]>,
) {
  const theme = themeFor(draft)
  const heading = mergeAndSet(sheet, layout.footerStartRow, 1, layout.footerStartRow, 10, getExportLabel(title, draft.language))
  heading.font = { name: 'Microsoft YaHei', size: 10, bold: true, color: { argb: theme.accent } }
  heading.fill = solidFill(theme.light)
  heading.alignment = { horizontal: 'left', vertical: 'middle' }
  sheet.getRow(layout.footerStartRow).height = 22

  rows.forEach(([rowLabel, value], index) => {
    const rowNumber = layout.footerStartRow + index + 1
    sheet.getRow(rowNumber).height = estimateExcelRowHeight([
      { text: getExportLabel(rowLabel, draft.language), charactersPerLine: 20 },
      { text: value, charactersPerLine: 68 },
    ], 24)
    const labelCell = mergeAndSet(sheet, rowNumber, 1, rowNumber, 3, getExportLabel(rowLabel, draft.language))
    const valueCell = mergeAndSet(sheet, rowNumber, 4, rowNumber, 10, value || '--')
    labelCell.font = { name: 'Microsoft YaHei', size: 9, bold: true, color: { argb: MUTED_COLOR } }
    valueCell.font = { name: 'Microsoft YaHei', size: 9, color: { argb: TEXT_COLOR } }
    labelCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }
    valueCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }
  })
  borderRange(sheet, layout.footerStartRow, 1, layout.footerStartRow + rows.length, 10)
}

function setColumnWidths(sheet: Worksheet) {
  const widths = [5, 12, 12, 12, 12, 10, 10, 12, 12, 12]
  widths.forEach((width, index) => { sheet.getColumn(index + 1).width = width })
}

function mergeAndSet(
  sheet: Worksheet,
  startRow: number,
  startColumn: number,
  endRow: number,
  endColumn: number,
  value: string | number | null,
): Cell {
  if (startRow !== endRow || startColumn !== endColumn) {
    sheet.mergeCells(startRow, startColumn, endRow, endColumn)
  }
  const cell = sheet.getCell(startRow, startColumn)
  cell.value = value
  return cell
}

function styleRange(
  sheet: Worksheet,
  startRow: number,
  startColumn: number,
  endRow: number,
  endColumn: number,
  style: Partial<Pick<Cell, 'fill' | 'font' | 'alignment'>>,
) {
  for (let row = startRow; row <= endRow; row += 1) {
    for (let column = startColumn; column <= endColumn; column += 1) {
      const cell = sheet.getCell(row, column)
      if (style.fill) cell.fill = style.fill
      if (style.font) cell.font = style.font
      if (style.alignment) cell.alignment = style.alignment
    }
  }
}

function borderRange(sheet: Worksheet, startRow: number, startColumn: number, endRow: number, endColumn: number) {
  for (let row = startRow; row <= endRow; row += 1) {
    for (let column = startColumn; column <= endColumn; column += 1) {
      sheet.getCell(row, column).border = {
        top: { style: 'thin', color: { argb: BORDER_COLOR } },
        bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
        left: { style: 'thin', color: { argb: BORDER_COLOR } },
        right: { style: 'thin', color: { argb: BORDER_COLOR } },
      }
    }
  }
}

function solidFill(argb: string): FillPattern {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } }
}

function numericColumn(key: ExcelTableColumn['key']): boolean {
  return ['sequence', 'quantity', 'unitPrice', 'amount', 'cartons', 'netWeight', 'grossWeight', 'volume'].includes(key)
}

function themeFor(draft: DocumentDraft): ThemeColors {
  if (draft.layout === 'classic') {
    return { brand: 'FF27312F', accent: 'FF46514F', light: 'FFEDEFEF', brandText: 'FFFFFFFF' }
  }
  if (draft.layout === 'minimal') {
    return { brand: 'FFFFFFFF', accent: 'FF176B57', light: 'FFF5F8F7', brandText: 'FF124E41' }
  }
  return { brand: 'FF124E41', accent: 'FF176B57', light: 'FFE8F1EE', brandText: 'FFFFFFFF' }
}

function label(draft: DocumentDraft, zh: string, en: string): string {
  return getExportLabel({ zh, en }, draft.language)
}

function currencyCode(currency: string): string {
  const codes: Record<string, string> = { 美元: 'USD', 人民币: 'CNY', 欧元: 'EUR', 英镑: 'GBP', 日元: 'JPY' }
  const normalized = currency.trim().toUpperCase()
  return codes[normalized] ?? (normalized || 'USD')
}

function getExcelPageFooter(draft: DocumentDraft): string {
  if (draft.language === 'en') return 'Page &P of &N'
  if (draft.language === 'bilingual') return 'Page &P of &N / 第 &P 页，共 &N 页'
  return '第 &P 页 / 共 &N 页'
}
