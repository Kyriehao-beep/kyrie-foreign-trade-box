import { Bookmark, FilePlus2, FileText, ImagePlus, Save, Trash2, Upload, Users, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import {
  calculateLineAmount,
  createEmptyDraft,
  createLineItem,
  DOCUMENT_TYPES,
  type DocumentDraft,
  type DocumentLanguage,
  type DocumentLayout,
  type DocumentType,
  type LineItem,
  type Party,
  type PartyTemplate,
  type TradeTerms,
  type SettlementCustoms,
} from '../../domain/documents'
import { getFollowUp, upsertFromDraft } from '../../services/followUpStore'
import { exportExcelDocument } from '../../services/excelExport'
import { exportPdfDocument } from '../../services/pdfExport'
import { clearDraft, deletePartyTemplate, loadDraft, loadPartyTemplates, saveDraft, savePartyTemplate } from '../../services/storage'
import { DocumentPreview } from './DocumentPreview'
import { DocumentPdfExportSurface } from './pdf/DocumentPdfTemplate'

function Field({ label, value, onChange, type = 'text', review = false }: { label: string; value: string | number; onChange: (value: string) => void; type?: string; review?: boolean }) {
  return <label className="block text-xs font-medium text-slate-600"><span className="mb-1.5 flex items-center gap-2">{label}{review ? <span className="text-[10px] text-amber-700">请核对</span> : null}</span><Input aria-label={label} type={type} value={value} onChange={(event) => onChange(event.target.value)} className={review ? 'border-amber-300 bg-amber-50' : ''} /></label>
}

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return <div className="mb-4 flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-ink">{children}</h3>{action}</div>
}

export function DocumentWorkspace() {
  const [type, setType] = useState<DocumentType>('QT')
  const [draft, setDraft] = useState<DocumentDraft>(() => loadDraft('QT').value ?? createEmptyDraft('QT'))
  const [saveStatus, setSaveStatus] = useState('准备就绪')
  const [exportStatus, setExportStatus] = useState('')
  const [mobileView, setMobileView] = useState<'form' | 'preview'>('form')
  const [isPdfExporting, setIsPdfExporting] = useState(false)
  const [isExcelExporting, setIsExcelExporting] = useState(false)
  const [templates, setTemplates] = useState<PartyTemplate[]>([])
  const [templateMenu, setTemplateMenu] = useState<'seller' | 'buyer' | null>(null)
  const pdfRootRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setTemplates(loadPartyTemplates().value) }, [])

  useEffect(() => {
    setSaveStatus('正在保存…')
    const timer = window.setTimeout(() => {
      const result = saveDraft({ ...draft, updatedAt: new Date().toISOString() })
      setSaveStatus(result.ok ? '已自动保存' : result.error)
    }, 350)
    return () => window.clearTimeout(timer)
  }, [draft])

  // 入向联动：从跟单助手「新建单据」跳转过来时（?followup=id），自动带入该客户资料。
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('followup')
    if (!id) return
    const record = getFollowUp(id)
    if (record) {
      setDraft((current) => ({
        ...current,
        buyer: { ...current.buyer, ...record.buyer },
        trade: {
          ...current.trade,
          incoterm: record.incoterm || current.trade.incoterm,
          currency: record.currency || current.trade.currency,
        },
      }))
      setSaveStatus(`已从跟单助手带入客户：${record.buyer.companyName || ''}`)
    }
    if (window.history?.replaceState) {
      const url = new URL(window.location.href)
      url.searchParams.delete('followup')
      window.history.replaceState({}, '', url.pathname + url.search)
    }
  }, [])

  const currentType = useMemo(() => DOCUMENT_TYPES.find((item) => item.code === type)!, [type])

  function selectType(nextType: DocumentType) {
    setType(nextType)
    setDraft(loadDraft(nextType).value ?? createEmptyDraft(nextType))
  }

  function updateParty(kind: 'seller' | 'buyer', key: keyof Party, value: string) {
    setDraft((current) => ({ ...current, [kind]: { ...current[kind], [key]: value } }))
  }

  function updateTrade(key: keyof TradeTerms, value: string) {
    setDraft((current) => ({ ...current, trade: { ...current.trade, [key]: value } }))
  }

  function updateSettlement(key: keyof SettlementCustoms, value: string) {
    setDraft((current) => ({ ...current, settlement: { ...current.settlement, [key]: value } }))
  }

  function updateItem(id: string, key: keyof LineItem, value: string) {
    const numericKeys: (keyof LineItem)[] = ['quantity', 'unitPrice', 'cartons', 'netWeight', 'grossWeight', 'volume']
    setDraft((current) => ({
      ...current,
      items: current.items.map((item) => item.id === id ? { ...item, [key]: numericKeys.includes(key) ? Number(value) : value } : item),
    }))
  }

  function saveTemplate(kind: 'seller' | 'buyer') {
    const party = draft[kind]
    if (!party.companyName.trim()) {
      setSaveStatus(`请先填写${kind === 'seller' ? '卖方' : '买方'}公司名称`)
      return
    }
    const result = savePartyTemplate({ ...party, id: `${kind}-${party.companyName}`, name: party.companyName, kind })
    if (result.ok) {
      setTemplates(loadPartyTemplates().value)
      setSaveStatus(`模板已保存：${party.companyName}（可在「选择模板」中调用）`)
    } else {
      setSaveStatus(result.error)
    }
  }

  function applyTemplate(kind: 'seller' | 'buyer', template: PartyTemplate) {
    const fields: Partial<Party> = {
      companyName: template.companyName,
      address: template.address,
      contact: template.contact,
      phone: template.phone,
      email: template.email,
      taxId: template.taxId,
      country: template.country,
    }
    setDraft((current) => ({ ...current, [kind]: { ...current[kind], ...fields } }))
    setSaveStatus(`已填入模板：${template.name}`)
    setTemplateMenu(null)
  }

  function deleteTemplate(template: PartyTemplate) {
    if (!window.confirm(`确定删除模板「${template.name}」吗？此操作无法撤销。`)) return
    const result = deletePartyTemplate(template.id)
    if (result.ok) {
      setTemplates(loadPartyTemplates().value)
      setSaveStatus(`模板已删除：${template.name}`)
    } else {
      setSaveStatus(result.error)
    }
  }

  function resetDraft() {
    if (window.confirm('确定新建空白单据吗？当前未保存的修改将被替换。')) setDraft(createEmptyDraft(type))
  }

  function removeDraft() {
    if (!window.confirm('确定清除当前单据草稿吗？此操作无法撤销。')) return
    clearDraft(type)
    setDraft(createEmptyDraft(type))
    setSaveStatus('当前草稿已清除')
  }

  // 出向联动：把当前单据里的买方/产品/金额/贸易术语，一键加入跟单助手。
  function addToFollowUp() {
    const name = draft.buyer.companyName.trim()
    if (!name) {
      setSaveStatus('请先填写买方公司名称，再加入到跟单助手。')
      return
    }
    upsertFromDraft(draft)
    setSaveStatus(`已加入跟单助手：${name}（可在首页「跟单助手」继续跟进）`)
  }

  function handleLogoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setSaveStatus('请上传图片文件（PNG / JPG / SVG）')
      return
    }
    if (file.size > 1.5 * 1024 * 1024) {
      setSaveStatus('图片过大，请控制在 1.5MB 以内')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setDraft((current) => ({ ...current, logo: reader.result as string }))
      setSaveStatus('公司 Logo 已添加')
    }
    reader.onerror = () => setSaveStatus('图片读取失败，请重试')
    reader.readAsDataURL(file)
  }

  function removeLogo() {
    setDraft((current) => ({ ...current, logo: '' }))
    setSaveStatus('已移除公司 Logo')
  }

  async function handlePdfExport() {
    if (!pdfRootRef.current || isPdfExporting) return
    setIsPdfExporting(true)
    setExportStatus('正在生成 PDF…')
    try {
      await exportPdfDocument(pdfRootRef.current, draft.documentNumber)
      setExportStatus('PDF 已导出')
    } catch {
      setExportStatus('PDF 生成失败，请检查内容后重试')
    } finally {
      setIsPdfExporting(false)
    }
  }

  async function handleExcelExport() {
    if (isExcelExporting) return
    setIsExcelExporting(true)
    setExportStatus('正在生成 Excel…')
    try {
      await exportExcelDocument(draft)
      setExportStatus('Excel 已导出')
    } catch {
      setExportStatus('Excel 生成失败，请检查内容后重试')
    } finally {
      setIsExcelExporting(false)
    }
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 lg:px-6">
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div><p className="text-sm font-semibold text-brand-600">外贸单据中心</p><h1 className="mt-1 text-2xl font-semibold">{currentType.fullName}</h1><p className="mt-1 text-sm text-slate-500">{currentType.description}</p></div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <label className="text-xs font-medium text-slate-600">单据语言<select aria-label="单据语言" className="ml-2 h-10 rounded-xl border border-slate-200 bg-white px-3" value={draft.language} onChange={(event) => setDraft({ ...draft, language: event.target.value as DocumentLanguage })}><option value="zh">中文</option><option value="en">英文</option><option value="bilingual">双语</option></select></label>
          <label className="text-xs font-medium text-slate-600">版式风格<select aria-label="版式风格" className="ml-2 h-10 rounded-xl border border-slate-200 bg-white px-3" value={draft.layout} onChange={(event) => setDraft({ ...draft, layout: event.target.value as DocumentLayout })}><option value="modern">现代蓝绿</option><option value="classic">经典外贸</option><option value="minimal">简约商务</option></select></label>
          <Button variant="outline" size="sm" onClick={resetDraft}><FilePlus2 className="h-4 w-4" />新建空白单据</Button>
          <Button variant="outline" size="sm" onClick={addToFollowUp}><Users className="h-4 w-4" />加入跟单助手</Button>
          <Button variant="danger" size="sm" onClick={removeDraft}><Trash2 className="h-4 w-4" />清除草稿</Button>
        </div>
      </div>

      <div className="mb-5 flex gap-2 overflow-x-auto pb-2 print:hidden">
        {DOCUMENT_TYPES.map((item) => <button key={item.code} type="button" aria-label={item.fullName} onClick={() => selectType(item.code)} className={`shrink-0 rounded-xl border px-4 py-3 text-left transition ${type === item.code ? 'border-brand-500 bg-brand-600 text-white shadow-md' : 'border-slate-200 bg-white hover:border-brand-200'}`}><span className="block text-xs font-bold opacity-70">{item.code}</span><span className="mt-1 block text-sm font-semibold">{item.name}</span></button>)}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 lg:hidden print:hidden"><Button variant={mobileView === 'form' ? 'default' : 'outline'} onClick={() => setMobileView('form')}>填写资料</Button><Button variant={mobileView === 'preview' ? 'default' : 'outline'} onClick={() => setMobileView('preview')}>预览单据</Button></div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(520px,.95fr)]">
        <div className={`${mobileView === 'preview' ? 'hidden lg:block' : ''} min-w-0 space-y-4 print:hidden`}>
          {draft.reviewFields.length > 0 ? <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"><strong>请人工核对：</strong>{draft.reviewFields.map((field) => <span key={field} className="rounded-full bg-white px-2 py-1">{field}</span>)}</div> : null}

          <Card className="p-5">
            <SectionTitle>单据基本信息</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="单据编号" value={draft.documentNumber} onChange={(value) => setDraft({ ...draft, documentNumber: value })} /><Field label="开具日期" type="date" value={draft.issueDate} onChange={(value) => setDraft({ ...draft, issueDate: value })} /></div>
          </Card>

          <Card className="p-5">
            <SectionTitle action={draft.logo ? <Button type="button" size="sm" variant="ghost" onClick={removeLogo}><Trash2 className="h-3.5 w-3.5" />移除</Button> : null}>公司标识（Logo）</SectionTitle>
            <div className="flex items-center gap-4">
              <div className="grid h-20 w-32 shrink-0 place-items-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50">
                {draft.logo
                  ? <img src={draft.logo} alt="公司 Logo 预览" className="max-h-20 max-w-32 object-contain" />
                  : <ImagePlus className="h-6 w-6 text-slate-300" aria-hidden="true" />}
              </div>
              <div className="min-w-0">
                <p className="text-xs leading-5 text-slate-500">上传企业 Logo，将显示在单据抬头左侧。建议透明背景 PNG，1.5MB 以内。</p>
                <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-brand-300">
                  <Upload className="h-4 w-4" aria-hidden="true" />选择图片
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} aria-label="上传公司 Logo" />
                </label>
              </div>
            </div>
          </Card>

          {(['seller', 'buyer'] as const).map((kind) => {
            const party = draft[kind]
            const prefix = kind === 'seller' ? '卖方' : '买方'
            return <Card className="p-5" key={kind}><SectionTitle action={<div className="relative flex items-center gap-2"><Button type="button" size="sm" variant="ghost" onClick={() => saveTemplate(kind)}><Save className="h-3.5 w-3.5" />保存为模板</Button><Button type="button" size="sm" variant="ghost" onClick={() => { setTemplates(loadPartyTemplates().value); setTemplateMenu(templateMenu === kind ? null : kind) }}><Bookmark className="h-3.5 w-3.5" />选择模板 ▾</Button>{templateMenu === kind ? (<><div className="fixed inset-0 z-10" onClick={() => setTemplateMenu(null)} /><div className="absolute right-0 top-full z-20 mt-1 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">{templates.filter((t) => t.kind === kind).length === 0 ? (<p className="px-2 py-1.5 text-xs text-slate-400">暂无保存的模板</p>) : (templates.filter((t) => t.kind === kind).map((t) => (<div key={t.id} className="group flex items-center gap-1 rounded-lg px-1 hover:bg-brand-50"><button type="button" onClick={() => applyTemplate(kind, t)} className="min-w-0 flex-1 px-1 py-1.5 text-left text-sm text-slate-700">{t.name}</button><button type="button" aria-label={`删除模板 ${t.name}`} onClick={(event) => { event.stopPropagation(); deleteTemplate(t) }} className="shrink-0 rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600" title="删除模板"><Trash2 className="h-3.5 w-3.5" /></button></div>)))}</div></>) : null}</div>}>{prefix}资料</SectionTitle><div className="grid gap-4 sm:grid-cols-2"><Field label={`${prefix}公司名称`} value={party.companyName} review={draft.reviewFields.includes(`${prefix}公司名称`)} onChange={(value) => updateParty(kind, 'companyName', value)} /><Field label={`${prefix}国家或地区`} value={party.country} onChange={(value) => updateParty(kind, 'country', value)} /><Field label={`${prefix}地址`} value={party.address} review={draft.reviewFields.includes(`${prefix}地址`)} onChange={(value) => updateParty(kind, 'address', value)} /><Field label={`${prefix}联系人`} value={party.contact} onChange={(value) => updateParty(kind, 'contact', value)} /><Field label={`${prefix}电话`} value={party.phone} onChange={(value) => updateParty(kind, 'phone', value)} /><Field label={`${prefix}邮箱`} value={party.email} onChange={(value) => updateParty(kind, 'email', value)} /><Field label={`${prefix}税号`} value={party.taxId} onChange={(value) => updateParty(kind, 'taxId', value)} /></div></Card>
          })}

          <Card className="p-5">
            <SectionTitle action={<Button type="button" size="sm" onClick={() => setDraft((current) => ({ ...current, items: [...current.items, createLineItem()] }))}>新增产品行</Button>}>产品明细</SectionTitle>
            <div className="space-y-4">{draft.items.map((item, index) => <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="mb-3 flex items-center justify-between"><span className="text-xs font-bold text-brand-700">产品 {index + 1}</span>{draft.items.length > 1 ? <Button type="button" size="sm" variant="ghost" aria-label={`删除产品 ${index + 1}`} onClick={() => setDraft((current) => ({ ...current, items: current.items.filter((entry) => entry.id !== item.id) }))}><X className="h-4 w-4" /></Button> : null}</div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Field label={`品名 ${index + 1}`} value={item.name} onChange={(value) => updateItem(item.id, 'name', value)} /><Field label={`规格 ${index + 1}`} value={item.specification} onChange={(value) => updateItem(item.id, 'specification', value)} /><Field label={`数量 ${index + 1}`} type="number" value={item.quantity} onChange={(value) => updateItem(item.id, 'quantity', value)} /><Field label={`单位 ${index + 1}`} value={item.unit} onChange={(value) => updateItem(item.id, 'unit', value)} /><Field label={`单价 ${index + 1}`} type="number" value={item.unitPrice} onChange={(value) => updateItem(item.id, 'unitPrice', value)} /><Field label={`金额 ${index + 1}`} value={calculateLineAmount(item)} onChange={() => undefined} /><Field label={`箱数 ${index + 1}`} type="number" value={item.cartons} onChange={(value) => updateItem(item.id, 'cartons', value)} /><Field label={`单件净重 ${index + 1}`} type="number" value={item.netWeight} onChange={(value) => updateItem(item.id, 'netWeight', value)} /><Field label={`单件毛重 ${index + 1}`} type="number" value={item.grossWeight} onChange={(value) => updateItem(item.id, 'grossWeight', value)} /><Field label={`单件体积 ${index + 1}`} type="number" value={item.volume} onChange={(value) => updateItem(item.id, 'volume', value)} /><Field label={`HS 编码 ${index + 1}`} value={item.hsCode} onChange={(value) => updateItem(item.id, 'hsCode', value)} /><Field label={`申报要素 ${index + 1}`} value={item.declarationElements} onChange={(value) => updateItem(item.id, 'declarationElements', value)} /></div></div>)}</div>
          </Card>

          <Card className="p-5"><SectionTitle>贸易条款</SectionTitle><div className="grid gap-4 sm:grid-cols-2"><Field label="贸易国家" value={draft.trade.country} onChange={(value) => updateTrade('country', value)} /><Field label="贸易术语" value={draft.trade.incoterm} onChange={(value) => updateTrade('incoterm', value)} /><Field label="付款方式" value={draft.trade.paymentTerm} onChange={(value) => updateTrade('paymentTerm', value)} /><Field label="币种" value={draft.trade.currency} onChange={(value) => updateTrade('currency', value)} /><Field label="交货周期" value={draft.trade.deliveryTime} onChange={(value) => updateTrade('deliveryTime', value)} /><Field label="装运港" value={draft.trade.portOfLoading} onChange={(value) => updateTrade('portOfLoading', value)} /><Field label="目的港" value={draft.trade.portOfDestination} review={draft.reviewFields.includes('目的港')} onChange={(value) => updateTrade('portOfDestination', value)} /><Field label="报价有效期" value={draft.trade.validity} onChange={(value) => updateTrade('validity', value)} /></div></Card>

          <Card className="p-5"><SectionTitle>收款与清关资料</SectionTitle><div className="grid gap-4 sm:grid-cols-2"><Field label="开户行" value={draft.settlement.bankName} onChange={(value) => updateSettlement('bankName', value)} /><Field label="账户名称" value={draft.settlement.accountName} onChange={(value) => updateSettlement('accountName', value)} /><Field label="银行账号" value={draft.settlement.accountNumber} onChange={(value) => updateSettlement('accountNumber', value)} /><Field label="银行地址" value={draft.settlement.bankAddress} onChange={(value) => updateSettlement('bankAddress', value)} /><Field label="SWIFT" value={draft.settlement.swift} onChange={(value) => updateSettlement('swift', value)} /><Field label="运输方式" value={draft.settlement.transportMode} onChange={(value) => updateSettlement('transportMode', value)} /><Field label="报关口岸" value={draft.settlement.customsPort} onChange={(value) => updateSettlement('customsPort', value)} /><Field label="唛头" value={draft.settlement.marks} onChange={(value) => updateSettlement('marks', value)} /></div><label className="mt-4 block text-xs font-medium text-slate-600"><span className="mb-1.5 block">备注与合同条款</span><Textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /></label></Card>
        </div>

        <aside className={`${mobileView === 'form' ? 'hidden lg:block' : ''} min-w-0 lg:sticky lg:top-28 lg:self-start`}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 print:hidden"><span className="text-xs font-medium text-slate-500">{exportStatus || saveStatus}</span><div className="flex gap-2"><Button type="button" size="sm" variant="outline" disabled={isPdfExporting} onClick={() => void handlePdfExport()}><FileText className="h-4 w-4" />{isPdfExporting ? '正在生成 PDF…' : '导出 PDF'}</Button><Button type="button" size="sm" disabled={isExcelExporting} onClick={() => void handleExcelExport()}>{isExcelExporting ? '正在生成 Excel…' : '导出 Excel'}</Button></div></div>
          <div className="max-h-[calc(100vh-180px)] overflow-auto rounded-2xl bg-slate-200/70 p-3 lg:p-5 print:max-h-none print:overflow-visible print:bg-white print:p-0"><DocumentPreview draft={draft} /></div>
        </aside>
      </div>
      <div ref={pdfRootRef}><DocumentPdfExportSurface draft={draft} /></div>
    </div>
  )
}
