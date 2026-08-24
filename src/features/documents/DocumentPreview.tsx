import { calculateLineAmount, calculateTotals, DOCUMENT_TYPES, type DocumentDraft } from '../../domain/documents'

const englishTitles: Record<DocumentDraft['type'], string> = {
  QT: 'QUOTATION', PI: 'PROFORMA INVOICE', SC: 'SALES CONTRACT', CI: 'COMMERCIAL INVOICE', PL: 'PACKING LIST', CD: 'CUSTOMS DATA',
}

function label(draft: DocumentDraft, chinese: string, english: string) {
  if (draft.language === 'en') return english
  if (draft.language === 'bilingual') return `${chinese} / ${english}`
  return chinese
}

export function DocumentPreview({ draft }: { draft: DocumentDraft }) {
  const type = DOCUMENT_TYPES.find((item) => item.code === draft.type)!
  const totals = calculateTotals(draft.items)
  const title = draft.language === 'zh' ? type.name : draft.language === 'en' ? englishTitles[draft.type] : `${type.name} / ${englishTitles[draft.type]}`
  const accent = draft.layout === 'classic' ? 'border-slate-900' : draft.layout === 'minimal' ? 'border-slate-300' : 'border-brand-600'

  return (
    <article data-testid="document-preview" id="document-print-area" className={`mx-auto min-h-[840px] w-full min-w-0 max-w-[760px] bg-white p-6 text-slate-900 shadow-soft sm:p-9 ${draft.layout === 'classic' ? 'font-serif' : ''}`}>
      <header className={`border-b-4 pb-5 ${accent}`}>
        <div className="flex items-start justify-between gap-5">
          <div className="flex items-start gap-4">
            {draft.logo ? <img src={draft.logo} alt="公司 Logo" className="mt-1 h-12 w-auto max-w-[160px] object-contain" /> : null}
            <div><p className="text-xs font-semibold tracking-[0.18em] text-brand-700">{draft.seller.companyName || '卖方企业名称'}</p><h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2></div>
          </div>
          <div className="text-right text-[11px] leading-5 text-slate-500"><p>{label(draft, '单据编号', 'DOCUMENT NO.')}：{draft.documentNumber}</p><p>{label(draft, '日期', 'DATE')}：{draft.issueDate}</p></div>
        </div>
      </header>

      <section className="grid gap-5 border-b border-slate-200 py-5 sm:grid-cols-2">
        <div><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label(draft, '卖方资料', 'SELLER')}</p><p className="mt-2 text-sm font-semibold">{draft.seller.companyName || '待填写卖方名称'}</p><p className="mt-1 whitespace-pre-line text-xs leading-5 text-slate-500">{draft.seller.address || '待填写卖方地址'}{draft.seller.contact ? `\n联系人：${draft.seller.contact}` : ''}{draft.seller.email ? `\n邮箱：${draft.seller.email}` : ''}</p></div>
        <div><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label(draft, '买方资料', 'BUYER')}</p><p className="mt-2 text-sm font-semibold">{draft.buyer.companyName || '待填写买方名称'}</p><p className="mt-1 whitespace-pre-line text-xs leading-5 text-slate-500">{draft.buyer.address || '待填写买方地址'}{draft.buyer.contact ? `\n联系人：${draft.buyer.contact}` : ''}{draft.buyer.email ? `\n邮箱：${draft.buyer.email}` : ''}</p></div>
      </section>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse text-left text-[11px]">
          <thead><tr className="bg-slate-100 text-slate-600"><th className="p-2">{label(draft, '品名与规格', 'DESCRIPTION')}</th><th className="p-2 text-right">{label(draft, '数量', 'QTY')}</th><th className="p-2 text-right">{label(draft, '单价', 'UNIT PRICE')}</th><th className="p-2 text-right">{label(draft, '金额', 'AMOUNT')}</th><th className="p-2">{label(draft, 'HS 编码', 'HS CODE')}</th></tr></thead>
          <tbody>{draft.items.map((item) => <tr key={item.id} className="border-b border-slate-100"><td className="p-2"><strong>{item.name || '待填写产品'}</strong><br /><span className="text-slate-500">{item.specification}</span></td><td className="p-2 text-right">{item.quantity} {item.unit}</td><td className="p-2 text-right">{item.unitPrice.toFixed(2)}</td><td className="p-2 text-right font-semibold">{calculateLineAmount(item).toFixed(2)}</td><td className="p-2">{item.hsCode || '—'}</td></tr>)}</tbody>
          <tfoot><tr className="font-bold"><td className="p-2">{label(draft, '合计', 'TOTAL')}</td><td className="p-2 text-right">{totals.quantity}</td><td /><td className="p-2 text-right">{draft.trade.currency} {totals.amount.toFixed(2)}</td><td /></tr></tfoot>
        </table>
      </div>

      <section className="mt-6 grid gap-4 text-xs sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 p-4"><p className="font-bold">{label(draft, '贸易条款', 'TRADE TERMS')}</p><dl className="mt-3 grid grid-cols-[76px_1fr] gap-y-2 text-slate-600"><dt>贸易术语</dt><dd>{draft.trade.incoterm}</dd><dt>付款方式</dt><dd>{draft.trade.paymentTerm}</dd><dt>交货周期</dt><dd>{draft.trade.deliveryTime}</dd><dt>目的港</dt><dd>{draft.trade.portOfDestination || '待填写'}</dd></dl></div>
        <div className="rounded-lg border border-slate-200 p-4"><p className="font-bold">{label(draft, '装运与统计', 'SHIPMENT')}</p><dl className="mt-3 grid grid-cols-[76px_1fr] gap-y-2 text-slate-600"><dt>箱数</dt><dd>{totals.cartons}</dd><dt>净重</dt><dd>{totals.netWeight} 千克</dd><dt>毛重</dt><dd>{totals.grossWeight} 千克</dd><dt>体积</dt><dd>{totals.volume} 立方米</dd></dl></div>
      </section>

      <section className="mt-5 border-t border-slate-200 pt-4 text-[11px] leading-5 text-slate-500"><p><strong className="text-slate-700">{label(draft, '银行资料', 'BANK DETAILS')}：</strong>{draft.settlement.bankName || '待填写'} · {draft.settlement.accountName || '待填写账户名称'} · {draft.settlement.swift || '待填写 SWIFT'}</p><p className="mt-2"><strong className="text-slate-700">{label(draft, '备注', 'REMARKS')}：</strong>{draft.notes}</p></section>
    </article>
  )
}
