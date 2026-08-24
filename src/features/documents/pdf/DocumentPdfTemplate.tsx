import { calculateLineAmount, calculateTotals, type DocumentDraft, type LineItem } from '../../../domain/documents'
import {
  formatExportValue,
  getDocumentExportTitle,
  getExportLabel,
  type ExportColumnKey,
  type LocalizedLabel,
} from '../export/documentExportModel'
import { buildPdfPageModels, getPdfColumnWidths, type PdfPageModel } from './documentPdfModel'
import './document-pdf.css'

export function DocumentPdfExportSurface({ draft }: { draft: DocumentDraft }) {
  const pages = buildPdfPageModels(draft)
  return (
    <div className="pdf-export-surface" aria-hidden="true" data-testid="pdf-export-surface">
      {pages.map((page) => <DocumentPdfPage key={page.pageNumber} page={page} />)}
    </div>
  )
}

function DocumentPdfPage({ page }: { page: PdfPageModel }) {
  const { draft, definition } = page
  return (
    <article
      className={`pdf-page pdf-page--${draft.layout}`}
      data-pdf-page
      data-pdf-language={draft.language}
      data-pdf-title={getDocumentExportTitle(definition, draft.language)}
      data-pdf-number={draft.documentNumber || '--'}
      data-pdf-date={draft.issueDate || '--'}
      data-testid={`pdf-page-${page.pageNumber}`}
    >
      <header className="pdf-page__brand">
        <div className="pdf-page__brand-left">
          {draft.logo ? <img src={draft.logo} alt="公司 Logo" className="pdf-page__brand-logo" /> : null}
          <span>{draft.seller.companyName || 'Kyrie的外贸盒子'}</span>
        </div>
        <small>{label(draft, '本地生成 · 商务单据', 'LOCAL BUSINESS DOCUMENT')}</small>
      </header>

      <section className="pdf-page__heading">
        <div>
          <h1>{getDocumentExportTitle(definition, draft.language)}</h1>
          {page.continuation ? <p>{label(draft, '续页', 'CONTINUATION')}</p> : null}
        </div>
        <dl>
          <MetaRow draft={draft} labels={{ zh: '单据编号', en: 'NO.' }} value={draft.documentNumber} />
          <MetaRow draft={draft} labels={{ zh: '开具日期', en: 'DATE' }} value={draft.issueDate} />
        </dl>
      </section>

      {page.continuation ? null : <PartySection draft={draft} />}
      {page.items.length > 0 ? <ProductTable page={page} /> : null}
      {page.showSummary ? <DocumentSummary draft={draft} /> : null}
      {page.showFooter ? <DocumentFooter draft={draft} kind={definition.footerKind} /> : null}

      <footer className="pdf-page__pagination">
        {pageLabel(draft, page.pageNumber, page.totalPages)}
      </footer>
    </article>
  )
}

function MetaRow({ draft, labels, value }: { draft: DocumentDraft; labels: LocalizedLabel; value: string }) {
  return (
    <div>
      <dt>{getExportLabel(labels, draft.language)}</dt>
      <dd>{value || '--'}</dd>
    </div>
  )
}

function PartySection({ draft }: { draft: DocumentDraft }) {
  return (
    <section className="pdf-page__parties">
      <PartyCard draft={draft} title={{ zh: '卖方资料', en: 'SELLER' }} party={draft.seller} />
      <PartyCard draft={draft} title={{ zh: '买方资料', en: 'BUYER' }} party={draft.buyer} />
    </section>
  )
}

function PartyCard({ draft, title, party }: {
  draft: DocumentDraft
  title: LocalizedLabel
  party: DocumentDraft['seller']
}) {
  return (
    <div className="pdf-page__party-card">
      <h2>{getExportLabel(title, draft.language)}</h2>
      <strong>{party.companyName || '--'}</strong>
      <p>{getExportLabel({ zh: '国家或地区', en: 'COUNTRY / REGION' }, draft.language)}：{party.country || '--'}</p>
      <p>{getExportLabel({ zh: '地址', en: 'ADDRESS' }, draft.language)}：{party.address || '--'}</p>
      <p>{getExportLabel({ zh: '联系人', en: 'CONTACT' }, draft.language)}：{party.contact || '--'}</p>
      <p>{getExportLabel({ zh: '电话', en: 'PHONE' }, draft.language)}：{party.phone || '--'}</p>
      <p>{getExportLabel({ zh: '邮箱', en: 'EMAIL' }, draft.language)}：{party.email || '--'}</p>
      <p>{getExportLabel({ zh: '税号', en: 'TAX ID' }, draft.language)}：{party.taxId || '--'}</p>
    </div>
  )
}

function ProductTable({ page }: { page: PdfPageModel }) {
  const { draft, definition } = page
  const columns = definition.columns
  const widths = getPdfColumnWidths(columns.map((column) => column.key))
  return (
    <table className="pdf-page__table">
      <colgroup>
        <col style={{ width: '5%' }} />
        {columns.map((column, index) => <col key={column.key} style={{ width: `${widths[index]}%` }} />)}
      </colgroup>
      <thead>
        <tr>
          <th>#</th>
          {columns.map((column) => (
            <th className={`is-${column.align}`} key={column.key}>
              {getExportLabel(column.labels, draft.language)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {page.items.map((item, index) => (
          <tr key={item.id} className="pdf-page__table-row">
            <td className="is-center">{index + 1 + itemOffset(page)}</td>
            {columns.map((column) => (
              <td className={`is-${column.align}`} key={column.key}>
                {itemValue(draft, item, column.key)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function DocumentSummary({ draft }: { draft: DocumentDraft }) {
  const totals = calculateTotals(draft.items)
  if (draft.type === 'PL') {
    return (
      <section className="pdf-page__summary pdf-page__summary--packing">
        <SummaryValue label={label(draft, '总数量', 'TOTAL QTY')} value={formatExportValue('quantity', totals.quantity)} />
        <SummaryValue label={label(draft, '总箱数', 'TOTAL CARTONS')} value={formatExportValue('cartons', totals.cartons)} />
        <SummaryValue label={label(draft, '总净重', 'TOTAL N.W.')} value={formatExportValue('netWeight', totals.netWeight)} />
        <SummaryValue label={label(draft, '总毛重', 'TOTAL G.W.')} value={formatExportValue('grossWeight', totals.grossWeight)} />
        <SummaryValue label={label(draft, '总体积', 'TOTAL CBM')} value={formatExportValue('volume', totals.volume)} />
      </section>
    )
  }
  return (
    <section className="pdf-page__summary">
      <span>{label(draft, '合计', 'TOTAL')}</span>
      <strong>{formatExportValue('amount', totals.amount, { currency: draft.trade.currency })}</strong>
    </section>
  )
}

function SummaryValue({ label: labelValue, value }: { label: string; value: string }) {
  return <div><span>{labelValue}</span><strong>{value}</strong></div>
}

function DocumentFooter({ draft, kind }: { draft: DocumentDraft; kind: PdfPageModel['definition']['footerKind'] }) {
  if (kind === 'quotationTerms') {
    return <InfoSection title={label(draft, '贸易条款', 'TRADE TERMS')} rows={[
      [label(draft, '报价有效期', 'VALIDITY'), draft.trade.validity],
      [label(draft, '贸易术语', 'INCOTERM'), draft.trade.incoterm],
      [label(draft, '付款方式', 'PAYMENT'), draft.trade.paymentTerm],
      [label(draft, '交期', 'DELIVERY'), draft.trade.deliveryTime],
      [label(draft, '备注', 'REMARKS'), draft.notes],
    ]} />
  }
  if (kind === 'bankInformation') {
    return <InfoSection title={label(draft, '银行信息', 'BANK INFORMATION')} rows={[
      [label(draft, '贸易术语', 'INCOTERM'), draft.trade.incoterm],
      [label(draft, '付款方式', 'PAYMENT'), draft.trade.paymentTerm],
      [label(draft, '装运港', 'PORT OF LOADING'), draft.trade.portOfLoading],
      [label(draft, '目的港', 'DESTINATION'), draft.trade.portOfDestination],
      [label(draft, '运输方式', 'TRANSPORT'), draft.settlement.transportMode],
      [label(draft, '开户行', 'BANK'), draft.settlement.bankName],
      [label(draft, '银行地址', 'BANK ADDRESS'), draft.settlement.bankAddress],
      [label(draft, '账户名称', 'ACCOUNT NAME'), draft.settlement.accountName],
      [label(draft, '银行账号', 'ACCOUNT NO.'), draft.settlement.accountNumber],
      ['SWIFT', draft.settlement.swift],
    ]} />
  }
  if (kind === 'signatures') {
    return (
      <section className="pdf-page__signatures">
        <InfoSection title={label(draft, '合同条款', 'CONTRACT TERMS')} rows={[
          [label(draft, '贸易术语', 'INCOTERM'), draft.trade.incoterm],
          [label(draft, '付款方式', 'PAYMENT'), draft.trade.paymentTerm],
          [label(draft, '交期', 'DELIVERY'), draft.trade.deliveryTime],
          [label(draft, '备注', 'REMARKS'), draft.notes],
        ]} />
        <div className="pdf-page__signature-boxes">
          <div>{label(draft, '卖方签章', 'SELLER SIGNATURE')}</div>
          <div>{label(draft, '买方签章', 'BUYER SIGNATURE')}</div>
        </div>
      </section>
    )
  }
  if (kind === 'customsPayment') {
    return <InfoSection title={label(draft, '清关与收款资料', 'CUSTOMS & PAYMENT')} rows={[
      [label(draft, '贸易国', 'TRADE COUNTRY'), draft.trade.country],
      [label(draft, '运输方式', 'TRANSPORT'), draft.settlement.transportMode],
      [label(draft, '装运港', 'PORT OF LOADING'), draft.trade.portOfLoading],
      [label(draft, '目的港', 'DESTINATION'), draft.trade.portOfDestination],
      [label(draft, '开户行', 'BANK'), draft.settlement.bankName],
      [label(draft, '银行地址', 'BANK ADDRESS'), draft.settlement.bankAddress],
      [label(draft, '账户名称', 'ACCOUNT NAME'), draft.settlement.accountName],
      [label(draft, '银行账号', 'ACCOUNT NO.'), draft.settlement.accountNumber],
      ['SWIFT', draft.settlement.swift],
    ]} />
  }
  if (kind === 'packingTotals') {
    return <InfoSection title={label(draft, '装箱补充资料', 'PACKING DETAILS')} rows={[
      [label(draft, '唛头', 'MARKS'), draft.settlement.marks],
      [label(draft, '运输方式', 'TRANSPORT'), draft.settlement.transportMode],
      [label(draft, '备注', 'REMARKS'), draft.notes],
    ]} />
  }
  return <InfoSection title={label(draft, '报关资料', 'CUSTOMS DETAILS')} rows={[
    [label(draft, '贸易国', 'TRADE COUNTRY'), draft.trade.country],
    [label(draft, '成交方式', 'TRANSACTION'), draft.trade.incoterm],
    [label(draft, '运输方式', 'TRANSPORT'), draft.settlement.transportMode],
    [label(draft, '报关口岸', 'CUSTOMS PORT'), draft.settlement.customsPort],
    [label(draft, '备注', 'REMARKS'), draft.notes],
  ]} />
}

function InfoSection({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <section className="pdf-page__terms">
      <h2>{title}</h2>
      <dl>
        {rows.map(([rowLabel, value]) => (
          <div key={rowLabel}><dt>{rowLabel}</dt><dd>{value || '--'}</dd></div>
        ))}
      </dl>
    </section>
  )
}

function itemValue(draft: DocumentDraft, item: LineItem, key: ExportColumnKey): string {
  if (key === 'description') return item.name || '--'
  if (key === 'specification') return item.specification || '--'
  if (key === 'amount') return formatExportValue(key, calculateLineAmount(item), { currency: draft.trade.currency })
  return formatExportValue(key, item[key], { currency: draft.trade.currency })
}

function itemOffset(page: PdfPageModel): number {
  if (page.pageNumber === 1) return 0
  const models = buildPdfPageModels(page.draft)
  return models.slice(0, page.pageNumber - 1).reduce((sum, model) => sum + model.items.length, 0)
}

function label(draft: DocumentDraft, zh: string, en: string): string {
  return getExportLabel({ zh, en }, draft.language)
}

function pageLabel(draft: DocumentDraft, current: number, total: number): string {
  if (draft.language === 'en') return `Page ${current} of ${total}`
  if (draft.language === 'bilingual') return `Page ${current} of ${total} / 第 ${current} 页，共 ${total} 页`
  return `第 ${current} 页 / 共 ${total} 页`
}
